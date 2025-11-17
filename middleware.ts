// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/password-reset',
    '/about-us',
    '/contact',
    '/track',
    '/',
  ];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow all API routes to handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // If no token and trying to access protected route, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as string;

    // Role-based access control
    
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

    // Warehouse routes - only warehouse staff can access
    if (pathname.startsWith('/warehouse')) {
      if (userRole !== 'warehouse') {
        const dashboardUrl = userRole === 'admin'
          ? new URL('/admin', request.url)
          : new URL('/customer/dashboard', request.url);
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
     */
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|api/auth).*)',
  ],
};