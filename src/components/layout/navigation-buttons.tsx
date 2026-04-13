"use client"

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Maps route patterns to their logical parent (not history-based)
function getParentRoute(pathname: string, isMultiWard: boolean, fromParam?: string | null, role?: string | null, wardName?: string | null): string | null {
  // If we came from a specific category, return there (Doctor/Admin Only)
  if (fromParam && pathname.startsWith('/patient/') && role?.toLowerCase() !== 'nurse') {
    return `/dashboard/category/${fromParam}`
  }

  // Patient sub-pages → patient detail
  if (/^\/patient\/[^/]+\/(visits|investigations|er)$/.test(pathname)) {
    const patientId = pathname.split('/')[2]
    return `/patient/${patientId}`
  }
  // Patient detail → my ward (Role Based)
  if (/^\/patient\/[^/]+$/.test(pathname)) {
    if (role?.toLowerCase() === 'nurse') {
        return `/nurse/ward/${encodeURIComponent(wardName || 'General Ward')}`
    }
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
  // Lab Alerts / History → back to lab dashboard for techs
  if (pathname.startsWith('/laboratory/alerts') || pathname.startsWith('/laboratory/patient/')) {
      return '/laboratory'
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
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      ;(supabase.from('user_profiles') as any)
        .select('accessible_wards, role, ward_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }: any) => {
          const wards = data?.accessible_wards
          setIsMultiWard(Array.isArray(wards) && wards.length > 1)
          setUserRole(data?.role || null)
          setWardName(data?.ward_name || null)
        })
    })
  }, [pathname])

  const isDashboard = pathname === '/dashboard' || pathname === '/laboratory' || pathname === '/pharmacy' || pathname.startsWith('/nurse/ward/')
  const [wardName, setWardName] = useState<string | null>(null)
  const parentRoute = getParentRoute(pathname, isMultiWard, fromParam, userRole, wardName)

  const homeHref = pathname.startsWith('/laboratory') ? '/laboratory' : 
                   pathname.startsWith('/pharmacy') ? '/pharmacy' : 
                   userRole?.toLowerCase() === 'nurse' && wardName ? `/nurse/ward/${encodeURIComponent(wardName)}` :
                   '/dashboard'

  if (isDashboard) return null

  return (
    <div className="flex items-center gap-1 mr-2">
      {parentRoute && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(parentRoute)}
          className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90"
          title="Go Back"
        >
          <ArrowLeft className="h-5.5 w-5.5 sm:h-5 sm:w-5" />
        </Button>
      )}

      {!isDashboard && (
        <>
          <Link href={homeHref} prefetch={true}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90"
              title="Home Dashboard"
            >
              <Home className="h-5.5 w-5.5 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
        </>
      )}
    </div>
  )
}
