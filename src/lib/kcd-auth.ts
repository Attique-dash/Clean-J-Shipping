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

export type KcdAuthResolution = {
  token: string | null;
  checked: string[];
  usedEnvFallback: boolean;
};

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
  const { attempts } = buildNextAuthAttempts(req, parsedBody);
  return attempts[0]?.token ?? null;
}

function extractTokenFromParsedBody(parsed: unknown): string | null {
  if (typeof parsed === 'string') {
    try {
      return extractTokenFromParsedBody(JSON.parse(parsed));
    } catch {
      return null;
    }
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const t = row.APIToken ?? row.apiToken ?? row.token;
        if (isRealApiToken(t)) return String(t).trim();
      }
    }
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (isRealApiToken(obj.token)) return String(obj.token).trim();
  if (isRealApiToken(obj.apiToken)) return String(obj.apiToken).trim();
  if (isRealApiToken(obj.APIToken)) return String(obj.APIToken).trim();

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

/** True when body looks like Tasoko/Askenish inbound package webhook */
export function looksLikeKcdPackageInbound(parsed: unknown): boolean {
  const { packages } = parseKcdInboundPackages(parsed);
  if (packages.length === 0) return false;
  return packages.some((p) => {
    const tracking = p.TrackingNumber ?? p.trackingNumber;
    const user =
      p.UserCode ?? p.userCode ?? p.customerMailbox ?? p.customerCode;
    return isPresent(tracking) && isPresent(user);
  });
}

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

export type NextAuthAttempt = { source: string; token: string };

/**
 * Tasoko / Askenish: real key is often in ?id= or JSON body while Authorization is wrong.
 * Collect all plausible tokens (deduped); validateKcdRequest tries each until one works.
 */
export function buildNextAuthAttempts(
  req: NextRequest,
  parsedBody?: unknown
): {
  attempts: NextAuthAttempt[];
  checked: string[];
  usedEnvFallback: boolean;
} {
  const checked: string[] = [];
  const raw: NextAuthAttempt[] = [];

  const fromQuery =
    req.nextUrl.searchParams.get('id') ||
    req.nextUrl.searchParams.get('apiKey') ||
    req.nextUrl.searchParams.get('api_key') ||
    req.nextUrl.searchParams.get('apiToken') ||
    req.nextUrl.searchParams.get('token');
  checked.push(
    'query.id',
    'query.apiKey',
    'query.apiToken',
    'query.token'
  );
  if (isRealApiToken(fromQuery)) {
    raw.push({ source: 'query', token: fromQuery!.trim() });
  }

  const contentParam = req.nextUrl.searchParams.get('content');
  checked.push('query.content');
  if (contentParam) {
    try {
      const parsed = JSON.parse(contentParam) as Record<string, unknown>;
      const t = parsed.apiToken ?? parsed.APIToken ?? parsed.token;
      if (isRealApiToken(t)) {
        raw.push({ source: 'query.content', token: String(t).trim() });
      }
    } catch {
      /* ignore */
    }
  }

  checked.push('body.token', 'body.apiToken', 'body.APIToken', 'body.content');
  const fromBody = extractTokenFromParsedBody(parsedBody);
  if (fromBody) {
    raw.push({ source: 'body', token: fromBody });
  }

  const headerNames = [
    'x-api-key',
    'x-kcd-api-key',
    'authorization',
    'token',
    'api-token',
  ] as const;
  for (const name of headerNames) {
    checked.push(`header.${name}`);
    const value = req.headers.get(name);
    if (name === 'authorization' && value) {
      const t = value.replace(/^Bearer\s+/i, '').trim();
      if (isRealApiToken(t)) raw.push({ source: `header.${name}`, token: t });
    } else if (isRealApiToken(value)) {
      raw.push({ source: `header.${name}`, token: value!.trim() });
    }
  }

  const seen = new Set<string>();
  let attempts = raw.filter((x) => {
    if (seen.has(x.token)) return false;
    seen.add(x.token);
    return true;
  });

  let usedEnvFallback = false;
  if (attempts.length === 0) {
    checked.push('env.KCD_API_KEY');
    const envKey = process.env.KCD_API_KEY?.trim();
    if (envKey && isRealApiToken(envKey)) {
      const path = req.nextUrl.pathname.toLowerCase();
      const isCustomers = path.includes('/kcd/customers');
      const isPackageAdd = path.includes('/kcd/packages/add');
      if (isCustomers || (isPackageAdd && looksLikeKcdPackageInbound(parsedBody))) {
        attempts = [{ source: 'env.KCD_API_KEY', token: envKey }];
        usedEnvFallback = true;
      }
    }
  }

  return { attempts, checked, usedEnvFallback };
}

/** @deprecated Prefer buildNextAuthAttempts */
export function resolveKcdAuth(
  req: NextRequest,
  parsedBody?: unknown
): KcdAuthResolution {
  const { attempts, checked, usedEnvFallback } = buildNextAuthAttempts(
    req,
    parsedBody
  );
  const token = attempts[0]?.token ?? null;
  return { token, checked, usedEnvFallback };
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
): Promise<{
  valid: boolean;
  error?: string;
  key?: unknown;
  token?: string;
  authChecked?: string[];
  usedEnvFallback?: boolean;
  triedSources?: string[];
}> {
  const { attempts, checked, usedEnvFallback } = buildNextAuthAttempts(
    req,
    parsedBody
  );
  const triedSources = attempts.map((a) => a.source);

  if (attempts.length === 0) {
    return {
      valid: false,
      error:
        'Missing API token. Use ?id=TOKEN on URL, Authorization header, x-api-key, or APIToken in body.',
      authChecked: checked,
      usedEnvFallback: false,
      triedSources: [],
    };
  }

  for (const attempt of attempts) {
    const validation = await validateApiKey(attempt.token, null);
    if (validation.valid) {
      return {
        ...validation,
        token: attempt.token,
        authChecked: checked,
        usedEnvFallback,
        triedSources,
      };
    }
  }

  return {
    valid: false,
    error: `Invalid API key: tried ${attempts.length} credential(s) from [${triedSources.join(', ')}]; none matched KCD_API_KEY or an active database key. Open Network → Response on cleanjshipping.vercel.app for this JSON (Askenish UI may only show a generic Unauthorized).`,
    authChecked: checked,
    usedEnvFallback,
    triedSources,
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

export function kcdUnauthorizedResponse(
  validation: {
    error?: string;
    authChecked?: string[];
    triedSources?: string[];
  },
  extra?: Record<string, unknown>
) {
  return {
    success: false,
    message:
      validation.error ||
      'Unauthorized: invalid or missing API key (see error and triedSources).',
    error: validation.error || 'Invalid API key',
    errorCode: 'KCD_AUTH_FAILED',
    authChecked: validation.authChecked,
    triedSources: validation.triedSources,
    hint:
      'Askenish Play test: use a real UserCode from GET customers (e.g. CLEAN-0007). ' +
      'Configure Add Package URL as https://cleanjshipping.vercel.app/api/kcd/packages/add?id=YOUR_API_KEY ' +
      'or ensure the warehouse proxy sends Authorization / x-api-key on POST. ' +
      'If the portal only shows a generic message, open DevTools → Network → select the failing request → Response.',
    data: [] as unknown[],
    ...extra,
  };
}
