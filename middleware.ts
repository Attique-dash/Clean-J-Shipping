import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("auth_token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "admin") {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("auth_token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect", "/dashboard");
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/warehouse")) {
    const token = req.cookies.get("auth_token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || (payload.role !== "warehouse" && payload.role !== "admin")) {
      const url = new URL("/login", req.url);
      url.searchParams.set("redirect", "/warehouse");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/warehouse/:path*"],
};
