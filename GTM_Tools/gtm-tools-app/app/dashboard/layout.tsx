"use client";

import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

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
    <div className="tool-dark">
      <Navbar user={user} onLogout={handleLogout} />

    <div className="flex h-[93dvh] overflow-hidden">
      {/* Sidebar — never scrolls, always full height */}
      <Sidebar onLogout={handleLogout} />

      {/* Main content — scrolls independently. ErrorBoundary keeps a render
          crash from killing the navbar/sidebar shell. */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <ErrorBoundary label="dashboard">{children}</ErrorBoundary>
        </div>
      </main>
    </div>
    </div>
  );
}
