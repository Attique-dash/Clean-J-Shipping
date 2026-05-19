import { Request, Response, NextFunction } from 'express';

/**
 * Tasoko/Askenish POST bodies are often a JSON array with one package object.
 * Unwrap to a single object so validators and handlers see UserCode, TrackingNumber, etc.
 */
export function unwrapKcdPackageBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (Array.isArray(req.body)) {
    if (req.body.length === 0) {
      req.body = {};
      return next();
    }
    req.body = req.body[0];
  }
  next();
}
