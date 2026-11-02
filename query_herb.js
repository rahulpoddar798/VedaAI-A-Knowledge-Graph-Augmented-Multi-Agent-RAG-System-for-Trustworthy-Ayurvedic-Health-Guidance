require('dotenv').config();
const neo4j = require('neo4j-driver');

const herbName = process.argv[2] || 'Ginger';

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function inspectHerb(name) {
  const session = driver.session();
  try {
    console.log(`\n🔍 Searching Live Neo4j Knowledge Graph for: "${name}"...`);
    
    // Find herb
    const res = await session.run(`
      MATCH (h:Herb)
      WHERE toLower(h.name) CONTAINS toLower($name)
         OR toLower(h.botanical_name) CONTAINS toLower($name)
         OR toLower(h.sanskrit_name) CONTAINS toLower($name)
         OR toLower(h.synonyms) CONTAINS toLower($name)
      RETURN h LIMIT 1
    `, { name });

    if (res.records.length === 0) {
      console.log(`❌ Herb "${name}" not found in current seed. Available herbs include:`);
      const allHerbs = await session.run(`MATCH (h:Herb) RETURN h.name AS name ORDER BY name`);
      console.log(allHerbs.records.map(r => r.get('name')).join(', '));
      return;
    }

    const herb = res.records[0].get('h').properties;
    console.log(`\n🌿 HERB ENTITY FOUND: ${herb.name} (${herb.botanical_name || 'N/A'})`);
    console.log(`   • Sanskrit Name:    ${herb.sanskrit_name || 'N/A'}`);
    console.log(`   • Thermal Potency:  ${herb.virya} virya`);
    console.log(`   • Taste Profile:    ${herb.rasa}`);
    console.log(`   • Post-Digestive:   ${herb.vipaka}`);
    console.log(`   • Therapeutic Uses: ${herb.therapeutic_uses || 'N/A'}`);

    // Doshic relationships
    const rels = await session.run(`
      MATCH (h:Herb)-[r]->(target)
      WHERE id(h) = $id
      RETURN type(r) AS rel, labels(target)[0] AS targetLabel, target.name AS targetName, r.reason AS reason
    `, { id: res.records[0].get('h').identity });

    console.log(`\n🔗 GRAPH RELATIONSHIPS (${rels.records.length} active edges):`);
    rels.records.forEach(r => {
      const reason = r.get('reason') ? ` (${r.get('reason')})` : '';
      console.log(`   • [:${r.get('rel')}] ➔ (${r.get('targetLabel')}: ${r.get('targetName')})${reason}`);
    });

  } catch (err) {
    console.error('Error querying Neo4j:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

inspectHerb(herbName);
