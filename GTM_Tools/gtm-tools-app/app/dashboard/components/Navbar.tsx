"use client";

import Image from "next/image";
import { ChevronDown, LogOut, Upload, FolderOpen } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import UnifiedSelectionModal from "./UnifiedSelectionModal";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { Brand } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { notify } from "@/lib/ui/notify";

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

  const router = useRouter();

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

  const hasSelection = !!(
    selectedAccountId &&
    selectedContainerId &&
    selectedWorkspaceId
  );

  const [showWorkspaceOptions, setShowWorkspaceOptions] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const handleExistingAccount = () => {
    setShowWorkspaceOptions(false);
    setShowSelectionModal(true);
  };

  const handleImportJsonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportJson = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".json")) {
      notify.error("Please upload a valid JSON file");
      return;
    }

    try {
      const text = await file.text();

      const json = JSON.parse(text);

      // GTM export structure
      const containerVersion =
        json?.containerVersion || json;

      const tags = containerVersion?.tag || [];
      const triggers =
        containerVersion?.trigger || [];
      const variables =
        containerVersion?.variable || [];
      const templates =
        containerVersion?.template || [];

      // CLEAR EXISTING ACCOUNT/CONTAINER/WORKSPACE
      useDashboardStore.setState({
        selectedAccountId: "",
        selectedContainerId: "",
        selectedWorkspaceId: "",

        selectedAccountName: "Imported JSON",
        selectedContainerName:
          containerVersion?.container?.name ||
          "Imported Container",

        selectedWorkspaceName:
          containerVersion?.workspace?.name ||
          "Imported Workspace",

        workspaces: [],
        containers: [],

        // RESET SELECTIONS
        selectedTagId: "",
        selectedTriggerId: "",
        selectedVariableId: "",
        selectedTemplateId: "",

        // LOAD IMPORTED DATA
        tags,
        triggers,
        variables,
        templates,
      });

      notify.success(
        "JSON imported successfully"
      );

      setShowWorkspaceOptions(false);

      // REDIRECT TO TAGS PAGE
      router.push("/dashboard/tags");
    } catch (err: unknown) {
      notify.error(
        err instanceof Error ? err.message : "Invalid GTM JSON file"
      );
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-page/85 backdrop-blur-md border-b border-line">
        <div className="w-full h-full px-5 flex items-center justify-between gap-4">
          {/* Left — brand + selection */}
          <div className="flex items-center gap-4 min-w-0">
            <Brand />

            <span className="hidden md:inline-block w-px h-5 bg-line shrink-0" />

            {/* UPDATED BUTTON */}
            <button
              onClick={() =>
                setShowWorkspaceOptions(true)
              }
              className="group flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-card hover:bg-card-hi hover:border-edge transition-colors min-w-0"
              aria-label="Switch account, container, or workspace"
            >
              {hasSelection ? (
                <span className="flex items-center gap-1.5 text-[13px] text-fg min-w-0">
                  <span className="truncate max-w-30">
                    {selectedAccountName}
                  </span>

                  <span className="text-faint">
                    /
                  </span>

                  <span className="truncate max-w-35">
                    {selectedContainerName}
                  </span>

                  <span className="text-faint">
                    /
                  </span>

                  <span className="truncate max-w-35 text-accent font-medium">
                    {selectedWorkspaceName}
                  </span>
                </span>
              ) : (
                <span className="text-[13px] text-muted">
                  Select account / container /
                  workspace
                </span>
              )}

              <ChevronDown
                size={13}
                strokeWidth={2.2}
                className="text-faint group-hover:text-fg transition-colors shrink-0"
              />
            </button>
          </div>

          {/* Right */}
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
                  {user?.name?.[0]?.toUpperCase() ??
                    "U"}
                </div>
              )}

              <span className="text-[13px] text-fg max-w-35 truncate">
                {user?.name ?? "User"}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted hover:text-fg hover:bg-card-hi transition-colors"
              aria-label="Sign out"
            >
              <LogOut
                size={13}
                strokeWidth={2}
              />

              <span className="hidden sm:inline">
                Sign out
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* POPUP */}
      {showWorkspaceOptions && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-100">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-105 shadow-2xl border border-line">
            <h2 className="text-xl font-semibold mb-5">
              Choose Option
            </h2>

            <div className="space-y-4">
              {/* EXISTING */}
              <button
                onClick={handleExistingAccount}
                className="w-full flex items-center gap-4 border border-line rounded-xl p-4 hover:bg-card-hi transition"
              >
                <FolderOpen className="w-6 h-6 text-blue-600" />

                <div className="text-left">
                  <p className="font-medium">
                    Existing Account
                  </p>

                  <p className="text-sm text-gray-500">
                    Select existing GTM
                    account/container/workspace
                  </p>
                </div>
              </button>

              {/* IMPORT */}
              <button
                onClick={handleImportJsonClick}
                className="w-full flex items-center gap-4 border border-line rounded-xl p-4 hover:bg-card-hi transition"
              >
                <Upload className="w-6 h-6 text-green-600" />

                <div className="text-left">
                  <p className="font-medium">
                    Import JSON File
                  </p>

                  <p className="text-sm text-gray-500">
                    Upload GTM container JSON
                  </p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJson}
              />
            </div>

            <button
              onClick={() =>
                setShowWorkspaceOptions(false)
              }
              className="mt-6 w-full border border-line rounded-xl py-3 hover:bg-card-hi"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <UnifiedSelectionModal
        show={showSelectionModal}
        onClose={() =>
          setShowSelectionModal(false)
        }
      />
    </>
  );
}// "use client";

// import Image from "next/image";
// import { ChevronDown, LogOut } from "lucide-react";
// import UnifiedSelectionModal from "./UnifiedSelectionModal";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { Brand } from "@/components/BrandLogo";
// import { ThemeToggle } from "@/components/ThemeToggle";

// export default function Navbar({
//   user,
//   onLogout,
// }: {
//   user: {
//     picture?: string | null;
//     name?: string;
//     email?: string;
//   } | null;
//   onLogout: () => void;
// }) {
//   const {
//     selectedAccountId,
//     selectedContainerId,
//     selectedWorkspaceId,
//     selectedAccountName,
//     selectedContainerName,
//     selectedWorkspaceName,
//     showSelectionModal,
//     setShowSelectionModal,
//   } = useDashboardStore();

//   const hasSelection = !!(
//     selectedAccountId &&
//     selectedContainerId &&
//     selectedWorkspaceId
//   );

//   return (
//     <>
//       <nav className="sticky top-0 z-50 h-14 bg-page/85 backdrop-blur-md border-b border-line">
//         <div className="w-full h-full px-5 flex items-center justify-between gap-4">
//           {/* Left — brand + selection */}
//           <div className="flex items-center gap-4 min-w-0">
//             <Brand />

//             <span className="hidden md:inline-block w-px h-5 bg-line shrink-0" />

//             <button
//               onClick={() => setShowSelectionModal(true)}
//               className="group flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-card hover:bg-card-hi hover:border-edge transition-colors min-w-0"
//               aria-label="Switch account, container, or workspace"
//             >
//               {hasSelection ? (
//                 <span className="flex items-center gap-1.5 text-[13px] text-fg min-w-0">
//                   <span className="truncate max-w-30">
//                     {selectedAccountName}
//                   </span>

//                   <span className="text-faint">/</span>

//                   <span className="truncate max-w-35">
//                     {selectedContainerName}
//                   </span>

//                   <span className="text-faint">/</span>

//                   <span className="truncate max-w-35 text-accent font-medium">
//                     {selectedWorkspaceName}
//                   </span>
//                 </span>
//               ) : (
//                 <span className="text-[13px] text-muted">
//                   Select account / container / workspace
//                 </span>
//               )}

//               <ChevronDown
//                 size={13}
//                 strokeWidth={2.2}
//                 className="text-faint group-hover:text-fg transition-colors shrink-0"
//               />
//             </button>
//           </div>

//           {/* Right — theme toggle + actions + user */}
//           <div className="flex items-center gap-2 shrink-0">
//             <ThemeToggle />

//             <div className="hidden sm:flex items-center gap-2.5 pl-2 ml-1 border-l border-line">
//               {user?.picture ? (
//                 <Image
//                   src={user.picture}
//                   alt={user.name ?? "user"}
//                   width={28}
//                   height={28}
//                   className="rounded-full ring-1 ring-line"
//                 />
//               ) : (
//                 <div className="w-7 h-7 rounded-full bg-card-hi border border-line flex items-center justify-center text-[11px] font-mono text-muted">
//                   {user?.name?.[0]?.toUpperCase() ?? "U"}
//                 </div>
//               )}

//               <span className="text-[13px] text-fg max-w-35 truncate">
//                 {user?.name ?? "User"}
//               </span>
//             </div>

//             <button
//               onClick={onLogout}
//               className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] text-muted hover:text-fg hover:bg-card-hi transition-colors"
//               aria-label="Sign out"
//             >
//               <LogOut size={13} strokeWidth={2} />
//               <span className="hidden sm:inline">Sign out</span>
//             </button>
//           </div>
//         </div>
//       </nav>

//       <UnifiedSelectionModal
//         show={showSelectionModal}
//         onClose={() => setShowSelectionModal(false)}
//       />
//     </>
//   );
// }

