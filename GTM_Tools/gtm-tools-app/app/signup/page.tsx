"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import SignupForm from "@/components/SignupForm";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { Brand } from "@/components/BrandLogo";
import { ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="marketing-doc min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="marketing-doc min-h-screen relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="hero-glow" />

      <header className="relative border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/">
            <Brand />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--fg-dim)] hover:text-[color:var(--fg)] transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.2} />
            Back to home
          </Link>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-9">
            <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.025em]">
              Create your account
            </h1>
            <p className="mt-2.5 text-[14.5px] text-[color:var(--fg-dim)]">
              Get started — free, in under a minute.
            </p>
          </div>

          <div className="bg-[color:var(--bg-elev)] border border-[color:var(--border-strong)] rounded-xl p-6">
            <GoogleLoginButton />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-[color:var(--border)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--fg-faint)]">
                or
              </span>
              <span className="flex-1 h-px bg-[color:var(--border)]" />
            </div>

            <SignupForm />
          </div>

          <p className="text-center mt-6 text-[13.5px] text-[color:var(--fg-dim)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[color:var(--accent)] font-medium hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

