const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadLocalGraph } = require('../local_graph');
const { getSharedDriver } = require('../lib/neo4j_config');
const files = [
  'Plant_Information_IMPPAT.tsv',
  'IMPPAT_TherapeuticUse_Plant_Association.tsv',
  'IMPPAT_SingleHerbalFormulations.tsv',
];

function table(file) {
  const bytes = fs.readFileSync(path.join(__dirname, '../data', file));
  const sourceId = crypto.createHash('sha256').update(bytes).digest('hex');
  const [head, ...lines] = bytes
    .toString('utf8')
    .replace(/[\r\n]+$/g, '')
    .split(/\r?\n/);
  const columns = head.split('\t');
  return lines.map((line, index) => {
    const values = line.split('\t');
    if (values.length !== columns.length)
      throw Error('Invalid table width at ' + file + ' line ' + (index + 2));
    return {
      data: Object.fromEntries(columns.map((k, i) => [k, values[i]])),
      line: index + 2,
      sourceId,
      file,
    };
  });
}
let catalog;
function catalogIndex() {
  if (catalog) return catalog;
  const aliases = new Map(),
    uses = new Map(),
    byUse = new Map(),
    formulations = new Map();
  function alias(term, botanical) {
    const key = term?.trim().toLowerCase();
    if (!key || key.length < 3) return;
    if (!aliases.has(key)) aliases.set(key, new Set());
    aliases.get(key).add(botanical);
  }
  for (const { data: r } of table(files[0])) {
    for (const name of [
      r.Indian_Medicinal_plant,
      ...r.Common_name.split('|'),
      ...r['Synonymous names'].split('|'),
    ])
      alias(name, r.Indian_Medicinal_plant);
  }
  for (const h of Object.values(loadLocalGraph().herbs))
    for (const name of [
      h.name,
      h.botanical_name,
      h.sanskrit_name,
      h.common_name,
      ...h.synonyms.split(','),
    ])
      alias(name, h.botanical_name);
  for (const row of table(files[1])) {
    const key = row.data.Indian_Medicinal_plant.toLowerCase();
    if (!uses.has(key)) uses.set(key, []);
    uses.get(key).push(row);
    const term = row.data.Therapeutic_use.toLowerCase();
    if (!byUse.has(term)) byUse.set(term, []);
    byUse.get(term).push(row);
  }
  for (const row of table(files[2])) {
    const key = row.data.Plant_name_standardised.toLowerCase();
    if (!formulations.has(key)) formulations.set(key, []);
    formulations.get(key).push(row);
  }
  catalog = { aliases, uses, byUse, formulations };
  return catalog;
}
function extract(query) {
  const { aliases } = catalogIndex();
  const words = query.toLowerCase().match(/[\p{L}\p{M}-]+/gu) || [];
  const plants = new Set(),
    ambiguous = new Set();
  for (let i = 0; i < words.length; i++)
    for (let n = Math.min(8, words.length - i); n > 0; n--) {
      const term = words.slice(i, i + n).join(' '),
        hits = aliases.get(term);
      if (!hits) continue;
      if (hits.size === 1) plants.add([...hits][0]);
      else ambiguous.add(term);
      i += n - 1;
      break;
    }
  return { plants: [...plants].slice(0, 12), ambiguous: [...ambiguous, ...[...plants].slice(12)] };
}
function reportedUses({ plants, query }) {
  const { uses, byUse, formulations } = catalogIndex();
  const terms = new Set(query.toLowerCase().match(/[a-z]{3,}/g) || []);
  const normalized =
    ' ' +
    query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim() +
    ' ';
  const rows = plants.length
    ? plants.flatMap((p) => uses.get(p.toLowerCase()) || [])
    : [...byUse.keys()]
        .filter((term) => normalized.includes(' ' + term + ' '))
        .flatMap((term) => byUse.get(term).slice(0, 24));
  const formulaRows = /formulation|ingredient|plant part/i.test(query)
    ? plants.flatMap((p) => formulations.get(p.toLowerCase()) || []).slice(0, 8)
    : [];
  const matches = rows.filter(({ data: r }) =>
    r.Therapeutic_use.toLowerCase()
      .split(/\W+/)
      .some((t) => terms.has(t)),
  );
  const associations = matches.slice(0, 24).map(({ data: r, sourceId, file, line }) => ({
    kind: 'association',
    method: 'table',
    title: file,
    sourceId,
    location: 'line ' + line,
    excerpt: r.Indian_Medicinal_plant + ' | ' + r.Plant_part + ' | ' + r.Therapeutic_use,
    fact: {
      subject: r.Indian_Medicinal_plant,
      predicate: 'HAS_REPORTED_USE',
      object: r.Therapeutic_use,
    },
    metadata: r.Plant_part ? { plantPart: r.Plant_part } : {},
  }));
  return [
    ...associations,
    ...formulaRows.map(({ data: r, sourceId, file, line }) => ({
      kind: 'association',
      method: 'table',
      title: file,
      sourceId,
      location: 'line ' + line,
      excerpt: [
        r.Formulation_identifier,
        r.Formulation_name_in_API_original,
        r.Ingredient_name_standardised,
        r.Plant_part_standardised,
      ].join(' | '),
      fact: {
        subject: r.Formulation_identifier,
        predicate: 'HAS_REPORTED_INGREDIENT',
        object: r.Ingredient_name_standardised,
      },
      metadata: r.Plant_part_standardised ? { plantPart: r.Plant_part_standardised } : {},
    })),
  ];
}
async function graph({ plants, season, prakriti, conditions }) {
  if (!plants.length) return [];
  const session = getSharedDriver().session({ defaultAccessMode: 'READ' });
  try {
    const result = await session.executeRead(
      (tx) =>
        tx.run(
          'MATCH (h:Herb) WHERE h.botanical_name IN $plants OPTIONAL MATCH (h)-[:CONTRAINDICATED_IN]->(s:Season) WHERE toLower(s.name)=toLower($season) OR toLower(s.english)=toLower($season) RETURN DISTINCT h.name AS herb,h.botanical_name AS botanical,s.name AS season LIMIT 36',
          { plants, season: season || '' },
        ),
      { timeout: 5000 },
    );
    const context = await session.executeRead(
      (tx) =>
        tx.run(
          'MATCH (h:Herb)-[r:PACIFIES|AGGRAVATES]->(d:Dosha) WHERE h.botanical_name IN $plants AND (d.name IN $doshas OR EXISTS { MATCH (c:Condition)-[:ASSOCIATED_WITH]->(d) WHERE toLower(c.name) IN $conditions } OR EXISTS { MATCH (s:Season)-[:DOMINANT_IN]->(d) WHERE toLower(s.name)=toLower($season) OR toLower(s.english)=toLower($season) }) RETURN DISTINCT h.name AS herb,h.botanical_name AS botanical,type(r) AS predicate,d.name AS object ORDER BY botanical,predicate,object LIMIT 36',
          {
            plants,
            season: season || '',
            doshas: ['Vata', 'Pitta', 'Kapha'].filter((d) =>
              (prakriti || '')
                .toLowerCase()
                .split(/[^a-z]+/)
                .includes(d.toLowerCase()),
            ),
            conditions: (conditions || []).map((c) => c.toLowerCase()),
          },
        ),
      { timeout: 5000 },
    );
    const legacy = context.records.map((record) => {
      const { herb, botanical, predicate, object } = record.toObject();
      return {
        kind: 'derived',
        method: 'graph',
        title: 'VedaAI project ontology',
        sourceId: null,
        location: botanical,
        excerpt: [herb, predicate, object].join(' | '),
        fact: { subject: herb, predicate, object },
      };
    });
    return result.records
      .flatMap((record) => {
        const { herb, botanical, season: match } = record.toObject();
        const base = {
          kind: 'derived',
          method: 'graph',
          title: 'VedaAI herb catalog',
          sourceId: 'vedaai-catalog',
          location: botanical,
        };
        const identity = {
          ...base,
          excerpt: herb + ' | ' + botanical,
          fact: { subject: herb, predicate: 'catalog_identity', object: botanical },
        };
        return match
          ? [
              identity,
              {
                ...base,
                excerpt: herb + ' | CONTRAINDICATED_IN | ' + match,
                fact: { subject: herb, predicate: 'CONTRAINDICATED_IN', object: season },
              },
            ]
          : [identity];
      })
      .concat(legacy);
  } finally {
    await session.close();
  }
}
async function importedUses(plan) {
  const session = getSharedDriver().session({ defaultAccessMode: 'READ' });
  const terms = plan.query.toLowerCase().match(/[a-z]{3,}/g) || [];
  try {
    const result = await session.executeRead(
      (tx) =>
        tx.run(
          'MATCH (p:ImppatPlant)-[a:HAS_REPORTED_USE]->(u:ImppatUse) WHERE (size($plants)=0 OR p.name IN $plants) AND any(t IN $terms WHERE t=toLower(u.name) OR t IN split(toLower(u.name)," ")) RETURN p.name AS plant,a.Plant_part AS part,a.Therapeutic_use AS term,a.source_file AS file,a.source_line AS line,a.source_id AS sourceId ORDER BY a.source_line LIMIT 24',
          { plants: plan.plants, terms },
        ),
      { timeout: 5000 },
    );
    return result.records.map((record) => {
      const { plant, part, term, file, line, sourceId } = record.toObject();
      return {
        kind: 'association',
        method: 'graph',
        sourceId,
        title: file,
        location: line ? 'line ' + line : null,
        excerpt: [plant, part, term].join(' | '),
        fact: { subject: plant, predicate: 'HAS_REPORTED_USE', object: term },
        metadata: part ? { plantPart: part } : {},
      };
    });
  } finally {
    await session.close();
  }
}
module.exports = { files, table, extract, reportedUses, importedUses, graph };
