export type PatientCategory = 'High Risk' | 'Close Follow-up' | 'Normal' | 'Deceased/Archive';

export interface MedicalDrugParams {
  name: string;
  dosage: string;
  frequency: string;
}

export interface ChronicDiseaseParams {
  name: string;
  type: 'preset' | 'other';
}

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string;
          ward_number: string;
          ward_name: string;
          name: string;
          age: number;
          gender: string;
          category: PatientCategory;
          province: string | null;
          education_level: string | null;
          relative_status: 'Known' | 'Unknown';
          relative_visits: string | null;
          date_of_death: string | null;
          cause_of_death: string | null;
          past_surgeries: string[];
          chronic_diseases: ChronicDiseaseParams[];
          psych_drugs: MedicalDrugParams[];
          medical_drugs: MedicalDrugParams[];
          allergies: string[];
          is_in_er: boolean;
          er_admission_date: string | null;
          er_admission_doctor: string | null;
          er_chief_complaint: string | null;
          er_admission_notes: string | null;
          er_treatment: MedicalDrugParams[] | null;
          er_history: any[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ward_number: string;
          ward_name: string;
          name: string;
          age: number;
          gender: string;
          category: PatientCategory;
          province?: string | null;
          education_level?: string | null;
          relative_status?: 'Known' | 'Unknown';
          relative_visits?: string | null;
          date_of_death?: string | null;
          cause_of_death?: string | null;
          past_surgeries?: string[];
          chronic_diseases?: ChronicDiseaseParams[];
          psych_drugs?: MedicalDrugParams[];
          medical_drugs?: MedicalDrugParams[];
          allergies?: string[];
          is_in_er?: boolean;
          er_admission_date?: string | null;
          er_admission_doctor?: string | null;
          er_chief_complaint?: string | null;
          er_admission_notes?: string | null;
          er_treatment?: MedicalDrugParams[] | null;
          er_history?: any[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ward_number?: string;
          ward_name?: string;
          name?: string;
          age?: number;
          gender?: string;
          category?: PatientCategory;
          province?: string | null;
          education_level?: string | null;
          relative_status?: 'Known' | 'Unknown';
          relative_visits?: string | null;
          date_of_death?: string | null;
          cause_of_death?: string | null;
          past_surgeries?: string[];
          chronic_diseases?: ChronicDiseaseParams[];
          psych_drugs?: MedicalDrugParams[];
          medical_drugs?: MedicalDrugParams[];
          allergies?: string[];
          is_in_er?: boolean;
          er_admission_date?: string | null;
          er_admission_doctor?: string | null;
          er_chief_complaint?: string | null;
          er_admission_notes?: string | null;
          er_treatment?: MedicalDrugParams[] | null;
          er_history?: any[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      visits: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          visit_date: string;
          exam_notes: string;
          bp_sys: number | null;
          bp_dia: number | null;
          pr: number | null;
          spo2: number | null;
          temp: number | null;
          is_er: boolean;
          is_conscious: boolean;
          is_oriented: boolean;
          is_ambulatory: boolean;
          is_dyspnic: boolean;
          is_soft_abdomen: boolean;
        };
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'visit_date'> & { visit_date?: string };
        Update: Partial<Database['public']['Tables']['visits']['Insert']>;
      };
      investigations: {
        Row: {
          id: string;
          visit_id: string;
          patient_id: string;
          date: string;
          wbc: number | null;
          hb: number | null;
          s_urea: number | null;
          s_creatinine: number | null;
          ast: number | null;
          alt: number | null;
          tsb: number | null;
          hba1c: number | null;
          rbs: number | null;
          ldl: number | null;
          hdl: number | null;
          tg: number | null;
          esr: number | null;
          crp: number | null;
          is_er: boolean;
          doctor_id?: string | null;
          doctor_name?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['investigations']['Row'], 'id' | 'date'> & { date?: string };
        Update: Partial<Database['public']['Tables']['investigations']['Insert']>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          ward_name: string;
          doctor_name: string | null;
          role: 'admin' | 'user';
          specialty: 'internal_medicine' | 'psychiatry' | string;
          gender: 'Male' | 'Female' | null;
          ai_enabled: boolean;
          offline_mode_enabled: boolean;
          is_admin: boolean;
          can_see_ward_patients: boolean;
          accessible_wards: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at' | 'specialty' | 'doctor_name' | 'gender' | 'ai_enabled' | 'offline_mode_enabled' | 'is_admin' | 'can_see_ward_patients' | 'accessible_wards'> & { specialty?: string; doctor_name?: string; gender?: 'Male' | 'Female' | null; ai_enabled?: boolean; offline_mode_enabled?: boolean; is_admin?: boolean; can_see_ward_patients?: boolean; accessible_wards?: string[] };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      ward_settings: {
        Row: {
          id: string;
          ward_name: string;
          gender: 'Male' | 'Female' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ward_name: string;
          gender?: 'Male' | 'Female' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ward_name?: string;
          gender?: 'Male' | 'Female' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: number;
          global_offline_enabled: boolean;
          see_all_patients: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>;
      };
    };
  };
}

export type Patient = Database['public']['Tables']['patients']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type Investigation = Database['public']['Tables']['investigations']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
export type CRUDOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
