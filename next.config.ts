import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
};

// Only wrap with PWA in production or when explicitly enabled for testing
// This allows using Turbopack during normal local development
const isPWAEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_PWA === 'true';

export default isPWAEnabled ? withPWA(nextConfig) : nextConfig;
