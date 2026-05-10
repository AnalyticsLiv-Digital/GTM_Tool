import jwt from 'jsonwebtoken';
import { User } from './db';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is not set or is too short (min 32 chars). Refusing to sign tokens with a weak secret.'
    );
  }
  return secret;
}

export interface TokenPayload {
  id: string;
  email: string;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
