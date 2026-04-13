"use client"

import { createClient } from "@/lib/supabase"
import type { Referral } from "@/types/database.types"

/**
 * Saves a formal clinical referral letter to the database.
 */
export async function createReferralLetterAction(data: Omit<Referral, 'id' | 'created_at'>) {
  const supabase = createClient()
  
  const { data: referral, error } = await (supabase
    .from('referrals') as any)
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return referral
}

/**
 * Retrieves the most recent referral letter for a specific patient.
 * Used for smart suggestions when marking a patient as 'Accepted Elsewhere'.
 */
export async function getLatestReferralLetterAction(patientId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Retrieves a specific referral letter by ID.
 */
export async function getReferralByIdAction(referralId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      *,
      patients (
        name,
        age,
        gender,
        medical_record_number,
        mother_name
      )
    `)
    .eq('id', referralId)
    .single()

  if (error) throw error
  return data
}
