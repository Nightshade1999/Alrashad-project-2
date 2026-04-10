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
  
  console.log("Checking available RPCs...");
  // Querying pg_proc via a select if allowed, or just guessing?
  // Actually, we can't query pg_proc via PostgREST unless exposed.
  // But we can try to call a standard one.
  
  // Try to find if 'exec_sql' exists (unlikely but possible)
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  if (error) {
    console.log("'exec_sql' RPC does not exist or failed:", error.message);
  } else {
    console.log("'exec_sql' RPC exists!");
  }
}

check();
