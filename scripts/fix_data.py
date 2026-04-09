import urllib.request
import json

# Configuration
SUPABASE_URL = 'https://vfbakmwhjqvadoyrgson.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYmFrbXdoanF2YWRveXJnc29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA1MTE1NiwiZXhwIjoyMDkwNjI3MTU2fQ.4SykXbCqJ7OFrM10cJRiZBF3s-89GOZ3x5fk0WSZ-Gw'

# Comprehensive Ward-Gender Mapping
# Wards that are Female (based on known female names/wards in Al-Rashad)
FEMALE_WARDS = ['taj aldin', 'zainab', 'basra']

def get_gender(ward_name):
    if not ward_name: return 'Unknown'
    wn = str(ward_name).lower()
    for f in FEMALE_WARDS:
        if f in wn:
            return 'Female'
    return 'Male' # Assuming others are male given the context of the hospital structure

def fix_patients():
    print("Fetching patients with pagination...")
    url = f"{SUPABASE_URL}/rest/v1/patients?select=id,ward_name,gender"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    patients = []
    page_size = 1000
    start = 0
    
    while True:
        url_paginated = f"{url}&offset={start}"
        # We use Range header for pagination in PostgREST
        headers['Range'] = f"{start}-{start + page_size - 1}"
        req = urllib.request.Request(url_paginated, headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                batch = json.loads(response.read().decode())
                if not batch: break
                patients.extend(batch)
                start += len(batch)
                if len(batch) < page_size: break
        except Exception as e:
            print(f"Fetch batch failed: {e}")
            break

    print(f"Loaded {len(patients)} patients total.")
    updated_count = 0

    for p in patients:
        new_gender = get_gender(p['ward_name'])
        if p.get('gender') != new_gender or p.get('gender') == 'Unknown':
            # Update patient
            update_url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{p['id']}"
            update_data = json.dumps({'gender': new_gender}).encode('utf-8')
            # Remove Range header for PATCH
            if 'Range' in headers: del headers['Range']
            update_req = urllib.request.Request(update_url, data=update_data, headers=headers, method='PATCH')
            try:
                with urllib.request.urlopen(update_req) as res:
                    updated_count += 1
                    if updated_count % 50 == 0:
                        print(f"Updated {updated_count} patients...")
            except Exception as e:
                print(f"Error updating {p['id']}: {e}")

    print(f"Finished. Total updated: {updated_count}")

if __name__ == "__main__":
    fix_patients()
