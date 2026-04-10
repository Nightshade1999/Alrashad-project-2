import ExcelJS from "exceljs"
import Papa from "papaparse"
import { format, parseISO } from "date-fns"
import { parseArr, formatDrugs, formatDiseases } from "./export-common"

/**
 * Exports patient data to an Excel file with category-based row coloring.
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
  link.href = url
  link.download = `ward_patients_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
  link.download = `Research_Results_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  setTimeout(() => document.body.removeChild(link), 2000)
}

/**
 * Comprehensive CSV Export for Medical Research.
 * Flattens patient demographics and all laboratory investigations into a single research-ready table.
 */
export async function exportPatientsToCSV(patients: any[]) {
  const allRows: any[] = []

  patients.forEach((p) => {
    const labs = p.investigations || []
    
    // Base patient data shared across all its lab result rows
    const patientBase = {
      "Patient Name": p.name,
      "Mother's Name": p.mother_name || "N/A",
      "MRN": p.medical_record_number || "N/A",
      "Age": p.age,
      "Gender": p.gender,
      "Ward": p.ward_name,
      "Room": p.room_number,
      "Psychological Diagnosis": p.psychological_diagnosis || "N/A",
      "Category": p.category,
      "Province": p.province || "N/A",
      "Education": p.education_level || "N/A",
      "Admission Date": p.admission_date ? format(parseISO(p.admission_date), "yyyy-MM-dd") : "N/A",
      "System Entry Date": p.created_at ? format(parseISO(p.created_at), "yyyy-MM-dd") : "",
      "Is in ER": p.is_in_er ? "Yes" : "No",
      "ER Doctor": p.er_admission_doctor || "N/A",
      "Chronic Diseases": formatDiseases(p.chronic_diseases),
      "Internal Meds": formatDrugs(p.medical_drugs).join('; '),
      "Psych Meds": formatDrugs(p.psych_drugs).join('; '),
      "Allergies": parseArr(p.allergies).join(', ') || 'None',
      "Past Surgeries": parseArr(p.past_surgeries).join(', ') || 'None',
    }

    if (labs.length === 0) {
      // Add one row for patient with empty lab columns
      allRows.push({
        ...patientBase,
        "Lab Date": "No Labs",
        "Lab Doctor": "",
        "WBC": "", "Hb": "", "Urea": "", "Creatinine": "",
        "AST": "", "ALT": "", "TSB": "", "hba1c": "",
        "RBS": "", "LDL": "", "HDL": "", "TG": "",
        "ESR": "", "CRP": "", "Is ER Lab": ""
      })
    } else {
      // Create one row per laboratory investigation
      labs.forEach((l: any) => {
        allRows.push({
          ...patientBase,
          "Lab Date": l.date ? format(parseISO(l.date), "yyyy-MM-dd HH:mm") : "Unknown",
          "Lab Doctor": l.doctor_name || "N/A",
          "WBC": l.wbc,
          "Hb": l.hb,
          "Urea": l.s_urea,
          "Creatinine": l.s_creatinine,
          "AST": l.ast,
          "ALT": l.alt,
          "TSB": l.tsb,
          "hba1c": l.hba1c,
          "RBS": l.rbs,
          "LDL": l.ldl,
          "HDL": l.hdl,
          "TG": l.tg,
          "ESR": l.esr,
          "CRP": l.crp,
          "Is ER Lab": l.is_er ? "Yes" : "No"
        })
      })
    }
  })

  const csv = Papa.unparse(allRows)
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Alrashad_Research_Export_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
