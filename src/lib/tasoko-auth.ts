export class TasokoAuthenticator {
  /**
   * Validates API token from request
   * Accepts:
   * - x-warehouse-key header
   * - x-api-key header
   * - ?id=APITOKEN query parameter
   */
  static extractToken(req: Request): string | null {
    // Method 1: Check headers
    const headerToken = req.headers.get('x-warehouse-key') || 
                       req.headers.get('x-api-key');
    if (headerToken) return headerToken;

    // Method 2: Check query parameter
    const url = new URL(req.url);
    const queryToken = url.searchParams.get('id');
    if (queryToken) return queryToken;

    return null;
  }

  /**
   * Validates token against stored API keys in database
   */
  static async validateToken(token: string): Promise<{
    valid: boolean;
    keyRecord?: any;
    error?: string;
  }> {
    if (!token || !token.startsWith('wh_')) {
      return { valid: false, error: 'Invalid token format' };
    }

    try {
      // Import ApiKey model and dbConnect
      const { ApiKey, hashApiKey } = await import('@/models/ApiKey');
      const { dbConnect } = await import('@/lib/db');
      
      // Ensure database is connected
      await dbConnect();
      
      // Check if token is test key
      if (token === 'wh_test_abc123') {
        const keyRecord = await ApiKey.findOne({
          keyPrefix: 'wh_test_abc123',
          active: true,
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } },
          ],
        });
        
        if (!keyRecord) {
          return { valid: false, error: 'Test key not found or inactive' };
        }
        
        return { valid: true, keyRecord };
      }

      // Hash and verify live key
      const hashed = hashApiKey(token);
      const keyRecord = await ApiKey.findOne({
        key: hashed,
        active: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      if (!keyRecord) {
        return { valid: false, error: 'Invalid or inactive API key' };
      }

      return { valid: true, keyRecord };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Authentication error'
      };
    }
  }

  /**
   * Check if key has required permission
   */
  static hasPermission(
    keyRecord: any, 
    requiredPermission: string
  ): boolean {
    if (!keyRecord || !keyRecord.permissions) return false;
    return keyRecord.permissions.includes(requiredPermission);
  }
}