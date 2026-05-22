import * as dotenv from 'dotenv';
import * as path from 'path';

// Vercel injects env vars at runtime — skip dotenv (wrong cwd can hide platform vars)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
if (!isVercel) {
  dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
    override: false,
  });
}

const REQUIRED_ENV_KEYS = ['MONGODB_URI', 'JWT_SECRET'] as const;

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : value;
}

const missingRequired = REQUIRED_ENV_KEYS.filter((key) => !getEnv(key));
if (missingRequired.length > 0) {
  const hint = isVercel
    ? 'Add them in Vercel → Settings → Environment Variables (enable Production, Preview, and Development), then Redeploy the latest deployment.'
    : 'Copy warehouse-env.example to .env in the warehouse-backend folder and set the values.';
  throw new Error(`Missing required environment variable(s): ${missingRequired.join(', ')}. ${hint}`);
}

interface EnvConfig {
  port: number;
  nodeEnv: string;
  MONGODB_URI: string;
  MONGODB_TEST_URI: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  API_KEY_SECRET: string;
  MAX_FILE_SIZE: number;
  UPLOAD_PATH: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  CORS_ORIGIN: string;
}

export const config: EnvConfig = {
  port: parseInt(process.env.PORT || '5000', 10), // FIXED: Changed from 3001 to 5000
  nodeEnv: process.env.NODE_ENV || 'development',
  MONGODB_URI: getEnv('MONGODB_URI')!,
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/warehouse-backend-test',
  jwtSecret: getEnv('JWT_SECRET')!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  API_KEY_SECRET: process.env.API_KEY_SECRET || 'your-api-key-secret',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};