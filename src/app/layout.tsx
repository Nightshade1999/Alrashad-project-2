import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PowerSyncProvider } from "@/lib/powersync/PowerSyncProvider";
import { DatabaseProvider } from "@/hooks/useDatabase";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegistry } from "@/components/pwa/service-worker-registry";
import { VConsoleProvider } from "@/components/pwa/VConsoleProvider";
import "./globals.css";
import { Suspense } from "react";

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
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "Ward App",
    "msapplication-TileColor": "#0d9488",
    "msapplication-tap-highlight": "no",
  },
  formatDetection: {
    telephone: false,
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
      <body className="min-h-full flex flex-col selection:bg-teal-100 dark:selection:bg-teal-900/30">
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        <PowerSyncProvider>
          <DatabaseProvider>
            <VConsoleProvider>
              {children}
              <InstallPrompt />
              <ServiceWorkerRegistry />
            </VConsoleProvider>
          </DatabaseProvider>
        </PowerSyncProvider>
        <Toaster richColors position="bottom-right" />
        <SpeedInsights />
      </body>
    </html>
  );
}
