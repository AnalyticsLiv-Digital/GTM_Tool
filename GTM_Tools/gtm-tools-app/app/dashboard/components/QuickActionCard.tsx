"use client";

import { ArrowRight } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: string;
}

export default function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  accent = "var(--accent)",
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left bg-card border border-line rounded-xl p-5 hover:border-edge hover:bg-card-hi transition-all duration-300 overflow-hidden"
    >
      {/* Left accent bar — appears on hover */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-fg mb-0.5">{title}</h3>
          <p className="text-[12px] text-muted leading-relaxed">{description}</p>
        </div>
        <div
          className="mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0"
          style={{ background: accent, color: "var(--accent-on)" }}
        >
          <ArrowRight size={13} strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}
