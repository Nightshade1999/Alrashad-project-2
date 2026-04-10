import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Initialize Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Fetch User with CRITICAL SECURITY CATCH
  // Stale cookies from dev environment can throw "refresh_token_not_found".
  // Catching this prevents the entire server process from crashing.
  let user = null;
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('Proxy: Session retrieval error:', sessionError.message);
    }
    user = session?.user;

    // Log the detection for debugging sign-in refreshes
    if (user) {
      console.log(`Proxy: Session detected for ${user.email} on ${request.nextUrl.pathname}`);
    } else if (request.nextUrl.pathname.startsWith('/dashboard')) {
      console.log(`Proxy: NO session detected on protected path ${request.nextUrl.pathname}`);
    }
  } catch (error: any) {
    console.warn('Proxy: Auth check suppressed crash:', error?.message);
    return supabaseResponse;
  }

  // 3. Define Access Paths
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isProtected = isDashboard || isAdmin || request.nextUrl.pathname.startsWith('/patient')

  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/remote-log') ||
    request.nextUrl.pathname === '/manifest.webmanifest' ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/sw.js' ||
    request.nextUrl.pathname === '/workbox-*.js' ||
    request.nextUrl.pathname === '/offline.html';

  // 4. Handle Redirection
  if (!user && isProtected && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 5. Hardened Role Check - DEFERRED TO UI
  // We no longer perform DB-level role checks in Middleware (now Proxy) to prevent 35s tunnel heartbeats from timing out.
  // The UI (Dashboard/Admin) handles its own role-based gate.

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/remote-log|manifest\\.webmanifest|manifest\\.json|sw\\.js|workbox-.*\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
