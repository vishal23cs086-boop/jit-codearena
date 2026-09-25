// ==============================================================================
// JIT CodeArena - Edge-Safe HMAC Session Token Service
// Uses Web Crypto API compatible with Next.js Edge Runtime and Node.js
// ==============================================================================

const SESSION_SECRET_FALLBACK = 'jit-codearena-production-session-auth-key-2026';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || SESSION_SECRET_FALLBACK;
  return secret.trim().replace(/^["']|["']$/g, '');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secret = getSessionSecret();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SessionPayload {
  role: 'admin' | 'student';
  id: string;
  register_number?: string;
  year?: number;
  session_version?: number;
  exp: number; // Unix timestamp in ms
}

/**
 * Signs a session payload into a secure HMAC-SHA256 token
 */
export async function signSessionToken(payload: Omit<SessionPayload, 'exp'>, maxAgeSeconds = 86400 * 7): Promise<string> {
  const encoder = new TextEncoder();
  const key = await getHmacKey();
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + maxAgeSeconds * 1000,
  };

  const payloadJson = JSON.stringify(fullPayload);
  const payloadB64 = toBase64Url(encoder.encode(payloadJson));
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const key = await getHmacKey();

    const sigBytes = fromBase64Url(sigB64);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes as any, encoder.encode(payloadB64));
    if (!isValid) return null;

    const payloadJson = decoder.decode(fromBase64Url(payloadB64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
