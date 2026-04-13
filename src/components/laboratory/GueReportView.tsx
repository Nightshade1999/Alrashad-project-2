"use client"

import { format } from "date-fns"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GueReportViewProps {
  data: any;
  onBack: () => void;
}

export function GueReportView({ data, onBack }: GueReportViewProps) {
  const gue = data.gue || {};

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in zoom-in duration-300 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-6">
         <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
               <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">General Urine Exam</h1>
              <p className="text-sm font-bold text-slate-400">Recorded on {format(new Date(data.date), "PPP p")}</p>
            </div>
         </div>
         <Button variant="outline" className="rounded-2xl font-black px-6 h-12 shadow-sm border-slate-200" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK TO FILE
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Physical & Chemical */}
         <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-6">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-teal-600">Physical & Chemical Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
               {[
                 { label: 'Color', value: gue.color },
                 { label: 'Appearance', value: gue.appearance },
                 { label: 'Reaction (pH)', value: gue.ph },
                 { label: 'Specific Gravity', value: gue.sp_gravity },
                 { label: 'Sugar', value: gue.sugar },
                 { label: 'Protein (Albumin)', value: gue.protein },
                 { label: 'Ketone Bodies', value: gue.ketone },
               ].map((item) => (
                 <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <span className="text-xs font-black text-slate-500 uppercase">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">{item.value || 'N/A'}</span>
                 </div>
               ))}
            </CardContent>
         </Card>

         {/* Microscopic */}
         <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
            <CardHeader className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 p-6">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-teal-600">Microscopic Examination</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
               {[
                 { label: 'Pus Cells', value: gue.pus_cells, unit: '/HPF' },
                 { label: 'RBCs', value: gue.rbcs, unit: '/HPF' },
                 { label: 'Epithelial Cells', value: gue.epithelial },
                 { label: 'Casts', value: gue.casts },
                 { label: 'Crystals', value: gue.crystals },
                 { label: 'Bacteria', value: gue.bacteria },
               ].map((item) => (
                 <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <span className="text-xs font-black text-slate-500 uppercase">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">{item.value || 'N/A'} {item.unit}</span>
                 </div>
               ))}
               
               {gue.others && (
                 <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Other Notes</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">{gue.others}</p>
                 </div>
               )}
            </CardContent>
         </Card>
      </div>

      <div className="flex justify-center p-8 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-md text-center leading-relaxed">
           This is a finalized laboratory report. Any changes required after 24 hours of submission must be requested through administrative audit protocols.
         </p>
      </div>
    </div>
  );
}
