import { Request, Response, NextFunction } from 'express';
import { extractPackagesFromUnknown } from '../lib/kcd-inbound';
import { isRealApiToken } from '../lib/kcd-token';

/**
 * Normalize Tasoko/Askenish requests before auth and validation:
 * - Unwrap JSON array bodies to the first package object
 * - Unwrap proxy-style { token, method, url, content } when sent to our API directly
 */
export function prepareKcdRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    let body = req.body;

    if (Array.isArray(body) && body.length > 0) {
      body = body[0];
    }

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const obj = body as Record<string, unknown>;
      const hasProxyShape =
        typeof obj.url === 'string' &&
        (obj.method === 'GET' || obj.method === 'POST' || obj.method === 'PUT') &&
        obj.content !== undefined;

      if (hasProxyShape) {
        const proxyToken = isRealApiToken(obj.token)
          ? String(obj.token).trim()
          : null;
        let content: unknown = obj.content;
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content);
          } catch {
            content = obj.content;
          }
        }

        const packages = extractPackagesFromUnknown(content);
        if (packages.length > 0) {
          body = { ...packages[0] };
          if (proxyToken) {
            (body as Record<string, unknown>).APIToken = proxyToken;
            (body as Record<string, unknown>).apiToken = proxyToken;
          }
        } else if (
          content &&
          typeof content === 'object' &&
          !Array.isArray(content)
        ) {
          body = { ...(content as Record<string, unknown>) };
          if (proxyToken) {
            (body as Record<string, unknown>).APIToken = proxyToken;
            (body as Record<string, unknown>).apiToken = proxyToken;
          }
        }
      }
    }

    req.body = body;
  } catch (e) {
    console.error('[prepareKcdRequest] normalize failed:', e);
  }
  next();
}
