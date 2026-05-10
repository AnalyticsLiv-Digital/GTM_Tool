"use client";

import { useRouter } from "next/navigation";
import { Tag, Zap, Database, LayoutTemplate, BarChart2 } from "lucide-react";
import { useDashboardStore } from "@/app/store/useDashboardStore";

export default function QuickActions() {
  const router = useRouter();
  const store = useDashboardStore();

  const disabled = !store.selectedWorkspaceId;

  const actions = [
    {
      title: "Manage Tags",
      icon: Tag,
      href: "/dashboard/tags",
      accent: "#3b82f6",
    },
    {
      title: "Manage Triggers",
      icon: Zap,
      href: "/dashboard/triggers",
      accent: "#f59e0b",
    },
    {
      title: "Manage Variables",
      icon: Database,
      href: "/dashboard/variables",
      accent: "#10b981",
    },
    {
      title: "Manage Templates",
      icon: LayoutTemplate,
      href: "/dashboard/templates",
      accent: "#8b5cf6",
    },
    {
      title: "Run HealthCheck",
      icon: BarChart2,
      href: "/dashboard/healthcheck",
      accent: "#ef4444",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map(({ title, icon: Icon, href, accent }) => (
        <button
          key={title}
          disabled={disabled}
          onClick={() => router.push(href)}
          className={`group relative text-left p-5 rounded-xl border border-line bg-card transition-all overflow-hidden ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-edge hover:bg-card-hi"
          }`}
        >
          <div
            className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: accent }}
          />
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                color: accent,
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <h3 className="font-semibold text-fg text-[14px]">{title}</h3>
          </div>

          {disabled && (
            <p className="mt-3 text-[11px] text-[color:var(--danger)] font-medium">
              Select workspace first
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
