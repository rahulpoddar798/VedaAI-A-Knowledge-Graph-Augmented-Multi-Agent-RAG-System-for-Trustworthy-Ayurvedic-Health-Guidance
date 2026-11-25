require('dotenv').config();
const { readCatalogGraph } = require('./engine/catalog_graph');
const { catalogSchema } = require('./shared/catalog.mjs');
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { buildVedaAIPipeline } = require('./engine/pipeline');
const defaultVisionAgent = require('./engine/vision_agent');
const { handleClinicalFollowUp: defaultFollowUpHandler } = require('./engine/followup_agent');
const defaultLabelAudit = require('./engine/label_audit');
const {
  getSharedDriver,
  verifyNeo4jConnectivity,
  closeSharedDriver
} = require('./lib/neo4j_config');
const { createRateLimiter } = require('./lib/rate_limit');
const { defaultTraceStore } = require('./lib/trace_store');
const {
  scrubInternalText,
  sanitizeConsultationResult,
  sanitizeVisionScan,
  sanitizeLabelAudit,
  sanitizeFollowUp
} = require('./lib/response_sanitizer');
const {
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  attachRequestId,
  logServerError,
  securityHeadersMiddleware,
  noCacheApiMiddleware,
  createCorsMiddleware,
  extractAndValidateImage,
  HttpError,
  chatRequestSchema,
  consultWithImageFieldsSchema,
  scanBodySchema,
  labelAuditFieldsSchema,
  followUpRequestSchema,
  feedbackRequestSchema,
  parseWithSchema,
  createErrorHandler
} = require('./lib/security');

function parsePositiveInt(val, fallback) {
  const num = Number(val);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

function assessmentProfile(body) {
  const { prakriti, season, conditions, allergies, medications, ageGroup, biologicalSex, vikriti, dietaryPreference, avoidAlcoholExtracts } = body;
  return { prakriti, current_season: season, chronic_conditions: conditions, allergies, medications, ageGroup, biologicalSex, vikriti, dietaryPreference, avoidAlcoholExtracts };
}

function missingCoverage(profile) {
  const missing = [];
  if (profile.medications?.length) missing.push('Drug–herb interactions have not been verified.');
  if (profile.allergies?.length) missing.push('Allergen coverage has not been verified.');
  if (profile.avoidAlcoholExtracts) missing.push('Alcohol content has not been verified.');
  if (profile.dietaryPreference) missing.push('Dietary suitability has not been verified.');
  if (profile.vikriti || profile.biologicalSex || profile.ageGroup) {
    missing.push('Safety specific to age, sex or current Vikriti has not been independently verified.');
  }
  return missing;
}

function publicAssessment(state, id) {
  const { assessment, publicResult } = require('./engine/evidence');
  const validated = assessment.parse(state.assessment);
  if (validated.verdict.consultationId !== id || validated.verdict.category === 'permitted') {
    throw new Error('Invalid adjudication for consultation.');
  }
  // The schema first projects only public fields. Scrub all nested text, including
  // source metadata and structured facts, then validate the resulting references.
  const scrubbed = JSON.parse(JSON.stringify(validated, (_key, value) =>
    typeof value === 'string' ? scrubInternalText(value) : value));
  return publicResult(scrubbed);
}

function consultationResult(state, profile, id, unresolved = [], legacyAdapter = false) {
  if (state.assessment) return publicAssessment(state, id);
  if (!legacyAdapter) throw new Error('Missing validated consultation assessment.');
  const result = sanitizeConsultationResult(state);
  const missing = missingCoverage(profile);
  if (unresolved.length) missing.unshift('Unverified ingredients: ' + unresolved.join(', ') + '.');
  result.missing_coverage = missing;
  result.status = unresolved.length ? 'PARTIAL_ASSESSMENT' : missing.length ? 'INSUFFICIENT_DATA' : 'ASSESSED';
  if (missing.length) {
    if (!/unsafe|contraindicated|caution|do not recommend/i.test(result.final_verdict)) {
      result.final_verdict = result.status;
    }
    result.summary_message = 'Safety could not be established for the complete assessment.';
    result.safety_warnings = [...new Set([...result.safety_warnings, ...missing])];
    result.clinical_reasoning = [];
  }
  return result;
}

function unavailable(res, details) {
  return res.status(503).json({ success: false, status: 'ANALYSIS_UNAVAILABLE',
    error: 'Image analysis is temporarily unavailable. No classification was made.', ...details });
}

/**
 * Create configured Express application. Supports dependency injection for testing
 * while defaulting to live production agents, pipeline, and shared Neo4j driver.
 */
function createApp(deps = {}) {
  const app = express();
  app.disable('x-powered-by');
  const trustedProxies = process.env.TRUSTED_PROXY_CIDRS?.split(',').map(value => value.trim()).filter(Boolean);
  if (trustedProxies?.length) app.set('trust proxy', trustedProxies);

  let defaultPipelineInstance = null;
  const resolvePipeline = () => {
    if (deps.pipeline) return deps.pipeline;
    if (!defaultPipelineInstance) {
      defaultPipelineInstance = buildVedaAIPipeline();
    }
    return defaultPipelineInstance;
  };

  const visionAgent = deps.visionAgent || defaultVisionAgent;
  const labelAudit = deps.labelAudit || defaultLabelAudit;
  const followUpHandler = deps.followUpHandler || defaultFollowUpHandler;
  const traceStore = deps.traceStore || defaultTraceStore;
  const resolveDriver = deps.driver
    ? () => deps.driver
    : () => getSharedDriver();
  const checkDbHealth = deps.checkDbHealth || (() => verifyNeo4jConnectivity(resolveDriver()));
  const feedbackFilePath = deps.feedbackFilePath || path.join(__dirname, 'data', 'clinical_feedback.jsonl');

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 72, fieldSize: 4096,
      fieldNameSize: 64, parts: 73, fieldNestingDepth: 1, fieldArrayIndexLimit: 20 },
    streamHandler: (req, parser) => {
      parser.end(req.multipartBytes);
      delete req.multipartBytes;
    },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported image type: ${file.mimetype}.`));
      }
    }
  });

  // raw-body enforces the aggregate byte budget while reading, including chunked requests.
  const boundedMultipart = express.raw({ type: 'multipart/form-data', limit: MAX_IMAGE_BYTES + 256 * 1024, inflate: false });
  const parseFile = upload.single('image');
  function parseMultipart(req, res, next) {
    if (!req.is('multipart/form-data')) return next();
    boundedMultipart(req, res, err => {
      if (err) return next(err);
      req.multipartBytes = req.body;
      parseFile(req, res, error => {
        delete req.multipartBytes;
        if (error && !(error instanceof multer.MulterError) && !error.message.startsWith('Unsupported image type')) {
          return next(new HttpError(400, 'Malformed multipart upload.'));
        }
        next(error);
      });
    });
  }

  // Global security headers & request tracking
  app.use(attachRequestId);
  app.use(securityHeadersMiddleware());
  app.use(express.static(path.join(__dirname, 'public')));

  // API-wide cache disabling & restricted CORS policy
  app.use('/api', noCacheApiMiddleware);
  app.use('/api', createCorsMiddleware({ allowedOrigins: deps.allowedOrigins }));

  const smallJsonParser = express.json({ limit: '256kb' });
  const smallUrlParser = express.urlencoded({ extended: true, limit: '256kb' });
  const largeJsonParser = express.json({ limit: '15mb' });
  const largeUrlParser = express.urlencoded({ extended: true, limit: '15mb' });

  const rlConfig = deps.rateLimits || {};
  const defaultWindowMs = parsePositiveInt(rlConfig.windowMs ?? process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000);

  const readLimiter = createRateLimiter({
    windowMs: rlConfig.read?.windowMs ?? defaultWindowMs,
    max: parsePositiveInt(rlConfig.read?.max ?? process.env.RATE_LIMIT_READ_MAX, 120),
    keyPrefix: 'read',
    message: 'Too many catalog requests. Please try again shortly.'
  });

  const aiLimiter = createRateLimiter({
    windowMs: rlConfig.ai?.windowMs ?? defaultWindowMs,
    max: parsePositiveInt(rlConfig.ai?.max ?? process.env.RATE_LIMIT_AI_MAX, 20),
    keyPrefix: 'ai',
    message: 'Consultation rate limit reached. Please wait a minute before submitting another request.'
  });

  const visionLimiter = createRateLimiter({
    windowMs: rlConfig.vision?.windowMs ?? defaultWindowMs,
    max: parsePositiveInt(rlConfig.vision?.max ?? process.env.RATE_LIMIT_VISION_MAX, 10),
    keyPrefix: 'vision',
    message: 'Image upload rate limit reached. Please wait before scanning another label.'
  });

  const feedbackLimiter = createRateLimiter({
    windowMs: rlConfig.feedback?.windowMs ?? defaultWindowMs,
    max: parsePositiveInt(rlConfig.feedback?.max ?? process.env.RATE_LIMIT_FEEDBACK_MAX, 15),
    keyPrefix: 'feedback',
    message: 'Too many feedback submissions. Please try again later.'
  });

  // Hold a process-wide slot through parsing and model execution, even if the
  // client disconnects while a provider call is still running.
  const maxClinicalRequests = parsePositiveInt(deps.maxClinicalRequests ?? process.env.MAX_CLINICAL_REQUESTS, 8);
  let activeClinicalRequests = 0;
  function clinicalPost(route, limiter, ...handlers) {
    const handler = handlers.pop();
    app.post(route, limiter, (_req, res, next) => {
      if (activeClinicalRequests >= maxClinicalRequests) {
        res.setHeader('Retry-After', '1');
        return res.status(429).json({ success: false, error: 'Service is busy. Please retry shortly.' });
      }
      activeClinicalRequests++;
      let released = false;
      function release() {
        if (!released) activeClinicalRequests--;
        released = true;
      }
      res.locals.releaseClinicalSlot = release;
      res.once('close', release);
      next();
    }, ...handlers, async (req, res, next) => {
      const release = res.locals.releaseClinicalSlot;
      res.off('close', release);
      if (res.destroyed) { release(); return; }
      try {
        await handler(req, res, next);
      } finally {
        release();
      }
    });
  }

  /**
   * Public health check — intentionally exposes no Aura IDs, node counts, or model config.
   */
  app.get('/api/status', readLimiter, async (req, res) => {
    try {
      await checkDbHealth();
      res.json({
        status: 'online',
        catalogReady: true
      });
    } catch (err) {
      logServerError('GET /api/status', err, req.requestId, 503);
      res.status(503).json({
        status: 'degraded',
        catalogReady: false,
        error: 'Service temporarily unavailable.'
      });
    }
  });

  /**
   * Public catalog of Ayurvedic herbs (metadata only; internal graph errors are sanitized).
   */
  app.get('/api/graph', readLimiter, async (req, res) => {
    try {
      res.json(await readCatalogGraph(resolveDriver()));
    } catch (err) {
      logServerError('GET /api/graph', err, req.requestId, 503);
      res.status(503).json({ success: false, error: 'Graph catalog unavailable.' });
    }
  });

  app.get('/api/herbs', readLimiter, async (req, res, next) => {
    let session = null;
    try {
      session = resolveDriver().session();
      const result = await session.run(`
        MATCH (h:Herb)
        OPTIONAL MATCH (h)-[r:PACIFIES]->(p:Dosha)
        OPTIONAL MATCH (h)-[a:AGGRAVATES]->(ag:Dosha)
        RETURN h.name AS name,
               h.botanical_name AS botanical_name,
               h.sanskrit_name AS sanskrit_name,
               h.virya AS virya,
               h.rasa AS rasa,
               h.therapeutic_uses AS therapeutic_uses, h.source AS source,
               collect(DISTINCT p.name) AS pacifies,
               collect(DISTINCT ag.name) AS aggravates
        ORDER BY h.name ASC LIMIT 500
      `);

      const herbs = result.records.map(r => {
        const obj = r.toObject();
        return {
          ...Object.fromEntries(['name', 'botanical_name', 'sanskrit_name', 'virya', 'rasa', 'therapeutic_uses', 'source']
            .map(key => [key, scrubInternalText(obj[key])])),
          pacifies: (obj.pacifies || []).map(scrubInternalText), aggravates: (obj.aggravates || []).map(scrubInternalText)
        };
      });
      res.json({ count: herbs.length, ...catalogSchema.parse({ herbs }) });
    } catch (err) {
      next(err);
    } finally {
      if (session) {
        await session.close().catch(() => {});
      }
    }
  });

  /**
   * Primary Clinical Consultation Endpoint.
   * Executes the evidence assessment workflow, retains context server-side,
   * and returns only patient-safe plain-language clinical guidance.
   */
  clinicalPost('/api/chat', aiLimiter, smallJsonParser, smallUrlParser, async (req, res, next) => {
    const startTime = Date.now();
    try {
      const body = parseWithSchema(chatRequestSchema, req.body);
      const profile = assessmentProfile(body);

      const consultationId = crypto.randomUUID();
      const finalState = await resolvePipeline().invoke({
        consultationId, requestId: req.requestId, raw_query: body.query,
        user_profile: assessmentProfile(body)
      });

      const durationMs = Date.now() - startTime;

      const result = consultationResult(finalState, profile, consultationId, [], deps.legacyTestAdapter);
      traceStore.saveTrace(consultationId, 'consultation', {
        consultationContext: result, patientContext: profile, history: [],
        durationMs,
        requestId: req.requestId,
        canonicalEntities: finalState.canonical_entities,
        retrievalPlan: finalState.retrieval_plan,
        agentExecutions: finalState.agent_trace,
        proponentDraft: finalState.proponent_draft,
        opponentVerdict: finalState.opponent_verdict,
        opponentFlags: finalState.opponent_flags,
        graphFacts: finalState.graph_facts,
        evidenceConfidence: finalState.final_response?.evidence_confidence,
        judgeCertainty: finalState.judge_certainty
      });

      res.json({
        success: true,
        consultationId,
        durationMs,
        confidenceScore: Number.isFinite(finalState.confidence_score) ? finalState.confidence_score : null,
        result
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Multimodal Vision Scan Endpoint (signature-validated image upload).
   */
  clinicalPost('/api/scan', visionLimiter, largeJsonParser, largeUrlParser, parseMultipart, async (req, res, next) => {
    try {
      parseWithSchema(scanBodySchema, req.body);
      const { imageBuffer, mimeType } = extractAndValidateImage(req, { minBytes: 32 });
      const visionResult = await visionAgent.analyzeImage(imageBuffer, mimeType);
      const scan = sanitizeVisionScan(visionResult);
      if (scan.status === 'ANALYSIS_UNAVAILABLE') return unavailable(res, { scan });
      const scanId = crypto.randomUUID();

      traceStore.saveTrace(scanId, 'scan', {
        requestId: req.requestId,
        visionResult
      });

      res.json({
        success: true,
        scanId,
        scan
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Multimodal Consultation Endpoint (image + text -> patient-safe consultation result).
   */
  clinicalPost('/api/consult-with-image', visionLimiter, largeJsonParser, largeUrlParser, parseMultipart, async (req, res, next) => {
    const startTime = Date.now();
    try {
      const body = parseWithSchema(consultWithImageFieldsSchema, req.body);
      const { imageBuffer, mimeType } = extractAndValidateImage(req, { minBytes: 32 });

      const visionResult = await visionAgent.analyzeImage(imageBuffer, mimeType);
      const sanitizedScan = sanitizeVisionScan(visionResult);
      const consultationId = crypto.randomUUID();

      if (sanitizedScan.status === 'ANALYSIS_UNAVAILABLE') return unavailable(res, { scan: sanitizedScan });
      if (!visionResult.is_ayurvedic_or_herbal) {
        traceStore.saveTrace(consultationId, 'consult_with_image_ood', {
          requestId: req.requestId,
          visionResult
        });

        return res.json({
          success: true,
          consultationId,
          isOutOfDomain: true,
          scan: sanitizedScan,
          result: {
            final_verdict: 'OUT_OF_DOMAIN',
            confidence_score: sanitizedScan.visual_confidence,
            summary_message:
              'The uploaded image does not appear to be an Ayurvedic medicine or medicinal plant. Please upload a clear photo of an Ayurvedic medicine container, supplement label, or raw herb.',
            disclaimer: 'Non-herbal items are excluded from clinical evaluation.'
          }
        });
      }

      const verifiedHerbs = visionResult.graph_membership?.verified_herbs?.map(h => h.canonical_name) || [];
      const detectedNames = verifiedHerbs;
      const unresolvedIngredients = sanitizedScan.catalog_verification.unverified_herbs.length
        ? sanitizedScan.catalog_verification.unverified_herbs : detectedNames.length ? [] : ['Ingredient identity unavailable'];
      const profile = assessmentProfile(body);
      const labelNote = detectedNames.length
        ? `Item identified from photo: ${detectedNames.join(', ')}`
        : 'Uploaded herbal product could not be verified in the catalog';
      const effectiveQuery = body.query && body.query.trim()
        ? `${body.query.trim()} (${labelNote})`
        : detectedNames.length
          ? `Can I take ${detectedNames.join(', ')}? Is it safe for my condition?`
          : 'Can I take this unidentified herbal product? Is it safe for my condition?';

      const finalState = await resolvePipeline().invoke({
        consultationId, requestId: req.requestId, unresolved: unresolvedIngredients,
        raw_query: effectiveQuery, user_profile: assessmentProfile(body)
      });

      const durationMs = Date.now() - startTime;

      const result = consultationResult(finalState, profile, consultationId, unresolvedIngredients, deps.legacyTestAdapter);
      traceStore.saveTrace(consultationId, 'consult_with_image', {
        consultationContext: result, patientContext: profile, history: [],
        durationMs,
        requestId: req.requestId,
        visionResult,
        canonicalEntities: finalState.canonical_entities,
        retrievalPlan: finalState.retrieval_plan,
        agentExecutions: finalState.agent_trace,
        proponentDraft: finalState.proponent_draft,
        opponentVerdict: finalState.opponent_verdict,
        opponentFlags: finalState.opponent_flags,
        graphFacts: finalState.graph_facts,
        evidenceConfidence: finalState.final_response?.evidence_confidence,
        judgeCertainty: finalState.judge_certainty
      });

      res.json({
        success: true,
        consultationId,
        durationMs,
        scan: sanitizedScan,
        confidenceScore: Number.isFinite(finalState.confidence_score) ? finalState.confidence_score : null,
        result
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Multi-Turn Clinical Follow-Up Q&A Endpoint.
   */
  clinicalPost('/api/follow-up', aiLimiter, smallJsonParser, smallUrlParser, async (req, res, next) => {
    try {
      const body = parseWithSchema(followUpRequestSchema, req.body);
      const payload = traceStore.getTrace(body.consultationId)?.payload;
      const context = payload?.consultationContext;
      if (!context) return res.json({ success: true, data: sanitizeFollowUp({
        status: 'INSUFFICIENT_CONTEXT', reply: 'This consultation is unavailable. Start a new assessment.'
      }) });
      if (payload.followUpPending) throw new HttpError(409, 'A follow-up is in progress for this consultation.');
      const originalIds = new Set(context.assessment?.ledger.map(e => e.id));
      if (body.evidenceIds?.some(id => !originalIds.has(id))) throw new HttpError(400, 'Invalid consultation evidence reference.');
      payload.followUpPending = true;
      try {
        const result = await followUpHandler({
          followUpQuery: body.followUpQuery, consultationContext: context,
          patientContext: payload.patientContext, history: payload.history || [], evidenceIds: body.evidenceIds || []
        });
        const data = sanitizeFollowUp(result, originalIds);
        data.final_verdict = context.final_verdict;
        data.restrictions = context.safety_warnings || [];
        payload.history = [...(payload.history || []), { question: body.followUpQuery, reply: data.reply,
          status: data.status, evidenceIds: data.evidenceIds }].slice(-8);
        return res.json({ success: true, data });
      } finally {
        payload.followUpPending = false;
      }
    } catch (err) {
      next(err);
    }
  });

  /**
   * Product Label Safety Audit Endpoint (signature-validated upload, patient-safe output).
   */
  clinicalPost('/api/label-audit', visionLimiter, largeJsonParser, largeUrlParser, parseMultipart, async (req, res, next) => {
    const startTime = Date.now();
    try {
      const body = parseWithSchema(labelAuditFieldsSchema, req.body);
      const { imageBuffer, mimeType } = extractAndValidateImage(req, { minBytes: 1024 });

      const profile = assessmentProfile(body);
      const result = await labelAudit.auditLabel(imageBuffer, mimeType, {
        ...profile, season: profile.current_season, conditions: profile.chronic_conditions
      });
      const audit = sanitizeLabelAudit(result);
      if (audit.status === 'ANALYSIS_UNAVAILABLE') return unavailable(res, { extraction: audit.extraction });
      audit.missing_coverage = missingCoverage(profile);
      if (audit.status === 'ASSESSED' && audit.missing_coverage.length) audit.status = 'INSUFFICIENT_DATA';

      const durationMs = Date.now() - startTime;
      const auditId = crypto.randomUUID();

      traceStore.saveTrace(auditId, 'label_audit', {
        durationMs,
        requestId: req.requestId,
        rawResult: result
      });

      res.json({
        success: true,
        auditId,
        durationMs,
        ...audit
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Clinical Feedback Recording Endpoint (validated & sanitized JSONL append).
   */
  app.post('/api/feedback', feedbackLimiter, smallJsonParser, smallUrlParser, async (req, res, next) => {
    try {
      const body = parseWithSchema(feedbackRequestSchema, req.body);
      const record = {
        timestamp: new Date().toISOString(),
        feedback: body.feedback
      };

      const feedbackDir = path.dirname(feedbackFilePath);
      await fs.promises.mkdir(feedbackDir, { recursive: true });
      await fs.promises.appendFile(feedbackFilePath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });

      res.json({
        success: true,
        message: 'Clinical feedback successfully recorded for safety calibration.'
      });
    } catch (err) {
      next(err);
    }
  });

  // Unknown API route 404 JSON response
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found.'
    });
  });

  // Centralized error sanitizer (prevents stack/path/provider leakage)
  app.use(createErrorHandler());

  return app;
}

async function stopServer(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await closeSharedDriver();
}

if (require.main === module) {
  // Validate once at startup while retaining the partial-assessment paths during outages.
  require('./lib/neo4j_config').getNeo4jCredentials();
  if (!require('./engine/llm_client').isConfigured) console.warn('Model service is unconfigured. Specialist analysis and image extraction are unavailable.');
  const PORT = process.env.PORT || 4000;
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('  🌿 VedaAI Web Application & API Server');
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`  API Status:  http://localhost:${PORT}/api/status`);
    console.log('═════════════════════════════════════════════════════════════════\n');
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await stopServer(server);
    } catch (error) {
      logServerError('shutdown', error);
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = { createApp, stopServer };
