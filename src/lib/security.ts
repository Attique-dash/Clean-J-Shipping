// Security utilities for input sanitization and XSS protection

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove HTML tags and encode special characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => 
        typeof item === 'string' ? sanitizeInput(item) : 
        typeof item === 'object' ? sanitizeObject(item) : 
        item
      ) as any;
    }
  }
  
  return sanitized;
}

/**
 * Validate MongoDB ObjectId to prevent injection
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

/**
 * Sanitize MongoDB query to prevent NoSQL injection
 */
export function sanitizeMongoQuery(query: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const key in query) {
    const value = query[key];
    
    // Prevent MongoDB operators in keys
    if (key.startsWith('$')) {
      continue; // Skip dangerous operators
    }
    
    if (typeof value === 'string') {
      // Prevent MongoDB operators in values
      if (value.startsWith('$') && ['$ne', '$gt', '$lt', '$gte', '$lte', '$in', '$nin', '$regex'].includes(value)) {
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken?: string): boolean {
  if (!token || !sessionToken) {
    return false;
  }
  
  return token === sessionToken;
}

