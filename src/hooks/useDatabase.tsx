"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { createClient } from '@/lib/supabase'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { Patient, Visit, Investigation, UserProfile } from '@/types/database.types'

// ─── Shared Context ──────────────────────────────────────────────────────────
// loadSettings runs exactly once in DatabaseProvider, not once per useDatabase() call.

interface DatabaseContextValue {
  isOfflineMode: boolean;
  profile: UserProfile | null;
  patients: ReturnType<typeof buildPatientApi>;
  visits: ReturnType<typeof buildVisitApi>;
  investigations: ReturnType<typeof buildInvestigationApi>;
  delete: (table: string, id: string) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ─── Helper API builders (defined outside component to avoid re-creation) ────

function buildPatientApi(isOfflineMode: boolean, ps: any, supabase: any) {
  return {
    list: async (wardName?: string) => {
      if (isOfflineMode && ps) {
        let query = `SELECT * FROM patients WHERE category != 'Deceased/Archive'`;
        if (wardName) query += ` AND ward_name = '${wardName}'`;
        return ps.getAll(query);
      } else {
        let query = supabase.from('patients').select('*').neq('category', 'Deceased/Archive');
        if (wardName) query = query.eq('ward_name', wardName);
        const { data } = await query;
        return (data as unknown as Patient[]) || [];
      }
    },
    get: async (id: string) => {
      if (isOfflineMode && ps) {
        return (await ps.getAll('SELECT * FROM patients WHERE id = ?', [id]))[0] as unknown as Patient;
      } else {
        const { data } = await supabase.from('patients').select('*').eq('id', id).single();
        return data as unknown as Patient;
      }
    },
    insert: async (data: any) => {
      if (isOfflineMode && ps) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        return ps.execute(
          `INSERT INTO patients (
            id, user_id, ward_name, ward_number, name, room_number, age, gender, category, 
            province, education_level, relative_status, relative_visits,
            past_surgeries, chronic_diseases, psych_drugs, 
            medical_drugs, allergies, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, data.user_id, data.ward_name, data.ward_number || data.ward_name, data.name, data.room_number, data.age, data.gender, data.category,
            data.province, data.education_level, data.relative_status, data.relative_visits,
            JSON.stringify(data.past_surgeries || []),
            JSON.stringify(data.chronic_diseases || []),
            JSON.stringify(data.psych_drugs || []),
            JSON.stringify(data.medical_drugs || []),
            JSON.stringify(data.allergies || []),
            now, now
          ]
        );
      } else {
        return supabase.from('patients').insert(data);
      }
    },
    update: async (id: string, data: any) => {
      if (isOfflineMode && ps) {
        const entries = Object.entries(data);
        const fields = entries.map(([key]) => {
          if (Array.isArray(data[key])) return `${key} = '${JSON.stringify(data[key])}'`;
          if (typeof data[key] === 'string') return `${key} = '${data[key]}'`;
          return `${key} = ${data[key]}`;
        }).join(', ');
        return ps.execute(`UPDATE patients SET ${fields}, updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
      } else {
        return (supabase.from('patients') as any).update(data).eq('id', id);
      }
    },
  };
}

function buildVisitApi(isOfflineMode: boolean, ps: any, supabase: any) {
  return {
    list: async (patientId: string) => {
      if (isOfflineMode && ps) {
        return ps.getAll('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC', [patientId]);
      } else {
        const { data } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false });
        return (data as unknown as Visit[]) || [];
      }
    },
    insert: async (data: any) => {
      if (isOfflineMode && ps) {
        return ps.execute(
          'INSERT INTO visits (id, patient_id, doctor_id, visit_date, exam_notes, bp_sys, bp_dia, pr, spo2, temp, is_er) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            crypto.randomUUID(),
            data.patient_id,
            data.doctor_id,
            data.visit_date || new Date().toISOString(),
            data.exam_notes,
            data.bp_sys,
            data.bp_dia,
            data.pr,
            data.spo2,
            data.temp,
            data.is_er ? 1 : 0
          ]
        );
      } else {
        return (supabase.from('visits') as any).insert(data);
      }
    },
  };
}

function buildInvestigationApi(isOfflineMode: boolean, ps: any, supabase: any) {
  return {
    list: async (patientId: string) => {
      if (isOfflineMode && ps) {
        return ps.getAll('SELECT * FROM investigations WHERE patient_id = ? ORDER BY date DESC', [patientId]);
      } else {
        const { data } = await supabase.from('investigations').select('*').eq('patient_id', patientId).order('date', { ascending: false });
        return (data as unknown as Investigation[]) || [];
      }
    },
    insert: async (data: any) => {
      if (isOfflineMode && ps) {
        return ps.execute(
          'INSERT INTO investigations (id, patient_id, date, wbc, hb, s_urea, s_creatinine, ast, alt, tsb, hba1c, rbs, ldl, hdl, tg, esr, crp, other_labs, is_er, doctor_id, doctor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            crypto.randomUUID(),
            data.patient_id,
            data.date,
            data.wbc,
            data.hb,
            data.s_urea,
            data.s_creatinine,
            data.ast,
            data.alt,
            data.tsb,
            data.hba1c,
            data.rbs,
            data.ldl,
            data.hdl,
            data.tg,
            data.esr,
            data.crp,
            JSON.stringify(data.other_labs || []),
            data.is_er ? 1 : 0,
            data.doctor_id,
            data.doctor_name
          ]
        );
      } else {
        return (supabase.from('investigations') as any).insert([data]);
      }
    },
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Wrap pages/layouts with this so loadSettings runs once, not per-component.

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const ps = usePowerSync();
  const supabase = useMemo(() => createClient(), []);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadSettings() {
      // Step 1: Auth session — isolate so offline errors don't cascade
      let session: any = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error) session = data.session;
      } catch {
        console.warn('Offline: Supabase auth check skipped, using local cache.');
      }

      const userId = session?.user?.id;

      // Step 2: Instant Metadata & Cache Load
      if (userId) {
        // A. Primary Fallback: Supabase User Metadata (Instant from Session)
        const metadataRoleRaw = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
        const isMetadataAdmin = typeof metadataRoleRaw === 'string' && metadataRoleRaw.toLowerCase() === 'admin';
        
        if (metadataRoleRaw) {
          setProfile(prev => ({ 
            ...(prev || {}), 
            role: isMetadataAdmin ? 'admin' : metadataRoleRaw,
            user_id: userId,
            metadata_role: isMetadataAdmin ? 'admin' : metadataRoleRaw
          } as UserProfile));
        }

        // B. Secondary Fallback: localStorage Cache
        try {
          const cached = localStorage.getItem(`profile_cache_${userId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setProfile(prev => ({ ...parsed, ...prev })); // Merge so metadataRole has priority if cache is stale
            setOfflineEnabled(parsed?.offline_mode_enabled ?? false);
          }
        } catch {}
      }

      // Step 3: Global system settings
      try {
        let globalSettings: any = null;
        if (session && navigator.onLine) {
          const { data } = await supabase.from('system_settings').select('*').eq('id', 1).single();
          globalSettings = data;
        } else if (ps) {
          globalSettings = (await ps.getAll('SELECT * FROM system_settings WHERE id = 1'))[0];
        }
        setGlobalEnabled(globalSettings?.global_offline_enabled ?? true);
      } catch {
        console.warn('Could not load system_settings, using default.');
      }

      // Step 4: Fresh profile from network (overwrites the cache version if available)
      try {
        let userProfile: any = null;
        if (session && navigator.onLine) {
          const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
          userProfile = data;
          if (data) localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(data));
        } else {
          // Offline: PowerSync SQLite
          if (ps && userId) {
            try {
              userProfile = (await ps.getAll('SELECT * FROM user_profiles WHERE user_id = ?', [userId]))[0];
            } catch {
              console.warn('SQLite profile fetch failed, using localStorage cache.');
            }
          }
          // Offline final fallback
          if (!userProfile?.ward_name && userId) {
            const cached = localStorage.getItem(`profile_cache_${userId}`);
            if (cached) { try { userProfile = JSON.parse(cached); } catch {} }
          }
        }
        if (userProfile) {
          setProfile(prev => {
            const dbRole = (userProfile as any).role;
            const isDbAdmin = typeof dbRole === 'string' && dbRole.toLowerCase() === 'admin';
            const isPrevMetadataAdmin = (prev as any)?.metadata_role === 'admin';

            return {
              ...(userProfile as any),
              // CRITICAL: Never let a DB fetch downgrade an Admin if they have the metadata flag
              role: isPrevMetadataAdmin ? 'admin' : (isDbAdmin ? 'admin' : dbRole)
            }
          });
          setOfflineEnabled((userProfile as any).offline_mode_enabled ?? false);
        }
      } catch (err) {
        console.warn('Could not load user profile.', err);
      }
    }

    loadSettings();
  }, [ps, supabase]);

  const isOfflineMode = (globalEnabled && offlineEnabled) || !isOnline;

  const value = useMemo<DatabaseContextValue>(() => ({
    isOfflineMode,
    profile,
    patients: buildPatientApi(isOfflineMode, ps, supabase),
    visits: buildVisitApi(isOfflineMode, ps, supabase),
    investigations: buildInvestigationApi(isOfflineMode, ps, supabase),
    delete: async (table: string, id: string) => {
      if (isOfflineMode && ps) {
        return ps.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      } else {
        return supabase.from(table).delete().eq('id', id);
      }
    },
  }), [isOfflineMode, profile, ps, supabase]);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Unchanged public API — all existing components work without modification.

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within a DatabaseProvider');
  return ctx;
}
