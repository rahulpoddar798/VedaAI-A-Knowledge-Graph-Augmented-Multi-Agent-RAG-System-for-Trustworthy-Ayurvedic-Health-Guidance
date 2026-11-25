async function test(query, prakriti, season, conditions) {
  const res = await fetch('http://localhost:4000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, prakriti, season, conditions })
  });
  const data = await res.json();
  console.log('\n--- Query: ' + query + ' ---');
  console.log('Profile:', { prakriti, season, conditions });
  console.log('Verdict:', data.result?.final_verdict);
  console.log('Summary:', data.result?.summary_message);
}

async function main() {
  // Test 1: Safe query in winter
  await test('Can I take Ginger for digestion in winter?', 'Vata', 'Hemanta', []);
  // Test 2: Uncataloged substance
  await test('Can I take Cardamom for breath?', 'Pitta', 'Hemanta', []);
  // Test 3: Safe tridoshic herb
  await test('Can I take Amla daily?', 'Pitta', 'Hemanta', []);
}

main().catch(console.error);
