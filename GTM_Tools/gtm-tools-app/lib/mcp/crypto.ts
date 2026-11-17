import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const b64u = (buffer: Buffer) => buffer.toString("base64url");
const keyFrom = (secret: string) => createHash("sha256").update(secret).digest();

export function seal(secret: string, payload: Record<string, unknown>, ttlSeconds: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const body = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return `${b64u(iv)}.${b64u(cipher.getAuthTag())}.${b64u(encrypted)}`;
}

/** Return a genuine, unexpired token payload of the expected type; otherwise null. */
export function open<T extends Record<string, unknown>>(
  secret: string,
  token: string,
  typ: string
): (T & { typ: string; exp: number }) | null {
  try {
    const [ivB64, tagB64, dataB64] = token.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plain) as T & { typ: string; exp: number };
    if (payload.typ !== typ) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** Verify the S256 PKCE challenge for an authorization code. */
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (verifier.length < 43 || verifier.length > 128) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEqual(computed, challenge);
}
