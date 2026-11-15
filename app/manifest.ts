import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FF Coaching Lab',
    short_name: 'FF Coaching',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f2',
    theme_color: '#14161c',
    lang: 'es-CL',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
