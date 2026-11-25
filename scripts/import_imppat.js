// Default invocation validates inputs and prints row counts. --apply imports into dedicated labels.
require('dotenv').config({ quiet: true });
const { files, table } = require('../engine/structured_sources');
const { getSharedDriver, closeSharedDriver } = require('../lib/neo4j_config');
const { hash } = require('../engine/evidence');
const schema = [
  'CREATE CONSTRAINT imppat_association_key IF NOT EXISTS FOR ()-[a:HAS_REPORTED_USE]-() REQUIRE a.association_id IS UNIQUE',
  'CREATE CONSTRAINT imppat_plant_key IF NOT EXISTS FOR (p:ImppatPlant) REQUIRE p.id IS UNIQUE',
  'CREATE CONSTRAINT imppat_use_key IF NOT EXISTS FOR (u:ImppatUse) REQUIRE u.id IS UNIQUE',
  'CREATE CONSTRAINT imppat_form_key IF NOT EXISTS FOR (f:ImppatFormulationRecord) REQUIRE f.id IS UNIQUE',
  'CREATE INDEX imppat_botanical IF NOT EXISTS FOR (p:ImppatPlant) ON (p.name)',
];
const writes = [
  'UNWIND $rows AS row MERGE (p:ImppatPlant {id:row.plant}) SET p += row.properties,p.name=row.name',
  'UNWIND $rows AS row MATCH (p:ImppatPlant {id:row.plant}) MERGE (u:ImppatUse {id:row.term}) SET u.name=row.use MERGE (p)-[a:HAS_REPORTED_USE {association_id:row.id}]->(u) SET a += row.properties',
  'UNWIND $rows AS row MERGE (f:ImppatFormulationRecord {id:row.id}) SET f += row.properties',
];
function prepare() {
  const batches = files.map((file, i) =>
    table(file).map(({ sourceId, line, data }) => ({
      id: hash([sourceId, line]),
      plant: data.Plant_identifier || data.IMPPAT_Plant_identifier || '',
      name: data.Indian_Medicinal_plant || '',
      term: data.IMPPAT_Therapeutic_use_identifier || '',
      use: data.Therapeutic_use || '',
      properties: {
        ...data,
        source_id: sourceId,
        source_file: file,
        source_line: line,
        evidence_class: ['metadata', 'reported_association', 'formulation_record'][i],
      },
    })),
  );
  const plants = new Set(batches[0].map((p) => p.plant));
  if (
    plants.has('') ||
    plants.size !== batches[0].length ||
    batches[1].some((row) => !plants.has(row.plant) || !row.term)
  )
    throw Error('Unresolved source identifier');
  return batches;
}
async function main() {
  const batches = prepare();
  console.log(
    'Validated rows:',
    batches.map((b) => b.length),
  );
  const checkOnly = process.argv.includes('--check-db');
  if (!checkOnly && !process.argv.includes('--apply')) return;
  const s = getSharedDriver().session();
  try {
    if (checkOnly) {
      for (const [i, statement] of writes.entries())
        await s.run('EXPLAIN ' + statement, { rows: batches[i].slice(0, 1) });
      console.log('Database planned all three batch statements.');
      return;
    }
    for (const ddl of schema) await s.executeWrite((tx) => tx.run(ddl));
    for (const [i, rows] of batches.entries())
      for (let j = 0; j < rows.length; j += 400)
        await s.executeWrite((tx) => tx.run(writes[i], { rows: rows.slice(j, j + 400) }));
  } finally {
    await s.close();
    await closeSharedDriver();
  }
}
if (require.main === module)
  main().catch(() => {
    console.error('Import incomplete. Inspect source identifiers and database access before retrying.');
    process.exitCode = 1;
  });
module.exports = { prepare };
