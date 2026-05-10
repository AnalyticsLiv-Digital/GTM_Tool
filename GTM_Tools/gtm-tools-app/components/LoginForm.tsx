"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";

export default function LoginForm() {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : authError || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        disabled={loading}
        autoComplete="email"
      />

      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        disabled={loading}
        autoComplete="current-password"
        rightSlot={
          <a href="#" className="text-[11px] text-faint hover:text-accent">
            Forgot?
          </a>
        }
      />

      {error && (
        <div className="border-l-2 border-[color:var(--danger)] pl-3 py-1">
          <p className="text-[12.5px] text-[color:var(--danger)]">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center !py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            Signing in…
          </span>
        ) : (
          <>
            Sign in
            <ArrowRight size={14} strokeWidth={2.4} />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  rightSlot,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={id} className="text-[12.5px] font-medium text-fg">
          {label}
        </label>
        {rightSlot}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        required
        className="w-full bg-page-soft"
      />
    </div>
  );
}
