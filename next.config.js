/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memory optimization settings
  compress: true,
  
  // External packages for server components
  serverExternalPackages: ['canvas', 'pdfkit', 'jspdf'],
  
  // Experimental features for Next.js 16
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
  
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
  
  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
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

  // Webpack configuration to fix canvas/pdfjs-dist issues and optimize memory
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

    // Memory optimization settings
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
      // Limit parallel compilation to reduce memory usage
      parallelism: 1,
    };

    // Reduce memory usage during compilation
    if (isServer) {
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