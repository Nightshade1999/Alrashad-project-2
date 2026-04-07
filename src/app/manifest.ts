import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ward Manager - Alrashad Medical',
    short_name: 'Ward App',
    description: 'Secure clinical management for medical wards',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0d9488',
    theme_color: '#0d9488',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
