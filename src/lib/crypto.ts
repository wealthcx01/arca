/**
 * AES-256-GCM encryption for BYOK API keys.
 * Uses Web Crypto API (available in Bun).
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

function getEncryptionKey(): string {
  const key = process.env.ARCA_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "ARCA_ENCRYPTION_KEY must be set (at least 32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return key;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret.slice(0, 32));
  return crypto.subtle.importKey("raw", keyData, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded,
  );

  // Encode as base64: iv + ciphertext (tag is appended by WebCrypto)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
