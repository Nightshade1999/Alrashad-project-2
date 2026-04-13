"use client"

import { Referral, Patient } from "@/types/database.types"
import { Printer, FileDown, ArrowLeft, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { useDatabase } from "@/hooks/useDatabase"

interface ReferralDocumentViewProps {
  referral: Referral & { 
    patients: Partial<Patient>,
    history_of_present_illness?: string 
  }
  onBack: () => void
}

export function ReferralDocumentView({ referral, onBack }: ReferralDocumentViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const patient = referral.patients
  const { profile } = useDatabase()
  const role = profile?.role
  const rawDoctorName = profile?.doctor_name || localStorage.getItem('wardManager_doctorName') || 'Clinical Officer'
  
  const nameWithPrefix = (role === 'doctor' || role === 'admin' || !role) 
    ? (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`)
    : rawDoctorName;

  return (
    <div className="bg-slate-100 dark:bg-slate-950 p-4 md:p-6 print:p-0 print:bg-white pb-20 sm:pb-24 flex flex-col items-center">
      {/* Action Bar - Hidden during print */}
      <div className="w-full max-w-[21cm] mb-4 flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 print:hidden sticky top-4 z-50">
        <Button variant="ghost" onClick={onBack} size="sm" className="gap-2 font-bold text-slate-600">
          <ArrowLeft className="h-4 w-4" />
          Edit Letter
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-slate-300">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
            <FileDown className="h-4 w-4" />
            Save as PDF
          </Button>
        </div>
      </div>

      <div className="document-container relative w-full max-w-[21cm] origin-top transition-all duration-300">
        <div className="bg-white dark:bg-slate-900 shadow-2xl print:shadow-none min-h-[29.7cm] p-[1.2cm] border border-slate-300 print:border-none text-slate-900 dark:text-slate-100 font-serif leading-tight flex flex-col">
          
          {/* Center Header */}
          <div className="text-center space-y-px mb-6 pt-1">
            <h1 className="text-md font-bold">جمهورية العراق</h1>
            <h1 className="text-sm font-bold italic opacity-80">وزارة الصحة</h1>
            <h2 className="text-xl font-extrabold flex items-center justify-center gap-4 py-1 mt-1">
              <span className="border-b-2 border-slate-900 dark:border-slate-100 px-4 text-sm sm:text-xl">Referral Form</span>
              <span>-</span>
              <span className="border-b-2 border-slate-900 dark:border-slate-100 px-4 text-sm sm:text-xl">استمارة الأحالة</span>
            </h2>
          </div>

          {/* Header Metadata Boxes */}
          <div className="flex justify-between text-[10px] mb-4">
            <div className="space-y-1 w-1/3">
                <div className="flex gap-2"><span>Date / التاريخ:</span> <span className="underline decoration-dotted flex-1">{format(new Date(referral.created_at), 'dd / MM / yyyy')}</span></div>
                <div className="flex gap-2"><span>Time / الوقت:</span> <span className="underline decoration-dotted flex-1">{format(new Date(referral.created_at), 'HH:mm')}</span></div>
            </div>
            <div className="w-1/3 flex justify-center items-center">
                <Building2 className="h-10 w-10 text-slate-100" />
            </div>
            <div className="space-y-1 w-1/2 text-right flex flex-col items-end">
                <div className="flex justify-end gap-10 font-black text-slate-900 text-[9px] mb-1 pb-1 border-b-2 border-slate-900 w-full">
                   <span>مستشفى الرشاد التعليمي</span>
                   <span>مركز الرعاية الصحية الاولية</span>
                </div>
                <div className="flex gap-2 justify-end"><span>Folder No / رقم الملف:</span> <span className="font-bold underline decoration-dotted w-24 text-center">{patient.medical_record_number || '---'}</span></div>
            </div>
          </div>

          {/* Patient Info Row Set */}
          <div className="space-y-2 text-[11px] mb-6">
            <div className="flex gap-4">
                <div className="flex gap-2 flex-[2]">
                  <span className="whitespace-nowrap font-bold">Patient Name / إسم المريض:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 font-bold text-center uppercase tracking-wide px-2">{patient.name}</span>
                </div>
                <div className="flex gap-2 flex-1">
                  <span className="whitespace-nowrap font-bold">Gender / الجنس:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 text-center font-bold font-sans">{patient.gender}</span>
                </div>
                <div className="flex gap-2 flex-0.5">
                  <span className="whitespace-nowrap font-bold">Age / العمر:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 text-center font-bold font-sans">{patient.age} Y</span>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex gap-2 flex-[1.5]">
                  <span className="whitespace-nowrap font-bold">Referral Destination / الجهة المحال اليها:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 font-bold px-2">{referral.destination}</span>
                </div>
                <div className="flex gap-2 flex-1">
                  <span className="whitespace-nowrap font-bold">Department / القسم:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 px-2">{referral.department}</span>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex gap-2 flex-1">
                  <span className="whitespace-nowrap font-bold">Companion Name / إسم المرافق:</span>
                  <span className="border-b border-dashed border-slate-400 flex-1 px-2">{referral.companion_name}</span>
                </div>
            </div>
          </div>

          {/* --- SECTION 1: REFERRING SUMMARY --- */}
          <div className="mb-px mt-1">
            <h3 className="text-center font-bold text-[10px] bg-slate-50 dark:bg-slate-800 py-0.5 border border-slate-300 flex items-center justify-center gap-6">
                <span>Referring Summary</span>
                <span>-</span>
                <span>ملخص الحالة</span>
            </h3>
          </div>

          <div className="border border-slate-300 p-3 space-y-2.5 text-[10px]">
            <div className="flex items-start gap-4">
                <span className="font-bold whitespace-nowrap">Indications for referring / سبب الإحالة :</span>
                <span className="border-b border-dashed border-slate-300 flex-1 min-h-[1.1em]">{referral.indications}</span>
            </div>

            {/* Core Clinical Blocks */}
            <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="font-bold whitespace-nowrap">Chief complaint / الشكوى الرئيسية :</span>
                  <span className="border-b border-dashed border-slate-300 flex-1 min-h-[1.1em]">{referral.chief_complaint}</span>
                </p>

                <p className="flex items-start gap-2">
                  <span className="font-bold whitespace-nowrap">History of present illness / تاريخ الحالة الحالي :</span>
                  <span className="border-b border-dashed border-slate-300 flex-1 min-h-[1.1em] font-sans leading-tight">{referral.history_of_present_illness}</span>
                </p>

                {/* Vitals Grid */}
                <div className="flex items-center gap-8 py-1.5 border-y border-dashed border-slate-200">
                  <span className="font-bold">Vitals parameter / العلامات الحيوية :</span>
                  <div className="flex gap-10 font-sans font-bold">
                    <div className="flex gap-2"><span>Bp:</span> <span className="underline">{referral.vitals_snapshot?.bp || '---'}</span></div>
                    <div className="flex gap-2"><span>Pulse:</span> <span className="underline">{referral.vitals_snapshot?.pulse || '---'}</span></div>
                    <div className="flex gap-2"><span>Temp:</span> <span className="underline">{referral.vitals_snapshot?.temp || '---'} °C</span></div>
                    <div className="flex gap-2"><span>RR:</span> <span className="underline">{referral.vitals_snapshot?.rr || '---'}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap">General Examination / الفحص العام :</span>
                  <span className="border-b border-dashed border-slate-300 flex-1 leading-tight">{referral.relevant_examination}</span>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap text-[9px]">Current medication / العلاج الحالي :</span>
                  <span className="border-b border-dashed border-slate-300 flex-1 font-bold italic font-sans text-[9px] truncate">
                    {referral.treatment_taken}
                    {referral.er_treatment_snapshot?.length > 0 && (
                      <span className="ml-2 font-normal opacity-70">
                        ({referral.er_treatment_snapshot.map((t: any) => `${t.name} ${t.dosage}`).join(', ')})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap text-[9px]">Investigations / الفحوصات المختبرية :</span>
                  <span className="border-b border-dashed border-slate-300 flex-1 font-sans text-[9px] truncate">{referral.investigations_text}</span>
                </div>
            </div>

            {/* Optimized Doctor Signature Box */}
            <div className="mt-4 flex justify-end">
                <div className="text-right space-y-0.5 bg-slate-50 dark:bg-slate-800/30 p-2 px-4 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm min-w-[260px]">
                  <p className="font-bold text-slate-900 dark:text-white border-b border-indigo-200 mb-1 text-center text-[10px]">إسم و توقيع الطبيب المختص</p>
                  <div className="font-bold text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wide text-center">
                      {nameWithPrefix}
                  </div>
                  <p className="text-[8px] text-slate-400 italic text-center leading-none">Name and Signature of Specialist Physician</p>
                  <div className="pt-1 flex justify-between gap-3 text-[8px] text-slate-400 border-t border-dashed border-slate-200 mt-1">
                      <span>Date: {format(new Date(referral.created_at), 'dd/MM/yyyy')}</span>
                      <span>Sign: _________________</span>
                  </div>
                </div>
            </div>
          </div>

          {/* --- SECTION 2: FEEDBACK REPORT (BOTTOM HALF) - Optimized to fill remaining space --- */}
          <div className="mt-3 flex-1 flex flex-col">
            <h3 className="text-center font-bold text-[10px] bg-slate-50 dark:bg-slate-800 p-0.5 border border-slate-300 flex items-center justify-center gap-6">
                <span>Feed back report</span>
                <span>-</span>
                <span>تقرير التغذية الإسترجاعية</span>
            </h3>
            <div className="border border-slate-300 p-3 flex-1 flex flex-col space-y-3 text-[9px] opacity-40">
                <div className="flex gap-4">
                  <div className="flex gap-2 flex-1"><span>المستشفى / Hospital:</span><div className="border-b border-dashed flex-1"></div></div>
                  <div className="flex gap-2 flex-1"><span>التاريخ / Date:</span><div className="border-b border-dashed flex-1"></div></div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold">Clinical Findings / النتائج السريرية :</span>
                  <div className="border-b border-dashed flex-1 h-[1cm]"></div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold">Investigations (Lab, X-Ray) / الفحوصات :</span>
                  <div className="border-b border-dashed flex-1 h-[1cm]"></div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap">Diagnosis / التشخيص :</span>
                  <div className="border-b border-dashed border-slate-300 flex-1"></div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold whitespace-nowrap">Management / المعالجة :</span>
                  <div className="border-b border-dashed border-slate-300 flex-1 h-[0.8cm]"></div>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold">Recommendation and follow up / التوصيات والمتابعة :</span>
                  <div className="border-b border-dashed border-slate-300 flex-1 h-[1.2cm]"></div>
                </div>

                <div className="flex-1"></div>

                <div className="flex justify-end pt-2">
                  <div className="flex flex-col items-end space-y-1">
                      <div className="w-64 h-8 border-b border-dashed"></div>
                      <div className="text-right">
                        <p className="font-bold font-serif">Signature of Specialist</p>
                        <p className="text-[7px] italic">توقيع الطبيب الأخصائي</p>
                      </div>
                  </div>
                </div>
            </div>
          </div>

          {/* Footer print watermark */}
          <div className="mt-2 text-[7px] text-slate-300 flex justify-between px-4">
            <span>MOH-IRAQ / ALRASHAD CMS / ID: {referral.id}</span>
            <span className="font-mono">Page 1 / 1</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Noto+Serif+Arabic:wght@400;700&display=swap');
        .font-serif {
          font-family: 'Noto Serif', 'Noto Serif Arabic', serif;
        }
        
        /* Responsive scaling logic */
        .document-container {
           transform-origin: top center;
        }
        @media screen and (max-width: 480px) {
          .document-container {
            transform: scale(0.40);
            margin-bottom: -60%;
            margin-top: -10%;
          }
        }
        @media screen and (min-width: 481px) and (max-width: 768px) {
          .document-container {
            transform: scale(0.60);
            margin-bottom: -35%;
          }
        }
        @media screen and (min-width: 769px) and (max-width: 1024px) {
          .document-container {
            transform: scale(0.80);
            margin-bottom: -15%;
          }
        }
      `}</style>
    </div>
  )
}
