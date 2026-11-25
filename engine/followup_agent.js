const llm = require('./llm_client');

function answer(status, reply) {
  return { status, reply };
}

// Only resolve references to herbs in this consultation. Ambiguous free text
// requires a new assessment. Never use a model to authorize a new substance.
function inScope(question, names) {
  let rest = question.toLowerCase().replace(/[?!.,]/g, ' ').trim();
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    rest = rest.split(name.toLowerCase()).join(' ');
  }
  const words = new Set(('what which how why when can could should may is are was were do does did ' +
    'i me my the a an this that it they these for of to and with in on about instead ' +
    'take taking use used drink eat food diet avoid safe safety unsafe flagged warning warnings precautions ' +
    'dose dosing dosage much often daily recommended alternatives herb herbs summary explain evidence assessed result please').split(' '));
  return rest.split(/\s+/).filter(Boolean).every(word => words.has(word));
}

async function handleClinicalFollowUp({ followUpQuery, consultationContext }, provider = llm) {
  const result = consultationContext;
  const herbs = result?.evaluated_herbs || [];
  const alternatives = result?.suggested_alternatives || [];
  if (result?.assessment && /^(what (sources|evidence) (were used|supports this result)|show (the )?(evidence|sources))[?.! ]*$/i.test(followUpQuery.trim())) {
    const sources = result.assessment.ledger.filter(e=>e.verification==='source_traceable').slice(0,5);
    return answer(sources.length?'ANSWERED':'INSUFFICIENT_DATA', sources.length
      ? [result.final_verdict,...sources.map(e=>[e.title,e.location,e.id].join(' / '))].join('. ')
      : 'No attributable source was retrieved in this consultation.');
  }
  if (!result || result.uncertainty_note || !herbs.length ||
      !inScope(followUpQuery, [...herbs, ...alternatives.map(item => item.herb_name)])) {
    return answer('INSUFFICIENT_CONTEXT', 'This question requires a separate verified assessment. The original safety restrictions still apply.');
  }
  if (!/^(SAFE\b|CLINICALLY INDICATED\b)/i.test(result.final_verdict) || result.safety_warnings.length || result.missing_coverage?.length) {
    return answer('RESTRICTED', [result.final_verdict, ...result.safety_warnings,
      'Do not start or change a dose on the basis of this consultation.'].join('. '));
  }
  if (/dose|dosage|dosing|how much|how often|administration/i.test(followUpQuery)) {
    return answer('INSUFFICIENT_DATA', 'An individualized dose was not verified in this assessment.');
  }

  // The provider selects evidence from the adjudicated record. Its free text
  // cannot introduce a drug, new regimen, or approval into the public answer.
  const facts = [result.summary_message, ...result.clinical_reasoning,
    ...alternatives.map(item => item.herb_name + ': ' + item.why_safe)].filter(Boolean);
  try {
    const selection = await provider.generateJSON(
      'Select the index of one supplied assessment statement that answers the question. Return {"index":-1} if none answers it.',
      { question: followUpQuery, facts }
    );
    if (Number.isInteger(selection?.index) && selection.index >= 0 && selection.index < facts.length) {
      return answer('ANSWERED', facts[selection.index]);
    }
    return answer('INSUFFICIENT_DATA', 'The assessment does not contain verified guidance on that question.');
  } catch {
    return answer('ANALYSIS_UNAVAILABLE', 'Follow-up analysis is temporarily unavailable. The previous assessment still applies.');
  }
}

module.exports = { handleClinicalFollowUp };
