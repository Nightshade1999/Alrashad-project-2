import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ward Manager - Alrashad Medical',
    short_name: 'Ward App',
    description: 'Secure offline-first clinical management for medical wards',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#0d9488',
    categories: ['medical', 'health', 'productivity'],
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
    shortcuts: [
      {
        name: 'ER Ward',
        short_name: 'ER',
        description: 'Emergency room patient list',
        url: '/dashboard/er',
        icons: [{ src: '/icon.png', sizes: '96x96' }],
      },
      {
        name: 'My Ward',
        short_name: 'Ward',
        description: 'My assigned ward patients',
        url: '/dashboard/my-ward',
        icons: [{ src: '/icon.png', sizes: '96x96' }],
      },
    ],
  }
}
