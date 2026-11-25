const neo4j = require('neo4j-driver');
require('dotenv').config({ path: 'c:/Users/rahul/OneDrive/Desktop/websites/veda_original/.env' });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function inspectHerbs() {
  const session = driver.session();
  try {
    const res = await session.run(`
      MATCH (h:Herb)
      OPTIONAL MATCH (h)-[r:TREATS]->(c:Condition)
      RETURN h.name AS name, h.botanical_name AS botanical, h.therapeutic_uses AS uses, collect(c.name) AS conditions
    `);
    res.records.forEach(r => {
      console.log(`\nHerb: ${r.get('name')} (${r.get('botanical')})`);
      console.log(`  Uses: ${r.get('uses')}`);
      console.log(`  Conditions: ${r.get('conditions').join(', ')}`);
    });
  } finally {
    await session.close();
    await driver.close();
  }
}

inspectHerbs().catch(console.error);
