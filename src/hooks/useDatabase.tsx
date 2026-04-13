"use client"

import { createClient } from '@/lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { Patient, Visit, Investigation, UserProfile, NurseInstruction, Reminder, Database } from '@/types/database.types'

interface PatientApi {
  list: (wardName?: string) => Promise<Patient[]>;
  get: (id: string) => Promise<Patient>;
  insert: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
}

interface VisitApi {
  list: (patientId: string) => Promise<Visit[]>;
  insert: (data: any) => Promise<any>;
}

interface InvestigationApi {
  list: (patientId: string) => Promise<Investigation[]>;
  insert: (data: any) => Promise<any>;
}

interface ReminderApi {
  list: (patientId?: string) => Promise<Reminder[]>;
  listOverdueByPatients: (patientIds: string[]) => Promise<number>;
  insert: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
}

interface NurseInstructionApi {
  list: (patientId: string) => Promise<NurseInstruction[]>;
}

interface DatabaseContextValue {
  isReady: boolean;
  profile: UserProfile | null;
  patients: PatientApi;
  visits: VisitApi;
  investigations: InvestigationApi;
  reminders: ReminderApi;
  nurseInstructions: NurseInstructionApi;
  delete: (table: string, id: string) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ─── Helper API builders (Online Only) ───────────────────────────────────────

function buildPatientApi(supabase: any): PatientApi {
  return {
    list: async (wardName?: string) => {
      let query = supabase.from('patients').select('*').neq('category', 'Deceased/Archive').limit(5000);
      if (wardName && wardName !== 'Master' && wardName !== 'Master Ward') {
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

function buildVisitApi(supabase: any): VisitApi {
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

function buildInvestigationApi(supabase: any): InvestigationApi {
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

function buildReminderApi(supabase: any): ReminderApi {
  return {
    list: async (patientId?: string) => {
      let query = supabase.from('reminders').select('*');
      if (patientId) query = query.eq('patient_id', patientId);
      const { data } = await query.order('due_date', { ascending: true });
      return (data as unknown as any[]) || [];
    },
    listOverdueByPatients: async (patientIds: string[]) => {
      const { data } = await supabase
        .from('reminders')
        .select('patient_id')
        .eq('is_resolved', false)
        .lt('due_date', new Date().toISOString())
        .in('patient_id', patientIds);
      
      const overduePatientIds = new Set((data as any[])?.map(r => r.patient_id) || []);
      return overduePatientIds.size;
    },
    insert: async (data: any) => {
      return supabase.from('reminders').insert([data]);
    },
    update: async (id: string, data: any) => {
      return supabase.from('reminders').update(data).eq('id', id);
    },
  };
}

function buildNurseInstructionApi(supabase: SupabaseClient<Database>): NurseInstructionApi {
  return {
    list: async (patientId: string) => {
      const { data } = await supabase
        .from('nurse_instructions')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      return (data as unknown as NurseInstruction[]) || [];
    },
  };
}


// ─── Provider ─────────────────────────────────────────────────────────────────

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  const loadSettings = async () => {
    // Safety timeout: If Supabase Auth hangs (common on LAN-to-mobile SSL), 
    // force isReady so the UI doesn't stay on the loading screen forever.
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.warn('DatabaseProvider: loadSettings timed out, forcing isReady');
        setIsReady(true);
      }
    }, 5000);

    try {
      setIsReady(false);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        // Fetch fresh profile from Supabase (bypassing potentially stale local session metadata)
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (userProfile && !error) {
          setProfile(userProfile as UserProfile);
          // Cache for faster subsequent loads (used by some components)
          localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(userProfile));
        }
      }
    } catch (err) {
      console.warn('DatabaseProvider: Failed to load profile', err);
    } finally {
      clearTimeout(timeout);
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
        // Clear identity session flag so it reappears on next login
        sessionStorage.removeItem('wardManager_sessionActive');
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
    reminders: buildReminderApi(supabase),
    nurseInstructions: buildNurseInstructionApi(supabase),
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
