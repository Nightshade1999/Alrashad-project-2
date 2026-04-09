"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { useState, useEffect } from 'react'
import { WardPatientDetail } from '@/components/patient/ward-patient-detail'
import { ErPatientDetail } from '@/components/patient/er-patient-detail'
import type { Patient, Visit, Investigation } from '@/types/database.types'

interface PatientDetailProps {
  initialPatient: Patient;
  initialVisits: Visit[];
  initialInvestigations: Investigation[];
  view?: string;
}

export function PatientDetail({ 
  initialPatient, 
  initialVisits, 
  initialInvestigations,
  view 
}: PatientDetailProps) {
  const { patients, visits, investigations, profile } = useDatabase();
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [visitList, setVisitList] = useState<Visit[]>(initialVisits);
  const [invList, setInvList] = useState<Investigation[]>(initialInvestigations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [initialPatient.id])

  useEffect(() => {
    async function fetchOnline() {
      setLoading(true);
      try {
        const [p, v, i] = await Promise.all([
          patients.get(initialPatient.id),
          visits.list(initialPatient.id),
          investigations.list(initialPatient.id)
        ]);
        if (p) setPatient(p);
        setVisitList(v as Visit[]);
        setInvList(i as Investigation[]);
      } catch (err) {
        console.error("Patient detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOnline();
  }, [initialPatient.id, patients, visits, investigations]);

  const isErView = patient.is_in_er && view !== 'ward';
  const aiEnabled = profile?.ai_enabled ?? true;
  const wardName = patient.ward_name || 'General Ward';

  if (loading && !patient.name) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-12 w-12 rounded-full border-t-2 border-teal-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Patient File...</p>
      </div>
    )
  }

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
