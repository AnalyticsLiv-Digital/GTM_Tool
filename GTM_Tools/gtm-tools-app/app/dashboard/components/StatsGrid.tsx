"use client";

import { Box, FolderOpen, Tag, Zap, BarChart2 } from "lucide-react";
import StatCard from "./StatCard";

interface StatsGridProps {
  animateCards: boolean;
  containersCount: number;
  workspacesCount: number;
  tagsCount: number;
  triggersCount: number;
  variablesCount: number;
}

const STATS = (props: StatsGridProps) => [
  {
    label: "Containers",
    value: props.containersCount,
    icon: <Box size={18} strokeWidth={2} />,
    accent: "#6366f1",
  },
  {
    label: "Workspaces",
    value: props.workspacesCount,
    icon: <FolderOpen size={18} strokeWidth={2} />,
    accent: "#0ea5e9",
  },
  {
    label: "Tags",
    value: props.tagsCount,
    icon: <Tag size={18} strokeWidth={2} />,
    accent: "#10b981",
  },
  {
    label: "Triggers",
    value: props.triggersCount,
    icon: <Zap size={18} strokeWidth={2} />,
    accent: "#f59e0b",
  },
  {
    label: "Variables",
    value: props.variablesCount,
    icon: <BarChart2 size={18} strokeWidth={2} />,
    accent: "#ef4444",
  },
];

export default function StatsGrid(props: StatsGridProps) {
  const { animateCards } = props;

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-14 transition-all duration-700 ${
        animateCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {STATS(props).map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          accent={stat.accent}
        />
      ))}
    </div>
  );
}

// import StatCard from "./StatCard";

// export default function StatsGrid({
//   animateCards,
//   containersCount,
//   workspacesCount,
//   tagsCount,
//   triggersCount,
//   variablesCount,
// }: any) {
//   return (
//     <div
//       className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-12 transition-all duration-700 ${
//         animateCards
//           ? "opacity-100 translate-y-0"
//           : "opacity-0 translate-y-4"
//       }`}
//     >
//       <StatCard label="Containers" value={containersCount} icon="📦" />
//       <StatCard label="Workspaces" value={workspacesCount} icon="🗂️" />
//       <StatCard label="Tags" value={tagsCount} icon="🏷️" />
//       <StatCard label="Triggers" value={triggersCount} icon="⚡" />
//       <StatCard label="Variables" value={variablesCount} icon="📊" />
//     </div>
//   );
// }