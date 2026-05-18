import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api-key-validation';

/** Placeholder values Askenish/KCD send in sample payloads — not real tokens */
const TOKEN_PLACEHOLDERS = new Set([
  '<api-token>',
  '<API-TOKEN>',
  'api-token',
  'your-api-token',
  'your_api_token',
  '<token>',
  'undefined',
  'null',
]);

export function isRealApiToken(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t || t.length < 8) return false;
  if (TOKEN_PLACEHOLDERS.has(t)) return false;
  if (TOKEN_PLACEHOLDERS.has(t.toLowerCase())) return false;
  return true;
}

/**
 * Extract API token per Tasoko/Askenish/KCD spec:
 * - GET: ?id=TOKEN
 * - POST: APIToken in body (array or object), Authorization header (no Bearer), x-api-key
 * - Proxy test: { token, content } wrapper
 */
export function extractKcdToken(
  req: NextRequest,
  parsedBody?: unknown
): string | null {
  const fromQuery =
    req.nextUrl.searchParams.get('id') ||
    req.nextUrl.searchParams.get('apiKey');
  if (isRealApiToken(fromQuery)) return fromQuery.trim();

  const xApiKey =
    req.headers.get('x-api-key') || req.headers.get('x-kcd-api-key');
  if (isRealApiToken(xApiKey)) return xApiKey.trim();

  const auth = req.headers.get('authorization');
  if (auth) {
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (isRealApiToken(token)) return token;
  }

  if (parsedBody !== undefined && parsedBody !== null) {
    const fromBody = extractTokenFromParsedBody(parsedBody);
    if (fromBody) return fromBody;
  }

  return null;
}

function extractTokenFromParsedBody(parsed: unknown): string | null {
  if (Array.isArray(parsed)) {
    const first = parsed[0] as Record<string, unknown> | undefined;
    if (first) {
      const t = first.APIToken ?? first.apiToken ?? first.token;
      if (isRealApiToken(t)) return String(t).trim();
    }
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (isRealApiToken(obj.token)) return String(obj.token).trim();
  if (isRealApiToken(obj.apiToken)) return String(obj.apiToken).trim();

  if (obj.content !== undefined) {
    if (isRealApiToken(obj.token)) return String(obj.token).trim();
    let content: unknown = obj.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        return null;
      }
    }
    return extractTokenFromParsedBody(content);
  }

  const t = obj.APIToken ?? obj.apiToken;
  if (isRealApiToken(t)) return String(t).trim();

  return null;
}

/**
 * Normalize inbound body: single package, array of packages, or proxy { content } wrapper.
 */
export function parseKcdInboundPackages(parsed: unknown): {
  packages: Record<string, unknown>[];
  proxyToken?: string;
} {
  if (parsed === null || parsed === undefined) {
    return { packages: [] };
  }

  let data = parsed;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return { packages: [] };
    }
  }

  if (Array.isArray(data)) {
    return { packages: data as Record<string, unknown>[] };
  }

  if (typeof data !== 'object' || data === null) {
    return { packages: [] };
  }

  const obj = data as Record<string, unknown>;
  const proxyToken = isRealApiToken(obj.token)
    ? String(obj.token).trim()
    : undefined;

  if (obj.content !== undefined) {
    let content: unknown = obj.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        return { packages: [], proxyToken };
      }
    }
    const inner = parseKcdInboundPackages(content);
    return {
      packages: inner.packages,
      proxyToken: proxyToken || inner.proxyToken,
    };
  }

  if (
    obj.TrackingNumber !== undefined ||
    obj.trackingNumber !== undefined ||
    obj.UserCode !== undefined ||
    obj.userCode !== undefined ||
    obj.customerMailbox !== undefined
  ) {
    return { packages: [obj], proxyToken };
  }

  return { packages: [], proxyToken };
}

export async function validateKcdRequest(
  req: NextRequest,
  parsedBody?: unknown
): Promise<{ valid: boolean; error?: string; key?: unknown; token?: string }> {
  const token = extractKcdToken(req, parsedBody);
  const validation = await validateApiKey(token, null);
  return {
    ...validation,
    token: token || undefined,
  };
}

/** Inject resolved token into package APIToken when portal sends placeholder */
export function applyApiTokenToPackages(
  packages: Record<string, unknown>[],
  token: string
): Record<string, unknown>[] {
  return packages.map((pkg) => {
    const current = pkg.APIToken ?? pkg.apiToken;
    if (!isRealApiToken(current)) {
      return { ...pkg, APIToken: token, apiToken: token };
    }
    return pkg;
  });
}
