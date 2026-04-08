import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline.html",
    image: "/icon.png",
  },
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // skipWaiting intentionally removed — it caused random page reloads.
    // New service workers now wait until all tabs are closed before activating.
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

// Only wrap with PWA in production or when explicitly enabled for testing
// This allows using Turbopack during normal local development
const isPWAEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_PWA === 'true';

export default isPWAEnabled ? withPWA(nextConfig) : nextConfig;
