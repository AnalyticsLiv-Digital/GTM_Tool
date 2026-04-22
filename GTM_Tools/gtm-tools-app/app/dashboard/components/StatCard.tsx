"use client";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}

export default function StatCard({ label, value, icon, accent = "#f59e0b" }: StatCardProps) {
  return (
    <div
      className="relative bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* Top accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.75 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accent }}
      />

      {/* Icon pill */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}15`, color: accent }}
      >
        {icon}
      </div>

      {/* Value */}
      <div>
        <p
          className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {value}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
          {label}
        </p>
      </div>
    </div>
  );
}

// export default function StatCard({ label, value, icon }: any) {
//   return (
//     <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:scale-105 group">
//       <div className="flex items-start justify-between">
//         <div>
//           <p className="text-sm font-medium text-gray-600">{label}</p>
//           <div className="flex items-baseline space-x-2 mt-3">
//             <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
//               {value}
//             </p>
//           </div>
//         </div>
//         <div className="text-3xl opacity-80 group-hover:opacity-100 transition-opacity">
//           {icon}
//         </div>
//       </div>
//     </div>
//   );
// }