const ITERATIONS = 100_000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

/**
 * Hashes a password using PBKDF2 + SHA-256 with a random salt.
 * Returns a base64-encoded string containing: salt (16 bytes) + derived key (32 bytes).
 * Works in Cloudflare Workers (Web Crypto API — no Node.js required).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const derived = new Uint8Array(derivedBits);
  const combined = new Uint8Array(SALT_BYTES + derived.length);
  combined.set(salt);
  combined.set(derived, SALT_BYTES);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Verifies a password against a stored PBKDF2 hash. Constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_BYTES);
  const storedDerived = combined.slice(SALT_BYTES);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH_ALGO },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const derived = new Uint8Array(derivedBits);

  // Constant-time comparison to prevent timing attacks
  if (derived.length !== storedDerived.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) {
    diff |= derived[i] ^ storedDerived[i];
  }
  return diff === 0;
}
