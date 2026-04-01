import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from "docx"

/**
 * Exports patient data to a CSV file with UTF-8 BOM for Arabic support in Excel.
 */
export function exportPatientsToCsv(patients: any[]) {
  const headers = ["Patient Name", "Age", "Chronic Diseases", "Last HbA1c", "Last Hb", "Last Visit Date"]
  const rows = patients.map(p => [
    p.name,
    p.age,
    p.chronic_diseases || "None",
    p.lastHba1c || "N/A",
    p.lastHb || "N/A",
    p.lastVisit || "N/A"
  ])

  const csvContent = [headers, ...rows]
    .map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  // Add UTF-8 BOM for Excel Arabic support
  const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `patients_export_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Creates a Word document for one or more patients.
 */
export async function exportToWord(patients: any[]) {
  const sections = patients.map((p, index) => {
    const children: any[] = [
      new Paragraph({
        text: p.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Demographics & Info", bold: true, size: 28 }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Age: `, bold: true }),
          new TextRun(`${p.age} years`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Ward/Bed: `, bold: true }),
          new TextRun(`${p.ward_number || "N/A"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Gender: `, bold: true }),
          new TextRun(`${p.gender || "Not specified"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Category: `, bold: true }),
          new TextRun(`${p.category || "Normal"}`),
        ],
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "Medical History", bold: true, size: 28 }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Chronic Diseases: `, bold: true }),
          new TextRun(`${p.chronic_diseases || "None recorded"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Past Surgeries: `, bold: true }),
          new TextRun(`${p.past_surgeries || "None recorded"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Allergies: `, bold: true }),
          new TextRun(`${p.allergies || "No known allergies"}`),
        ],
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "Medications", bold: true, size: 28 }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Internal Medical: `, bold: true }),
          new TextRun(`${p.medical_drugs || "None"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Psychiatric: `, bold: true }),
          new TextRun(`${p.psych_drugs || "None"}`),
        ],
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "Latest Clinical Summary", bold: true, size: 28 }),
        ],
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Last Visit: `, bold: true }),
          new TextRun(`${p.lastVisit || "No visits recorded"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Last HbA1c: `, bold: true }),
          new TextRun(`${p.lastHba1c ?? "N/A"}`),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Last Hb: `, bold: true }),
          new TextRun(`${p.lastHb ?? "N/A"}`),
        ],
      }),
    ]

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
  link.setAttribute("download", patients.length === 1 ? `patient_${patients[0].name}.docx` : `patients_export_${new Date().toISOString().split('T')[0]}.docx`)
  link.click()
}
