"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Trash2, X } from "lucide-react";
import type { AnthropicKeyStatus } from "@/hooks/useAnthropicKey";

export function ConnectionBadge({
  status,
  onManage,
}: {
  status: AnthropicKeyStatus;
  onManage: () => void;
}) {
  const meta =
    status === "connected"
      ? { label: "AI connected", color: "var(--success, #10b981)" }
      : status === "checking"
      ? { label: "Checking AI…", color: "var(--warn, #f59e0b)" }
      : { label: "AI not connected", color: "var(--danger, #ef4444)" };

  return (
    <button
      type="button"
      onClick={onManage}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-line text-[12.5px] text-muted hover:text-fg transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
      <span className="text-faint">· manage</span>
    </button>
  );
}

export function ApiKeyModal({
  open,
  notice,
  checking,
  hasKey,
  onConnect,
  onRemove,
  onClose,
}: {
  open: boolean;
  notice?: string | null;
  checking: boolean;
  hasKey: boolean;
  onConnect: (key: string) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const k = value.trim();
    if (!k) {
      setError("Please paste your Anthropic API key.");
      return;
    }
    if (!k.startsWith("sk-ant-")) {
      setError("That doesn't look like an Anthropic key (it should start with sk-ant-).");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await onConnect(k);
    setBusy(false);
    if (res.ok) {
      setValue("");
      onClose();
    } else {
      setError(res.error || "Could not connect with this key.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-faint hover:text-fg"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-accent" />
          <h3 className="text-[16px] font-semibold text-fg">Connect Anthropic API key</h3>
        </div>

        <p className="text-[13px] text-muted leading-relaxed mb-4">
          Your key is encrypted and stored only in this browser. It's never saved to any database or
          shared — it's used only to run your own audits.
        </p>

        {notice && (
          <div className="mb-3 px-3 py-2 rounded-md bg-(--warn)/8 border border-(--warn)/20 text-(--warn) text-[12.5px]">
            {notice}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hi px-3 py-2">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) submit();
            }}
            placeholder="sk-ant-..."
            autoComplete="off"
            className="flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-faint outline-none"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="text-faint hover:text-fg">
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && <p className="mt-2 text-[12.5px] text-(--danger)">{error}</p>}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={busy || checking}
            className="btn-primary py-2! disabled:opacity-50"
          >
            {busy || checking ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Connecting…
              </>
            ) : (
              "Connect & verify"
            )}
          </button>

          {hasKey && (
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="btn-secondary py-2!"
            >
              <Trash2 size={13} />
              Remove key
            </button>
          )}
        </div>

        <p className="mt-4 text-[11.5px] text-faint leading-relaxed">
          Get a key at console.anthropic.com → API Keys. Client-side encryption keeps it out of
          plaintext, but can't fully protect it from scripts running in your own browser — only paste
          keys on sites you trust.
        </p>
      </div>
    </div>
  );
}