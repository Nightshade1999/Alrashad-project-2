"use client"

import { useDatabase } from '@/hooks/useDatabase'
import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
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
  const ps = usePowerSync();
  const [patient, setPatient] = useState<Patient>(initialPatient);
  const [visitList, setVisitList] = useState<Visit[]>(initialVisits);
  const [invList, setInvList] = useState<Investigation[]>(initialInvestigations);
  const [loading, setLoading] = useState(true);

  // Scroll to top when patient detail opens — prevents page starting at the bottom
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [initialPatient.id])

  useEffect(() => {
    if (isOfflineMode && ps) {
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Watch patient record
      const patientWatcher = ps.watch(
        'SELECT * FROM patients WHERE id = ?', [initialPatient.id],
        { signal }
      );
      (async () => {
        try {
          for await (const result of patientWatcher) {
            const p = (result.rows?._array || [])[0];
            if (p) setPatient(parsePatientJson(p));
            setLoading(false);
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error("Patient watch error:", e);
        }
      })();

      // Watch visits
      const visitsWatcher = ps.watch(
        'SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC', [initialPatient.id],
        { signal }
      );
      (async () => {
        try {
          for await (const result of visitsWatcher) {
            setVisitList((result.rows?._array || []) as any[]);
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error("Visits watch error:", e);
        }
      })();

      // Watch investigations
      const invWatcher = ps.watch(
        'SELECT * FROM investigations WHERE patient_id = ? ORDER BY date DESC', [initialPatient.id],
        { signal }
      );
      (async () => {
        try {
          for await (const result of invWatcher) {
            setInvList((result.rows?._array || []) as any[]);
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error("Investigations watch error:", e);
        }
      })();

      return () => abortController.abort();
    } else if (!isOfflineMode) {
      // Online Fetch Branch
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
          console.error("Online fetch error:", err);
        } finally {
          setLoading(false);
        }
      }
      fetchOnline();
    }
  }, [isOfflineMode, ps, initialPatient.id, patients, visits, investigations]);

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
