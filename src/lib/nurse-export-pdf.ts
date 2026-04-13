import { format } from "date-fns"
import { parseArr, formatFrequency } from "./export-common"

/**
 * Nurse Medication Export via HTML Overlay
 * Mirrors the doctor's export style but focused on nursing requirements.
 */
export async function exportNurseMedsToPdf(patients: any[], wardName: string = "") {
  const dateStr = format(new Date(), "dd MMMM yyyy, HH:mm");
  const now = new Date();
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;

  const getActiveInstructions = (p: any): any[] => {
    const all: any[] = p.allInstructions || [];
    if (all.length === 0 && p.lastInstruction) {
      return [p.lastInstruction].filter(Boolean);
    }
    return all.filter((inst: any) => {
      if (inst.instruction_type === 'repetitive') {
        return !inst.expires_at || new Date(inst.expires_at) > now;
      }
      if (!inst.is_read) return true;
      const lastAck = inst.acknowledgments?.[inst.acknowledgments.length - 1];
      return lastAck ? new Date(lastAck.at).getTime() > oneDayAgo : false;
    });
  };

  // Only show instructions column if at least one patient has active instructions
  const hasAnyInstructions = patients.some(p => getActiveInstructions(p).length > 0);

  const rowsHtml = patients.map((p) => {
    const medicalMeds = parseArr(p.medical_drugs)
    const psychMeds = parseArr(p.psych_drugs)
    const allMeds = [...medicalMeds, ...psychMeds]

    const medsHtml = allMeds.length > 0
      ? allMeds.map((m: any) => {
          const numFreq = formatFrequency(m.frequency)
          const freqDisplay = m.frequency ? `${m.frequency}${numFreq && numFreq !== m.frequency ? ` (${numFreq})` : ""}` : ""
          
          return `
            <div style="margin-bottom: 4px; border-bottom: 1px dotted #e2e8f0; padding-bottom: 4px;">
              <strong style="color: #1e293b;">${m.name || m}</strong> 
              <span style="color: #64748b; font-size: 0.75rem; margin-left: 8px;">${m.dosage || ""} &middot; ${freqDisplay}</span>
            </div>
          `
        }).join("")
      : `<div style="color: #94a3b8; font-style: italic;">No medications recorded</div>`

    const activeInstructions = getActiveInstructions(p);
    const instructionsHtml = activeInstructions.length > 0
      ? activeInstructions.map((inst: any) => {
          const text = inst.instruction || inst.text || '';
          const doctor = inst.doctor_name ? `<span style="color:#475569;font-size:0.62rem;display:block;margin-top:1px;">Ordered by: ${inst.doctor_name}</span>` : '';
          const endDate = inst.instruction_type === 'repetitive' && inst.expires_at 
            ? `<span style="color:#d97706;font-size:0.62rem;display:block;margin-top:1px;">Active until: ${new Date(inst.expires_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>` 
            : '';
          const signed = inst.is_read && inst.acknowledgments?.length > 0
            ? `<span style="color:#059669;font-weight:700;font-size:0.65rem;display:block;margin-top:2px;">✓ SIGNED by ${inst.acknowledgments[inst.acknowledgments.length-1].nurse_name}</span>`
            : `<span style="color:#94a3b8;font-size:0.65rem;display:block;margin-top:2px;">Pending</span>`;
          return `<div style="margin-bottom:6px;padding-bottom:4px;border-bottom:1px dotted #e2e8f0"><strong style="color:#0f172a;">${text}</strong>${doctor}${endDate}${signed}</div>`;
        }).join('')
      : `<div style="color:#94a3b8;font-style:italic;">None</div>`;

    const instrWidth = hasAnyInstructions ? 30 : 0;
    const medsWidth = hasAnyInstructions ? 45 : 70;
    const nameWidth = hasAnyInstructions ? 25 : 30;

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; width: ${nameWidth}%;">
          <div style="font-weight: 900; color: #0f172a; font-size: 1rem;">${p.name || "N/A"}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; width: ${medsWidth}%;">
          ${medsHtml}
        </td>
        ${hasAnyInstructions ? `<td style="padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; width: ${instrWidth}%;">${instructionsHtml}</td>` : ''}
      </tr>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ward Medication Report - ${wardName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', -apple-system, sans-serif; 
      background: #f8fafc; 
      color: #1e293b; 
      line-height: 1.5;
      padding-top: 70px;
    }

    #print-controls {
      position: fixed; top: 0; left: 0; right: 0; height: 70px;
      background: white; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: center; gap: 20px;
      z-index: 9999; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .btn {
      padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 8px;
      transition: all 0.2s; border: 1px solid #e2e8f0; background: #fff; color: #475569;
    }
    .btn:hover { background: #f1f5f9; transform: translateY(-1px); }
    .btn-primary { background: #3b82f6; color: white; border-color: #2563eb; }
    .btn-primary:hover { background: #2563eb; }

    .page {
      width: 210mm; margin: 20px auto; background: white; padding: 20mm;
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); min-height: 297mm;
    }

    .header {
      border-bottom: 4px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px;
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .header-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; }
    .header-info { text-align: right; font-size: 0.8rem; color: #64748b; font-weight: 600; }

    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { 
      background: #f1f5f9; padding: 12px; text-align: left; 
      font-size: 0.7rem; font-weight: 900; text-transform: uppercase; 
      letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #e2e8f0;
    }
    
    .footer {
      margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;
      text-align: center; font-size: 0.7rem; color: #94a3b8; font-weight: 600;
    }

    @media print {
      body { padding: 0; background: white; }
      #print-controls { display: none !important; }
      .page { width: 100%; margin: 0; padding: 15mm; box-shadow: none; min-height: auto; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div id="print-controls">
    <button class="btn" onclick="window.parent.postMessage('close-nurse-export', '*')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Back to Ward
    </button>
    <button class="btn btn-primary" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/></svg>
      Print Medication Sheet
    </button>
    <button class="btn" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v4H4v-4M8 2v10m-3-3l3 3 3-3"/></svg>
      Save as PDF
    </button>
  </div>

  <div class="page">
    <div class="header">
      <div>
        <div class="header-title">Ward Nursing Report</div>
        <div style="color: #3b82f6; font-weight: 700; font-size: 0.9rem;">${wardName} Ward</div>
      </div>
      <div class="header-info">
        <div>Generated: ${dateStr}</div>
        <div>Total Patients: ${patients.length}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Patient Name</th>
          <th>Chronic Medications, Dosage & Frequency</th>
          ${hasAnyInstructions ? '<th style="color:#0d9488;">Active Nursing Instructions</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer">
      Ward Manager Clinical Reporting &middot; Confidential Patient Record &middot; ${wardName.toUpperCase()}
    </div>
  </div>

  <script>
    // Message listener to handle close command locally if needed
  </script>
</body>
</html>`

  const iframe = document.createElement("iframe")
  iframe.id = "nurse-export-overlay"
  Object.assign(iframe.style, {
    position: "fixed", top: "0", left: "0", width: "100%", height: "100%", border: "none", zIndex: "99999", background: "white"
  })

  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data === 'close-nurse-export') {
      const el = document.getElementById("nurse-export-overlay")
      if (el) el.remove()
      window.removeEventListener('message', handleMessage)
    }
  }
  window.addEventListener('message', handleMessage)
}
