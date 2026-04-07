"use client"

import { usePowerSync } from '@/lib/powersync/PowerSyncProvider'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import type { Patient, Visit, Investigation, UserProfile } from '@/types/database.types'

export function useDatabase() {
  const ps = usePowerSync();
  const supabase = createClient();
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Check Global Setting
      const { data: globalSettings } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      setGlobalEnabled((globalSettings as any)?.global_offline_enabled ?? true);

      // 2. Check User Profile & Offline Toggle
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (userProfile) {
        setProfile(userProfile as any);
        setOfflineEnabled((userProfile as any).offline_mode_enabled ?? false);
      }
    }
    loadSettings();
  }, []);

  const isOfflineMode = globalEnabled && offlineEnabled;

  return {
    isOfflineMode,
    profile,
    // Unified API for CRUD
    patients: {
      list: async (wardName?: string) => {
        if (isOfflineMode && ps) {
          let query = 'SELECT * FROM patients WHERE category != "Deceased/Archive"';
          if (wardName) query += ` AND ward_name = '${wardName}'`;
          return ps.getAll(query);
        } else {
          let query = supabase.from('patients').select('*').neq('category', 'Deceased/Archive');
          if (wardName) query = query.eq('ward_name', wardName);
          const { data } = await query;
          return data as Patient[];
        }
      },
      get: async (id: string) => {
        if (isOfflineMode && ps) {
          return await ps.get('SELECT * FROM patients WHERE id = ?', [id]) as unknown as Patient;
        } else {
          const { data } = await supabase.from('patients').select('*').eq('id', id).single();
          return data as Patient;
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
            // Stringify arrays for SQLite
            if (Array.isArray(data[key])) return `${key} = '${JSON.stringify(data[key])}'`;
            if (typeof data[key] === 'string') return `${key} = '${data[key]}'`;
            return `${key} = ${data[key]}`;
          }).join(', ');
          
          return ps.execute(`UPDATE patients SET ${fields}, updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
        } else {
          return supabase.from('patients').update(data).eq('id', id);
        }
      }
    },
    visits: {
      list: async (patientId: string) => {
        if (isOfflineMode && ps) {
          return ps.getAll('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC', [patientId]);
        } else {
          const { data } = await supabase.from('visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false });
          return data as Visit[];
        }
      },
      insert: async (data: any) => {
        if (isOfflineMode && ps) {
          return ps.execute('INSERT INTO visits (id, patient_id, doctor_id, visit_date, exam_notes, is_er) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), data.patient_id, data.doctor_id, new Date().toISOString(), data.exam_notes, data.is_er ? 1 : 0]);
        } else {
          return (supabase.from('visits') as any).insert(data);
        }
      }
    },
    investigations: {
      list: async (patientId: string) => {
        if (isOfflineMode && ps) {
          return ps.getAll('SELECT * FROM investigations WHERE patient_id = ? ORDER BY date DESC', [patientId]);
        } else {
          const { data } = await supabase.from('investigations').select('*').eq('patient_id', patientId).order('date', { ascending: false });
          return data as Investigation[];
        }
      },
      insert: async (data: any) => {
        if (isOfflineMode && ps) {
          return ps.execute('INSERT INTO investigations (id, patient_id, date, wbc, hb, s_urea, s_creatinine, ast, alt, tsb, hba1c, rbs, is_er, doctor_id, doctor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), data.patient_id, data.date, data.wbc, data.hb, data.s_urea, data.s_creatinine, data.ast, data.alt, data.tsb, data.hba1c, data.rbs, data.is_er ? 1 : 0, data.doctor_id, data.doctor_name]);
        } else {
          return (supabase.from('investigations') as any).insert([data]);
        }
      }
    },
    delete: async (table: string, id: string) => {
      if (isOfflineMode && ps) {
        return ps.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      } else {
        return supabase.from(table).delete().eq('id', id);
      }
    }
  };
}
