export const COMMON_DISEASES = [
  "Hypertension (HTN)",
  "Diabetes Mellitus Type 2 (T2DM)",
  "Diabetes Mellitus Type 1 (T1DM)",
  "Ischemic Heart Disease (IHD)",
  "Asthma",
  "Chronic Obstructive Pulmonary Disease (COPD)",
  "Chronic Kidney Disease (CKD)",
  "Heart Failure (CHF)",
  "Osteoarthritis",
  "Rheumatoid Arthritis",
  "Dyslipidemia",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Stroke (CVA)",
  "Epilepsy",
  "Liver Cirrhosis",
  "PVD (Peripheral Vascular Disease)",
  "DVT (Deep Vein Thrombosis)",
  "PE (Pulmonary Embolism)",
];

export const GENERAL_SURGERIES = [
  "Appendectomy",
  "Cholecystectomy",
  "Hernia Repair",
  "Laparotomy",
  "Hemorrhoidectomy",
  "Thyroidectomy",
  "Gastrectomy",
  "Splenectomy",
];

export const ORTHO_SURGERIES = [
  "ORIF (Fracture Fixation)",
  "Total Knee Replacement",
  "Total Hip Replacement",
  "Arthroscopy",
  "Amputation",
  "Debridement",
];

export const OBGYN_SURGERIES = [
  "Cesarean Section",
  "Hysterectomy",
  "Oophorectomy",
  "Myomectomy",
  "D&C",
  "Tubal Ligation",
];

export const CVT_SURGERIES = [
  "CABG",
  "PCI (Stenting)",
  "Pacemaker Insertion",
  "AV Fistula",
  "Valve Replacement",
];

export const URO_SURGERIES = [
  "Prostatectomy",
  "TURP",
  "Nephrectomy",
  "Cystoscopy",
  "Circumcision",
];

export const ENT_SURGERIES = [
  "Tonsillectomy",
  "Septoplasty",
  "Adenoidectomy",
  "Mastoidectomy",
  "Myringotomy",
];

export const EYE_SURGERIES = [
  "Cataract Surgery",
  "Vitrectomy",
  "LASIK",
  "Glaucoma Surgery",
];

export const NEURO_SURGERIES = [
  "Craniotomy",
  "Spinal Fusion",
  "VP Shunt Insertion",
  "Discectomy",
  "Laminectomy",
];

export const ALL_SURGERIES = [
  ...GENERAL_SURGERIES,
  ...ORTHO_SURGERIES,
  ...OBGYN_SURGERIES,
  ...CVT_SURGERIES,
  ...URO_SURGERIES,
  ...ENT_SURGERIES,
  ...EYE_SURGERIES,
  ...NEURO_SURGERIES,
];

export const FEMALE_SURGERIES = OBGYN_SURGERIES;
export const MALE_SURGERIES = URO_SURGERIES;

export const COMMON_ALLERGIES = [
  "Penicillins",
  "Cephalosporins",
  "NSAIDs (Ibuprofen, Naproxen, etc.)",
  "Sulfa drugs (Sulfonamides)",
  "Anticonvulsants",
  "Contrast Media (Iodinated)",
  "ACE Inhibitors",
  "Local Anesthetics (Lidocaine, etc.)",
  "General Anesthetics",
  "Aminoglycosides",
  "Fluoroquinolones",
  "Macrolides",
  "Latex",
  "Iodine",
  "No known drug allergy",
  "Unknown",
];

export interface DrugDictionaryItem {
  id: string;
  name: string;
  category: "Internal" | "Psych";
  standardDosages: string[];
  standardForms: string[];
  standardFrequencies: string[];
}

export const DRUG_DICTIONARY: DrugDictionaryItem[] = [
  // --- Internal Medicine Drugs ---
  { id: "im1", name: "Metformin", category: "Internal", standardDosages: ["500mg", "850mg", "1000mg", "XR 500mg", "XR 750mg", "XR 1000mg"], standardForms: ["Tablet"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "1x3 thrice daily", "O\\N"] },
  { id: "im2", name: "Amlodipine", category: "Internal", standardDosages: ["5mg", "10mg", "2.5mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "O\\N"] },
  { id: "im3", name: "Atorvastatin", category: "Internal", standardDosages: ["20mg", "40mg", "10mg", "80mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "O\\N", "1x2 twice daily"] },
  { id: "im4", name: "Lisinopril", category: "Internal", standardDosages: ["10mg", "20mg", "5mg", "40mg", "2.5mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im5", name: "Omeprazole", category: "Internal", standardDosages: ["20mg", "40mg", "10mg", "20mg (Inj)"], standardForms: ["Capsule"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "PRN (as needed)"] },
  { id: "im6", name: "Levothyroxine", category: "Internal", standardDosages: ["50mcg", "100mcg", "25mcg", "150mcg", "125mcg", "75mcg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "Before Breakfast"] },
  { id: "im7", name: "Aspirin", category: "Internal", standardDosages: ["81mg", "75mg", "100mg", "300mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "PRN (as needed)"] },
  { id: "im8", name: "Bisoprolol", category: "Internal", standardDosages: ["2.5mg", "5mg", "1.25mg", "10mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "O\\N"] },
  { id: "im9", name: "Hydrochlorothiazide", category: "Internal", standardDosages: ["25mg", "12.5mg", "50mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im10", name: "Salbutamol", category: "Internal", standardDosages: ["100mcg/puff", "200mcg/puff", "2.5mg (Neb)", "5mg (Neb)"], standardForms: ["Inhaler", "Nebulization"], standardFrequencies: ["PRN (as needed)", "1x4 four times daily", "1x2 twice daily", "Every 4-6h"] },
  { id: "im11", name: "Losartan", category: "Internal", standardDosages: ["50mg", "100mg", "25mg", "50/12.5 HCT"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im12", name: "Gliclazide", category: "Internal", standardDosages: ["60mg", "30mg", "80mg", "MR 30mg", "MR 60mg"], standardForms: ["Tablet (MR)"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im13", name: "Sitagliptin", category: "Internal", standardDosages: ["100mg", "50mg", "25mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im14", name: "Insulin Glargine", category: "Internal", standardDosages: ["Units as Directed", "10Units", "20Units", "30Units", "40Units", "Lantus SoloStar"], standardForms: ["Injection (Pen)"], standardFrequencies: ["O\\N", "1x1 once daily", "SC nightly"] },
  { id: "im15", name: "Clopidogrel", category: "Internal", standardDosages: ["75mg", "300mg (Loading)", "150mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im16", name: "Furosemide", category: "Internal", standardDosages: ["40mg", "20mg", "80mg", "10mg (Inj)", "20mg (Inj)", "40mg (Inj)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "PRN (as needed)"] },
  { id: "im17", name: "Spironolactone", category: "Internal", standardDosages: ["25mg", "50mg", "100mg", "25/20 Aldactide"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im18", name: "Rosuvastatin", category: "Internal", standardDosages: ["10mg", "20mg", "5mg", "40mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x1 once daily", "1x2 twice daily"] },
  { id: "im19", name: "Diclofenac", category: "Internal", standardDosages: ["50mg", "75mg/3mL", "100mg", "25mg", "Gel", "50mg (Supp)", "100mg (Supp)"], standardForms: ["Tablet", "Gel", "Injection", "Suppository"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "PRN (as needed)", "O\\N"] },
  { id: "im20", name: "Naproxen", category: "Internal", standardDosages: ["500mg", "250mg", "375mg", "500-Esomeprazole"], standardForms: ["Tablet"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "PRN (as needed)"] },
  { id: "im21", name: "Methotrexate", category: "Internal", standardDosages: ["7.5mg", "15mg", "2.5mg", "5mg", "10mg", "20mg"], standardForms: ["Tablet"], standardFrequencies: ["Weekly", "Weekly (as directed)"] },
  { id: "im22", name: "Budesonide + Formoterol", category: "Internal", standardDosages: ["160/4.5mcg", "320/9mcg", "80/4.5mcg"], standardForms: ["Inhaler (Turbuhaler)"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "PRN (as needed)"] },
  { id: "im23", name: "Montelukast", category: "Internal", standardDosages: ["10mg", "4mg", "5mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x1 once daily"] },
  { id: "im24", name: "Carbimazole", category: "Internal", standardDosages: ["20mg", "5mg", "10mg", "15mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "im25", name: "Levetiracetam", category: "Internal", standardDosages: ["500mg", "1000mg", "250mg", "750mg", "500mg (Inj)"], standardForms: ["Tablet", "Solution", "Injection"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "1x3 thrice daily"] },
  { id: "im26", name: "Carbamazepine", category: "Internal", standardDosages: ["200mg", "400mg", "100mg", "600mg", "Retard 200mg", "Retard 400mg"], standardForms: ["Tablet (CR)"], standardFrequencies: ["1x2 twice daily", "O\\N", "1x3 thrice daily"] },
  { id: "im27", name: "Warfarin", category: "Internal", standardDosages: ["3mg", "5mg", "1mg", "2mg", "10mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x1 once daily", "As directed (INR)"] },
  { id: "im28", name: "Rivaroxaban", category: "Internal", standardDosages: ["20mg", "15mg", "10mg", "2.5mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im29", name: "Allopurinol", category: "Internal", standardDosages: ["100mg", "300mg", "200mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily"] },
  { id: "im30", name: "Prednisolone", category: "Internal", standardDosages: ["20mg", "40mg", "5mg", "10mg", "1mg", "25mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "As directed (tapering)"] },
  
  // --- Psychiatric Drugs ---
  { id: "ps1", name: "Risperidone", category: "Psych", standardDosages: ["1mg", "2mg", "0.5mg", "4mg", "6mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "O\\N"] },
  { id: "ps2", name: "Olanzapine", category: "Psych", standardDosages: ["5mg", "10mg", "2.5mg", "20mg", "15mg", "10mg (IM)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["O\\N", "1x2 twice daily", "PRN (as needed)"] },
  { id: "ps3", name: "Fluoxetine", category: "Psych", standardDosages: ["20mg", "40mg", "10mg", "60mg"], standardForms: ["Capsule"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x1 (Morning)"] },
  { id: "ps4", name: "Sertraline", category: "Psych", standardDosages: ["50mg", "100mg", "25mg", "150mg", "200mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "O\\N", "1x2 twice daily"] },
  { id: "ps5", name: "Escitalopram", category: "Psych", standardDosages: ["10mg", "20mg", "5mg", "15mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "O\\N"] },
  { id: "ps6", name: "Haloperidol", category: "Psych", standardDosages: ["5mg", "1.5mg", "0.5mg", "10mg", "20mg", "5mg (IM)", "50mg (Decanoate)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "O\\N", "PRN (as needed)", "IM", "IV", "1x1 once daily"] },
  { id: "ps7", name: "Valproate", category: "Psych", standardDosages: ["500mg", "200mg", "300mg", "1000mg", "400mg (Inj)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["1x2 twice daily", "O\\N", "1x3 thrice daily"] },
  { id: "ps8", name: "Lithium Carbonate", category: "Psych", standardDosages: ["400mg", "300mg", "600mg", "450mg", "200mg"], standardForms: ["Tablet"], standardFrequencies: ["1x2 twice daily", "O\\N", "1x3 thrice daily"] },
  { id: "ps9", name: "Diazepam", category: "Psych", standardDosages: ["5mg", "10mg", "2mg", "20mg", "10mg (Inj)", "5mg (Inj)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["O\\N", "1x2 twice daily", "PRN (as needed)", "1x3 thrice daily", "IV", "IM"] },
  { id: "ps10", name: "Clonazepam", category: "Psych", standardDosages: ["0.5mg", "1.0mg", "0.25mg", "2.0mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x2 twice daily", "PRN (as needed)"] },
  { id: "ps11", name: "Quetiapine", category: "Psych", standardDosages: ["300mg", "100mg", "200mg", "25mg", "50mg", "400mg", "XR 50mg", "XR 200mg"], standardForms: ["Tablet (XR)"], standardFrequencies: ["O\\N", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "ps12", name: "Aripiprazole", category: "Psych", standardDosages: ["10mg", "15mg", "5mg", "30mg", "20mg", "9.75mg (IM)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["1x1 once daily", "O\\N"] },
  { id: "ps13", name: "Clozapine", category: "Psych", standardDosages: ["100mg", "25mg", "50mg", "200mg", "300mg", "400mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "ps14", name: "Amitriptyline", category: "Psych", standardDosages: ["25mg", "10mg", "50mg", "75mg", "100mg"], standardForms: ["Tablet"], standardFrequencies: ["O\\N", "1x2 twice daily"] },
  { id: "ps15", name: "Venlafaxine", category: "Psych", standardDosages: ["75mg", "150mg", "37.5mg", "225mg"], standardForms: ["Capsule (XR)"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "ps16", name: "Gabapentin", category: "Psych", standardDosages: ["300mg", "600mg", "100mg", "400mg", "800mg"], standardForms: ["Capsule", "Tablet"], standardFrequencies: ["1x3 thrice daily", "O\\N", "1x2 twice daily", "PRN (as needed)"] },
  { id: "ps17", name: "Pregabalin", category: "Psych", standardDosages: ["75mg", "150mg", "25mg", "50mg", "300mg"], standardForms: ["Capsule"], standardFrequencies: ["1x2 twice daily", "O\\N", "PRN (as needed)", "1x3 thrice daily"] },
  { id: "ps18", name: "Paroxetine", category: "Psych", standardDosages: ["20mg", "30mg", "10mg", "40mg", "12.5mg (CR)", "25mg (CR)"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "O\\N"] },
  { id: "ps19", name: "Chlorpromazine", category: "Psych", standardDosages: ["100mg", "25mg", "50mg", "200mg", "50mg (Inj)"], standardForms: ["Tablet", "Injection"], standardFrequencies: ["O\\N", "1x3 thrice daily", "1x2 twice daily", "PRN (as needed)"] },
  { id: "ps20", name: "Lamotrigine", category: "Psych", standardDosages: ["100mg", "200mg", "25mg", "50mg", "150mg", "5mg"], standardForms: ["Tablet"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "O\\N"] },

  // --- ER / Emergency Medications (IV/IM) ---
  { id: "er1", name: "Paracetamol", category: "Internal", standardDosages: ["1g (IV)", "500mg (IV)", "1g (Tablet)", "500mg (Tablet)"], standardForms: ["IV Infusion", "Tablet", "Suppository"], standardFrequencies: ["1x3 thrice daily", "PRN (as needed)", "1x4 four times daily", "1x2 twice daily"] },
  { id: "er2", name: "Ceftriaxone", category: "Internal", standardDosages: ["1g (IV)", "2g (IV)", "500mg (IV)", "1g (IM)", "2g (IM)"], standardForms: ["Injection"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "O\\N"] },
  { id: "er3", name: "Metoclopramide", category: "Internal", standardDosages: ["10mg (IV)", "10mg (IM)", "10mg (Tablet)", "5mg (IV)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x3 thrice daily", "PRN (as needed)", "1x2 twice daily"] },
  { id: "er4", name: "Ondansetron", category: "Internal", standardDosages: ["8mg (IV)", "4mg (IV)", "8mg (Tablet)", "4mg (Tablet)", "2mg/mL"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "PRN (as needed)", "1x4 four times daily"] },
  { id: "er5", name: "Hydrocortisone", category: "Internal", standardDosages: ["100mg (IV)", "200mg (IV)", "100mg (IM)", "500mg (IV)", "50mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["1x3 thrice daily", "1x4 four times daily", "1x2 twice daily"] },
  { id: "er6", name: "Dexamethasone", category: "Internal", standardDosages: ["8mg (IV)", "4mg (IV)", "4mg (Tablet)", "16mg (IV)", "2mg (IV)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily", "PRN (as needed)"] },
  { id: "er7", name: "Furosemide", category: "Internal", standardDosages: ["40mg (IV)", "20mg (IV)", "80mg (IV)", "250mg (Drip)", "10mg/mL"], standardForms: ["Injection"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "IV Infusion", "PRN (as needed)"] },
  { id: "er8", name: "Adrenaline", category: "Internal", standardDosages: ["1mg (1:10k) IV", "0.5mg (1:1k) IM", "0.3mg (1:1k) IM", "Nebulized 5mL", "0.1mg (IV)"], standardForms: ["Injection", "Inhalation"], standardFrequencies: ["Every 3-5 mins (CPR)", "Every 15 mins (Anaphylaxis)", "then Infusion"] },
  { id: "er9", name: "Atropine", category: "Internal", standardDosages: ["0.6mg (IV)", "1mg (IV)", "3mg (IV - Overdose)", "0.5mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["Every 3-5 mins (Bradycardia)", "Every 5 mins (OP Poisoning)"] },
  { id: "er10", name: "Tramadol", category: "Internal", standardDosages: ["50mg (IV)", "100mg (IV)", "100mg (Tablet)", "50mg (Tablet)", "50mg (IM)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x3 thrice daily", "PRN (as needed)", "1x2 twice daily", "O\\N"] },
  { id: "er11", name: "Morphine", category: "Internal", standardDosages: ["5mg (IV/IM)", "10mg (IV/IM)", "2mg (IV)", "Morphine Drip", "1mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["PRN (as needed)", "1x4 four times daily", "then Infusion"] },
  { id: "er12", name: "Diazepam", category: "Psych", standardDosages: ["10mg (IV)", "5mg (IV)", "5mg (PO)", "2.5mg (IV)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["Every 10-15 mins (Status)", "1x2 twice daily", "PRN (as needed)", "O\\N"] },
  { id: "er13", name: "Midazolam", category: "Psych", standardDosages: ["5mg (IV/IM)", "2.5mg (IV)", "10mg (IM)", "Drip 1-5mg/hr", "1mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["PRN (as needed)", "then Infusion", "Every 5-10 mins"] },
  { id: "er14", name: "Phenytoin", category: "Internal", standardDosages: ["250mg (IV)", "1g (Loading)", "100mg (PO)", "200mg (PO)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x1 once daily", "1x3 thrice daily", "then O\\N"] },
  { id: "er15", name: "Omeprazole", category: "Internal", standardDosages: ["40mg (IV)", "80mg Bolus", "Drip 8mg/hr", "20mg (PO)", "40mg (PO)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "Bolus", "then Infusion"] },
  { id: "er16", name: "Buscopan", category: "Internal", standardDosages: ["20mg (IV/IM)", "10mg (Tablet)", "40mg (IV)", "20mg (Tablet)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x3 thrice daily", "PRN (as needed)", "1x4 four times daily"] },
  { id: "er17", name: "Amiodarone", category: "Internal", standardDosages: ["300mg (IV)", "150mg (IV)", "Drip 900mg/24hr", "200mg (PO)", "100mg (PO)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["Bolus", "then Infusion", "1x1 once daily"] },
  { id: "er18", name: "Heparin", category: "Internal", standardDosages: ["5000Units (SC)", "7500Units (SC)", "1000Units (SC)"], standardForms: ["Injection"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "Bolus", "then Infusion", "SC once daily"] },
  { id: "er19", name: "Normal Saline 0.9%", category: "Internal", standardDosages: ["500mL", "1000mL", "250mL", "100mL", "Bolus 500mL"], standardForms: ["IV Fluid"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily", "K.V.O (Slow)", "bolus"] },
  { id: "er20", name: "Ringer's Lactate", category: "Internal", standardDosages: ["500mL", "1000mL", "250mL", "Bolus 500mL"], standardForms: ["IV Fluid"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily", "bolus"] },
  { id: "er21", name: "Dextrose 5%", category: "Internal", standardDosages: ["500mL", "1000mL", "250mL", "100mL"], standardForms: ["IV Fluid"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily", "K.V.O (Slow)"] },

  // --- Expanded ER / specialized medications ---
  { id: "er22", name: "Vancomycin", category: "Internal", standardDosages: ["1g (IV)", "500mg (IV)", "1.5g (IV)", "250mg (IV)"], standardForms: ["IV Infusion"], standardFrequencies: ["1x2 twice daily", "1x1 once daily"] },
  { id: "er23", name: "Metronidazole", category: "Internal", standardDosages: ["500mg (IV)", "500mg (Tablet)", "250mg (Tablet)", "200mg (Tablet)"], standardForms: ["IV Infusion", "Tablet"], standardFrequencies: ["1x3 thrice daily", "1x2 twice daily", "1x4 four times daily"] },
  { id: "er24", name: "Meropenem", category: "Internal", standardDosages: ["1g (IV)", "500mg (IV)", "2g (IV)"], standardForms: ["Injection"], standardFrequencies: ["1x3 thrice daily", "1x2 twice daily", "IV Infusion"] },
  { id: "er25", name: "Ciprofloxacin", category: "Internal", standardDosages: ["400mg (IV)", "200mg (IV)", "500mg (Tab)", "750mg (Tab)", "250mg (Tab)"], standardForms: ["IV Infusion", "Tablet"], standardFrequencies: ["1x2 twice daily", "1x1 once daily", "1x3 thrice daily"] },
  { id: "er26", name: "Gentamicin", category: "Internal", standardDosages: ["160mg (IV)", "80mg (IV)", "240mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "er27", name: "Acupan", category: "Internal", standardDosages: ["20mg (IV/IM)", "40mg (PO)", "20mg (Tablet)", "10mg (IV)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x3 thrice daily", "PRN (as needed)", "1x1 once daily", "1x2 twice daily"] },
  { id: "er28", name: "Ketorolac", category: "Internal", standardDosages: ["30mg (IV/IM)", "15mg (IV/IM)", "60mg (IM)", "10mg (PO)", "20mg (PO)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x2 twice daily", "PRN (as needed)", "1x3 thrice daily", "1x4 four times daily"] },
  { id: "er29", name: "Fuscidin Cream", category: "Internal", standardDosages: ["2%", "15g", "30g", "5g"], standardForms: ["Topical Cream"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "1x1 once daily", "PRN (as needed)"] },
  { id: "er30", name: "Clotrimazole Cream", category: "Internal", standardDosages: ["1%", "20g", "50g", "10g"], standardForms: ["Topical Cream"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "O\\N", "PRN (as needed)"] },
  { id: "er31", name: "Nexium", category: "Internal", standardDosages: ["40mg (IV)", "20mg (IV)", "80mg Boldus", "20mg (Tab)", "40mg (Tab)"], standardForms: ["Injection", "Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "IV Infusion"] },
  { id: "er32", name: "Glucose Saline", category: "Internal", standardDosages: ["500mL", "1000mL", "250mL", "100mL"], standardForms: ["IV Fluid"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily", "bolus"] },
  { id: "er33", name: "Calcium Gluconate", category: "Internal", standardDosages: ["10%", "10mL (IV)", "20mL (IV)", "1g", "2g"], standardForms: ["Injection"], standardFrequencies: ["1x2 twice daily", "then Infusion", "Every 6h"] },
  { id: "er34", name: "Calcium Tablet", category: "Internal", standardDosages: ["600mg", "500mg", "1.2g", "1000mg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "1x3 thrice daily"] },
  { id: "er35", name: "KCl Inj", category: "Internal", standardDosages: ["1.5g/10mL", "20mEq", "10mEq", "40mEq", "Drip 20mEq/L"], standardForms: ["Injection"], standardFrequencies: ["Diluted", "1x2 twice daily", "1x3 thrice daily", "Infusion (as directed)", "Every 8h"] },
  { id: "er36", name: "One-Alpha", category: "Internal", standardDosages: ["0.25mcg", "0.5mcg", "1.0mcg", "2mcg"], standardForms: ["Tablet"], standardFrequencies: ["1x1 once daily", "O\\N", "Alternate Days"] },
  { id: "er37", name: "Venofer", category: "Internal", standardDosages: ["100mg/5mL", "200mg", "300mg", "500mg"], standardForms: ["IV Infusion"], standardFrequencies: ["Weekly", "B.I.W (Twice Weekly)", "1x1 once daily", "Alternate Days", "Bolus"] },
  { id: "er38", name: "Hypertonic G.W", category: "Internal", standardDosages: ["10%", "25%", "50%", "25mL Bolus", "50mL Bolus", "500mL (10%)"], standardForms: ["IV Fluid"], standardFrequencies: ["1x1 once daily", "1x2 twice daily", "then Infusion", "K.V.O (Slow)"] },
  { id: "er39", name: "MgSo4", category: "Internal", standardDosages: ["50%", "1g", "2g", "4g", "5g", "2.47g/5mL"], standardForms: ["Injection"], standardFrequencies: ["1x2 twice daily", "Infusion (as directed)", "bolus", "Every 4h"] },
  { id: "er40", name: "Pulmicort Neb", category: "Internal", standardDosages: ["0.5mg", "0.25mg", "1.0mg", "2mg"], standardForms: ["Nebulization"], standardFrequencies: ["1x2 twice daily", "1x3 thrice daily", "1x1 once daily", "PRN (as needed)"] },
  { id: "er41", name: "Ventolin Neb", category: "Internal", standardDosages: ["5.0mg", "2.5mg"], standardForms: ["Nebulization"], standardFrequencies: ["PRN (as needed)", "1x3 thrice daily", "1x4 four times daily", "Every 20 mins (Severe)", "Every 1h"] },
  { id: "er42", name: "Atrovent Neb", category: "Internal", standardDosages: ["500mcg", "250mcg"], standardForms: ["Nebulization"], standardFrequencies: ["1x3 thrice daily", "1x2 twice daily", "1x4 four times daily", "PRN (as needed)"] },
  { id: "er43", name: "Aminophylline", category: "Internal", standardDosages: ["250mg (IV)", "Loading Dose", "100mg (IV)"], standardForms: ["Injection"], standardFrequencies: ["1x2 twice daily", "IV Infusion (as directed)", "then Infusion"] },
  { id: "er44", name: "Clexane", category: "Internal", standardDosages: ["40mg", "20mg", "60mg", "80mg"], standardForms: ["Injection"], standardFrequencies: ["SC once daily", "SC twice daily", "IV Bolus"] },
  { id: "er45", name: "Insulin Soluble", category: "Internal", standardDosages: ["Sliding Scale", "2Units", "4Units", "6Units", "10Units"], standardForms: ["Injection"], standardFrequencies: ["SC before meals", "PRN (as needed)", "IV Infusion (DKA)", "Every 1h"] },
  { id: "er46", name: "Insulin Lente", category: "Internal", standardDosages: ["Units as directed", "10Units", "20Units", "30Units", "40Units"], standardForms: ["Injection"], standardFrequencies: ["O\\N", "1x1 once daily", "1x2 twice daily"] },
  { id: "er47", name: "Insulin Mixtard", category: "Internal", standardDosages: ["Units as directed", "10Units", "20Units", "30Units", "40Units"], standardForms: ["Injection"], standardFrequencies: ["SC before meals", "1x1 once daily", "1x3 thrice daily"] },
];

export const COMMON_FREQUENCIES = [
  "1x1 once daily",
  "1x2 twice daily",
  "1x3 thrice daily",
  "1x4 four times daily",
  "O\\N",
  "PRN (as needed)",
  "Weekly",
];
