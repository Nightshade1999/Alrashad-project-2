"use client"

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Maps route patterns to their logical parent (not history-based)
function getParentRoute(pathname: string): string | null {
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
  const router = useRouter()
  const pathname = usePathname()

  const isDashboard = pathname === '/dashboard'
  const parentRoute = getParentRoute(pathname)

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
