/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, Search } from "lucide-react";

function CustomDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;

    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  return (
    <div className="w-full" ref={dropdownRef}>
      <label className="block text-[12.5px] font-medium text-fg mb-2">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
          <div className="p-2 border-b border-line bg-card-hi">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
              <Search size={15} className="text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                  value === opt.value ? "bg-card-hi" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="text-sm text-muted px-4 py-3">
                No matching results.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExportTriggersModal({
  show,
  onClose,
  onExportSuccess,
  selectedTriggers,
}: {
  show: boolean;
  onClose: () => void;
  onExportSuccess: () => void;
  selectedTriggers: any[];
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await safeJsonParse(res);

        if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

        setAccounts(data.account || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [show]);

  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadContainers() {
      try {
        setLoadingContainers(true);

        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );

        const data = await safeJsonParse(res);

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch containers");

        setContainers(data.container || []);
        setSelectedContainerId("");
        setSelectedWorkspaceId("");
        setWorkspaces([]);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingContainers(false);
      }
    }

    loadContainers();
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );

        const data = await safeJsonParse(res);

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch workspaces");

        setWorkspaces(data.workspace || []);
        setSelectedWorkspaceId("");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  async function handleExport() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTriggers.length)
      return toast.warning("No triggers selected for export.");

    try {
      setExportLoading(true);

      for (const trigger of selectedTriggers) {
        await fetch("/api/auth/gtm/triggers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            workspaceId: selectedWorkspaceId,
            trigger,
          }),
        });
      }

      toast.success("✅ Triggers exported successfully!");
      onExportSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 border-b border-line">
          <h2 className="text-[15px] font-semibold text-fg">
            Export Triggers ({selectedTriggers.length})
          </h2>

          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-12 min-h-90">
          <div className="col-span-5 border-r border-line bg-card-hi p-4">
            <p className="text-[12px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
              Selected Triggers ({selectedTriggers.length})
            </p>

            <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-80">
              {selectedTriggers.map((t: any) => (
                <div
                  key={t.triggerId}
                  className="px-4 py-3 border-b border-line last:border-none"
                >
                  <p className="text-[13px] font-medium text-fg">{t.name}</p>
                  <p className="text-[11px] text-faint">
                    Type: {t.type} | ID: {t.triggerId}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-7 p-6 space-y-5">
            <h3 className="text-[14px] font-semibold text-fg mb-2">
              Select Destination
            </h3>

            <CustomDropdown
              label="Account"
              value={selectedAccountId}
              placeholder="-- Select Account --"
              disabled={loadingAccounts}
              options={accounts.map((a) => ({
                value: a.accountId,
                label: a.name,
              }))}
              onChange={(val) => setSelectedAccountId(val)}
            />

            <CustomDropdown
              label="Container"
              value={selectedContainerId}
              placeholder="-- Select Container --"
              disabled={!selectedAccountId || loadingContainers}
              options={containers.map((c) => ({
                value: c.containerId,
                label: c.name,
              }))}
              onChange={(val) => setSelectedContainerId(val)}
            />

            <CustomDropdown
              label="Workspace"
              value={selectedWorkspaceId}
              placeholder="-- Select Workspace --"
              disabled={!selectedContainerId || loadingWorkspaces}
              options={workspaces.map((w) => ({
                value: w.workspaceId,
                label: w.name,
              }))}
              onChange={(val) => setSelectedWorkspaceId(val)}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
          <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId ||
              selectedTriggers.length === 0
            }
            className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? "Exporting..." : "Export Triggers"}
          </button>
        </div>
      </div>
    </div>
  );
}



// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { notify } from "@/lib/ui/notify";
// import { confirmDialog } from "@/lib/ui/dialog";

// export default function ExportTriggersModal({
//   show,
//   onClose,
//   onExportSuccess,
//   selectedTriggers,
// }: {
//   show: boolean;
//   onClose: () => void;
//   onExportSuccess: () => void;
//   selectedTriggers: any[];
// }) {
//   const store = useDashboardStore();

//   const [accounts, setAccounts] = useState<any[]>([]);
//   const [containers, setContainers] = useState<any[]>([]);
//   const [workspaces, setWorkspaces] = useState<any[]>([]);

//   const [selectedAccountId, setSelectedAccountId] = useState("");
//   const [selectedContainerId, setSelectedContainerId] = useState("");
//   const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

//   const [loadingAccounts, setLoadingAccounts] = useState(false);
//   const [loadingContainers, setLoadingContainers] = useState(false);
//   const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

//   const [exportLoading, setExportLoading] = useState(false);

//   // --------------------------------------
//   // FETCH ACCOUNTS WHEN MODAL OPENS
//   // --------------------------------------
//   useEffect(() => {
//     if (!show) return;

//     async function loadAccounts() {
//       try {
//         setLoadingAccounts(true);

//         const res = await fetch("/api/auth/gtm/accounts");
//         const data = await res.json();

//         if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

//         setAccounts(data.account || []);
//       } catch (err: any) {
//         notify.error(err.message);
//       } finally {
//         setLoadingAccounts(false);
//       }
//     }

//     loadAccounts();
//   }, [show]);

//   // --------------------------------------
//   // FETCH CONTAINERS WHEN ACCOUNT SELECTED
//   // --------------------------------------
//   useEffect(() => {
//     if (!selectedAccountId) return;

//     async function loadContainers() {
//       try {
//         setLoadingContainers(true);

//         const res = await fetch(
//           `/api/auth/gtm/containers?accountId=${selectedAccountId}`
//         );
//         const data = await res.json();

//         if (!res.ok)
//           throw new Error(data?.error || "Failed to fetch containers");

//         setContainers(data.container || []);

//         setSelectedContainerId("");
//         setSelectedWorkspaceId("");
//         setWorkspaces([]);
//       } catch (err: any) {
//         notify.error(err.message);
//       } finally {
//         setLoadingContainers(false);
//       }
//     }

//     loadContainers();
//   }, [selectedAccountId]);

//   // --------------------------------------
//   // FETCH WORKSPACES WHEN CONTAINER SELECTED
//   // --------------------------------------
//   useEffect(() => {
//     if (!selectedAccountId || !selectedContainerId) return;

//     async function loadWorkspaces() {
//       try {
//         setLoadingWorkspaces(true);

//         const res = await fetch(
//           `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
//         );

//         const data = await res.json();

//         if (!res.ok)
//           throw new Error(data?.error || "Failed to fetch workspaces");

//         setWorkspaces(data.workspace || []);

//         setSelectedWorkspaceId("");
//       } catch (err: any) {
//         notify.error(err.message);
//       } finally {
//         setLoadingWorkspaces(false);
//       }
//     }

//     loadWorkspaces();
//   }, [selectedAccountId, selectedContainerId]);

//   // --------------------------------------
//   // EXPORT TRIGGERS FUNCTION (with retry logic)
//   // --------------------------------------
//   async function handleExportTriggers() {
//     if (!selectedAccountId) {
//       notify.warning("Please select an account");
//       return;
//     }
//     if (!selectedContainerId) {
//       notify.warning("Please select a container");
//       return;
//     }
//     if (!selectedWorkspaceId) {
//       notify.warning("Please select a workspace");
//       return;
//     }

//     if (!selectedTriggers || selectedTriggers.length === 0) {
//       notify.warning("No triggers selected for export.");
//       return;
//     }

//     const ok = await confirmDialog({
//       title: `Export ${selectedTriggers.length} trigger(s)?`,
//       description: "They will be created in the selected destination workspace. Existing triggers in that workspace are not modified.",
//       confirmLabel: "Export",
//     });
//     if (!ok) return;

//     try {
//       setExportLoading(true);

//       const failedTriggers: string[] = [];

//       for (const trigger of selectedTriggers) {
//         try {
//           let exportSuccess = false;
//           let attempt = 0;
//           const maxAttempts = 5;

//           while (!exportSuccess && attempt < maxAttempts) {
//             const updatedName =
//               attempt === 0 ? trigger.name : `${trigger.name}_${attempt}`;

//             const cleanedTrigger = {
//               name: updatedName,
//               type: trigger.type,
//               filter: trigger.filter || [],
//               autoEventFilter: trigger.autoEventFilter || [],
//               customEventFilter: trigger.customEventFilter || [],
//               parameter: trigger.parameter || [],
//               waitForTags: trigger.waitForTags,
//               waitForTagsTimeout: trigger.waitForTagsTimeout,
//               checkValidation: trigger.checkValidation,
//               uniqueTriggerId: trigger.uniqueTriggerId,
//             };

//             const res = await fetch("/api/auth/gtm/triggers", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 accountId: selectedAccountId,
//                 containerId: selectedContainerId,
//                 workspaceId: selectedWorkspaceId,
//                 trigger: cleanedTrigger,
//               }),
//             });

//             const data = await res.json();

//             if (!res.ok) {
//               const errorMsg =
//                 data?.details?.error?.message ||
//                 data?.error ||
//                 "Failed to export trigger";

//               if (
//                 errorMsg.toLowerCase().includes("already exists") ||
//                 errorMsg.toLowerCase().includes("duplicate name")
//               ) {
//                 attempt++;
//                 continue;
//               } else {
//                 throw new Error(errorMsg);
//               }
//             }

//             exportSuccess = true;
//           }

//           if (!exportSuccess) {
//             throw new Error("Failed after retries (duplicate name issue)");
//           }
//         } catch (err: any) {
//           console.error(
//             "Skipping trigger due to error:",
//             trigger?.name,
//             err?.message
//           );
//           failedTriggers.push(trigger?.name || "Unknown Trigger");
//           continue;
//         }
//       }

//       if (failedTriggers.length > 0) {
//         notify.warning(
//           `Export finished with ${failedTriggers.length} failure(s): ${failedTriggers.join(", ")}`
//         );
//       } else {
//         notify.success("Triggers exported successfully");
//         onExportSuccess();
//       }

//       store.setSelectedTriggerId("");
//       onClose();
//     } catch (err: any) {
//       notify.error(err.message);
//     } finally {
//       setExportLoading(false);
//     }
//   }

//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
//         {/* HEADER */}
//         <div className="flex justify-between items-center px-5 py-3 border-b border-line">
//           <h2 className="text-[15px] font-semibold text-fg">Export Triggers</h2>

//           <button
//             onClick={onClose}
//             className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
//           >
//             ✕
//           </button>
//         </div>

//         {/* BODY */}
//         <div className="grid grid-cols-12 min-h-90">
//           {/* LEFT: TRIGGERS LIST */}
//           <div className="col-span-5 border-r border-line bg-card-hi p-4">
//             <p className="text-[12.5px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
//               Selected Triggers ({selectedTriggers.length})
//             </p>

//             <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-80">
//               {selectedTriggers.length === 0 ? (
//                 <p className="text-[12px] text-faint p-4">
//                   No triggers selected.
//                 </p>
//               ) : (
//                 selectedTriggers.map((trigger: any) => (
//                   <div
//                     key={trigger.triggerId}
//                     className="px-4 py-3 border-b border-line last:border-none"
//                   >
//                     <p className="text-[13px] font-medium text-fg">
//                       {trigger.name}
//                     </p>
//                     <p className="text-[11px] text-faint">
//                       Type: {trigger.type} | ID: {trigger.triggerId}
//                     </p>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* RIGHT: DESTINATION SELECT */}
//           <div className="col-span-7 p-6">
//             <h3 className="text-[14px] font-semibold text-fg mb-5">
//               Select Destination
//             </h3>

//             {/* ACCOUNT */}
//             <label className="block text-[12.5px] font-medium text-fg mb-2">
//               Account
//             </label>
//             <select
//               value={selectedAccountId}
//               onChange={(e) => setSelectedAccountId(e.target.value)}
//               disabled={loadingAccounts}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Account --</option>
//               {accounts.map((acc: any) => (
//                 <option key={acc.accountId} value={acc.accountId}>
//                   {acc.name}
//                 </option>
//               ))}
//             </select>

//             {loadingAccounts && (
//               <p className="text-[11px] text-faint mt-2">Loading accounts...</p>
//             )}

//             {/* CONTAINER */}
//             <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
//               Container
//             </label>
//             <select
//               value={selectedContainerId}
//               onChange={(e) => setSelectedContainerId(e.target.value)}
//               disabled={!selectedAccountId || loadingContainers}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Container --</option>
//               {containers.map((c: any) => (
//                 <option key={c.containerId} value={c.containerId}>
//                   {c.name}
//                 </option>
//               ))}
//             </select>

//             {loadingContainers && (
//               <p className="text-[11px] text-faint mt-2">
//                 Loading containers...
//               </p>
//             )}

//             {/* WORKSPACE */}
//             <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
//               Workspace
//             </label>
//             <select
//               value={selectedWorkspaceId}
//               onChange={(e) => setSelectedWorkspaceId(e.target.value)}
//               disabled={!selectedContainerId || loadingWorkspaces}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Workspace --</option>
//               {workspaces.map((w: any) => (
//                 <option key={w.workspaceId} value={w.workspaceId}>
//                   {w.name}
//                 </option>
//               ))}
//             </select>

//             {loadingWorkspaces && (
//               <p className="text-[11px] text-faint mt-2">
//                 Loading workspaces...
//               </p>
//             )}
//           </div>
//         </div>

//         {/* FOOTER */}
//         <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
//           <button
//             onClick={onClose}
//             className="btn-secondary !py-1.5 !px-3"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleExportTriggers}
//             disabled={
//               exportLoading ||
//               !selectedAccountId ||
//               !selectedContainerId ||
//               !selectedWorkspaceId ||
//               selectedTriggers.length === 0
//             }
//             className="btn-primary !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {exportLoading ? "Exporting..." : "Export Selected Triggers"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }