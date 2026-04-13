import json
import csv
import os

# Files
JSON_BACKUP = 'AlRashad_Backup_2026-04-10 (1).json'
CSV_BACKUP = 'Alrashad_Research_Export_2026-04-11.csv'
OUTPUT_SQL = 'supabase/migrations/20260413_FINAL_MRN_RESCUE.sql'

def load_data():
    recovery_map = {} # MRN -> ward

    # 1. Load JSON (Older - April 10)
    if os.path.exists(JSON_BACKUP):
        with open(JSON_BACKUP, encoding='utf-8') as f:
            data = json.load(f)
            patients = data.get('patients', [])
            for p in patients:
                mrn = p.get('medical_record_number', '').strip()
                ward = p.get('ward_name', '').strip()
                if mrn and ward and ward != 'Master Ward':
                    recovery_map[mrn] = ward

    # 2. Load CSV (Newer - April 11) - Overwrites JSON if same MRN found
    if os.path.exists(CSV_BACKUP):
        with open(CSV_BACKUP, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                mrn = row.get('MRN', '').strip()
                ward = row.get('Ward', '').strip()
                if mrn and ward and ward != 'Master Ward':
                    recovery_map[mrn] = ward

    return recovery_map

def generate_sql(recovery_map):
    sql_lines = []
    sql_lines.append("-- FINAL MRN-ONLY RESCUE")
    sql_lines.append("-- This script fixes patients by MRN only, regardless of owner.")
    sql_lines.append("")
    sql_lines.append("CREATE TEMP TABLE tmp_patients_mrn_rescue (")
    sql_lines.append("    mrn TEXT,")
    sql_lines.append("    orig_ward TEXT")
    sql_lines.append(");")
    sql_lines.append("")
    sql_lines.append("INSERT INTO tmp_patients_mrn_rescue (mrn, orig_ward) VALUES")
    
    entries = []
    for mrn, ward in recovery_map.items():
        safe_mrn = mrn.replace("'", "''")
        safe_ward = ward.replace("'", "''")
        entries.append(f"('{safe_mrn}', '{safe_ward}')")

    sql_lines.append(",\n".join(entries) + ";")
    sql_lines.append("")
    sql_lines.append("UPDATE public.patients p")
    sql_lines.append("SET ward_name = r.orig_ward, updated_at = NOW()")
    sql_lines.append("FROM tmp_patients_mrn_rescue r")
    sql_lines.append("WHERE (p.ward_name = 'Al Ameri' OR p.ward_name ILIKE '%Master%')")
    sql_lines.append("AND TRIM(p.medical_record_number) = TRIM(r.mrn);")
    sql_lines.append("")
    sql_lines.append("DROP TABLE tmp_patients_mrn_rescue;")

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))

if __name__ == '__main__':
    data_map = load_data()
    generate_sql(data_map)
    print(f"SQL script generated: {OUTPUT_SQL} with {len(data_map)} MRNs.")
