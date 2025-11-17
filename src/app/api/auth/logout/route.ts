// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    
    // Create a response that will redirect to login
    const response = new NextResponse(null, {
      status: 302,
      headers: {
        Location: '/login',
        'Set-Cookie': '',
      },
    });

    // Clear all auth-related cookies
    const cookieOptions = {
      httpOnly: true,
      path: '/',
      expires: new Date(0),
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };

    // Clear all possible auth cookies
    [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'auth_token',
      'token'
    ].forEach(cookieName => {
      response.cookies.set(cookieName, '', cookieOptions);
    });

    return response;

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}