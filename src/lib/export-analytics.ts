import ExcelJS from 'exceljs'

/**
 * EXPORT: Ward-level category/demographic analytics.
 */
export async function exportWardAnalyticsToExcel(data: any[], type: string, wardName: string) {
  const workbook = new ExcelJS.Workbook()
  const summarySheet = workbook.addWorksheet('Ward Summary')
  
  const header = ['Metric', 'Count/Value']
  summarySheet.addRow(header)
  
  const summaryRows: any[] = []
  if (type === 'demographics') {
    summaryRows.push(['Total Patients', data.length])
  } else {
    data.forEach(d => {
      summaryRows.push([d.name, Number(d.value)])
    })
  }

  summaryRows.forEach(row => summarySheet.addRow(row))

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Ward_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  setTimeout(() => document.body.removeChild(link), 1000)
}

/**
 * EXPORT: Advanced variable correlation analytics (Explorer Mode).
 */
export interface AnalyticsExportDetails {
  title: string;
  xLabel: string;
  yLabel: string;
  data: any[];
}

export async function exportAnalyticsToExcel(details: AnalyticsExportDetails) {
  const { title, xLabel, yLabel, data } = details
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Research Data")

  worksheet.addRow([title]).font = { bold: true, size: 14 }
  worksheet.addRow([])
  
  worksheet.columns = [
    { header: "Patient Name", key: "name", width: 25 },
    { header: "Ward", key: "ward", width: 15 },
    { header: "Age", key: "age", width: 10 },
    { header: xLabel, key: "x_val", width: 30 },
    { header: yLabel, key: "y_val", width: 30 }
  ]

  worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }

  data.forEach(row => worksheet.addRow(row))

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Clinical_Correlation_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  setTimeout(() => document.body.removeChild(link), 1000)
}
