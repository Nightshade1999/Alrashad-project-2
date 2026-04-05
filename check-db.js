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
  
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("DB Row:", data[0]);
  }
}

check();
