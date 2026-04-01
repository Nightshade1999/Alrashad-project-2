"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import type { PatientCategory } from "@/types/database.types"

interface CategorySwitcherProps {
  patientId: string
  currentCategory: PatientCategory
}

export function CategorySwitcher({ patientId, currentCategory }: CategorySwitcherProps) {
  const [val, setVal] = useState<PatientCategory>(currentCategory)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleCategoryChange = async (newCat: PatientCategory) => {
    if (newCat === val) return
    
    setIsUpdating(true)
    const supabase = createClient()
    
    try {
      // @ts-ignore - Supabase type inference has issues in this environment
      const { error } = await (supabase.from('patients') as any)
        .update({ category: newCat })
        .eq('id', patientId)

      if (error) throw error
      
      setVal(newCat)
      toast.success(`Category updated to ${newCat}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update category")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="w-44">
      <Select 
        value={val} 
        onValueChange={(v) => handleCategoryChange(v as PatientCategory)}
        disabled={isUpdating}
      >
        <SelectTrigger className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <SelectValue placeholder="Change Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="High Risk">🔴 High Risk</SelectItem>
          <SelectItem value="Close Follow-up">🟡 Close Follow-up</SelectItem>
          <SelectItem value="Normal">🟢 Normal Follow-up</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
