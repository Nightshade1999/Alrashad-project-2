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
          is_er: boolean;
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at' | 'specialty' | 'doctor_name' | 'gender'> & { specialty?: string; doctor_name?: string; gender?: 'Male' | 'Female' | null };
        Update: {
          user_id?: string;
          ward_name?: string;
          doctor_name?: string | null;
          role?: 'admin' | 'user';
          specialty?: string;
          gender?: 'Male' | 'Female' | null;
        };
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
    };
  };
}
