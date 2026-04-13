const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Adding "rr" column to "visits" table...');
  
  // Using SQL via the RPC or a raw query if enabled (unlikely)
  // However, I can try to run it via a manual script if I have service role keys,
  // but usually I only have anon keys.
  
  // Let's try to check if the column exists first.
  const { error } = await supabase.from('visits').select('rr').limit(1);
  
  if (error && error.message.includes('column "rr" does not exist')) {
    console.log('Column "rr" missing. Please run the SQL in your Supabase dashboard:');
    console.log('ALTER TABLE public.visits ADD COLUMN rr INTEGER;');
  } else if (error) {
    console.error('Error checking column:', error);
  } else {
    console.log('Column "rr" already exists.');
  }
}

migrate();
