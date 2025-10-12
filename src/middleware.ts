import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Base64url decode without Node Buffer to work in Edge runtime
function base64UrlDecode(input: string): string {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad) input += "=".repeat(4 - pad);
  const raw = Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(raw);
}

function getRoleFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("auth_token")?.value;
  const role = getRoleFromToken(token || undefined);

  // Consider user authenticated if token exists, even if role payload couldn't be parsed yet
  const isAuth = Boolean(token);

  const isAdmin = pathname.startsWith("/admin");
  const isWarehouse = pathname.startsWith("/warehouse");
  const isCustomer = pathname.startsWith("/customer") || pathname.startsWith("/dashboard");

  // Allow admin login page to load without middleware interference
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Only protect admin/warehouse on the edge to avoid client login loops
  if (!isAuth && (isAdmin || isWarehouse)) {
    const url = req.nextUrl.clone();
    if (isAdmin) {
      url.pathname = "/admin/login";
    } else {
      url.pathname = "/login";
    }
    url.search = `?redirect=${encodeURIComponent(pathname + (search || ""))}`;
    return NextResponse.redirect(url);
  }

  // 3) Role-based route protection
  if (role === "customer") {
    if (isAdmin || isWarehouse) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (role === "admin") {
    if (isCustomer || isWarehouse) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  if (role === "warehouse") {
    if (isCustomer || isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/warehouse";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/warehouse/:path*",
  ],
};
