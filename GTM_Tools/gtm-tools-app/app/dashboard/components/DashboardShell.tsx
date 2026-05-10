"use client";

import { ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="flex">
        <Sidebar onLogout={handleLogout} />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// "use client";

// import { ReactNode, useState } from "react";
// import Navbar from "./Navbar";
// import Sidebar from "./Sidebar";
// import { useAuth } from "@/contexts/AuthContext";
// import { useRouter } from "next/navigation";

// export default function DashboardShell({ children }: { children: ReactNode }) {
//   const router = useRouter();
//   const { user, logout } = useAuth();

//   const [activeTab, setActiveTab] = useState("dashboard");

//   async function handleLogout() {
//     try {
//       await logout();
//       router.push("/login");
//     } catch (err) {
//       console.error("Logout failed:", err);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
//       <Navbar user={user} onLogout={handleLogout} />

//       <div className="flex">
//         <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
//         <div className="flex-1 p-6">{children}</div>
//       </div>
//     </div>
//   );
// }