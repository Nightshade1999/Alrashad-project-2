import { GudeaScanner } from "@/components/pharmacy/GudeaScanner"

export default function ScannerPage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">
      <GudeaScanner />
    </div>
  )
}
