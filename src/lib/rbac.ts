import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { ApiKey } from "@/models/ApiKey";
import { hashApiKey } from "@/models/ApiKey";

export type Role = "admin" | "customer" | "warehouse";

export type AuthPayload =
  | {
      _id?: string;
      email?: string;
      userCode?: string;
      role?: Role;
      // Allow additional fields but keep them typed as unknown to avoid 'any'.
      [k: string]: unknown;
    }
  | null;

export function getAuthFromRequest(req: Request): AuthPayload {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = /auth_token=([^;]+)/.exec(cookieHeader)?.[1];
  return token ? verifyToken(token) : null;
}

export function hasRole(payload: AuthPayload, role: Role) {
  return !!payload && payload.role === role;
}

export function requireRole(payload: AuthPayload, role: Role) {
  if (!hasRole(payload, role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function requireAnyRole(payload: AuthPayload, roles: Role[]) {
  if (!payload || !payload.role || !roles.includes(payload.role as Role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function getAllowedWarehouseKeys(): string[] {
  const env = process.env.WAREHOUSE_API_KEYS || "";
  return env
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function verifyWarehouseKeyFromRequest(req: Request): boolean {
  const provided = req.headers.get("x-warehouse-key") || req.headers.get("x-api-key") || "";
  if (!provided) return false;
  const allowed = getAllowedWarehouseKeys();
  return allowed.includes(provided);
}

// Allow either a logged-in user with role "warehouse" or a valid API key header
export function isWarehouseAuthorized(req: Request): boolean {
  try {
    const auth = getAuthFromRequest(req);
    if (hasRole(auth, "warehouse")) return true;
  } catch {
    // ignore token errors and fall back to api key
  }
  return verifyWarehouseKeyFromRequest(req);
}

// Strict async verification using ApiKey model. Only accepts header keys.
export async function verifyWarehouseApiKey(
  req: Request,
  requiredPermissions: string[] = []
): Promise<{ valid: boolean; keyInfo?: { keyPrefix: string; name: string } }> {
  const provided = req.headers.get("x-warehouse-key") || req.headers.get("x-api-key") || "";
  if (!provided) return { valid: false };
  if (!provided.startsWith("wh_live_") && !provided.startsWith("wh_test_")) {
    return { valid: false };
  }
  const hashed = hashApiKey(provided);
  try {
    await dbConnect();
    const keyRecord = await ApiKey.findOne({
      key: hashed,
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).select("keyPrefix name permissions active expiresAt");
    if (!keyRecord) return { valid: false };
    if (requiredPermissions.length) {
      const hasAll = requiredPermissions.every((p) => keyRecord.permissions.includes(p));
      if (!hasAll) return { valid: false };
    }
    // update usage async
    ApiKey.findByIdAndUpdate(keyRecord._id, { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } }).catch(() => {});
    return { valid: true, keyInfo: { keyPrefix: keyRecord.keyPrefix, name: keyRecord.name } };
  } catch {
    return { valid: false };
  }
}

export async function isWarehouseAuthorizedAsync(req: Request, requiredPermissions: string[] = []): Promise<boolean> {
  try {
    const auth = getAuthFromRequest(req);
    if (hasRole(auth, "warehouse")) return true;
  } catch {}
  const { valid } = await verifyWarehouseApiKey(req, requiredPermissions);
  return valid;
}
