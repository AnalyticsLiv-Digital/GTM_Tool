"use client";

import { useRouter } from "next/navigation";
import { Box, FolderOpen, Tag, Zap, BarChart2 } from "lucide-react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { JSX } from "react/jsx-runtime";

interface StatsGridProps {
  animateCards: boolean;
  containersCount: number;
  workspacesCount: number;
  tagsCount: number;
  triggersCount: number;
  variablesCount: number;
}

export default function StatsGrid(props: StatsGridProps) {
  const router = useRouter();
  const store = useDashboardStore();

  const STATS = [
    {
      label: "Containers",
      value: props.containersCount,
      icon: <Box size={18} strokeWidth={2.3} />,
      accent: "#6366f1",
      href: "/dashboard/containers",
      action: "route",
    },
    {
      label: "Workspaces",
      value: props.workspacesCount,
      icon: <FolderOpen size={18} strokeWidth={2.3} />,
      accent: "#0ea5e9",
      action: "popup",
    },
    {
      label: "Tags",
      value: props.tagsCount,
      icon: <Tag size={18} strokeWidth={2.3} />,
      accent: "#10b981",
      href: "/dashboard/tags",
      action: "route",
    },
    {
      label: "Triggers",
      value: props.triggersCount,
      icon: <Zap size={18} strokeWidth={2.3} />,
      accent: "#f59e0b",
      href: "/dashboard/triggers",
      action: "route",
    },
    {
      label: "Variables",
      value: props.variablesCount,
      icon: <BarChart2 size={18} strokeWidth={2.3} />,
      accent: "#ef4444",
      href: "/dashboard/variables",
      action: "route",
    },
  ];

  function handleCardClick(stat: { label: string; value: number; icon: JSX.Element; accent: string; href: string; action: string; } | { label: string; value: number; icon: JSX.Element; accent: string; action: string; href?: undefined; }) {
    if (stat.action === "popup") {
      store.setShowSelectionModal(true); // ✅ opens navbar popup globally
      return;
    }

    if (stat.href) {
      router.push(stat.href);
    }
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-14 transition-all duration-700 ${
        props.animateCards
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      }`}
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {STATS.map((stat) => (
        <button
          key={stat.label}
          onClick={() => handleCardClick(stat)}
          className="group text-left relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 p-5 cursor-pointer"
        >
          {/* Accent Glow */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition"
            style={{ background: stat.accent }}
          />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                background: `${stat.accent}20`,
                color: stat.accent,
              }}
            >
              {stat.icon}
            </div>

            <span
              className="text-[11px] font-semibold px-3 py-1 rounded-full border"
              style={{
                borderColor: `${stat.accent}35`,
                background: `${stat.accent}12`,
                color: stat.accent,
              }}
            >
              View
            </span>
          </div>

          {/* Label */}
          <p className="mt-4 text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition">
            {stat.label}
          </p>

          {/* Value */}
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
            {stat.value}
          </p>

          {/* Bottom line */}
          <p className="mt-2 text-xs text-slate-500 group-hover:text-slate-600 transition">
            Click to open {stat.label.toLowerCase()}
          </p>
        </button>
      ))}
    </div>
  );
}


// "use client";

// import { Box, FolderOpen, Tag, Zap, BarChart2 } from "lucide-react";
// import StatCard from "./StatCard";

// interface StatsGridProps {
//   animateCards: boolean;
//   containersCount: number;
//   workspacesCount: number;
//   tagsCount: number;
//   triggersCount: number;
//   variablesCount: number;
// }

// const STATS = (props: StatsGridProps) => [
//   {
//     label: "Containers",
//     value: props.containersCount,
//     icon: <Box size={18} strokeWidth={2} />,
//     accent: "#6366f1",
//   },
//   {
//     label: "Workspaces",
//     value: props.workspacesCount,
//     icon: <FolderOpen size={18} strokeWidth={2} />,
//     accent: "#0ea5e9",
//   },
//   {
//     label: "Tags",
//     value: props.tagsCount,
//     icon: <Tag size={18} strokeWidth={2} />,
//     accent: "#10b981",
//   },
//   {
//     label: "Triggers",
//     value: props.triggersCount,
//     icon: <Zap size={18} strokeWidth={2} />,
//     accent: "#f59e0b",
//   },
//   {
//     label: "Variables",
//     value: props.variablesCount,
//     icon: <BarChart2 size={18} strokeWidth={2} />,
//     accent: "#ef4444",
//   },
// ];

// export default function StatsGrid(props: StatsGridProps) {
//   const { animateCards } = props;

//   return (
//     <div
//       className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-14 transition-all duration-700 ${
//         animateCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
//       }`}
//     >
//       {STATS(props).map((stat) => (
//         <StatCard
//           key={stat.label}
//           label={stat.label}
//           value={stat.value}
//           icon={stat.icon}
//           accent={stat.accent}
//         />
//       ))}
//     </div>
//   );
// }
