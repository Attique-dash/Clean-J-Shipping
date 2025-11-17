/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the new configuration key instead of experimental
  serverExternalPackages: ['mongoose', 'mongodb', 'bcryptjs'],
  
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  
  images: {
    // Use remotePatterns instead of domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  
  // Disable type checking during build (optional, for faster builds)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Disable ESLint during build (optional, for faster builds)
  eslint: {
    ignoreDuringBuilds: false,
  },

  // CORS headers for warehouse API
  async headers() {
    return [
      {
        source: "/api/warehouse/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-warehouse-key, x-api-key" },
        ],
      },
    ];
  },

  // Webpack configuration to fix canvas/pdfjs-dist issues
  webpack: (config, { isServer }) => {
    // Fix for canvas module (used by pdfjs-dist/easyinvoice)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        stream: false,
      };
    }
    
    // Mark canvas as external to prevent webpack from trying to bundle it
    config.externals = [...(config.externals || []), 'canvas'];

    // Ignore specific warnings from pdfjs-dist
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/pdfjs-dist/,
        message: /Can't resolve 'canvas'/,
      },
    ];

    return config;
  },
};

module.exports = nextConfig;