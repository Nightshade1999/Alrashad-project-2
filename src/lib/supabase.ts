import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

let supabase: any = null;

export const createClient = () => {
  if (supabase) return supabase;
  
  supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabase;
}
