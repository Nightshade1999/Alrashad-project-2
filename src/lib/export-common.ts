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

/** Translates common frequency terms into numerical equivalents (e.g., Once daily -> 1x1) */
export function formatFrequency(freq: string): string {
  if (!freq) return ""
  const f = freq.toLowerCase().trim()
  
  // Direct matches
  if (f.includes("once daily") || f === "od" || f === "q24h" || f === "q24") return "1x1"
  if (f.includes("twice daily") || f === "bid" || f === "bd" || f === "q12h" || f === "q12") return "1x2"
  if (f.includes("three times") || f === "tid" || f === "tds" || f === "q8h" || f === "q8") return "1x3"
  if (f.includes("four times") || f === "qid" || f === "qds" || f === "q6h" || f === "q6") return "1x4"
  
  // Return original if no mapping found (e.g. PRN, STAT)
  return freq
}

export { isLabAbnormal }
