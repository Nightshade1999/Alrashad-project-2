import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx"
import ExcelJS from "exceljs"
import { format, parseISO } from "date-fns"

/**
 * Exports patient data to an Excel file with category-based row coloring and bold headers.
 */
export async function exportPatientsToExcel(patients: any[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Patients")

  worksheet.columns = [
    { header: "Patient Name", key: "name", width: 30 },
    { header: "Age", key: "age", width: 10 },
    { header: "Category", key: "category", width: 20 },
    { header: "Ward/Bed", key: "ward", width: 15 },
    { header: "Chronic Diseases", key: "diseases", width: 35 },
    { header: "Last HbA1c", key: "hba1c", width: 12 },
    { header: "Last Hb", key: "hb", width: 12 },
    { header: "Last Visit Date", key: "lastVisit", width: 20 }
  ]

  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D9488" } // Teal-600
  }

  patients.forEach((p, index) => {
    const row = worksheet.addRow({
      name: p.name,
      age: p.age,
      category: p.category,
      ward: p.ward_number,
      diseases: p.chronic_diseases || "None",
      hba1c: p.lastHba1c ?? "N/A",
      hb: p.lastHb ?? "N/A",
      lastVisit: p.lastVisit ? format(parseISO(p.lastVisit), "dd MMM yyyy") : "No visits"
    })

    // Apply category coloring
    let color = "FFFFFFFF" // White default
    if (p.category === "High Risk") color = "FFFEE2E2" // Red-100
    else if (p.category === "Close Follow-up") color = "FFFEF3C7" // Amber-100
    else if (p.category === "Normal") color = "FFDCFCE7" // Green-100

    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `patients_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  link.click()
}

/**
 * Advanced Word document generation for one or more patients.
 */
export async function exportToWord(patients: any[], doctorEmail: string = "") {
  // Doctor name mapping
  let doctorName = "Ward Clinician"
  if (doctorEmail.includes("ahmed")) doctorName = "Dr. Ahmed Safaa"
  else if (doctorEmail.includes("zahraa")) doctorName = "Dr. Zahraa"

  const sections = patients.map((p, index) => {
    const children: any[] = [
      // Header Section
      new Paragraph({
        children: [
          new TextRun({ text: "ALRASHAD MEDICAL CENTER", bold: true, size: 20, color: "0D9488" }),
        ],
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Attending: ${doctorName}`, size: 18, color: "64748B" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 400 },
      }),

      // Patient Title
      new Paragraph({
        text: p.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `Patient Clinical Summary - Exported ${format(new Date(), "dd MMM yyyy")}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),

      // Info Grid
      new Paragraph({
        children: [
          new TextRun({ text: "Demographics", bold: true, size: 24, underline: {} }),
        ],
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Age: `, bold: true }),
          new TextRun(`${p.age} years  |  `),
          new TextRun({ text: `Gender: `, bold: true }),
          new TextRun(`${p.gender || "Not specified"}  |  `),
          new TextRun({ text: `Ward/Bed: `, bold: true }),
          new TextRun(`${p.ward_number || "N/A"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Category: `, bold: true }),
          new TextRun({ text: p.category || "Normal", color: p.category === 'High Risk' ? "EF4444" : "0F172A" }),
        ],
      }),

      // Medical History
      new Paragraph({
        children: [
          new TextRun({ text: "Medical History", bold: true, size: 24, underline: {} }),
        ],
        spacing: { before: 400, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Chronic Diseases: `, bold: true }),
          new TextRun(`${p.chronic_diseases || "None recorded"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Medications: `, bold: true }),
          new TextRun(`${[p.medical_drugs, p.psych_drugs].filter(Boolean).join(", ") || "None recorded"}`),
        ],
      }),

      // Investigations Table
      new Paragraph({
        children: [
          new TextRun({ text: "Clinical Investigations", bold: true, size: 24, underline: {} }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    ]

    // Build Investigations Table
    if (p.investigations?.length > 0) {
      const rows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })], shading: { fill: "F1F5F9" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "HbA1c (%)", bold: true })] })], shading: { fill: "F1F5F9" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hb (g/dL)", bold: true })] })], shading: { fill: "F1F5F9" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Notes", bold: true })] })], shading: { fill: "F1F5F9" } }),
          ],
        }),
        ...p.investigations.map((inv: any) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(format(parseISO(inv.date), "dd MMM yyyy"))] }),
            new TableCell({ children: [new Paragraph(inv.hba1c?.toString() || "-")] }),
            new TableCell({ children: [new Paragraph(inv.hb?.toString() || "-")] }),
            new TableCell({ children: [new Paragraph(inv.notes || "-")] }),
          ],
        }))
      ]
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows,
      }))
    } else {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "No lab results found.", italics: true, color: "64748B" })
        ]
      }))
    }

    // Visits Section
    children.push(new Paragraph({
      children: [
        new TextRun({ text: "Progress Notes / Last Visit", bold: true, size: 24, underline: {} }),
      ],
      spacing: { before: 400, after: 200 },
    }))

    // Logic for visits: If many investigations or many visits, only show last visit as requested
    const visitsToShow = (p.investigations?.length > 5 || p.visits?.length > 3) 
      ? (p.visits?.slice(0, 1) || []) 
      : (p.visits || [])

    if (visitsToShow.length > 0) {
      visitsToShow.forEach((v: any) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `Date: ${format(parseISO(v.visit_date), "dd MMM yyyy")}`, bold: true, color: "0D9488" }),
          ],
          spacing: { before: 100 },
        }))
        children.push(new Paragraph({
          children: [
            new TextRun(v.notes || "No notes recorded."),
          ],
          border: {
            left: { color: "0D9488", size: 12, style: BorderStyle.SINGLE },
          },
          indent: { left: 400 },
          spacing: { after: 200 },
        }))
      })
      if (p.visits?.length > visitsToShow.length) {
        children.push(new Paragraph({ 
          children: [
            new TextRun({ 
              text: `... additional visits truncated to maintain document layout ...`, 
              italics: true, 
              size: 16, 
              color: "64748B" 
            })
          ]
        }))
      }
    } else {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "No clinical visits recorded.", italics: true, color: "64748B" })
        ]
      }))
    }

    // Add page break if it's not the last patient
    if (index < patients.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    return {
      properties: {},
      children: children,
    }
  })

  const doc = new Document({
    sections: sections
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", patients.length === 1 ? `clinical_summary_${patients[0].name.replace(/\s+/g, '_')}.docx` : `ward_export_${format(new Date(), "yyyyMMdd")}.docx`)
  link.click()
}
