"use client"

import { useState } from "react"
import { Plus, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COMMON_DISEASES, ALL_SURGERIES, DRUG_DICTIONARY, DrugDictionaryItem } from "@/lib/medical-dictionary"
import type { MedicalDrugParams, ChronicDiseaseParams } from "@/types/database.types"

// --- DRUG INPUT ---
interface DrugListInputProps {
  label: string;
  category: "Internal" | "Psych";
  drugs: MedicalDrugParams[];
  onChange: (drugs: MedicalDrugParams[]) => void;
}

export function DrugListInput({ label, category, drugs, onChange }: DrugListInputProps) {
  const [name, setName] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("")

  const filteredDict = DRUG_DICTIONARY.filter(d => d.category === category)

  const handleAdd = () => {
    if (!name) return;
    onChange([...drugs, { name, dosage: dosage || "Unknown", frequency: frequency || "Daily" }])
    setName("")
    setDosage("")
    setFrequency("")
  }

  const handleRemove = (index: number) => {
    onChange(drugs.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 p-3 border rounded-md bg-slate-50 dark:bg-slate-900/50">
      <Label className="font-semibold">{label}</Label>
      
      {/* Current List */}
      {drugs.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {drugs.map((drug, i) => (
            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 border rounded text-sm px-3">
              <div>
                <span className="font-bold">{drug.name}</span>
                <span className="text-slate-500 ml-2">{drug.dosage} - {drug.frequency}</span>
              </div>
              <button 
                type="button" 
                onClick={() => handleRemove(i)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end mt-2">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Drug Name</Label>
          <div className="flex relative">
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Amlodipine"
              list={`dict-${category}`}
              className="h-8 text-sm pr-7"
            />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <datalist id={`dict-${category}`}>
              {filteredDict.map(d => <option key={d.id} value={d.name} />)}
            </datalist>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Dosage</Label>
          <div className="relative">
            <Input 
              value={dosage} 
              onChange={(e) => setDosage(e.target.value)} 
              placeholder="e.g. 5mg" 
              className="h-8 text-sm pr-7"
              list={`dosages-${name}`}
            />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <datalist id={`dosages-${name}`}>
            {filteredDict.find(d => d.name === name)?.standardDosages.map(dose => (
               <option key={dose} value={dose} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Freq</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value)} 
                placeholder="e.g. OD" 
                className="h-8 text-sm pr-7"
                list="freq-list"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <Button type="button" size="sm" variant="secondary" className="h-8 px-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <datalist id="freq-list">
            <option value="OD (Once daily)" />
            <option value="BID (Twice daily)" />
            <option value="TID (Three times daily)" />
            <option value="QID (Four times daily)" />
            <option value="PRN (As needed)" />
          </datalist>
        </div>
      </div>
    </div>
  )
}

// --- DISEASE INPUT ---
interface DiseaseListInputProps {
  diseases: ChronicDiseaseParams[];
  onChange: (diseases: ChronicDiseaseParams[]) => void;
}

export function DiseaseListInput({ diseases, onChange }: DiseaseListInputProps) {
  const [customName, setCustomName] = useState("")

  const handleTogglePreset = (presetName: string) => {
    const exists = diseases.find(d => d.name === presetName)
    if (exists) {
      onChange(diseases.filter(d => d.name !== presetName))
    } else {
      onChange([...diseases, { name: presetName, type: 'preset' }])
    }
  }

  const handleAddCustom = () => {
    if (!customName) return;
    onChange([...diseases, { name: customName, type: 'other' }])
    setCustomName("")
  }

  const handleRemove = (index: number) => {
    onChange(diseases.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3 p-3 border rounded-md">
      <Label className="font-semibold">Chronic Diseases</Label>

      <div className="flex flex-wrap gap-2 mb-2">
        {COMMON_DISEASES.map(preset => {
           const isActive = diseases.some(d => d.name === preset)
           return (
             <Badge 
               key={preset} 
               variant={isActive ? "default" : "outline"}
               className="cursor-pointer hover:opacity-80"
               onClick={() => handleTogglePreset(preset)}
             >
               {preset}
             </Badge>
           )
        })}
      </div>

      {diseases.filter(d => d.type === 'other').length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
          {diseases.map((d, i) => {
            if (d.type === 'preset') return null;
            return (
              <Badge key={i} variant="secondary" className="pl-3 pr-1 gap-1">
                {d.name}
                <button type="button" onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-700 ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <Input 
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Other disease..."
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <Button type="button" size="sm" variant="secondary" className="h-8" onClick={handleAddCustom}>
          Add
        </Button>
      </div>
    </div>
  )
}

// --- BASIC STRING LIST INPUT (Surgeries, Allergies) ---
interface StringListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  presetList?: string[];
  placeholder?: string;
  isDanger?: boolean;
}

export function StringListInput({ label, items, onChange, presetList, placeholder, isDanger }: StringListInputProps) {
  const [val, setVal] = useState("")

  const handleAdd = () => {
    if (!val) return;
    onChange([...items, val])
    setVal("")
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className={`space-y-3 p-3 border rounded-md ${isDanger ? 'border-red-200 bg-red-50/30' : ''}`}>
      <Label className={`font-semibold ${isDanger ? 'text-red-600' : ''}`}>{label}</Label>
      
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-950 p-1.5 border rounded text-sm px-3">
              <span>{item}</span>
              <button type="button" onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input 
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder || "Add item..."}
            className="h-8 text-sm pr-7"
            list={presetList ? `preset-${label.replace(/\s+/g, '')}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          {presetList && (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
        </div>
        {presetList && (
          <datalist id={`preset-${label.replace(/\s+/g, '')}`}>
            {presetList.map(p => <option key={p} value={p} />)}
          </datalist>
        )}
        <Button type="button" size="sm" variant={isDanger ? "destructive" : "secondary"} className="h-8" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  )
}
