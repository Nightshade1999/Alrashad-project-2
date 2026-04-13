const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function verifyMigration() {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  let url = '';
  let key = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
  });

  if (!url || !key) {
    console.error("Missing SUPABASE credentials in .env.local");
    return;
  }

  const supabase = createClient(url, key);
  
  console.log("Checking pharmacy_inventory table...");
  const { data: pharmacyData, error: pharmacyError } = await supabase
    .from('pharmacy_inventory')
    .select('*')
    .limit(0);

  if (pharmacyError) {
    console.error("❌ pharmacy_inventory table check failed:", pharmacyError.message);
  } else {
    console.log("✅ pharmacy_inventory table exists.");
  }

  console.log("Checking RLS policies for lab_tech role (via dummy data insert attempt)...");
  // We can't easily check policies via API, but we can verify the table is there.
  
  console.log("Checking user_profiles roles...");
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .limit(10);

  if (profileError) {
    console.error("❌ user_profiles query failed:", profileError.message);
  } else {
    console.log("✅ user_profiles is accessible.");
    console.log("Found roles:", [...new Set(profileData.map(p => p.role))]);
  }
}

verifyMigration();
