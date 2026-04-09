import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, BorderStyle, WidthType, VerticalAlign } from "docx"
import { format, parseISO } from "date-fns"
import { parseArr, formatDiseases, safeStr } from "./export-common"

export interface ResearchExportDetails {
  objective: string;
  varX: string;
  varY: string;
  math: any;
  aiReport?: string;
}

/**
 * Advanced Word document generation for one or more patients.
 * Optimized for clinical fidelity.
 */
export async function exportToWord(patients: any[], doctorName: string = "", wardName: string = "") {
  if (!doctorName && typeof window !== "undefined") {
    doctorName = localStorage.getItem("wardManager_doctorName") || "Ward Clinician"
  }
  if (!wardName && typeof window !== "undefined") {
    wardName = localStorage.getItem("wardManager_wardName") || "MEDICAL WARD"
  }
  const dynamicWardName = wardName.toUpperCase()

  const sections = patients.map((p) => {
    const isER = p.is_in_er === true || p.is_in_er === 1 || p.is_in_er === "1" || p.is_in_er === "true";

    const visitsForDoc = (p.visits || []).filter((v: any) => isER ? v.is_er : !v.is_er);
    // --- OPTIMIZED FAST FIND ---
    let targetVisit = null;
    let maxTime = 0;
    if (p.visits && p.visits.length > 0) {
      for (let i = 0; i < p.visits.length; i++) {
        const v = p.visits[i];
        const matchesEr = isER ? v.is_er : !v.is_er;
        if (matchesEr) {
          const time = Date.parse(v.visit_date || 0);
          if (time > maxTime) {
            maxTime = time;
            targetVisit = v;
          }
        }
      }
      if (!targetVisit) targetVisit = p.visits[0]; // fallback
    }
    // ---------------------------

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
    const themeColor = isER ? "BE123C" : "1E293B";
    const secondaryColor = "0D9488";

    const noBorders = {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    };

    const children: any[] = [];

    // HEADER
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

    // DEMOGRAPHICS | CONTEXT
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
                !isER ? new Paragraph({ children: [new TextRun({ text: "Medical Record No: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: p.medical_record_number || "N/A", size: sz(18) })], spacing: { after: 80 } }) : null,
                !isER ? new Paragraph({ children: [new TextRun({ text: "Mother Name: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: p.mother_name || "N/A", size: sz(18) })], spacing: { after: 80 } }) : null,
                !isER ? new Paragraph({ children: [new TextRun({ text: "Province / Edu: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: `${p.province || "N/A"} / ${p.education_level || "N/A"}`, size: sz(18) })], spacing: { after: 80 } }) : null,
                new Paragraph({ children: [new TextRun({ text: "Age / Gender: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: `${p.age}y / ${p.gender}`, size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: "Primary Ward: ", bold: true, size: sz(18), color: "64748B" }), new TextRun({ text: p.ward_name || wardName || "General Ward", size: sz(18) })], spacing: { after: 80 } }),
                new Paragraph({ 
                  children: [
                    new TextRun({ text: "Psychological Diagnosis: ", bold: true, size: sz(18), color: "64748B" }), 
                    new TextRun({ text: p.psychological_diagnosis || "None recorded", size: sz(18), bold: true, color: "0D9488" })
                  ], 
                  spacing: { before: 100, after: 120 } 
                }),
                new Paragraph({ children: [new TextRun({ text: "Chronic Diseases:", bold: true, size: sz(18), color: "64748B" })], spacing: { after: 40 } }),
                new Paragraph({ children: [new TextRun({ text: formatDiseases(p.chronic_diseases), size: sz(18), italics: true })], spacing: { after: isER ? 40 : 120 } }),
                isER ? new Paragraph({ children: [new TextRun({ text: "Chronic Medications:", bold: true, size: sz(18), color: "64748B" })], spacing: { after: 40 } }) : null,
                isER ? new Paragraph({ 
                  children: [new TextRun({ 
                    text: [...parseArr(p.medical_drugs), ...parseArr(p.psych_drugs)].map(d => d.name || d).join(", ") || "None recorded", 
                    size: sz(16), 
                    italics: true 
                  })], 
                  spacing: { after: 120 } 
                }) : null,
              ].filter(Boolean) as Paragraph[]
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

    if (!isER) {
      // WARD SECTION III/IV: Treatment | Vitals
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
                  new Paragraph({ children: [new TextRun({ text: "III. ONGOING MEDICAL TREATMENT", bold: true, size: sz(20), color: secondaryColor })], spacing: { after: 120 } }),
                  ...(parseArr(p.medical_drugs).length > 0
                    ? parseArr(p.medical_drugs).map((d: any) =>
                        new Paragraph({ children: [new TextRun({ text: `• ${d.name || d} ${d.dosage || ""} — ${d.frequency || ""}`, size: sz(18) })], indent: { left: 140 }, spacing: { after: 40 } })
                      )
                    : [new Paragraph({ children: [new TextRun({ text: "No medical medications.", size: sz(18), italics: true })], indent: { left: 140 } })]
                  )
                ]
              }),
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

      // WARD SECTION IV: Vitals | Progress
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
                    new Paragraph({ 
                      children: [
                        new TextRun({ text: "Status: ", bold: true, size: sz(16), color: "64748B" }), 
                        new TextRun({ 
                          text: [
                            targetVisit.is_conscious ? "Conscious" : "Unconscious",
                            targetVisit.is_oriented ? "Oriented" : "Disoriented",
                            targetVisit.is_ambulatory ? "Ambulatory" : "Bed-bound",
                            targetVisit.is_dyspnic ? "Dyspnic" : "Not Dyspnic",
                            targetVisit.is_soft_abdomen ? "Soft Abdomen" : "Abdomen Not Soft"
                          ].join(", "), 
                          size: sz(16), 
                          color: "64748B" 
                        })
                      ],
                      spacing: { before: 100 }
                    }),
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
      // ER SECTION III/IV: Vitals | Progress
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
                    new Paragraph({ 
                      children: [
                        new TextRun({ text: "Status: ", bold: true, size: sz(16), color: "64748B" }), 
                        new TextRun({ 
                          text: [
                            targetVisit.is_conscious ? "Conscious" : "Unconscious",
                            targetVisit.is_oriented ? "Oriented" : "Disoriented",
                            targetVisit.is_ambulatory ? "Ambulatory" : "Bed-bound",
                            targetVisit.is_dyspnic ? "Dyspnic" : "Not Dyspnic",
                            targetVisit.is_soft_abdomen ? "Soft Abdomen" : "Abdomen Not Soft"
                          ].join(", "), 
                          size: sz(16), 
                          color: "64748B" 
                        })
                      ],
                      spacing: { before: 100 }
                    }),
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

      // ER SECTION V: Emergency Treatment
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

    // LABS SECTION
    children.push(new Paragraph({
      children: [new TextRun({ text: isER ? "VI. EMERGENCY LABORATORY FINDINGS" : "VI. CLINICAL LABORATORY FINDINGS", bold: true, size: sz(18), color: secondaryColor })],
      border: { bottom: { color: secondaryColor, space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { after: 200 },
    }));

    docLabs.sort((a: any, b: any) => {
      const t1 = Date.parse(b.date || b.created_at || 0);
      const t2 = Date.parse(a.date || a.created_at || 0);
      return t1 - t2;
    });
    const labsToPrint = limitLabs ? docLabs.slice(0, 1) : docLabs.slice(0, 5);

    labsToPrint.forEach((inv: any) => {
      const invDate = format(parseISO(inv.date || inv.created_at), isER ? "dd MMM, HH:mm" : "dd MMM yyyy");
      const parts = [
        inv.hb ? `Hb:${inv.hb}` : null,
        inv.wbc ? `WBC:${inv.wbc}` : null,
        inv.s_creatinine ? `Cr:${inv.s_creatinine}` : null,
        inv.s_urea ? `Urea:${inv.s_urea}` : null,
        ...(Array.isArray(inv.other_labs) ? inv.other_labs.map((o: any) => `${o.name}:${o.value}`) : [])
      ].filter(Boolean).join(" | ");

      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${invDate}: `, bold: true, size: sz(18), color: secondaryColor }),
          new TextRun({ text: parts || "No values recorded", size: sz(18) })
        ],
        spacing: { after: 120 }
      }));
    });

    children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `Generated ${format(new Date(), "dd MMM yyyy")} • Attending: Dr. ${doctorName} • ${dynamicWardName}`, size: sz(14), color: "94A3B8" })],
      alignment: AlignmentType.CENTER,
      border: { top: { color: "E2E8F0", space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 200 }
    }));

    return {
      properties: {
        page: { size: { width: 11906, height: 16838 } }, // A4
        margin: { top: 720, right: 720, bottom: 720, left: 720 },
      },
      children: children,
    };
  });

  const doc = new Document({
    sections: sections,
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = patients.length === 1 ? patients[0].name.replace(/\s+/g, '_') : "Multiple_Patients";
  const safeWardName = dynamicWardName.replace(/\s+/g, '_');
  link.download = `${fileName}_${safeWardName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: trimmed.replace("### ", ""), bold: true, size: 24, color: "0D9488" })], spacing: { before: 200, after: 100 } }))
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: trimmed.replace("## ", ""), bold: true, size: 28, color: "4F46E5" })], spacing: { before: 300, after: 150 } }))
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: `• ${trimmed.substring(2)}`, size: 20 })], indent: { left: 400 }, spacing: { after: 80 } }))
    } else {
      // Normal text with bold parsing **text**
      const parts = trimmed.split(/(\*\*.*?\*\*)/g)
      const children = parts.map(part => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return new TextRun({ text: part.substring(2, part.length - 2), bold: true, size: 20 })
        }
        return new TextRun({ text: part, size: 20 })
      })
      paragraphs.push(new Paragraph({ children, spacing: { after: 120 } }))
    }
  })

  return paragraphs
}

/**
 * EXPORT: Research Narrative to Word.
 */
export async function exportResearchToWord(details: ResearchExportDetails, doctorName: string = "", wardName: string = "") {
  const { objective, varX, varY, math, aiReport } = details
  
  if (typeof window !== "undefined") {
    if (!doctorName) doctorName = localStorage.getItem("wardManager_doctorName") || "Senior Clinician"
    if (!wardName) wardName = localStorage.getItem("wardManager_wardName") || "ALRASHAD MEDICAL WARD"
  }

  const children: any[] = [
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
    new Paragraph({ 
      children: [new TextRun({ text: "STUDY METHODOLOGY", bold: true, size: 28, color: "0D9488" })],
      spacing: { before: 400, after: 200 } 
    }),
    new Paragraph({ children: [new TextRun({ text: "Objective: ", bold: true, size: 20 }), new TextRun({ text: safeStr(objective), size: 20 })].filter(Boolean) as TextRun[], spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: "Independent Variable (X): ", bold: true, size: 20 }), new TextRun({ text: safeStr(varX), size: 20 })].filter(Boolean) as TextRun[], spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: "Dependent Variable (Y): ", bold: true, size: 20 }), new TextRun({ text: safeStr(varY), size: 20 })].filter(Boolean) as TextRun[], spacing: { after: 120 } }),
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
    new Paragraph({ 
      children: [new TextRun({ text: "CLINICAL RESEARCH NARRATIVE", bold: true, size: 28, color: "4F46E5" })],
      spacing: { before: 600, after: 400 } 
    }),
    ...parseMarkdownToDocx(aiReport || "AI Interpretation was not performed for this study."),
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
