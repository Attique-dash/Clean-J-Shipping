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

export async function generateUserCode(): Promise<string> {
  const User = (await import('@/models/User')).User;
  let userCode: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    userCode = `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const existing = await User.findOne({ userCode });
    if (!existing) {
      isUnique = true;
    }
    
    attempts++;
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    throw new Error('Failed to generate unique user code after multiple attempts');
  }

  return userCode;
}

// Re-export authOptions from NextAuth configuration
export { authOptions } from '@/lib/auth-config';
