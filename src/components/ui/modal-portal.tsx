"use client"

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

/**
 * Renders children directly into document.body via a React portal.
 *
 * - Escapes CSS transform stacking contexts (fixes fixed-position modals)
 * - Locks body scroll on iOS/Android while the modal is open
 *   (uses the position:fixed trick — the only reliable method on iOS Safari)
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // ── Body scroll lock ──────────────────────────────────────
    // iOS Safari ignores overflow:hidden on body; position:fixed is required.
    // We save the current scroll offset and apply it as a negative top offset
    // so the page doesn't jump to the top when fixed.
    const scrollY = window.scrollY
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    return () => {
      setMounted(false)
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''
      // Yield to browser paint before scrolling to prevent iOS flicker
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' })
      })
    }
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
