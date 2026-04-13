import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // getSession() is intentional here — getUser() would add a round-trip to
  // the Supabase Auth server on every request, which is too expensive for a
  // proxy. We only use the session to decide redirects, not to trust user data.
  // Server components use getUser() for any sensitive operations.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Unauthenticated user trying to access a protected route → send to login
  if (!session && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting login/signup → send to dashboard
  if (session && isPublicRoute) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public folder files (SVGs, images, etc.)
     * - auth/callback (must be reachable without a session)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback).*)',
  ],
}
