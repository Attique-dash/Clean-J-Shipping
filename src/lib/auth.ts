import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload: { 
  id: string; 
  email: string; 
  role: string;
  userCode?: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { id: string; email: string; role: string; userCode?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') {
      return null;
    }
    return decoded as { id: string; email: string; role: string; userCode?: string };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Re-export authOptions from NextAuth configuration
export { authOptions } from '@/lib/auth-config';
