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
import {
  DEFAULT_PROFILE,
  HERBS_CATALOG,
  SAMPLE_CONSULTATIONS
} from './data/mockData';
import type {
  ConsultationRecord,
  HerbItem,
  PatientProfile,
  ScreenId
} from './types/veda';

export default function App() {
  // Priority screen per specification: Product Label Analyzer opens first
  const [activeScreen, setActiveScreen] = useState<ScreenId>('label-analyzer');
  const [userRole, setUserRole] = useState<'Patient' | 'Clinical Reviewer'>('Patient');
  const [profile, setProfile] = useState<PatientProfile>({ ...DEFAULT_PROFILE, fullName: '', ageGroup: '', biologicalSex: '', prakriti: '', vikriti: '', season: '', conditions: [], allergies: [], medications: [], dietaryPreference: '', avoidAlcoholExtracts: false, notes: '' });

  const [backendOnline, setBackendOnline] = useState(false);
  const [herbs, setHerbs] = useState<HerbItem[]>(HERBS_CATALOG);
  const [consultations, setConsultations] =
    useState<ConsultationRecord[]>(SAMPLE_CONSULTATIONS);
  const [activeConsultation, setActiveConsultation] =
    useState<ConsultationRecord | null>(SAMPLE_CONSULTATIONS[0]);

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
        if (!cancelled && Array.isArray(d.herbs) && d.herbs.length > 0) {
          // Merge live Neo4j herb list with curated safety/evidence metadata
          const merged: HerbItem[] = d.herbs.map((live: any) => {
            const match = HERBS_CATALOG.find(
              c => c.name.toLowerCase() === String(live.name || '').toLowerCase()
            );
            return {
              ...match,
              ...live,
              pacifies: (live.pacifies || []).filter(Boolean),
              aggravates: (live.aggravates || []).filter(Boolean),
              evidence_tier: match?.evidence_tier || 'Classical + IMPPAT 2.0',
              safety_note: match?.safety_note
            };
          });
          setHerbs(merged);
        }
      })
      .catch(() => {
        // Keep HERBS_CATALOG fallback silently
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConsultationComplete = (record: ConsultationRecord) => {
    setActiveConsultation(record);
    setConsultations(prev => {
      const exists = prev.some(c => c.id === record.id);
      return exists ? prev : [record, ...prev];
    });
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
          backendOnline={backendOnline}
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
        <HerbExplorerScreen herbs={herbs} onNavigate={setActiveScreen} />
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
