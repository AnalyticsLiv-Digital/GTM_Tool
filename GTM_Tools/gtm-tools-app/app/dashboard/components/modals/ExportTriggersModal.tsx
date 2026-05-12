/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { toast } from "react-toastify";

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
  const store = useDashboardStore();

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

  // --------------------------------------
  // HELPER: DELAY FUNCTION
  // --------------------------------------
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // --------------------------------------
  // FETCH ACCOUNTS WHEN MODAL OPENS
  // --------------------------------------
  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await res.json();

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

  // --------------------------------------
  // FETCH CONTAINERS WHEN ACCOUNT SELECTED
  // --------------------------------------
  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadContainers() {
      try {
        setLoadingContainers(true);

        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );
        const data = await res.json();

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

  // --------------------------------------
  // FETCH WORKSPACES WHEN CONTAINER SELECTED
  // --------------------------------------
  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );

        const data = await res.json();

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

  // --------------------------------------
  // EXPORT TRIGGERS FUNCTION (FIXED)
  // --------------------------------------
  async function handleExportTriggers() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTriggers || selectedTriggers.length === 0)
      return toast.warning("No triggers selected for export.");

    if (
      !confirm(
        `Are you sure you want to export ${selectedTriggers.length} trigger(s) to selected workspace?`
      )
    )
      return;

    const failedTriggers: string[] = [];

    try {
      setExportLoading(true);

      for (const trigger of selectedTriggers) {
        try {
          let exportSuccess = false;
          let attempt = 0;
          const maxAttempts = 8;

          while (!exportSuccess && attempt < maxAttempts) {
            const updatedName =
              attempt === 0 ? trigger.name : `${trigger.name}_${attempt}`;

            // ✅ IMPORTANT: Keep trigger structure
            const cleanedTrigger = {
              ...trigger,
              name: updatedName,
            };

            // ❌ Remove readonly fields (GTM API doesn't accept these)
            delete cleanedTrigger.triggerId;
            delete cleanedTrigger.fingerprint;
            delete cleanedTrigger.accountId;
            delete cleanedTrigger.containerId;
            delete cleanedTrigger.workspaceId;
            delete cleanedTrigger.path;

            const res = await fetch("/api/auth/gtm/triggers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: selectedAccountId,
                containerId: selectedContainerId,
                workspaceId: selectedWorkspaceId,
                trigger: cleanedTrigger,
              }),
            });

            const data = await res.json();

            // --------------------------------------
            // HANDLE FAILURES
            // --------------------------------------
            if (!res.ok) {
              const errorMsg =
                data?.details?.error?.message ||
                data?.error ||
                "Failed to export trigger";

              // ✅ Duplicate name issue retry
              if (
                errorMsg.toLowerCase().includes("already exists") ||
                errorMsg.toLowerCase().includes("duplicate name")
              ) {
                attempt++;
                continue;
              }

              // ✅ Rate limit retry (429)
              if (res.status === 429) {
                attempt++;
                const waitTime = 800 * attempt; // exponential wait
                await delay(waitTime);
                continue;
              }

              // ❌ other errors = fail
              throw new Error(errorMsg);
            }

            exportSuccess = true;

            // ✅ Delay after every successful trigger export (VERY IMPORTANT)
            await delay(700);
          }

          if (!exportSuccess) {
            throw new Error("Failed after retries (rate limit / duplicate issue)");
          }
        } catch (err: any) {
          failedTriggers.push(trigger?.name || "Unknown Trigger");
          continue;
        }
      }

      if (failedTriggers.length > 0) {
        toast.warning(
          `Export finished with ${failedTriggers.length} failure(s): ${failedTriggers.join(
            ", "
          )}`
        );

        // ❌ Do not clear selection if failures exist
        return;
      }

      toast.success("Triggers exported successfully!");

      store.setSelectedTriggerId?.("");
      onExportSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Export Triggers</h2>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-90">
          {/* LEFT */}
          <div className="col-span-5 border-r bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Selected Triggers ({selectedTriggers.length})
            </p>

            <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
              {selectedTriggers.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">
                  No triggers selected.
                </p>
              ) : (
                selectedTriggers.map((trigger: any) => (
                  <div
                    key={trigger.triggerId}
                    className="px-4 py-3 border-b last:border-none"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {trigger.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Type: {trigger.type} | ID: {trigger.triggerId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6">
            <h3 className="text-md font-bold text-gray-900 mb-5">
              Select Destination
            </h3>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Workspace --</option>
              {workspaces.map((w: any) => (
                <option key={w.workspaceId} value={w.workspaceId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleExportTriggers}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId ||
              selectedTriggers.length === 0
            }
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {exportLoading ? "Exporting..." : "Export Selected Triggers"}
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