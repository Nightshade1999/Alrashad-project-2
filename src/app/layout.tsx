import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DatabaseProvider } from "@/hooks/useDatabase";
import { PwaRegistry } from "@/components/pwa/pwa-registry";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { MobileNav } from "@/components/layout/mobile-nav";
import "./globals.css";
import { Suspense } from "react";
import Script from "next/script";
import { DoctorNameModal } from "@/components/dashboard/doctor-name-modal";
import { WelcomeSplash } from "@/components/layout/welcome-splash";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ward Manager - Alrashad Medical",
  description: "Secure clinical management for medical wards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ward App",
  },
  icons: {
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-teal-100 dark:selection:bg-teal-900/30 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        {/* Anti-Flicker Splash Shell (Server-Rendered HTML) */}
        <div 
          id="initial-splash-shell" 
          suppressHydrationWarning
          className="fixed inset-0 z-[10000] bg-linear-to-tr from-emerald-50 via-white to-teal-50 flex items-center justify-center transition-opacity duration-1000"
        >
          <script dangerouslySetInnerHTML={{ __html: `
            if (sessionStorage.getItem('splash_shown')) {
              document.getElementById('initial-splash-shell').style.display = 'none';
            }
          `}} />
        </div>

        <WelcomeSplash />
        <DatabaseProvider>
          <div className="fixed inset-0 bg-linear-to-br from-teal-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
          <PwaRegistry />
          <Script id="tunnel-heartbeat" strategy="afterInteractive">
            {`
              setInterval(() => {
                fetch('/api/health').catch(() => {});
              }, 15000);
            `}
          </Script>
          <main className="relative flex-1 flex flex-col max-w-[1600px] mx-auto w-full pb-24 md:pb-0">
            {children}
          </main>
          <Suspense fallback={null}>
            <DoctorNameModal />
          </Suspense>
          <InstallPrompt />
          <MobileNav />
          <Toaster richColors position="bottom-right" />
        </DatabaseProvider>
      </body>
    </html>
  );
}
