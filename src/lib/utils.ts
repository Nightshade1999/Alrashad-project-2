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
