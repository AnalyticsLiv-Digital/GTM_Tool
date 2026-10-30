import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Bring-your-own-key store.
 * The user's Anthropic key lives ONLY in this cookie: HttpOnly (page scripts
 * can't read it), scoped to the healthcheck routes, and AES-GCM encrypted.
 * It is never saved to a database.
 */

const COOKIE_NAME = "anthropic_api_key";
const COOKIE_PATH = "/api/auth/healthcheck";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: COOKIE_PATH,
    maxAge,
  };
}

function getCipherKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is not set or is too short (min 32 chars). Cannot store the API key.");
  }
  return createHash("sha256").update(`anthropic-key-cookie:${secret}`).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string): string {
  const [iv, tag, ct] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", getCipherKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function readAnthropicKey(req: NextRequest): string | null {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;

  try {
    return decrypt(value);
  } catch {
    // Corrupt / tampered / secret rotated: treat as no key so the user re-enters it.
    return null;
  }
}

export function setAnthropicKeyCookie(res: NextResponse, apiKey: string): void {
  res.cookies.set(COOKIE_NAME, encrypt(apiKey), cookieOptions(COOKIE_MAX_AGE));
}

export function clearAnthropicKeyCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", cookieOptions(0));
}
