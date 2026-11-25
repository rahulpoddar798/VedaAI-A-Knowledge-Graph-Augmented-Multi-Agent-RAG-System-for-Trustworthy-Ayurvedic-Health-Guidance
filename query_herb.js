require('dotenv').config();
const neo4j = require('neo4j-driver');
const localGraph = require('./local_graph');

const herbName = process.argv[2] || 'Ginger';

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function inspectHerb(name) {
  let session = null;
  let useFallback = false;

  try {
    session = driver.session();
    const runQuery = session.run('RETURN 1');
    runQuery.catch(() => {});
    await Promise.race([
      runQuery,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), 2000)
      )
    ]);
  } catch (err) {
    if (session) {
      try { await session.close(); } catch (_) {}
      session = null;
    }
    useFallback = true;
  }

  if (useFallback || !session) {
    console.log(`\n🔍 Searching Local Knowledge Graph for: "${name}"...`);
    const { found, allHerbs } = localGraph.searchHerb(name);

    if (!found) {
      console.log(`❌ Herb "${name}" not found in current seed. Available herbs include:`);
      console.log(allHerbs.join(', '));
      try { await driver.close(); } catch (_) {}
      return;
    }

    console.log(`\n🌿 HERB ENTITY FOUND: ${found.name} (${found.botanical_name || 'N/A'})`);
    console.log(`   • Sanskrit Name:    ${found.sanskrit_name || 'N/A'}`);
    console.log(`   • Thermal Potency:  ${found.virya} virya`);
    console.log(`   • Taste Profile:    ${found.rasa}`);
    console.log(`   • Post-Digestive:   ${found.vipaka}`);
    console.log(`   • Therapeutic Uses: ${found.therapeutic_uses || 'N/A'}`);

    console.log(`\n🔗 GRAPH RELATIONSHIPS (${found.relationships.length} active edges):`);
    found.relationships.forEach(r => {
      const reason = r.reason ? ` (${r.reason})` : '';
      console.log(`   • [:${r.rel}] ➔ (${r.targetLabel}: ${r.targetName})${reason}`);
    });

    try { await driver.close(); } catch (_) {}
    return;
  }

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
      console.log(`   • [:${r.rel}] ➔ (${r.targetLabel}: ${r.targetName})${reason}`);
    });

  } catch (err) {
    console.error('Error querying Neo4j:', err.message);
  } finally {
    if (session) {
      await session.close();
    }
    await driver.close();
  }
}

inspectHerb(herbName);
