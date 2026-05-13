import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stride',
    short_name: 'Stride',
    description: 'Adaptive study planner — build realistic plans, stay on track before exams.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F5F1EB',
    theme_color: '#3D2B26',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
