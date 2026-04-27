/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

export default function TriggersPage() {
  const store = useDashboardStore();
  const { fetchTriggers, openCreateTriggerModal } = useDashboardActions();

  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchTriggers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  useEffect(() => {
    setSelectedTriggerIds([]);
  }, [store.selectedWorkspaceId]);

  const filteredTriggers = useMemo(() => {
    return store.triggers.filter((trigger: any) =>
      trigger.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [store.triggers, searchText]);

  const allSelected = useMemo(() => {
    if (filteredTriggers.length === 0) return false;
    return selectedTriggerIds.length === filteredTriggers.length;
  }, [selectedTriggerIds, filteredTriggers]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedTriggerIds([]);
    } else {
      const ids = filteredTriggers.map((trigger: any) => trigger.triggerId);
      setSelectedTriggerIds(ids);
    }
  }

  function toggleSingleTrigger(triggerId: string) {
    setSelectedTriggerIds((prev) => {
      if (prev.includes(triggerId)) {
        return prev.filter((id) => id !== triggerId);
      }
      return [...prev, triggerId];
    });
  }

  const selectedTriggers = useMemo(() => {
    return store.triggers.filter((t: any) =>
      selectedTriggerIds.includes(t.triggerId)
    );
  }, [store.triggers, selectedTriggerIds]);

  return (
    <div className="p-6">
      {/* CREATE TRIGGER MODAL */}
      <TriggerModal />

      {/* EXPORT TRIGGER MODAL */}
      <ExportTriggersModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          setSelectedTriggerIds([]); // ✅ Clear only on success
        }}
        selectedTriggers={selectedTriggers}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-900">Triggers</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedTriggerIds.length === 0}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            Export Selected ({selectedTriggerIds.length})
          </button>

          <button
            onClick={openCreateTriggerModal}
            disabled={!store.selectedWorkspaceId}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            New Trigger
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search triggers..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* WORKSPACE WARNING */}
      {!store.selectedWorkspaceId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
          Please select a workspace first.
        </div>
      )}

      {/* LOADING / ERROR */}
      {store.triggersLoading && (
        <p className="text-sm text-gray-500 mt-3">Loading triggers...</p>
      )}

      {store.triggersError && (
        <p className="text-sm text-red-600 mt-3">{store.triggersError}</p>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>

              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Name
              </th>

              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Type
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredTriggers.map((trigger: any) => {
              const isChecked = selectedTriggerIds.includes(trigger.triggerId);

              return (
                <tr
                  key={trigger.triggerId}
                  className={`border-b hover:bg-gray-50 ${isChecked ? "bg-blue-50" : ""
                    }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleTrigger(trigger.triggerId)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-900">
                    {trigger.name}
                    <p className="text-xs text-gray-500">
                      ID: {trigger.triggerId}
                    </p>
                  </td>

                  <td className="px-4 py-3">{trigger.type}</td>
                </tr>
              );
            })}

            {filteredTriggers.length === 0 && !store.triggersLoading && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No triggers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Showing {filteredTriggers.length} trigger(s). Selected{" "}
        {selectedTriggerIds.length}.
      </div>
    </div>
  );
}
// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";

// import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
// import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

// export default function TriggersPage() {
//   const store = useDashboardStore();
//   const { fetchTriggers, openCreateTriggerModal } = useDashboardActions();

//   const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
//   const [showExportModal, setShowExportModal] = useState(false);

//   // Fetch Triggers only when workspace changes
//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchTriggers();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   // Reset selection when workspace changes
//   useEffect(() => {
//     setSelectedTriggerIds([]);
//   }, [store.selectedWorkspaceId]);

//   const allSelected = useMemo(() => {
//     if (store.triggers.length === 0) return false;
//     return selectedTriggerIds.length === store.triggers.length;
//   }, [selectedTriggerIds, store.triggers]);


//   function toggleSelectAll() {
//     if (allSelected) {
//       setSelectedTriggerIds([]);
//     } else {
//       const ids = store.triggers.map((trigger: any) => trigger.triggerId);
//       setSelectedTriggerIds(ids);
//     }
//   }

//   function toggleSingleTrigger(triggerId: string) {
//     setSelectedTriggerIds((prev) => {
//       if (prev.includes(triggerId)) {
//         return prev.filter((id) => id !== triggerId);
//       }
//       return [...prev, triggerId];
//     });
//   }

//   return (
//     <div className="p-6">
//       {/* CREATE TRIGGER MODAL */}
//       <TriggerModal />

//       {/* EXPORT TRIGGER MODAL */}
//       <ExportTriggersModal
//         show={showExportModal}
//         onClose={() => setShowExportModal(false)}
//         selectedTags={store.triggers.filter((t: any) =>
//           selectedTriggerIds.includes(t.triggerId)
//         )}
//       />

//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-5">
//         <h1 className="text-xl font-bold text-gray-900">Triggers</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={() => setShowExportModal(true)}
//             disabled={selectedTriggerIds.length === 0}
//             className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
//           >
//             Export Selected ({selectedTriggerIds.length})
//           </button>

//           <button
//             onClick={openCreateTriggerModal}
//             disabled={!store.selectedWorkspaceId}
//             className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
//           >
//             New Trigger
//           </button>
//         </div>
//       </div>

//       {/* WORKSPACE WARNING */}
//       {!store.selectedWorkspaceId && (
//         <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
//           Please select a workspace first.
//         </div>
//       )}

//       {/* LOADING / ERROR */}
//       {store.triggersLoading && (
//         <p className="text-sm text-gray-500 mt-3">Loading triggers...</p>
//       )}

//       {store.triggersError && (
//         <p className="text-sm text-red-600 mt-3">{store.triggersError}</p>
//       )}

//       {/* TABLE */}
//       <div className="mt-4 bg-white rounded-2xl shadow border overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b">
//             <tr>
//               {/* SELECT ALL */}
//               <th className="px-4 py-3 text-left w-12">
//                 <input
//                   type="checkbox"
//                   checked={allSelected}
//                   onChange={toggleSelectAll}
//                   className="w-4 h-4 cursor-pointer"
//                 />
//               </th>

//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Name
//               </th>

//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Type
//               </th>
//             </tr>
//           </thead>

//           <tbody>
//             {store.triggers.map((trigger: any) => {
//               const isChecked = selectedTriggerIds.includes(trigger.triggerId);

//               return (
//                 <tr
//                   key={trigger.triggerId}
//                   className={`border-b hover:bg-gray-50 ${isChecked ? "bg-blue-50" : ""
//                     }`}
//                 >
//                   {/* CHECKBOX */}
//                   <td className="px-4 py-3">
//                     <input
//                       type="checkbox"
//                       checked={isChecked}
//                       onChange={() => toggleSingleTrigger(trigger.triggerId)}
//                       className="w-4 h-4 cursor-pointer"
//                     />
//                   </td>

//                   <td className="px-4 py-3 font-medium text-gray-900">
//                     {trigger.name}
//                     <p className="text-xs text-gray-500">
//                       ID: {trigger.triggerId}
//                     </p>
//                   </td>

//                   <td className="px-4 py-3">{trigger.type}</td>
//                 </tr>
//               );
//             })}

//             {store.triggers.length === 0 && !store.triggersLoading && (
//               <tr>
//                 <td colSpan={3} className="text-center py-8 text-gray-500">
//                   No triggers found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* FOOTER INFO */}
//       <div className="mt-4 text-xs text-gray-500">
//         Showing {store.triggers.length} trigger(s). Selected{" "}
//         {selectedTriggerIds.length}.
//       </div>
//     </div>
//   );
// }