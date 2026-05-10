"use client";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}

export default function StatCard({ label, value, icon, accent = "var(--accent)" }: StatCardProps) {
  return (
    <div className="relative bg-card border border-line rounded-xl p-5 flex flex-col gap-4 transition-all duration-300 group overflow-hidden hover:border-edge hover:bg-card-hi">
      {/* Top accent strip on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />

      {/* Icon pill */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </div>

      {/* Value */}
      <div>
        <p className="text-[28px] font-semibold text-fg leading-none tracking-[-0.02em]">
          {value}
        </p>
        <p className="text-[10px] text-faint font-medium mt-2 uppercase tracking-[0.15em]">
          {label}
        </p>
      </div>
    </div>
  );
}
