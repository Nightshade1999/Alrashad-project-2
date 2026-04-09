import pandas as pd
import json
import urllib.request
import urllib.error
from datetime import datetime
import sys

# Configuration
EXCEL_PATH = r'C:\Users\x67\.gemini\antigravity\Scratch\Alrashad-project\Database of patients.xlsx'
SUPABASE_URL = 'https://vfbakmwhjqvadoyrgson.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYmFrbXdoanF2YWRveXJnc29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA1MTE1NiwiZXhwIjoyMDkwNjI3MTU2fQ.4SykXbCqJ7OFrM10cJRiZBF3s-89GOZ3x5fk0WSZ-Gw'
ADMIN_USER_ID = 'dcad0ea9-c6b3-43af-8248-d385aa173269'

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
    '`ذهان': 'Psychosis'
}

WARD_GENDER_MAP = {
    'Basra': 'Female',
    'Taj Aldin 1': 'Female',
    'Taj Aldin 2': 'Female',
    'Taj Aldin 3': 'Female',
    'Taj Aldin 4': 'Female',
    'General Ward': 'Male' # Default
}

def get_gender_from_ward(ward_name):
    if pd.isna(ward_name): return 'Unknown'
    wn = str(ward_name).lower()
    for prefix, gender in WARD_GENDER_MAP.items():
        if prefix.lower() in wn:
            return gender
    return 'Unknown'

def translate_province(p):
    if pd.isna(p): return 'Unknown'
    p_str = str(p).strip()
    if '/' in p_str:
        p_str = p_str.split('/')[0].strip()
    return PROVINCE_MAP.get(p_str, p_str)

def translate_diagnosis(d):
    if pd.isna(d): return 'Psychosis'
    diag_str = str(d).strip()
    return DIAGNOSIS_MAP.get(diag_str, 'Psychosis') # Unify to English Psychosis category

def calculate_age(dob):
    if pd.isna(dob): return None
    dob_str = str(dob).strip()
    if not dob_str or dob_str.lower() == 'unknown': return None
    
    try:
        # 1. Handle 4-digit year strings (e.g. "1973")
        if len(dob_str) == 4 and dob_str.isdigit():
            year = int(dob_str)
            current_year = 2026
            age = current_year - year
            return int(age) if age >= 0 else None
            
        # 2. Handle full dates
        dt = pd.to_datetime(dob_str, dayfirst=True, errors='coerce')
        if not pd.isna(dt):
            current_year = 2026
            age = current_year - dt.year - ((4, 10) < (dt.month, dt.day)) # Today is April 10, 2026
            return int(age) if age >= 0 else None
            
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

def fetch_existing_patients():
    print("Fetching existing patients from database (Limit 5000)...")
    # Increase limit to avoid missing records for duplicate detection
    url = f"{SUPABASE_URL}/rest/v1/patients?select=name,medical_record_number&limit=5000"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Fetch Error: {e}")
        return []

def insert_patients(patients):
    if not patients: return
    url = f"{SUPABASE_URL}/rest/v1/patients"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
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
    print(f"Loading Excel file: {EXCEL_PATH}...")
    # Explicitly read the 'الكلي' sheet which has 1323 rows
    df = pd.read_excel(EXCEL_PATH, sheet_name='الكلي')
    
    existing = fetch_existing_patients()
    existing_keys = set((str(p['name']).strip(), str(p['medical_record_number']).strip() if p['medical_record_number'] else 'None') for p in existing)
    
    patients_to_insert = []
    skipped_duplicates = []
    
    for _, row in df.iterrows():
        orig_name = row.get('Patient name')
        if pd.isna(orig_name) or str(orig_name).lower().strip() == 'unknown':
            continue
        
        name = str(orig_name).strip()
        
        mrn = row.get(' Medical record number')
        if pd.isna(mrn): 
            mrn_str = 'None'
            mrn_val = None
        else: 
            mrn_val = str(mrn).strip()
            mrn_str = mrn_val
        
        # Check for duplicates rigorously
        if (name, mrn_str) in existing_keys:
            skipped_duplicates.append(name)
            continue
        
        ward_name = row.get('ward name')
        diagnosis = translate_diagnosis(row.get('Diagnosis'))
        province = translate_province(row.get('province'))
        mother_name = row.get("patient's mother name")
        if pd.isna(mother_name): mother_name = None
        
        dob = row.get('date of birth')
        age = calculate_age(dob)
        gender = get_gender_from_ward(ward_name)
        admission_date = normalize_date(row.get('Date of admission to ward'))
            
        patient_data = {
            'user_id': ADMIN_USER_ID,
            'ward_name': str(ward_name) if not pd.isna(ward_name) else 'General Ward',
            'room_number': '1', 
            'name': name,
            'age': age, # Will be None/Null if calculate_age returns None
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
        # Add to existing keys to prevent duplicates WITHIN the Excel file too
        existing_keys.add((name, mrn_str))
        
    print(f"Total Rows in Excel Sheet: {len(df)}")
    print(f"Valid Patients extracted: {len(patients_to_insert) + len(skipped_duplicates)}")
    print(f"To be imported: {len(patients_to_insert)}")
    print(f"Skipped as duplicates: {len(skipped_duplicates)}")
    
    chunk_size = 50
    for i in range(0, len(patients_to_insert), chunk_size):
        insert_patients(patients_to_insert[i:i+chunk_size])
        
    print("\nImport Complete!")

if __name__ == "__main__":
    main()
