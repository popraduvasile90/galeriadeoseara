import { createClient } from '@supabase/supabase-js'

export const isSupabaseAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
)

const supabaseUrl = isSupabaseAdminConfigured
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : 'https://placeholder.supabase.co'

const supabaseServiceKey = isSupabaseAdminConfigured
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : 'placeholder'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)


