import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, BorderStyle, WidthType, VerticalAlign } from "docx"
import ExcelJS from "exceljs"
import { format, parseISO } from "date-fns"

/**
 * Helper to create a premium table cell with padding and alignment
 */
function createTableCell(content: string | number | null | undefined, isHeader = false, bgColor?: string, isAlert = false) {
  const textVal = (content === null || content === undefined || content === "") ? "-" : String(content);
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: textVal,
            bold: isHeader || isAlert,
            size: isHeader ? 22 : 20, 
            color: isAlert ? "EF4444" : (isHeader ? "FFFFFF" : (bgColor === "F8FAFC" ? "334155" : "000000"))
          })
        ],
        alignment: AlignmentType.CENTER,
      })
    ],
    shading: isHeader ? { fill: bgColor || "0D9488" } : (bgColor ? { fill: bgColor } : undefined)
  })
}

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
    { header: "Ward/Bed", key: "ward", width: 15 },
    { header: "Chronic Diseases", key: "diseases", width: 40 },
    { header: "Current Meds", key: "meds", width: 40 },
    { header: "Last Visit", key: "lastVisit", width: 20 }
  ]

  worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

  patients.forEach((p) => {
    const row = worksheet.addRow({
      name: p.name,
      age: p.age,
      category: p.category,
      ward: p.ward_number,
      diseases: p.chronic_diseases || "None",
      meds: [p.medical_drugs, p.psych_drugs].filter(Boolean).join(", ") || "None",
      lastVisit: p.lastVisit ? format(parseISO(p.lastVisit), "dd MMM yyyy") : "No visits"
    })

    let color = "FFFFFFFF"
    if (p.category === "High Risk") color = "FFFEE2E2"
    else if (p.category === "Close Follow-up") color = "FFFEF3C7"
    else if (p.category === "Normal") color = "FFDCFCE7"

    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }
    row.alignment = { vertical: 'middle', wrapText: true }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `ward_patients_${new Date().toISOString().split('T')[0]}.xlsx`)
  link.click()
}

/**
 * Advanced Word document generation for one or more patients.
 * Redesigned with individual medication rows and formatted notes.
 */
export async function exportToWord(patients: any[], doctorEmail: string = "") {
  let doctorName = "Ward Clinician"
  if (doctorEmail.includes("ahmed")) doctorName = "Dr. Ahmed Safaa"
  else if (doctorEmail.includes("zahraa")) doctorName = "Dr. Zahraa"

  const sections = patients.map((p, index) => {
    const children: any[] = [
      new Paragraph({
        children: [
          new TextRun({ text: "ALRASHAD MEDICAL WARD", bold: true, size: 36, color: "0D9488" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Attending Doctor: ${doctorName}`, size: 22, color: "64748B", italics: true }),
        ],
        alignment: AlignmentType.RIGHT,
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
      
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Age:", bold: true, size: 20 })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${p.age} Years`, size: 20 })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gender:", bold: true, size: 20 })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.gender || "N/A", size: 20 })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ward/Bed:", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.ward_number || "N/A", size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Category:", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.category || "Normal", color: p.category === 'High Risk' ? 'EF4444' : '0D9488', bold: true, size: 20 })] })] }),
            ],
          }),
        ],
      }),

      new Paragraph({
        children: [new TextRun({ text: "MEDICAL HISTORY & PHARMACOTHERAPY", bold: true, size: 24, color: "0D9488" })],
        spacing: { before: 600, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Chronic Diseases: ", bold: true, size: 20, color: "000000" }),
          new TextRun({ text: p.chronic_diseases || "None recorded", size: 20, color: "000000" }),
        ],
        spacing: { after: 300 },
      }),
    ]

    // Multi-row Medications Table
    const medDrugsList = (p.medical_drugs || "").split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
    const psychDrugsList = (p.psych_drugs || "").split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
    const maxMeds = Math.max(medDrugsList.length, psychDrugsList.length, 1)

    const medRows = [
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Internal Medical Treatment", bold: true, size: 20, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "0D9488" }
          }),
          new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ text: "Psychiatric Treatment", bold: true, size: 20, color: "FFFFFF" })],
              alignment: AlignmentType.CENTER
            })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "7C3AED" }
          }),
        ],
      })
    ]

    for (let i = 0; i < maxMeds; i++) {
      medRows.push(new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: medDrugsList[i] || "-", size: 20 })], alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: psychDrugsList[i] || "-", size: 20 })], alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }))
    }

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "F1F5F9" },
      },
      rows: medRows
    }))

    children.push(new Paragraph({
      children: [new TextRun({ text: "CLINICAL INVESTIGATIONS HISTORY (ALL PARAMETERS)", bold: true, size: 24, color: "0D9488" })],
      spacing: { before: 600, after: 200 },
    }))

    const invList = p.investigations || []
    if (invList.length > 0) {
      children.push(new Table({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        },
        rows: [
          new TableRow({
            children: [
              createTableCell("Date", true),
              createTableCell("WBC", true),
              createTableCell("Hb", true),
              createTableCell("HbA1c", true),
              createTableCell("RBS", true),
              createTableCell("S.Cr", true),
              createTableCell("Urea", true),
              createTableCell("AST/ALT", true),
              createTableCell("TSB", true),
              createTableCell("Notes", true),
            ]
          }),
          ...invList.map((inv: any) => {
            const isWbcAlert = inv.wbc && (inv.wbc > 11 || inv.wbc < 4)
            const isHbAlert = inv.hb && inv.hb < 10
            const isHba1cAlert = inv.hba1c && inv.hba1c > 6.5
            const isRbsAlert = inv.rbs && inv.rbs > 200
            const isCreatAlert = inv.s_creatinine && inv.s_creatinine > 1.2
            const isUreaAlert = inv.s_urea && inv.s_urea > 40
            const isTsbAlert = inv.tsb && inv.tsb > 1.2
            const isAstAlert = inv.ast && inv.ast > 40
            const isAltAlert = inv.alt && inv.alt > 40
            
            return new TableRow({
              children: [
                createTableCell(format(parseISO(inv.date), "dd MMM yy")),
                createTableCell(inv.wbc, false, undefined, isWbcAlert),
                createTableCell(inv.hb, false, undefined, isHbAlert),
                createTableCell(inv.hba1c, false, undefined, isHba1cAlert),
                createTableCell(inv.rbs, false, undefined, isRbsAlert),
                createTableCell(inv.s_creatinine, false, undefined, isCreatAlert),
                createTableCell(inv.s_urea, false, undefined, isUreaAlert),
                createTableCell(`${inv.ast || "-"}/${inv.alt || "-"}`, false, undefined, isAstAlert || isAltAlert),
                createTableCell(inv.tsb, false, undefined, isTsbAlert),
                createTableCell(inv.notes, false, "FDFDFD"),
              ]
            })
          })
        ]
      }))
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
  link.setAttribute("href", url)
  link.setAttribute("download", `clinical_report_${format(new Date(), "yyyyMMdd")}.docx`)
  link.click()
}
