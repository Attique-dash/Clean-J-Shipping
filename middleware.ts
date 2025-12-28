// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/password-reset',
  '/about-us',
  '/contact',
  '/track',
  '/services',
  '/rates',
  '/customs-policy',
  '/',
  '/api/auth/',
  '/_next',
  '/images',
  '/fonts'
];

// Check if the current path is a public route
function isPublicPath(pathname: string): boolean {
  // Exact match for root
  if (pathname === '/') return true;
  
  // Check against public routes
  return publicRoutes.some(route => 
    pathname === route || 
    pathname.startsWith(`${route}/`) ||
    pathname.startsWith(`/api/auth/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, static files, and Next.js internals
  if (
    isPublicPath(pathname) ||
    pathname.includes('.') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/')
  ) {
    return NextResponse.next();
  }

  // For ALL protected routes (both pages and API), check authentication
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'development'
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as string;

    // Role-based access control for API routes
    if (pathname.startsWith('/api/')) {
      // Admin API routes - only admins can access
      if (pathname.startsWith('/api/admin/')) {
        if (!["admin", "warehouse_staff", "customer_support"].includes(userRole)) {
          return NextResponse.json(
            { 
              success: false,
              error: "Insufficient permissions",
              code: "INSUFFICIENT_PERMISSIONS"
            },
            { status: 403 }
          );
        }
      }
      
      // Allow authenticated API requests to proceed
      return NextResponse.next();
    }

    // Role-based access control for page routes
    
    // Admin routes - only admins can access
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin') {
        const dashboardUrl = userRole === 'warehouse' 
          ? new URL('/warehouse', request.url)
          : new URL('/customer/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
      return NextResponse.next();
    }

    // Warehouse routes - warehouse staff and admins can access
    if (pathname.startsWith('/warehouse')) {
      if (!['warehouse', 'admin'].includes(userRole)) {
        const dashboardUrl = userRole === 'customer'
          ? new URL('/customer/dashboard', request.url)
          : new URL('/admin', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
      return NextResponse.next();
    }

    // Customer routes - only customers can access
    if (pathname.startsWith('/customer') || pathname.startsWith('/dashboard')) {
      if (userRole !== 'customer') {
        const dashboardUrl = userRole === 'admin'
          ? new URL('/admin', request.url)
          : new URL('/warehouse', request.url);
        return NextResponse.redirect(dashboardUrl);
      }
      return NextResponse.next();
    }

    // Default: allow access if authenticated
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     * - api/auth (NextAuth routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|api/auth).*)',
  ],
};