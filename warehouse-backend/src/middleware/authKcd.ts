import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';

export interface AuthenticatedKcdRequest extends Request {
  kcdApiKey?: any;
  courierCode?: string;
}

// Generate API key — plain 48-char alphanumeric, NO prefix ever
export const generateApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// extractToken — pulls token from ALL 3 locations KCD uses per their API docs:
//
//   1. GET /customers  → query param:   ?id=TOKEN
//   2. POST endpoints  → JSON body:     { "APIToken": "TOKEN", ... }
//   3. Auth header     → raw, NO Bearer: Authorization: TOKEN
// ─────────────────────────────────────────────────────────────────────────────
const extractToken = (req: Request): string | null => {
  // 1. Query param (?id=TOKEN) — used by Get Customers
  if (req.query?.id && typeof req.query.id === 'string' && req.query.id.trim()) {
    console.log('[KCD Auth] Token from query param ?id=');
    return req.query.id.trim();
  }

  // 2. Request body APIToken — used by Add/Update/Delete Package & Update Manifest
  const body = req.body;
  if (body) {
    const item = Array.isArray(body) ? body[0] : body;
    const bodyToken = item?.APIToken || item?.apiToken;
    if (bodyToken && typeof bodyToken === 'string' && bodyToken.trim()) {
      console.log('[KCD Auth] Token from body.APIToken');
      return bodyToken.trim();
    }
  }

  // 3. Authorization header — KCD sends raw token WITHOUT "Bearer " prefix
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.trim()) {
    let token = authHeader.trim();
    // Strip "Bearer " if accidentally added (e.g. Swagger)
    token = token.replace(/^Bearer\s+/i, '').trim();
    if (token.length > 0) {
      console.log('[KCD Auth] Token from Authorization header');
      return token;
    }
  }

  // 4. X-KCD-API-Key header — primary header for KCD API
  const xKcdApiKey = req.headers['x-kcd-api-key'];
  if (xKcdApiKey && typeof xKcdApiKey === 'string' && xKcdApiKey.trim()) {
    console.log('[KCD Auth] Token from X-KCD-API-Key header');
    return xKcdApiKey.trim();
  }

  // 5. X-API-Key header fallback
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey && typeof xApiKey === 'string' && xApiKey.trim()) {
    console.log('[KCD Auth] Token from X-API-Key header');
    return xApiKey.trim();
  }

  return null;
};

export const authKcdApiKey = async (
  req: AuthenticatedKcdRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.method === 'OPTIONS') return next();

    // Debug: Log all headers
    console.log('[KCD Auth] Request headers:', {
      authorization: req.headers.authorization,
      'x-kcd-api-key': req.headers['x-kcd-api-key'],
      'x-api-key': req.headers['x-api-key'],
      'content-type': req.headers['content-type']
    });

    const apiKey = extractToken(req);

    if (!apiKey) {
      console.error('[KCD Auth] No token found in request');
      res.status(401).json({
        success: false,
        message: 'Unauthorized: No API token provided.',
        hint: 'GET: use ?id=TOKEN | POST: include "APIToken" in body | or Authorization: TOKEN (no Bearer prefix)',
      });
      return;
    }

    const kcdKey = await ApiKey.findOne({
      key: apiKey,
      isActive: true
    });

    if (!kcdKey) {
      console.error('[KCD Auth] Token not in DB:', apiKey.substring(0, 8) + '...' + ' len=' + apiKey.length);
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid API token.' });
      return;
    }

    if (!kcdKey.isActive) {
      res.status(401).json({ success: false, message: 'Unauthorized: API key is inactive.' });
      return;
    }

    if (kcdKey.expiresAt && kcdKey.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Unauthorized: API key has expired.' });
      return;
    }

    await ApiKey.findByIdAndUpdate(kcdKey._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date(),
    });

    req.kcdApiKey = kcdKey;
    req.courierCode = kcdKey.courierCode;
    console.log('[KCD Auth] ✅ OK:', { courierCode: kcdKey.courierCode, path: req.path });
    next();
  } catch (error) {
    console.error('[KCD Auth] Error:', error);
    res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};