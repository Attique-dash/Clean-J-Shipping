import cors from 'cors';
import { config } from './env';

// Parse multiple origins from environment variable
const allowedOrigins = config.CORS_ORIGIN 
  ? config.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

// Add KCD Logistics portal to allowed origins
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'https://pack.kcdlogistics.com',
  'http://pack.kcdlogistics.com'
];

// Combine environment origins with default KCD origins
const allAllowedOrigins = [
  ...new Set([...defaultAllowedOrigins, ...allowedOrigins])
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests, or same-origin requests)
    if (!origin) return callback(null, true);

    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    // Allow the configured origins (case-insensitive comparison)
    const isAllowed = allAllowedOrigins.some(allowed => 
      normalizedOrigin.toLowerCase() === allowed.toLowerCase() ||
      normalizedOrigin === allowed
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      // Log for debugging
      console.log(`CORS blocked origin: ${origin}. Allowed origins:`, allAllowedOrigins);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'x-api-key', // Case-insensitive support
    'authorization', // Case-insensitive support
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Total-Count', 'Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

export default cors(corsOptions);
