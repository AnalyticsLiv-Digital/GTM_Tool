"use client";

import { Sparkles } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WelcomeSection({ user }: any) {
  return (
    <div className="mb-14 relative">
      {/* Subtle top label */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={13} className="text-amber-500" strokeWidth={2.5} />
        <span
          style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em" }}
          className="text-xs font-medium text-amber-500 uppercase tracking-widest"
        >
          GTM Control Center
        </span>
      </div>

      <div className="max-w-3xl">
        <h1
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
          className="text-5xl font-extrabold text-slate-900 mb-4 leading-tight"
        >
          Welcome back,{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-slate-900">
              {user.name || "User"}
            </span>
            <span
              className="absolute bottom-1 left-0 w-full h-3 bg-amber-300 z-0 opacity-60"
              style={{ borderRadius: "2px" }}
            />
          </span>
        </h1>

        <p
          style={{ fontFamily: "'Sora', sans-serif" }}
          className="text-base text-slate-500 font-normal max-w-xl leading-relaxed"
        >
          Manage your GTM accounts, containers, workspaces, tags, triggers, and
          variables — all from one sharp interface.
        </p>
      </div>

      {/* Decorative rule */}
      <div className="mt-8 flex items-center gap-3">
        <div className="h-px w-10 bg-amber-400" />
        <div className="h-px flex-1 bg-slate-100" />
      </div>
    </div>
  );
}


// export default function WelcomeSection({ user }: any) {
//   return (
//     <div className="mb-12">
//       <div className="max-w-3xl">
//         <h1 className="text-5xl font-bold text-gray-900 mb-4">
//           Welcome back,{" "}
//           <span className="bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
//             {user.name || "User"}
//           </span>
//         </h1>

//         <p className="text-lg text-gray-600">
//           Manage your GTM accounts, containers, workspaces, tags, triggers, and
//           variables in one dashboard.
//         </p>
//       </div>
//     </div>
//   );
// }