"use client";

/**
 * Bring-your-own-key store.
 * Key is AES-GCM encrypted (Web Crypto) and kept ONLY in localStorage.
 * Never sent to a database. Sent to our own backend only as a per-request
 * header, used transiently, and discarded.
 */

const STORAGE_KEY = "gtm.anthropic.key.v1";

// Obfuscation passphrase. This is NOT real secrecy (it ships in the bundle),
// it just keeps the key out of plaintext in localStorage.
const PASSPHRASE = "gtm-healthcheck::byok::v1";
const SALT = "gtm-healthcheck-salt";

/* ---------- base64 helpers ---------- */

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/*
 * TS 5.7+ made Uint8Array generic (Uint8Array<ArrayBufferLike>), but the
 * Web Crypto lib types demand an ArrayBuffer-backed BufferSource. Runtime is
 * always fine, so we bridge the type gap in one place.
 */
function asBufferSource(view: Uint8Array): BufferSource {
  return view as unknown as BufferSource;
}

/* ---------- guards ---------- */

function getCrypto(): Crypto {
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    throw new Error(
      "Web Crypto is not available in this environment."
    );
  }
  return window.crypto;
}

/* ---------- key derivation ---------- */

async function deriveKey(): Promise<CryptoKey> {
  const c = getCrypto();
  const enc = new TextEncoder();

  const base = await c.subtle.importKey(
    "raw",
    asBufferSource(enc.encode(PASSPHRASE)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return c.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBufferSource(enc.encode(SALT)),
      iterations: 120_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/* ---------- public API ---------- */

export async function saveApiKey(apiKey: string): Promise<void> {
  const c = getCrypto();
  const enc = new TextEncoder();
  const key = await deriveKey();

  const iv = c.getRandomValues(new Uint8Array(12));

  const ctBuffer = await c.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    key,
    asBufferSource(enc.encode(apiKey.trim()))
  );

  const payload = JSON.stringify({
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ctBuffer)),
  });

  localStorage.setItem(STORAGE_KEY, payload);
}

export async function loadApiKey(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { iv?: string; ct?: string };
    if (!parsed.iv || !parsed.ct) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const c = getCrypto();
    const key = await deriveKey();

    const iv = b64ToBytes(parsed.iv);
    const ct = b64ToBytes(parsed.ct);

    const ptBuffer = await c.subtle.decrypt(
      { name: "AES-GCM", iv: asBufferSource(iv) },
      key,
      asBufferSource(ct)
    );

    return new TextDecoder().decode(ptBuffer);
  } catch {
    // Corrupt / tampered — drop it so the user can re-enter.
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function hasApiKey(): boolean {
  return (
    typeof window !== "undefined" &&
    !!localStorage.getItem(STORAGE_KEY)
  );
}