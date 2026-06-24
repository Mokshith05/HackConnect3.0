import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if we are running in mock/demo mode
export const isMockMode =
  !supabaseUrl ||
  supabaseUrl.includes('your-project') ||
  supabaseUrl.includes('your_supabase') ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('dummy') ||
  supabaseAnonKey.includes('your_supabase')

export const supabase = !isMockMode
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any)

if (isMockMode) {
  console.warn(
    "HackConnect is running in local demo/mock mode. All DB operations are simulated in Zustand stores and synced with LocalStorage."
  )
}
