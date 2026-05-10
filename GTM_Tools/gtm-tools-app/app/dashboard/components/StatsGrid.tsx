"use client";

import {
  Box,
  FolderOpen,
  Tag,
  Zap,
  BarChart2,
  LayoutTemplate,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StatCard from "./StatCard";
import { useDashboardStore } from "@/app/store/useDashboardStore";

interface StatsGridProps {
  animateCards: boolean;
  containersCount: number;
  workspacesCount: number;
  tagsCount: number;
  triggersCount: number;
  variablesCount: number;
  templatesCount: number;
}

export default function StatsGrid(props: StatsGridProps) {
  const router = useRouter();
  const store = useDashboardStore();

  const { animateCards } = props;

  const STATS = [
    {
      label: "Containers",
      value: props.containersCount,
      icon: <Box size={18} strokeWidth={2} />,
      accent: "#6366f1",
      action: () => {}, // ❌ disabled
      disabled: true,
    },
    {
      label: "Workspaces",
      value: props.workspacesCount,
      icon: <FolderOpen size={18} strokeWidth={2} />,
      accent: "#0ea5e9",
      action: () => store.setShowSelectionModal(true), // ✅ open popup
      disabled: false,
    },
    {
      label: "Tags",
      value: props.tagsCount,
      icon: <Tag size={18} strokeWidth={2} />,
      accent: "#10b981",
      action: () => router.push("/dashboard/tags"),
      disabled: !store.selectedWorkspaceId,
    },
    {
      label: "Triggers",
      value: props.triggersCount,
      icon: <Zap size={18} strokeWidth={2} />,
      accent: "#f59e0b",
      action: () => router.push("/dashboard/triggers"),
      disabled: !store.selectedWorkspaceId,
    },
    {
      label: "Variables",
      value: props.variablesCount,
      icon: <BarChart2 size={18} strokeWidth={2} />,
      accent: "#ef4444",
      action: () => router.push("/dashboard/variables"),
      disabled: !store.selectedWorkspaceId,
    },
    {
      label: "Templates",
      value: props.templatesCount,
      icon: <LayoutTemplate size={18} strokeWidth={2} />,
      accent: "#8b5cf6",
      action: () => router.push("/dashboard/templates"),
      disabled: !store.selectedWorkspaceId,
    },
  ];

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-14 transition-all duration-700 ${
        animateCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {STATS.map((stat) => (
        <div
          key={stat.label}
          onClick={() => {
            if (stat.disabled) return;
            stat.action();
          }}
          className={`transition ${
            stat.disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:scale-[1.02]"
          }`}
        >
          <StatCard
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            accent={stat.accent}
          />
        </div>
      ))}
    </div>
  );
}
