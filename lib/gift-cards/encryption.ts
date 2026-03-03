// Gift Card Code Encryption using AES-256-GCM
// Provides secure encryption for sensitive gift card codes

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard IV length
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.GIFT_CARD_ENCRYPTION_KEY

  if (!key) {
    // In development, use a derived key from a default secret
    // In production, this should be a properly generated 32-byte key
    const fallbackSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    return crypto.scryptSync(fallbackSecret, 'gift-card-salt', KEY_LENGTH)
  }

  // If key is provided as hex string (64 chars for 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  // If key is provided as base64
  if (key.length === 44) {
    return Buffer.from(key, 'base64')
  }

  // Derive key from provided string
  return crypto.scryptSync(key, 'gift-card-salt', KEY_LENGTH)
}

/**
 * Encrypt a gift card code
 * Returns format: iv:authTag:encryptedData (all base64)
 */
export function encryptCode(plaintext: string): string {
  if (!plaintext) return ''

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Combine: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt a gift card code
 * Expects format: iv:authTag:encryptedData (all base64)
 */
export function decryptCode(ciphertext: string): string {
  if (!ciphertext) return ''

  // Check if it's already plaintext (for backwards compatibility)
  if (!ciphertext.includes(':')) {
    return ciphertext
  }

  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    // Not in expected format, return as-is (backwards compatibility)
    return ciphertext
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts

  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')
    const encrypted = Buffer.from(encryptedBase64, 'base64')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Failed to decrypt gift card code:', error)
    // Return as-is if decryption fails (backwards compatibility)
    return ciphertext
  }
}

/**
 * Check if a code is encrypted
 */
export function isEncrypted(code: string): boolean {
  if (!code) return false
  const parts = code.split(':')
  return parts.length === 3 &&
         parts[0].length === 16 && // base64 IV (12 bytes = 16 chars)
         parts[1].length === 24    // base64 auth tag (16 bytes = 24 chars)
}

/**
 * Mask a code for display (e.g., "XXXX-XXXX-AB12")
 */
export function maskCode(code: string, showLast: number = 4): string {
  if (!code) return ''

  // Decrypt if encrypted
  const plainCode = isEncrypted(code) ? decryptCode(code) : code

  if (plainCode.length <= showLast) {
    return '*'.repeat(plainCode.length)
  }

  const maskedLength = plainCode.length - showLast
  return '*'.repeat(maskedLength) + plainCode.slice(-showLast)
}

/**
 * Generate a random encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}
