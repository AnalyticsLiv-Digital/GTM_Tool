"use client";

import { useAuth } from "@/contexts/AuthContext";
// This is your root dashboard layout — place at app/dashboard/layout.tsx
// The key fix: outer div is h-screen overflow-hidden, sidebar is fixed height,
// main content area scrolls independently with overflow-y-auto

import Sidebar from "./components/Sidebar";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const { user, logout } = useAuth();
    const router = useRouter();
  
    async function handleLogout() {
      try {
        await logout();
        router.push("/login");
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />

    <div className="flex h-[93dvh] overflow-hidden bg-slate-50">
      {/* Sidebar — never scrolls, always full height */}
      <Sidebar />

      {/* Main content — scrolls independently */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
    </div>
  );
}

// "use client";

// import { ReactNode } from "react";
// import Navbar from "./components/Navbar";
// import Sidebar from "./components/Sidebar";

// export default function DashboardLayout({ children }: { children: ReactNode }) {
//   return (
//     <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
//       {/* Top Navbar */}
//       <Navbar user={undefined} onLogout={function (): void {
//               throw new Error("Function not implemented.");
//           } } />

//       <div className="flex">
//         {/* Sidebar */}
//         <Sidebar activeTab={""} setActiveTab={function (): void {
//                   throw new Error("Function not implemented.");
//               } } />

//         {/* Main Content */}
//         <div className="flex-1 p-6">{children}</div>
//       </div>
//     </div>
//   );
// }