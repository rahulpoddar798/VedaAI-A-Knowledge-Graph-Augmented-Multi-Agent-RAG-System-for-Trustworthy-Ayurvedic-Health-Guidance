const neo4j = require('neo4j-driver');
require('dotenv').config({ path: 'c:/Users/rahul/OneDrive/Desktop/websites/veda_original/.env' });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function enrichGraph() {
  const session = driver.session();
  try {
    console.log('Connecting to Neo4j Aura to enrich TREATS relationships and herb therapeutic uses...');

    // 1. Update therapeutic uses for Giloy and Indian Gooseberry (Amla)
    await session.run(`
      MATCH (h:Herb {name: 'Giloy'})
      SET h.therapeutic_uses = 'fever,immunomodulation,jaundice,diabetes mellitus,gout,rejuvenation,skin diseases,rasayana'
    `);

    await session.run(`
      MATCH (h:Herb {name: 'Indian Gooseberry'})
      SET h.therapeutic_uses = 'acid reflux,gerd,immunomodulation,rejuvenation,hyperacidity,dyspepsia,skin diseases,eye disorders,rasayana'
    `);

    // 2. Add TREATS relationships for Respiratory Issues
    const respiratoryHerbs = [
      'Holy Basil',
      'Licorice',
      'Water Hyssop',
      'Black Pepper',
      'Long Pepper',
      'Ginger',
      'Turmeric',
      'Belleric Myrobalan',
      'Aloe Vera'
    ];
    for (const hName of respiratoryHerbs) {
      await session.run(`
        MATCH (h:Herb {name: $hName}), (c:Condition {name: 'Respiratory Issues'})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0 / Charaka Samhita'}]->(c)
      `, { hName });
    }

    // 3. Add TREATS relationships for Acid Reflux & GERD
    const refluxHerbs = [
      'Indian Gooseberry',
      'Licorice',
      'Fennel',
      'Coriander',
      'Aloe Vera'
    ];
    for (const hName of refluxHerbs) {
      await session.run(`
        MATCH (h:Herb {name: $hName}), (c:Condition {name: 'Acid Reflux'})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0 / Charaka Samhita'}]->(c)
      `, { hName });
      await session.run(`
        MATCH (h:Herb {name: $hName}), (c:Condition {name: 'GERD'})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0 / Charaka Samhita'}]->(c)
      `, { hName });
    }

    // 4. Add TREATS relationships for Skin Disorders
    const skinHerbs = [
      'Neem',
      'Turmeric',
      'Giloy',
      'Aloe Vera',
      'Chebulic Myrobalan',
      'Spikenard'
    ];
    for (const hName of skinHerbs) {
      await session.run(`
        MATCH (h:Herb {name: $hName}), (c:Condition {name: 'Skin Disorders'})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0 / Charaka Samhita'}]->(c)
      `, { hName });
    }

    // 5. Add Giloy TREATS edges
    const giloyConditions = ['Inflammation', 'Diabetes', 'Skin Disorders'];
    for (const cName of giloyConditions) {
      await session.run(`
        MATCH (h:Herb {name: 'Giloy'}), (c:Condition {name: $cName})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c)
      `, { cName });
    }

    // 6. Add Indian Gooseberry TREATS edges
    const amlaConditions = ['Acid Reflux', 'GERD', 'Inflammation', 'Diabetes', 'Skin Disorders'];
    for (const cName of amlaConditions) {
      await session.run(`
        MATCH (h:Herb {name: 'Indian Gooseberry'}), (c:Condition {name: $cName})
        MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c)
      `, { cName });
    }

    console.log('✅ Enrichment completed successfully!');

    // Verification
    const res = await session.run(`
      MATCH (c:Condition)
      OPTIONAL MATCH (h:Herb)-[r:TREATS]->(c)
      RETURN c.name AS cond, count(h) AS herbCount, collect(h.name) AS herbs
      ORDER BY c.name ASC
    `);
    console.log('\n=== Updated Conditions Coverage ===');
    res.records.forEach(r => {
      console.log(`- ${r.get('cond')}: ${r.get('herbCount').toNumber()} herbs -> ${r.get('herbs').join(', ')}`);
    });

    const totalRels = await session.run('MATCH ()-[r:TREATS]->() RETURN count(r) AS cnt');
    console.log(`\nTotal TREATS relationships in Neo4j Aura: ${totalRels.records[0].get('cnt').toNumber()}`);

  } finally {
    await session.close();
    await driver.close();
  }
}

enrichGraph().catch(console.error);
