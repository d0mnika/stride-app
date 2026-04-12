import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Server-side client. Creates a new instance per call — never cache this across requests.
// Used in API route handlers and Server Components.
// Note: When auth is added, upgrade to @supabase/ssr for proper cookie-based session handling.
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
