import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service-role client for server-side operations that bypass RLS (e.g. webhook handlers).
// Never expose this to the browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
