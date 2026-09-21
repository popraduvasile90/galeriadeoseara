import { createClient } from '@supabase/supabase-js'

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
)

const supabaseUrl = isSupabaseConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : 'https://placeholder.supabase.co'

const supabaseAnonKey = isSupabaseConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  : 'placeholder'

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)


