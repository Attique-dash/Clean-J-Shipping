import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { RATE_LIMITING } from '../utils/constants';

// General API rate limiting
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITING.WINDOW_MS,
  max: RATE_LIMITING.MAX_REQUESTS,
  message: {
    success: false,
    message: RATE_LIMITING.BLOCK_MESSAGE,
    retryAfter: Math.ceil(RATE_LIMITING.WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: RATE_LIMITING.BLOCK_MESSAGE,
      retryAfter: Math.ceil(RATE_LIMITING.WINDOW_MS / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

// Strict rate limiting for sensitive endpoints
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many attempts, please try again later',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
    retryAfter: 900
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiting
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API key rate limiting
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for API keys
  keyGenerator: (req) => {
    return req.header('X-API-Key') || req.ip;
  },
  message: {
    success: false,
    message: 'API rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create custom rate limiter
export const createCustomLimiter = (
  windowMs: number,
  max: number,
  message?: string
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || RATE_LIMITING.BLOCK_MESSAGE,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};
