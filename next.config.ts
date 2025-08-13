import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  
  // Enable custom server for subdomain handling and configure large file uploads (up to 100MB)
  experimental: {
    // Allow custom hostname handling
    // Configure Server Actions and App Router API routes for large file uploads
    serverActions: {
      bodySizeLimit: '100mb'
    }
  },
};

export default nextConfig;