"use client"

import { createClient } from '@/lib/supabase'

export async function getSystemSettings() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('see_all_patients')
    .eq('id', 1)
    .single()
  
  if (error) {
    console.error('Error fetching settings:', error)
    return { see_all_patients: false }
  }
  return data
}

export async function updateSystemSettings(seeAll: boolean) {
  const supabase = createClient()
  const { error } = await (supabase.from('system_settings') as any)
    .update({ see_all_patients: seeAll, updated_at: new Date().toISOString() })
    .eq('id', 1)
  
  if (error) {
    console.error('Error updating settings:', error)
    return { success: false, error }
  }
  return { success: true }
}
