"use client"

import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function NavigationButtons() {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show back/home on the main dashboard itself to avoid redundancy, 
  // or show only home to 'refresh'. Let's show them everywhere for consistency as requested.
  const isDashboard = pathname === '/dashboard'
  const isCategory = pathname.startsWith('/dashboard/category/')
  const isMyWard = pathname === '/dashboard/my-ward'
  const isWards = pathname === '/dashboard/wards'
  const isTopLevel = isDashboard || isCategory || isMyWard || isWards

  return (
    <div className="flex items-center gap-2 mr-4">
      {!isDashboard && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
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
              className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
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
