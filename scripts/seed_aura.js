require('dotenv').config();
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

async function seedDatabase() {
  console.log('Checking empty graph before legacy seed import.');

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
  );

  const session = driver.session();

  try {
    const existing = await session.run('MATCH (n) RETURN 1 LIMIT 1');
    if (existing.records.length) throw Error('Legacy seed requires an empty graph.');
    const seedPath = path.join(__dirname, '..', 'data', 'vedaai_seed.cypher');
    const content = fs.readFileSync(seedPath, 'utf-8');

    const statements = content
      .replace(/\/\/[^\n]*/g, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !/\bDELETE\b/i.test(s));

    console.log(`Executing ${statements.length} Cypher statements...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await session.run(stmt);
        successCount++;
        if ((i + 1) % 25 === 0 || i === statements.length - 1) {
          console.log(`  [${i + 1}/${statements.length}] statements completed...`);
        }
      } catch (err) {
        console.error(`  Warning at statement ${i + 1}: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\nSeeding completed: ${successCount} succeeded, ${failCount} failed.`);

    // Verification
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) AS node_count');
    const relCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS rel_count');
    const labelsResult = await session.run('MATCH (n) RETURN labels(n) AS label, count(*) AS count ORDER BY count DESC');

    console.log('\n=== Graph Verification Summary ===');
    console.log('Total Nodes:', nodeCountResult.records[0].get('node_count').toInt());
    console.log('Total Relationships:', relCountResult.records[0].get('rel_count').toInt());
    console.log('\nNode Labels:');
    labelsResult.records.forEach(r => {
      console.log(`  - ${r.get('label').join(':')}: ${r.get('count').toInt()}`);
    });

  } finally {
    await session.close();
    await driver.close();
  }
}

seedDatabase().catch(err => {
  console.error('Legacy seed import failed. Check the empty-graph requirement and database access.');
  process.exit(1);
});
