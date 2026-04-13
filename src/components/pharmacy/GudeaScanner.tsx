"use client"

import { useState, useEffect, useRef } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Beaker, Check, X, QrCode, ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { useDatabase } from "@/hooks/useDatabase"

export function GudeaScanner() {
  const router = useRouter()
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedDrug, setScannedDrug] = useState<any>(null)
  const [quantity, setQuantity] = useState("1")
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  
  const { profile } = useDatabase()
  const supabase = createClient()

  useEffect(() => {
    // Only initialize if not already scanning and no active result
    if (!scanResult && !isProcessing) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      )
      
      scanner.render(onScanSuccess, (err) => {
        // Suppress repetitive errors
      })
      
      scannerRef.current = scanner
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e))
      }
    }
  }, [scanResult, isProcessing])

  const onScanSuccess = async (decodedText: string) => {
    console.log("Scanned text:", decodedText)
    setScanResult(decodedText)
    setIsProcessing(true)
    
    if (scannerRef.current) {
      await scannerRef.current.clear()
    }

    // "Gudea Integration" Logic
    // If it's a Gudea URL, we "extract" info. 
    // Since we don't have the real API, we mock the extraction.
    if (decodedText.includes("gudea.gov.iq")) {
      toast.info("Gudea Label Detected. Fetching drug data...")
      
      // MOCK DATA FETCH
      setTimeout(() => {
         // In a real scenario, this would be an API call to Gudea or our proxy
         setScannedDrug({
            scientific_name: "Metformin Hydrochloride",
            generic_name: "Glucophage",
            dosage: "500mg",
            formulation: "Tablet",
            manufacturer: "Merck KGaA",
            price: 7500,
            batch_number: "B2024-X45",
            gudea_id: decodedText.split("/").pop() || "GDK-8892"
         })
         setIsProcessing(false)
      }, 1500)
    } else {
       toast.warning("Not a standard Gudea QR code. Please enter info manually.")
       setScannedDrug({
          scientific_name: "",
          generic_name: "",
          dosage: "",
          formulation: "Tablet"
       })
       setIsProcessing(false)
    }
  }

  const handleConfirmAdd = async () => {
     if (!scannedDrug.scientific_name) {
        toast.error("Scientific Name is required.")
        return
     }

     const { error } = await supabase
       .from("pharmacy_inventory")
       .insert({
         ...scannedDrug,
         quantity: Number(quantity),
         gudea_id: scannedDrug.gudea_id,
         pharmacist_name: profile?.pharmacist_name || "System",
         expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 1 year for demo
       })

     if (error) {
        toast.error(`Database Error: ${error.message}`)
     } else {
        toast.success(`${scannedDrug.generic_name || scannedDrug.scientific_name} added to inventory.`)
        router.push("/pharmacy/inventory")
     }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" className="rounded-2xl font-bold" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          PHARMACY HUB
        </Button>
        <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black border-indigo-200 uppercase tracking-widest">
          Gudea Ready
        </Badge>
      </div>

      {!scannedDrug && !isProcessing && (
        <Card className="rounded-[2.5rem] border-white/20 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
           <CardHeader className="p-6 sm:p-10 text-center space-y-4">
              <div className="mx-auto bg-indigo-500 text-white p-5 sm:p-6 rounded-3xl w-fit shadow-xl shadow-indigo-500/20">
                 <QrCode className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <div className="space-y-1">
                 <CardTitle className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase italic">Scan Gudea Code</CardTitle>
                 <p className="text-xs sm:text-sm text-slate-500 font-medium">Position the drug label QR code inside the viewfinder</p>
              </div>
           </CardHeader>
           <CardContent className="p-6 sm:p-10 pt-0">
              <div id="reader" className="overflow-hidden rounded-3xl border-2 sm:border-4 border-slate-100 dark:border-slate-800" />
           </CardContent>
        </Card>
      )}

      {isProcessing && (
        <div className="p-20 flex flex-col items-center justify-center space-y-6">
           <Loader2 className="h-16 w-16 text-teal-600 animate-spin" />
           <p className="text-xl font-black italic tracking-widest text-slate-400 uppercase italic">Intercepting Gudea Stream...</p>
        </div>
      )}

      {scannedDrug && !isProcessing && (
        <Card className="rounded-[2.5rem] border-teal-200 dark:border-teal-900/50 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
           <CardHeader className="p-6 sm:p-10 pb-4">
              <CardTitle className="text-xl sm:text-3xl font-black italic tracking-tighter flex items-center gap-3">
                 <Beaker className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
                 VERIFY SCANNED MEDICINE
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 sm:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scientific Name</Label>
                       <Input 
                          value={scannedDrug.scientific_name} 
                          onChange={e => setScannedDrug({...scannedDrug, scientific_name: e.target.value})}
                          className="h-14 rounded-2xl font-black text-lg border-slate-200 dark:border-slate-800"
                       />
                    </div>
                    <div className="space-y-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generic/Brand Name</Label>
                       <Input 
                          value={scannedDrug.generic_name} 
                          onChange={e => setScannedDrug({...scannedDrug, generic_name: e.target.value})}
                          className="h-14 rounded-2xl font-bold border-slate-200 dark:border-slate-800"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dosage</Label>
                          <Input value={scannedDrug.dosage} onChange={e => setScannedDrug({...scannedDrug, dosage: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
                       </div>
                       <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formulation</Label>
                          <Input value={scannedDrug.formulation} onChange={e => setScannedDrug({...scannedDrug, formulation: e.target.value})} className="h-14 rounded-2xl border-slate-200" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6 p-8 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                       <Label className="text-xl font-black italic text-slate-900 dark:text-white uppercase italic">Stock Quantity</Label>
                       <p className="text-xs text-slate-500 font-medium italic">Enter the number of units/boxes received</p>
                       <Input 
                          type="number" 
                          value={quantity} 
                          onChange={e => setQuantity(e.target.value)}
                          className="h-20 text-center text-4xl font-black border-4 border-teal-500/30 rounded-3xl"
                       />
                    </div>
                    
                    <div className="space-y-2 pt-4">
                       <div className="flex justify-between text-xs font-bold text-slate-400">
                          <span>BATCH: {scannedDrug.batch_number}</span>
                          <span className="text-teal-600">PRICE: {scannedDrug.price?.toLocaleString()} IQD</span>
                       </div>
                       <div className="text-[10px] font-medium text-slate-500 text-center">
                          {scannedDrug.manufacturer}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                 <Button className="flex-1 h-16 rounded-[1.5rem] bg-slate-900 border-none text-white font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all order-1 sm:order-1" onClick={handleConfirmAdd}>
                    <Check className="mr-2 h-6 w-6 text-teal-400" />
                    CONFIRM & ADD
                 </Button>
                 <Button variant="outline" className="h-16 rounded-[1.5rem] px-8 font-black border-slate-200 order-2 sm:order-2" onClick={() => {
                    setScannedDrug(null)
                    setScanResult(null)
                 }}>
                    CANCEL
                 </Button>
              </div>
           </CardContent>
        </Card>
      )}
    </div>
  )
}
