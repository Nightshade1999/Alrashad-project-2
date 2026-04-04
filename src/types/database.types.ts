export type PatientCategory = 'High Risk' | 'Close Follow-up' | 'Normal';

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string;
          ward_number: string;
          name: string;
          age: number;
          gender: string;
          category: PatientCategory;
          province: string | null;
          education_level: string | null;
          past_surgeries: string | null;
          chronic_diseases: string | null;
          psych_drugs: string | null;
          medical_drugs: string | null;
          allergies: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
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
        };
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'visit_date'>;
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
        };
        Insert: Omit<Database['public']['Tables']['investigations']['Row'], 'id' | 'date'>;
        Update: Partial<Database['public']['Tables']['investigations']['Insert']>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          ward_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
}
