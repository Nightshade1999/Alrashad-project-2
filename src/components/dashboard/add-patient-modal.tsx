"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { useDatabase } from "@/hooks/useDatabase"
import { GENERAL_SURGERIES, FEMALE_SURGERIES, MALE_SURGERIES, COMMON_ALLERGIES } from "@/lib/medical-dictionary"
import { DrugListInput, DiseaseListInput, StringListInput } from "./medical-inputs"
import { convertArabicNumbers } from "@/lib/utils"
import type { PatientCategory, MedicalDrugParams, ChronicDiseaseParams } from "@/types/database.types"

const IRAQ_PROVINCES = [
  "Baghdad", "Basra", "Nineveh", "Erbil", "Sulaymaniyah", "Dohuk",
  "Kirkuk", "Anbar", "Diyala", "Saladin", "Babylon", "Karbala",
  "Najaf", "Wasit", "Dhi Qar", "Muthanna", "Qadisiyyah", "Maysan",
]

const EDUCATION_LEVELS = [
  "Illiterate",
  "Can Read & Write",
  "Elementary School",
  "Middle School",
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
]

export function AddPatientModal() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gender, setGender] = useState("")
  const [category, setCategory] = useState<PatientCategory>("Normal")
  const [province, setProvince] = useState("")
  const [educationLevel, setEducationLevel] = useState("")
  const router = useRouter()
  const { isOfflineMode, patients: dbPatients } = useDatabase()
  
  // Relatives State
  const [relativeStatus, setRelativeStatus] = useState<'Known' | 'Unknown'>('Unknown')
  const [relativeVisits, setRelativeVisits] = useState("")

  // Arrays State
  const [pastSurgeries, setPastSurgeries] = useState<string[]>([])
  const [chronicDiseases, setChronicDiseases] = useState<ChronicDiseaseParams[]>([])
  const [medicalDrugs, setMedicalDrugs] = useState<MedicalDrugParams[]>([])
  const [psychDrugs, setPsychDrugs] = useState<MedicalDrugParams[]>([])
  const [allergies, setAllergies] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gender) {
      toast.error("Please select a gender")
      return
    }

    if (category === 'Normal' && chronicDiseases.length >= 2) {
      const confirmNormal = window.confirm("This patient has 2 or more chronic diseases. Standard protocol places them in 'Close Follow-up' or 'High Risk'.\n\nAre you sure you want to categorize them as 'Normal Follow-up'?")
      if (!confirmNormal) {
        return
      }
    }

    setIsSubmitting(true)
    const supabase = createClient()
    const formData = new FormData(e.currentTarget)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("You must be logged in to add a patient.")
      setIsSubmitting(false)
      return
    }

    // Fetch user's ward from their profile to tag the patient
    const { data: profile } = await (supabase.from('user_profiles') as any)
      .select('ward_name')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      toast.error("User profile not found. Contact administrator.")
      setIsSubmitting(false)
      return
    }

    const payload: any = {
      user_id: user.id,
      ward_name: (profile as any).ward_name,
      name: formData.get('name') as string,
      room_number: convertArabicNumbers(formData.get('roomNumber') as string),
      age: parseInt(convertArabicNumbers(formData.get('age') as string)),
      gender,
      category,
      province: province || null,
      education_level: educationLevel || null,
      relative_status: relativeStatus,
      relative_visits: relativeStatus === 'Known' ? relativeVisits || null : null,
      past_surgeries: pastSurgeries,
      chronic_diseases: chronicDiseases,
      medical_drugs: medicalDrugs,
      psych_drugs: psychDrugs,
      allergies: allergies,
    }

    if (category === 'High Risk') {
      payload.high_risk_date = new Date().toISOString()
    }

    try {
      // Only use local PowerSync path when truly offline.
      // When online, always insert directly into Supabase so the data is
      // immediately visible on page reload (PowerSync syncs bidirectionally anyway).
      if (isOfflineMode && !navigator.onLine) {
        await dbPatients.insert({
          ...payload,
          ward_number: payload.ward_name
        })
        toast.success("Patient saved to local device!")
      } else {
        const { data: inserted, error } = await (supabase.from('patients') as any).insert([payload]).select()
        if (error) throw error
        if (!inserted || inserted.length === 0) {
          throw new Error("Insert was blocked — check Supabase RLS policies for this user's ward.")
        }
        toast.success("Patient added successfully!")
      }
      setOpen(false)
      resetForm()
      window.location.reload()
    } catch (error: any) {
      console.error("Add patient failed:", error)
      toast.error(error?.message || "Failed to add patient")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setGender("")
    setCategory("Normal")
    setProvince("")
    setEducationLevel("")
    setRelativeStatus('Unknown')
    setRelativeVisits("")
    setPastSurgeries([])
    setChronicDiseases([])
    setMedicalDrugs([])
    setPsychDrugs([])
    setAllergies([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md w-full sm:w-auto h-14 px-8 text-lg font-semibold shadow-md whitespace-nowrap transition-colors">
        <Plus className="h-6 w-6 mr-2" />
        Add New Patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-[95vw] sm:w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto p-4 sm:p-6 mx-auto rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-primary font-bold">Add New Patient</DialogTitle>
            <DialogDescription>
              Enter the patient's demographics, relative status, and medical history here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8">

            {/* ── Basic Demographics ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="Name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input id="roomNumber" name="roomNumber" placeholder="e.g. B12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" placeholder="Years" required min="0" max="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender || ""} onValueChange={(val) => setGender(val || "")}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select value={province || ""} onValueChange={(val) => setProvince(val || "")}>
                  <SelectTrigger id="province">
                    <SelectValue placeholder="Select Province" />
                  </SelectTrigger>
                  <SelectContent>
                    {IRAQ_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select value={educationLevel || ""} onValueChange={(val) => setEducationLevel(val || "")}>
                  <SelectTrigger id="educationLevel">
                    <SelectValue placeholder="Select Education Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Relatives Info */}
              <div className="space-y-2 border-t pt-4 md:border-t-0 md:pt-0">
                <Label htmlFor="relativeStatus" className="text-blue-700 dark:text-blue-400">Relative Status</Label>
                <Select value={relativeStatus || "Unknown"} onValueChange={(val) => setRelativeStatus(val as 'Known' | 'Unknown')}>
                  <SelectTrigger id="relativeStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Known">Known</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {relativeStatus === 'Known' && (
                <div className="space-y-2 border-t pt-4 md:border-t-0 md:pt-0">
                  <Label htmlFor="relativeVisits" className="text-blue-700 dark:text-blue-400">Visits per 3 months</Label>
                  <Select value={relativeVisits || ""} onValueChange={(val) => setRelativeVisits(val || "")}>
                    <SelectTrigger id="relativeVisits">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "More than 12"].map((num) => (
                        <SelectItem key={num?.toString()} value={num?.toString() || ""}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2 border-t pt-4">
                <Label htmlFor="category">Category (Follow-up Level)</Label>
                <Select value={category || "Normal"} onValueChange={(val) => setCategory(val as PatientCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High Risk">🔴 High Risk</SelectItem>
                    <SelectItem value="Close Follow-up">🟡 Close Follow-up</SelectItem>
                    <SelectItem value="Normal">🟢 Normal Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Medical History ── */}
            <hr className="border-border" />
            
            <div>
              <h3 className="text-lg font-bold mb-4">Medical History</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <DiseaseListInput 
                  diseases={chronicDiseases} 
                  onChange={setChronicDiseases} 
                />
                
                <StringListInput 
                  label="Past Surgeries" 
                  items={pastSurgeries} 
                  onChange={setPastSurgeries}
                  presetList={[
                    ...GENERAL_SURGERIES,
                    ...(gender === 'Female' ? FEMALE_SURGERIES : []),
                    ...(gender === 'Male' ? MALE_SURGERIES : [])
                  ]}
                />

                <DrugListInput 
                  label="Internal Medical Drugs" 
                  category="Internal" 
                  drugs={medicalDrugs} 
                  onChange={setMedicalDrugs} 
                />
                
                <DrugListInput 
                  label="Psychiatric Drugs" 
                  category="Psych" 
                  drugs={psychDrugs} 
                  onChange={setPsychDrugs} 
                />

                <div className="md:col-span-2">
                  <StringListInput 
                    label="Allergies" 
                    items={allergies} 
                    onChange={setAllergies}
                    presetList={COMMON_ALLERGIES}
                    isDanger={true}
                  />
                </div>

              </div>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
