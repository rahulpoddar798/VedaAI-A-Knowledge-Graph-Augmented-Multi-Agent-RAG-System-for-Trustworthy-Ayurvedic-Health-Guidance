const neo4j = require('neo4j-driver');
require('dotenv').config({ path: 'c:/Users/rahul/OneDrive/Desktop/websites/veda_original/.env' });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function testRanking(label, keywords) {
  const session = driver.session();
  try {
    const cypher = `
      UNWIND $keywords AS kw
      MATCH (h:Herb)
      OPTIONAL MATCH (h)-[r:TREATS]->(c:Condition)
      WHERE toLower(c.name) CONTAINS toLower(kw) OR toLower(kw) CONTAINS toLower(c.name)
      WITH h, collect(DISTINCT c.name) AS direct_conditions
      WHERE size(direct_conditions) > 0 OR any(k IN $keywords WHERE toLower(h.therapeutic_uses) CONTAINS toLower(k))
      RETURN h.name AS name,
             h.sanskrit_name AS sanskrit,
             h.virya AS virya,
             direct_conditions,
             size(direct_conditions) AS direct_score
      ORDER BY direct_score DESC, h.name ASC
      LIMIT 5
    `;
    const res = await session.run(cypher, { keywords });
    console.log(`\nResults for ${label}:`);
    res.records.forEach(r => {
      console.log(`- ${r.get('name')} (${r.get('sanskrit')}) [Score: ${r.get('direct_score')}, Conditions: ${r.get('direct_conditions').join(', ')}]`);
    });
  } finally {
    await session.close();
  }
}

async function run() {
  await testRanking('Cough & Cold', ['cough', 'cold', 'respiratory issues', 'common cold', 'bronchitis']);
  await testRanking('Anxiety & Sleep', ['anxiety', 'sleep', 'insomnia']);
  await testRanking('Acid Reflux & GERD', ['acid reflux', 'gerd', 'acidity', 'heartburn', 'gastritis']);
  await testRanking('Joint Pain & Arthritis', ['arthritis', 'joint', 'inflammation', 'pain']);
  await driver.close();
}

run().catch(console.error);
