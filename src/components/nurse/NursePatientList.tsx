"use client"

import { useState, useMemo } from 'react'
import { Patient, MedicalDrugParams } from '@/types/database.types'
import { Search, User, UserPlus, Clock, ArrowUpDown, ChevronRight, Pill, ClipboardList, Thermometer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AddPatientModal } from '@/components/dashboard/add-patient-modal'
import { NavigationButtons } from '@/components/layout/navigation-buttons'
import { safeJsonParse } from '@/lib/utils'
import Link from 'next/link'
import { NurseExportButton } from './NurseExportButton'
import { format, parseISO } from 'date-fns'

interface PatientWithInstruction extends Patient {
  lastInstruction?: {
    text: string;
    doctor: string;
    date: string;
    isRead: boolean;
  } | null;
}

export function NursePatientList({ 
  initialPatients, 
  wardName,
  instructions = []
}: { 
  initialPatients: PatientWithInstruction[], 
  wardName: string,
  instructions?: any[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Merge instructions into patient objects
  const patientsWithData = useMemo(() => {
    return initialPatients.map(p => {
       const relevantInstructions = instructions
         .filter(inst => inst.patient_id === p.id)
         .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
       
       const lastInst = relevantInstructions[0];
       
       return {
         ...p,
         // Full raw array — used by the export utilities to read doctor_name, acknowledgments, is_read, etc.
         allInstructions: relevantInstructions,
         // Summary snapshot — used by the patient list UI cards
         lastInstruction: lastInst ? {
           text: lastInst.instruction,
           doctor: lastInst.doctor_name || 'Physician',
           date: lastInst.created_at,
           isRead: lastInst.is_read
         } : null
       };
    });
  }, [initialPatients, instructions]);

  const filteredPatients = useMemo(() => {
    let result = patientsWithData.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortOrder === 'asc') return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

    return result;
  }, [patientsWithData, searchTerm, sortOrder]);

  const toggleSort = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  const formatDrugs = (p: Patient) => {
    const medical = safeJsonParse(p.medical_drugs) as MedicalDrugParams[];
    const psych = safeJsonParse(p.psych_drugs) as MedicalDrugParams[];
    return [...medical, ...psych];
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Search and Header Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <NavigationButtons />
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Ward Workstation
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Active Ward: {wardName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search patients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold shadow-sm focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <NurseExportButton patients={filteredPatients} wardName={wardName} />
          <AddPatientModal role="nurse" initialWard={wardName} />
        </div>
      </div>

      {/* Patient Table - Desktop and Mobile unified High-Density Grid */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-5">
                   <button 
                     onClick={toggleSort}
                     className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
                   >
                     Patient Name <ArrowUpDown className="h-3 w-3" />
                   </button>
                </th>
                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Ward Info</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Age / Geo</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Chronic Meds</th>
                <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Active Instructions (30d)</th>
                <th className="px-6 py-5 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                         <User className="h-12 w-12" />
                         <p className="text-sm font-bold uppercase tracking-widest">No patients admitted in this ward</p>
                      </div>
                   </td>
                </tr>
              ) : filteredPatients.map((p) => {
                const drugs = formatDrugs(p);
                return (
                  <tr key={p.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                    <td className="px-6 py-6">
                       <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                            p.category === 'Awaiting Assessment' 
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 animate-pulse' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</h4>
                             <Badge variant="outline" className={`mt-1 text-[9px] font-black uppercase ${
                               p.category === 'Awaiting Assessment' ? 'border-blue-400 text-blue-600' : ''
                             }`}>
                               {p.category}
                             </Badge>
                          </div>
                       </div>
                    </td>
                    
                    <td className="px-6 py-6">
                       <p className="text-xs font-black text-slate-700 dark:text-slate-300">{p.ward_name}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Room {p.room_number || 'TBD'}</p>
                    </td>

                    <td className="px-6 py-6">
                       <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.age || '??' } Years</p>
                       <p className="text-[10px] font-medium text-slate-500">{p.province || 'Unknown'}</p>
                    </td>

                    <td className="px-6 py-6 max-w-[200px]">
                       <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 space-y-1">
                          {drugs.length > 0 ? drugs.map((d, i) => (
                             <div key={i} className="flex flex-col p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">{d.name}</span>
                                <span className="text-[9px] text-slate-500">{d.dosage}</span>
                             </div>
                          )) : (
                            <span className="text-xs italic text-slate-400">No Chronic Meds</span>
                          )}
                       </div>
                    </td>

                    <td className="px-6 py-6 max-w-[300px]">
                       {p.lastInstruction ? (
                          <div className={`p-3 rounded-2xl border-2 transition-all ${
                            p.lastInstruction.isRead 
                              ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
                              : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 animate-pulse'
                          }`}>
                             <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed italic">
                                "{p.lastInstruction.text}"
                             </p>
                             <div className="mt-2 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tighter">
                                   Dr. {p.lastInstruction.doctor}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">
                                   {format(parseISO(p.lastInstruction.date), 'dd MMM, HH:mm')}
                                </span>
                             </div>
                          </div>
                       ) : (
                          <p className="text-xs italic text-slate-400 flex items-center gap-2">
                             <Clock className="h-3 w-3" /> No pending instructions
                          </p>
                       )}
                    </td>

                    <td className="px-6 py-6 text-right">
                       <Link href={`/patient/${p.id}`}>
                          <button className="p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-slate-900/10">
                             <ChevronRight className="h-5 w-5" />
                          </button>
                       </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Real-time Sync Active</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ward Access Validated</span>
            </div>
         </div>
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
            * Use clinical signatures for all document activities.
         </p>
      </div>
    </div>
  )
}
