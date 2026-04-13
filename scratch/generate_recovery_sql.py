import json
import csv
import os

# Files
JSON_BACKUP = 'AlRashad_Backup_2026-04-10 (1).json'
CSV_BACKUP = 'Alrashad_Research_Export_2026-04-11.csv'
OUTPUT_SQL = 'supabase/migrations/20260413_FINAL_PRECISION_RECOVERY_V2.sql'

def load_data():
    recovery_map = {} # (name, mrn) -> ward

    # 1. Load JSON (Older - April 10)
    if os.path.exists(JSON_BACKUP):
        with open(JSON_BACKUP, encoding='utf-8') as f:
            data = json.load(f)
            patients = data.get('patients', [])
            for p in patients:
                name = p.get('name', '').strip()
                mrn = p.get('medical_record_number', '').strip()
                ward = p.get('ward_name', '').strip()
                
                if name and ward and ward != 'Master Ward':
                    recovery_map[(name, mrn)] = ward
        print(f"Loaded {len(recovery_map)} unique patients from JSON.")

    # 2. Load CSV (Newer - April 11) - Overwrites JSON if same patient found
    if os.path.exists(CSV_BACKUP):
        csv_count = 0
        with open(CSV_BACKUP, encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Headers from CSV: Patient Name,Mother's Name,MRN,Age,Gender,Ward...
                name = row.get('Patient Name', '').strip()
                mrn = row.get('MRN', '').strip()
                ward = row.get('Ward', '').strip()

                if name and ward and ward != 'Master Ward':
                    recovery_map[(name, mrn)] = ward
                    csv_count += 1
        print(f"Processed CSV. Final merged recovery map has {len(recovery_map)} patients.")

    return recovery_map

def generate_sql(recovery_map):
    sql_lines = []
    sql_lines.append("-- FINAL PRECISION RECOVERY V2")
    sql_lines.append("-- Merged from April 10 (JSON) and April 11 (CSV)")
    sql_lines.append("")
    sql_lines.append("CREATE TEMP TABLE tmp_patients_recovery (")
    sql_lines.append("    name TEXT,")
    sql_lines.append("    mrn TEXT,")
    sql_lines.append("    orig_ward TEXT")
    sql_lines.append(");")
    sql_lines.append("")
    sql_lines.append("INSERT INTO tmp_patients_recovery (name, mrn, orig_ward) VALUES")
    
    entries = []
    for (name, mrn), ward in recovery_map.items():
        # Escape single quotes for SQL
        safe_name = name.replace("'", "''")
        safe_mrn = mrn.replace("'", "''")
        safe_ward = ward.replace("'", "''")
        entries.append(f"('{safe_name}', '{safe_mrn}', '{safe_ward}')")

    sql_lines.append(",\n".join(entries) + ";")
    sql_lines.append("")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append("    v_user_id UUID;")
    sql_lines.append("BEGIN")
    sql_lines.append("    -- Look for the clinical account (case-insensitive)")
    sql_lines.append("    SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE 'ahmed.safaa@alrashad.com';")
    sql_lines.append("")
    sql_lines.append("    IF v_user_id IS NULL THEN")
    sql_lines.append("        RAISE NOTICE 'User ahmed.safaa@alrashad.com not found. Check email.';")
    sql_lines.append("        RETURN;")
    sql_lines.append("    END IF;")
    sql_lines.append("")
    sql_lines.append("    -- 1. Match by BOTH Name and MRN")
    sql_lines.append("    UPDATE public.patients p")
    sql_lines.append("    SET ward_name = r.orig_ward, updated_at = NOW()")
    sql_lines.append("    FROM tmp_patients_recovery r")
    sql_lines.append("    WHERE p.user_id = v_user_id")
    sql_lines.append("    AND (p.ward_name ILIKE '%Master%' OR p.ward_name = 'Al Ameri')")
    sql_lines.append("    AND (TRIM(p.name) = TRIM(r.name) OR p.name ILIKE TRIM(r.name))")
    sql_lines.append("    AND (TRIM(p.medical_record_number) = TRIM(r.mrn) OR p.medical_record_number ILIKE TRIM(r.mrn));")
    sql_lines.append("")
    sql_lines.append("    -- 2. Fallback: Match by Name only (if MRN differs slightly)")
    sql_lines.append("    UPDATE public.patients p")
    sql_lines.append("    SET ward_name = r.orig_ward, updated_at = NOW()")
    sql_lines.append("    FROM tmp_patients_recovery r")
    sql_lines.append("    WHERE p.user_id = v_user_id")
    sql_lines.append("    AND (p.ward_name ILIKE '%Master%' OR p.ward_name = 'Al Ameri')")
    sql_lines.append("    AND (TRIM(p.name) = TRIM(r.name) OR p.name ILIKE TRIM(r.name));")
    sql_lines.append("")
    sql_lines.append("    -- 3. Final cleanup: If still in Master/Al Ameri and not found in either backup, keep in Al Ameri")
    sql_lines.append("    -- (This step is implicit as we already moved leftovers to Al Ameri in V1)")
    sql_lines.append("")
    sql_lines.append("END $$;")
    sql_lines.append("")
    sql_lines.append("DROP TABLE tmp_patients_recovery;")

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_lines))

if __name__ == '__main__':
    data_map = load_data()
    generate_sql(data_map)
    print(f"SQL script generated: {OUTPUT_SQL}")
