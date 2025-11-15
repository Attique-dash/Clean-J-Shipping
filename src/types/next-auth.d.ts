import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession['user'];
  }

  /**
   * Extend the built-in user types
   */
  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the built-in JWT types
   */
  interface JWT {
    id: string;
    role?: string;
  }
}
