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

function handleClinicalFollowUp({ followUpQuery, consultationContext: result, patientContext = {}, history = [], evidenceIds = [] }) {
  if (!result) return answer('INSUFFICIENT_CONTEXT', 'Start a new assessment.');
  const prefix = [result.final_verdict, ...(result.safety_warnings || [])].filter(Boolean).join('. ');
  const reply = (status, message, ids = []) => ({ status, reply: prefix + '. ' + message, evidenceIds: ids });
  const question = followUpQuery.trim();
  const assessment = result.assessment;
  if (assessment) {
    if (/^(repeat|repeat (your |the )?(last|previous) (answer|reply))[?.! ]*$/i.test(question)) {
      const previous = history.at(-1);
      return previous ? { status: previous.status, reply: previous.reply, evidenceIds: previous.evidenceIds } :
        reply('INSUFFICIENT_CONTEXT', 'There is no prior reply in this consultation.');
    }
    if (/^what (patient |profile )?(context|information) was (used|reported)[?.! ]*$/i.test(question)) {
      const fields = Object.entries(patientContext).filter(([, value]) => value !== undefined && value !== '');
      return reply('ANSWERED', fields.length ? 'Reported fields: ' + fields.map(([key]) => key).join(', ') + '.' :
        'No patient context was reported.');
    }
    if (evidenceIds.length || /^(what (sources|evidence) (were used|supports this result)|show (the )?(evidence|sources))[?.! ]*$/i.test(question)) {
      const sources = evidenceIds.length ? assessment.ledger.filter(e => evidenceIds.includes(e.id)) :
        assessment.ledger.filter(e => e.verification === 'source_traceable').slice(0, 5);
      if (evidenceIds.some(id => !sources.some(e => e.id === id))) return reply('INSUFFICIENT_CONTEXT', 'Evidence reference unavailable.');
      return sources.length ? reply('ANSWERED', sources.map(e =>
        [e.title || 'Source unavailable', e.location, e.verification].filter(Boolean).join(' / ')).join('. '), sources.map(e => e.id)) :
        reply('INSUFFICIENT_DATA', 'No attributable source was retrieved.');
    }
  }
  if (result.uncertainty_note || !inScope(question, result.evaluated_herbs || [])) {
    return reply('INSUFFICIENT_CONTEXT', 'This question requires a new assessment.');
  }
  if (!assessment && !/unsafe|caution|contraindicated|do not recommend/i.test(result.final_verdict)) {
    return answer('INSUFFICIENT_DATA', 'A ledger-backed assessment is required.');
  }
  return reply('RESTRICTED', 'Do not start or change a dose on the basis of this consultation.');
}

module.exports = { handleClinicalFollowUp };
