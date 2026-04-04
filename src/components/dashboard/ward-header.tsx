"use client"

import { useState, useEffect, useRef } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase'

const DEFAULT_WARD_NAME = "Internal Medicine - Psych Ward"

export function WardHeader() {
  const [isEditing, setIsEditing] = useState(false)
  const [wardName, setWardName] = useState(DEFAULT_WARD_NAME)
  const [editValue, setEditValue] = useState("")
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load ward name from Supabase on mount (cross-device, per user account)
  useEffect(() => {
    setMounted(true)
    const loadWardName = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('user_profiles')
          .select('ward_name')
          .eq('user_id', user.id)
          .single()

        if (data?.ward_name) {
          setWardName(data.ward_name)
        }
      } catch {
        // Silently fall back to default — DB might not have migration yet
      }
    }
    loadWardName()
  }, [])

  const startEditing = () => {
    setEditValue(wardName)
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }

  const saveEdit = async () => {
    const newName = editValue.trim()
    if (!newName) {
      setIsEditing(false)
      return
    }
    setWardName(newName)
    setIsEditing(false)

    // Persist to Supabase (upsert so it creates the profile if missing)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, ward_name: newName }, { onConflict: 'user_id' })
    } catch (err) {
      console.error('Failed to save ward name:', err)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  if (!mounted) {
    return <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(saveEdit, 100)}
          className="h-9 w-[250px] sm:w-[350px] font-bold text-lg"
        />
        <Button variant="ghost" size="icon" onClick={saveEdit} className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-9 w-9 text-muted-foreground hover:bg-muted/50">
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group cursor-pointer transition-opacity" onClick={startEditing}>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
        {wardName}
      </h1>
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  )
}
