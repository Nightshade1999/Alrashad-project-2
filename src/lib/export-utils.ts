import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, BorderStyle, WidthType, VerticalAlign } from "docx"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { format, parseISO } from "date-fns"
import { isLabAbnormal } from "./utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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
      const otherLabsFormat = Array.isArray(inv.other_labs) ? inv.other_labs.map((o:any)=>`${o.name}:${o.value}`) : [];
      const parts = [
        inv.hba1c ? `HbA1c:${inv.hba1c}%` : null,
        inv.hb ? `Hb:${inv.hb}` : null,
        inv.wbc ? `WBC:${inv.wbc}` : null,
        inv.s_creatinine ? `Cr:${inv.s_creatinine}` : null,
        inv.s_urea ? `Urea:${inv.s_urea}` : null,
        inv.ast ? `AST:${inv.ast}` : null,
        inv.alt ? `ALT:${inv.alt}` : null,
        inv.tsb ? `TSB:${inv.tsb}` : null,
        inv.esr ? `ESR:${inv.esr}` : null,
        inv.crp ? `CRP:${inv.crp}` : null,
        inv.rbs ? `RBS:${inv.rbs}` : null,
        ...otherLabsFormat
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
    const isER = p.is_in_er || false;

    const visitsForDoc = (p.visits || []).filter((v: any) => isER ? v.is_er : !v.is_er);
    visitsForDoc.sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    const targetVisit = visitsForDoc.length > 0 ? visitsForDoc[0] : (p.visits?.[0] || null);

    let docLabs = (p.investigations || []).filter((inv: any) => isER ? inv.is_er : !inv.is_er);
    if (docLabs.length === 0 && p.investigations?.length > 0) docLabs = [p.investigations[0]];

    const noteLines = targetVisit ? (targetVisit.exam_notes || "").split("\n").length : 1;
    const admissionNoteLines = (p.er_admission_notes || "").split("\n").length;
    const medsCount = parseArr(p.medical_drugs).length + parseArr(p.psych_drugs).length;
    const erTxCount = parseArr(p.er_treatment).length;

    const projectedLines = 6 +
      Math.max(5 + medsCount, isER ? 6 + admissionNoteLines : 8) +
      Math.max(5, 2 + noteLines) +
      (isER ? 2 + erTxCount : 0) +
      2 + Math.min(5, docLabs.length);

    let fontSizeOffset = 0;
    let limitLabs = false;
    const threshold = isER ? 34 : 48;
    if (projectedLines > threshold) {
       fontSizeOffset = 2;
       if (projectedLines > (threshold + 12)) limitLabs = true;
    }

    const sz = (baseValue: number) => Math.max(16, baseValue - fontSizeOffset);
    const themeColor = isER ? "BE123C" : "0F172A";
    const secondaryColor = "0D9488";

    const children: any[] = [];

    const noBorders = {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    };

    // ═══════════════════════════════════════
    // 1. HEADER
    // ═══════════════════════════════════════
    children.push(new Paragraph({
      children: [new TextRun({ text: `Dr. ${doctorName}`, bold: true, size: sz(28), color: secondaryColor })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: isER ? "CLINICAL SUMMARY & EMERGENCY EVALUATION" : "PATIENT CLINICAL SUMMARY",
        bold: true, size: sz(36), color: "1E293B"
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: format(new Date(), "dd MMMM yyyy"), size: sz(18), color: "94A3B8" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }));

    // ═══════════════════════════════════════
    // 2. DEMOGRAPHICS | CONTEXT (same for both)
    // ═══════════════════════════════════════
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.TOP,
              margins: { right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "I. PATIENT DEMOGRAPHICS", bold: true, size: sz(20), color: secondaryColor })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "Name: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: p.name, bold: true, size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Province / Edu: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: `${p.province || "N/A"} / ${p.education_level || "N/A"}`, size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Age / Gender: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: `${p.age}y / ${p.gender}`, size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Primary Ward: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: p.ward_name || wardName || "General Ward", size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Chronic Diseases:", bold: true, size: sz(18), color: "64748B" })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: formatDiseases(p.chronic_diseases), size: sz(18), italics: true })], spacing: { after: 120 } }),
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.TOP,
              margins: { left: 200 },
              shading: { fill: isER ? "FFF1F2" : "F8FAFC" },
              children: isER ? [
                new Paragraph({ children: [new TextRun({ text: "II. ER ADMISSION NOTE", bold: true, size: sz(20), color: themeColor })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "Adm. Date: ", bold: true, size: sz(18) }), new TextRun({ text: p.er_admission_date ? format(parseISO(p.er_admission_date), "dd MMM HH:mm") : "N/A", size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Referring Doctor: ", bold: true, size: sz(18) }), new TextRun({ text: `Dr. ${p.er_admission_doctor || "Unknown"}`, size: sz(18) })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "CHIEF COMPLAINT:", bold: true, size: sz(18), color: themeColor })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: `"${p.er_chief_complaint || 'None recorded'}"`, size: sz(18), bold: true, italics: true })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "ADMISSION NOTES:", bold: true, size: sz(18) })], spacing: { after: 40 } }),
                ...(p.er_admission_notes || "No admission notes.").split("\n").map((line: string) =>
                  new Paragraph({ children: [new TextRun({ text: line, size: sz(18) })], spacing: { after: 40 } })
                )
              ] : [
                new Paragraph({ children: [new TextRun({ text: "II. LONG-TERM MEDICAL HISTORY", bold: true, size: sz(20), color: themeColor })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "Surgical History:", bold: true, size: sz(18), color: "64748B" })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: parseArr(p.past_surgeries).join(", ") || "No surgical history recorded.", size: sz(18) })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "Known Allergies:", bold: true, size: sz(18), color: "BE123C" })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: parseArr(p.allergies).join(", ") || "None recorded", size: sz(18), bold: parseArr(p.allergies).length > 0 })], spacing: { after: 120 } }),
                new Paragraph({ children: [new TextRun({ text: "Relative Contact:", bold: true, size: sz(18), color: "64748B" })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: p.relative_status === 'Known' ? `Family known (${p.relative_visits || '0'} visits / 3mo)` : "No family contact recorded.", size: sz(18) })], spacing: { after: 80 } }),
              ]
            }),
          ]
        })
      ]
    }));

    children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }));

    // ═══════════════════════════════════════
    // WARD: 3. MEDICATIONS (side-by-side Medical | Psych) then 4. VITALS | PROGRESS then 5. LABS
    // ER:   3. VITALS | PROGRESS then 4. ER TREATMENT then 5. LABS
    // ═══════════════════════════════════════

    if (!isER) {
      // ── WARD SECTION III: Two-Column Medications ──
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              // LEFT: Medical Medications
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "III. ONGOING MEDICAL TREATMENT", bold: true, size: sz(20), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(parseArr(p.medical_drugs).length > 0
                    ? parseArr(p.medical_drugs).map((d: any) =>
                        new Paragraph({ children: [new TextRun({ text: `• ${d.name || d} ${d.dosage || ""} — ${d.frequency || ""}`, size: sz(18) })], indent: { left: 140 }, spacing: { after: 40 } })
                      )
                    : [new Paragraph({ children: [new TextRun({ text: "No medical medications.", size: sz(18), italics: true })], indent: { left: 140 } })]
                  )
                ]
              }),
              // RIGHT: Psych Medications
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { left: 200 },
                shading: { fill: "F0FDFA" },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "III. ONGOING PSYCHIATRIC TREATMENT", bold: true, size: sz(20), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(parseArr(p.psych_drugs).length > 0
                    ? parseArr(p.psych_drugs).map((d: any) =>
                        new Paragraph({ children: [new TextRun({ text: `• ${d.name || d} ${d.dosage || ""} — ${d.frequency || ""}`, size: sz(18) })], indent: { left: 140 }, spacing: { after: 40 } })
                      )
                    : [new Paragraph({ children: [new TextRun({ text: "No psychiatric medications.", size: sz(18), italics: true })], indent: { left: 140 } })]
                  )
                ]
              }),
            ]
          })
        ]
      }));

      children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }));

      // ── WARD SECTION IV: Vitals | Progress ──
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "IV. VITALS", bold: true, size: sz(18), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(targetVisit ? [
                    new Paragraph({ children: [new TextRun({ text: "BP: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.bp_sys ? `${targetVisit.bp_sys}/${targetVisit.bp_dia || '?'}` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "PR: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.pr ? `${targetVisit.pr} bpm` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "SpO2: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.spo2 ? `${targetVisit.spo2}%` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "Temp: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.temp ? `${targetVisit.temp}°C` : "N/A", size: sz(22) })], }),
                  ] : [new Paragraph({ children: [new TextRun({ text: "No current vitals.", size: sz(22), italics: true })] })])
                ]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { left: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "V. LATEST CLINICAL PROGRESS EVALUATION", bold: true, size: sz(18), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(targetVisit ?
                    (targetVisit.exam_notes || "").split("\n").map((line: string) =>
                      new Paragraph({ children: [new TextRun({ text: line, size: sz(22) })], spacing: { after: 40 } })
                    )
                  : [new Paragraph({ children: [new TextRun({ text: "No follow-up clinical notes recorded.", size: sz(22), italics: true })] })])
                ]
              }),
            ]
          })
        ]
      }));

    } else {
      // ── ER SECTION III/IV: Vitals | Progress (same as before) ──
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "III. VITALS", bold: true, size: sz(18), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(targetVisit ? [
                    new Paragraph({ children: [new TextRun({ text: "BP: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.bp_sys ? `${targetVisit.bp_sys}/${targetVisit.bp_dia || '?'}` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "PR: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.pr ? `${targetVisit.pr} bpm` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "SpO2: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.spo2 ? `${targetVisit.spo2}%` : "N/A", size: sz(22) })], spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: "Temp: ", bold: true, size: sz(22) }), new TextRun({ text: targetVisit.temp ? `${targetVisit.temp}°C` : "N/A", size: sz(22) })], }),
                  ] : [new Paragraph({ children: [new TextRun({ text: "No current vitals.", size: sz(22), italics: true })] })])
                ]
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                margins: { left: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "IV. EMERGENCY CLINICAL EVALUATION", bold: true, size: sz(18), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(targetVisit ?
                    (targetVisit.exam_notes || "").split("\n").map((line: string) =>
                      new Paragraph({ children: [new TextRun({ text: line, size: sz(22) })], spacing: { after: 40 } })
                    )
                  : [new Paragraph({ children: [new TextRun({ text: "No follow-up clinical notes recorded.", size: sz(22), italics: true })] })])
                ]
              }),
            ]
          })
        ]
      }));

      children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }));

      // ── ER SECTION V: Emergency Treatment (banner style) ──
      children.push(new Paragraph({
        children: [new TextRun({ text: "V. EMERGENCY PHARMACOLOGICAL TREATMENT", bold: true, size: sz(20), color: "FFFFFF" })],
        shading: { fill: themeColor },
        spacing: { before: 120, after: 120 },
        indent: { left: 120 }
      }));

      const erMeds = parseArr(p.er_treatment);
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: erMeds.length > 0
                ? erMeds.map((t: any) =>
                    new Paragraph({ children: [new TextRun({ text: `• ${t.name} ${t.dosage || ""} — ${t.frequency || ""}`, bold: true, size: sz(22) })], indent: { left: 240 }, spacing: { before: 60, after: 60 } })
                  )
                : [new Paragraph({ children: [new TextRun({ text: "No emergency treatment recorded.", size: sz(22), italics: true })], indent: { left: 240 } })]
              })
            ]
          })
        ]
      }));
    }

    children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }));

    // ═══════════════════════════════════════
    // LAST: LAB VALUES (same for both)
    // ═══════════════════════════════════════
    children.push(new Paragraph({
      children: [new TextRun({ text: isER ? "VI. EMERGENCY LABORATORY FINDINGS" : "VI. CLINICAL LABORATORY FINDINGS", bold: true, size: sz(20), color: secondaryColor })],
      spacing: { after: 120 },
      border: { bottom: { color: "E2E8F0", space: 1, style: BorderStyle.SINGLE, size: 6 } }
    }));

    docLabs.sort((a: any, b: any) => {
      const d1 = new Date(b.date || b.created_at).getTime();
      const d2 = new Date(a.date || a.created_at).getTime();
      return (isNaN(d1) ? 0 : d1) - (isNaN(d2) ? 0 : d2);
    });

    const labsToPrint = limitLabs ? docLabs.slice(0, 1) : docLabs.slice(0, 6);

    if (labsToPrint.length > 0) {
      labsToPrint.forEach((inv: any) => {
        const labEntries: any[] = [
          { key: 'hb', label: 'Hb', val: inv.hb },
          { key: 'wbc', label: 'WBC', val: inv.wbc },
          { key: 's_creatinine', label: 'Cr', val: inv.s_creatinine },
          { key: 's_urea', label: 'Urea', val: inv.s_urea },
          { key: 'ast', label: 'AST', val: inv.ast },
          { key: 'alt', label: 'ALT', val: inv.alt },
          { key: 'rbs', label: 'RBS', val: inv.rbs },
          { key: 'tsb', label: 'TSB', val: inv.tsb },
          { key: 'hba1c', label: 'HbA1c', val: inv.hba1c },
          { key: 'esr', label: 'ESR', val: inv.esr },
          { key: 'crp', label: 'CRP', val: inv.crp },
        ];

        const otherLabs = Array.isArray(inv.other_labs) ? inv.other_labs : [];
        otherLabs.forEach((o: any) => { labEntries.push({ key: o.name, label: o.name, val: o.value }); });

        const activeLabs = labEntries.filter((l: any) => l.val !== null && l.val !== undefined && l.val !== "");
        const labRuns: any[] = [];
        activeLabs.forEach((lab: any, idx: number) => {
          const isAbnormal = isLabAbnormal(lab.key, lab.val);
          labRuns.push(new TextRun({ text: `${lab.label}: `, size: sz(18), bold: true, color: "64748B" }));
          labRuns.push(new TextRun({
             text: `${lab.val}${idx < activeLabs.length - 1 ? " | " : ""}`,
             size: sz(18), bold: isAbnormal, color: isAbnormal ? "DC2626" : "1E293B"
          }));
        });

        const dateStr = inv.date || inv.created_at || new Date().toISOString();
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${format(parseISO(dateStr), isER ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy")}  -->  `, bold: true, size: sz(18), color: secondaryColor }),
            ...labRuns
          ],
          indent: { left: 240 },
          spacing: { after: 120 }
        }));
      });
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "No lab investigations found.", size: sz(16), italics: true, color: "64748B" })],
        indent: { left: 240 }
      }));
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
 * Prepares text for jsPDF rendering with correct Arabic/RTL support.
 *
 * jsPDF's processArabic() already does two things:
 *   1. Reshapes Arabic letters into contextual glyph forms (cursive connection)
 *   2. Reorders the characters into visual (LTR-canvas) order for rendering
 *
 * DO NOT reverse the result — that would undo the visual ordering and break it.
 * Simply pass the full string through processArabic and render it normally.
 */
function prepareClinicalText(doc: any, text: string = ""): string {
  if (!text) return "";
  if (typeof text !== 'string') text = String(text);

  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (!hasArabic) return text;

  // Process line by line to preserve newlines
  return text.split("\n").map(line => {
    if (!/[\u0600-\u06FF]/.test(line)) return line;

    // If processArabic is available, use it on the whole line.
    // It handles shaping + visual reordering — no extra reversal needed.
    if (doc && typeof doc.processArabic === 'function') {
      return doc.processArabic(line.trim());
    }

    // Fallback when processArabic is unavailable: return as-is.
    // jsPDF with Identity-H encoding will render Arabic in storage order,
    // which at minimum shows glyph boxes for each character.
    return line;
  }).join("\n");
}


/**
 * PDF Export via HTML + window.print()
 *
 * WHY: jsPDF cannot correctly render Arabic bidirectional text regardless of font
 * embedding. The browser's own rendering engine handles Arabic RTL perfectly.
 *
 * HOW: Build a styled HTML document, open in a new tab, auto-trigger window.print().
 * The user saves as PDF from the native print dialog.
 */
export async function exportToPdf(patients: any[], doctorName: string = "", wardName: string = "") {
  if (!doctorName && typeof window !== "undefined") {
    doctorName = localStorage.getItem("wardManager_doctorName") || "Ward Clinician";
  }
  if (!wardName && typeof window !== "undefined") {
    wardName = localStorage.getItem("wardManager_wardName") || "MEDICAL WARD";
  }

  const dateStr = format(new Date(), "dd MMMM yyyy");

  const patientPages = patients.map((p) => {
    const isER = p.is_in_er || false;
    const themeHex = isER ? "#BE123C" : "#0F172A";
    const tealHex = "#0D9488";

    const visitsForDoc = (p.visits || []).filter((v: any) => isER ? v.is_er : !v.is_er);
    visitsForDoc.sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    const targetVisit = visitsForDoc[0] || p.visits?.[0] || null;

    // --- ONE PAGE RULE: LINE PROJECTION ENGINE ---
    const noteLines = targetVisit ? (targetVisit.exam_notes || "").split("\n").length : 1;
    const admissionNoteLines = (p.er_admission_notes || "").split("\n").length;
    const medsCount = parseArr(p.medical_drugs).length + parseArr(p.psych_drugs).length;
    const erTxCount = parseArr(p.er_treatment).length;

    const projectedLines = 6 +
      Math.max(5 + medsCount, isER ? 6 + admissionNoteLines : 8) +
      Math.max(5, 2 + noteLines) +
      (isER ? 2 + erTxCount : 0) +
      10; // Extra buffer for headers/demographics/vitals

    let fontSizeRem = 0.82;
    let limitLabs = false;
    const threshold = isER ? 36 : 50; // Slightly higher than Word for PDF compactness
    if (projectedLines > threshold) {
       fontSizeRem = 0.72; // Reduce by ~1pt equivalent in rem
       if (projectedLines > (threshold + 12)) limitLabs = true;
    }

    let docLabs = (p.investigations || []).filter((inv: any) => isER ? inv.is_er : !inv.is_er);
    if (docLabs.length === 0 && p.investigations?.length > 0) docLabs = [p.investigations[0]];
    docLabs.sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
    const labsToPrint = limitLabs ? docLabs.slice(0, 1) : docLabs.slice(0, 5);

    // Wraps Arabic text in an RTL span; browser renders it correctly natively
    const field = (val: string | null | undefined, fallback = "N/A"): string => {
      const text = String(val || fallback).trim();
      return /[\u0600-\u06FF]/.test(text)
        ? `<span dir="rtl" style="font-family:'Noto Sans Arabic',sans-serif;unicode-bidi:embed;">${text}</span>`
        : `<span>${text}</span>`;
    };

    const drugsHtml = (arr: any[]): string =>
      arr.length > 0
        ? arr.map((d: any) => `<li>${field(`${d.name || d} ${d.dosage || ""} \u2014 ${d.frequency || ""}`)}</li>`).join("")
        : `<li style="color:#94a3b8;font-style:italic;">None recorded</li>`;

    const labsHtml = labsToPrint.map((inv: any) => {
      const invDate = format(parseISO(inv.date || inv.created_at), isER ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
      const entries: {key: string; label: string; val: any}[] = [
        { key: "hb", label: "Hb", val: inv.hb },
        { key: "wbc", label: "WBC", val: inv.wbc },
        { key: "s_creatinine", label: "Cr", val: inv.s_creatinine },
        { key: "s_urea", label: "Urea", val: inv.s_urea },
        { key: "ast", label: "AST", val: inv.ast },
        { key: "alt", label: "ALT", val: inv.alt },
        { key: "rbs", label: "RBS", val: inv.rbs },
        { key: "tsb", label: "TSB", val: inv.tsb },
        { key: "hba1c", label: "HbA1c", val: inv.hba1c },
        { key: "esr", label: "ESR", val: inv.esr },
        { key: "crp", label: "CRP", val: inv.crp },
        ...(Array.isArray(inv.other_labs) ? inv.other_labs.map((o: any) => ({ key: o.name, label: o.name, val: o.value })) : []),
      ].filter(e => e.val !== null && e.val !== undefined && e.val !== "");

      const parts = entries.map(e => {
        const abn = isLabAbnormal(e.key, e.val);
        return `<span><strong style="color:#64748b;">${e.label}:</strong> <span style="${abn ? "color:#DC2626;font-weight:700;" : ""}">${e.val}</span></span>`;
      }).join(" &nbsp;|&nbsp; ");

      return `<div class="lab-row"><span class="lab-date" style="color:${tealHex};">${invDate}</span> &rarr; ${parts || "No values"}</div>`;
    }).join("") || `<p style="color:#94a3b8;font-style:italic;">No laboratory investigations found.</p>`;

    const sectionII = isER ? `
      <div class="cell cell-alt">
        <h4 style="color:${themeHex};">II. ER ADMISSION NOTE</h4>
        <p><strong>Adm. Date:</strong> ${p.er_admission_date ? format(parseISO(p.er_admission_date), "dd MMM yyyy, HH:mm") : "N/A"}</p>
        <p><strong>Referring Doctor:</strong> Dr. ${field(p.er_admission_doctor || "Unknown")}</p>
        <div class="note-box"><div class="note-label" style="color:${themeHex};">CHIEF COMPLAINT</div>
        <div dir="auto">"${field(p.er_chief_complaint || "None recorded")}"</div></div>
        <div class="note-box"><div class="note-label">ADMISSION NOTES</div>
        <div dir="auto" style="white-space:pre-wrap;">${field(p.er_admission_notes || "No admission notes.")}</div></div>
      </div>` : `
      <div class="cell cell-alt">
        <h4 style="color:${themeHex};">II. LONG-TERM MEDICAL HISTORY</h4>
        <p><strong>Allergies:</strong> ${field(parseArr(p.allergies).join(", ") || "None recorded")}</p>
        <p><strong>Surgical History:</strong> ${field(parseArr(p.past_surgeries).join(", ") || "None recorded.")}</p>
        <p><strong>Relative:</strong> ${p.relative_status === "Known" ? `Family known (${p.relative_visits || "0"} visits / 3mo)` : "No family contact recorded."}</p>
      </div>`;

    const sectionErTx = isER ? `
      <div class="section-header" style="background:${themeHex};color:#fff;">V. EMERGENCY PHARMACOLOGICAL TREATMENT</div>
      <ul class="drug-list">${drugsHtml(parseArr(p.er_treatment))}</ul>` : "";

    return `<div class="page" style="font-size: ${fontSizeRem}rem !important;">
      <div class="header-bar">
        <div class="doctor-name" style="color:${tealHex};">Dr. ${doctorName}</div>
        <div class="report-title">${isER ? "CLINICAL SUMMARY &amp; EMERGENCY EVALUATION" : "PATIENT CLINICAL SUMMARY"}</div>
        <div class="report-date">${dateStr}</div>
      </div>
      <div class="two-col">
        <div class="cell">
          <h4 style="color:${tealHex};">I. PATIENT DEMOGRAPHICS</h4>
          <p><strong>Name:</strong> ${field(p.name)}</p>
          <p><strong>Age / Gender:</strong> ${p.age || "?"}y / ${p.gender || "N/A"}</p>
          <p><strong>Province:</strong> ${field(p.province)}</p>
          <p><strong>Ward:</strong> ${field(p.ward_name || wardName)}</p>
          <p><strong>Chronic Diseases:</strong></p>
          <p dir="auto">${field(formatDiseases(p.chronic_diseases))}</p>
        </div>
        ${sectionII}
      </div>
      <div class="two-col">
        <div class="cell">
          <h4 style="color:${tealHex};">III. ONGOING MEDICAL TREATMENT</h4>
          <ul class="drug-list">${drugsHtml(parseArr(p.medical_drugs))}</ul>
        </div>
        <div class="cell cell-green">
          <h4 style="color:${tealHex};">III. ONGOING PSYCHIATRIC TREATMENT</h4>
          <ul class="drug-list">${drugsHtml(parseArr(p.psych_drugs))}</ul>
        </div>
      </div>
      <div class="two-col">
        <div class="cell">
          <h4 style="color:${tealHex};">IV. VITALS</h4>
          ${targetVisit
            ? `<p><strong>BP:</strong> ${targetVisit.bp_sys || "?"}/${targetVisit.bp_dia || "?"}mmHg</p>
               <p><strong>PR:</strong> ${targetVisit.pr ? targetVisit.pr + " bpm" : "N/A"}</p>
               <p><strong>SpO2:</strong> ${targetVisit.spo2 ? targetVisit.spo2 + "%" : "N/A"}</p>
               <p><strong>Temp:</strong> ${targetVisit.temp ? targetVisit.temp + "C" : "N/A"}</p>`
            : `<p style="color:#94a3b8;font-style:italic;">No current vitals.</p>`}
        </div>
        <div class="cell">
          <h4 style="color:${tealHex};">${isER ? "IV. EMERGENCY CLINICAL EVALUATION" : "V. LATEST CLINICAL PROGRESS EVALUATION"}</h4>
          <div dir="auto" style="white-space:pre-wrap;font-size:0.8rem;">${field(targetVisit?.exam_notes || "No clinical evaluation recorded.")}</div>
        </div>
      </div>
      ${sectionErTx}
      <div class="section-header" style="color:${tealHex};border-bottom:2px solid ${tealHex};background:transparent;padding-bottom:4px;">
        ${isER ? "VI. EMERGENCY LABORATORY FINDINGS" : "VI. CLINICAL LABORATORY FINDINGS"}
      </div>
      <div class="labs-block">${labsHtml}</div>
      <div class="footer">Generated ${dateStr} &middot; Attending: Dr. ${doctorName} &middot; ${wardName.toUpperCase()}</div>
    </div>`;
  }).join('<div style="page-break-after:always;"></div>');

  const GFONT = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Noto+Sans+Arabic:wght@400;600;700&display=swap";

  const html = `<!DOCTYPE html>
<html lang="ar-IQ" dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>Clinical Summary - ${dateStr}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GFONT}" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter','Noto Sans Arabic',sans-serif;font-size:.82rem;color:#1e293b;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:60px}
    #print-controls{position:fixed;top:0;left:0;right:0;height:60px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;gap:20px;z-index:9999;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1)}
    .btn{padding:10px 20px;border-radius:12px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s;text-transform:uppercase;letter-spacing:0.05em;border:none}
    .btn-back{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
    .btn-back:hover{background:#e2e8f0;transform:translateY(-1px)}
    .btn-print{background:#0D9488;color:#fff}
    .btn-print:hover{background:#0F766E;transform:translateY(-1px)}
    .btn-pdf{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
    .btn-pdf:hover{background:#e2e8f0;color:#1e293b}
    #toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 24px;border-radius:12px;font-size:.8rem;font-weight:600;display:none;z-index:10000;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);animation:slideUp 0.3s ease-out}
    @keyframes slideUp{from{transform:translate(-50%, 100%)}to{transform:translate(-50%, 0)}}
    .page{width:210mm;min-height:297mm;margin:20px auto;padding:14mm 14mm 10mm;display:flex;flex-direction:column;gap:10px;background:#fff;box-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)}
    .header-bar{border-bottom:3px solid #0D9488;padding-bottom:8px;margin-bottom:4px}
    .doctor-name{font-size:.75rem;font-weight:900}
    .report-title{font-size:1.1rem;font-weight:900;text-align:center;color:#1E293B;margin:4px 0;letter-spacing:.04em}
    .report-date{font-size:.7rem;text-align:center;color:#94A3B8}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .cell{padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px}
    .cell-alt{background:#f8fafc}.cell-green{background:#f0fdf4}
    h4{font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
    p{margin-bottom:3px;font-size:.79rem;line-height:1.4}
    .note-box{margin-top:6px;padding:6px 8px;background:#fff;border:1px dashed #cbd5e1;border-radius:4px;font-size:.78rem}
    .note-label{font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin-bottom:3px}
    .drug-list{list-style:none;padding:0;margin:0;font-size:.79rem}
    .drug-list li{padding:2px 0 2px 10px;border-left:2px solid #e2e8f0;margin-bottom:3px}
    .section-header{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:4px 8px;margin:2px 0}
    .labs-block{padding:4px 0}
    .lab-row{font-size:.75rem;padding:3px 0;border-bottom:1px solid #f1f5f9;line-height:1.6}
    .lab-date{font-weight:700;margin-right:6px}
    .footer{margin-top:auto;padding-top:8px;border-top:1px solid #e2e8f0;font-size:.65rem;color:#94a3b8;text-align:center}
    [dir="rtl"],[dir="auto"]{font-family:'Noto Sans Arabic','Inter',sans-serif}
    @media print{
      body{background:#fff;padding-top:0}
      #print-controls, #toast{display:none !important}
      .page{width:100%;padding:10mm;margin:0;page-break-after:always;box-shadow:none}
      .page:last-child{page-break-after:avoid}
    }
  </style>
</head>
<body>
  <div id="print-controls">
    <button class="btn btn-back" onclick="window.close()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Back to App
    </button>
    <div style="width:1px;height:28px;background:#e2e8f0;margin:0 8px"></div>
    <button class="btn btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V2h8v5M4 14H2V7h12v7h-2M12 11H4v5h8v-5z"/></svg>
      Print
    </button>
    <button class="btn btn-pdf" onclick="saveAsPdf()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10v4H4v-4M8 2v10m-3-3l3 3 3-3"/></svg>
      Download as PDF
    </button>
  </div>
  <div id="toast">Tip: Choose "Save as PDF" as the Destination in the print dialog.</div>
  
  <div id="content">
    ${patientPages}
  </div>

  <script>
    function saveAsPdf() {
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { window.print(); }, 100);
      setTimeout(() => { toast.style.display = 'none'; }, 5000);
    }
    
    // Auto-trigger print but leave controls visible if user cancels
    document.fonts.ready.then(function(){ 
       setTimeout(function(){ window.print(); }, 800); 
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked — download as HTML so user can open and print
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clinical_Summary_${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.write(html);
  win.document.close();
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
