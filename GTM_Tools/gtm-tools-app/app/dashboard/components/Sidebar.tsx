"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import WorkspaceModal from "./WorkspaceModal";
import {
  LayoutDashboard,
  Tag,
  Zap,
  BarChart2,
  Layers,
  FolderKanban,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    accent: "#a78bfa",
  },
  {
    label: "Tags",
    href: "/dashboard/tags",
    icon: Tag,
    accent: "#34d399",
  },
  {
    label: "Triggers",
    href: "/dashboard/triggers",
    icon: Zap,
    accent: "#fbbf24",
  },
  {
    label: "Variables",
    href: "/dashboard/variables",
    icon: BarChart2,
    accent: "#f87171",
  },
  {
    label: "Templates",
    href: "/dashboard/templates",
    icon: BarChart2,
    accent: "#f87171",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/*
        ── THE FIX ──
        Do NOT use sticky/fixed on the sidebar itself.
        Instead, in your layout.tsx:
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">...</main>
          </div>
        The sidebar gets h-full from the h-screen parent.
        Only the <main> scrolls. Sidebar never moves.
      */}
      <aside
        className="w-55 shrink-0 h-full flex flex-col bg-[#0f1117] border-r border-white/6 overflow-hidden relative"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {/* Noise texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "180px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full">

          {/* ── Logo / Brand ── */}
          <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-white/6">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
              <Layers size={15} className="text-[#0f1117]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white text-sm font-bold tracking-tight leading-none">
                GTM Tools
              </p>
              <p className="text-white/30 text-[10px] mt-0.5 font-medium uppercase tracking-widest">
                Dashboard
              </p>
            </div>
          </div>

          {/* ── Nav items ── */}
          <div className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-1">
            <p className="text-white/20 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 mb-3">
              Navigation
            </p>

            {NAV_ITEMS.map(({ label, href, icon: Icon, accent }) => {
              const active = isActive(href);
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                  style={{ background: active ? `${accent}18` : "transparent" }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-0.75 rounded-full"
                      style={{ background: accent }}
                    />
                  )}

                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      background: active ? `${accent}25` : "rgba(255,255,255,0.05)",
                      color: active ? accent : "rgba(255,255,255,0.35)",
                    }}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </span>

                  <span
                    className="text-sm font-medium flex-1 text-left transition-colors duration-200"
                    style={{ color: active ? "#fff" : "rgba(255,255,255,0.45)" }}
                  >
                    {label}
                  </span>

                  {active && (
                    <ChevronRight
                      size={13}
                      strokeWidth={2.5}
                      style={{ color: accent, opacity: 0.7 }}
                    />
                  )}
                </button>
              );
            })}

            <div className="my-4 border-t border-white/6" />

            <p className="text-white/20 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 mb-3">
              Workspace
            </p>

            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/5"
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/5 text-white/35 group-hover:bg-sky-400/20 group-hover:text-sky-400 transition-all duration-200">
                <FolderKanban size={14} strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-white/45 group-hover:text-white/80 flex-1 text-left transition-colors duration-200">
                Workspaces
              </span>
            </button>
          </div>

          {/* ── Bottom utility links ── */}
          <div className="px-3 pb-5 flex flex-col gap-1 border-t border-white/6 pt-4">
            <button className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/5 text-white/25 group-hover:text-white/60 transition-all duration-200">
                <Settings size={13} strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-white/30 group-hover:text-white/60 transition-colors duration-200">
                Settings
              </span>
            </button>

            <button className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-all duration-200">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/5 text-white/25 group-hover:text-red-400 transition-all duration-200">
                <LogOut size={13} strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-white/30 group-hover:text-red-400 transition-colors duration-200">
                Sign out
              </span>
            </button>
          </div>

        </div>
      </aside>

      <WorkspaceModal
        show={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
      />
    </>
  );
}
// "use client";

// import { useState } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import WorkspaceModal from "./WorkspaceModal";

// export default function Sidebar() {
//   const router = useRouter();
//   const pathname = usePathname();

//   const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

//   const isActive = (path: string) => pathname === path;

//   return (
//     <>
//       <aside className="w-64 bg-white border-r min-h-screen p-4">
//         <h2 className="text-sm font-bold text-gray-600 mb-4">MENU</h2>

//         {/* DASHBOARD */}
//         <button
//           onClick={() => router.push("/dashboard")}
//           className={`w-full text-left px-4 py-2 rounded-lg font-semibold text-sm ${
//             isActive("/dashboard")
//               ? "bg-purple-100 text-purple-700"
//               : "hover:bg-gray-100 text-gray-700"
//           }`}
//         >
//           Dashboard
//         </button>

//         {/* TAGS */}
//         <button
//           onClick={() => router.push("/dashboard/tags")}
//           className={`w-full text-left px-4 py-2 rounded-lg font-semibold text-sm ${
//             isActive("/dashboard/tags")
//               ? "bg-purple-100 text-purple-700"
//               : "hover:bg-gray-100 text-gray-700"
//           }`}
//         >
//           Tags
//         </button>

//         {/* TRIGGERS */}
//         <button
//           onClick={() => router.push("/dashboard/triggers")}
//           className={`w-full text-left px-4 py-2 rounded-lg font-semibold text-sm ${
//             isActive("/dashboard/triggers")
//               ? "bg-purple-100 text-purple-700"
//               : "hover:bg-gray-100 text-gray-700"
//           }`}
//         >
//           Triggers
//         </button>

//         {/* VARIABLES */}
//         <button
//           onClick={() => router.push("/dashboard/variables")}
//           className={`w-full text-left px-4 py-2 rounded-lg font-semibold text-sm ${
//             isActive("/dashboard/variables")
//               ? "bg-purple-100 text-purple-700"
//               : "hover:bg-gray-100 text-gray-700"
//           }`}
//         >
//           Variables
//         </button>

//         {/* WORKSPACES MODAL */}
//         <button
//           onClick={() => setShowWorkspaceModal(true)}
//           className="w-full text-left px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 text-gray-700 mt-6"
//         >
//           Workspaces
//         </button>
//       </aside>

//       <WorkspaceModal
//         show={showWorkspaceModal}
//         onClose={() => setShowWorkspaceModal(false)}
//       />
//     </>
//   );
// }


