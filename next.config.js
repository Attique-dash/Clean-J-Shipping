/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memory optimization settings
  compress: true,
  
  // ESLint configuration - don't fail build on warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration - don't fail build on type errors
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Next.js 14: use experimental key (serverExternalPackages is Next.js 15+)
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'pdfkit', 'jspdf', '@prisma/client'],
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
  
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
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
  
  
  // CORS headers for warehouse API and video files
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
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Content-Type", value: "video/mp4" },
        ],
      },
    ];
  },

  // Webpack configuration to fix canvas/pdfjs-dist issues and optimize memory
  webpack: (config, { isServer, dev }) => {
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

    // Heavy splitChunks only for production builds (dev: faster compiles, less memory)
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
              priority: 5,
            },
            pdf: {
              test: /[\\/]node_modules[\\/](pdfkit|jspdf|@react-pdf)[\\/]/,
              name: 'pdf',
              chunks: 'all',
              priority: 15,
            },
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|recharts|react-chartjs)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }

    if (isServer && !dev) {
      config.optimization.minimize = false;
    }

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