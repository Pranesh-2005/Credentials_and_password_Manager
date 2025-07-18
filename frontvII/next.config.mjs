/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Ensure static files are handled correctly
  trailingSlash: false,
  // Fix for Vercel deployment
  generateEtags: false,
  poweredByHeader: false,
}

export default nextConfig