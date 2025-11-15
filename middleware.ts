// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                       req.nextUrl.pathname.startsWith('/register');
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');

    // If user is on auth pages and already authenticated, redirect to home
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // If accessing admin pages, check if user is admin
    if (isAdminPage) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const publicRoutes = ['/', '/products', '/about', '/contact'];
        const isPublicRoute = publicRoutes.some(route => 
          req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith('/api')
        );
        
        if (isPublicRoute) {
          return true;
        }

        // For protected routes, require authentication
        return !!token;
      },
    },
  }
);

// Configure which routes should be protected
export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/orders/:path*',
    '/login',
    '/register',
  ],
};