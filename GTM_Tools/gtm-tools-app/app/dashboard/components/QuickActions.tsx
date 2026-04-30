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
      //desc: "Create, edit and export tags quickly.",
      icon: <Tag className="w-5 h-5 text-blue-600" />,
      href: "/dashboard/tags",
      accent: "bg-blue-50 border-blue-200",
    },
    {
      title: "Manage Triggers",
      //desc: "Organize triggers and reduce clutter.",
      icon: <Zap className="w-5 h-5 text-orange-600" />,
      href: "/dashboard/triggers",
      accent: "bg-orange-50 border-orange-200",
    },
    {
      title: "Manage Variables",
      //desc: "Audit variables and remove unused ones.",
      icon: <Database className="w-5 h-5 text-emerald-600" />,
      href: "/dashboard/variables",
      accent: "bg-emerald-50 border-emerald-200",
    },
    {
      title: "Manage Templates",
      //desc: "Import/export custom templates easily.",
      icon: <LayoutTemplate className="w-5 h-5 text-purple-600" />,
      href: "/dashboard/templates",
      accent: "bg-purple-50 border-purple-200",
    },
    {
      title: "Run HealthCheck",
      //desc: "Scan container and generate a report.",
      icon: <BarChart2 className="w-5 h-5 text-red-600" />,
      href: "/dashboard/healthcheck",
      accent: "bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {actions.map((a) => (
        <button
          key={a.title}
          disabled={disabled}
          onClick={() => router.push(a.href)}
          className={`text-left p-6 rounded-2xl border shadow-sm transition hover:shadow-md ${
            a.accent
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center">
              {a.icon}
            </div>
            <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
          </div>

          <p className="mt-3 text-sm text-slate-600"></p>

          {!store.selectedWorkspaceId && (
            <p className="mt-3 text-xs text-red-500 font-semibold">
              Select workspace first
            </p>
          )}
        </button>
      ))}
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