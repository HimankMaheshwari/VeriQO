/** @type {import('next').NextConfig} */
const nextConfig = {
  // Never expose secret keys via NEXT_PUBLIC_ prefix
  // All server-side env vars are accessed in server components / API routes only
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['winston'],
  },
}

module.exports = nextConfig
