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
  reloadOnOnline: false, // Prevents reloads when network status changes
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: false,    // Critical: prevents automatic reloads on new SW detection
    clientsClaim: false,   // Critical: prevents new SW from taking control of open tabs immediately
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
};

// Only wrap with PWA in production or when explicitly enabled for testing
// This allows using Turbopack during normal local development
const isPWAEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_PWA === 'true';

export default isPWAEnabled ? withPWA(nextConfig) : nextConfig;
