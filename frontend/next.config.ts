import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for containerized deployment on Cloud Run
  output: 'standalone',
  
  // Optimize for production
  experimental: {
    optimizePackageImports: ['@tremor/react', '@visx/responsive', 'recharts']
  },
  
  // Essential for proper static asset handling in containers
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  
  // Improve performance
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
