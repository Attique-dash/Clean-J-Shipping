import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import {
  extractKcdToken,
  hashApiKey,
  isRealApiToken,
} from '../lib/kcd-token';

export interface AuthenticatedKcdRequest extends Request {
  kcdApiKey?: any;
  courierCode?: string;
  kcdResolvedToken?: string;
}

// Generate API key — plain 48-char alphanumeric, NO prefix ever
function injectResolvedTokenIntoBody(
  req: AuthenticatedKcdRequest,
  token: string
): void {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return;
  const body = req.body as Record<string, unknown>;
  if (!isRealApiToken(body.APIToken) && !isRealApiToken(body.apiToken)) {
    body.APIToken = token;
    body.apiToken = token;
  }
}

export const generateApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

async function findActiveApiKey(apiKey: string) {
  const plain = await ApiKey.findOne({ key: apiKey, isActive: true });
  if (plain) return plain;

  const hashed = hashApiKey(apiKey);
  return ApiKey.findOne({
    $or: [
      { key: hashed, isActive: true },
      { key: hashed, active: true },
    ],
  });
}

export const authKcdApiKey = async (
  req: AuthenticatedKcdRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.method === 'OPTIONS') return next();

    const { token, candidates, rejectedPlaceholders, usedEnvFallback } =
      extractKcdToken(req);
    const authChecked = candidates.map((c) => c.source);

    if (!token) {
      const errors: Array<{ field: string; message: string }> = [];
      if (rejectedPlaceholders.length > 0) {
        errors.push({
          field: 'APIToken',
          message:
            'APIToken in body is a placeholder, not a real key. Remove "<API-TOKEN>" and use your real token in APIToken, or send x-api-key / Authorization header.',
        });
      } else {
        errors.push({
          field: 'auth',
          message:
            'No API token provided. Use ?id=TOKEN (GET), x-api-key header, Authorization header, or APIToken in JSON body.',
        });
      }

      res.status(401).json({
        success: false,
        message: 'Unauthorized: No API token provided.',
        errorCode: 'KCD_AUTH_MISSING',
        authChecked: [
          'query.id',
          'query.apiKey',
          'query.apiToken',
          'query.token',
          'query.content',
          'header.authorization',
          'header.x-kcd-api-key',
          'header.x-api-key',
          'body.token',
          'body.APIToken',
          'body.apiToken',
          'env.KCD_API_KEY',
        ],
        errors,
        rejectedPlaceholders: rejectedPlaceholders.length
          ? rejectedPlaceholders
          : undefined,
        hint:
          'Postman: add header x-api-key with your real token, or replace APIToken in body with the same value (not <API-TOKEN>).',
      });
      return;
    }

    const tokenSource = candidates[0]?.source ?? 'unknown';
    console.log(
      `[KCD Auth] Token from ${tokenSource} (${token.substring(0, 8)}… len=${token.length})${
        usedEnvFallback ? ' [KCD_API_KEY env fallback for Askenish proxy]' : ''
      }`
    );

    const envApiKey = process.env.KCD_API_KEY?.trim();
    if (envApiKey && token === envApiKey) {
      console.log('[KCD Auth] Validated via KCD_API_KEY environment variable');
      req.kcdApiKey = {
        _id: 'env-key',
        name: 'KCD Environment Key',
        courierCode: 'CLEANJ',
        isActive: true,
      };
      req.courierCode = 'CLEANJ';
      req.kcdResolvedToken = token;
      injectResolvedTokenIntoBody(req, token);
      return next();
    }

    const kcdKey = await findActiveApiKey(token);

    if (!kcdKey) {
      console.error(
        '[KCD Auth] Token not in DB/env:',
        token.substring(0, 8) + '…',
        'len=' + token.length
      );
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API token.',
        errorCode: 'KCD_AUTH_INVALID',
        authChecked,
        tokenSource,
        errors: [
          {
            field: 'auth',
            message:
              'The API token was found but does not match KCD_API_KEY or an active key in the database.',
          },
        ],
        hint:
          rejectedPlaceholders.length > 0
            ? 'Body contained a placeholder APIToken; ensure x-api-key uses the same key as GET /customers.'
            : 'Verify the token in the KCD portal matches KCD_API_KEY on the server or generate a new KCD API key.',
      });
      return;
    }

    if (!kcdKey.isActive) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: API key is inactive.',
        errorCode: 'KCD_AUTH_INACTIVE',
      });
      return;
    }

    if (kcdKey.expiresAt && kcdKey.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: API key has expired.',
        errorCode: 'KCD_AUTH_EXPIRED',
        errors: [{ field: 'auth', message: `Key expired at ${kcdKey.expiresAt.toISOString()}` }],
      });
      return;
    }

    await ApiKey.findByIdAndUpdate(kcdKey._id, {
      $inc: { usageCount: 1 },
      lastUsed: new Date(),
    });

    req.kcdApiKey = kcdKey;
    req.courierCode = kcdKey.courierCode;
    req.kcdResolvedToken = token;
    injectResolvedTokenIntoBody(req, token);
    console.log('[KCD Auth] OK:', { courierCode: kcdKey.courierCode, path: req.path });
    next();
  } catch (error) {
    console.error('[KCD Auth] Error:', error);
    res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};
