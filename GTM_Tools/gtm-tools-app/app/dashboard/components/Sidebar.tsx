"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tag,
  Zap,
  Database,
  LayoutTemplate,
  BarChart2,
  ChevronRight,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "var(--accent)" },
  { label: "Tags", href: "/dashboard/tags", icon: Tag, accent: "#3b82f6" },
  { label: "Triggers", href: "/dashboard/triggers", icon: Zap, accent: "#f59e0b" },
  { label: "Variables", href: "/dashboard/variables", icon: Database, accent: "#10b981" },
  { label: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, accent: "#8b5cf6" },
  { label: "HealthCheck", href: "/dashboard/healthcheck", icon: BarChart2, accent: "#ef4444" },
];

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col bg-card-hi border-r border-line overflow-hidden relative">
      <div className="relative z-10 flex flex-col h-full">
        {/* ── Section label ── */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            Navigation
          </p>
        </div>

        {/* ── Nav items ── */}
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon, accent }) => {
            const active = isActive(href);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                  active
                    ? "bg-card text-fg"
                    : "text-muted hover:bg-card hover:text-fg"
                }`}
                style={
                  active
                    ? { boxShadow: `inset 2px 0 0 0 ${accent}` }
                    : undefined
                }
              >
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors duration-200"
                  style={{
                    background: active ? `${accent}1a` : "transparent",
                    color: active ? accent : "currentColor",
                  }}
                >
                  <Icon size={14} strokeWidth={2} />
                </span>

                <span className="text-[13px] font-medium flex-1 text-left">{label}</span>

                {active && (
                  <ChevronRight
                    size={13}
                    strokeWidth={2.5}
                    style={{ color: accent, opacity: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Logout (bottom) ── */}
        <div className="px-3 pb-5 border-t border-line pt-3 mt-3">
          <button
            onClick={onLogout}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:bg-card hover:text-(--danger) transition-colors duration-200"
          >
            <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 group-hover:bg-(--danger)/10 transition-colors">
              <LogOut size={13} strokeWidth={2} />
            </span>
            <span className="text-[13px] font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}