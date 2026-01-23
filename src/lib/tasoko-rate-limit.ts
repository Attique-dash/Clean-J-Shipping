export class TasokoRateLimiter {
  private static windows = new Map<string, { count: number; resetAt: number }>();

  /**
   * Check if request should be rate limited
   * Default: 200 requests per minute per API key
   */
  static isAllowed(
    keyPrefix: string,
    maxRequests: number = 200,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const window = this.windows.get(keyPrefix) || { count: 0, resetAt: now + windowMs };

    // Reset if window expired
    if (now > window.resetAt) {
      window.count = 0;
      window.resetAt = now + windowMs;
    }

    // Increment counter
    window.count++;
    this.windows.set(keyPrefix, window);

    return {
      allowed: window.count <= maxRequests,
      remaining: Math.max(0, maxRequests - window.count),
      resetAt: window.resetAt,
    };
  }
}
