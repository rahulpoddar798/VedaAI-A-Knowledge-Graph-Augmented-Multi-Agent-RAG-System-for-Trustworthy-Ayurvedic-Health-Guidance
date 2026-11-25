require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { buildVedaAIPipeline } = require('./engine/pipeline');
const visionAgent = require('./engine/vision_agent');
const { handleClinicalFollowUp } = require('./engine/followup_agent');
const labelAudit = require('./engine/label_audit');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = process.env.PORT || 4000;

// Configure multer for memory storage with image type filter
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}. Accepted: JPEG, PNG, WebP, GIF, BMP.`));
    }
  }
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize LangGraph Pipeline
const pipeline = buildVedaAIPipeline();

// Neo4j Driver for metadata endpoints
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// Multer error handler middleware
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Image exceeds 10 MB size limit.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err && err.message && err.message.startsWith('Unsupported image type')) {
    return res.status(415).json({ success: false, error: err.message });
  }
  next(err);
}
app.use(handleMulterError);

/**
 * Health check & status endpoint
 */
app.get('/api/status', async (req, res) => {
  try {
    const session = driver.session();
    const result = await session.run('MATCH (n) RETURN count(n) AS node_count');
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS rel_count');
    await session.close();

    res.json({
      status: 'online',
      neo4j: {
        connected: true,
        instanceId: process.env.AURA_INSTANCEID || 'ff765efc',
        nodes: result.records[0].get('node_count').toInt(),
        relationships: relResult.records[0].get('rel_count').toInt()
      },
      gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: require('./engine/llm_client').modelName || 'not configured',
        embeddingModel: require('./engine/vector_store').MODEL_NAME,
        embeddingDimensions: 3072
      },
      langgraph: {
        status: 'active',
        architecture: 'Five-stage Gemini debate with parallel Neo4j + vector retrieval'
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Get catalog of all 25 Classical Ayurvedic Herbs in Neo4j
 */
app.get('/api/herbs', async (req, res) => {
  try {
    const session = driver.session();
    const result = await session.run(`
      MATCH (h:Herb)
      OPTIONAL MATCH (h)-[r:PACIFIES]->(p:Dosha)
      OPTIONAL MATCH (h)-[a:AGGRAVATES]->(ag:Dosha)
      RETURN h.name AS name,
             h.botanical_name AS botanical_name,
             h.sanskrit_name AS sanskrit_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.therapeutic_uses AS therapeutic_uses,
             collect(DISTINCT p.name) AS pacifies,
             collect(DISTINCT ag.name) AS aggravates
      ORDER BY h.name ASC
    `);
    await session.close();

    const herbs = result.records.map(r => r.toObject());
    res.json({ count: herbs.length, herbs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Primary Clinical Query Endpoint (Executes LangGraph 5-Agent Pipeline)
 */
app.post('/api/chat', async (req, res) => {
  const { query, prakriti, conditions, season } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const startTime = Date.now();

  try {
    const finalState = await pipeline.invoke({
      raw_query: query.trim(),
      user_profile: {
        prakriti: prakriti || 'Pitta-Vata',
        chronic_conditions: Array.isArray(conditions)
          ? conditions
          : (conditions ? conditions.split(',').map(c => c.trim()) : []),
        current_season: season || 'Grishma'
      }
    });

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      durationMs,
      result: finalState.final_response,
      confidenceScore: finalState.confidence_score,
      trace: {
        canonicalEntities: finalState.canonical_entities,
        retrievalPlan: finalState.retrieval_plan,
        agentExecutions: finalState.agent_trace,
        proponentDraft: finalState.proponent_draft,
        opponentVerdict: finalState.opponent_verdict,
        opponentFlags: finalState.opponent_flags,
        graphFacts: {
          herbDetails: finalState.graph_facts?.herbDetails || [],
          doshaRelations: finalState.graph_facts?.doshaRelations || [],
          seasonInfo: finalState.graph_facts?.seasonInfo || [],
          conditionInfo: finalState.graph_facts?.conditionInfo || [],
          contraindications: finalState.graph_facts?.contraindications || [],
          alternatives: finalState.graph_facts?.alternatives || [],
          vectorMatches: finalState.graph_facts?.vectorMatches || []
        }
      }
    });
  } catch (err) {
    console.error('API execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      durationMs: Date.now() - startTime
    });
  }
});

/**
 * Phase 4: Multimodal Vision & OCR Endpoint
 * Scans packaging or herb photo and performs Neo4j Graph Membership Verification
 */
app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      const parts = req.body.imageBase64.split(';base64,');
      if (parts.length === 2) {
        mimeType = parts[0].replace('data:', '');
        imageBuffer = Buffer.from(parts[1], 'base64');
      } else {
        imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
      }
    } else {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const visionResult = await visionAgent.analyzeImage(imageBuffer, mimeType);
    res.json({ success: true, scan: visionResult });
  } catch (err) {
    console.error('Vision analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Phase 4: End-to-End Multimodal Seeding & Clinical Consultation Endpoint
 * Takes image + user profile, seeds detected herb into LangGraph pipeline
 */
app.post('/api/consult-with-image', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  try {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      const parts = req.body.imageBase64.split(';base64,');
      if (parts.length === 2) {
        mimeType = parts[0].replace('data:', '');
        imageBuffer = Buffer.from(parts[1], 'base64');
      } else {
        imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
      }
    } else {
      return res.status(400).json({ error: 'Image is required' });
    }

    const { query, prakriti, conditions, season } = req.body;

    // 1. Run Multimodal Vision Agent
    const visionResult = await visionAgent.analyzeImage(imageBuffer, mimeType);

    if (!visionResult.is_ayurvedic_or_herbal) {
      return res.json({
        success: true,
        isOutOfDomain: true,
        scan: visionResult,
        result: {
          final_verdict: 'OUT_OF_DOMAIN',
          confidence_score: visionResult.visual_confidence,
          summary_message: 'The uploaded image does not appear to be an Ayurvedic medicine or medicinal plant. Please upload a clear photo of an Ayurvedic medicine container, supplement label, or raw herb.',
          disclaimer: 'VedaAI Multimodal Gate strictly filters out-of-domain objects.'
        }
      });
    }

    // 2. Formulate query using detected herbs
    const verifiedHerbs = visionResult.graph_membership?.verified_herbs?.map(h => h.canonical_name) || [];
    const detectedNames = verifiedHerbs.length > 0 ? verifiedHerbs : (visionResult.detected_herbs || ['Ayurvedic Herbal Product']);

    const effectiveQuery = query && query.trim()
      ? `${query.trim()} (Item identified from photo: ${detectedNames.join(', ')})`
      : `Can I take ${detectedNames.join(', ')}? Is it safe for my condition?`;

    // 3. Execute LangGraph StateGraph pipeline
    const finalState = await pipeline.invoke({
      raw_query: effectiveQuery,
      user_profile: {
        prakriti: prakriti || 'Pitta-Vata',
        chronic_conditions: Array.isArray(conditions)
          ? conditions
          : (conditions ? conditions.split(',').map(c => c.trim()) : []),
        current_season: season || 'Grishma'
      }
    });

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      durationMs,
      scan: visionResult,
      result: finalState.final_response,
      confidenceScore: finalState.confidence_score,
      trace: {
        canonicalEntities: finalState.canonical_entities,
        retrievalPlan: finalState.retrieval_plan,
        agentExecutions: finalState.agent_trace,
        proponentDraft: finalState.proponent_draft,
        opponentVerdict: finalState.opponent_verdict,
        opponentFlags: finalState.opponent_flags,
        graphFacts: finalState.graph_facts
      }
    });
  } catch (err) {
    console.error('Multimodal consultation error:', err);
    res.status(500).json({ success: false, error: err.message, durationMs: Date.now() - startTime });
  }
});

/**
 * Multi-Turn Clinical Follow-Up Q&A Endpoint
 * Handles follow-up questions about dosage, Anupana, diet, and precautions
 */
app.post('/api/follow-up', async (req, res) => {
  try {
    const { followUpQuery, consultationContext, history } = req.body;
    if (!followUpQuery || !followUpQuery.trim()) {
      return res.status(400).json({ error: 'Follow-up query is required' });
    }

    const followUpResult = await handleClinicalFollowUp({
      followUpQuery: followUpQuery.trim(),
      consultationContext: consultationContext || {},
      history: history || []
    });

    res.json({
      success: true,
      data: followUpResult
    });
  } catch (err) {
    console.error('Follow-up error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Label Audit: Ingredient-by-Ingredient Product Safety Analysis
 * Extracts ingredients from a label photo, verifies each against the herb
 * catalog, and runs per-ingredient graph safety checks.
 */
app.post('/api/label-audit', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  try {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      const parts = req.body.imageBase64.split(';base64,');
      if (parts.length === 2) {
        mimeType = parts[0].replace('data:', '');
        imageBuffer = Buffer.from(parts[1], 'base64');
      } else {
        imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
      }
    } else {
      return res.status(400).json({ success: false, error: 'Image is required. Upload a photo of a supplement or medicine label.' });
    }

    if (imageBuffer.length < 1024) {
      return res.status(400).json({ success: false, error: 'Image appears empty or too small. Please upload a clear photo.' });
    }

    const { prakriti, season, conditions } = req.body;
    const conditionsArray = Array.isArray(conditions)
      ? conditions
      : (conditions ? conditions.split(',').map(c => c.trim()).filter(Boolean) : []);

    const result = await labelAudit.auditLabel(imageBuffer, mimeType, {
      prakriti: prakriti || 'Tridoshic',
      season: season || 'Hemanta',
      conditions: conditionsArray
    });

    res.json({
      success: true,
      durationMs: Date.now() - startTime,
      ...result
    });
  } catch (err) {
    console.error('Label audit error:', err);
    res.status(500).json({ success: false, error: err.message, durationMs: Date.now() - startTime });
  }
});

/**
 * Clinical Verification Feedback Endpoint
 * Captures clinician or patient verification feedback on recommendation accuracy
 */
app.post('/api/feedback', async (req, res) => {
  try {
    const { query, verdict, feedback, notes } = req.body;
    const record = {
      timestamp: new Date().toISOString(),
      query: query || null,
      verdict: verdict || null,
      feedback: feedback || null,
      notes: notes || null
    };

    const feedbackDir = path.join(__dirname, 'data');
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }
    const feedbackFile = path.join(feedbackDir, 'clinical_feedback.jsonl');
    fs.appendFileSync(feedbackFile, JSON.stringify(record) + '\n', 'utf8');

    console.log(`\n📋 [CLINICAL FEEDBACK SAVED] Verdict: "${verdict}" | Rating: ${feedback} | Note: "${notes || 'N/A'}"`);
    res.json({
      success: true,
      message: 'Clinical feedback successfully recorded for safety calibration.'
    });
  } catch (err) {
    console.error('Feedback recording error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n═════════════════════════════════════════════════════════════════`);
  console.log(`  🌿 VedaAI Web Application & API Server`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  API Status:  http://localhost:${PORT}/api/status`);
  console.log(`  Herbs API:   http://localhost:${PORT}/api/herbs`);
  console.log(`═════════════════════════════════════════════════════════════════\n`);
});
