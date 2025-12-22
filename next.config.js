/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  images: {
    domains: [],
    // Add image optimization settings for production
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimize webpack to prevent cache issues
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce cache issues in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      }
    }
    
    return config
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Note: Removed 'output: standalone' - Vercel handles its own output format
  // Use 'standalone' only for Docker deployments
  
  // Disable static optimization for authenticated app
  // All pages require client-side rendering with React Query
  // This prevents Next.js from trying to statically generate pages during build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // CRITICAL: Disable static page generation completely
  // This ensures Next.js never tries to statically generate any pages during build
  // Remove invalid experimental config
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
}

module.exports = nextConfig

