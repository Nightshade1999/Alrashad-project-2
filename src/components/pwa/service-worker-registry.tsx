"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ServiceWorkerRegistry() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Quietly check for an updated service worker in the background
        registration.update().catch((err) => {
          console.debug('Service Worker update failed:', err);
        });
      });
    }
  }, [pathname]);

  return null;
}
