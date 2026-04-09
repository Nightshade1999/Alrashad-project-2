import { format, parseISO } from "date-fns"
import { isLabAbnormal } from "./utils"

/** Safely parse a Supabase JSONB field that may arrive as a JSON string or already-parsed array. */
export function parseArr(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

/** Format a drugs array [{name, dosage, frequency}] into readable lines. */
export function formatDrugs(val: any): string[] {
  return parseArr(val).map((d: any) =>
    typeof d === 'object' ? `${d.name} ${d.dosage || ""} — ${d.frequency || ""}` : String(d)
  )
}

/** Format chronic diseases [{name}] into a comma string. */
export function formatDiseases(val: any): string {
  const arr = parseArr(val)
  if (arr.length === 0) return 'None recorded'
  return arr.map((d: any) => (typeof d === 'object' ? d.name : String(d))).join(', ')
}

export function safeStr(v: any): string {
  if (v === null || v === undefined) return ""
  return String(v)
}

export { isLabAbnormal }
