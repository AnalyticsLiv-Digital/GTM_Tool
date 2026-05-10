"use client";

import { Sparkles } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WelcomeSection({ user }: any) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={13} className="text-accent" strokeWidth={2.5} />
        <span className="font-mono text-[10.5px] tracking-[0.15em] text-accent uppercase">
          GTM Control Center
        </span>
      </div>

      <div className="max-w-3xl">
        <h1 className="text-[clamp(32px,4.4vw,48px)] font-semibold text-fg leading-[1.05] tracking-[-0.025em]">
          Welcome back,{" "}
          <span className="relative inline-block">
            <span className="relative z-10">{user?.name || "User"}</span>
            <span
              className="absolute bottom-1 left-0 w-full h-2.5 bg-accent-soft z-0 rounded-sm"
              aria-hidden
            />
          </span>
        </h1>

        <p className="mt-4 text-[15.5px] text-muted max-w-xl leading-relaxed">
          Manage your GTM accounts, containers, workspaces, tags, triggers, and
          variables — all from one calm interface.
        </p>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <div className="h-px w-10 bg-accent" />
        <div className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
