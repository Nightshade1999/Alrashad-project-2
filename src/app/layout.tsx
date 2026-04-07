import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PowerSyncProvider } from "@/lib/powersync/PowerSyncProvider";
import { SyncStatus } from "@/components/pwa/SyncStatus";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-teal-100 dark:selection:bg-teal-900/30">
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        <PowerSyncProvider>
          {children}
          <SyncStatus />
          <InstallPrompt />
        </PowerSyncProvider>
        <Toaster richColors position="bottom-right" />
        <SpeedInsights />
      </body>
    </html>
  );
}
