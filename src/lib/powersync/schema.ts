import { column, Schema, Table } from '@powersync/web';

const patients = new Table({
  user_id: column.text,
  ward_name: column.text,
  ward_number: column.text,
  name: column.text,
  room_number: column.text,
  age: column.integer,
  gender: column.text,
  category: column.text,
  province: column.text,
  education_level: column.text,
  relative_status: column.text,
  relative_visits: column.text,
  past_surgeries: column.text,
  chronic_diseases: column.text,
  psych_drugs: column.text,
  medical_drugs: column.text,
  allergies: column.text,
  is_in_er: column.integer,
  er_admission_date: column.text,
  er_admission_doctor: column.text,
  er_chief_complaint: column.text,
  er_admission_notes: column.text,
  er_treatment: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const visits = new Table({
  patient_id: column.text,
  doctor_id: column.text,
  visit_date: column.text,
  exam_notes: column.text,
  bp_sys: column.integer,
  bp_dia: column.integer,
  pr: column.integer,
  spo2: column.integer,
  temp: column.real,
  is_er: column.integer,
});

const investigations = new Table({
  visit_id: column.text,
  patient_id: column.text,
  date: column.text,
  wbc: column.real,
  hb: column.real,
  s_urea: column.real,
  s_creatinine: column.real,
  ast: column.real,
  alt: column.real,
  tsb: column.real,
  hba1c: column.real,
  rbs: column.real,
  ldl: column.real,
  hdl: column.real,
  tg: column.real,
  esr: column.real,
  crp: column.real,
  is_er: column.integer,
  doctor_id: column.text,
  doctor_name: column.text,
});

const user_profiles = new Table({
  user_id: column.text,
  ward_name: column.text,
  doctor_name: column.text,
  role: column.text,
  specialty: column.text,
  ai_enabled: column.integer,
  offline_mode_enabled: column.integer,
  is_admin: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const system_settings = new Table({
  global_offline_enabled: column.integer,
  see_all_patients: column.integer,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  patients,
  visits,
  investigations,
  user_profiles,
  system_settings
});
