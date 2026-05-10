"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const { register, error: authError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordMatch = password && confirmPassword ? password === confirmPassword : true;
  const passwordLength = password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : authError || "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        id="name"
        label="Full name"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Jane Doe"
        disabled={loading}
        autoComplete="name"
      />
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

      <div>
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          disabled={loading}
          autoComplete="new-password"
          rightSlot={
            password && (
              <span
                className={`text-[11px] font-mono ${
                  passwordLength ? "text-accent" : "text-faint"
                }`}
              >
                {passwordLength ? "✓ ok" : `${password.length}/6`}
              </span>
            )
          }
        />
        <div className="mt-1.5 h-px bg-line relative overflow-hidden">
          <span
            className={`absolute inset-y-0 left-0 transition-all duration-300 ${
              passwordLength ? "bg-accent" : "bg-faint"
            }`}
            style={{ width: `${Math.min((password.length / 6) * 100, 100)}%` }}
          />
        </div>
      </div>

      <Field
        id="confirmPassword"
        label="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="••••••••"
        disabled={loading}
        autoComplete="new-password"
        rightSlot={
          confirmPassword && (
            <span
              className={`text-[11px] font-mono ${
                passwordMatch ? "text-accent" : "text-[color:var(--danger)]"
              }`}
            >
              {passwordMatch ? "✓ match" : "✗ mismatch"}
            </span>
          )
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
            Creating account…
          </span>
        ) : (
          <>
            Create account
            <ArrowRight size={14} strokeWidth={2.4} />
          </>
        )}
      </button>

      <p className="text-[11.5px] text-faint text-center leading-[1.6]">
        By creating an account, you agree to our{" "}
        <a href="#" className="text-muted hover:text-accent">terms</a> and{" "}
        <a href="#" className="text-muted hover:text-accent">privacy policy</a>.
      </p>
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
