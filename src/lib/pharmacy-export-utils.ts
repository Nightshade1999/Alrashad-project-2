import { Workbook } from 'exceljs';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  TextRun, 
  AlignmentType, 
  BorderStyle, 
  HeadingLevel,
  VerticalAlign
} from 'docx';
import { format } from 'date-fns';

/**
 * Native helper to trigger file downloads without external dependencies
 */
function saveAs(blob: Blob, fileName: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * EXCEL EXPORT: All Drugs with full details
 */
export async function exportPharmacyInventoryToExcel(items: any[], filterTitle: string = "Full Inventory") {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Pharmacy Inventory');

  // Define Columns
  worksheet.columns = [
    { header: 'Generic/Brand Name', key: 'generic_name', width: 25 },
    { header: 'Scientific Name', key: 'scientific_name', width: 25 },
    { header: 'Dosage', key: 'dosage', width: 15 },
    { header: 'Formulation', key: 'formulation', width: 15 },
    { header: 'Administration', key: 'mode_of_administration', width: 15 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Department', key: 'department', width: 12 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Min Stock', key: 'min_stock_level', width: 10 },
    { header: 'Expiry Date', key: 'expiration_date', width: 15 },
    { header: 'Mfr.', key: 'manufacturer', width: 20 },
    { header: 'Batch No.', key: 'batch_number', width: 15 },
    { header: 'Pharmacist', key: 'pharmacist_name', width: 20 },
  ];

  // Formatting Header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' } // Teal-600
  };

  // Add Data
  items.forEach(item => {
    worksheet.addRow({
      generic_name: item.generic_name || "",
      scientific_name: item.scientific_name || "",
      dosage: item.dosage || "",
      formulation: item.formulation || "",
      mode_of_administration: item.mode_of_administration || "",
      category: item.category || "General",
      department: item.department || "Ward",
      quantity: item.quantity || 0,
      min_stock_level: item.min_stock_level || 0,
      expiration_date: item.expiration_date ? format(new Date(item.expiration_date), 'dd/MM/yyyy') : "N/A",
      manufacturer: item.manufacturer || "",
      batch_number: item.batch_number || "",
      pharmacist_name: item.pharmacist_name || "System"
    });
  });

  // Generate Buffer and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Pharmacy_Inventory_${filterTitle.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

/**
 * DOC EXPORT: Specialized High-Density Drug Supply Sheet
 */
export async function exportPharmacyInventoryToDoc(items: any[], filterTitle: string = "Distribution Sheet") {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          new Paragraph({
            text: "ALRASHAD HOSPITAL - PHARMACY DEPT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `DRUG SUPPLY RECORD: ${filterTitle.toUpperCase()}`,
                bold: true,
                size: 24,
                color: "0D9488",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Generated on: ", bold: true }),
              new TextRun(format(new Date(), 'dd MMM yyyy, HH:mm')),
            ],
            spacing: { after: 300 },
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  createHeaderCell("Drug Name (Generic/Brand)"),
                  createHeaderCell("Scientific Name"),
                  createHeaderCell("Dosage/Form"),
                  createHeaderCell("Current Qty"),
                  createHeaderCell("Category"),
                ],
              }),
              // Data Rows
              ...items.map(item => new TableRow({
                children: [
                  createDataCell(item.generic_name || "---"),
                  createDataCell(item.scientific_name || "---"),
                  createDataCell(`${item.dosage || ''} ${item.formulation || ''}`.trim()),
                  createDataCell((item.quantity || 0).toString()),
                  createDataCell(item.category || "General"),
                ],
              })),
            ],
          }),

          new Paragraph({
            text: "\nAuthorized Signature: _______________________",
            spacing: { before: 1000 },
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            text: "Pharmacist Signature: _______________________",
            spacing: { before: 400 },
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Pharmacy_Supply_${filterTitle.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.doc`);
}

function createHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
      alignment: AlignmentType.CENTER 
    })],
    verticalAlign: VerticalAlign.CENTER,
    shading: {
      fill: "1E293B",
    },
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });
}

function createDataCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text, size: 18 })],
      alignment: AlignmentType.LEFT 
    })],
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100,
    },
  });
}
