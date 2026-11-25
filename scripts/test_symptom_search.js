const neo4j = require('neo4j-driver');
require('dotenv').config({ path: 'c:/Users/rahul/OneDrive/Desktop/websites/veda_original/.env' });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function testSymptomSearch(symptoms) {
  const session = driver.session();
  try {
    const cypher = `
      UNWIND $symptoms AS sym
      MATCH (h:Herb)
      OPTIONAL MATCH (h)-[:TREATS]->(c:Condition)
      WHERE toLower(c.name) CONTAINS toLower(sym)
         OR toLower(sym) CONTAINS toLower(c.name)
         OR toLower(h.therapeutic_uses) CONTAINS toLower(sym)
      WITH h, collect(DISTINCT c.name) AS matched_conditions
      WHERE size(matched_conditions) > 0
         OR any(sym IN $symptoms WHERE toLower(h.therapeutic_uses) CONTAINS toLower(sym))
      RETURN DISTINCT h.name AS name,
             h.botanical_name AS botanical_name,
             h.sanskrit_name AS sanskrit_name,
             h.common_name AS common_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.therapeutic_uses AS therapeutic_uses,
             matched_conditions
      LIMIT 10
    `;
    const res = await session.run(cypher, { symptoms });
    console.log('\n--- Results for symptoms:', symptoms);
    res.records.forEach(r => {
      console.log(' - ' + r.get('name') + ' (' + r.get('virya') + ' virya) | Conditions: ' + r.get('matched_conditions').join(', '));
    });
  } finally {
    await session.close();
  }
}

async function run() {
  await testSymptomSearch(['cough', 'cold', 'respiratory']);
  await testSymptomSearch(['anxiety', 'sleep', 'insomnia']);
  await testSymptomSearch(['joint', 'arthritis', 'inflammation']);
  await testSymptomSearch(['acid reflux', 'digestion', 'gerd']);
  await driver.close();
}
run().catch(console.error);
