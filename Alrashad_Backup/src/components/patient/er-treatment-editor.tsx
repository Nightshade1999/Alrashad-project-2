"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Pill, Plus, Trash2, Save, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"
import { updateErTreatmentAction } from "@/app/actions/dashboard-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { DRUG_DICTIONARY, COMMON_FREQUENCIES } from "@/lib/medical-dictionary"

interface Treatment {
  name: string
  dosage: string
  frequency: string
}

function ScrollableRibbon({ children }: { children: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = React.useState(false);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
      setShowLeftArrow(scrollLeft > 10);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      const observer = new MutationObserver(checkScroll);
      observer.observe(el, { childList: true, subtree: true });

      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        observer.disconnect();
      };
    }
  }, [checkScroll, children]);

  return (
    <div className="relative group/ribbon">
      {showLeftArrow && (
        <button 
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-1 w-8 bg-gradient-to-r from-slate-50 dark:from-slate-900 to-transparent flex items-center justify-start pl-0.5 z-10"
        >
           <ChevronRight className="h-3 w-3 text-indigo-500 rotate-180" />
        </button>
      )}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-1.5 mt-1 pb-1 scrollbar-hide touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      {showRightArrow && (
        <button 
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-slate-50 dark:from-slate-900 to-transparent flex items-center justify-end pr-0.5 z-10"
        >
           <ChevronRight className="h-3 w-3 text-indigo-500 animate-pulse" />
        </button>
      )}
    </div>
  )
}

export function ErTreatmentEditor({ 
  patientId, 
  initialTreatments,
  trigger,
  disabled = false
}: { 
  patientId: string, 
  initialTreatments: any[],
  trigger?: React.ReactElement,
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [treatments, setTreatments] = useState<Treatment[]>(
    Array.isArray(initialTreatments) ? initialTreatments : []
  )
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setTreatments(Array.isArray(initialTreatments) ? initialTreatments : [])
    }
  }, [open, initialTreatments])

  const addTreatment = () => {
    setTreatments([...treatments, { name: '', dosage: '', frequency: '' }])
  }

  const removeTreatment = (index: number) => {
    setTreatments(treatments.filter((_, i) => i !== index))
  }

  const updateField = (index: number, field: keyof Treatment, value: string) => {
    const newTreatments = [...treatments]
    newTreatments[index][field] = value
    
    // If name is updated, try to auto-fill dosage AND frequency
    if (field === 'name') {
      const drug = DRUG_DICTIONARY.find(d => d.name.toLowerCase() === value.toLowerCase())
      if (drug) {
        if (drug.standardDosages.length > 0) {
          newTreatments[index].dosage = drug.standardDosages[0]
        }
        if (drug.standardFrequencies.length > 0) {
          newTreatments[index].frequency = drug.standardFrequencies[0]
        }
      }
    }
    
    setTreatments(newTreatments)
  }

  const getDuplicateIndex = (index: number) => {
    const t = treatments[index];
    if (!t.name.trim()) return -1;
    return treatments.findIndex((other, i) => 
      i !== index &&
      other.name.trim().toLowerCase() === t.name.trim().toLowerCase() && 
      (other.dosage || "Unknown").trim().toLowerCase() === (t.dosage || "Unknown").trim().toLowerCase()
    );
  }

  const hasDuplicates = treatments.some((_, i) => getDuplicateIndex(i) !== -1);

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateErTreatmentAction(patientId, treatments)
    setIsSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("ER Treatment updated")
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={React.cloneElement(trigger as React.ReactElement<any>, { disabled: disabled || (trigger.props as any).disabled })} />
      ) : (
          <button 
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)} 
            className={`w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-900'}`}
          >
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <Pill className="h-4 w-4 text-indigo-100 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Treatment (In ER)</h3>
               </div>
               <div className="h-7 text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                 Edit List
               </div>
            </div>
            
            {Array.isArray(initialTreatments) && initialTreatments.length > 0 ? (
              <div className="space-y-2">
                {initialTreatments.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                    <span className="text-slate-800 dark:text-slate-100">{t.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{t.dosage} · {t.frequency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400 py-2">No treatments recorded for this ER stay.</p>
            )}
          </button>
      )}
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-indigo-600" />
            Manage ER Medications
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 py-2">
          {treatments.map((t, i) => (
            <div key={i} className="relative p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Medication {i + 1}</Label>
                  {getDuplicateIndex(i) !== -1 && (
                    <span className="text-[10px] font-bold text-amber-500 animate-pulse bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                      Already Added
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => removeTreatment(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                {/* Name */}
                <div className="sm:col-span-5 space-y-1.5">
                  <Input 
                    placeholder="Medication Name (e.g. Ceftriaxone)" 
                    value={t.name} 
                    onChange={e => updateField(i, 'name', e.target.value)}
                    className="h-9 text-sm"
                    list={`drug-suggestions-${i}`}
                  />
                  <datalist id={`drug-suggestions-${i}`}>
                     {DRUG_DICTIONARY.map(drug => (
                       <option key={drug.id} value={drug.name} />
                     ))}
                  </datalist>
                </div>

                {/* Dosage */}
                <div className="sm:col-span-4 space-y-1.5 min-w-0">
                  <Input 
                    placeholder="Dosage (1g)" 
                    value={t.dosage} 
                    onChange={e => updateField(i, 'dosage', e.target.value)}
                    className="h-9 text-sm"
                    list={`dosage-suggestions-${i}`}
                  />
                  <datalist id={`dosage-suggestions-${i}`}>
                    {DRUG_DICTIONARY.find(d => d.name.toLowerCase() === t.name.toLowerCase())?.standardDosages.map((dose, idx) => (
                      <option key={idx} value={dose} />
                    ))}
                  </datalist>
                  
                  <ScrollableRibbon>
                    {DRUG_DICTIONARY.find(d => d.name.toLowerCase() === t.name.toLowerCase())?.standardDosages.map((dose, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField(i, 'dosage', dose);
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border touch-manipulation active:scale-95 ${
                          t.dosage === dose 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-800"
                        }`}
                      >
                        {dose}
                      </button>
                    ))}
                  </ScrollableRibbon>
                </div>

                {/* Frequency */}
                <div className="sm:col-span-3 space-y-1.5 min-w-0">
                  <Input 
                    placeholder="Freq (B.I.D)" 
                    value={t.frequency} 
                    onChange={e => updateField(i, 'frequency', e.target.value)}
                    className="h-9 text-sm"
                    list={`frequency-suggestions-${i}`}
                  />
                  <datalist id={`frequency-suggestions-${i}`}>
                    {(DRUG_DICTIONARY.find(d => d.name.toLowerCase() === t.name.toLowerCase())?.standardFrequencies || COMMON_FREQUENCIES).map((freq, idx) => (freq && (
                      <option key={idx} value={freq} />
                    )))}
                  </datalist>

                  <ScrollableRibbon>
                    {(DRUG_DICTIONARY.find(d => d.name.toLowerCase() === t.name.toLowerCase())?.standardFrequencies || COMMON_FREQUENCIES.slice(0, 4)).map((freq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField(i, 'frequency', freq);
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border touch-manipulation active:scale-95 ${
                          t.frequency === freq 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-800"
                        }`}
                      >
                        {freq?.split(' ')[0]}
                      </button>
                    ))}
                  </ScrollableRibbon>
                </div>
              </div>
              <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
              `}</style>
            </div>
          ))}

          <Button 
            variant="outline" 
            className="w-full border-dashed border-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 py-6"
            onClick={addTreatment}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Medication
          </Button>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" 
            onClick={handleSave}
            disabled={isSaving || hasDuplicates}
          >
            {isSaving ? "Saving..." : (
               <>
                 <Save className="h-4 w-4 mr-2" /> Save Treatment
               </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
