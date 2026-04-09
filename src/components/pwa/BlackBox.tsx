"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export function recordEvent(msg: string) {
  if (typeof window === 'undefined') return;
  try {
    const logKey = 'app_black_box';
    const raw = localStorage.getItem(logKey) || '[]';
    const logs = JSON.parse(raw);
    
    const entry = {
      t: new Date().toLocaleTimeString(),
      m: msg,
      u: window.location.pathname
    };
    
    logs.push(entry);
    // Keep only last 50 entries
    if (logs.length > 50) logs.shift();
    
    localStorage.setItem(logKey, JSON.stringify(logs));
    console.log(`[BlackBox] ${msg}`);
  } catch (e) {
    // Silently fail if storage is full
  }
}

export function BlackBox() {
  const pathname = usePathname();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    recordEvent(`Session Started: ${pathname}`);

    // Heartbeat every 5 seconds to know exactly when the app died
    heartbeatRef.current = setInterval(() => {
      recordEvent('Heartbeat');
    }, 5000);

    // Monitor memory if available (Chrome/Edge/Some Safari)
    if ((performance as any).memory) {
      const memInterval = setInterval(() => {
        const used = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
        recordEvent(`Memory: ${used}MB`);
      }, 10000);
      return () => {
        clearInterval(memInterval);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      };
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  useEffect(() => {
    recordEvent(`Navigated: ${pathname}`);
  }, [pathname]);

  return null;
}
