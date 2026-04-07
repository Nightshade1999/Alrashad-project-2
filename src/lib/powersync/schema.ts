import { Schema, Table, Column, ColumnType } from '@powersync/web';

export const AppSchema = new Schema([
  new Table({
    name: 'patients',
    columns: [
      new Column({ name: 'name', type: ColumnType.Text }),
      new Column({ name: 'ward_number', type: ColumnType.Text }),
      new Column({ name: 'age', type: ColumnType.Integer }),
      new Column({ name: 'gender', type: ColumnType.Text }),
      new Column({ name: 'category', type: ColumnType.Text }),
      new Column({ name: 'past_surgeries', type: ColumnType.Text }),
      new Column({ name: 'chronic_diseases', type: ColumnType.Text }),
      new Column({ name: 'psych_drugs', type: ColumnType.Text }),
      new Column({ name: 'medical_drugs', type: ColumnType.Text }),
      new Column({ name: 'allergies', type: ColumnType.Text }),
      new Column({ name: 'er_admission_date', type: ColumnType.Text }), // Timestamps as Text in SQLite
      new Column({ name: 'er_admission_doctor', type: ColumnType.Text }),
      new Column({ name: 'er_chief_complaint', type: ColumnType.Text }),
      new Column({ name: 'er_treatment', type: ColumnType.Text }), // JSON as Text
      new Column({ name: 'created_at', type: ColumnType.Text }),
      new Column({ name: 'updated_at', type: ColumnType.Text }),
    ]
  }),
  new Table({
    name: 'visits',
    columns: [
      new Column({ name: 'patient_id', type: ColumnType.Text }),
      new Column({ name: 'doctor_id', type: ColumnType.Text }),
      new Column({ name: 'visit_date', type: ColumnType.Text }),
      new Column({ name: 'exam_notes', type: ColumnType.Text }),
    ]
  }),
  new Table({
    name: 'investigations',
    columns: [
      new Column({ name: 'visit_id', type: ColumnType.Text }),
      new Column({ name: 'patient_id', type: ColumnType.Text }),
      new Column({ name: 'date', type: ColumnType.Text }),
      new Column({ name: 'wbc', type: ColumnType.Real }),
      new Column({ name: 'hb', type: ColumnType.Real }),
      new Column({ name: 's_urea', type: ColumnType.Real }),
      new Column({ name: 's_creatinine', type: ColumnType.Real }),
      new Column({ name: 'ast', type: ColumnType.Real }),
      new Column({ name: 'alt', type: ColumnType.Real }),
      new Column({ name: 'tsb', type: ColumnType.Real }),
      new Column({ name: 'hba1c', type: ColumnType.Real }),
      new Column({ name: 'rbs', type: ColumnType.Real }),
      new Column({ name: 'doctor_name', type: ColumnType.Text }),
    ]
  }),
  new Table({
    name: 'user_profiles',
    columns: [
      new Column({ name: 'user_id', type: ColumnType.Text }),
      new Column({ name: 'ward_name', type: ColumnType.Text }),
      new Column({ name: 'offline_mode_enabled', type: ColumnType.Integer }), // 0 or 1
      new Column({ name: 'is_admin', type: ColumnType.Integer }),
      new Column({ name: 'created_at', type: ColumnType.Text }),
      new Column({ name: 'updated_at', type: ColumnType.Text }),
    ]
  }),
  new Table({
    name: 'system_settings',
    columns: [
      new Column({ name: 'global_offline_enabled', type: ColumnType.Integer }),
      new Column({ name: 'updated_at', type: ColumnType.Text }),
    ]
  })
]);

export type Patient = {
  id: string;
  name: string;
  ward_number: string;
  age: number;
  gender: string;
  category: string;
  past_surgeries?: string;
  chronic_diseases?: string;
  psych_drugs?: string;
  medical_drugs?: string;
  allergies?: string;
  er_admission_date?: string;
  er_admission_doctor?: string;
  er_chief_complaint?: string;
  er_treatment?: string;
  created_at: string;
  updated_at: string;
};
