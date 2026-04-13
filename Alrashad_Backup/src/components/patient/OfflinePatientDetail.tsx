"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { useState, useEffect } from 'react'
import { WardPatientDetail } from '@/components/patient/ward-patient-detail'
import { ErPatientDetail } from '@/components/patient/er-patient-detail'
import { useRouter } from 'next/navigation'
import type { Patient, Visit, Investigation } from '@/types/database.types'

interface OfflinePatientDetailProps {
  initialPatient: Patient;
  initialVisits: Visit[];
  initialInvestigations: Investigation[];
  view?: string;
}

export function OfflinePatientDetail({ 
  initialPatient, 
  initialVisits, 
  initialInvestigations,
  view 
}: OfflinePatientDetailProps) {
  const { patients, visits, investigations, isOfflineMode, profile } = useDatabase();
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [visitList, setVisitList] = useState<Visit[]>(initialVisits);
  const [invList, setInvList] = useState<Investigation[]>(initialInvestigations);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOfflineMode) return;

    async function syncLocalData() {
      setLoading(true);
      try {
        const p = await patients.get(initialPatient.id);
        const v = await visits.list(initialPatient.id);
        const i = await investigations.list(initialPatient.id);
        
        if (p) setPatient(parsePatientJson(p));
        setVisitList(v as any[]);
        setInvList(i as any[]);
      } catch (e) {
        console.error("Local Patient Data Sync Failed:", e);
      } finally {
        setLoading(false);
      }
    }
    syncLocalData();
  }, [isOfflineMode, initialPatient.id]);

  // Safely parse JSON strings from SQLite back into arrays for the UI
  function parsePatientJson(p: any): Patient {
    const fields = ['allergies', 'past_surgeries', 'chronic_diseases', 'psych_drugs', 'medical_drugs', 'er_treatment'];
    const parsed = { ...p };
    fields.forEach(f => {
      if (typeof p[f] === 'string') {
        try { parsed[f] = JSON.parse(p[f]); } catch { parsed[f] = []; }
      }
    });
    return parsed;
  }

  const isErView = patient.is_in_er && view !== 'ward';
  const aiEnabled = profile?.ai_enabled ?? true;
  const wardName = patient.ward_name || 'General Ward';

  if (isErView) {
    return (
      <ErPatientDetail 
        patient={patient}
        visits={visitList}
        investigations={invList}
        aiEnabled={aiEnabled}
        wardName={wardName}
      />
    );
  }

  return (
    <WardPatientDetail 
      patient={patient}
      visits={visitList}
      investigations={invList}
      aiEnabled={aiEnabled}
      wardName={wardName}
    />
  );
}
