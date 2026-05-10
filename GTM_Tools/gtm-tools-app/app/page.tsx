"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Box,
  Tag,
  Zap,
  Sliders,
  ShieldCheck,
  Download,
  ArrowRight,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "@/components/BrandLogo";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  /* Scroll-reveal — adds .sr-in to elements with .sr when they enter the viewport */
  useEffect(() => {
    if (!rootRef.current) return;
    const targets = rootRef.current.querySelectorAll<HTMLElement>(".sr");
    if (!targets.length) return;
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((t) => t.classList.add("sr-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sr-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [loading, user]);

  if (loading) {
    return (
      <div className="marketing-doc min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="marketing-doc min-h-screen">
      {/* ============== NAV ============== */}
      <header className="sticky top-0 z-40 bg-[color:var(--bg)]/80 backdrop-blur-md border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <nav className="flex items-center justify-between h-14">
            <Link href="/">
              <Brand />
            </Link>

            <div className="hidden md:flex items-center gap-7 text-[13.5px] text-[color:var(--fg-dim)]">
              <a href="#features" className="hover:text-[color:var(--fg)] transition-colors">
                Features
              </a>
              <a href="#benefits" className="hover:text-[color:var(--fg)] transition-colors">
                Why GTM Tools
              </a>
              <a href="#pricing" className="hover:text-[color:var(--fg)] transition-colors">
                Pricing
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-flex px-3 py-1.5 text-[13.5px] text-[color:var(--fg-dim)] hover:text-[color:var(--fg)] transition-colors"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
                <ArrowRight size={14} strokeWidth={2.4} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden border-b border-[color:var(--border)]">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="hero-glow" />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-20 lg:pt-28 pb-16 lg:pb-24">
          <div className="max-w-3xl">
            <div className="reveal" style={{ animationDelay: "60ms" }}>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 border border-[color:var(--border-strong)] rounded-full bg-[color:var(--bg-elev)]/60 text-[12px] text-[color:var(--fg-dim)]">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-[color:var(--accent)] pulse-dot" />
                </span>
                <span className="font-mono text-[10.5px] tracking-[0.06em] text-[color:var(--accent)]">
                  NEW
                </span>
                <span className="text-[color:var(--fg-faint)]">·</span>
                <span>HealthCheck audits are live</span>
              </span>
            </div>

            <h1
              className="reveal mt-7 text-[clamp(44px,7vw,82px)] font-semibold leading-[1.02] tracking-[-0.028em]"
              style={{ animationDelay: "150ms" }}
            >
              Manage your tag
              <br />
              manager,{" "}
              <span className="text-[color:var(--accent)] accent-glow-text">smarter</span>.
            </h1>

            <p
              className="reveal mt-7 max-w-[58ch] text-[18px] leading-[1.6] text-[color:var(--fg-dim)]"
              style={{ animationDelay: "260ms" }}
            >
              Inspect, audit, and export every tag, trigger, variable, and template in your Google Tag
              Manager stack. Built for marketing teams that want to ship with confidence.
            </p>

            <div
              className="reveal mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "360ms" }}
            >
              <Link href="/signup" className="btn-primary !px-5 !py-2.5">
                Get started — free
                <ArrowRight size={15} strokeWidth={2.4} />
              </Link>
              <Link href="/login" className="btn-secondary !px-5 !py-2.5">
                Sign in
              </Link>
              <span className="font-mono text-[11px] text-[color:var(--fg-faint)] pl-1">
                No card · OAuth read-only
              </span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="reveal mt-16 lg:mt-20" style={{ animationDelay: "480ms" }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ============== FEATURES ============== */}
      <section id="features" className="border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
          <div className="max-w-2xl mb-12 sr">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[color:var(--accent)] mb-4">
              Features
            </p>
            <h2 className="text-[clamp(32px,4.2vw,48px)] font-semibold leading-[1.05] tracking-[-0.025em]">
              Everything you need to manage GTM at scale.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[color:var(--fg-dim)]">
              A complete reading and audit surface for your tag stack — from the smallest variable to your
              biggest container.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--border)] border border-[color:var(--border)] rounded-xl overflow-hidden sr sr-delay-1">
            <Feature
              icon={<Box size={18} strokeWidth={1.6} />}
              title="Container management"
              body="Browse accounts, containers, and workspaces. Switch context without losing your place."
            />
            <Feature
              icon={<Tag size={18} strokeWidth={1.6} />}
              title="Tag inspector"
              body="Read every tag — type, firing trigger, status, last edit. Sort and filter at will."
            />
            <Feature
              icon={<Zap size={18} strokeWidth={1.6} />}
              title="Trigger inventory"
              body="Pageview, click, custom event, form. See the full filter chain on every trigger."
            />
            <Feature
              icon={<Sliders size={18} strokeWidth={1.6} />}
              title="Variable control"
              body="Built-in and user-defined, side by side. Lookup tables and data-layer keys made legible."
            />
            <Feature
              icon={<ShieldCheck size={18} strokeWidth={1.6} />}
              title="HealthCheck audit"
              body="Run a scored audit of any workspace. Catch issues before they ship to production."
            />
            <Feature
              icon={<Download size={18} strokeWidth={1.6} />}
              title="One-click export"
              body="Print-ready PDF for any tag, trigger, variable, or template. Backup and sharing in seconds."
            />
          </div>
        </div>
      </section>

      {/* ============== BENEFITS ============== */}
      <section id="benefits" className="border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-12">
            <div className="lg:col-span-5 sr">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[color:var(--accent)] mb-4">
                Why GTM Tools
              </p>
              <h2 className="text-[clamp(32px,4.2vw,48px)] font-semibold leading-[1.05] tracking-[-0.025em]">
                Built for teams who care about measurement.
              </h2>
              <p className="mt-5 text-[16px] leading-[1.65] text-[color:var(--fg-dim)]">
                A faster way to understand what&rsquo;s actually running in your container — and to keep it
                healthy as your stack grows.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-9 sr sr-delay-1">
              <Benefit
                title="Save time"
                body="Manage all your GTM assets in one place. No more switching between accounts and tabs."
              />
              <Benefit
                title="Reduce errors"
                body="Run a HealthCheck before publishing. Catch misconfigurations and orphans early."
              />
              <Benefit
                title="Team collaboration"
                body="Bring your team into the same view. Less tribal knowledge, more shared understanding."
              />
              <Benefit
                title="Audit trail"
                body="Export a print-ready PDF for any change. Hand it to your client, your auditor, or future you."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section id="pricing" className="relative overflow-hidden border-b border-[color:var(--border)]">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="hero-glow" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center sr">
          <h2 className="text-[clamp(36px,5vw,64px)] font-semibold leading-[1.05] tracking-[-0.025em]">
            Ready to ship tags
            <br />
            with <span className="text-[color:var(--accent)] accent-glow-text">confidence</span>?
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-[17px] leading-[1.6] text-[color:var(--fg-dim)]">
            Free to begin. Connect a Google account in under a minute and have a printable container audit
            before your next stand-up.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary !px-5 !py-2.5">
              Create free account
              <ArrowRight size={15} strokeWidth={2.4} />
            </Link>
            <Link href="/login" className="btn-secondary !px-5 !py-2.5">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
            <div className="col-span-2">
              <Link href="/">
                <Brand />
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-[1.6] text-[color:var(--fg-dim)]">
                A measurement tool by AnalyticsLiv. Built for marketing teams who care about what&rsquo;s
                running in their containers.
              </p>
            </div>

            <FooterCol
              title="Product"
              items={[
                ["Features", "#features"],
                ["Why GTM Tools", "#benefits"],
                ["Pricing", "#pricing"],
              ]}
            />
            <FooterCol
              title="Company"
              items={[
                ["AnalyticsLiv", "https://analyticsliv.com"],
                ["About", "https://analyticsliv.com/about-us"],
                ["Contact", "https://analyticsliv.com#contact"],
              ]}
            />
            <FooterCol
              title="Legal"
              items={[
                ["Privacy", "/privacy"],
                ["Terms", "/terms"],
                ["Security", "/security"],
              ]}
            />
          </div>

          <div className="mt-12 pt-6 border-t border-[color:var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[color:var(--fg-faint)]">
            <span>© {new Date().getFullYear()} GTM Tools · An AnalyticsLiv product.</span>
            <span className="font-mono">v0.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────── helpers */

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="feat-card bg-[color:var(--bg)] p-7 lg:p-8 group">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] mb-5 text-[color:var(--fg-dim)] group-hover:border-[color:var(--accent)]/40 group-hover:text-[color:var(--accent)] group-hover:bg-[color:var(--accent-dim)] transition-colors">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold tracking-[-0.01em] mb-2">{title}</h3>
      <p className="text-[14px] leading-[1.6] text-[color:var(--fg-dim)]">{body}</p>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--accent-dim)] border border-[color:var(--accent)]/30 text-[color:var(--accent)]">
          <Check size={11} strokeWidth={3} />
        </span>
        <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
      </div>
      <p className="text-[14.5px] leading-[1.6] text-[color:var(--fg-dim)] ml-[30px]">{body}</p>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-[color:var(--fg-faint)] mb-4">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {items.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              className="text-[13.5px] text-[color:var(--fg-dim)] hover:text-[color:var(--fg)] transition-colors inline-flex items-center gap-1"
            >
              {label}
              {href.startsWith("http") && <ArrowUpRight size={11} strokeWidth={2} />}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg-elev)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(93,255,180,0.04)] overflow-hidden">
      {/* glow under */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-2/3 h-32 bg-[color:var(--accent)]/8 blur-3xl pointer-events-none" />

      {/* Window chrome */}
      <div className="relative flex items-center gap-2 px-4 py-2.5 border-b border-[color:var(--border)] bg-[color:var(--bg-elev-2)]">
        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--border-strong)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--border-strong)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--border-strong)]" />
        <span className="ml-3 font-mono text-[11px] text-[color:var(--fg-faint)]">
          gtm-tools.app/dashboard
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] text-[color:var(--fg-faint)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] pulse-dot" />
          Live
        </span>
      </div>

      <div className="relative grid grid-cols-12 gap-px bg-[color:var(--border)]">
        {/* Sidebar */}
        <aside className="col-span-3 bg-[color:var(--bg-elev)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] mb-2">
            Workspace
          </div>
          <div className="text-[13px] font-medium mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)]" />
            prod-www
          </div>
          <ul className="space-y-0.5 text-[12.5px]">
            {[
              ["Tags", true],
              ["Triggers", false],
              ["Variables", false],
              ["Templates", false],
              ["HealthCheck", false],
            ].map(([s, active]) => (
              <li
                key={s as string}
                className={`px-2.5 py-1.5 rounded-md flex items-center justify-between ${
                  active
                    ? "bg-[color:var(--accent-dim)] text-[color:var(--accent)] border border-[color:var(--accent)]/20"
                    : "text-[color:var(--fg-dim)] hover:bg-[color:var(--bg-elev-2)]"
                }`}
              >
                <span>{s as string}</span>
                {active && <span className="font-mono text-[10px] opacity-60">24</span>}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main */}
        <main className="col-span-9 bg-[color:var(--bg-elev)] p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] mb-1">
                Tags · 24
              </div>
              <h3 className="text-[18px] font-semibold tracking-[-0.01em]">
                All tags in this workspace
              </h3>
            </div>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">Last sync · just now</span>
          </div>

          <div className="rounded-lg border border-[color:var(--border)] overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-[color:var(--bg-elev-2)] font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">
              <span className="col-span-5">Name</span>
              <span className="col-span-3">Type</span>
              <span className="col-span-2">Trigger</span>
              <span className="col-span-2 text-right">Status</span>
            </div>
            {[
              ["GA4 — pageview", "GA4 Configuration", "All Pages", "Active"],
              ["Ads — purchase", "Google Ads Conversion", "purchase", "Active"],
              ["Meta — view content", "Custom HTML", "view_item", "Paused"],
              ["Floodlight — lead", "Floodlight Counter", "lead_form", "Active"],
              ["Hotjar tracker", "Custom HTML", "All Pages", "Active"],
            ].map(([n, t, tr, s]) => (
              <div
                key={n}
                className="grid grid-cols-12 gap-3 px-4 py-2.5 border-t border-[color:var(--border)] text-[12.5px]"
              >
                <span className="col-span-5 font-medium truncate">{n}</span>
                <span className="col-span-3 text-[color:var(--fg-dim)] truncate">{t}</span>
                <span className="col-span-2 font-mono text-[11px] text-[color:var(--fg-faint)] truncate">
                  {tr}
                </span>
                <span className="col-span-2 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono ${
                      s === "Active"
                        ? "bg-[color:var(--accent-dim)] text-[color:var(--accent)] border border-[color:var(--accent)]/20"
                        : "bg-[color:var(--bg-elev-2)] text-[color:var(--fg-faint)] border border-[color:var(--border)]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        s === "Active" ? "bg-[color:var(--accent)]" : "bg-[color:var(--fg-faint)]"
                      }`}
                    />
                    {s}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
