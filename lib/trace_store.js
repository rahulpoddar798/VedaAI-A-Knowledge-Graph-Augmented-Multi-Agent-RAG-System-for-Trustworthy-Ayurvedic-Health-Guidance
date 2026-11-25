/**
 * Bounded server-side execution trace store.
 * Retains detailed internal LangGraph, Cypher, and safety-audit telemetry strictly
 * server-side until authenticated RBAC endpoints are introduced in later phases.
 */

const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const digest = token => createHash('sha256').update(token).digest();

const DEFAULT_MAX_ENTRIES = 200;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

class TraceStore {
  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, ttlMs = DEFAULT_TTL_MS } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.entries = new Map();
    this.expiryTimer = null;
  }

  saveConsultation(id, type, payload) {
    const token = randomBytes(32).toString('base64url');
    this.saveTrace(id, type, payload);
    this.entries.get(id).accessDigest = digest(token);
    return token;
  }

  authorizedConsultation(id, authorization) {
    const token = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization || '')?.[1];
    if (!token) return null;
    const trace = this.getTrace(id);
    return trace?.accessDigest && timingSafeEqual(trace.accessDigest, digest(token)) ? trace.payload : null;
  }

  saveTrace(id, type, payload) {
    if (!id) return;
    this.pruneExpired();
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(id, {
      id,
      type,
      createdAt: Date.now(),
      payload
    });
    if (!this.expiryTimer) this.scheduleExpiry();
  }

  scheduleExpiry() {
    const oldest = this.entries.values().next().value;
    if (!oldest) return;
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.pruneExpired();
      this.scheduleExpiry();
    }, Math.max(1, oldest.createdAt + this.ttlMs - Date.now()));
    this.expiryTimer.unref();
  }

  getTrace(id) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    if (Date.now() - entry.createdAt >= this.ttlMs) {
      this.entries.delete(id);
      return null;
    }
    return entry;
  }

  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now - entry.createdAt >= this.ttlMs) {
        this.entries.delete(key);
      }
    }
  }

  size() {
    this.pruneExpired();
    return this.entries.size;
  }

  clear() {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    this.entries.clear();
  }
}

module.exports = {
  TraceStore,
  defaultTraceStore: new TraceStore()
};
