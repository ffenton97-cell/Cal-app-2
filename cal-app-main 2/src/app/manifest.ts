import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FORGE',
    short_name: 'FORGE',
    description:
      'Personal operating system — pipeline, body, capital, and execution in one surface.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0809',
    theme_color: '#0c0809',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
