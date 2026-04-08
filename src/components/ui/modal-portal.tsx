"use client"

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

/**
 * Renders children directly into document.body via a React portal.
 *
 * This ensures that modals with `position: fixed` always position relative
 * to the viewport, regardless of any CSS transform or filter on ancestor
 * elements (which would otherwise create a new containing block and break
 * fixed positioning).
 *
 * Usage: wrap the modal backdrop div with <ModalPortal>.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
