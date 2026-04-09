"use client"

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Maps route patterns to their logical parent (not history-based)
function getParentRoute(pathname: string, isMultiWard: boolean, fromParam?: string | null): string | null {
  // If we came from a specific category, return there
  if (fromParam && pathname.startsWith('/patient/')) {
    return `/dashboard/category/${fromParam}`
  }

  // Patient sub-pages → patient detail
  if (/^\/patient\/[^/]+\/(visits|investigations|er)$/.test(pathname)) {
    const patientId = pathname.split('/')[2]
    return `/patient/${patientId}`
  }
  // Patient detail → my ward
  if (/^\/patient\/[^/]+$/.test(pathname)) {
    return '/dashboard/my-ward'
  }
  // Category pages → my ward
  if (pathname.startsWith('/dashboard/category/')) {
    return '/dashboard/my-ward'
  }
  // ER sub-page (gender) → ER selection
  if (/^\/dashboard\/er\/(Male|Female)$/.test(pathname)) {
    return '/dashboard/er'
  }
  // ER selection → my ward
  if (pathname === '/dashboard/er') {
    return '/dashboard/my-ward'
  }
  // My ward → select-ward (only for multi-ward users)
  if (pathname === '/dashboard/my-ward') {
    return isMultiWard ? '/dashboard/select-ward' : null
  }
  // Select ward → dashboard
  if (pathname === '/dashboard/select-ward') {
    return '/dashboard'
  }
  // Archive etc → my ward
  if (pathname.startsWith('/dashboard/') && pathname !== '/dashboard' && pathname !== '/dashboard/my-ward') {
    return '/dashboard/my-ward'
  }
  // Reminders → dashboard
  if (pathname.startsWith('/reminders')) {
    return '/dashboard'
  }
  return null
}

export function NavigationButtons() {
  return (
    <Suspense fallback={<div className="h-9 w-9" />}>
      <NavigationButtonsInner />
    </Suspense>
  )
}

function NavigationButtonsInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const [isMultiWard, setIsMultiWard] = useState(false)

  useEffect(() => {
    // Only fetch if on my-ward to avoid unnecessary requests on every page
    if (pathname !== '/dashboard/my-ward') return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      ;(supabase.from('user_profiles') as any)
        .select('accessible_wards')
        .eq('user_id', user.id)
        .single()
        .then(({ data }: any) => {
          const wards = data?.accessible_wards
          setIsMultiWard(Array.isArray(wards) && wards.length > 1)
        })
    })
  }, [pathname])

  const isDashboard = pathname === '/dashboard'
  const parentRoute = getParentRoute(pathname, isMultiWard, fromParam)

  if (isDashboard) return null

  return (
    <div className="flex items-center gap-1 mr-2">
      {parentRoute && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(parentRoute)}
          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95"
          title="Go Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {!isDashboard && (
        <>
          <Link href="/dashboard" prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95"
              title="Home Dashboard"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
        </>
      )}
    </div>
  )
}
