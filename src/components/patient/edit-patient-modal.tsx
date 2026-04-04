"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import type { PatientCategory } from "@/types/database.types"

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

interface EditPatientModalProps {
  patient: {
    id: string
    name: string
    ward_number: string
    age: number
    gender: string
    category: PatientCategory
    province: string | null
    education_level: string | null
    past_surgeries: string | null
    chronic_diseases: string | null
    medical_drugs: string | null
    psych_drugs: string | null
    allergies: string | null
  }
}

export function EditPatientModal({ patient }: EditPatientModalProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gender, setGender] = useState(patient.gender)
  const [category, setCategory] = useState<PatientCategory>(patient.category)
  const [province, setProvince] = useState(patient.province || "")
  const [educationLevel, setEducationLevel] = useState(patient.education_level || "")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gender) {
      toast.error("Please select a gender")
      return
    }

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    const payload = {
      name: formData.get('name') as string,
      ward_number: formData.get('wardNumber') as string,
      age: parseInt(formData.get('age') as string),
      gender: gender,
      category: category,
      province: province || null,
      education_level: educationLevel || null,
      past_surgeries: formData.get('pastSurgeries') as string || null,
      chronic_diseases: formData.get('chronicDiseases') as string || null,
      medical_drugs: formData.get('medicalDrugs') as string || null,
      psych_drugs: formData.get('psychDrugs') as string || null,
      allergies: formData.get('allergies') as string || null,
    }

    try {
      const supabase = createClient()
      // @ts-ignore - Supabase type mismatch in this environment
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
        render={
          <Button variant="outline" size="sm" className="h-9 px-3 gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit Info
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary font-bold">Edit Patient Information</DialogTitle>
            <DialogDescription>
              Modify the patient's demographics and medical history.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">

            {/* ── Basic Demographics ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={patient.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wardNumber">Ward / Bed Number</Label>
                <Input id="wardNumber" name="wardNumber" defaultValue={patient.ward_number} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" defaultValue={patient.age} required min="0" max="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={(val) => setGender(val || "")}>
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
                <Select value={province} onValueChange={(val) => setProvince(val || "")}>
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
                <Select value={educationLevel} onValueChange={(val) => setEducationLevel(val || "")}>
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="category">Category (Follow-up Level)</Label>
                <Select value={category} onValueChange={(val) => setCategory(val as PatientCategory)}>
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

            <hr className="my-2 border-slate-200 dark:border-slate-800" />

            {/* ── Medical History ── */}
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Medical History</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pastSurgeries">Past Surgeries</Label>
                <Textarea id="pastSurgeries" name="pastSurgeries" defaultValue={patient.past_surgeries || ""} className="resize-none min-h-24" placeholder="List past surgeries..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronicDiseases">Chronic Diseases</Label>
                <Textarea id="chronicDiseases" name="chronicDiseases" defaultValue={patient.chronic_diseases || ""} className="resize-none min-h-24" placeholder="DM, HTN, etc..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalDrugs">Internal Medical Drugs</Label>
                <Textarea id="medicalDrugs" name="medicalDrugs" defaultValue={patient.medical_drugs || ""} className="resize-none min-h-24" placeholder="Current medications..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psychDrugs">Psychiatric Drugs</Label>
                <Textarea id="psychDrugs" name="psychDrugs" defaultValue={patient.psych_drugs || ""} className="resize-none min-h-24" placeholder="Current psych medications..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="allergies" className="text-destructive font-bold">Allergies</Label>
                <Textarea id="allergies" name="allergies" defaultValue={patient.allergies || ""} className="resize-none min-h-24 border-destructive/30 focus-visible:ring-destructive" placeholder="List known allergies..." />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
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
