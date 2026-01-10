/**
 * Secure ID and Key Generation Utilities
 *
 * Generates cryptographically secure identifiers for:
 * - Application IDs: xen_<env>_<base32_160bits>
 * - API Keys: xen_<env>_live_<base64url_256bits>
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Get current environment for ID generation
 */
function getEnvironment(): 'dev' | 'staging' | 'prod' {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV;

  if (env === 'production') return 'prod';
  if (env === 'staging') return 'staging';
  return 'dev';
}

/**
 * Base32 encoding (RFC 4648) without padding
 * Uses uppercase letters and digits 2-7
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte === undefined) continue;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const charIndex = (value >>> (bits - 5)) & 31;
      output += alphabet[charIndex] ?? '';
      bits -= 5;
    }
  }

  if (bits > 0) {
    const charIndex = (value << (5 - bits)) & 31;
    output += alphabet[charIndex] ?? '';
  }

  return output;
}

/**
 * Base64URL encoding (RFC 4648 §5) without padding
 * URL-safe variant: uses - and _ instead of + and /
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate Application ID
 *
 * Format: xen_<env>_<base32_160bits>
 * Example: xen_prod_ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
 *
 * - 160 bits = 20 bytes = 32 base32 characters
 * - Immutable once set
 * - Used for storage paths and public identification
 */
export function generateApplicationId(): string {
  const env = getEnvironment();
  const randomData = randomBytes(20); // 160 bits
  const encoded = base32Encode(randomData);

  return `xen_${env}_${encoded}`;
}

/**
 * Generate API Key
 *
 * Format: xen_<env>_live_<base64url_256bits>
 * Example: xen_prod_live_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_
 *
 * - 256 bits = 32 bytes = 43 base64url characters
 * - Shown to user only once
 * - Must be hashed before storage
 */
export function generateAPIKey(): string {
  const env = getEnvironment();
  const randomData = randomBytes(32); // 256 bits
  const encoded = base64UrlEncode(randomData);

  return `xen_${env}_live_${encoded}`;
}

/**
 * Hash API Key using SHA-256
 *
 * @param apiKey - The plaintext API key to hash
 * @returns SHA-256 hash as hex string
 *
 * CRITICAL: This must be used before storing api_key_hash in database
 */
export function hashAPIKey(apiKey: string): string {
  return createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Verify API Key against stored hash
 *
 * @param providedKey - The API key from the request
 * @param storedHash - The SHA-256 hash from database
 * @returns true if key matches hash
 */
export function verifyAPIKey(providedKey: string, storedHash: string): boolean {
  const providedHash = hashAPIKey(providedKey);

  // Timing-safe comparison to prevent timing attacks
  if (providedHash.length !== storedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedHash.length; i++) {
    result |= providedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate Application ID format
 *
 * @param appId - The application ID to validate
 * @returns true if format is valid
 */
export function validateApplicationId(appId: string): boolean {
  // Format: xen_<env>_<base32>
  const pattern = /^xen_(dev|staging|prod)_[A-Z2-7]{32}$/;
  return pattern.test(appId);
}

/**
 * Validate API Key format
 *
 * @param apiKey - The API key to validate
 * @returns true if format is valid
 */
export function validateAPIKey(apiKey: string): boolean {
  // Format: xen_<env>_live_<base64url>
  const pattern = /^xen_(dev|staging|prod)_live_[A-Za-z0-9\-_]{43}$/;
  return pattern.test(apiKey);
}

/**
 * Get environment from Application ID
 *
 * @param appId - The application ID
 * @returns The environment (dev, staging, prod) or null if invalid
 */
export function getEnvironmentFromApplicationId(appId: string): 'dev' | 'staging' | 'prod' | null {
  const match = appId.match(/^xen_(dev|staging|prod)_/);
  return match ? (match[1] as 'dev' | 'staging' | 'prod') : null;
}

/**
 * Get environment from API Key
 *
 * @param apiKey - The API key
 * @returns The environment (dev, staging, prod) or null if invalid
 */
export function getEnvironmentFromAPIKey(apiKey: string): 'dev' | 'staging' | 'prod' | null {
  const match = apiKey.match(/^xen_(dev|staging|prod)_live_/);
  return match ? (match[1] as 'dev' | 'staging' | 'prod') : null;
}
