import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converts Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to English digits (0123456789). */
export function convertArabicNumbers(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return s.replace(/[٠-٩]/g, (match) => arabicDigits.indexOf(match).toString());
}
export function isLabAbnormal(key: string, value: number | string | undefined | null): boolean {
  if (value === null || value === undefined || value === "") return false;
  const val = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(val)) return false;

  switch (key.toLowerCase()) {
    case "wbc": return val < 4 || val > 11;
    case "hb": return val < 10;
    case "s_urea": 
    case "urea": return val > 40;
    case "s_creatinine":
    case "creatinine":
    case "creat": return val > 1.2;
    case "ast": return val > 40;
    case "alt": return val > 40;
    case "tsb": return val > 1.2;
    case "hba1c": return val > 6.5;
    case "rbs": return val > 200;
    case "esr": return val > 20;
    case "crp": return val > 10;
    default: return false;
  }
}
