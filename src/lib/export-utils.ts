import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, BorderStyle, WidthType, VerticalAlign } from "docx"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { format, parseISO } from "date-fns"

/** Safely parse a Supabase JSONB field that may arrive as a JSON string or already-parsed array. */
function parseArr(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

/** Format a drugs array [{name, dosage, frequency}] into readable lines. */
function formatDrugs(val: any): string[] {
  return parseArr(val).map((d: any) =>
    typeof d === 'object' ? `${d.name} ${d.dosage} — ${d.frequency}` : String(d)
  )
}

/** Format chronic diseases [{name}] into a comma string. */
function formatDiseases(val: any): string {
  const arr = parseArr(val)
  if (arr.length === 0) return 'None recorded'
  return arr.map((d: any) => (typeof d === 'object' ? d.name : String(d))).join(', ')
}

// Removed createTableCell helper completely since tables are deprecated for mobile compatibility

/**
 * Exports patient data to an Excel file with category-based row coloring and bold headers.
 */
export async function exportPatientsToExcel(patients: any[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Patients")

  worksheet.columns = [
    { header: "Patient Name", key: "name", width: 30 },
    { header: "Age", key: "age", width: 10 },
    { header: "Category", key: "category", width: 22 },
    { header: "Ward", key: "ward", width: 15 },
    { header: "Chronic Diseases", key: "diseases", width: 40 },
    { header: "Current Meds", key: "meds", width: 40 },
    { header: "Date of Death", key: "deathDate", width: 20 },
    { header: "Cause of Death", key: "deathCause", width: 30 },
    { header: "Last Category", key: "prevCategory", width: 20 },
    { header: "Last Visit", key: "lastVisit", width: 20 }
  ]

  worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  
  // Add auto-filter and freeze top row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  }
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

  patients.forEach((p) => {
    const row = worksheet.addRow({
      name: p.name,
      age: p.age,
      category: p.category,
      ward: p.ward_number,
      diseases: formatDiseases(p.chronic_diseases),
      meds: [...formatDrugs(p.medical_drugs), ...formatDrugs(p.psych_drugs)].join(', ') || 'None',
      deathDate: p.date_of_death ? format(parseISO(p.date_of_death), "dd MMM yyyy HH:mm") : "",
      deathCause: p.cause_of_death || "",
      prevCategory: p.previous_category || (p.category === 'Deceased/Archive' ? "N/A" : ""),
      lastVisit: p.lastVisit ? format(parseISO(p.lastVisit), "dd MMM yyyy") : "No visits"
    })

    let color = "FFFFFFFF"
    if (p.category === "High Risk") color = "FFFEE2E2"
    else if (p.category === "Close Follow-up") color = "FFFEF3C7"
    else if (p.category === "Normal") color = "FFDCFCE7"

    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
    row.alignment = { vertical: 'middle', wrapText: true }
    
    // Add borders to cells
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `ward_patients_${new Date().toISOString().split('T')[0]}.xlsx`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Robust CSV Export with UTF-8 BOM and data mapping for clinical fields.
 * Prevents "random characters" in Excel and raw JSON leakage.
 */
export async function exportPatientsToCSV(patients: any[]) {
  const mappedData = patients.map(p => {
    // Sort investigations by date descending to get latest first
    const invs = [...(p.investigations || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const latest = invs[0] || {}

    // Format all labs into a single readable string
    const labHistory = invs.map((inv: any) => {
      const parts = [
        inv.hba1c ? `HbA1c:${inv.hba1c}%` : null,
        inv.hb ? `Hb:${inv.hb}` : null,
        inv.s_creatinine ? `s.Cr:${inv.s_creatinine}` : null,
        inv.s_urea ? `Urea:${inv.s_urea}` : null,
        inv.rbs ? `RBS:${inv.rbs}` : null
      ].filter(Boolean)
      return `${format(parseISO(inv.date), "yyyy-MM-dd")}: [${parts.join(", ")}]`
    }).join(" | ")

    return {
      "Patient Name": p.name,
      "Age": p.age,
      "Gender": p.gender,
      "Category": p.category,
      "Ward": p.ward_number,
      "Chronic Diseases": formatDiseases(p.chronic_diseases),
      "Internal Meds": formatDrugs(p.medical_drugs).join('; '),
      "Psych Meds": formatDrugs(p.psych_drugs).join('; '),
      "Allergies": parseArr(p.allergies).join(', ') || 'None',
      "Past Surgeries": parseArr(p.past_surgeries).join(', ') || 'None',
      "Laboratory History": labHistory || "No labs",
      "Relative Status": p.relative_status,
      "Relative Visits (3mo)": p.relative_visits || 0,
      "Province": p.province,
      "Education": p.education_level,
      "Date of Death": p.date_of_death ? format(parseISO(p.date_of_death), "yyyy-MM-dd HH:mm") : "",
      "Cause of Death": p.cause_of_death || "",
      "Last Category": p.previous_category || (p.category === 'Deceased/Archive' ? "N/A" : ""),
      "System Entry Date": p.created_at ? format(parseISO(p.created_at), "yyyy-MM-dd") : ""
    }
  })

  const csv = Papa.unparse(mappedData)
  
  // ADD UTF-8 BOM (\uFEFF) to fix "random characters" in Excel (Arabic/special chars)
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `alrashad_export_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Advanced Word document generation for one or more patients.
 * Redesigned with individual medication rows and formatted notes.
 */
export async function exportToWord(patients: any[], doctorName: string = "", wardName: string = "") {
  // Use provided values or fall back to localStorage
  if (!doctorName && typeof window !== "undefined") {
    doctorName = localStorage.getItem("wardManager_doctorName") || "Ward Clinician"
  }
  if (!wardName && typeof window !== "undefined") {
    wardName = localStorage.getItem("wardManager_wardName") || "MEDICAL WARD"
  }
  const dynamicWardName = wardName.toUpperCase()

  const sections = patients.map((p, index) => {
    const children: any[] = [
      new Paragraph({
        children: [
          new TextRun({ text: dynamicWardName, bold: true, size: 36, color: "0D9488" }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Attending Doctor: Dr. ${doctorName}`, size: 22, color: "64748B", italics: true }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 600 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: p.name, bold: true, size: 48, color: "1E293B" }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `CLINICAL SUMMARY · ${format(new Date(), "dd MMMM yyyy")}`, size: 18, color: "94A3B8" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),

      new Paragraph({
        children: [new TextRun({ text: "PATIENT DEMOGRAPHICS", bold: true, size: 24, color: "0D9488" })],
        spacing: { after: 200 },
      }),
      
      new Paragraph({
        children: [
          new TextRun({ text: "Age: ", bold: true, size: 20, color: "334155" }),
          new TextRun({ text: `${p.age} Years`, size: 20, color: "000000" }),
          new TextRun({ text: "   |   Gender: ", bold: true, size: 20, color: "334155" }),
          new TextRun({ text: p.gender || "N/A", size: 20, color: "000000" }),
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Ward/Bed: ", bold: true, size: 20, color: "334155" }),
          new TextRun({ text: p.ward_number || "N/A", size: 20, color: "000000" }),
          new TextRun({ text: "   |   Category: ", bold: true, size: 20, color: "334155" }),
          new TextRun({ text: p.category || "Normal", color: p.category === 'Deceased/Archive' ? '64748B' : p.category === 'High Risk' ? 'EF4444' : '0D9488', bold: true, size: 20 }),
        ],
        spacing: { after: 200 },
      }),

      ...(p.category === 'Deceased/Archive' ? [
        new Paragraph({
          children: [new TextRun({ text: "POST-MORTEM INFORMATION", bold: true, size: 20, color: "EF4444" })],
          spacing: { before: 200, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Date & Time of Death: ", bold: true, size: 18, color: "000000" }),
            new TextRun({ text: p.date_of_death ? format(parseISO(p.date_of_death), "dd MMMM yyyy (HH:mm)") : "Unknown", size: 18 }),
          ],
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Official Cause of Death: ", bold: true, size: 18, color: "000000" }),
            new TextRun({ text: p.cause_of_death || "Not specified", size: 18, italics: true }),
          ],
          spacing: { after: 300 }
        })
      ] : []),

      new Paragraph({
        children: [new TextRun({ text: "", size: 1 })], // Spacer
        spacing: { after: 200 },
        border: { bottom: { color: "E2E8F0", space: 1, style: BorderStyle.SINGLE, size: 6 } }
      }),

      new Paragraph({
        children: [new TextRun({ text: "MEDICAL HISTORY & PHARMACOTHERAPY", bold: true, size: 24, color: "0D9488" })],
        spacing: { before: 600, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Chronic Diseases: ", bold: true, size: 20, color: "000000" }),
          new TextRun({ text: formatDiseases(p.chronic_diseases), size: 20, color: "000000" }),
        ],
        spacing: { after: 300 },
      }),
    ]

    // Pharmacology Paragraphs
    const medDrugsList = formatDrugs(p.medical_drugs);
    const psychDrugsList = formatDrugs(p.psych_drugs);

    children.push(new Paragraph({
      children: [new TextRun({ text: "Internal Medical Treatment:", bold: true, size: 20, color: "0D9488" })],
      spacing: { before: 200, after: 120 }
    }));

    if (medDrugsList.length > 0) {
      medDrugsList.forEach((drug: string) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${drug}`, size: 20 })],
          indent: { left: 400 },
          spacing: { after: 60 }
        }));
      });
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "None recorded", size: 20, italics: true, color: "64748B" })],
        indent: { left: 400 },
        spacing: { after: 120 }
      }));
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: "Psychiatric Treatment:", bold: true, size: 20, color: "7C3AED" })],
      spacing: { before: 200, after: 120 }
    }));

    if (psychDrugsList.length > 0) {
      psychDrugsList.forEach((drug: string) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${drug}`, size: 20 })],
          indent: { left: 400 },
          spacing: { after: 60 }
        }));
      });
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "None recorded", size: 20, italics: true, color: "64748B" })],
        indent: { left: 400 },
        spacing: { after: 120 }
      }));
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: "Clinical investigations", bold: true, size: 24, color: "0D9488" })],
      spacing: { before: 600, after: 200 },
    }))

    const invList = p.investigations || [];
    if (invList.length > 0) {
      invList.forEach((inv: any) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Lab Date: ${format(parseISO(inv.date), "dd MMM yyyy")}`, bold: true, size: 22, color: "0D9488" }),
          ],
          spacing: { before: 240, after: 120 },
          border: { bottom: { color: "E2E8F0", space: 1, style: BorderStyle.SINGLE, size: 6 } }
        }));

        const labData = [];
        if (inv.wbc) labData.push(`WBC: ${inv.wbc}`);
        if (inv.hb) labData.push(`Hb: ${inv.hb}`);
        if (inv.hba1c) labData.push(`HbA1c: ${inv.hba1c}%`);
        if (inv.rbs) labData.push(`RBS: ${inv.rbs}`);
        if (inv.s_creatinine) labData.push(`S.Cr: ${inv.s_creatinine}`);
        if (inv.s_urea) labData.push(`Urea: ${inv.s_urea}`);
        if (inv.ast || inv.alt) labData.push(`AST/ALT: ${inv.ast || "-"}/${inv.alt || "-"}`);
        if (inv.tsb) labData.push(`TSB: ${inv.tsb}`);

        if (labData.length > 0) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: labData.join("   |   "), size: 20, color: "334155" })
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 300 }
          }));
        }

        if (inv.notes && inv.notes.trim() !== "") {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "Notes: ", bold: true, size: 18, color: "64748B" }),
              new TextRun({ text: inv.notes, size: 18, color: "64748B", italics: true })
            ],
            spacing: { before: 60, after: 100 },
            indent: { left: 300 }
          }));
        }
      });
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "No comprehensive clinical investigation data found.", italics: true, color: "64748B", size: 18 })],
      }))
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: "CLINICAL PROGRESS NOTES", bold: true, size: 24, color: "0D9488" })],
      spacing: { before: 600, after: 200 },
    }))

    const visitsToPrint = (invList.length > 5 || (p.visits?.length || 0) > 3) 
      ? (p.visits?.slice(0, 1) || []) 
      : (p.visits || [])

    if (visitsToPrint.length > 0) {
      visitsToPrint.forEach((v: any) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Visit Date: ${format(parseISO(v.visit_date), "dd MMM yyyy")}`, bold: true, size: 20, color: "334155" })],
          spacing: { before: 200 },
        }))

        // Vitals Row in Word
        if (v.bp_sys || v.pr || v.spo2 || v.temp) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "VITALS: ", bold: true, size: 18, color: "0D9488" }),
              new TextRun({ 
                text: [
                  v.bp_sys ? `BP: ${v.bp_sys}/${v.bp_dia || '?'}` : null,
                  v.pr ? `PR: ${v.pr}bpm` : null,
                  v.spo2 ? `SpO2: ${v.spo2}%` : null,
                  v.temp ? `Temp: ${v.temp}°C` : null,
                ].filter(Boolean).join("  |  "),
                size: 18,
                color: "334155"
              })
            ],
            spacing: { before: 100, after: 100 },
            indent: { left: 400 },
          }))
        }
        
        // Preserve original formatting by splitting into paragraphs
        const noteLines = (v.exam_notes || "No clinical exam notes recorded.").split("\n")
        noteLines.forEach((line: string) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
            border: {
              left: { color: "0D9488", size: 18, style: BorderStyle.SINGLE },
            },
            shading: { fill: "F8FAFC" },
            indent: { left: 400 },
            spacing: { before: 42, after: 42 },
          }))
        })
      })
      if ((p.visits?.length || 0) > visitsToPrint.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `(Earlier visits truncated for clinical summary length)`, italics: true, size: 16, color: "94A3B8" })],
        }))
      }
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "No visit history records found in this account.", italics: true, color: "64748B", size: 18 })],
      }))
    }

    if (index < patients.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    return { children }
  })

  const doc = new Document({ sections })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  
  const patientName = patients.length === 1 ? patients[0].name.replace(/\s+/g, '_') : "Multiple_Patients"
  const safeWardName = dynamicWardName.replace(/\s+/g, '_')
  const fileName = `${patientName}_${safeWardName}.docx`
  
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * HELPER: Simple Markdown to DOCX Paragraph converter.
 * Handles headings, bold, and list items (bullets).
 */
function parseMarkdownToDocx(md: string): Paragraph[] {
  if (!md) return [new Paragraph({ children: [new TextRun("No discussion recorded.")] })]
  
  const lines = md.split("\n")
  const paragraphs: Paragraph[] = []

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    // Headers
    if (trimmed.startsWith("### ")) {
      paragraphs.push(new Paragraph({ 
        children: [new TextRun({ text: trimmed.replace("### ", ""), bold: true, size: 24 })],
        heading: HeadingLevel.HEADING_3, 
        spacing: { before: 200, after: 120 } 
      }))
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(new Paragraph({ 
        children: [new TextRun({ text: trimmed.replace("## ", ""), bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2, 
        spacing: { before: 240, after: 120 } 
      }))
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(new Paragraph({ 
        children: [new TextRun({ text: trimmed.replace("# ", ""), bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1, 
        spacing: { before: 300, after: 200 } 
      }))
    }
    // Bullet Points
    else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
       paragraphs.push(new Paragraph({ 
         children: [new TextRun({ text: trimmed.slice(2), size: 20 })],
         bullet: { level: 0 },
         spacing: { after: 60 }
       }))
    }
    // Bold / Normal
    else {
      const parts = trimmed.split(/(\*\*.*?\*\*)/g)
      const children = parts.map(p => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return new TextRun({ text: p.slice(2, -2), bold: true, size: 20 })
        }
        return new TextRun({ text: p, size: 20 })
      })
      paragraphs.push(new Paragraph({ children, spacing: { after: 120 } }))
    }
  })

  return paragraphs
}

export interface ResearchExportDetails {
  objective: string;
  varX: string;
  varY: string;
  math: any;
  aiReport: string | null;
  data: any[];
}

/** Constant for Word MIME type */
const WORD_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Strict string conversion and XML-safe sanitization for docx v9 */
function safeStr(v: any): string {
  if (v === null || v === undefined) return "-";
  let s = "";
  if (typeof v === 'object') {
     try { s = JSON.stringify(v); } catch { s = "[Object Error]"; }
  } else {
     s = String(v);
  }
  // Strip control characters (00-1F) except tab (09), LF (0A), CR (0D)
  // This prevents XML corruption in Word documents.
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Professional Medical Publication style export for research results.
 */
export async function exportResearchToWord(details: ResearchExportDetails, doctorName: string = "", wardName: string = "") {
  const { objective, varX, varY, math, aiReport } = details
  
  if (typeof window !== "undefined") {
    if (!doctorName) doctorName = localStorage.getItem("wardManager_doctorName") || "Senior Clinician"
    if (!wardName) wardName = localStorage.getItem("wardManager_wardName") || "ALRASHAD MEDICAL WARD"
  }

  const children: any[] = [
    // Header
    new Paragraph({
      children: [new TextRun({ text: wardName.toUpperCase(), bold: true, size: 36, color: "0D9488" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Professional Clinical Research Narrative · ${format(new Date(), "dd MMM yyyy")}`, size: 16, color: "64748B" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),

    // Section 1: Study Methodology
    new Paragraph({ 
      children: [new TextRun({ text: "STUDY METHODOLOGY", bold: true, size: 28, color: "0D9488" })],
      spacing: { before: 400, after: 200 } 
    }),
    new Paragraph({ children: [new TextRun({ text: "Objective: ", bold: true, size: 20 }), new TextRun({ text: safeStr(objective), size: 20 })].filter(Boolean), spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: "Independent Variable (X): ", bold: true, size: 20 }), new TextRun({ text: safeStr(varX), size: 20 })].filter(Boolean), spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: "Dependent Variable (Y): ", bold: true, size: 20 }), new TextRun({ text: safeStr(varY), size: 20 })].filter(Boolean), spacing: { after: 120 } }),

    // Section 2: Statistical Results Summary
    new Paragraph({ 
      children: [new TextRun({ text: "STATISTICAL SUMMARY", bold: true, size: 28, color: "0D9488" })],
      spacing: { before: 400, after: 200 } 
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Test Performed: ", bold: true, size: 20 }),
        new TextRun({ text: safeStr(math?.test_used), size: 20 })
      ],
      border: { left: { color: "0D9488", size: 12, style: BorderStyle.SINGLE } },
      shading: { fill: "F8FAFC" },
      indent: { left: 400 },
      spacing: { before: 120, after: 120 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "P-Value: ", bold: true, size: 20 }),
        new TextRun({ 
          text: safeStr(math?.p_value), 
          size: 20,
          color: (math?.p_value && math.p_value < 0.05) ? "059669" : "DC2626", 
          bold: (math?.p_value && math.p_value < 0.05)
        })
      ],
      border: { left: { color: (math?.p_value && math.p_value < 0.05) ? "059669" : "DC2626", size: 12, style: BorderStyle.SINGLE } },
      shading: { fill: "F8FAFC" },
      indent: { left: 400 },
      spacing: { before: 120, after: 120 }
    }),

    // Section 3: AI Clinical Interpretation
    new Paragraph({ 
      children: [new TextRun({ text: "CLINICAL RESEARCH NARRATIVE", bold: true, size: 28, color: "4F46E5" })],
      spacing: { before: 600, after: 400 } 
    }),
    ...parseMarkdownToDocx(aiReport || "AI Interpretation was not performed for this study."),

    // Final Footer
    new Paragraph({
      children: [new TextRun({ text: `Report generated on ${format(new Date(), "yyyy-MM-dd HH:mm")}. Attending: Dr. ${doctorName}`, size: 14, italics: true, color: "94A3B8" })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 600 }
    })
  ]

  const doc = new Document({
    sections: [{ children: children.filter(Boolean) }]
  })

  try {
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Research_Narrative_${new Date().toISOString().split('T')[0]}.docx`
    document.body.appendChild(link)
    link.click()
    setTimeout(() => document.body.removeChild(link), 2000)
  } catch (err) {
    console.error("DOCX ERROR:", err)
    alert("Export Error: Failed to generate Word document.")
  }
}

/**
 * EXPORT: Medical Research Tables and Raw Data to Excel
 */
export async function exportResearchToExcel(details: { objective: string, varX: string, varY: string, math: any, data: any[] }) {
  const { objective, varX, varY, math, data } = details
  const workbook = new ExcelJS.Workbook()
  
  // SHEET 1: STATISTICAL RESULTS
  const statSheet = workbook.addWorksheet("Statistical Results")
  statSheet.addRow(["Medical Research Computation Results"]).font = { bold: true, size: 14 }
  statSheet.addRow([`Objective: ${objective}`])
  statSheet.addRow([`Independent (X): ${varX}`])
  statSheet.addRow([`Dependent (Y): ${varY}`])
  statSheet.addRow([])

  statSheet.addRow(["Metric", "Value"]).font = { bold: true }
  statSheet.addRow(["Statistical Test", math?.test_used || "N/A"])
  statSheet.addRow(["P-Value", math?.p_value || 0])
  statSheet.addRow(["Statistic Value", math?.statistic || 0])
  statSheet.addRow(["Sample Size (n)", math?.n_samples || 0])
  statSheet.addRow(["Significance", math?.p_value < 0.05 ? "SIGNIFICANT" : "NOT SIGNIFICANT"])

  statSheet.getColumn(1).width = 25
  statSheet.getColumn(2).width = 40

  // SHEET 2: GROUP DESCRIPTIVES (If available)
  if (math?.descriptives?.groups) {
    const descSheet = workbook.addWorksheet("Group Descriptives")
    descSheet.addRow(["Group Breakdown Analysis"]).font = { bold: true, size: 12 }
    descSheet.addRow(["Group Name", "Mean", "Median", "Std Dev", "Min", "Max", "N"])
    
    Object.entries(math.descriptives.groups).forEach(([name, stats]: [string, any]) => {
      descSheet.addRow([
        name,
        stats.mean || 0,
        stats.median || 0,
        stats.std || 0,
        stats.min || 0,
        stats.max || 0,
        stats.n || 0
      ])
    })
    descSheet.getColumn(1).width = 25
  }

  // SHEET 3: RAW STUDY DATA (Full traceability)
  const rawSheet = workbook.addWorksheet("Raw Research Data")
  rawSheet.columns = [
    { header: "Record #", key: "row", width: 10 },
    { header: "Patient Name", key: "name", width: 25 },
    { header: "Ward", key: "ward", width: 15 },
    { header: "Age", key: "age", width: 10 },
    { header: `Factor X: ${varX}`, key: "x_val", width: 30 },
    { header: `Factor Y: ${varY}`, key: "y_val", width: 30 }
  ]

  // Add the records
  data.forEach((p, i) => {
    rawSheet.addRow({
      row: i + 1,
      name: p.name || "Anonymous",
      ward_number: p.ward_number || "N/A",
      age: p.age || "N/A",
      x_val: p.x_val,
      y_val: p.y_val
    })
  })

  // Style Header
  rawSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  rawSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Research_Tables_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  setTimeout(() => document.body.removeChild(link), 2000)
}

/**
 * Advanced Excel Analytics Exporter.
 * Generates a multi-sheet workbook with raw data and a summary for charting.
 */
export async function exportAnalyticsToExcel(details: { title: string, xLabel: string, yLabel: string, data: any[] }) {
  const { title, xLabel, yLabel, data } = details
  const workbook = new ExcelJS.Workbook()
  
  // SHEET 1: RAW DATA
  const dataSheet = workbook.addWorksheet("Clinical Raw Data")
  dataSheet.columns = [
    { header: "Patient Name", key: "name", width: 25 },
    { header: "Ward", key: "ward", width: 15 },
    { header: "Age", key: "age", width: 10 },
    { header: xLabel, key: "x_val", width: 30 },
    { header: yLabel, key: "y_val", width: 30 }
  ]

  // Header Styling
  dataSheet.getRow(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }
  dataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }
  dataSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

  data.forEach(p => {
    const row = dataSheet.addRow({
      name: p.name,
      ward: p.ward_number || "N/A",
      age: p.age,
      x_val: p.x_val,
      y_val: p.y_val
    })
    
    // Add light clinical alternating borders
    row.eachCell(cell => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
    })
  })

  // SHEET 2: SUMMARY & RELATIONSHIP
  const summarySheet = workbook.addWorksheet("Summary")
  summarySheet.addRow([`Relationship Analysis: ${title}`]).font = { bold: true, size: 14 }
  summarySheet.addRow([`Generated on ${new Date().toLocaleDateString()}`]).font = { italic: true }
  summarySheet.addRow([]) // Spacer

  summarySheet.addRow(["Clinical Relationship Summary Table", "Metric"]).font = { bold: true }
  
  // Calculate average or frequency for summary
  const summaryRows: any[] = []
  if (data.length > 0) {
    const isYContinuous = typeof data[0].y_val === 'number'
    
    if (isYContinuous) {
      // Group by X and Average Y
      const groups: Record<string, number[]> = {}
      data.forEach(d => {
        const xStr = String(d.x_val)
        if (!groups[xStr]) groups[xStr] = []
        groups[xStr].push(Number(d.y_val))
      })
      Object.entries(groups).forEach(([name, vals]) => {
        const avg = vals.reduce((a,b)=>a+b,0) / vals.length
        summaryRows.push([`Category: ${name}`, Number(avg.toFixed(2))])
      })
    } else {
      // Frequency counts
      const counts: Record<string, number> = {}
      data.forEach(d => {
        const xStr = `${d.x_val} -> ${d.y_val}`
        counts[xStr] = (counts[xStr] || 0) + 1
      })
      Object.entries(counts).forEach(([name, count]) => {
        summaryRows.push([name, Number(count)])
      })
    }
  }

  // Summary Rows
  summaryRows.forEach(row => summarySheet.addRow(row))

  // Final Binary Pipe
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Ward_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  
  setTimeout(() => {
    document.body.removeChild(link)
    // Keep URL for stability during disk write
  }, 1000)
}
