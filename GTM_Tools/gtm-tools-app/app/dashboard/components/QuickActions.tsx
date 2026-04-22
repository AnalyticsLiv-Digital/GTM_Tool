"use client";

import { useRouter } from "next/navigation";
import { Box, Tag, Zap, BarChart2 } from "lucide-react";
import QuickActionCard from "./QuickActionCard";

const ACTIONS = [
  {
    title: "Containers",
    description: "View and manage all your GTM containers",
    icon: <Box size={20} strokeWidth={1.8} />,
    href: "/containers",
    accent: "#6366f1",
    bgAccent: "#6366f115",
  },
  {
    title: "Tags",
    description: "Create, edit, and publish GTM tags",
    icon: <Tag size={20} strokeWidth={1.8} />,
    href: "/tags",
    accent: "#10b981",
    bgAccent: "#10b98115",
  },
  {
    title: "Triggers",
    description: "Configure triggers and firing rules",
    icon: <Zap size={20} strokeWidth={1.8} />,
    href: "/triggers",
    accent: "#f59e0b",
    bgAccent: "#f59e0b15",
  },
  {
    title: "Variables",
    description: "Manage built-in and custom variables",
    icon: <BarChart2 size={20} strokeWidth={1.8} />,
    href: "/variables",
    accent: "#ef4444",
    bgAccent: "#ef444415",
  },
];

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="mb-14" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Jump directly to what you need
          </p>
        </div>
        <div className="h-px flex-1 bg-slate-100 mx-6" />
        <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">
          {ACTIONS.length} shortcuts
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action) => (
          <QuickActionCard
            key={action.title}
            title={action.title}
            description={action.description}
            icon={action.icon}
            accent={action.accent}
            bgAccent={action.bgAccent}
            onClick={() => router.push(action.href)}
          />
        ))}
      </div>
    </div>
  );
}
// import QuickActionCard from "./QuickActionCard";

// export default function QuickActions() {
//   return (
//     <div className="mb-12">
//       <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>

//       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
//         <QuickActionCard
//           title="Containers"
//           description="View and manage containers"
//           icon="📦"
//           onClick={() => alert("Containers feature coming soon")}
//         />
//         <QuickActionCard
//           title="Tags"
//           description="Create and edit GTM tags"
//           icon="🏷️"
//           onClick={() => alert("Tags feature coming soon")}
//         />
//         <QuickActionCard
//           title="Triggers"
//           description="Configure triggers and rules"
//           icon="⚡"
//           onClick={() => alert("Triggers feature coming soon")}
//         />
//         <QuickActionCard
//           title="Variables"
//           description="Manage built-in and custom variables"
//           icon="📊"
//           onClick={() => alert("Variables feature coming soon")}
//         />
//       </div>
//     </div>
//   );
// }