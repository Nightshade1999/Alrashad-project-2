"use client"

import { useEffect } from "react"
import { recordEvent } from "./BlackBox"

export function PWAExtras() {
  useEffect(() => {
    // --- 1. THE RELOAD TRAP (EMERGENCY OVERRIDE) ---
    if (typeof window !== 'undefined') {
      // Monkey patch the browser's reload to block loops and log callers
      // We use a property descriptor to make it harder to bypass
      const originalReload = window.location.reload;
      
      try {
        Object.defineProperty(window.location, 'reload', {
          configurable: true,
          enumerable: true,
          value: function() {
            const stack = new Error().stack;
            const callerLines = stack ? stack.split('\n') : [];
            // Try to find the first non-trap line
            const caller = callerLines.find(line => !line.includes('PWAExtras') && line.includes('http')) || 'Unknown Source';
            
            recordEvent(`🚫 BLOCKED RELOAD: Triggered by ${caller.trim()}`);
            console.error(`🚨 RELOAD TRAPPED! Stack Trace:`, stack);
            
            alert(`CRITICAL ALERT: A background process tried to refresh the page.\n\nSource: ${caller.trim()}\n\nRefresh has been blocked to save your context. Check the Black Box logs (📜) for details.`);
          }
        });
        recordEvent('Reload Trap: Activated');
      } catch (e) {
        console.warn('Failed to patch window.location.reload. Falling back to simple override.');
        (window.location as any).reload = () => {
          recordEvent('🚫 BLOCKED RELOAD (Fallback)');
          alert('Blocked a background refresh!');
        };
      }
    }

    // --- 2. MOBILE DEV CONSOLE ---
    if (typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      import("vconsole").then((VConsole) => {
        new VConsole.default({ theme: 'dark' });
      }).catch(err => {
        recordEvent(`vConsole Load Error: ${err.message}`);
      });
    }

    recordEvent('PWA Extras: Ready');
  }, []);

  return null;
}
