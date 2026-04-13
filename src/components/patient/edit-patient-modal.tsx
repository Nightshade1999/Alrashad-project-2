"use client"

import { useState, useEffect } from "react"
import { Pencil } from "lucide-react"
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
import { useRouter } from "next/navigation"
import type { PatientCategory, MedicalDrugParams, ChronicDiseaseParams } from "@/types/database.types"
import { GENERAL_SURGERIES, FEMALE_SURGERIES, MALE_SURGERIES, COMMON_ALLERGIES } from "@/lib/medical-dictionary"
import { DrugListInput, DiseaseListInput, StringListInput } from "../dashboard/medical-inputs"
import { convertArabicNumbers, safeJsonParse } from "@/lib/utils"

const IRAQ_PROVINCES = [
  "Baghdad", "Basra", "Nineveh", "Erbil", "Sulaymaniyah", "Dohuk",
  "Kirkuk", "Anbar", "Diyala", "Saladin", "Babylon", "Karbala",
  "Najaf", "Wasit", "Dhi Qar", "Muthanna", "Qadisiyyah", "Maysan",
  "Other",
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

interface EditPatientModalProps {
  patient: {
    id: string
    name: string
    room_number: string
    age: number
    gender: string
    category: PatientCategory
    province: string | null
    education_level: string | null
    relative_status: 'Known' | 'Unknown'
    relative_visits: string | null
    past_surgeries: string[]
    chronic_diseases: ChronicDiseaseParams[]
    medical_drugs: MedicalDrugParams[]
    psych_drugs: MedicalDrugParams[]
    allergies: string[]
    high_risk_date?: string | null
    is_referred?: boolean
    mother_name?: string | null
    medical_record_number?: string | null
    psychological_diagnosis?: string | null
    admission_date?: string | null
  }
  disabled?: boolean
  role?: string | null
}

export function EditPatientModal({ patient, disabled = false, role: initialRole = null }: EditPatientModalProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [role, setRole] = useState<string | null>(initialRole || null)
  const [gender, setGender] = useState(patient.gender)
  const [category, setCategory] = useState<PatientCategory>(patient.category)
  const [province, setProvince] = useState(IRAQ_PROVINCES.includes(patient.province || "") ? (patient.province || "") : (patient.province ? "Other" : ""))
  const [customProvince, setCustomProvince] = useState(IRAQ_PROVINCES.includes(patient.province || "") ? "" : (patient.province || ""))
  const [admissionDate, setAdmissionDate] = useState(patient.admission_date || "")
  const [educationLevel, setEducationLevel] = useState(patient.education_level || "")
  
  const [relativeStatus, setRelativeStatus] = useState<'Known' | 'Unknown'>(patient.relative_status || 'Unknown')
  const [relativeVisits, setRelativeVisits] = useState(patient.relative_visits || "")

  const [pastSurgeries, setPastSurgeries] = useState<string[]>(safeJsonParse(patient.past_surgeries))
  const [chronicDiseases, setChronicDiseases] = useState<ChronicDiseaseParams[]>(safeJsonParse(patient.chronic_diseases))
  const [medicalDrugs, setMedicalDrugs] = useState<MedicalDrugParams[]>(safeJsonParse(patient.medical_drugs))
  const [psychDrugs, setPsychDrugs] = useState<MedicalDrugParams[]>(safeJsonParse(patient.psych_drugs))
  const [allergies, setAllergies] = useState<string[]>(safeJsonParse(patient.allergies))

  const router = useRouter()

  useEffect(() => {
    if (open) {
      const fetchRole = async () => {
        if (role) return; // Prop already provided
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await (supabase as any).from('user_profiles').select('role').eq('user_id', user.id).single()
          setRole(data?.role || 'doctor')
        }
      }
      fetchRole()
      setGender(patient.gender)
      setCategory(patient.category)
      setProvince(IRAQ_PROVINCES.includes(patient.province || "") ? (patient.province || "") : (patient.province ? "Other" : ""))
      setCustomProvince(IRAQ_PROVINCES.includes(patient.province || "") ? "" : (patient.province || ""))
      setAdmissionDate(patient.admission_date || "")
      setEducationLevel(patient.education_level || "")
      setRelativeStatus(patient.relative_status || 'Unknown')
      setRelativeVisits(patient.relative_visits || "")
      setPastSurgeries(safeJsonParse(patient.past_surgeries))
      setChronicDiseases(safeJsonParse(patient.chronic_diseases))
      setMedicalDrugs(safeJsonParse(patient.medical_drugs))
      setPsychDrugs(safeJsonParse(patient.psych_drugs))
      setAllergies(safeJsonParse(patient.allergies))
    }
  }, [open, patient])

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
    const formData = new FormData(e.currentTarget)

    const ageStr = convertArabicNumbers(formData.get('age') as string);
    const payload: any = {
      name: formData.get('name') as string,
      room_number: convertArabicNumbers(formData.get('roomNumber') as string),
      age: ageStr ? parseInt(ageStr) : null,
      gender: gender,
      category: category,
      province: province === 'Other' ? (customProvince || 'Other') : (province || null),
      admission_date: admissionDate || null,
      education_level: educationLevel || null,
      relative_status: relativeStatus,
      relative_visits: relativeStatus === 'Known' ? relativeVisits || null : null,
      past_surgeries: pastSurgeries,
      chronic_diseases: chronicDiseases,
      medical_drugs: medicalDrugs,
      psych_drugs: psychDrugs,
      allergies: allergies,
      mother_name: formData.get('motherName') as string || null,
      medical_record_number: formData.get('medicalRecordNumber') as string || null,
      psychological_diagnosis: formData.get('diagnosis') as string || null,
    }

    if (category === 'High Risk') {
      payload.high_risk_date = new Date().toISOString()
    }

    try {
      const supabase = createClient()
      // @ts-ignore
      const { error } = await (supabase.from('patients') as any)
        .update(payload)
        .eq('id', patient.id)

      if (error) throw error

      toast.success("Patient updated successfully!")
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update patient")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        disabled={disabled}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit Info
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-[95vw] sm:w-full max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto p-4 sm:p-6 mx-auto rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-primary font-bold">Edit Patient Information</DialogTitle>
            <DialogDescription>
              Modify the patient's demographics, relative status, and medical history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8">

            {/* ── Basic Demographics ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={patient.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input id="roomNumber" name="roomNumber" defaultValue={patient.room_number} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age (Optional)</Label>
                <Input id="age" name="age" type="number" defaultValue={patient.age ?? ""} min="0" max="150" />
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

              {province === 'Other' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label htmlFor="customProvince">Specific Province</Label>
                  <Input 
                    id="customProvince" 
                    value={customProvince || ""} 
                    onChange={(e) => setCustomProvince(e.target.value)} 
                    placeholder="Enter province name" 
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admissionDate">Date of Admission (Optional)</Label>
                <Input 
                  id="admissionDate" 
                  name="admissionDate" 
                  type="date" 
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                />
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

              <div className="space-y-2">
                <Label htmlFor="motherName">Mother Name</Label>
                <Input id="motherName" name="motherName" defaultValue={patient.mother_name || ""} placeholder="Full name of mother" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalRecordNumber">Medical Record No.</Label>
                <Input id="medicalRecordNumber" name="medicalRecordNumber" defaultValue={patient.medical_record_number || ""} placeholder="e.g. MRN12345" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="diagnosis">Psychological Diagnosis</Label>
                <Input id="diagnosis" name="diagnosis" defaultValue={patient.psychological_diagnosis || ""} placeholder="Primary psychological diagnosis" />
              </div>

              {/* Relatives Info */}
              {role?.toLowerCase() !== 'nurse' && (
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
              )}

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

              {role?.toLowerCase() !== 'nurse' && (
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
                      <SelectItem value="Awaiting Assessment">🔵 Awaiting Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <hr className="border-border" />
            
            {/* ── Medical History ── */}
            {role?.toLowerCase() !== 'nurse' && (
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
            )}
          </div>
          <DialogFooter className="mt-8 gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
              {isSubmitting ? "Updating..." : "Update Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
