import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel } from '../components/ui/StatePanels';
import type { ConsultationRecord, ScreenId } from '../types/veda';

interface AIAssessmentScreenProps {
  consultation: ConsultationRecord | null;
  allConsultations: ConsultationRecord[];
  onSelectConsultation: (c: ConsultationRecord) => void;
  onNavigate: (screen: ScreenId) => void;
}

export function AIAssessmentScreen({ consultation, allConsultations, onSelectConsultation, onNavigate }: AIAssessmentScreenProps) {
  if (!consultation) return <EmptyPanel title="No assessment selected" description="Run a consultation to review its evidence." />;
  const a = consultation.assessment;
  const panel = 'bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-3';
  const references = (ids: string[]) => ids.map(id => (
    <a key={id} className="block underline text-xs break-all" href={'#' + id}>{id}</a>
  ));
  return <div className="space-y-5">
    <PageHeader title="AI Assessment" description={consultation.fullQuery} actions={
      <button onClick={() => onNavigate('agents')}>View execution stages</button>
    } />
    {allConsultations.length > 1 && <label>Consultation <select value={consultation.id}
      onChange={event => { const item = allConsultations.find(c => c.id === event.target.value); if (item) onSelectConsultation(item); }}>
      {allConsultations.map(c => <option value={c.id} key={c.id}>{c.querySummary}</option>)}
    </select></label>}
    <section className={panel}>
      <SafetyBadge status={consultation.status} size="md" />
      <p>{consultation.clinicalSummary}</p>
      {consultation.safetyWarnings.map(w => <p key={w}>{w}</p>)}
      {a?.verdict.rules.map(rule => <div key={rule.ruleId}>{rule.ruleId} / {rule.version} / {rule.outcome}{references(rule.evidenceIds)}</div>)}
    </section>
    {a && <>
      <section className={panel}><h2>Assessment coverage</h2>
        {a.verdict.coverage.map(row => <div key={row.dimension}>
          <strong>{row.dimension.replaceAll('_', ' ')}</strong> / {row.status.replaceAll('_', ' ')}
          <p>{row.reason}</p>{row.missing.map(note => <p key={note}>{note}</p>)}{references(row.evidenceIds)}
        </div>)}
      </section>
      <section className={panel}><h2>Findings</h2>
        {!a.findings.length && <p>No evidence was selected. Safety remains unestablished.</p>}
        {a.findings.map((f, i) => <div key={i}><strong>{f.role} / {f.category}</strong><p>{f.text}</p>{references(f.evidenceIds)}</div>)}
      </section>
      <section className={panel}><h2>Evidence ledger</h2>
        {!a.ledger.length && <p>No records retrieved.</p>}
        {a.ledger.map(e => <article key={e.id} id={e.id} className="border-t pt-3">
          <strong>{e.title || 'Source title unavailable'}</strong> / {e.kind} / {e.verification.replaceAll('_', ' ')}
          <p>{e.excerpt}</p><p>{e.sourceId} {e.location}</p>
          {Object.entries(e.metadata).map(([key, value]) => <p key={key}>{key} / {value}</p>)}
          <small className="break-all">{e.id}</small>
        </article>)}
      </section>
    </>}
    <p>{consultation.disclaimer}</p>
  </div>;
}
