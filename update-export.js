const fs = require('fs');
let code = fs.readFileSync('src/lib/export-utils.ts', 'utf8');

const anchor1 = 'const sections = patients.map((p, index) => {';
const startIdx = code.indexOf(anchor1);
const anchor2 = 'const doc = new Document({ sections })';
const endIdx = code.indexOf(anchor2, startIdx);

let originalMap = code.slice(startIdx, endIdx);

let newMap = originalMap;

// 1. Inject variables at top
newMap = newMap.replace('const children: any[] = [];', `
    // ── Calculate Projected Line Count for 1-Page Rule ──
    const erVisitsForDoc = (p.visits || []).filter((v: any) => v.is_er);
    erVisitsForDoc.sort((a: any, b: any) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    const targetVisit = erVisitsForDoc.length > 0 ? erVisitsForDoc[0] : (p.visits?.[0] || null);

    let docErLabs = (p.investigations || []).filter((inv: any) => inv.is_er);
    if (docErLabs.length === 0 && p.investigations?.length > 0) docErLabs = [p.investigations[0]];

    const noteLines = targetVisit ? (targetVisit.exam_notes || "").split("\\n").length : 1;
    const admissionNoteLines = (p.er_admission_notes || "").split("\\n").length;
    const medsCount = (p.medical_drugs || []).length + (p.psych_drugs || []).length;
    const erTxCount = (p.er_treatment || []).length;

    const projectedLines = 6 + Math.max(5+medsCount, 6+admissionNoteLines) + Math.max(5, 2+noteLines) + 2+erTxCount + 2+Math.min(5, docErLabs.length);

    let fontSizeOffset = 0;
    let limitLabs = false;
    
    if (projectedLines > 36) {
       fontSizeOffset = 2; // shrink by 1pt universally
       if (projectedLines > 45) {
          limitLabs = true; // limit to last ER investigation
       }
    }
    
    // Safety clamped scaling method
    const sz = (baseValue) => Math.max(16, baseValue - fontSizeOffset);

    const children: any[] = [];`);

// 2. Wrap all explicit sizes with sz()
newMap = newMap.replace(/size: (\d{2})/g, 'size: sz($1)');

// 3. Update limitLabs constraint logic deep inside the map
newMap = newMap.replace('const isDocLarge = children.length > 40;', '');
newMap = newMap.replace('const labsToPrint = isDocLarge ? erLabs.slice(0, 1) : erLabs.slice(0, 5);', 'const labsToPrint = limitLabs ? erLabs.slice(0, 1) : erLabs.slice(0, 5);');

code = code.replace(originalMap, newMap);
fs.writeFileSync('src/lib/export-utils.ts', code);
console.log('Update Complete!');
