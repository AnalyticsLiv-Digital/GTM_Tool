
"use client";

const TOKEN_STORAGE_KEY = "gtm_claude_token_encrypted";
const SESSION_KEY_STORAGE_KEY = "gtm_claude_session_key";

function toBase64(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = window.atob(value);

  return Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

async function getEncryptionKey(
  createIfMissing: boolean
): Promise<CryptoKey | null> {
  let encodedKey = sessionStorage.getItem(
    SESSION_KEY_STORAGE_KEY
  );

  if (!encodedKey && createIfMissing) {
    const rawKey = crypto.getRandomValues(
      new Uint8Array(32)
    );

    encodedKey = toBase64(rawKey);

    sessionStorage.setItem(
      SESSION_KEY_STORAGE_KEY,
      encodedKey
    );
  }

  if (!encodedKey) return null;

  const rawKey = fromBase64(encodedKey);

  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveClaudeToken(
  token: string
): Promise<void> {
  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new Error("Please enter your Anthropic API key.");
  }

  const key = await getEncryptionKey(true);

  if (!key) {
    throw new Error("Could not initialize token encryption.");
  }

  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(new TextEncoder().encode(cleanToken))
  );

  const storedValue = JSON.stringify({
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  });

  localStorage.setItem(
    TOKEN_STORAGE_KEY,
    storedValue
  );
}

export async function getClaudeToken(): Promise<
  string | null
> {
  const storedValue = localStorage.getItem(
    TOKEN_STORAGE_KEY
  );

  if (!storedValue) return null;

  const key = await getEncryptionKey(false);

  // The browser session ended, so the temporary key is gone.
  if (!key) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }

  try {
    const stored = JSON.parse(storedValue) as {
      iv: string;
      data: string;
    };

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(fromBase64(stored.iv)),
      },
      key,
      toArrayBuffer(fromBase64(stored.data))
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    clearClaudeToken();
    return null;
  }
}

export function clearClaudeToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY_STORAGE_KEY);
}

export function hasSavedClaudeToken(): boolean {
  return Boolean(
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
}
