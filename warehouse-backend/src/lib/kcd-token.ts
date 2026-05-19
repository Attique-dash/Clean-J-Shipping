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
    // Askenish proxy wrapper: prefer top-level token before package APIToken
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
 * Collect API token from all KCD / Askenish-supported locations.
 * Priority: headers first (Postman / direct integrations), then query (Tasoko ?id=),
 * then body (proxy wrapper / APIToken). Body placeholders never override headers.
 */
export function collectKcdTokenCandidates(req: Request): KcdTokenCandidate[] {
  const candidates: KcdTokenCandidate[] = [];

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (isRealApiToken(token)) {
      candidates.push({ source: 'header.authorization', token });
    }
  }

  const xKcd = req.headers['x-kcd-api-key'];
  if (typeof xKcd === 'string' && isRealApiToken(xKcd)) {
    candidates.push({ source: 'header.x-kcd-api-key', token: xKcd.trim() });
  }

  const xApi = req.headers['x-api-key'];
  if (typeof xApi === 'string' && isRealApiToken(xApi)) {
    candidates.push({ source: 'header.x-api-key', token: xApi.trim() });
  }

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

  return candidates;
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

export function extractKcdToken(req: Request): {
  token: string | null;
  candidates: KcdTokenCandidate[];
  rejectedPlaceholders: string[];
  usedEnvFallback: boolean;
} {
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

  const candidates = collectKcdTokenCandidates(req);
  let token = candidates.length > 0 ? candidates[0].token : null;
  let usedEnvFallback = false;

  if (!token) {
    const envFallback = resolveEnvAuthFallback(req);
    if (envFallback) {
      token = envFallback;
      usedEnvFallback = true;
      candidates.push({ source: 'env.KCD_API_KEY', token: envFallback });
    }
  }

  return { token, candidates, rejectedPlaceholders, usedEnvFallback };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
