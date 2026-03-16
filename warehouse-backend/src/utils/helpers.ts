import { Response } from 'express';

// Success response helper
export const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Error response helper
export const errorResponse = (res: Response, message: string, statusCode: number = 500, error?: any) => {
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

// Pagination helper
export const getPaginationData = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Generate tracking number
export const generateTrackingNumber = (): string => {
  const prefix = 'TRK';
  const timestamp = Date.now().toString(36).substring(0, 8); // Ensure 8 chars
  const random = Math.random().toString(36).substr(2, 9).toUpperCase(); // 9 chars
  // Result: TRK + 8 + 9 = 20 chars ✅
  return `${prefix}${timestamp}${random}`.slice(0, 20).toUpperCase();
};

// Calculate package volume
export const calculateVolume = (length: number, width: number, height: number): number => {
  return length * width * height;
};

// Calculate shipping cost (basic formula)
export const calculateShippingCost = (weight: number, volume: number, distance: number = 100): number => {
  const baseRate = 5.99;
  const weightRate = weight * 0.50;
  const volumeRate = volume * 0.001;
  const distanceRate = distance * 0.02;
  
  return Math.max(baseRate, baseRate + weightRate + volumeRate + distanceRate);
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Sanitize string input
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate random API key
export const generateApiKey = (): string => {
  const prefix = 'wh_';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 32; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + random;
};

// Date formatting helper
export const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return date.toISOString();
  }
};

// Calculate age from birthdate
export const calculateAge = (birthdate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  
  return age;
};

// Safe query parameter parser
export const parseQueryParam = (query: any, key: string, defaultValue?: number): number => {
  const value = query[key];
  if (value === undefined || value === null) {
    return defaultValue || 0;
  }
  
  // Handle string or string array
  const stringValue = Array.isArray(value) ? value[0] : String(value);
  const parsedValue = parseInt(stringValue, 10);
  
  return isNaN(parsedValue) ? (defaultValue || 0) : parsedValue;
};
