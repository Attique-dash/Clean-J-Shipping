interface RateLimitStore {
  count: number;
  resetAt: number;
}

// In-memory store (replace with Redis for production environments)
const store = new Map<string, RateLimitStore>();

export interface RateLimitConfig {
  windowMs: number; // window in milliseconds
  maxRequests: number; // max requests allowed per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function rateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = store.get(identifier);

  // Basic cleanup for large maps
  if (store.size > 10000) {
    for (const [key, value] of store.entries()) {
      if (value.resetAt < now) {
        store.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  store.set(identifier, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}
