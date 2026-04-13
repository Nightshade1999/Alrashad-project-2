export type PatientCategory = 'High Risk' | 'Close Follow-up' | 'Normal' | 'Awaiting Assessment' | 'Deceased/Archive';

export interface MedicalDrugParams {
  name: string;
  dosage: string;
  frequency: string;
}

export interface ChronicDiseaseParams {
  name: string;
  type: 'preset' | 'other';
}

/** Centralized Role Management */
export function isAdmin(profile: { role?: string, is_admin?: boolean } | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.is_admin === true;
}

export function isClinician(profile: { role?: string } | null | undefined): boolean {
  if (!profile) return false;
  const role = profile.role;
  return role === 'doctor' || role === 'nurse' || role === 'admin' || role === 'lab_tech' || role === 'pharmacist' || !role;
}

export function isDoctor(profile: { role?: string } | null | undefined): boolean {
  if (!profile) return false;
  const role = profile.role;
  return role === 'doctor' || role === 'admin' || !role;
}

export function getRoleDisplayName(role?: string): string {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'doctor': return 'Doctor';
    case 'nurse': return 'Nurse';
    case 'lab_tech': return 'Lab Technician';
    case 'pharmacist': return 'Pharmacist';
    default: return 'User';
  }
}

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string;
          ward_name: string;
          room_number: string;
          name: string;
          age: number | null;
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
          admission_date: string | null;
          last_activity_at: string | null;
          mother_name: string | null;
          medical_record_number: string | null;
          psychological_diagnosis: string | null;
          psych_last_edit_by: string | null;
          psych_last_edit_at: string | null;
          er_treatment_last_edit_by: string | null;
          er_treatment_last_edit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ward_name: string;
          room_number: string;
          name: string;
          age: number | null;
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
          admission_date?: string | null;
          last_activity_at?: string | null;
          mother_name?: string | null;
          medical_record_number?: string | null;
          psychological_diagnosis?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ward_name?: string;
          room_number?: string;
          name?: string;
          age?: number | null;
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
          admission_date?: string | null;
          last_activity_at?: string | null;
          mother_name?: string | null;
          medical_record_number?: string | null;
          psychological_diagnosis?: string | null;
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
          doctor_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'id' | 'visit_date' | 'created_at' | 'updated_at'> & { visit_date?: string; created_at?: string; updated_at?: string };
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
          alp: number | null;
          tsb: number | null;
          hba1c: number | null;
          rbs: number | null;
          ldl: number | null;
          hdl: number | null;
          tg: number | null;
          esr: number | null;
          crp: number | null;
          is_er: boolean;
          is_critical: boolean;
          doctor_id?: string | null;
          doctor_name?: string | null;
          lab_tech_id?: string | null;
          lab_tech_name?: string | null;
          other_labs?: any[] | null;
          plt?: number | null;
        };
        Insert: Omit<Database['public']['Tables']['investigations']['Row'], 'id' | 'date'> & { date?: string };
        Update: Partial<Database['public']['Tables']['investigations']['Insert']>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          ward_name: string;
          doctor_name: string | null;
          lab_tech_name: string | null;
          pharmacist_name: string | null;
          nurse_name: string | null;
          role: 'admin' | 'doctor' | 'pharmacist' | 'lab_tech' | 'nurse';
          specialty: string;
          gender: 'Male' | 'Female' | null;
          ai_enabled: boolean;
          offline_mode_enabled: boolean;
          is_admin: boolean;
          can_see_ward_patients: boolean;
          accessible_wards: string[];
          is_name_fixed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at' | 'specialty' | 'doctor_name' | 'lab_tech_name' | 'pharmacist_name' | 'nurse_name' | 'gender' | 'ai_enabled' | 'offline_mode_enabled' | 'is_admin' | 'can_see_ward_patients' | 'accessible_wards' | 'is_name_fixed'> & { specialty?: string; doctor_name?: string; lab_tech_name?: string; pharmacist_name?: string; nurse_name?: string; gender?: 'Male' | 'Female' | null; ai_enabled?: boolean; offline_mode_enabled?: boolean; is_admin?: boolean; can_see_ward_patients?: boolean; accessible_wards?: string[]; is_name_fixed?: boolean };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      ward_settings: {
        Row: {
          ward_name: string;
          gender: 'Male' | 'Female' | null;
          created_at: string;
        };
        Insert: {
          ward_name: string;
          gender?: 'Male' | 'Female' | null;
          created_at?: string;
        };
        Update: {
          ward_name?: string;
          gender?: 'Male' | 'Female' | null;
          created_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: number;
          global_offline_enabled: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>;
      };
      reminders: {
        Row: {
          id: string;
          patient_id: string;
          created_by: string;
          content: string;
          priority: string;
          due_date: string | null;
          is_resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
      };
      referrals: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          destination: string | null;
          department: string | null;
          companion_name: string | null;
          indications: string | null;
          chief_complaint: string | null;
          history_of_present_illness: string | null;
          relevant_examination: string | null;
          treatment_taken: string | null;
          investigations_text: string | null;
          vitals_snapshot: any | null;
          chronic_hx_snapshot: any | null;
          investigations_snapshot: any | null;
          er_treatment_snapshot: any | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['referrals']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>;
      };
      pharmacy_inventory: {
        Row: {
          id: string;
          scientific_name: string;
          generic_name: string | null;
          dosage: string | null;
          formulation: string | null;
          mode_of_administration: string | null;
          expiration_date: string | null;
          quantity: number;
          min_stock_level: number;
          batch_number: string | null;
          manufacturer: string | null;
          price: number | null;
          gudea_id: string | null;
          department: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pharmacy_inventory']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['pharmacy_inventory']['Insert']>;
      };
      nurse_instructions: {
        Row: {
          id: string;
          patient_id: string;
          ward_name: string;
          instruction: string;
          instruction_type: 'single' | 'repetitive';
          duration_days: number | null;
          expires_at: string | null;
          doctor_id: string | null;
          doctor_name: string | null;
          is_read: boolean;
          read_at: string | null;
          read_by_nurse_name: string | null;
          read_by_nurse_id: string | null;
          acknowledgments: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['nurse_instructions']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_read' | 'acknowledgments'> & { id?: string; is_read?: boolean; acknowledgments?: any[]; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['nurse_instructions']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string | null;
          investigation_id: string | null;
          message: string;
          is_read: boolean;
          read_at: string | null;
          read_by_doctor_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'is_read'> & { id?: string; is_read?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
}

export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type Referral = Database['public']['Tables']['referrals']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type Investigation = Database['public']['Tables']['investigations']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
export type NurseInstruction = Database['public']['Tables']['nurse_instructions']['Row'];
export type AppNotification = Database['public']['Tables']['notifications']['Row'];
export type CRUDOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
