import Link from 'next/link'
import { BedDouble, CalendarDays } from 'lucide-react'
import { DeletePatientButton } from '@/components/patient/delete-button'

export interface PatientSummary {
  id: string;
  roomNumber: string;
  name: string;
  age: number;
  gender: string;
  category: string;
  latestExamDate: string;
}

export function PatientCard({ patient }: { patient: PatientSummary }) {
  return (
    <div className="relative group hover-lift animate-fade-in-up">
      <Link
        href={`/patient/${patient.id}`}
        className="block"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300">
          {/* Bed + Age row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg text-sm font-bold font-mono border border-teal-200 dark:border-teal-800">
              <BedDouble className="h-3.5 w-3.5" />
              {patient.roomNumber}
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              {patient.age}y · {patient.gender === 'Male' ? 'M' : 'F'}
            </span>
          </div>

          {/* Name */}
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 truncate pr-2 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors" dir="auto">
            {patient.name}
          </h3>

          {/* Last Exam */}
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0" />
            <span>{patient.latestExamDate ? `Last: ${patient.latestExamDate}` : 'No exam recorded'}</span>
          </div>
        </div>
      </Link>

      {/* Delete button - overlaid on top-right */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DeletePatientButton patientId={patient.id} variant="ghost" />
      </div>
    </div>
  )
}
