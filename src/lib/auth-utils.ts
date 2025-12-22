import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';

interface User {
  id: string;
  email?: string | null | undefined;
  name?: string | null | undefined;
  role: string;
}

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

type AuthMiddleware = (req: NextApiRequest, res: NextApiResponse) => Promise<NextResponse | void>;

export function withAuth(handler: AuthMiddleware): AuthMiddleware {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Add user to request object
    (req as NextApiRequest & { user: User }).user = user;
    
    return handler(req, res);
  };
}

export function withRole(roles: string[]) {
  return (handler: AuthMiddleware): AuthMiddleware => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.url));
      }

      if (!roles.includes(user.role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Add user to request object
      (req as NextApiRequest & { user: User }).user = user;
      
      return handler(req, res);
    };
  };
}
