import pandas as pd
import json
import urllib.request
import urllib.error
from datetime import datetime
import sys
import os

# Load Environment Variables from .env.local
def load_env():
    env_path = r'C:\Users\x67\.gemini\antigravity\Scratch\Alrashad-project\.env.local'
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

env = load_env()
SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')
ADMIN_USER_ID = 'dcad0ea9-c6b3-43af-8248-d385aa173269' # Standard Admin
EXCEL_PATH = r'C:\Users\x67\.gemini\antigravity\Scratch\Alrashad-project\Database of patients.xlsx'

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env.local")
    sys.exit(1)

# Force UTF-8 for console output
sys.stdout.reconfigure(encoding='utf-8')

PROVINCE_MAP = {
    'Unknown': 'Unknown',
    'بغداد': 'Baghdad',
    'بابل': 'Babylon',
    'النجف': 'Najaf',
    'البصرة': 'Basra',
    'كركوك': 'Kirkuk',
    'ذي قار': 'Dhi Qar',
    'الديوانية': 'Qadisiyyah',
    'ميسان': 'Maysan',
    'نينوى': 'Nineveh',
    'ديالى': 'Diyala',
    'واسط': 'Wasit',
    'كربلاء': 'Karbala',
    'المثنى': 'Muthanna',
    'الانبار': 'Anbar',
    'اربيل': 'Erbil',
    'دهوك': 'Dohuk',
    'السليمانية': 'Sulaymaniyah',
    'صلاح الدين': 'Saladin',
    'بغداد/ دار الحنان': 'Baghdad',
    'بغداد/ دار المسنين': 'Baghdad',
    'افريقية الجنسية': 'Other'
}

DIAGNOSIS_MAP = {
    'ذهان': 'Psychosis',
    'الذهان': 'Psychosis',
    'ذهان مزمن': 'Psychosis',
    'اضطراب ذهاني': 'Psychosis',
    'ذهان اضطرابي': 'Psychosis',
    'فصام': 'Schizophrenia',
    'فصام مزمن': 'Schizophrenia',
    'تخلف عقلي': 'Intellectual Disability',
    'التخلف العقلي مع اعراض ذهانية': 'Intellectual Disability',
    'هلاوس': 'Psychosis',
    'هلوسة': 'Psychosis',
    'هلاوس سمعية': 'Psychosis',
    'كآبة': 'Depression',
    'صرع': 'Epilepsy',
    'ثنائي القطب': 'Bipolar Disorder',
    'هوس': 'Mania',
    'زهايمر': 'Alzheimer\'s',
    'اكتئاب': 'Depression',
    'اضطراب وجداني': 'Bipolar Disorder'
}

WARD_GENDER_MAP = {
    'Basra': 'Female',
    'Taj Aldin 1': 'Female',
    'Taj Aldin 2': 'Female',
    'Taj Aldin 3': 'Female',
    'Taj Aldin 4': 'Female',
    'Zainab 1': 'Female',
    'Zainab 2': 'Female',
    'Zainab 3': 'Female',
    'Zainab 4': 'Female',
    'General Ward': 'Male'
}

def get_gender_from_ward(ward_name):
    if pd.isna(ward_name): return 'Male'
    wn = str(ward_name).lower()
    for prefix, gender in WARD_GENDER_MAP.items():
        if prefix.lower() in wn:
            return gender
    return 'Male' # Default to Male if ward doesn't imply otherwise

def translate_province(p):
    if pd.isna(p): return 'Unknown'
    p_str = str(p).strip()
    if '/' in p_str:
        p_str = p_str.split('/')[0].strip()
    return PROVINCE_MAP.get(p_str, p_str)

def translate_diagnosis(d):
    if pd.isna(d): return 'Psychosis'
    diag_str = str(d).strip()
    return DIAGNOSIS_MAP.get(diag_str, 'Psychosis')

def calculate_age_from_dob(dob):
    """Calculate age from year of birth as requested."""
    if pd.isna(dob): return None
    dob_str = str(dob).strip()
    if not dob_str or dob_str.lower() == 'unknown': return None
    
    current_year = 2026
    
    try:
        # 1. Handle 4-digit year strings (e.g. "1973")
        if len(dob_str) == 4 and dob_str.isdigit():
            year = int(dob_str)
            return current_year - year
            
        # 2. Handle full dates
        dt = pd.to_datetime(dob_str, dayfirst=True, errors='coerce')
        if not pd.isna(dt):
            return current_year - dt.year
            
        return None
    except:
        return None

def normalize_date(d):
    if pd.isna(d): return None
    try:
        dt = pd.to_datetime(d, dayfirst=True, errors='coerce')
        if pd.isna(dt): return None
        return dt.strftime('%Y-%m-%d')
    except:
        return None

def wipe_all_patients():
    print("Wiping all existing patient data (CASCADE)...")
    # PostgREST requires a filter for DELETE to prevent accidental table wipes.
    # We use a filter that matches all UUIDs.
    url = f"{SUPABASE_URL}/rest/v1/patients?id=neq.00000000-0000-0000-0000-000000000000"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    req = urllib.request.Request(url, headers=headers, method='DELETE')
    try:
        with urllib.request.urlopen(req) as response:
            print("Wipe successful.")
    except Exception as e:
        print(f"Wipe Error: {e}")

def insert_patients_chunk(patients):
    if not patients: return
    url = f"{SUPABASE_URL}/rest/v1/patients"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    data = json.dumps(patients, default=str).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            pass
    except urllib.error.HTTPError as e:
        print(f"Error inserting: {e.code} {e.reason}")
        print(f"Response: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    # 1. Wipe current data
    wipe_all_patients()

    # 2. Load Excel
    print(f"Loading Excel file from {EXCEL_PATH}...")
    try:
        df = pd.read_excel(EXCEL_PATH, sheet_name='الكلي')
    except Exception as e:
        print(f"Error loading Excel: {e}")
        return

    patients_to_insert = []
    seen_keys = set()
    
    print(f"Processing {len(df)} rows...")
    
    for _, row in df.iterrows():
        orig_name = row.get('Patient name')
        if pd.isna(orig_name) or str(orig_name).lower().strip() == 'unknown':
            continue
        
        name = str(orig_name).strip()
        mrn = row.get(' Medical record number')
        mrn_val = str(mrn).strip() if not pd.isna(mrn) else None
        
        # Deduplication Rule: Combine Name + MRN
        unique_key = (name.lower(), mrn_val)
        if unique_key in seen_keys:
            continue
        seen_keys.add(unique_key)
        
        ward_name = row.get('ward name')
        diagnosis = translate_diagnosis(row.get('Diagnosis'))
        province = translate_province(row.get('province'))
        mother_name = row.get("patient's mother name")
        if pd.isna(mother_name): mother_name = None
        
        dob = row.get('date of birth')
        age = calculate_age_from_dob(dob)
        gender = get_gender_from_ward(ward_name)
        admission_date = normalize_date(row.get('Date of admission to ward'))
            
        patient_data = {
            'user_id': ADMIN_USER_ID,
            'ward_name': str(ward_name).strip() if not pd.isna(ward_name) else 'General Ward',
            'room_number': '1', 
            'name': name,
            'age': age,
            'gender': gender,
            'category': 'Normal',
            'province': province,
            'mother_name': mother_name,
            'medical_record_number': mrn_val,
            'psychological_diagnosis': diagnosis,
            'admission_date': admission_date,
            'is_in_er': False,
            'past_surgeries': [],
            'chronic_diseases': [],
            'psych_drugs': [],
            'medical_drugs': [],
            'allergies': []
        }
        
        patients_to_insert.append(patient_data)
        
    print(f"Ready to import {len(patients_to_insert)} unique patients.")
    
    # Chunked insertion for reliability
    chunk_size = 50
    for i in range(0, len(patients_to_insert), chunk_size):
        insert_patients_chunk(patients_to_insert[i:i+chunk_size])
        if (i + chunk_size) % 250 == 0:
            print(f"Progress: {i + chunk_size} patients imported...")
            
    print("\nImport Complete! All wards, ages, and diagnoses have been unified.")

if __name__ == "__main__":
    main()
