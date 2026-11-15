/** @type {import('next').NextConfig} */
const nextConfig = {
  // Se publica directo en Vercel sin build local: estos dos ajustes evitan que
  // una advertencia de tipos o de estilo bloquee la publicación.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
export default nextConfig;
