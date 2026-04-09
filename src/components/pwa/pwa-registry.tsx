"use client"

import { useEffect } from "react"

export function PwaRegistry() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-minimal.js")
        .then((reg) => {
          // Worker registered purely for installability.
        })
        .catch((err) => {
          console.warn("PWA registration failed:", err)
        })
    }
  }, [])

  return null
}
