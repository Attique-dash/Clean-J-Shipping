import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { dbConnect } from '@/lib/db';
import { comparePassword } from '@/lib/auth';
import { User } from '@/models/User';

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      isVerified?: boolean;
      userCode?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    isVerified?: boolean;
    userCode?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    userCode?: string;
    updated?: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Missing credentials');
          return null;
        }

        try {
          await dbConnect();
          console.log('[Auth] Looking for user:', credentials.email);
          
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase()
          }).select('_id userCode email passwordHash firstName lastName role accountStatus lastLogin');

          if (!user) {
            console.log('[Auth] User not found');
            return null;
          }

          console.log('[Auth] User found:', {
            id: user._id,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus
          });

          if (user.accountStatus !== 'active') {
            console.log('[Auth] Account is not active');
            return null;
          }

          const isPasswordValid = await comparePassword(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            console.log('[Auth] Invalid password');
            return null;
          }

          console.log('[Auth] Login successful');

          // CRITICAL FIX: Update last login
          user.lastLogin = new Date();
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role,
            userCode: user.userCode,
          };
        } catch (error) {
          console.error('[Auth] Error during authorization:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // CRITICAL FIX: Handle session updates
      if (trigger === 'update') {
        // Force token refresh on update
        return { ...token, updated: Date.now() };
      }
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userCode = user.userCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userCode = token.userCode as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // CRITICAL FIX: Update session every 24 hours
  },
  // CRITICAL FIX: Add these options
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
