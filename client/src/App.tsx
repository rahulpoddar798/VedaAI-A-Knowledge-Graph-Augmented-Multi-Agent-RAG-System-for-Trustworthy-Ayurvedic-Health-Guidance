import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ProductLabelAnalyzer } from './screens/ProductLabelAnalyzer';
import { OverviewScreen } from './screens/OverviewScreen';
import { LandingScreen } from './screens/LandingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ConsultationScreen } from './screens/ConsultationScreen';
import { HealthProfileScreen } from './screens/HealthProfileScreen';
import { AIAssessmentScreen } from './screens/AIAssessmentScreen';
import { AgentTransparencyScreen } from './screens/AgentTransparencyScreen';
import { HerbExplorerScreen } from './screens/HerbExplorerScreen';
import { DrugHerbCheckerScreen } from './screens/DrugHerbCheckerScreen';
import { KnowledgeGraphScreen } from './screens/KnowledgeGraphScreen';
import { ConsultationHistoryScreen } from './screens/ConsultationHistoryScreen';
import { AdminPortalScreen } from './screens/AdminPortalScreen';
import { DEFAULT_PROFILE } from './data/mockData';
import { catalogSchema } from '../../shared/catalog.mjs';
import type {
  ConsultationRecord,
  HerbItem,
  PatientProfile,
  ScreenId
} from './types/veda';

import { emptySession, receiveConsultation } from './data/consultation';

export default function App() {
  // Priority screen per specification: Product Label Analyzer opens first
  const [activeScreen, setActiveScreen] = useState<ScreenId>('label-analyzer');
  const [userRole, setUserRole] = useState<'Patient' | 'Clinical Reviewer'>('Patient');
  const [profile, setProfile] = useState<PatientProfile>(DEFAULT_PROFILE);

  const [backendOnline, setBackendOnline] = useState(false);
  const [herbs, setHerbs] = useState<HerbItem[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [session, setSession] = useState(emptySession);
  const { records: consultations, active: activeConsultation } = session;
  const setActiveConsultation = (active: ConsultationRecord) => setSession(prev => ({ ...prev, active }));

  useEffect(() => {
    let cancelled = false;

    fetch('/api/status')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('offline'))))
      .then(d => {
        if (!cancelled && d.status === 'online') {
          setBackendOnline(true);
        }
      })
      .catch(() => {
        if (!cancelled) setBackendOnline(false);
      });

    fetch('/api/herbs')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('offline'))))
      .then(d => {
        const result = catalogSchema.parse(d);
        if (!cancelled) { setHerbs(result.herbs); setCatalogStatus('ready'); }
      })
      .catch(() => { if (!cancelled) setCatalogStatus('error'); });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConsultationComplete = (record: ConsultationRecord) => {
    setSession(prev => receiveConsultation(prev, record));
  };

  // Standalone full-page layouts for Landing and Authentication
  if (activeScreen === 'landing') {
    return <LandingScreen onNavigate={setActiveScreen} />;
  }

  if (activeScreen === 'auth') {
    return (
      <AuthScreen
        userRole={userRole}
        onChangeRole={setUserRole}
        onAuthenticated={target => setActiveScreen(target)}
      />
    );
  }

  return (
    <AppShell
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      profile={profile}
      backendOnline={backendOnline}
      userRole={userRole}
    >
      {activeScreen === 'label-analyzer' && (
        <ProductLabelAnalyzer
          profile={profile}
          backendOnline={backendOnline}
          onNavigate={setActiveScreen}
        />
      )}

      {activeScreen === 'overview' && (
        <OverviewScreen
          profile={profile}
          consultations={consultations}
          herbCount={herbs.length}
          backendOnline={backendOnline}
          onNavigate={setActiveScreen}
          onSelectConsultation={c => setActiveConsultation(c)}
        />
      )}

      {activeScreen === 'consultation' && (
        <ConsultationScreen
          key={activeConsultation?.id}
          profile={profile}
          activeConsultation={activeConsultation}
          onConsultationComplete={handleConsultationComplete}
          onNavigate={setActiveScreen}
        />
      )}

      {activeScreen === 'assessment' && (
        <AIAssessmentScreen
          consultation={activeConsultation}
          allConsultations={consultations}
          onSelectConsultation={c => setActiveConsultation(c)}
          onNavigate={setActiveScreen}
        />
      )}

      {activeScreen === 'agents' && (
        <AgentTransparencyScreen
          consultation={activeConsultation}
          onNavigate={setActiveScreen}
        />
      )}

      {activeScreen === 'history' && (
        <ConsultationHistoryScreen
          consultations={consultations}
          onReopenConsultation={(c, target) => {
            setActiveConsultation(c);
            setActiveScreen(target);
          }}
        />
      )}

      {activeScreen === 'interactions' && (
        <DrugHerbCheckerScreen profile={profile} />
      )}

      {activeScreen === 'herbs' && (
        <HerbExplorerScreen status={catalogStatus} herbs={herbs} onNavigate={setActiveScreen} />
      )}

      {activeScreen === 'knowledge-graph' && <KnowledgeGraphScreen />}

      {activeScreen === 'profile' && (
        <HealthProfileScreen
          profile={profile}
          onSaveProfile={updated => setProfile(updated)}
          onNavigate={setActiveScreen}
        />
      )}

      {activeScreen === 'admin' && (
        <AdminPortalScreen backendOnline={backendOnline} />
      )}
    </AppShell>
  );
}
