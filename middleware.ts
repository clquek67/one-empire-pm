import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// API routes that must remain public — called by external services with no session cookie
const PUBLIC_API_ROUTES = [
  '/api/auth/callback',     // Supabase auth redirect
  '/api/webhooks/stripe',   // Stripe webhook (signature-verified internally)
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'one_empire_pm' },
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public page routes — no auth required
  if (
    pathname === '/login' ||
    pathname === '/reset-password' ||
    pathname === '/pricing' ||
    pathname === '/roadmap' ||
    pathname === '/producthunt' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname.startsWith('/invite')
  ) {
    return supabaseResponse
  }

  // API routes — only whitelisted paths bypass auth; all others pass through to route-level auth
  // Route-level auth is the primary enforcement; this is defence-in-depth
  if (pathname.startsWith('/api')) {
    const isPublicApi = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
    if (isPublicApi) return supabaseResponse

    // For all other API routes: if no session at all, reject at middleware
    // (Each route also independently verifies auth — this is an extra layer)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return supabaseResponse
  }

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'owner'

  // Team members → always route to team dashboard, no subscription check needed
  if (role === 'team_member') {
    if (!pathname.startsWith('/team-dashboard')) {
      return NextResponse.redirect(new URL('/team-dashboard', request.url))
    }
    return supabaseResponse
  }

  // Clients → always route to client dashboard, no subscription check needed
  if (role === 'client') {
    if (!pathname.startsWith('/client-dashboard')) {
      return NextResponse.redirect(new URL('/client-dashboard', request.url))
    }
    return supabaseResponse
  }

  // Owners → check subscription for dashboard access
  if (pathname.startsWith('/dashboard')) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.redirect(new URL('/pricing', request.url))
    }
  }

  // Prevent owners from accessing team/client dashboards
  if (pathname.startsWith('/team-dashboard') || pathname.startsWith('/client-dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin routes — restrict to admin emails only
  if (pathname.startsWith('/admin')) {
    const ADMIN_EMAILS = ['clquek@gmail.com']
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
