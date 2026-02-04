import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Extend Request type to include file property
interface FileRequest extends Request {
  file?: any;
}

// XSS Protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }

  next();
};

// Input sanitization function
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[sanitizeString(key)] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  return input;
}

// String sanitization
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim();
}

// SQL Injection protection (for MongoDB)
export const mongoSanitize = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeMongo = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove MongoDB operators
      return obj.replace(/\$|{|}/g, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeMongo(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Skip keys that start with $ (MongoDB operators)
          if (!key.startsWith('$')) {
            sanitized[key] = sanitizeMongo(obj[key]);
          }
        }
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitizeMongo(req.body);
  }

  if (req.query) {
    req.query = sanitizeMongo(req.query);
  }

  if (req.params) {
    req.params = sanitizeMongo(req.params);
  }

  next();
};

// Content Security Policy
export const csp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"]
  }
});

// Enhanced rate limiting for sensitive endpoints
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

// Rate limiting for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again later'
    });
  }
});

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.get('content-length');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  return next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP as string)) {
      logger.warn(`Unauthorized IP access attempt: ${clientIP}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address'
      });
    }

    return next();
  };
};

// Request logger for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request details
  logger.info('Security Request Log', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Security Response Log', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  return next();
};

// Validate file types
export const validateFileType = (allowedTypes: string[]) => {
  return (req: FileRequest, res: Response, next: NextFunction) => {
    if (req.file) {
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }

    return next();
  };
};

// Check for suspicious patterns
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$in/i,
    /\$nin/i
  ];

  const checkString = (str: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }

    return false;
  };

  // Check request body
  if (req.body && checkObject(req.body)) {
    logger.warn(`Suspicious activity detected from IP: ${req.ip}, Path: ${req.path}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid request content detected'
    });
  }

  return next();
};
