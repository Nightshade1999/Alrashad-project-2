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
      // ── 1. Demographics ────────────────────────────────────
      { id: 'age', label: 'Patient Age', type: 'continuous', group: '1. Demographics' },
      { id: 'gender', label: 'Gender', type: 'categorical', group: '1. Demographics' },
      { id: 'province', label: 'Province / Region', type: 'categorical', group: '1. Demographics' },
      { id: 'education_level', label: 'Education Level', type: 'categorical', group: '1. Demographics' },
      { id: 'relative_status', label: 'Social Support / Relative Status', type: 'categorical', group: '1. Demographics' },

      // ── 2. Clinical Risk & Status ───────────────────────────
      { id: 'category', label: 'Clinical Risk Category', type: 'categorical', group: '2. Clinical Risk & Status' },
      { id: 'is_deceased', label: 'Survival Status (Alive/Deceased)', type: 'categorical', group: '2. Clinical Risk & Status' },
      { id: 'cause_of_death', label: 'Cause of Death', type: 'categorical', group: '2. Clinical Risk & Status' },
      { id: 'total_visits', label: 'Total Doctor Evaluations', type: 'continuous', group: '2. Clinical Risk & Status' },

      // ── 3. Emergency Room (ER) ─────────────────────────────
      { id: 'is_in_er', label: 'Currently in ER', type: 'categorical', group: '3. Emergency Room' },
      { id: 'er_history_count', label: 'ER History Episodes (Past Admissions)', type: 'continuous', group: '3. Emergency Room' },
      { id: 'er_visit_count', label: 'ER Clinical Visits Count', type: 'continuous', group: '3. Emergency Room' },

      // ── 4. Chronology & Timing ─────────────────────────────
      { id: 'high_risk_season', label: 'Seasonal Shift to High-Risk Status', type: 'categorical', group: '4. Chronology & Timing' },
      { id: 'death_season', label: 'Mortality Season (Season of Death)', type: 'categorical', group: '4. Chronology & Timing' },
      { id: 'days_to_high_risk', label: 'Evolution Speed (Days to High-Risk)', type: 'continuous', group: '4. Chronology & Timing' },
      { id: 'clinical_duration', label: 'Total Care Duration (Days in System)', type: 'continuous', group: '4. Chronology & Timing' },

      // ── 5. Medical History (Hx) ── base items ──────────────
      { id: 'total_chronic', label: 'Comorbidity Count (Total Chronic)', type: 'continuous', group: '5. Medical History (Hx)' },
      { id: 'total_allergies', label: 'Allergy Count', type: 'continuous', group: '5. Medical History (Hx)' },
      { id: 'total_surgeries', label: 'Total Past Surgeries', type: 'continuous', group: '5. Medical History (Hx)' },
    ]

    if (!patients || patients.length === 0) return vars

    const observedDiseases = new Set<string>()
    const observedIntDrugs = new Set<string>()
    const observedPsychDrugs = new Set<string>()
    const observedSurgeries = new Set<string>()
    const observedWards = new Set<string>()
    const observedProvinces = new Set<string>()
    const observedCausesOfDeath = new Set<string>()

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
      if (p.province) observedProvinces.add(p.province)
      if (p.cause_of_death) observedCausesOfDeath.add(p.cause_of_death)
    })

    // ── 3. Extra: Logistics (wards as categorical factors) ──
    Array.from(observedWards).sort().forEach(w => {
      vars.push({ id: `ward_${w.replace(/\s+/g, '_')}`, label: w, type: 'categorical', group: '3. Logistics' })
    })

    // ── 4. Surgical History ──────────────────────────────────
    const allSurgeries = new Set([...ALL_SURGERIES, ...Array.from(observedSurgeries)])
    Array.from(allSurgeries).sort().forEach(s => {
      vars.push({ id: `surgery_${s.replace(/\s+/g, '_')}`, label: s, type: 'categorical', group: '4. Surgical History' })
    })

    // ── 5. Medical History (Hx) — dynamic ───────────────────
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

    // ── 7. Laboratory Results (Diagnostics) — full panel ─────
    const labParams = [
      { id: 'lab_wbc', label: 'WBC Count (×10³/µL)' },
      { id: 'lab_hb', label: 'Haemoglobin (g/dL)' },
      { id: 'lab_s_urea', label: 'Serum Urea (mmol/L)' },
      { id: 'lab_s_creatinine', label: 'Serum Creatinine (µmol/L)' },
      { id: 'lab_ast', label: 'AST (U/L)' },
      { id: 'lab_alt', label: 'ALT (U/L)' },
      { id: 'lab_tsb', label: 'Total Serum Bilirubin (mg/dL)' },
      { id: 'lab_hba1c', label: 'HbA1c (%)' },
      { id: 'lab_rbs', label: 'Random Blood Sugar (mg/dL)' },
      { id: 'lab_ldl', label: 'LDL Cholesterol (mg/dL)' },
      { id: 'lab_hdl', label: 'HDL Cholesterol (mg/dL)' },
      { id: 'lab_tg', label: 'Triglycerides (mg/dL)' },
      { id: 'lab_esr', label: 'ESR (mm/hr)' },
      { id: 'lab_crp', label: 'CRP (mg/L)' },
    ]
    labParams.forEach(lp => vars.push({ ...lp, type: 'continuous', group: '7. Laboratory Results' }))

    // ── 8. Vital Signs (Physiological) ──────────────────────
    const vitalParams = [
      { id: 'vital_bp_sys', label: 'BP Systolic (mmHg)' },
      { id: 'vital_bp_dia', label: 'BP Diastolic (mmHg)' },
      { id: 'vital_pr', label: 'Pulse Rate (BPM)' },
      { id: 'vital_spo2', label: 'SpO₂ (%)' },
      { id: 'vital_temp', label: 'Temperature (°C)' },
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

    // 1. Core Demographic Fields
    if (varId === 'age') return p.age
    if (varId === 'gender') return p.gender
    if (varId === 'province') return p.province || null
    if (varId === 'education_level') return p.education_level
    if (varId === 'relative_status') return p.relative_status

    // 2. Clinical Status
    if (varId === 'category') return p.category
    if (varId === 'is_deceased') return p.date_of_death ? 'Deceased' : 'Alive'
    if (varId === 'cause_of_death') return p.cause_of_death || null
    if (varId === 'total_visits') return p.visits?.length || 0

    // 3. Emergency Room
    if (varId === 'is_in_er') return p.is_in_er ? 'Yes' : 'No'
    if (varId === 'er_history_count') return Array.isArray(p.er_history) ? p.er_history.length : 0
    if (varId === 'er_visit_count') return Array.isArray(p.visits) ? p.visits.filter((v: any) => v.is_er).length : 0

    // 4. Medical History counts
    if (varId === 'total_chronic') return p.chronic_diseases?.length || 0
    if (varId === 'total_allergies') return Array.isArray(p.allergies) ? p.allergies.length : 0
    if (varId === 'total_surgeries') return Array.isArray(p.past_surgeries) ? p.past_surgeries.length : 0

    // 5. Temporal Logic
    if (varId === 'high_risk_season') {
      if (!p.high_risk_date) return 'N/A'
      const month = new Date(p.high_risk_date).getMonth() + 1
      return (month >= 5 && month <= 9) ? 'Summer' : (month >= 11 || month <= 2) ? 'Winter' : 'Shoulder'
    }
    if (varId === 'death_season') {
      if (!p.date_of_death) return 'N/A'
      const month = new Date(p.date_of_death).getMonth() + 1
      return (month >= 5 && month <= 9) ? 'Summer' : (month >= 11 || month <= 2) ? 'Winter' : 'Shoulder'
    }
    if (varId === 'days_to_high_risk') {
      if (!p.high_risk_date) return null
      return Math.floor((new Date(p.high_risk_date).getTime() - new Date(p.created_at).getTime()) / 86400000)
    }
    if (varId === 'clinical_duration') {
      const end = p.date_of_death ? new Date(p.date_of_death).getTime() : Date.now()
      return Math.floor((end - new Date(p.created_at).getTime()) / 86400000)
    }

    // 6. Labs (Latest reading)
    if (varId.startsWith('lab_')) {
      const field = varId.replace('lab_', '')
      const latest = [...(p.investigations || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      return latest?.[field] ?? null
    }

    // 7. Vitals (Latest reading)
    if (varId.startsWith('vital_')) {
      const field = varId.replace('vital_', '')
      const latest = [...(p.visits || [])].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())[0]
      return latest?.[field] ?? null
    }

    // 8. Chronic Diseases (Boolean)
    if (varId.startsWith('disease_')) {
      const diseaseName = varId.replace('disease_', '').replace(/_/g, ' ')
      return p.chronic_diseases?.some((d: any) => d.name === diseaseName) ? 'Present' : 'Absent'
    }

    // 9. Drugs
    if (varId.startsWith('int_drug_')) {
      const drugName = varId.replace('int_drug_', '').replace(/_/g, ' ')
      return p.medical_drugs?.some((d: any) => d.name === drugName) ? 'Yes' : 'No'
    }
    if (varId.startsWith('psych_drug_')) {
      const drugName = varId.replace('psych_drug_', '').replace(/_/g, ' ')
      return p.psych_drugs?.some((d: any) => d.name === drugName) ? 'Yes' : 'No'
    }

    // 10. Ward (Categorical)
    if (varId.startsWith('ward_')) {
      const wardName = varId.replace('ward_', '').replace(/_/g, ' ')
      return p.doctor_ward === wardName ? 'Yes' : 'No'
    }

    // 11. Surgeries (Boolean)
    if (varId.startsWith('surgery_')) {
      const surgeryName = varId.replace('surgery_', '').replace(/_/g, ' ')
      return Array.isArray(p.past_surgeries) && p.past_surgeries.some((s: any) => s === surgeryName) ? 'Yes' : 'No'
    }

    return null
  }

  return { ALL_VARIABLES, categorizedGroups, getVariableValue }
}
