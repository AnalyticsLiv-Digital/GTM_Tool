"use client";

import { ArrowRight } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: string;
  bgAccent?: string;
}

export default function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  accent = "#6366f1",
  bgAccent = "#6366f115",
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Hover background wash */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `${accent}07` }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />

      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
        style={{ background: bgAccent, color: accent }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
        <div
          className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0"
          style={{ background: accent, color: "#fff" }}
        >
          <ArrowRight size={13} strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}

// export default function QuickActionCard({
//   title,
//   description,
//   icon,
//   onClick,
// }: any) {
//   return (
//     <button
//       onClick={onClick}
//       className="bg-white rounded-xl border-2 border-gray-100 p-6 text-left hover:border-purple-300 hover:shadow-lg hover:bg-linear-to-br hover:from-purple-50 hover:to-blue-50 transition-all duration-300 group transform hover:scale-105"
//     >
//       <div className="flex items-start space-x-4">
//         <div className="text-3xl opacity-80 group-hover:opacity-100 transition-opacity">
//           {icon}
//         </div>

//         <div>
//           <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors text-lg">
//             {title}
//           </h3>
//           <p className="text-sm text-gray-600 mt-1 group-hover:text-gray-700">
//             {description}
//           </p>
//         </div>

//         <div className="ml-auto text-gray-400 group-hover:text-purple-500 transition-colors group-hover:translate-x-1 transform duration-200">
//           →
//         </div>
//       </div>
//     </button>
//   );
// }