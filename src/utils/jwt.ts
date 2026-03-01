import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Log JWT_SECRET on startup (only first 20 chars for security)
console.log('JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 20)}... (${JWT_SECRET.length} chars)` : 'NOT SET');

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as string;
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const result = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('Token verified successfully for user:', result.email);
    return result;
  } catch (error: any) {
    console.error('JWT verification error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}
