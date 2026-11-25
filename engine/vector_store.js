require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_NAME = 'gemini-embedding-001';
const INDEX_PATH = path.join(__dirname, '..', 'data', 'classical_embeddings.json');
let model;

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'YOUR_GEMINI_API_KEY') throw new Error('GEMINI_API_KEY is required for vector search.');
  if (!model) model = new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL_NAME });
  return model;
}

async function embedText(text) {
  if (!text || !String(text).trim()) throw new Error('Cannot embed empty text.');
  const result = await getModel().embedContent({
    content: { role: 'user', parts: [{ text: String(text) }] },
    taskType: 'RETRIEVAL_QUERY'
  });
  const vector = result.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== 3072) {
    throw new Error(`Expected a ${MODEL_NAME} 3072-dimensional embedding; received ${vector?.length || 0}.`);
  }
  return vector;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function loadIndex(indexPath = INDEX_PATH) {
  if (!fs.existsSync(indexPath)) throw new Error(`Vector index not found at ${indexPath}. Run node scripts/seed_vector_store.js first.`);
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (!Array.isArray(index.chunks)) throw new Error('Vector index has no chunks array.');
  return index.chunks;
}

async function search(queryText, topK = 3) {
  const queryVector = await embedText(queryText);
  return loadIndex()
    .filter(chunk => Array.isArray(chunk.embedding) && chunk.embedding.length === queryVector.length)
    .map(({ embedding, ...chunk }) => ({
      id: chunk.id,
      title: chunk.title,
      text: chunk.text,
      source: chunk.source,
      similarityScore: cosineSimilarity(queryVector, embedding)
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, Math.max(1, Number(topK) || 3));
}

async function embedTexts(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const m = getModel();
  const result = await m.batchEmbedContents({
    requests: texts.map(text => ({
      content: { role: 'user', parts: [{ text }] },
      taskType
    }))
  });
  const vectors = result.embeddings?.map(item => item.values) || [];
  if (vectors.length !== texts.length || vectors.some(v => !Array.isArray(v) || v.length !== 3072)) {
    throw new Error(`Embedding batch returned invalid dimensions; expected ${texts.length} vectors of 3072 values.`);
  }
  return vectors;
}

module.exports = { MODEL_NAME, INDEX_PATH, embedText, embedTexts, cosineSimilarity, search, loadIndex };
