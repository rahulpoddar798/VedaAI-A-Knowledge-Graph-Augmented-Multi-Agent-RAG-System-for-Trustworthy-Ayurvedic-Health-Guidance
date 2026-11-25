const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { z } = require('zod');
const vectors = require('./vector_store');
const root = path.join(__dirname, '../data/source_documents');
const optional = z.string().trim().min(1).max(1024).optional();
const manifest = z.strictObject({
  title: z.string().trim().min(1).max(300),
  kind: z.enum(['classical', 'research']),
  author: optional,
  edition: optional,
  section: optional,
  verse: optional,
  translation: optional,
  page: z.number().int().positive().optional(),
});
const digest = (b) => createHash('sha256').update(b).digest('hex');
async function immutable(file, bytes) {
  const temp = file + '.' + randomUUID() + '.tmp';
  await fs.writeFile(temp, bytes, { flag: 'wx' });
  try {
    await fs.link(temp, file);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  } finally {
    await fs.unlink(temp);
  }
}
async function ingest(file, metadata, dir = root, embed = vectors.embedTexts) {
  const meta = manifest.parse(metadata);
  if (path.extname(file).toLowerCase() !== '.txt' || (await fs.stat(file)).size > 256 * 1024)
    throw Error('Expected a UTF-8 text source up to 256 KiB.');
  const bytes = await fs.readFile(file),
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (!text.trim()) throw Error('Empty source');
  const sourceId = digest(bytes),
    id = digest(JSON.stringify([sourceId, meta, vectors.MODEL_NAME]));
  await fs.mkdir(dir, { recursive: true });
  await immutable(path.join(dir, sourceId + '.txt'), bytes);
  const indexFile = path.join(dir, id + '.json');
  try {
    await fs.access(indexFile);
    return id;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const chunks = [];
  for (let start = 0; start < text.length; ) {
    let end = Math.min(start + 1200, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    chunks.push({ start, end, text: text.slice(start, end) });
    start = end;
  }
  for (let i = 0; i < chunks.length; i += 8) {
    const batch = chunks.slice(i, i + 8),
      embeddings = await embed(batch.map((c) => c.text));
    batch.forEach((c, j) => {
      c.embedding = embeddings[j];
      if (!valid(c.embedding)) throw Error('Invalid source embedding');
    });
  }
  await immutable(indexFile, JSON.stringify({ sourceId, meta, model: vectors.MODEL_NAME, chunks }));
  return id;
}
const valid = (v) =>
  Array.isArray(v) && v.length === 3072 && v.every(Number.isFinite) && v.some((n) => n !== 0);
const cache = new Map();
async function search(query, dir = root, embed = vectors.embedText) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  const indexes = names.sort().filter((n) => /^[a-f0-9]{64}\.json$/.test(n));
  if (!indexes.length) return [];
  if (indexes.length > 64) throw Error('Document index capacity exceeded');
  const q = await embed(query);
  if (!valid(q)) throw Error('Invalid query embedding');
  const ranked = [];
  for (const name of indexes) {
    const p = path.join(dir, name);
    if (!cache.has(p)) {
      const index = JSON.parse(await fs.readFile(p, 'utf8')),
        meta = manifest.parse(index.meta);
      if (
        !/^[a-f0-9]{64}$/.test(index.sourceId) ||
        index.model !== vectors.MODEL_NAME ||
        digest(JSON.stringify([index.sourceId, meta, index.model])) + '.json' !== name
      )
        throw Error('Invalid document identity');
      const bytes = await fs.readFile(path.join(dir, index.sourceId + '.txt'));
      if (digest(bytes) !== index.sourceId) throw Error('Source digest mismatch');
      const text = bytes.toString('utf8');
      if (
        !index.chunks.every(
          (c) =>
            Number.isInteger(c.start) &&
            Number.isInteger(c.end) &&
            c.start >= 0 &&
            c.end <= text.length &&
            c.start < c.end &&
            text.slice(c.start, c.end) === c.text &&
            valid(c.embedding),
        )
      )
        throw Error('Invalid passage');
      cache.set(p, index);
    }
    const { sourceId, meta, chunks } = cache.get(p);
    const { kind, title, ...metadata } = meta;
    for (const c of chunks)
      ranked.push({
        kind,
        title,
        metadata: { ...metadata, documentId: sourceId, chunkId: sourceId + '@' + c.start + '-' + c.end },
        sourceId,
        location: 'UTF-16 offsets ' + c.start + '–' + c.end,
        excerpt: c.text,
        method: 'vector',
        relevance: vectors.cosineSimilarity(q, c.embedding),
      });
  }
  return ranked.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}
module.exports = { ingest, search };
if (require.main === module)
  fs.readFile(process.argv[3], 'utf8')
    .then(JSON.parse)
    .then((meta) => ingest(process.argv[2], meta))
    .then(console.log)
    .catch(() => {
      console.error(
        'Document import failed. Check metadata, original text and embedding configuration.',
      );
      process.exitCode = 1;
    });
