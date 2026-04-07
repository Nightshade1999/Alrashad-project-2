"use client"

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // If standalone already, don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Listen for beforeinstallprompt for Android/Chrome
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show the prompt manually after some delay if they haven't seen it
    if (isIOSDevice) {
      const hasSeenIOSPrompt = localStorage.getItem('seen_ios_install_prompt');
      if (!hasSeenIOSPrompt) {
        setTimeout(() => setShowPrompt(true), 10000); // Wait 10s before bothering them
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  const closePrompt = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('seen_ios_install_prompt', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 right-6 left-6 sm:left-auto sm:w-[400px] z-[70] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white dark:bg-slate-900 border-2 border-teal-500 rounded-3xl shadow-2xl overflow-hidden shadow-teal-500/20">
        <div className="bg-teal-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5" />
            <h3 className="font-black text-sm uppercase tracking-widest">Install App</h3>
          </div>
          <button onClick={closePrompt} className="hover:bg-teal-600 p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-14 w-14 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center border border-teal-100 dark:border-teal-900 shrink-0">
               <img src="/icon.png" alt="App Icon" className="h-10 w-10" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 italic">"Faster. Reliable. Offline Ready."</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Get the full Ward Manager experience with home screen access and secure local storage.</p>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-2">
                 HOW TO INSTALL ON IOS:
              </p>
              <ol className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 ml-4 list-decimal font-medium">
                <li>Tap the <span className="inline-block px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded font-bold">Share</span> button below</li>
                <li>Scroll down and tap <span className="font-black text-slate-800 dark:text-slate-100 italic font-serif">Add to Home Screen</span></li>
              </ol>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleInstallClick}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black h-12 rounded-2xl shadow-lg shadow-teal-600/20 uppercase tracking-widest"
              >
                <Download className="h-4 w-4 mr-2" /> Install Directly
              </Button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                <ShieldCheck className="h-3 w-3" /> Encrypted SQLite Local-First Storage
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
