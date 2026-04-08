const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log('--- Starting System Backup Export ---');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Supabase admin keys missing in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const backupDir = path.join(process.cwd(), 'system_backup');
  const dataDir = path.join(backupDir, 'database_records');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tables = ['patients', 'visits', 'investigations', 'user_profiles', 'ward_settings', 'reminders'];

  for (const table of tables) {
    console.log(`Exporting ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error exporting ${table}:`, error.message);
      continue;
    }
    fs.writeFileSync(
      path.join(dataDir, `${table}.json`),
      JSON.stringify(data, null, 2)
    );
  }

  console.log('--- Data Export Complete ---');
}

run();
