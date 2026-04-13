"use client"

import { PharmacistNameModal } from "@/components/pharmacy/PharmacistNameModal"
import { useDatabase } from "@/hooks/useDatabase"

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isReady, profile } = useDatabase()

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Centralized Identity Verification for Pharmacy Section */}
      {isReady && <PharmacistNameModal />}
      
      {children}
    </div>
  )
}
