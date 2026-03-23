import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET env var is required') })()
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// JWT token management
export interface TokenPayload {
  userId: string
  role: string
  email: string
}

export function signAccessToken(userId: string, role: string, email: string): string {
  const payload: TokenPayload = { userId, role, email }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch (error) {
    return null
  }
}

// Wallet authentication
export function generateNonce(): string {
  return randomBytes(32).toString('hex')
}

// Calculate refresh token expiry date
export function getRefreshTokenExpiry(): Date {
  const days = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace('d', ''))
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry
}
