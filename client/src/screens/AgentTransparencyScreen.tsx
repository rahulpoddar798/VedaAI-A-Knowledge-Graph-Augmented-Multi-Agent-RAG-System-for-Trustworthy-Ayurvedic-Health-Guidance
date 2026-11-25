import { PageHeader } from '../components/ui/PageHeader';
import type { ConsultationRecord, ScreenId } from '../types/veda';

export function AgentTransparencyScreen({ consultation, onNavigate }: {
  consultation: ConsultationRecord | null;
  onNavigate: (screen: ScreenId) => void;
}) {
  const stages = consultation?.assessment?.stages;
  return <section className="bg-white border rounded-xl p-6 space-y-4">
    <PageHeader title="Consultation execution"
      description="The Proponent and Opponent use the language model to select evidence. Application code checks coverage and rules and determines the verdict." />
    {consultation && <p>{consultation.querySummary}</p>}
    {stages?.length ? <ol className="divide-y">{stages.map(s =>
      <li key={s.name} className="flex justify-between py-2"><span>{s.name}</span><strong>{s.status}</strong></li>)}</ol> :
      <p>No workflow stages are available for this selection.</p>}
    <button onClick={() => onNavigate(consultation ? 'assessment' : 'consultation')}>
      {consultation ? 'View assessment' : 'Start a consultation'}
    </button>
  </section>;
}
