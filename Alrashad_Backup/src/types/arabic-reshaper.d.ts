declare module 'arabic-reshaper' {
  const ArabicReshaper: {
    /** Reshapes Arabic text into contextual presentation forms (Initial/Medial/Final/Isolated) */
    convertArabic(text: string): string
    /** Converts Arabic Presentation Forms B back to base characters */
    convertArabicBack(text: string): string
  }
  export = ArabicReshaper
}
