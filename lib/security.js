const crypto = require('crypto');
const cors = require('cors');
const { z } = require('zod');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp'
]);

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000'
];

class CatalogUnavailableError extends Error {
  constructor(cause) { super('Catalog verification unavailable.', { cause }); }
}

class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Attach unique requestId for server-side correlation logs without leaking internals.
 */
function attachRequestId(req, res, next) {
  const reqId = crypto.randomUUID();
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

/**
 * Log internal diagnostics strictly server-side.
 */
function logServerError(context, err, reqId = null, status = 500) {
  const event = { event: 'request_failed', requestId: reqId, operation: context, status };
  if (['invalid_model_output', 'provider_unavailable'].includes(err?.reason)) event.reason = err.reason;
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 600) event.upstreamStatus = err.status;
  console.error(JSON.stringify(event));
}

/**
 * Defensive HTTP security headers compatible with React/Vite + Google Fonts + inline preview images.
 */
function securityHeadersMiddleware() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  return function applySecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Content-Security-Policy', csp);
    if (req.secure || process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

/**
 * Prevent caching of API responses containing clinical outputs.
 */
function noCacheApiMiddleware(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
}

/**
 * Resolve explicit allowed CORS origins from env/options.
 * When CORS_ALLOWED_ORIGINS is explicitly provided, only those origins are allowed.
 * In production without CORS_ALLOWED_ORIGINS, cross-origin requests are denied.
 */
function resolveAllowedOrigins(explicitOrigins, env = process.env) {
  if (Array.isArray(explicitOrigins)) {
    return new Set(explicitOrigins.map(o => String(o).trim()).filter(Boolean));
  }
  const rawEnv = typeof env.CORS_ALLOWED_ORIGINS === 'string' ? env.CORS_ALLOWED_ORIGINS.trim() : '';
  if (rawEnv) {
    return new Set(rawEnv.split(',').map(o => o.trim()).filter(Boolean));
  }
  if (env.NODE_ENV === 'production') {
    return new Set();
  }
  return new Set(DEFAULT_DEV_ORIGINS);
}

/**
 * Restricted CORS middleware denying unconfigured origins with HTTP 403.
 */
function createCorsMiddleware(options = {}) {
  const allowedOrigins = resolveAllowedOrigins(options.allowedOrigins);
  const delegate = cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new HttpError(403, 'Cross-origin request blocked by CORS policy.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  return function restrictedCors(req, res, next) {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({
        success: false,
        error: 'Cross-origin request blocked by CORS policy.'
      });
    }
    return delegate(req, res, next);
  };
}

/**
 * Inspect binary magic bytes to determine the actual image file format.
 */
function detectImageSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // GIF: GIF87a / GIF89a
  if (buffer.length >= 6) {
    const sig = buffer.subarray(0, 6).toString('ascii');
    if (sig === 'GIF87a' || sig === 'GIF89a') {
      return 'image/gif';
    }
  }

  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }

  return null;
}

/**
 * Decode and validate an uploaded image from either multipart req.file or base64 JSON field.
 * Enforces allowed format allowlist, size limit, and binary magic-byte signature verification.
 */
function extractAndValidateImage(req, { minBytes = 32, maxBytes = MAX_IMAGE_BYTES } = {}) {
  let imageBuffer = null;
  let declaredMime = null;

  if (req.file) {
    imageBuffer = req.file.buffer;
    declaredMime = req.file.mimetype ? String(req.file.mimetype).toLowerCase().trim() : null;
  } else if (typeof req.body?.imageBase64 === 'string' && req.body.imageBase64.trim()) {
    const raw = req.body.imageBase64.trim();
    const dataUriMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
    let base64Payload = raw;

    if (dataUriMatch) {
      declaredMime = dataUriMatch[1].toLowerCase().trim();
      if (!ALLOWED_IMAGE_MIMES.has(declaredMime)) {
        throw new HttpError(
          415,
          'Unsupported image MIME type. Accepted formats: JPEG, PNG, WebP, GIF, BMP.'
        );
      }
      base64Payload = dataUriMatch[2].replace(/\s+/g, '');
    } else if (raw.startsWith('data:')) {
      throw new HttpError(400, 'Malformed base64 data URI for image.');
    } else {
      base64Payload = raw.replace(/\s+/g, '');
    }

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Payload) || base64Payload.length % 4 !== 0) {
      throw new HttpError(400, 'Invalid base64 image encoding.');
    }

    const estimatedBytes = (base64Payload.length / 4) * 3 - (base64Payload.endsWith('==') ? 2 : base64Payload.endsWith('=') ? 1 : 0);
    if (estimatedBytes > maxBytes) {
      throw new HttpError(413, 'Image exceeds 10 MB size limit.');
    }
    imageBuffer = Buffer.from(base64Payload, 'base64');
  } else {
    throw new HttpError(400, 'Image upload is required.');
  }

  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new HttpError(400, 'Uploaded image is empty.');
  }
  if (imageBuffer.length > maxBytes) {
    throw new HttpError(413, 'Image exceeds 10 MB size limit.');
  }

  const detectedMime = detectImageSignature(imageBuffer);
  if (!detectedMime || !ALLOWED_IMAGE_MIMES.has(detectedMime)) {
    throw new HttpError(
      415,
      'Unsupported or invalid image file signature. Accepted formats: JPEG, PNG, WebP, GIF, BMP.'
    );
  }

  if (declaredMime && declaredMime !== detectedMime) {
    throw new HttpError(
      415,
      'Image file signature does not match its declared Content-Type.'
    );
  }

  if (imageBuffer.length < minBytes) {
    throw new HttpError(
      400,
      'Image is too small for reliable analysis. Please upload a clearer image.'
    );
  }

  return { imageBuffer, mimeType: detectedMime };
}

/**
 * Zod request schemas
 */
const listField = z.union([
  z.array(z.string().trim().min(1).max(120)).max(20),
  z.string().max(1800).transform(value => value.split(',').map(item => item.trim()).filter(Boolean))
]).pipe(z.array(z.string().min(1).max(120)).max(20)).optional();

const shortField = z.string().trim().max(80).optional();
const profileFields = {
  prakriti: shortField, season: shortField, vikriti: shortField, ageGroup: shortField,
  biologicalSex: shortField, dietaryPreference: shortField,
  conditions: listField, medications: listField, allergies: listField,
  avoidAlcoholExtracts: z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]).optional()
};
const imageBase64 = z.string().max(15 * 1024 * 1024).optional();
const query = z.string().trim().min(1).max(2000);
const chatRequestSchema = z.strictObject({ ...profileFields, query });
const consultWithImageFieldsSchema = z.strictObject({ ...profileFields, query: z.string().trim().max(2000).optional(), imageBase64 });
const scanBodySchema = z.strictObject({ imageBase64 });
const labelAuditFieldsSchema = z.strictObject({ ...profileFields, imageBase64 });

const followUpRequestSchema = z.strictObject({
  followUpQuery: z.string().trim().min(1, 'Follow-up query is required.').max(2000, 'Follow-up query exceeds 2000 characters.'),
  consultationId: z.string().uuid().optional(),
  evidenceIds: z.array(z.string().min(1).max(128)).max(5).optional(),
  consultationContext: z.object({
    originalQuery: z.string().trim().max(2000).optional(),
    finalVerdict: z.string().trim().max(200).optional(),
    summaryMessage: z.string().trim().max(4000).optional(),
    prakriti: z.string().trim().max(60).optional(),
    season: z.string().trim().max(60).optional(),
    conditions: listField,
    recommendedHerbs: z.array(z.string().trim().max(120)).max(20).optional()
  }).strip().optional(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().max(4000)
    }).strip()
  ).max(30).optional()
});

const feedbackRequestSchema = z.strictObject({
  query: z.string().trim().max(2000).optional(),
  verdict: z.string().trim().max(200).optional(),
  feedback: z.enum(['accurate', 'discrepancy', 'helpful', 'inaccurate', 'needs_review']),
  notes: z.string().trim().max(1000).optional()
});

/**
 * Parse and validate data with Zod, raising a sanitized 400 HttpError on failure.
 */
function parseWithSchema(schema, data) {
  const parsed = schema.safeParse(data ?? {});
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid request payload.');
  }
  return parsed.data;
}

/**
 * Centralized sanitized HTTP error middleware.
 */
function createErrorHandler() {
  return function errorHandler(err, req, res, _next) {
    const reqId = req.requestId;

    if (err instanceof CatalogUnavailableError) {
      logServerError(req.route?.path || 'catalog', err, reqId, 503);
      return res.status(503).json({ success: false, status: 'CATALOG_UNAVAILABLE', error: err.message });
    }

    // Multer limit / MIME errors
    if (err && err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Image exceeds 10 MB size limit.' });
      }
      const status = ['LIMIT_PART_COUNT', 'LIMIT_FIELD_VALUE', 'LIMIT_FIELD_COUNT', 'LIMIT_FILE_COUNT'].includes(err.code) ? 413 : 400;
      return res.status(status).json({ success: false, error: 'Invalid file upload request.' });
    }
    if (err && err.message && err.message.startsWith('Unsupported image type')) {
      return res.status(415).json({
        success: false,
        error: 'Unsupported image MIME type. Accepted formats: JPEG, PNG, WebP, GIF, BMP.'
      });
    }

    // Malformed JSON request body from express.json()
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
    }

    if (typeof err?.type === 'string' && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
      return res.status(err.status).json({ success: false, error: err.status === 413 ? 'Request exceeds size limit.' : 'Invalid request body.' });
    }

    // Explicit safe client HttpErrors (4xx)
    if (err instanceof HttpError && err.statusCode >= 400 && err.statusCode < 500) {
      const payload = { success: false, error: err.message };
      if (err.details) payload.details = err.details;
      return res.status(err.statusCode).json(payload);
    }

    // Internal/unexpected 5xx errors: log full diagnostics server-side, never leak to client
    const status = err?.statusCode && err.statusCode >= 500 && err.statusCode < 600
      ? err.statusCode
      : ([429, 502, 503, 504].includes(err?.status) ? 503 : 500);
    logServerError(req.route?.path || 'api', err, reqId, status);
    const message = status === 503
      ? 'Service temporarily unavailable. Please try again later.'
      : 'An internal service error occurred. Please try again later.';

    return res.status(status).json({
      success: false,
      error: message,
      requestId: reqId
    });
  };
}

module.exports = {
  ALLOWED_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
  HttpError, CatalogUnavailableError,
  attachRequestId,
  logServerError,
  securityHeadersMiddleware,
  noCacheApiMiddleware,
  resolveAllowedOrigins,
  createCorsMiddleware,
  detectImageSignature,
  extractAndValidateImage,
  chatRequestSchema,
  consultWithImageFieldsSchema,
  scanBodySchema,
  labelAuditFieldsSchema,
  followUpRequestSchema,
  feedbackRequestSchema,
  parseWithSchema,
  createErrorHandler
};
