require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { loadLocalGraph } = require('../local_graph');
const { MODEL_NAME, embedTexts, INDEX_PATH } = require('../engine/vector_store');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'classical_embeddings.json');

function makeCorpus() {
  const { herbs } = loadLocalGraph();
  return Object.values(herbs).map((herb, index) => {
    const effects = herb.relationships
      .filter(rel => rel.targetLabel === 'Dosha')
      .map(rel => `${rel.rel} ${rel.targetName}: ${rel.reason}`);
    const indications = [...new Set([
      ...herb.treats,
      ...(herb.therapeutic_uses || '').split(',').map(value => value.trim()).filter(Boolean)
    ])];
    const text = [
      `${herb.name} (${herb.sanskrit_name || 'Sanskrit name not recorded'}; ${herb.botanical_name}) is represented in the VedaAI materia-medica graph with rasa ${herb.rasa || 'not recorded'}, virya ${herb.virya || 'not recorded'}, vipaka ${herb.vipaka || 'not recorded'}, and guna ${herb.guna || 'not recorded'}.`,
      indications.length ? `Recorded therapeutic-use and condition links include: ${indications.join(', ')}.` : 'No therapeutic-use or condition links are recorded for this herb in the current seed graph.',
      effects.length ? `Recorded dosha relationships are: ${effects.join('; ')}.` : 'No dosha relationships are recorded for this herb in the current seed graph.',
      herb.contraindicated_in.length ? `Recorded seasonal contraindications are: ${herb.contraindicated_in.map(x => `${x.season} (${x.season_english}): ${x.reason}`).join('; ')}.` : 'No seasonal contraindication edge is recorded for this herb in the current seed graph.',
      'This is a graph-derived VedaAI reference summary, not a translated or quoted passage from a classical Ayurvedic text.'
    ].join(' ');
    return {
      id: `graph-herb-${String(index + 1).padStart(2, '0')}`,
      title: `${herb.name} — materia-medica profile`,
      text,
      source: 'VedaAI seed graph (IMPPAT 2.0-derived properties and project-authored ontology relations; not a direct Charaka Samhita or Sushruta Samhita citation)',
      metadata: {
        canonicalName: herb.name,
        botanicalName: herb.botanical_name,
        sourceType: 'graph-derived-summary',
        citationVerified: false
      }
    };
  });
}

async function main() {
  const corpus = makeCorpus();
  if (corpus.length !== 25) throw new Error(`Expected 25 catalog herb summaries, found ${corpus.length}.`);
  const chunks = [];
  // Small batches keep request size bounded and make partial progress easy to inspect.
  for (let offset = 0; offset < corpus.length; offset += 5) {
    const batch = corpus.slice(offset, offset + 5);
    const embeddings = await embedTexts(batch.map(item => item.text));
    chunks.push(...batch.map((item, i) => ({ ...item, embedding: embeddings[i] })));
    console.log(`Embedded ${Math.min(offset + batch.length, corpus.length)}/${corpus.length} herb summaries.`);
  }
  const output = {
    schemaVersion: 1,
    model: MODEL_NAME,
    dimensions: 3072,
    generatedAt: new Date().toISOString(),
    corpusNotice: 'Graph-derived VedaAI summaries for retrieval. These are not primary-source quotations or verified Samhita passages.',
    chunks
  };
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`Wrote ${chunks.length} chunks to ${OUTPUT_PATH}`);
}

main().catch(error => {
  console.error('Vector-store seeding failed:', error.message);
  process.exitCode = 1;
});
