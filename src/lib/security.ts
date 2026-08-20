/**
 * PIN + recovery-code cryptography for the parental lock.
 * PINs are never stored: only a PBKDF2-SHA256 hash with a per-account salt.
 */

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 150_000 },
    key,
    256,
  );
  return toHex(bits);
}

export async function verifySecret(secret: string, salt: string, hash: string): Promise<boolean> {
  return (await hashSecret(secret, salt)) === hash;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly one-time recovery codes, e.g. `4KQ7-M2XP`. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join("");
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}
