"use client"

import { useActionState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signInAction } from "@/app/actions/auth-actions"
import { toast } from "sonner"

export default function LoginPage() {
  // useActionState handles the server action, previous state, and the transition pending state natively.
  const [state, formAction, isPending] = useActionState(signInAction, null)

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* 
        CRITICAL FIX: Added pointer-events-none to decorative elements.
        These were overlapping the button on small mobile screens.
      */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Added z-10 and relative to ensure the login card is always clickable above background blobs */}
      <Card className="relative z-10 w-full max-w-md shadow-2xl border-white/20 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="h-2 bg-linear-to-r from-teal-500 to-indigo-500" />
        <CardHeader className="space-y-2 text-center pt-8">
          <CardTitle className="text-4xl font-black tracking-tight text-slate-900 dark:text-white italic">
            Ward Manager
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
            Clinical System Secure Access
          </CardDescription>
        </CardHeader>
        
        <form action={formAction}>
          <CardContent className="space-y-6 pt-4">
            {state?.error && (
              <div className="p-4 text-sm font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl animate-in shake duration-300">
                ⚠️ {state.error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
              <Input 
                id="email"
                name="email"
                type="email" 
                placeholder="doctor@example.com" 
                required
                className="h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 text-lg focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" title="Password" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Security Password</Label>
              <Input 
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 text-lg focus:ring-2 focus:ring-teal-500 transition-all font-medium"
              />
            </div>
          </CardContent>
          
          <CardFooter className="pb-10 pt-4">
            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 text-white text-xl font-black shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer" 
              type="submit" 
              disabled={isPending}
            >
              {isPending ? (
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING
                </div>
              ) : 'SIGN IN TO SYSTEM'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <p className="absolute bottom-8 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 pointer-events-none">
        Alrashad Medical / Clinical Portal v2.0
      </p>
    </div>
  )
}
