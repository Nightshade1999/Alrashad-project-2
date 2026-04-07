import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient<Database> | null = null;

export const createClient = () => {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabaseInstance;
}
