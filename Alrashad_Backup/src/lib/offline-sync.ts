import localforage from 'localforage'
import { createClient } from '@/lib/supabase'

export const dataStore = localforage.createInstance({ name: 'ward-manager-data' })
export const syncQueue = localforage.createInstance({ name: 'ward-manager-sync-queue' })

export type MutationAction = 'ADD_PATIENT' | 'ADD_VISIT' | 'ADD_LABS'

export interface QueuedMutation {
  id: string
  action: MutationAction
  payload: any
  timestamp: string
}

export async function fetchWithCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const data = await fetchFn()
      await dataStore.setItem(key, data)
      return data
    } catch (e) {
      console.warn('Fetch failed, falling back to cache', e)
      return await dataStore.getItem<T>(key)
    }
  } else {
    return await dataStore.getItem<T>(key)
  }
}

export async function queueMutation(action: MutationAction, payload: any) {
  const mutation: QueuedMutation = {
    id: Date.now().toString(),
    action,
    payload,
    timestamp: new Date().toISOString(),
  }
  await syncQueue.setItem(mutation.id, mutation)
  // Optionally, we could merge this optimistically directly into dataStore here
}

export async function processSyncQueue(): Promise<number> {
  if (typeof navigator === 'undefined' || !navigator.onLine) return 0

  const supabase = createClient()
  const keys = await syncQueue.keys()

  if (keys.length === 0) return 0

  console.log(`Processing ${keys.length} offline mutations...`)
  let synced = 0

  for (const key of keys) {
    const mutation = await syncQueue.getItem<QueuedMutation>(key)
    if (!mutation) continue

    try {
      if (mutation.action === 'ADD_PATIENT') {
        // @ts-expect-error - Supabase type inference issue with insert
        const { error } = await supabase.from('patients').insert([mutation.payload as any])
        if (error) throw error
      } else if (mutation.action === 'ADD_VISIT') {
        // @ts-expect-error - Supabase type inference issue with insert
        const { error } = await supabase.from('visits').insert([mutation.payload as any])
        if (error) throw error
      } else if (mutation.action === 'ADD_LABS') {
        // @ts-expect-error - Supabase type inference issue with insert
        const { error } = await supabase.from('investigations').insert([mutation.payload as any])
        if (error) throw error
      }
      await syncQueue.removeItem(key)
      synced++
    } catch (error) {
      console.error('Failed to sync mutation:', mutation, error)
    }
  }

  return synced
}

export async function getPendingCount(): Promise<number> {
  try {
    const keys = await syncQueue.keys()
    return keys.length
  } catch {
    return 0
  }
}
