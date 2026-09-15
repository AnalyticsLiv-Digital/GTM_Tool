"use client";

import { useCallback, useEffect, useState } from "react";
import { clearApiKey, hasApiKey, loadApiKey, saveApiKey } from "@/lib/apiKeyStore";

export type AnthropicKeyStatus =
  | "unknown"
  | "no_key"
  | "checking"
  | "connected"
  | "disconnected";

export function useAnthropicKey() {
  const [status, setStatus] = useState<AnthropicKeyStatus>("unknown");
  const [checking, setChecking] = useState(false);

  const verify = useCallback(async (): Promise<boolean> => {
    const key = await loadApiKey();
    if (!key) {
      setStatus("no_key");
      return false;
    }
    setChecking(true);
    setStatus("checking");
    try {
      const res = await fetch("/api/auth/healthcheck/verify", {
        method: "POST",
        headers: { "x-anthropic-key": key },
      });
      const data = await res.json();
      const ok = res.ok && data?.connected === true;
      setStatus(ok ? "connected" : "disconnected");
      return ok;
    } catch {
      setStatus("disconnected");
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (hasApiKey()) void verify();
    else setStatus("no_key");
  }, [verify]);

  // Verify BEFORE saving so a bad key is never stored.
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
          await saveApiKey(clean);
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

  const disconnect = useCallback(() => {
    clearApiKey();
    setStatus("no_key");
  }, []);

  // Mark disconnected without deleting the stored key (e.g. transient rate limit).
  const markDisconnected = useCallback(() => setStatus("disconnected"), []);

  const getKey = useCallback(() => loadApiKey(), []);

  return { status, checking, verify, connect, disconnect, markDisconnected, getKey };
}