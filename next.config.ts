import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow mobile device to access dev resources without being blocked as cross-origin
  allowedDevOrigins: [
    '192.168.0.120', 
    '192.168.0.120:3000', 
    '192.168.0.165', 
    '192.168.0.165:3000'
  ],
} as any;

export default nextConfig;
