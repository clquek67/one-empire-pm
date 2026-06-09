import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  // Public routes
  if (
    pathname === '/login' ||
    pathname === '/pricing' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/client')
  ) {
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
    if (!pathname.startsWith('/team-dashboard') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/team-dashboard', request.url))
    }
    return supabaseResponse
  }

  // Clients → always route to client dashboard, no subscription check needed
  if (role === 'client') {
    if (!pathname.startsWith('/client-dashboard') && !pathname.startsWith('/api')) {
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

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
