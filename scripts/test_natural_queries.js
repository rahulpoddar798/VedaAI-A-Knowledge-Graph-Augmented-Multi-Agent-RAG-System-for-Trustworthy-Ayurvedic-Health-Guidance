async function testQuery(q) {
  const res = await fetch('http://localhost:4000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, prakriti: 'Pitta', season: 'Hemanta', conditions: [] })
  });
  const data = await res.json();
  console.log('\n--- Query: ' + q + ' ---');
  console.log('Verdict:', data.result?.final_verdict);
  console.log('Summary:', data.result?.summary_message);
  console.log('Alternatives:', data.result?.suggested_alternatives?.map(a => a.herb_name));
}

async function run() {
  await testQuery('I have a cough and cold, what can I take?');
  await testQuery('What is good for anxiety and sleep?');
  await testQuery('Hello, how can you help me?');
}
run().catch(console.error);
