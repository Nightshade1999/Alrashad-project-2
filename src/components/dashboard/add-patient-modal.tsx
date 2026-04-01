"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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
import { queueMutation } from "@/lib/offline-sync"
import { toast } from "sonner"
import type { PatientCategory } from "@/types/database.types"

export function AddPatientModal() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [gender, setGender] = useState("")
  const [category, setCategory] = useState<PatientCategory>("Normal")

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
      past_surgeries: formData.get('pastSurgeries') as string || null,
      chronic_diseases: formData.get('chronicDiseases') as string || null,
      medical_drugs: formData.get('medicalDrugs') as string || null,
      psych_drugs: formData.get('psychDrugs') as string || null,
      allergies: formData.get('allergies') as string || null,
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const supabase = createClient()
        // @ts-expect-error - Supabase type inference issue with insert
        const { error } = await supabase.from('patients').insert([payload as any])
        if (error) throw error
        toast.success("Patient added successfully!")
      } else {
        await queueMutation('ADD_PATIENT', payload)
        toast.success("Saved offline. Will sync when reconnected.")
      }
      setOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Failed to add patient")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md w-full sm:w-auto h-14 px-8 text-lg font-semibold shadow-md whitespace-nowrap transition-colors">
        <Plus className="h-6 w-6 mr-2" />
        Add New Patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl h-[90vh] sm:h-auto overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Add New Patient</DialogTitle>
            <DialogDescription>
              Enter the patient's demographics and medical history here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="Name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wardNumber">Ward / Bed Number</Label>
                <Input id="wardNumber" name="wardNumber" placeholder="e.g. B12" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" placeholder="Years" required min="0" max="150" />
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
            
            <hr className="my-2 border-border" />
            
            <h3 className="text-lg font-medium">Medical History</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pastSurgeries">Past Surgeries</Label>
                <Textarea id="pastSurgeries" name="pastSurgeries" className="resize-none min-h-24" placeholder="List past surgeries..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronicDiseases">Chronic Diseases</Label>
                <Textarea id="chronicDiseases" name="chronicDiseases" className="resize-none min-h-24" placeholder="DM, HTN, etc..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalDrugs">Internal Medical Drugs</Label>
                <Textarea id="medicalDrugs" name="medicalDrugs" className="resize-none min-h-24" placeholder="Current medications..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psychDrugs">Psychiatric Drugs</Label>
                <Textarea id="psychDrugs" name="psychDrugs" className="resize-none min-h-24" placeholder="Current psych medications..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="allergies" className="text-destructive">Allergies</Label>
                <Textarea id="allergies" name="allergies" className="resize-none min-h-24 border-destructive/50 focus-visible:ring-destructive" placeholder="List known allergies..." />
              </div>
            </div>
          </div>
          <DialogFooter>
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
