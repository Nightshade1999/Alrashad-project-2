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
}

export const DRUG_DICTIONARY: DrugDictionaryItem[] = [
  // --- Internal Medicine Drugs ---
  { id: "im1", name: "Metformin", category: "Internal", standardDosages: ["500mg", "850mg", "1000mg"], standardForms: ["Tablet"] },
  { id: "im2", name: "Amlodipine", category: "Internal", standardDosages: ["5mg", "10mg"], standardForms: ["Tablet"] },
  { id: "im3", name: "Atorvastatin", category: "Internal", standardDosages: ["10mg", "20mg", "40mg", "80mg"], standardForms: ["Tablet"] },
  { id: "im4", name: "Lisinopril", category: "Internal", standardDosages: ["5mg", "10mg", "20mg"], standardForms: ["Tablet"] },
  { id: "im5", name: "Omeprazole", category: "Internal", standardDosages: ["20mg", "40mg"], standardForms: ["Capsule"] },
  { id: "im6", name: "Levothyroxine", category: "Internal", standardDosages: ["25mcg", "50mcg", "100mcg"], standardForms: ["Tablet"] },
  { id: "im7", name: "Aspirin", category: "Internal", standardDosages: ["75mg", "81mg", "300mg"], standardForms: ["Tablet"] },
  { id: "im8", name: "Bisoprolol", category: "Internal", standardDosages: ["2.5mg", "5mg", "10mg"], standardForms: ["Tablet"] },
  { id: "im9", name: "Hydrochlorothiazide", category: "Internal", standardDosages: ["12.5mg", "25mg"], standardForms: ["Tablet"] },
  { id: "im10", name: "Salbutamol (Albuterol)", category: "Internal", standardDosages: ["100mcg/puff"], standardForms: ["Inhaler"] },
  { id: "im11", name: "Losartan", category: "Internal", standardDosages: ["25mg", "50mg", "100mg"], standardForms: ["Tablet"] },
  { id: "im12", name: "Gliclazide", category: "Internal", standardDosages: ["30mg", "60mg", "80mg"], standardForms: ["Tablet (MR)"] },
  { id: "im13", name: "Sitagliptin", category: "Internal", standardDosages: ["25mg", "50mg", "100mg"], standardForms: ["Tablet"] },
  { id: "im14", name: "Insulin Glargine", category: "Internal", standardDosages: ["100U/mL"], standardForms: ["Injection (Pen)"] },
  { id: "im15", name: "Clopidogrel", category: "Internal", standardDosages: ["75mg"], standardForms: ["Tablet"] },
  { id: "im16", name: "Furosemide", category: "Internal", standardDosages: ["20mg", "40mg"], standardForms: ["Tablet", "Injection"] },
  { id: "im17", name: "Spironolactone", category: "Internal", standardDosages: ["25mg", "50mg", "100mg"], standardForms: ["Tablet"] },
  { id: "im18", name: "Rosuvastatin", category: "Internal", standardDosages: ["5mg", "10mg", "20mg", "40mg"], standardForms: ["Tablet"] },
  { id: "im19", name: "Diclofenac Sodium", category: "Internal", standardDosages: ["25mg", "50mg", "100mg"], standardForms: ["Tablet", "Gel", "Injection"] },
  { id: "im20", name: "Naproxen", category: "Internal", standardDosages: ["250mg", "500mg"], standardForms: ["Tablet"] },
  { id: "im21", name: "Methotrexate", category: "Internal", standardDosages: ["2.5mg", "7.5mg", "15mg"], standardForms: ["Tablet"] },
  { id: "im22", name: "Budesonide + Formoterol", category: "Internal", standardDosages: ["160/4.5mcg", "320/9mcg"], standardForms: ["Inhaler (Turbuhaler)"] },
  { id: "im23", name: "Montelukast", category: "Internal", standardDosages: ["4mg", "5mg", "10mg"], standardForms: ["Tablet"] },
  { id: "im24", name: "Carbimazole", category: "Internal", standardDosages: ["5mg", "20mg"], standardForms: ["Tablet"] },
  { id: "im25", name: "Levetiracetam", category: "Internal", standardDosages: ["250mg", "500mg", "1000mg"], standardForms: ["Tablet", "Solution"] },
  { id: "im26", name: "Carbamazepine", category: "Internal", standardDosages: ["200mg", "400mg"], standardForms: ["Tablet (CR)"] },
  { id: "im27", name: "Warfarin", category: "Internal", standardDosages: ["1mg", "3mg", "5mg"], standardForms: ["Tablet"] },
  { id: "im28", name: "Rivaroxaban", category: "Internal", standardDosages: ["10mg", "15mg", "20mg"], standardForms: ["Tablet"] },
  { id: "im29", name: "Allopurinol", category: "Internal", standardDosages: ["100mg", "300mg"], standardForms: ["Tablet"] },
  { id: "im30", name: "Prednisolone", category: "Internal", standardDosages: ["5mg", "20mg"], standardForms: ["Tablet"] },
  
  // --- Psychiatric Drugs ---
  { id: "ps1", name: "Risperidone", category: "Psych", standardDosages: ["1mg", "2mg", "4mg"], standardForms: ["Tablet", "Syrup"] },
  { id: "ps2", name: "Olanzapine", category: "Psych", standardDosages: ["5mg", "10mg", "20mg"], standardForms: ["Tablet"] },
  { id: "ps3", name: "Fluoxetine", category: "Psych", standardDosages: ["20mg", "40mg"], standardForms: ["Capsule"] },
  { id: "ps4", name: "Sertraline", category: "Psych", standardDosages: ["50mg", "100mg"], standardForms: ["Tablet"] },
  { id: "ps5", name: "Escitalopram", category: "Psych", standardDosages: ["10mg", "20mg"], standardForms: ["Tablet"] },
  { id: "ps6", name: "Haloperidol", category: "Psych", standardDosages: ["1.5mg", "5mg"], standardForms: ["Tablet", "Injection"] },
  { id: "ps7", name: "Valproate (Sodium Valproate)", category: "Psych", standardDosages: ["200mg", "500mg"], standardForms: ["Tablet"] },
  { id: "ps8", name: "Lithium Carbonate", category: "Psych", standardDosages: ["300mg", "400mg"], standardForms: ["Tablet"] },
  { id: "ps9", name: "Diazepam", category: "Psych", standardDosages: ["2mg", "5mg", "10mg"], standardForms: ["Tablet", "Injection"] },
  { id: "ps10", name: "Clonazepam", category: "Psych", standardDosages: ["0.5mg", "1mg", "2mg"], standardForms: ["Tablet"] },
  { id: "ps11", name: "Quetiapine", category: "Psych", standardDosages: ["25mg", "100mg", "200mg", "300mg"], standardForms: ["Tablet (XR)"] },
  { id: "ps12", name: "Aripiprazole", category: "Psych", standardDosages: ["5mg", "10mg", "15mg", "30mg"], standardForms: ["Tablet"] },
  { id: "ps13", name: "Clozapine", category: "Psych", standardDosages: ["25mg", "100mg"], standardForms: ["Tablet"] },
  { id: "ps14", name: "Amitriptyline", category: "Psych", standardDosages: ["10mg", "25mg", "50mg"], standardForms: ["Tablet"] },
  { id: "ps15", name: "Venlafaxine", category: "Psych", standardDosages: ["37.5mg", "75mg", "150mg"], standardForms: ["Capsule (XR)"] },
  { id: "ps16", name: "Gabapentin", category: "Psych", standardDosages: ["100mg", "300mg", "600mg"], standardForms: ["Capsule", "Tablet"] },
  { id: "ps17", name: "Pregabalin", category: "Psych", standardDosages: ["50mg", "75mg", "150mg"], standardForms: ["Capsule"] },
  { id: "ps18", name: "Paroxetine", category: "Psych", standardDosages: ["20mg", "30mg"], standardForms: ["Tablet"] },
  { id: "ps19", name: "Chlorpromazine", category: "Psych", standardDosages: ["25mg", "100mg"], standardForms: ["Tablet", "Injection"] },
  { id: "ps20", name: "Lamotrigine", category: "Psych", standardDosages: ["25mg", "50mg", "100mg", "200mg"], standardForms: ["Tablet"] },
];
