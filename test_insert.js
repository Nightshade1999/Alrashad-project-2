require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRestore() {
  const data = JSON.parse(fs.readFileSync('./AlRashad_Backup_2026-04-14.json', 'utf8'));
  
  // Test user_profiles
  if (data.user_profiles && data.user_profiles.length > 0) {
    console.log('Testing user_profiles insert...');
    const { error } = await supabase.from('user_profiles').upsert(data.user_profiles.slice(0, 5));
    if (error) console.log('user_profiles Error:', error);
    else console.log('user_profiles Success');
  }

  // Test patients
  if (data.patients && data.patients.length > 0) {
    console.log('Testing patients insert...');
    const chunk = data.patients.slice(0, 5);
    chunk.forEach(row => {
      delete row.high_risk_date;
      delete row.user_id; // Added this to the test
    });
    const { error } = await supabase.from('patients').upsert(chunk);
    if (error) console.log('patients Error:', error);
    else console.log('patients Success');
  }
}

testRestore();
