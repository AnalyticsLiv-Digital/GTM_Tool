"use client";

import Image from "next/image";
import { ChevronDown, LogOut } from "lucide-react";
import UnifiedSelectionModal from "./UnifiedSelectionModal";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { Brand } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar({
  user,
  onLogout,
}: {
  user: {
    picture?: string | null;
    name?: string;
    email?: string;
  } | null;
  onLogout: () => void;
}) {
  const {
    selectedAccountId,
    selectedContainerId,
    selectedWorkspaceId,
    selectedAccountName,
    selectedContainerName,
    selectedWorkspaceName,
    showSelectionModal,
    setShowSelectionModal,
  } = useDashboardStore();

  const hasSelection = !!(selectedAccountId && selectedContainerId && selectedWorkspaceId);

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-page/85 backdrop-blur-md border-b border-line">
        <div className="w-full h-full px-5 flex items-center justify-between gap-4">
          {/* Left — brand + selection */}
          <div className="flex items-center gap-4 min-w-0">
            <Brand />

            <span className="hidden md:inline-block w-px h-5 bg-line shrink-0" />

            <button
              onClick={() => setShowSelectionModal(true)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-card hover:bg-card-hi hover:border-edge transition-colors min-w-0"
              aria-label="Switch account, container, or workspace"
            >
              {hasSelection ? (
                <span className="flex items-center gap-1.5 text-[13px] text-fg min-w-0">
                  <span className="truncate max-w-[120px]">{selectedAccountName}</span>
                  <span className="text-faint">/</span>
                  <span className="truncate max-w-[140px]">{selectedContainerName}</span>
                  <span className="text-faint">/</span>
                  <span className="truncate max-w-[140px] text-accent font-medium">
                    {selectedWorkspaceName}
                  </span>
                </span>
              ) : (
                <span className="text-[13px] text-muted">
                  Select account / container / workspace
                </span>
              )}
              <ChevronDown size={13} strokeWidth={2.2} className="text-faint group-hover:text-fg transition-colors shrink-0" />
            </button>
          </div>

          {/* Right — theme toggle + user */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2.5 pl-2 ml-1 border-l border-line">
              {user?.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name ?? "user"}
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-line"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-card-hi border border-line flex items-center justify-center text-[11px] font-mono text-muted">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <span className="text-[13px] text-fg max-w-[140px] truncate">
                {user?.name ?? "User"}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted hover:text-fg hover:bg-card-hi transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={13} strokeWidth={2} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <UnifiedSelectionModal
        show={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
      />
    </>
  );
}
