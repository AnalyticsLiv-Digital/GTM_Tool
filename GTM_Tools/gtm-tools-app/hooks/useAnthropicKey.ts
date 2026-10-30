"use client";

import { useCallback, useEffect, useState } from "react";

export type AnthropicKeyStatus =
  | "unknown"
  | "no_key"
  | "checking"
  | "connected"
  | "disconnected";

// The key lives in an HttpOnly cookie, so this hook only ever sees its status.
export function useAnthropicKey() {
  const [status, setStatus] = useState<AnthropicKeyStatus>("unknown");
  const [checking, setChecking] = useState(false);

  const verify = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    setStatus("checking");
    try {
      const res = await fetch("/api/auth/healthcheck/verify");
      const data = await res.json();
      const ok = res.ok && data?.connected === true;
      setStatus(ok ? "connected" : data?.code === "no_key" || data?.code === "invalid_key" ? "no_key" : "disconnected");
      return ok;
    } catch {
      setStatus("disconnected");
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  // The server verifies BEFORE storing, so a bad key is never saved.
  const connect = useCallback(
    async (key: string): Promise<{ ok: boolean; error?: string }> => {
      const clean = key.trim();
      setChecking(true);
      setStatus("checking");
      try {
        const res = await fetch("/api/auth/healthcheck/verify", {
          method: "POST",
          headers: { "x-anthropic-key": clean },
        });
        const data = await res.json();
        if (res.ok && data?.connected === true) {
          setStatus("connected");
          return { ok: true };
        }
        setStatus("disconnected");
        return { ok: false, error: data?.error || "Could not connect with this API key." };
      } catch (e) {
        setStatus("disconnected");
        return { ok: false, error: e instanceof Error ? e.message : "Connection failed." };
      } finally {
        setChecking(false);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    setStatus("no_key");
    await fetch("/api/auth/healthcheck/verify", { method: "DELETE" }).catch(() => null);
  }, []);

  // The server rejected the stored key and already cleared the cookie.
  const markNoKey = useCallback(() => setStatus("no_key"), []);

  return { status, checking, verify, connect, disconnect, markNoKey };
}
