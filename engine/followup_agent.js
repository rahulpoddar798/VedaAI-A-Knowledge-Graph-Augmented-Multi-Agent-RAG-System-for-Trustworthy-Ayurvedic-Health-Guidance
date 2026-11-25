const llm = require('./llm_client');
const neo4j = require('neo4j-driver');

let driver = null;

function getDriver() {
  if (!driver) {
    const user = process.env.NEO4J_USERNAME || 'ff765efc';
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(user, process.env.NEO4J_PASSWORD)
    );
  }
  return driver;
}

/**
 * Handle multi-turn clinical follow-up questions
 */
async function handleClinicalFollowUp({ followUpQuery, consultationContext, history }) {
  const queryLower = (followUpQuery || '').toLowerCase();
  const recommended = consultationContext?.recommendedHerbs || [];
  const prakriti = consultationContext?.prakriti || 'Pitta';
  const season = consultationContext?.season || 'Hemanta';
  const conditions = consultationContext?.conditions || [];

  // 1. Fetch live pharmacological profiles from Neo4j Aura for the context herbs
  let herbFacts = [];
  try {
    const session = getDriver().session();
    const result = await session.run(`
      UNWIND $names AS hName
      MATCH (h:Herb)
      WHERE toLower(h.name) CONTAINS toLower(hName)
         OR toLower(h.botanical_name) CONTAINS toLower(hName)
         OR toLower(h.sanskrit_name) CONTAINS toLower(hName)
      OPTIONAL MATCH (h)-[r:PACIFIES|AGGRAVATES]->(d:Dosha)
      RETURN DISTINCT h.name AS name,
             h.sanskrit_name AS sanskrit_name,
             h.botanical_name AS botanical_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.vipaka AS vipaka,
             h.guna AS guna,
             h.therapeutic_uses AS therapeutic_uses,
             collect(DISTINCT { dosha: d.name, rel: type(r) }) AS dosha_effects
    `, { names: recommended.length > 0 ? recommended : ['Ginger', 'Holy Basil', 'Licorice'] });
    await session.close();
    herbFacts = result.records.map(r => r.toObject());
  } catch (err) {
    console.warn('Follow-up Neo4j query error:', err.message);
  }

  // 2. Formulate prompt for Gemini
  const systemPrompt = `You are the VedaAI Senior Ayurvedic Clinical Specialist providing conversational follow-up guidance.
The patient previously received an Ayurvedic consultation and now has a follow-up question.
You MUST ground your response strictly in classical Ayurvedic pharmacopeia (Charaka Samhita, Sushruta Samhita, IMPPAT 2.0).

Context:
- Patient Prakriti: ${prakriti}
- Current Season: ${season}
- Chronic Conditions: ${conditions.join(', ') || 'None'}
- Recommended Herbs: ${herbFacts.map(h => `${h.name} (${h.sanskrit_name}, ${h.virya} virya)`).join(', ') || recommended.join(', ')}

Output JSON Schema:
{
  "reply": "Clear, compassionate, highly detailed clinical answer addressing the exact follow-up question",
  "dosage_and_anupana": "Specific classical dosage (e.g. powder 1-3g, decoction 20-30ml) and vehicle (warm water, honey, warm cow's milk, or ghee)",
  "pathya_apathya": "Dietary and lifestyle guidelines (foods to favor vs foods to strictly avoid for this condition and season)",
  "precautions": "Safety precautions, contraindications, or maximum duration before medical review",
  "suggested_followups": [
    "Array of 2-3 logical follow-up questions the patient might want to ask next"
  ]
}
Respond ONLY with valid JSON.`;

  let response = null;
  if (llm.isConfigured) {
    try {
      response = await llm.generateJSON(systemPrompt, {
        question: followUpQuery,
        previous_consultation: consultationContext,
        conversation_history: history || []
      });
    } catch (err) {
      console.warn('Follow-up LLM error, falling back to clinical rule engine:', err.message);
    }
  }

  // 3. Fallback Heuristic Clinical Knowledge Engine
  if (!response || !response.reply) {
    const primaryHerb = herbFacts[0] || { name: 'Recommended Herb', virya: 'Sheeta', rasa: 'Madhura' };
    const isCooling = (primaryHerb.virya || '').toLowerCase() === 'sheeta';

    let dosageAnupana = 'Churna (Herbal Powder): 1 to 2 grams twice daily with lukewarm water or raw honey, 30 minutes after meals.';
    let pathya = 'Favor light, freshly cooked warm meals, warm water, and seasonal vegetables. Avoid chilled beverages, deep-fried food, and heavy dairy at night.';
    let precautions = 'If symptoms persist beyond 7 to 10 days, or if you experience acute discomfort, consult a registered BAMS Ayurvedic doctor.';

    if (queryLower.includes('how') || queryLower.includes('dosage') || queryLower.includes('consume') || queryLower.includes('take')) {
      if (isCooling) {
        dosageAnupana = `For ${primaryHerb.name}: Take 1-2 grams of powder or 1 tablet twice daily with lukewarm water or raw honey. Honey acts as a Yogavahi (catalytic carrier) enhancing bioavailability without aggravating Pitta.`;
      } else {
        dosageAnupana = `For ${primaryHerb.name}: Take 1-2 grams of powder or 1 tablet twice daily with warm water or warm cow's milk after meals. Avoid consuming on an empty stomach to prevent gastric heat.`;
      }
    }

    if (queryLower.includes('diet') || queryLower.includes('food') || queryLower.includes('eat') || queryLower.includes('avoid')) {
      pathya = `Pathya (Beneficial): Steamed vegetables, mung dal soup, barley, warm water with cumin/fennel. Apathya (To Avoid): Excessively spicy, sour, stale, or oily foods, cold refrigerated drinks, and nightshades.`;
    }

    if (queryLower.includes('day') || queryLower.includes('time') || queryLower.includes('duration') || queryLower.includes('long')) {
      precautions = `Recommended course: 2 to 3 weeks for acute symptoms. For chronic conditions, a 6-week protocol with a 1-week break is classically advised under practitioner supervision.`;
    }

    response = {
      reply: `For your ${prakriti} constitution during ${season} season, ${primaryHerb.name} (${primaryHerb.sanskrit_name || 'classical botanical'}) is traditionally administered to restore constitutional equilibrium. When taken with the appropriate Anupana (carrier), it enhances therapeutic absorption while protecting your digestive fire (Agni).`,
      dosage_and_anupana: dosageAnupana,
      pathya_apathya: pathya,
      precautions: precautions,
      suggested_followups: [
        `What dietary habits (Pathya) best balance my ${prakriti} dosha?`,
        `Can I combine this remedy with other daily vitamins or medications?`,
        `How many weeks should this Ayurvedic regimen be continued?`
      ]
    };
  }

  return response;
}

module.exports = { handleClinicalFollowUp };
