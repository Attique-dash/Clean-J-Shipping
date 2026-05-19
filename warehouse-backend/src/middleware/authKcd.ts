import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import {
  buildAuthCredentialAttempts,
  hashApiKey,
  isRealApiToken,
} from '../lib/kcd-token';

export interface AuthenticatedKcdRequest extends Request {
  kcdApiKey?: any;
  courierCode?: string;
  kcdResolvedToken?: string;
}

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
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

    const { attempts, rejectedPlaceholders } = buildAuthCredentialAttempts(req);
    const triedSources = attempts.map((a) => a.source);

    if (attempts.length === 0) {
      const errors: Array<{ field: string; message: string }> = [];
      if (rejectedPlaceholders.length > 0) {
        errors.push({
          field: 'APIToken',
          message:
            'APIToken in body is a placeholder, not a real key. Remove "<API-TOKEN>" and use your real token in APIToken, or send x-api-key / ?id= with your key.',
        });
      } else {
        errors.push({
          field: 'auth',
          message:
            'No API token provided. Use ?id=TOKEN, x-api-key header, Authorization header, or token / APIToken in JSON body.',
        });
      }

      res.status(401).json({
        success: false,
        message:
          'Unauthorized: No API token provided. (Open Network → this response body for details; the Askenish UI may only show a generic message.)',
        errorCode: 'KCD_AUTH_MISSING',
        triedSources: [],
        errors,
        rejectedPlaceholders:
          rejectedPlaceholders.length > 0 ? rejectedPlaceholders : undefined,
        hint:
          'Tasoko proxy: append ?id=YOUR_KEY to the Get Customers URL, or ensure the proxy forwards x-api-key.',
      });
      return;
    }

    const envApiKey = process.env.KCD_API_KEY?.trim();

    for (const attempt of attempts) {
      if (envApiKey && attempt.token === envApiKey) {
        console.log(`[KCD Auth] OK via ${attempt.source} (KCD_API_KEY env)`);
        req.kcdApiKey = {
          _id: 'env-key',
          name: 'KCD Environment Key',
          courierCode: 'CLEANJ',
          isActive: true,
        };
        req.courierCode = 'CLEANJ';
        req.kcdResolvedToken = attempt.token;
        injectResolvedTokenIntoBody(req, attempt.token);
        return next();
      }

      const kcdKey = await findActiveApiKey(attempt.token);
      if (!kcdKey) {
        console.log(
          `[KCD Auth] Rejected token from ${attempt.source} (${attempt.token.substring(0, 8)}…)`
        );
        continue;
      }

      if (!kcdKey.isActive) {
        res.status(401).json({
          success: false,
          message: `Unauthorized: API key from ${attempt.source} is inactive.`,
          errorCode: 'KCD_AUTH_INACTIVE',
          tokenSource: attempt.source,
          triedSources,
        });
        return;
      }

      if (kcdKey.expiresAt && kcdKey.expiresAt < new Date()) {
        res.status(401).json({
          success: false,
          message: `Unauthorized: API key from ${attempt.source} has expired.`,
          errorCode: 'KCD_AUTH_EXPIRED',
          tokenSource: attempt.source,
          triedSources,
          errors: [
            {
              field: 'auth',
              message: `Key expired at ${kcdKey.expiresAt.toISOString()}`,
            },
          ],
        });
        return;
      }

      await ApiKey.findByIdAndUpdate(kcdKey._id, {
        $inc: { usageCount: 1 },
        lastUsed: new Date(),
      });

      req.kcdApiKey = kcdKey;
      req.courierCode = kcdKey.courierCode;
      req.kcdResolvedToken = attempt.token;
      injectResolvedTokenIntoBody(req, attempt.token);
      console.log('[KCD Auth] OK:', {
        courierCode: kcdKey.courierCode,
        path: req.path,
        source: attempt.source,
      });
      return next();
    }

    console.error(
      '[KCD Auth] No credential matched DB or KCD_API_KEY. tried:',
      triedSources.join(', ')
    );
    res.status(401).json({
      success: false,
      message: `Unauthorized: tried ${attempts.length} credential(s) from [${triedSources.join(', ')}]; none matched an active key or KCD_API_KEY. (Askenish UI may hide this — use DevTools → Network → Response.)`,
      errorCode: 'KCD_AUTH_INVALID',
      triedSources,
      errors: [
        {
          field: 'auth',
          message:
            'Each supplied token was rejected. Common causes: wrong key in portal, proxy stripping ?id= or headers, or key only in DB but not matching KCD_API_KEY.',
        },
      ],
      rejectedPlaceholders:
        rejectedPlaceholders.length > 0 ? rejectedPlaceholders : undefined,
      hint:
        'Append ?id=YOUR_API_KEY to both Get Customers and Add Package URLs in the portal, or fix the Tasoko proxy to forward x-api-key.',
    });
  } catch (error) {
    console.error('[KCD Auth] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      errorCode: 'KCD_AUTH_EXCEPTION',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
