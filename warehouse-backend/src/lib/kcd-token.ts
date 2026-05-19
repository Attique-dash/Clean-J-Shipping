import { Request } from 'express';
import crypto from 'crypto';
import {
  extractApiTokenFromContentQuery,
  looksLikeKcdPackageInbound,
} from './kcd-inbound';

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

export function isRealApiToken(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t || t.length < 8) return false;
  if (TOKEN_PLACEHOLDERS.has(t)) return false;
  if (TOKEN_PLACEHOLDERS.has(t.toLowerCase())) return false;
  return true;
}

export type KcdTokenSource =
  | 'query.id'
  | 'query.apiKey'
  | 'query.apiToken'
  | 'query.token'
  | 'query.content'
  | 'header.authorization'
  | 'header.x-kcd-api-key'
  | 'header.x-api-key'
  | 'body.token'
  | 'body.APIToken'
  | 'body.apiToken'
  | 'env.KCD_API_KEY';

export type KcdTokenCandidate = {
  source: KcdTokenSource;
  token: string;
};

function tokenFromBody(body: unknown): KcdTokenCandidate[] {
  const found: KcdTokenCandidate[] = [];
  if (!body) return found;

  const items: Record<string, unknown>[] = [];
  if (Array.isArray(body)) {
    for (const item of body) {
      if (item && typeof item === 'object') {
        items.push(item as Record<string, unknown>);
      }
    }
  } else if (typeof body === 'object') {
    items.push(body as Record<string, unknown>);
  }

  for (const item of items) {
    const pairs: Array<[KcdTokenSource, unknown]> = [
      ['body.token', item.token],
      ['body.APIToken', item.APIToken],
      ['body.apiToken', item.apiToken],
    ];
    for (const [source, raw] of pairs) {
      if (isRealApiToken(raw)) {
        found.push({ source, token: String(raw).trim() });
      }
    }

    if (item.content !== undefined) {
      let content: unknown = item.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          const fromQuery = extractApiTokenFromContentQuery(content);
          if (fromQuery) {
            found.push({ source: 'query.content', token: fromQuery });
          }
          continue;
        }
      }
      found.push(...tokenFromBody(content));
    }
  }
  return found;
}

/**
 * Tasoko / Askenish often put the real key in ?id= or in JSON body while also
 * sending a wrong or placeholder Authorization header. Order: query → body →
 * standard API headers (so a bad Bearer does not block a good ?id=).
 */
export function collectKcdTokenCandidates(req: Request): KcdTokenCandidate[] {
  const candidates: KcdTokenCandidate[] = [];

  const queryParams: Array<[KcdTokenSource, unknown]> = [
    ['query.id', req.query?.id],
    ['query.apiKey', req.query?.apiKey ?? req.query?.api_key],
    ['query.apiToken', req.query?.apiToken],
    ['query.token', req.query?.token],
  ];
  for (const [source, raw] of queryParams) {
    if (typeof raw === 'string' && isRealApiToken(raw)) {
      candidates.push({ source, token: raw.trim() });
    }
  }

  const fromContentQuery = extractApiTokenFromContentQuery(req.query?.content);
  if (fromContentQuery) {
    candidates.push({ source: 'query.content', token: fromContentQuery });
  }

  candidates.push(...tokenFromBody(req.body));

  const xApi = req.headers['x-api-key'];
  if (typeof xApi === 'string' && isRealApiToken(xApi)) {
    candidates.push({ source: 'header.x-api-key', token: xApi.trim() });
  }

  const xKcd = req.headers['x-kcd-api-key'];
  if (typeof xKcd === 'string' && isRealApiToken(xKcd)) {
    candidates.push({ source: 'header.x-kcd-api-key', token: xKcd.trim() });
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (isRealApiToken(token)) {
      candidates.push({ source: 'header.authorization', token });
    }
  }

  return candidates;
}

export function dedupeCandidates(candidates: KcdTokenCandidate[]): KcdTokenCandidate[] {
  const seen = new Set<string>();
  const out: KcdTokenCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.token)) continue;
    seen.add(c.token);
    out.push(c);
  }
  return out;
}

export function collectRejectedPlaceholders(req: Request): string[] {
  const rejectedPlaceholders: string[] = [];
  const body = req.body;

  const checkPlaceholder = (raw: unknown, label: string) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (trimmed && !isRealApiToken(trimmed)) {
      rejectedPlaceholders.push(`${label} (${trimmed.slice(0, 24)}…)`);
    }
  };

  if (Array.isArray(body)) {
    for (const item of body) {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        checkPlaceholder(row.APIToken, 'body.APIToken');
        checkPlaceholder(row.apiToken, 'body.apiToken');
        checkPlaceholder(row.token, 'body.token');
      }
    }
  } else if (body && typeof body === 'object') {
    const row = body as Record<string, unknown>;
    checkPlaceholder(row.APIToken, 'body.APIToken');
    checkPlaceholder(row.apiToken, 'body.apiToken');
    checkPlaceholder(row.token, 'body.token');
  }

  return rejectedPlaceholders;
}

export function resolveEnvAuthFallback(req: Request): string | null {
  const envKey = process.env.KCD_API_KEY?.trim();
  if (!envKey || !isRealApiToken(envKey)) return null;

  const path = (req.originalUrl || req.path || '').toLowerCase();
  const isCustomers = path.includes('/kcd/customers');
  const isPackageAdd = path.includes('/kcd/packages/add');

  if (isCustomers) {
    return envKey;
  }

  if (isPackageAdd && looksLikeKcdPackageInbound(req.body)) {
    return envKey;
  }

  return null;
}

/**
 * Ordered, de-duplicated list of credentials to try. When nothing is present,
 * may fall back to KCD_API_KEY for /customers and package webhooks (Tasoko proxy).
 */
export function buildAuthCredentialAttempts(req: Request): {
  attempts: KcdTokenCandidate[];
  rejectedPlaceholders: string[];
} {
  const rejectedPlaceholders = collectRejectedPlaceholders(req);
  let attempts = dedupeCandidates(collectKcdTokenCandidates(req));
  if (attempts.length === 0) {
    const env = resolveEnvAuthFallback(req);
    if (env) attempts = [{ source: 'env.KCD_API_KEY', token: env }];
  }
  return { attempts, rejectedPlaceholders };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
