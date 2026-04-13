# Ward Manager - Clinical Operations Hub

A professional-grade medical ward management system built with Next.js, Supabase, and Google Gemini AI. Features real-time patient monitoring, clinical research tools, and AI-powered safety insights.

## 🚀 Getting Started

### 1. Project Setup
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory and provide the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (Required for Admin Analytics)

# AI Service Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

## 🛠 Features

- **Real-time Patient List**: Categorized by risk Level (High Risk, Close Follow-up, Normal).
- **Clinical Hub**: Comprehensive medical dictionary (Surgeries, Chronic Diseases, Drug Families).
- **AI Safety Monitor**: Scans ward data for critical alerts using Gemini Pro.
- **Biostatistics Suite**: Built-in T-Test, Chi-Square, and Pearson Correlation for medical research.
- **Offline Support**: Full PWA capabilities with background synchronization.

## 🔒 Security

- **Row Level Security (RLS)**: Patients and records are protected by strict Supabase policies.
- **Ward Isolation**: Doctors only see data from their assigned medical ward.
- **Service Role Protection**: Global statistics are only accessible via the Service Role key in the administrative dashboard.

## 📱 Mobile Optimized
Designed for clinical use on iOS and Android with notch support, auto-zoom prevention, and Arabic digit sanitization.
