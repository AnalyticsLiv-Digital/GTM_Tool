"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { Brand } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-edge border-t-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-fg relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="hero-glow" />

      {/* Top bar */}
      <header className="relative border-b border-line">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={2.2} />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-9">
            <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.025em]">
              Welcome back
            </h1>
            <p className="mt-2.5 text-[14.5px] text-muted">
              Sign in to manage your Google Tag Manager workspace.
            </p>
          </div>

          <div className="bg-card border border-edge rounded-xl p-6">
            <GoogleLoginButton />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-line" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">or</span>
              <span className="flex-1 h-px bg-line" />
            </div>

            <LoginForm />
          </div>

          <p className="text-center mt-6 text-[13.5px] text-muted">
            Don&rsquo;t have an account?{" "}
            <Link
              href="/signup"
              className="text-accent font-medium hover:underline underline-offset-4"
            >
              Create one
            </Link>
          </p>

          <p className="text-center mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint leading-[1.7]">
            Secure auth via Google OAuth · Read-only by default
          </p>
        </div>
      </main>
    </div>
  );
}
