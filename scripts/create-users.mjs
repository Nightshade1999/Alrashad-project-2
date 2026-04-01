import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function createUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const users = [
    { email: 'ahmed@alrashad.com', password: 'Pandaxfox' },
    { email: 'zahraa@alrashad.com', password: 'Pandaxfox' }
  ]

  for (const u of users) {
    const { data, error } = await supabase.auth.signUp(u)
    if (error) {
      console.error(`Error creating ${u.email}:`, error.message)
    } else {
      console.log(`Successfully created/signed up ${u.email}`, data.user?.id)
    }
  }
}

createUsers()
