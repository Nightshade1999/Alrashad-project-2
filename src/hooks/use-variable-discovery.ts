"use client"

import { useMemo } from 'react'
import { COMMON_DISEASES, ALL_SURGERIES } from '@/lib/medical-dictionary'

export type Measure = 'categorical' | 'continuous' | 'ordinal'

export interface Variable {
  id: string; 
  label: string;
  type: Measure;
  group: string;
}

export function useVariableDiscovery(patients: any[]) {
  const ALL_VARIABLES = useMemo(() => {
    const vars: Variable[] = [
      { id: 'age', label: 'Patient Age', type: 'continuous', group: '1. Demographics' },
      { id: 'gender', label: 'Gender', type: 'categorical', group: '1. Demographics' },
      { id: 'education_level', label: 'Education Level', type: 'categorical', group: '1. Demographics' },
      { id: 'relative_status', label: 'Social Support / Relative Status', type: 'categorical', group: '1. Demographics' },
      
      { id: 'category', label: 'Clinical Risk Category', type: 'categorical', group: '2. Clinical Risk & Status' },
      { id: 'is_deceased', label: 'Survival Status', type: 'categorical', group: '2. Clinical Risk & Status' },
      { id: 'total_visits', label: 'Total Doctor Evaluations', type: 'continuous', group: '2. Clinical Risk & Status' },

      { id: 'high_risk_season', label: 'Seasonal Shift to High-Risk Status', type: 'categorical', group: '3. Chronology & Timing' },
      { id: 'death_season', label: 'Mortality Season (Season of Death)', type: 'categorical', group: '3. Chronology & Timing' },
      { id: 'days_to_high_risk', label: 'Evolution Speed (Days to High-Risk)', type: 'continuous', group: '3. Chronology & Timing' },
      { id: 'clinical_duration', label: 'Total Care Duration (Days in System)', type: 'continuous', group: '3. Chronology & Timing' },
      
      { id: 'total_chronic', label: 'Comorbidity Count (Total Chronic)', type: 'continuous', group: '5. Medical History (Hx)' }
    ]

    if (!patients || patients.length === 0) return vars

    const observedDiseases = new Set<string>()
    const observedIntDrugs = new Set<string>()
    const observedPsychDrugs = new Set<string>()
    const observedSurgeries = new Set<string>()
    const observedWards = new Set<string>()

    patients.forEach(p => {
      if (Array.isArray(p.chronic_diseases)) {
        p.chronic_diseases.forEach((cd: any) => cd.name && observedDiseases.add(cd.name))
      }
      if (Array.isArray(p.medical_drugs)) {
        p.medical_drugs.forEach((d: any) => d.name && observedIntDrugs.add(d.name))
      }
      if (Array.isArray(p.psych_drugs)) {
        p.psych_drugs.forEach((d: any) => d.name && observedPsychDrugs.add(d.name))
      }
      if (Array.isArray(p.past_surgeries)) {
        p.past_surgeries.forEach((s: any) => s && observedSurgeries.add(s))
      }
      if (p.doctor_ward) observedWards.add(p.doctor_ward)
    })

    // ── 3. Logistics ──────────────────────────────────────────
    Array.from(observedWards).sort().forEach(w => {
      vars.push({ id: `ward_${w.replace(/\s+/g, '_')}`, label: w, type: 'categorical', group: '3. Logistics' })
    })

    // ── 4. Surgical History ──────────────────────────────────
    const allSurgeries = new Set([...ALL_SURGERIES, ...Array.from(observedSurgeries)])
    Array.from(allSurgeries).sort().forEach(s => {
      vars.push({ id: `surgery_${s.replace(/\s+/g, '_')}`, label: s, type: 'categorical', group: '4. Surgical History' })
    })

    // ── 5. Medical History (Hx) ─────────────────────────────
    const allDiseases = new Set([...COMMON_DISEASES, ...Array.from(observedDiseases)])
    Array.from(allDiseases).sort().forEach(d => {
      vars.push({ id: `disease_${d.replace(/\s+/g, '_')}`, label: d, type: 'categorical', group: '5. Medical History (Hx)' })
    })

    // ── 6. Medication Profile (Rx) ──────────────────────────
    Array.from(observedIntDrugs).sort().forEach(d => {
      vars.push({ id: `int_drug_${d.replace(/\s+/g, '_')}`, label: d, type: 'categorical', group: '6. Medication Profile (Rx)' })
    })
    Array.from(observedPsychDrugs).sort().forEach(d => {
      vars.push({ id: `psych_drug_${d.replace(/\s+/g, '_')}`, label: d, type: 'categorical', group: '6. Medication Profile (Rx)' })
    })

    // ── 7. Laboratory Results (Diagnostics) ──────────────────
    const labParams = [
      { id: 'lab_wbc', label: 'WBC Count' },
      { id: 'lab_hb', label: 'Hb Level' },
      { id: 'lab_s_urea', label: 'S.Urea' },
      { id: 'lab_s_creatinine', label: 'S.Creatinine' },
      { id: 'lab_ast', label: 'AST' },
      { id: 'lab_alt', label: 'ALT' },
      { id: 'lab_tsb', label: 'TSB' },
      { id: 'lab_hba1c', label: 'HbA1c (%)' },
      { id: 'lab_rbs', label: 'Random Blood Sugar' }
    ]
    labParams.forEach(lp => vars.push({ ...lp, type: 'continuous', group: '7. Laboratory Results' }))

    // ── 8. Vital Signs (Physiological) ──────────────────────
    const vitalParams = [
      { id: 'vital_bp_sys', label: 'BP Systolic' },
      { id: 'vital_bp_dia', label: 'BP Diastolic' },
      { id: 'vital_pr', label: 'Pulse Rate (BPM)' },
      { id: 'vital_spo2', label: 'SpO2 (%)' },
      { id: 'vital_temp', label: 'Temperature (°C)' }
    ]
    vitalParams.forEach(vp => vars.push({ ...vp, type: 'continuous', group: '8. Vital Signs' }))

    return vars
  }, [patients])

  const categorizedGroups = useMemo(() => {
    const groups: Record<string, Variable[]> = {}
    ALL_VARIABLES.forEach(v => {
      if (!groups[v.group]) groups[v.group] = []
      groups[v.group].push(v)
    })
    return groups
  }, [ALL_VARIABLES])

  /**
   * Complex data extractor for clinical factors.
   */
  const getVariableValue = (p: any, varId: string): string | number | null => {
    if (!p) return null

    // 1. Core Fields
    if (varId === 'age') return p.age
    if (varId === 'gender') return p.gender
    if (varId === 'education_level') return p.education_level
    if (varId === 'relative_status') return p.relative_status
    if (varId === 'category') return p.category
    if (varId === 'is_deceased') return p.date_of_death ? 'Deceased' : 'Alive'
    if (varId === 'total_visits') return p.visits?.length || 0
    if (varId === 'total_chronic') return p.chronic_diseases?.length || 0

    // 2. Labs (Latest)
    if (varId.startsWith('lab_')) {
      const field = varId.replace('lab_', '')
      const latest = [...(p.investigations || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      return latest?.[field] || null
    }

    // 3. Vitals (Latest)
    if (varId.startsWith('vital_')) {
      const field = varId.replace('vital_', '')
      const latest = [...(p.visits || [])].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]
      return latest?.[field] || null
    }

    // 4. Chronic Diseases (Boolean Search)
    if (varId.startsWith('disease_')) {
      const diseaseName = varId.replace('disease_', '').replace(/_/g, ' ')
      return p.chronic_diseases?.some((d: any) => d.name === diseaseName) ? 'Present' : 'Absent'
    }

    // 5. Drugs (Boolean Search)
    if (varId.startsWith('int_drug_')) {
      const drugName = varId.replace('int_drug_', '').replace(/_/g, ' ')
      return p.medical_drugs?.some((d: any) => d.name === drugName) ? 'Yes' : 'No'
    }
    if (varId.startsWith('psych_drug_')) {
      const drugName = varId.replace('psych_drug_', '').replace(/_/g, ' ')
      return p.psych_drugs?.some((d: any) => d.name === drugName) ? 'Yes' : 'No'
    }

    // 6. Ward (Categorical)
    if (varId.startsWith('ward_')) {
      const wardName = varId.replace('ward_', '').replace(/_/g, ' ')
      return p.doctor_ward === wardName ? 'Yes' : 'No'
    }

    // 7. Temporal Logic
    if (varId === 'days_to_high_risk') {
       const admitted = new Date(p.created_at)
       const visits = p.visits || []
       // Find first visit where category was high risk (mock logic if status history not available)
       return 0 
    }

    return null
  }

  return { ALL_VARIABLES, categorizedGroups, getVariableValue }
}
