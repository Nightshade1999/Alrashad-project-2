"use client"

import { useState } from "react"
import { FileText, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, HeadingLevel, AlignmentType } from "docx"
import { exportNurseMedsToPdf } from "@/lib/nurse-export-pdf"
import { Patient, MedicalDrugParams } from "@/types/database.types"
import { safeJsonParse } from "@/lib/utils"
import { formatFrequency } from "@/lib/export-common"
import { toast } from "sonner"
import { format } from "date-fns"

interface NurseExportButtonProps {
  patients: Patient[]
  wardName: string
}

export function NurseExportButton({ patients, wardName }: NurseExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const getPatientMeds = (p: Patient) => {
    const medical = safeJsonParse(p.medical_drugs) as MedicalDrugParams[]
    const psych = safeJsonParse(p.psych_drugs) as MedicalDrugParams[]
    return [...medical, ...psych]
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const exportToDoc = async () => {
    try {
      setIsExporting(true)
      setOpen(false)
      
      const now = new Date();
      const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

      const getActiveInstructions = (p: any): any[] => {
        const all: any[] = (p as any).allInstructions || [];
        if (all.length === 0 && (p as any).lastInstruction) {
          return [(p as any).lastInstruction].filter(Boolean);
        }
        return all.filter((inst: any) => {
          if (inst.instruction_type === 'repetitive') {
            return !inst.expires_at || new Date(inst.expires_at) > now;
          }
          if (!inst.is_read) return true;
          const lastAck = inst.acknowledgments?.[inst.acknowledgments.length - 1];
          return lastAck ? new Date(lastAck.at).getTime() > oneDayAgo : false;
        });
      };

      // Only show the instructions column if at least one patient has active instructions
      const hasAnyInstructions = patients.some(p => getActiveInstructions(p).length > 0);

      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Patient Name", heading: HeadingLevel.HEADING_4 })], width: { size: hasAnyInstructions ? 25 : 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: "Chronic Medications, Dosage & Frequency", heading: HeadingLevel.HEADING_4 })], width: { size: hasAnyInstructions ? 50 : 70, type: WidthType.PERCENTAGE } }),
            ...(hasAnyInstructions ? [new TableCell({ children: [new Paragraph({ text: "Active Nursing Instructions", heading: HeadingLevel.HEADING_4 })], width: { size: 25, type: WidthType.PERCENTAGE } })] : []),
          ],
        }),
      ]

      patients.forEach((p) => {
        const meds = getPatientMeds(p)
        const medsText = meds.length > 0 
          ? meds.map(m => {
              const numFreq = formatFrequency(m.frequency)
              const freqStr = m.frequency ? `${m.frequency}${numFreq && numFreq !== m.frequency ? ` (${numFreq})` : ""}` : ""
              return `${m.name} (${m.dosage} - ${freqStr})`
            }).join(", ") 
          : "No meds recorded"

        const activeInstructions = getActiveInstructions(p);
        const instrParagraphs = hasAnyInstructions
          ? activeInstructions.length > 0
              ? activeInstructions.flatMap((inst: any) => {
                  const text = inst.instruction || inst.text || '';
                  const doctor = inst.doctor_name ? `Ordered by: ${inst.doctor_name}` : '';
                  const endDate = inst.instruction_type === 'repetitive' && inst.expires_at 
                    ? `Active until: ${new Date(inst.expires_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` 
                    : '';
                  const lastAck = inst.acknowledgments?.[inst.acknowledgments.length - 1];
                  const signed = inst.is_read && lastAck ? `✓ Signed: ${lastAck.nurse_name}` : 'Pending';
                  return [
                    new Paragraph({ children: [new TextRun({ text, bold: true, size: 18 })], spacing: { after: 20 } }),
                    ...(doctor ? [new Paragraph({ children: [new TextRun({ text: doctor, size: 16, color: '475569' })], spacing: { after: 20 } })] : []),
                    ...(endDate ? [new Paragraph({ children: [new TextRun({ text: endDate, size: 16, color: 'D97706' })], spacing: { after: 20 } })] : []),
                    new Paragraph({ children: [new TextRun({ text: signed, size: 16, color: inst.is_read ? '059669' : '94A3B8', bold: inst.is_read })], spacing: { after: 80 } }),
                  ];
                })
            : [new Paragraph({ children: [new TextRun({ text: 'None', italics: true, color: '94A3B8', size: 18 })] })]
          : [];

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: p.name })] }),
              new TableCell({ children: [new Paragraph({ text: medsText })] }),
              ...(hasAnyInstructions ? [new TableCell({ children: instrParagraphs })] : []),
            ],
          })
        )
      })

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `Ward Medication Report: ${wardName}`,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: `Generated on: ${format(new Date(), "dd MMMM yyyy, HH:mm")}`,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: "" }), // Spacer
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
              }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      triggerDownload(blob, `Ward_Meds_${wardName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.docx`)
      toast.success("Word document generated successfully!")
    } catch (error) {
       console.error("DOC Export Error:", error)
       toast.error("Failed to generate Word document")
    } finally {
       setIsExporting(false)
    }
  }

  const exportToPdf = async () => {
    try {
      setIsExporting(true)
      setOpen(false)
      await exportNurseMedsToPdf(patients, wardName)
      toast.success("Medication sheet opened for printing")
    } catch (error) {
       console.error("PDF Export Error:", error)
       toast.error("Failed to open medication sheet")
    } finally {
       setIsExporting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        render={
          <Button variant="outline" className="h-12 bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900 shadow-sm" disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2 text-blue-500" />}
            Export Workstation
          </Button>
        }
      />

      <PopoverContent align="end" className="w-48 p-1 rounded-xl border-slate-100 dark:border-slate-800">
        <div className="flex flex-col">
          <button 
            onClick={exportToDoc} 
            className="flex items-center gap-2 w-full px-3 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 text-blue-500" />
            <span>Export as Word</span>
          </button>
          <button 
            onClick={exportToPdf} 
            className="flex items-center gap-2 w-full px-3 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 text-rose-500" />
            <span>Export as PDF</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
