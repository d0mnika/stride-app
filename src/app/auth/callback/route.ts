import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Supabase Auth redirects here after email confirmation / magic-link sign-in.
// Exchanges the one-time code for a session cookie, then sends the user on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Code missing or exchange failed → back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
