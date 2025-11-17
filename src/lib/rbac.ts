import { cookies } from "next/headers";
import { verifyToken } from "./auth";

export interface AuthPayload {
  id?: string;
  _id?: string;
  uid?: string;
  email: string;
  role: "admin" | "customer" | "warehouse";
  userCode?: string;
}

export async function getAuthFromRequest(req: Request): Promise<AuthPayload | null> {
  try {
    // Try to get token from Authorization header first
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload) return payload as AuthPayload;
    }

    // Then try to get token from cookie - MUST USE AWAIT
    const cookieStore = await cookies(); // <-- ADD AWAIT HERE
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload) return payload as AuthPayload;
    }

    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export function requireRole(payload: AuthPayload | null, role: string) {
  if (!payload || payload.role !== role) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export function isWarehouseAuthorized(req: Request): boolean {
  const key = req.headers.get("x-warehouse-key") || req.headers.get("x-api-key");
  if (!key) return false;
  const allowed = getAllowedWarehouseKeys();
  return allowed.includes(key);
}

export function getAllowedWarehouseKeys(): string[] {
  const keys = process.env.WAREHOUSE_API_KEYS || "";
  return keys.split(",").filter(Boolean);
}

export function verifyWarehouseKeyFromRequest(req: Request): boolean {
  const key = req.headers.get("x-warehouse-key") || req.headers.get("x-api-key");
  if (!key) return false;
  const allowed = getAllowedWarehouseKeys();
  return allowed.includes(key);
}

export async function verifyWarehouseApiKey(
  req: Request,
  requiredPermissions?: string[]
): Promise<{ valid: boolean; keyInfo?: { keyPrefix: string; permissions: string[] } }> {
  const key = req.headers.get("x-warehouse-key") || req.headers.get("x-api-key");
  if (!key) return { valid: false };

  const allowed = getAllowedWarehouseKeys();
  if (!allowed.includes(key)) return { valid: false };

  // If no specific permissions required, just check if key is valid
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return {
      valid: true,
      keyInfo: {
        keyPrefix: key.substring(0, 12),
        permissions: ["*"],
      },
    };
  }

  // For now, all valid warehouse keys have all permissions
  return {
    valid: true,
    keyInfo: {
      keyPrefix: key.substring(0, 12),
      permissions: ["*"],
    },
  };
}