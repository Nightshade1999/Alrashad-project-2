"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ServiceWorkerRegistry() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check only if we haven't already checked in this session (or within 5 mins)
      const lastCheck = sessionStorage.getItem('pwa_sw_last_check');
      const now = Date.now();
      
      if (!lastCheck || (now - parseInt(lastCheck)) > 300000) {
        navigator.serviceWorker.ready.then((registration) => {
          console.log('PWA: Checking for service worker updates...');
          registration.update().catch((err) => {
            console.debug('Service Worker update failed:', err);
          });
          sessionStorage.setItem('pwa_sw_last_check', now.toString());
        });
      }
    }
  }, [pathname]);

  return null;
}
