async function testQuery(label, q, prakriti = 'Pitta', season = 'Grishma', conditions = []) {
  const res = await fetch('http://localhost:4000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, prakriti, season, conditions })
  });
  const data = await res.json();
  console.log(`\n========================================`);
  console.log(`🧪 TEST: ${label}`);
  console.log(`Query: "${q}" | Profile: ${prakriti}, ${season}, Conditions: [${conditions.join(', ')}]`);
  console.log(`Verdict: ${data.result?.final_verdict}`);
  console.log(`Summary: ${data.result?.summary_message}`);
  if (data.result?.risk_explanation) {
    console.log(`⚠️ Risk Explanation: ${data.result.risk_explanation}`);
  }
  if (data.result?.suggested_alternatives?.length) {
    console.log(`🌿 Recommended / Alternatives:`, data.result.suggested_alternatives.map(a => `${a.herb_name} (${a.virya || 'balanced'})`));
  }
}

async function run() {
  await testQuery(
    'Natural Symptom: Cough & Cold',
    'I have a bad cough and cold, what can I take?',
    'Pitta',
    'Hemanta',
    []
  );

  await testQuery(
    'Natural Symptom: Anxiety & Sleep',
    'What is good for anxiety and poor sleep?',
    'Vata',
    'Hemanta',
    []
  );

  await testQuery(
    'Natural Symptom: Acid Reflux & GERD',
    'What soothing herbs are good for acid reflux and heartburn?',
    'Pitta',
    'Grishma',
    ['Acid Reflux']
  );

  await testQuery(
    'Natural Symptom: Joint Pain',
    'What herbs help with joint stiffness and arthritis?',
    'Vata',
    'Shishira',
    ['Arthritis']
  );

  await testQuery(
    'Contraindication Check: Ginger in Summer with Reflux',
    'Can I take Ginger for digestion in summer?',
    'Pitta-Vata',
    'Grishma',
    ['Acid Reflux']
  );

  await testQuery(
    'Safe Herb Check: Amla in Winter',
    'Can I take Amla for daily immunity in winter?',
    'Vata',
    'Shishira',
    []
  );

  await testQuery(
    'General Inquiry: How can you help me?',
    'Hello, what can you do?',
    'Pitta',
    'Hemanta',
    []
  );
}

run().catch(console.error);
