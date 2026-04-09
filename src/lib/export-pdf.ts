import { format, parseISO } from "date-fns"
import { parseArr, formatDiseases, isLabAbnormal } from "./export-common"

/**
 * PDF Export via HTML + Native Browser Iframe Overlay
 * 
 * Optimized for speed: No heavy library dependencies.
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
    const isER = p.is_in_er === true || p.is_in_er === 1 || p.is_in_er === "1" || p.is_in_er === "true";
    const themeHex = isER ? "#BE123C" : "#1E293B";
    const tealHex = "#0D9488";

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

    // --- ONE PAGE RULE: LINE PROJECTION ENGINE ---
    const noteLines = targetVisit ? (targetVisit.exam_notes || "").split("\n").length : 1;
    const admissionNoteLines = (p.er_admission_notes || "").split("\n").length;
    const medsCount = parseArr(p.medical_drugs).length + parseArr(p.psych_drugs).length;
    const erTxCount = parseArr(p.er_treatment).length;

    const projectedLines = 6 +
      Math.max(5 + medsCount, isER ? 6 + admissionNoteLines : 8) +
      Math.max(5, 2 + noteLines) +
      (isER ? 2 + erTxCount : 0) +
      10; 

    let fontSizeRem = 0.82;
    let limitLabs = false;
    const threshold = isER ? 36 : 50; 
    if (projectedLines > threshold) {
       fontSizeRem = 0.72;
       if (projectedLines > (threshold + 12)) limitLabs = true;
    }

    let docLabs = (p.investigations || []).filter((inv: any) => isER ? inv.is_er : !inv.is_er);
    if (docLabs.length === 0 && p.investigations?.length > 0) docLabs = [p.investigations[0]];
    docLabs.sort((a: any, b: any) => {
      const t1 = Date.parse(b.date || b.created_at || 0);
      const t2 = Date.parse(a.date || a.created_at || 0);
      return t1 - t2;
    });
    const labsToPrint = limitLabs ? docLabs.slice(0, 1) : docLabs.slice(0, 5);

    const pName = String(p.name || "N/A");

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
        ... (Array.isArray(inv.other_labs) ? inv.other_labs.map((o: any) => ({ key: o.name, label: o.name, val: o.value })) : []),
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
        <div class="cell" style="width:50%;">
          <h4 style="color:${tealHex};">I. PATIENT DEMOGRAPHICS</h4>
          <p><strong>Name:</strong> ${field(pName)}</p>
          <p><strong>Age / Gender:</strong> ${p.age || "?"}y / ${p.gender || "N/A"}</p>
          ${!isER ? `
            <p><strong>Medical Record No.:</strong> ${field(p.medical_record_number)}</p>
            <p><strong>Mother Name:</strong> ${field(p.mother_name)}</p>
            <p><strong>Province / Edu:</strong> ${field(p.province)} / ${field(p.education_level)}</p>
          ` : ""}
          <p><strong>Ward:</strong> ${field(p.ward_name || wardName)}</p>
          <div style="margin-top:8px; padding-top:4px; border-top:1px solid #e2e8f0;">
             <p><strong>Psychological Diagnosis:</strong></p>
             <p dir="auto" style="font-weight:bold; color:#0D9488;">${field(p.psychological_diagnosis)}</p>
          </div>
          ${isER ? `
            <h4 style="color:#64748B; margin-top:8px; margin-bottom:4px; font-size:0.7rem;">CHRONIC MEDICATIONS:</h4>
            <p dir="auto" style="font-style:italic;">${field([...parseArr(p.medical_drugs), ...parseArr(p.psych_drugs)].map(d => d.name || d).join(", ") || "None recorded")}</p>
          ` : `
            <p><strong>Chronic Diseases:</strong></p>
            <p dir="auto">${field(formatDiseases(p.chronic_diseases))}</p>
          `}
        </div>
        ${sectionII}
      </div>
      ${!isER ? `
      <div class="two-col">
        <div class="cell" style="width:50%;">
          <h4 style="color:${tealHex};">III. ONGOING MEDICAL TREATMENT</h4>
          <ul class="drug-list">${drugsHtml(parseArr(p.medical_drugs))}</ul>
        </div>
        <div class="cell cell-green" style="width:50%;">
          <h4 style="color:${tealHex};">III. ONGOING PSYCHIATRIC TREATMENT</h4>
          <ul class="drug-list">${drugsHtml(parseArr(p.psych_drugs))}</ul>
        </div>
      </div>
      ` : ""}
      <div class="two-col">
        <div class="cell" style="width:50%;">
          <h4 style="color:${tealHex};">IV. VITALS</h4>
          ${targetVisit
            ? `<p><strong>BP:</strong> ${targetVisit.bp_sys || "?"}/${targetVisit.bp_dia || "?"}mmHg</p>
               <p><strong>PR:</strong> ${targetVisit.pr ? targetVisit.pr + " bpm" : "N/A"}</p>
               <p><strong>SpO2:</strong> ${targetVisit.spo2 ? targetVisit.spo2 + "%" : "N/A"}</p>
               <p><strong>Temp:</strong> ${targetVisit.temp ? targetVisit.temp + "C" : "N/A"}</p>
               <p style="margin-top:4px; font-size:0.7rem; color:#64748B;">
                 <strong>Status:</strong> ${[
                   targetVisit.is_conscious ? "Conscious" : "Unconscious",
                   targetVisit.is_oriented ? "Oriented" : "Disoriented",
                   targetVisit.is_ambulatory ? "Ambulatory" : "Bed-bound",
                   targetVisit.is_dyspnic ? "Dyspnic" : "Not Dyspnic",
                   targetVisit.is_soft_abdomen ? "Soft Abdomen" : "Abdomen Not Soft"
                 ].join(", ")}
               </p>`
            : `<p style="color:#94a3b8;font-style:italic;">No current vitals.</p>`}
        </div>
        <div class="cell" style="width:50%;">
          <h4 style="color:${tealHex};">${isER ? "IV. EMERGENCY CLINICAL EVALUATION" : "V. LATEST CLINICAL PROGRESS EVALUATION"}</h4>
          <div dir="auto" style="white-space:pre-wrap;font-size:0.75rem;">${field(targetVisit?.exam_notes || "No clinical evaluation recorded.")}</div>
        </div>
      </div>
      ${sectionErTx}
      <div class="section-header" style="color:${tealHex};border-bottom:2px solid ${tealHex};background:transparent;padding-bottom:2px;">
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
  <link rel="preload" as="style" href="${GFONT}" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="${GFONT}"></noscript>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:.82rem;color:#1e293b;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:60px}
    #print-controls{position:fixed;top:0;left:0;right:0;height:60px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;gap:20px;z-index:9999;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1)}
    .btn{padding:10px 20px;border-radius:12px;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s;text-transform:uppercase;letter-spacing:0.05em;border:none}
    .btn-back{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
    .btn-back:hover{background:#e2e8f0;transform:translateY(-1px)}
    .btn-print{background:#0D9488;color:#fff}
    .btn-print:hover{background:#0F766E;transform:translateY(-1px)}
    .btn-pdf{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
    .btn-pdf:hover{background:#e2e8f0;color:#1e293b}
    @page { size: A4; margin: 0; }
    #toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 24px;border-radius:12px;font-size:.8rem;font-weight:600;display:none;z-index:10000;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);animation:slideUp 0.3s ease-out}
    @keyframes slideUp{from{transform:translate(-50%, 100%)}to{transform:translate(-50%, 0)}}
    .page{width:210mm;height:297mm;margin:0 auto;padding:14mm 14mm 10mm;display:flex;flex-direction:column;gap:10px;background:#fff;overflow:hidden;position:relative}
    .header-bar{border-bottom:3px solid #0D9488;padding-bottom:8px;margin-bottom:4px}
    .doctor-name{font-size:.75rem;font-weight:900}
    .report-title{font-size:1.1rem;font-weight:900;text-align:center;color:#1E293B;margin:4px 0;letter-spacing:.04em}
    .report-date{font-size:.7rem;text-align:center;color:#94A3B8}
    .two-col{display:flex;gap:12px;width:100%}
    .cell{padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;width:50%}
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
    <button class="btn btn-back" onclick="window.parent.postMessage('close-pdf-overlay', '*')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Back to App
    </button>
    <div style="width:1px;height:24px;background:#e2e8f0;margin:0 10px"></div>
    <button class="btn btn-print" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
      Print
    </button>
    <button class="btn btn-pdf" onclick="saveAsPdf()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10v4H4v-4M8 2v10m-3-3l3 3 3-3"/></svg>
      Download PDF
    </button>
  </div>
  <div id="toast">Tip: For PDF on iOS, click "Share" then choose "Print" and zoom out on the preview.</div>
  
  <div id="content">${patientPages}</div>

  <script>
    function saveAsPdf() {
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => { window.print(); }, 100);
      setTimeout(() => { toast.style.display = 'none'; }, 5000);
    }
    // No auto-print — user clicks Print when content is ready
  </script>
</body>
</html>`;

  // --- Dynamic Iframe Overlay for iOS PWA Compatibility ---
  const iframe = document.createElement("iframe");
  iframe.id = "pdf-export-overlay";
  Object.assign(iframe.style, {
    position: "fixed", top: "0", left: "0", width: "100%", height: "100%", border: "none", zIndex: "99999", background: "white"
  });

  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) { doc.open(); doc.write(html); doc.close(); }

  const handleMessage = (event: MessageEvent) => {
    if (event.data === 'close-pdf-overlay') {
      const el = document.getElementById("pdf-export-overlay");
      if (el) el.remove();
      window.removeEventListener('message', handleMessage);
    }
  };
  window.addEventListener('message', handleMessage);
}
