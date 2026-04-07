// src/lib/api-key-validation.ts
import { dbConnect } from './db';
import { ApiKey, hashApiKey, isKeyExpired } from '@/models/ApiKey';

/**
 * Validate an API key against both:
 * 1. KCD_API_KEY environment variable (legacy)
 * 2. Database API keys with expiration
 */
export async function validateApiKey(requestKey: string | null): Promise<{ valid: boolean; error?: string; key?: any }> {
  if (!requestKey) {
    return { valid: false, error: 'Missing API key' };
  }

  // 1. Check legacy KCD_API_KEY from environment
  const kcdApiKey = process.env.KCD_API_KEY;
  if (kcdApiKey && requestKey === kcdApiKey) {
    return { valid: true, key: { type: 'legacy', name: 'KCD Legacy Key' } };
  }

  // 2. Check database API keys
  try {
    await dbConnect();
    const hashedKey = hashApiKey(requestKey);
    const apiKey = await ApiKey.findOne({ 
      $or: [
        { key: hashedKey, active: true },
        { key: hashedKey, isActive: true }
      ]
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (isKeyExpired(apiKey.expiresAt)) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount = (apiKey.usageCount || 0) + 1;
    await apiKey.save();

    return { valid: true, key: apiKey };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Internal server error' };
  }
}
