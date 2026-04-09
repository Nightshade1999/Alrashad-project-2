"use client"

import { createClient } from '@/lib/supabase'
import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import type { Patient, Visit, Investigation, UserProfile } from '@/types/database.types'

// ─── Shared Context ──────────────────────────────────────────────────────────

interface DatabaseContextValue {
  isReady: boolean;
  profile: UserProfile | null;
  patients: ReturnType<typeof buildPatientApi>;
  visits: ReturnType<typeof buildVisitApi>;
  investigations: ReturnType<typeof buildInvestigationApi>;
  delete: (table: string, id: string) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ─── Helper API builders (Online Only) ───────────────────────────────────────

function buildPatientApi(supabase: any) {
  return {
    list: async (wardName?: string) => {
      let query = supabase.from('patients').select('*').neq('category', 'Deceased/Archive');
      if (wardName && wardName !== 'Master') {
        query = query.eq('ward_name', wardName);
      }
      const { data } = await query;
      return (data as unknown as Patient[]) || [];
    },
    get: async (id: string) => {
      const { data } = await supabase.from('patients').select('*').eq('id', id).single();
      return data as unknown as Patient;
    },
    insert: async (data: any) => {
      return supabase.from('patients').insert([data]);
    },
    update: async (id: string, data: any) => {
      return supabase.from('patients').update(data).eq('id', id);
    },
  };
}

function buildVisitApi(supabase: any) {
  return {
    list: async (patientId: string) => {
      const { data } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false });
      return (data as unknown as Visit[]) || [];
    },
    insert: async (data: any) => {
      return supabase.from('visits').insert([data]);
    },
  };
}

function buildInvestigationApi(supabase: any) {
  return {
    list: async (patientId: string) => {
      const { data } = await supabase.from('investigations').select('*').eq('patient_id', patientId).order('date', { ascending: false });
      return (data as unknown as Investigation[]) || [];
    },
    insert: async (data: any) => {
      return supabase.from('investigations').insert([data]);
    },
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Fetch fresh profile from Supabase
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (userProfile && !error) {
          setProfile(userProfile as UserProfile);
        }
      }
    } catch (err) {
      console.warn('DatabaseProvider: Failed to load profile', err);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    loadSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        loadSettings();
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<DatabaseContextValue>(() => ({
    isReady,
    profile,
    patients: buildPatientApi(supabase),
    visits: buildVisitApi(supabase),
    investigations: buildInvestigationApi(supabase),
    delete: async (table: string, id: string) => {
      return supabase.from(table).delete().eq('id', id);
    },
  }), [isReady, profile, supabase]);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within a DatabaseProvider');
  return ctx;
}
