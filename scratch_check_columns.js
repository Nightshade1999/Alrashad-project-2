const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let url = '';
  let key = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
  });

  const supabase = createClient(url, key);
  
  console.log("Checking columns for 'user_profiles' table...");
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("user_profiles Row Keys:", data.length > 0 ? Object.keys(data[0]) : "No data");
  }

  console.log("\nChecking columns for 'patients' table (again to be sure)...");
  const { data: pData, error: pError } = await supabase.from('patients').select('*').limit(1);
  if (pError) {
    console.error("DB Error:", pError.message);
  } else {
    console.log("patients Row Keys:", pData.length > 0 ? Object.keys(pData[0]) : "No data");
  }
}

check();
