// src/lib/api-key-validation.ts
import { dbConnect } from './db';
import { ApiKey, hashApiKey, isKeyExpired } from '@/models/ApiKey';

/**
 * Validate an API key against both:
 * 1. KCD_API_KEY environment variable (legacy)
 * 2. Database API keys with expiration
 * 
 * Supports token from header (x-api-key) or from request body (token field)
 */
export async function validateApiKey(
  requestKey: string | null,
  bodyToken?: string | null
): Promise<{ valid: boolean; error?: string; key?: any }> {
  // Use header token or fallback to body token
  const apiKey = requestKey || bodyToken;
  
  if (!apiKey) {
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
    const hashedKey = hashApiKey(apiKey);
    const apiKeyRecord = await ApiKey.findOne({ 
      $or: [
        { key: hashedKey, active: true },
        { key: hashedKey, isActive: true }
      ]
    });

    if (!apiKeyRecord) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check expiration
    if (isKeyExpired(apiKeyRecord.expiresAt)) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used
    apiKeyRecord.lastUsedAt = new Date();
    apiKeyRecord.usageCount = (apiKeyRecord.usageCount || 0) + 1;
    await apiKeyRecord.save();

    return { valid: true, key: apiKeyRecord };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Internal server error' };
  }
}
