"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { useState, useEffect } from 'react'
import { WardPatientDetail } from '@/components/patient/ward-patient-detail'
import { ErPatientDetail } from '@/components/patient/er-patient-detail'
import { PsychPatientDetail } from '@/components/patient/psych-patient-detail'
import type { Patient, Visit, Investigation, UserProfile } from '@/types/database.types'

interface PatientDetailProps {
  initialPatient: Patient;
  initialVisits: Visit[];
  initialInvestigations: Investigation[];
  initialProfile?: UserProfile | null;
  view?: string;
}

export function PatientDetail({ 
  initialPatient, 
  initialVisits, 
  initialInvestigations,
  initialProfile,
  view 
}: PatientDetailProps) {
  const { profile: contextProfile } = useDatabase();
  
  // Use props directly for the most reliable sync with server revalidations
  const patient = initialPatient;
  const visitList = initialVisits;
  const invList = initialInvestigations;
  const profile = initialProfile || contextProfile;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [initialPatient.id])

  const isErView = patient.is_in_er && view !== 'ward';
  const aiEnabled = profile?.ai_enabled ?? true;
  const wardName = initialPatient.ward_name || 'General Ward';

  if (!patient.name) {
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
        profile={profile}
      />
    );
  }

  if (profile?.specialty === 'psychiatry' && view !== 'er') {
    return (
      <PsychPatientDetail 
        patient={patient}
        visits={visitList}
        investigations={invList}
        aiEnabled={aiEnabled}
        wardName={wardName}
        profile={profile}
      />
    );
  }

  // Hide psych notes from standard Ward view
  const wardVisits = visitList?.filter((v: any) => !v.is_psych_note) || [];

  return (
    <WardPatientDetail 
      patient={patient}
      visits={wardVisits}
      investigations={invList}
      aiEnabled={aiEnabled}
      wardName={wardName}
      profile={profile}
    />
  );
}
