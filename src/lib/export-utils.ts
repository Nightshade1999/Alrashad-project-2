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
 * Clinical Arabic Reshaper & RTL Helper
 * Since native jsPDF doesn't handle the cursive nature of Arabic (joining letters),
 * we manually reshape the glyphs to their context-aware forms (Isolated, Initial, Medial, Final)
 * and reverse the string for Right-to-Left (RTL) layout.
 */
function prepareClinicalText(text: string = ""): string {
  if (!text) return "";
  if (typeof text !== 'string') text = String(text);
  
  // [Isolated, Final, Medial, Initial]
  const ARABIC_MAP: Record<string, string[]> = {
    "\u0621": ["\uFE80", "\uFE80", "\uFE80", "\uFE80"],
    "\u0622": ["\uFE81", "\uFE82", "\uFE82", "\uFE81"],
    "\u0623": ["\uFE83", "\uFE84", "\uFE84", "\uFE83"],
    "\u0624": ["\uFE85", "\uFE86", "\uFE86", "\uFE85"],
    "\u0625": ["\uFE87", "\uFE88", "\uFE88", "\uFE87"],
    "\u0626": ["\uFE89", "\uFE8A", "\uFE8C", "\uFE8B"],
    "\u0627": ["\uFE8D", "\uFE8E", "\uFE8E", "\uFE8D"],
    "\u0628": ["\uFE8F", "\uFE90", "\uFE92", "\uFE91"],
    "\u0629": ["\uFE93", "\uFE94", "\uFE94", "\uFE93"],
    "\u062A": ["\uFE95", "\uFE96", "\uFE98", "\uFE97"],
    "\u062B": ["\uFE99", "\uFE9A", "\uFE9C", "\uFE9B"],
    "\u062C": ["\uFE9D", "\uFE9E", "\uFEA0", "\uFE9F"],
    "\u062D": ["\uFEA1", "\uFEA2", "\uFEA4", "\uFEA3"],
    "\u062E": ["\uFEA5", "\uFEA6", "\uFEA8", "\uFEA7"],
    "\u062F": ["\uFEA9", "\uFEAA", "\uFEAA", "\uFEA9"],
    "\u0630": ["\uFEAB", "\uFEAC", "\uFEAC", "\uFEAB"],
    "\u0631": ["\uFEAD", "\uFEAE", "\uFEAE", "\uFEAD"],
    "\u0632": ["\uFEAF", "\uFEB0", "\uFEB0", "\uFEAF"],
    "\u0633": ["\uFEB1", "\uFEB2", "\uFEB4", "\uFEB3"],
    "\u0634": ["\uFEB5", "\uFEB6", "\uFEB8", "\uFEB7"],
    "\u0635": ["\uFEB9", "\uFEBA", "\uFEBC", "\uFEBB"],
    "\u0636": ["\uFEBD", "\uFEBE", "\uFEC0", "\uFEBF"],
    "\u0637": ["\uFEC1", "\uFEC2", "\uFEC4", "\uFEC3"],
    "\u0638": ["\uFEC5", "\uFEC6", "\uFEC8", "\uFEC7"],
    "\u0639": ["\uFEC9", "\uFECA", "\uFECC", "\uFECB"],
    "\u063A": ["\uFECD", "\uFECE", "\uFED0", "\uFECF"],
    "\u0641": ["\uFED1", "\uFED2", "\uFED4", "\uFED3"],
    "\u0642": ["\uFED5", "\uFED6", "\uFED8", "\uFED7"],
    "\u0643": ["\uFED9", "\uFEDA", "\uFEDC", "\uFEDB"],
    "\u0644": ["\uFEDD", "\uFEDE", "\uFEE0", "\uFEDF"],
    "\u0645": ["\uFEE1", "\uFEE2", "\uFEE4", "\uFEE3"],
    "\u0646": ["\uFEE5", "\uFEE6", "\uFEE8", "\uFEE7"],
    "\u0647": ["\uFEE9", "\uFEEA", "\uFEEC", "\uFEEB"],
    "\u0648": ["\uFEED", "\uFEEE", "\uFEEE", "\uFEED"],
    "\u0649": ["\uFEEF", "\uFEF0", "\uFEF0", "\uFEEF"],
    "\u064A": ["\uFEF1", "\uFEF2", "\uFEF4", "\uFEF3"],
    " ": [" ", " ", " ", " "]
  };

  const NON_CONNECTING = ["\u0621", "\u0622", "\u0623", "\u0624", "\u0625", "\u0627", "\u062F", "\u0630", "\u0631", "\u0632", "\u0648", "\u0629", " "];
  const LIGATURES: Record<string, string[]> = {
    "\u0644\u0627": ["\uFEFB", "\uFEFC", "\uFEFC", "\uFEFB"],
    "\u0644\u0622": ["\uFEF5", "\uFEF6", "\uFEF6", "\uFEF5"],
    "\u0644\u0623": ["\uFEF7", "\uFEF8", "\uFEF8", "\uFEF7"],
    "\u0644\u0625": ["\uFEF9", "\uFEFA", "\uFEFA", "\uFEF9"],
  };

  const isAr = (c: string) => c && /[\u0600-\u06FF]/.test(c);

  const reshapeSeq = (content: string) => {
    return content.split(" ").map(word => {
      if (!word || !isAr(word[0])) return word;
      let w = word;
      for (const [lig, forms] of Object.entries(LIGATURES)) w = w.split(lig).join(forms[0]);
      let reshaped = "";
      for (let i = 0; i < w.length; i++) {
        const char = w[i], entry = ARABIC_MAP[char];
        if (!entry) { reshaped += char; continue; }
        const prev = w[i - 1], next = w[i + 1];
        const canPrev = prev && ARABIC_MAP[prev] && !NON_CONNECTING.includes(prev);
        const canNext = next && ARABIC_MAP[next] && char !== " " && !NON_CONNECTING.includes(char);
        if (!canPrev && !canNext) reshaped += entry[0];
        else if (!canPrev && canNext) reshaped += entry[3];
        else if (canPrev && canNext) reshaped += entry[2];
        else reshaped += entry[1];
      }
      return reshaped.split("").reverse().join("");
    }).reverse().join(" ");
  };

  return text.replace(/[\u0600-\u06FF\s]+/g, (m) => m.trim() ? reshapeSeq(m) : m);
}

/**
 * High-Fidelity PDF Export. 
 * Replicates the clinical style, color-coded headers, and structured tables 
 * of the professional Word export.
 */
export async function exportToPdf(patients: any[], doctorName: string = "", wardName: string = "") {
  if (!doctorName && typeof window !== "undefined") {
    doctorName = localStorage.getItem("wardManager_doctorName") || "Ward Clinician"
  }
  if (!wardName && typeof window !== "undefined") {
    wardName = localStorage.getItem("wardManager_wardName") || "MEDICAL WARD"
  }

  // Optimize constructor: putOnlyUsedFonts reduces file size
  const doc = new jsPDF({
    putOnlyUsedFonts: true
  });
  
  // High-Fidelity Font Support (Robust Load)
  try {
    const response = await fetch("/fonts/Amiri-Regular.ttf");
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Font = btoa(binary);
      if (base64Font) {
        doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
        (doc as any).addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H');
        // Register bold/italic aliases for font safety
        (doc as any).addFont('Amiri-Regular.ttf', 'Amiri', 'bold', 'Identity-H');
        (doc as any).addFont('Amiri-Regular.ttf', 'Amiri', 'italic', 'Identity-H');
      }
    }
  } catch (err) {
    console.error("Font loading error:", err);
  }

  const secondaryColor = [13, 148, 136]; // #0D9488
  const normalTheme = [15, 23, 42];      // #0F172A
  const erTheme = [190, 18, 60]          // #BE123C

  patients.forEach((p, index) => {
    if (index > 0) doc.addPage();
    
    const isER = p.is_in_er || false;
    const themeColor = isER ? erTheme : normalTheme;

    // Line Projection Engine (One-Page Protocol Parity)
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

    // PDF-Optimized Thresholds
    const threshold = isER ? 36 : 52; 
    let fontSizeOffset = 0;
    let limitLabs = false;
    if (projectedLines > threshold) {
       fontSizeOffset = projectedLines > (threshold + 12) ? 2 : 1;
       if (projectedLines > (threshold + 12)) limitLabs = true;
    }

    const sz = (baseValue: number) => Math.max(6, baseValue - fontSizeOffset);
    
    // Robust Font Existence Check to prevent 'widths' property error
    const getSafeFont = () => {
      try {
        const list = (doc as any).getFontList();
        if (list && list['Amiri']) return 'Amiri';
        return 'helvetica';
      } catch {
        return 'helvetica';
      }
    };
    const useFont = getSafeFont();

    // 1. HEADER
    doc.setFont(useFont, "bold");
    doc.setFontSize(sz(10));
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(prepareClinicalText(`Dr. ${doctorName}`), 14, 15);

    doc.setFontSize(sz(14));
    doc.setTextColor(30, 41, 59); // #1E293B
    doc.text(isER ? "CLINICAL SUMMARY & EMERGENCY EVALUATION" : "PATIENT CLINICAL SUMMARY", 105, 25, { align: "center" });

    doc.setFont(useFont, "normal");
    doc.setFontSize(sz(9));
    doc.setTextColor(148, 163, 184); // #94A3B8
    // Safe text call to prevent 'widths' crash
    doc.text(format(new Date(), "dd MMMM yyyy"), 105, 32, { align: "center" });

    // 2. DEMOGRAPHICS & CLINICAL CONTEXT
    autoTable(doc, {
      startY: 40,
      theme: "plain",
      head: [[
        { content: "I. PATIENT DEMOGRAPHICS", styles: { textColor: secondaryColor as [number, number, number], fontStyle: "bold" } }, 
        { content: isER ? "II. ER ADMISSION NOTE" : "II. LONG-TERM MEDICAL HISTORY", styles: { textColor: themeColor as [number, number, number], fontStyle: "bold" } }
      ]],
      body: [[
        {
          content: `Name: ${prepareClinicalText(p.name || "N/A")}\nAge / Gender: ${p.age || "?"}y / ${p.gender || "N/A"}\nProvince: ${prepareClinicalText(p.province || "N/A")}\nWard: ${prepareClinicalText(p.ward_name || wardName || "N/A")}\n\nChronic Diseases:\n${prepareClinicalText(formatDiseases(p.chronic_diseases)) || "None recorded."}`,
          styles: { cellPadding: 2 }
        },
        {
          content: isER 
            ? `Adm. Date: ${p.er_admission_date ? format(parseISO(p.er_admission_date), "dd MMM yyyy, HH:mm") : "N/A"}\nReferring Doc: Dr. ${prepareClinicalText(p.er_admission_doctor || "Unknown")}\n\nCHIEF COMPLAINT:\n"${prepareClinicalText(p.er_chief_complaint || "None recorded")}"\n\nADMISSION NOTES:\n${prepareClinicalText(p.er_admission_notes || "No admission notes.")}`
            : `Allergies: ${prepareClinicalText(parseArr(p.allergies).join(", ")) || "None recorded"}\n\nSurgical History:\n${prepareClinicalText(parseArr(p.past_surgeries).join(", ")) || "None recorded."}\n\nRelative: ${p.relative_status === 'Known' ? `Family known (${p.relative_visits || '0'} visits / 3mo)` : "No family contact recorded."}`,
          styles: { fillColor: isER ? [255, 241, 242] : [248, 250, 252], cellPadding: 2 }
        }
      ]],
      styles: { fontSize: sz(8), font: useFont }
    });

    // 3. MEDICATIONS
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "plain",
      head: [[
        { content: "III. ONGOING MEDICAL TREATMENT", styles: { textColor: secondaryColor as [number, number, number], fontStyle: "bold" } },
        { content: "III. ONGOING PSYCHIATRIC TREATMENT", styles: { textColor: secondaryColor as [number, number, number], fontStyle: "bold" } }
      ]],
      body: [[
        { content: formatDrugs(p.medical_drugs).map(d => `• ${prepareClinicalText(d)}`).join("\n") || "No medical medications.", styles: { cellPadding: 2 } },
        { content: formatDrugs(p.psych_drugs).map(d => `• ${prepareClinicalText(d)}`).join("\n") || "No psychiatric medications.", styles: { cellPadding: 2, fillColor: [240, 253, 250] } }
      ]],
      styles: { fontSize: sz(8), font: useFont }
    });

    // 4. VITALS & PROGRESS (One-Page Scaled)
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      theme: "plain",
      head: [[
        { content: "IV. VITALS", styles: { textColor: secondaryColor as [number, number, number], fontStyle: "bold" } },
        { content: isER ? "IV. EMERGENCY CLINICAL EVALUATION" : "V. LATEST CLINICAL PROGRESS EVALUATION", styles: { textColor: secondaryColor as [number, number, number], fontStyle: "bold" } }
      ]],
      body: [[
        {
          content: targetVisit 
            ? `BP: ${targetVisit.bp_sys || "?"}/${targetVisit.bp_dia || "?"}\nPR: ${targetVisit.pr ? targetVisit.pr + " bpm" : "N/A"}\nSpO2: ${targetVisit.spo2 ? targetVisit.spo2 + "%" : "N/A"}\nTemp: ${targetVisit.temp ? targetVisit.temp + "°C" : "N/A"}`
            : "No current vitals.",
          styles: { cellPadding: 2 }
        },
        {
          content: prepareClinicalText(targetVisit?.exam_notes || "No clinical evaluation recorded."),
          styles: { cellPadding: 2 }
        }
      ]],
      styles: { fontSize: sz(8), font: useFont }
    });

    // 5. ER TREATMENT (if applicable)
    if (isER) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        theme: "grid",
        head: [[{ content: "V. EMERGENCY PHARMACOLOGICAL TREATMENT", styles: { fillColor: themeColor as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" } }]],
        body: [[
          { content: parseArr(p.er_treatment).map((t: any) => `• ${prepareClinicalText(t.name)} ${t.dosage || ""} — ${t.frequency || ""}`).join("\n") || "No emergency treatment recorded." }
        ]],
        styles: { fontSize: sz(9), font: useFont }
      });
    }

    // 6. LABORATORY FINDINGS
    doc.setFont(useFont, "bold");
    doc.setFontSize(sz(9));
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(isER ? "VI. EMERGENCY LABORATORY FINDINGS" : "VI. CLINICAL LABORATORY FINDINGS", 14, (doc as any).lastAutoTable.finalY + 12);

    const labsToPrint = limitLabs ? docLabs.slice(0, 2) : docLabs.slice(0, 6);
    let labStartY = (doc as any).lastAutoTable.finalY + 16;

    labsToPrint.forEach((inv: any) => {
      const dateStr = format(parseISO(inv.date || inv.created_at), isER ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy");
      
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
      otherLabs.forEach((o: any) => labEntries.push({ key: o.name, label: prepareClinicalText(o.name), val: o.value }));

      const activeLabs = labEntries.filter(l => l.val !== null && l.val !== undefined && l.val !== "");
      
      doc.setFontSize(sz(8));
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`${dateStr} -->`, 14, labStartY);

      let currentX = 42;
      activeLabs.forEach((lab) => {
        const isAbnormal = isLabAbnormal(lab.key, lab.val);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.setFont(useFont, "bold");
        doc.text(`${lab.label}: `, currentX, labStartY);
        
        const labelWidth = doc.getTextWidth(`${lab.label}: `);
        doc.setTextColor(isAbnormal ? 220 : 30, isAbnormal ? 38 : 41, isAbnormal ? 38 : 59);
        doc.text(`${lab.val} | `, currentX + labelWidth, labStartY);
        
        currentX += labelWidth + doc.getTextWidth(`${lab.val} | `) + 1;
      });

      labStartY += 6;
    });

    // FOOTER
    doc.setFont(useFont, "italic");
    doc.setFontSize(sz(7));
    doc.setTextColor(148, 163, 184);
    doc.text(prepareClinicalText(`Generated on ${format(new Date(), "yyyy-MM-dd HH:mm")}. Attending: Dr. ${doctorName}`), 105, 285, { align: "center" });
  });

  const patientName = patients.length === 1 ? patients[0].name.replace(/\s+/g, '_') : "Multiple_Patients";
  doc.save(`${patientName}_Clinical_Summary.pdf`);
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
