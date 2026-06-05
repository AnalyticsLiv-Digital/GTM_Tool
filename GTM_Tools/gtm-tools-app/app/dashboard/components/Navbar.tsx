"use client";

import Image from "next/image";
import {
  ChevronDown,
  LogOut,
  Upload,
  FolderOpen,
} from "lucide-react";
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
    isImportedJson,
  } = useDashboardStore();

  const hasSelection =
    isImportedJson ||
    !!(
      selectedAccountId &&
      selectedContainerId &&
      selectedWorkspaceId
    );

  const [showWorkspaceOptions, setShowWorkspaceOptions] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const handleExistingAccount = () => {
    useDashboardStore.setState({
      isImportedJson: false,
    });

    setShowWorkspaceOptions(false);
    setShowSelectionModal(true);
  };

  const handleImportJsonClick = () => {
    fileInputRef.current?.click();
  };

  function extractTemplates(
    node: any,
    tag: any,
    templates: any[]
  ) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((item) =>
        extractTemplates(item, tag, templates)
      );
      return;
    }

    if (node.type === "TEMPLATE") {
      templates.push({
        templateId: `${tag.tagId}-${templates.length}`,
        name: node.value || node.key || "Template",
        templateType: "Tag Template",
        sourceTag: tag.name,
      });
    }

    if (node.parameter) {
      extractTemplates(node.parameter, tag, templates);
    }

    if (node.list) {
      extractTemplates(node.list, tag, templates);
    }

    if (node.map) {
      extractTemplates(node.map, tag, templates);
    }
  }

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
      const gtmTemplates =
        containerVersion?.customTemplate ||
        containerVersion?.template ||
        [];

      const extractedTemplates: any[] = [];

      tags.forEach((tag: any) => {
        extractTemplates(
          tag.parameter,
          tag,
          extractedTemplates
        );
      });
      console.log(
        "Extracted Templates:",
        extractedTemplates
      );
      const templates = [...gtmTemplates, ...extractedTemplates].filter(
        (t: any) => t.templateId && t.name
      );
      console.log("===== IMPORT DEBUG =====");

      console.log("Container Version:", containerVersion);

      console.log("Imported Tags:", tags.length);
      console.log(
        "Imported Triggers:",
        triggers.length
      );
      console.log(
        "Imported Variables:",
        variables.length
      );
      console.log(
        "Imported Templates:",
        templates.length
      );

      // IMPORTANT:
      // Add fake workspace ID so app behaves like workspace selected
      useDashboardStore.setState({
        isImportedJson: true,

        // remove GTM selection
        selectedAccountId: "",
        selectedContainerId: "",
        selectedWorkspaceId: "",

        selectedAccountName: "",
        selectedContainerName: "",
        selectedWorkspaceName: "",

        selectedTagId: "",
        selectedTriggerId: "",
        selectedVariableId: "",
        selectedTemplateId: "",

        containers: [],
        workspaces: [],

        tags,
        triggers,
        variables,
        templates,
      });

      // VERIFY STORE AFTER UPDATE
      const updatedStore =
        useDashboardStore.getState();

      console.log(
        "Updated selectedWorkspaceId:",
        updatedStore.selectedWorkspaceId
      );

      console.log(
        "Updated triggers length:",
        updatedStore.triggers.length
      );

      console.log(
        "Updated tags length:",
        updatedStore.tags.length
      );

      console.log(
        "Updated variables length:",
        updatedStore.variables.length
      );

      console.log(
        "Updated templates length:",
        updatedStore.templates.length
      );

      console.log(
        "===== IMPORT SUCCESS ====="
      );

      notify.success(
        "JSON imported successfully"
      );

      setShowWorkspaceOptions(false);

      router.push("/dashboard/tags");
    } catch (err: unknown) {
      console.error("JSON IMPORT ERROR:", err);

      notify.error(
        err instanceof Error
          ? err.message
          : "Invalid GTM JSON file"
      );
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 h-14 bg-page/85 backdrop-blur-md border-b border-line">
        <div className="w-full h-full px-5 flex items-center justify-between gap-4">
          {/* LEFT */}
          <div className="flex items-center gap-4 min-w-0">
            <Brand />

            <span className="hidden md:inline-block w-px h-5 bg-line shrink-0" />

            <button
              onClick={() =>
                setShowWorkspaceOptions(true)
              }
              className="group flex items-center gap-2 px-3 py-1.5 rounded-md border border-line bg-card hover:bg-card-hi hover:border-edge transition-colors min-w-0"
              aria-label="Switch account, container, or workspace"
            >
              {isImportedJson ? (
                <span className="text-[13px] text-accent font-medium">
                  Imported JSON
                </span>
              ) : hasSelection ? (
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
                <span className="text-[13px] text-muted dark:text-neutral-300">
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

          {/* RIGHT */}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-100 px-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white dark:bg-neutral-900 shadow-2xl p-6">
            {/* TITLE */}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-5">
              Choose Option
            </h2>

            <div className="space-y-4">
              {/* EXISTING ACCOUNT */}
              <button
                onClick={handleExistingAccount}
                className="w-full flex items-center gap-4 border border-line rounded-xl p-4 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <FolderOpen className="w-6 h-6 text-blue-600 shrink-0" />

                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Existing Account
                  </p>

                  <p className="text-sm text-gray-600 dark:text-neutral-300">
                    Select existing GTM
                    account/container/workspace
                  </p>
                </div>
              </button>

              {/* IMPORT JSON */}
              <button
                onClick={handleImportJsonClick}
                className="w-full flex items-center gap-4 border border-line rounded-xl p-4 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
              >
                <Upload className="w-6 h-6 text-green-600 shrink-0" />

                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Import JSON File
                  </p>

                  <p className="text-sm text-gray-600 dark:text-neutral-300">
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

            {/* CANCEL */}
            <button
              onClick={() =>
                setShowWorkspaceOptions(false)
              }
              className="mt-6 w-full border border-line rounded-xl py-3 text-gray-900 dark:text-white bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition font-medium"
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
}

// "use client";

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

