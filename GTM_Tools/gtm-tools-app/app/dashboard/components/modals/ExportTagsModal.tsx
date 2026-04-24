// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";

// export default function ExportTagsModal({
//   show,
//   onClose,
//   selectedTags,
// }: {
//   show: boolean;
//   onClose: () => void;
//   selectedTags: any[];
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
//         alert(err.message);
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

//         // reset next dropdowns
//         setSelectedContainerId("");
//         setSelectedWorkspaceId("");
//         setWorkspaces([]);
//       } catch (err: any) {
//         alert(err.message);
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

//         // reset workspace selection
//         setSelectedWorkspaceId("");
//       } catch (err: any) {
//         alert(err.message);
//       } finally {
//         setLoadingWorkspaces(false);
//       }
//     }

//     loadWorkspaces();
//   }, [selectedAccountId, selectedContainerId]);

//   // --------------------------------------
//   // EXPORT TAGS FUNCTION
//   // --------------------------------------
//   async function handleExportTags() {
//     if (!selectedAccountId) return alert("Please select an Account");
//     if (!selectedContainerId) return alert("Please select a Container");
//     if (!selectedWorkspaceId) return alert("Please select a Workspace");

//     if (!selectedTags || selectedTags.length === 0)
//       return alert("No tags selected for export.");

//     if (
//       !confirm(
//         `Are you sure you want to export ${selectedTags.length} tag(s) to selected workspace?`
//       )
//     )
//       return;

//     try {
//       setExportLoading(true);

//       for (const tag of selectedTags) {
//         console.log("Exporting tag:", tag);
//         if (tag.type.includes("cvt_")){}
//         const cleanedTag = {
//           name: tag.name,
//           type: tag.type,
//           parameter: tag.parameter || [],
//         };

//         const res = await fetch("/api/auth/gtm/tags", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             tag: cleanedTag,
//           }),
//         });

//         const data = await res.json();

//         if (!res.ok) {
//           console.error("Tag Export Error:", data);
//           throw new Error(data?.error || "Failed to export tag");
//         }
//       }

//       alert("Tags exported successfully!");

//       // refresh current workspace tags after export (optional)
//       store.setSelectedTagId("");
//       onClose();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       setExportLoading(false);
//     }
//   }

//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//       <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
//         {/* HEADER */}
//         <div className="flex justify-between items-center px-6 py-4 border-b">
//           <h2 className="text-lg font-bold text-gray-900">Export Tags</h2>

//           <button
//             onClick={onClose}
//             className="text-gray-600 hover:text-gray-900 font-bold text-lg"
//           >
//             ✕
//           </button>
//         </div>

//         {/* BODY */}
//         <div className="grid grid-cols-12 min-h-90">
//           {/* LEFT: TAGS LIST */}
//           <div className="col-span-5 border-r bg-gray-50 p-4">
//             <p className="text-sm font-semibold text-gray-700 mb-3">
//               Selected Tags ({selectedTags.length})
//             </p>

//             <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
//               {selectedTags.length === 0 ? (
//                 <p className="text-xs text-gray-500 p-4">No tags selected.</p>
//               ) : (
//                 selectedTags.map((tag: any) => (
//                   <div
//                     key={tag.tagId}
//                     className="px-4 py-3 border-b last:border-none"
//                   >
//                     <p className="text-sm font-semibold text-gray-900">
//                       {tag.name}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       Type: {tag.type} | ID: {tag.tagId}
//                     </p>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* RIGHT: DESTINATION SELECT */}
//           <div className="col-span-7 p-6">
//             <h3 className="text-md font-bold text-gray-900 mb-5">
//               Select Destination
//             </h3>

//             {/* ACCOUNT */}
//             <label className="block text-sm font-semibold text-gray-700 mb-2">
//               Account
//             </label>
//             <select
//               value={selectedAccountId}
//               onChange={(e) => setSelectedAccountId(e.target.value)}
//               disabled={loadingAccounts}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">-- Select Account --</option>
//               {accounts.map((acc: any) => (
//                 <option key={acc.accountId} value={acc.accountId}>
//                   {acc.name}
//                 </option>
//               ))}
//             </select>

//             {loadingAccounts && (
//               <p className="text-xs text-gray-500 mt-2">Loading accounts...</p>
//             )}

//             {/* CONTAINER */}
//             <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
//               Container
//             </label>
//             <select
//               value={selectedContainerId}
//               onChange={(e) => setSelectedContainerId(e.target.value)}
//               disabled={!selectedAccountId || loadingContainers}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">-- Select Container --</option>
//               {containers.map((c: any) => (
//                 <option key={c.containerId} value={c.containerId}>
//                   {c.name}
//                 </option>
//               ))}
//             </select>

//             {loadingContainers && (
//               <p className="text-xs text-gray-500 mt-2">
//                 Loading containers...
//               </p>
//             )}

//             {/* WORKSPACE */}
//             <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
//               Workspace
//             </label>
//             <select
//               value={selectedWorkspaceId}
//               onChange={(e) => setSelectedWorkspaceId(e.target.value)}
//               disabled={!selectedContainerId || loadingWorkspaces}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">-- Select Workspace --</option>
//               {workspaces.map((w: any) => (
//                 <option key={w.workspaceId} value={w.workspaceId}>
//                   {w.name}
//                 </option>
//               ))}
//             </select>

//             {loadingWorkspaces && (
//               <p className="text-xs text-gray-500 mt-2">
//                 Loading workspaces...
//               </p>
//             )}
//           </div>
//         </div>

//         {/* FOOTER */}
//         <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleExportTags}
//             disabled={
//               exportLoading ||
//               !selectedAccountId ||
//               !selectedContainerId ||
//               !selectedWorkspaceId ||
//               selectedTags.length === 0
//             }
//             className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
//           >
//             {exportLoading ? "Exporting..." : "Export Selected Tags"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";

export default function ExportTagsModal({
  show,
  onClose,
  selectedTags,
}: {
  show: boolean;
  onClose: () => void;
  selectedTags: any[];
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
        alert(err.message);
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

        // reset next dropdowns
        setSelectedContainerId("");
        setSelectedWorkspaceId("");
        setWorkspaces([]);
      } catch (err: any) {
        alert(err.message);
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

        // reset workspace selection
        setSelectedWorkspaceId("");
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  // --------------------------------------
  // EXPORT TAGS FUNCTION
  // --------------------------------------
  async function handleExportTags() {
    if (!selectedAccountId) return alert("Please select an Account");
    if (!selectedContainerId) return alert("Please select a Container");
    if (!selectedWorkspaceId) return alert("Please select a Workspace");

    if (!selectedTags || selectedTags.length === 0)
      return alert("No tags selected for export.");

    if (
      !confirm(
        `Are you sure you want to export ${selectedTags.length} tag(s) to selected workspace?`
      )
    )
      return;

    try {
      setExportLoading(true);

      // SOURCE IDs FROM ZUSTAND STORE
      const sourceAccountId = store.selectedAccountId;
      const sourceContainerId = store.selectedContainerId;
      const sourceWorkspaceId = store.selectedWorkspaceId;

      const failedTags: string[] = [];

      for (const tag of selectedTags) {
        try {
          console.log("Exporting tag:", tag);

          let finalTagType = tag.type;

          // ====================================================
          // IF TAG TYPE IS CUSTOM TEMPLATE (cvt_)
          // ====================================================
          if (tag.type && tag.type.startsWith("cvt_")) {
            const parts = tag.type.split("_");

            const templateId = parts[2]; // last part = templateId

            console.log("Detected CVT Template ID:", templateId);

            // -----------------------------
            // STEP 1: FETCH TEMPLATE FROM SOURCE
            // -----------------------------
            const fetchTemplateRes = await fetch(
              `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${templateId}`
            );

            const fetchTemplateData = await fetchTemplateRes.json();

            if (!fetchTemplateRes.ok) {
              console.error("Template Fetch Error:", fetchTemplateData);
              throw new Error(
                fetchTemplateData?.error || "Failed to fetch template"
              );
            }

            const sourceTemplate = fetchTemplateData.template;

            if (!sourceTemplate) {
              throw new Error("Template not found in source workspace");
            }

            // -----------------------------
            // STEP 2: CREATE TEMPLATE IN TARGET
            // -----------------------------
            const createTemplateRes = await fetch("/api/auth/gtm/templates/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: selectedAccountId,
                containerId: selectedContainerId,
                workspaceId: selectedWorkspaceId,
                template: {
                  name: sourceTemplate.name,
                  templateData: sourceTemplate.templateData,
                  galleryReference: sourceTemplate.galleryReference || undefined,
                },
              }),
            });

            const createTemplateData = await createTemplateRes.json();

            if (!createTemplateRes.ok) {
              console.error("Template Create Error:", createTemplateData);
              throw new Error(
                createTemplateData?.error || "Failed to create template"
              );
            }

            const newTemplateId = createTemplateData?.template?.templateId;

            if (!newTemplateId) {
              throw new Error("Template created but templateId not returned");
            }

            // -----------------------------
            // STEP 3: UPDATE TAG TYPE
            // -----------------------------
            finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;

            console.log("New CVT Tag Type:", finalTagType);
          }

          // ====================================================
          // EXPORT TAG (WITH RETRY IF NAME CONFLICT)
          // ====================================================
          let exportSuccess = false;
          let attempt = 0;
          const maxAttempts = 5;

          while (!exportSuccess && attempt < maxAttempts) {
            const updatedName =
              attempt === 0 ? tag.name : `${tag.name}_${attempt}`;

            const cleanedTag = {
              name: updatedName,
              type: finalTagType,
              parameter: tag.parameter || [],
              // firingTriggerId: tag.firingTriggerId || [],
              // blockingTriggerId: tag.blockingTriggerId || [],
            };

            const res = await fetch("/api/auth/gtm/tags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: selectedAccountId,
                containerId: selectedContainerId,
                workspaceId: selectedWorkspaceId,
                tag: cleanedTag,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              console.error(`Tag Export Error (Attempt ${attempt}):`, data);

              // retry only if conflict / already exists
              const errorMsg =
                data?.details?.error?.message ||
                data?.error ||
                "Failed to export tag";

              if (
                errorMsg.toLowerCase().includes("already exists") ||
                errorMsg.toLowerCase().includes("duplicate") ||
                errorMsg.toLowerCase().includes("name")
              ) {
                attempt++;
                continue;
              } else {
                throw new Error(errorMsg);
              }
            }

            exportSuccess = true;
          }

          if (!exportSuccess) {
            throw new Error("Failed after retries (duplicate name issue)");
          }
        } catch (err: any) {
          console.error("Skipping tag due to error:", tag?.name, err?.message);
          failedTags.push(tag?.name || "Unknown Tag");
          continue; // continue next tag
        }
      }

      if (failedTags.length > 0) {
        alert(
          `Export finished with some failures.\n\nFailed Tags:\n${failedTags.join(
            "\n"
          )}`
        );
      } else {
        alert("Tags exported successfully!");
      }

      store.setSelectedTagId("");
      onClose();
    } catch (err: any) {
      alert(err.message);
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
          <h2 className="text-lg font-bold text-gray-900">Export Tags</h2>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-90">
          {/* LEFT: TAGS LIST */}
          <div className="col-span-5 border-r bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Selected Tags ({selectedTags.length})
            </p>

            <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
              {selectedTags.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">No tags selected.</p>
              ) : (
                selectedTags.map((tag: any) => (
                  <div
                    key={tag.tagId}
                    className="px-4 py-3 border-b last:border-none"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {tag.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Type: {tag.type} | ID: {tag.tagId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: DESTINATION SELECT */}
          <div className="col-span-7 p-6">
            <h3 className="text-md font-bold text-gray-900 mb-5">
              Select Destination
            </h3>

            {/* ACCOUNT */}
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

            {loadingAccounts && (
              <p className="text-xs text-gray-500 mt-2">Loading accounts...</p>
            )}

            {/* CONTAINER */}
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

            {loadingContainers && (
              <p className="text-xs text-gray-500 mt-2">
                Loading containers...
              </p>
            )}

            {/* WORKSPACE */}
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

            {loadingWorkspaces && (
              <p className="text-xs text-gray-500 mt-2">
                Loading workspaces...
              </p>
            )}
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
            onClick={handleExportTags}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId ||
              selectedTags.length === 0
            }
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {exportLoading ? "Exporting..." : "Export Selected Tags"}
          </button>
        </div>
      </div>
    </div>
  );
}