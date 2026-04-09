"use client"

import { useEffect } from "react"

export function VConsoleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only load vConsole on mobile devices to avoid cluttering your desktop view
    if (typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      import("vconsole").then((VConsole) => {
        new VConsole.default({
          theme: 'dark'
        });
      }).catch(err => {
        console.error("Failed to load vConsole:", err);
      });
    }
  }, []);

  return <>{children}</>;
}
