/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

const triggerTypeMap: Record<string, string> = {
  PAGEVIEW: "Page View",
  DOM_READY: "DOM Ready",
  WINDOW_LOADED: "Window Loaded",
  CLICK: "Click",
  LINK_CLICK: "Link Click",
  FORM_SUBMISSION: "Form Submission",
  HISTORY_CHANGE: "History Change",
  CUSTOM_EVENT: "Custom Event",
  TIMER: "Timer",
  SCROLL_DEPTH: "Scroll Depth",
  ELEMENT_VISIBILITY: "Element Visibility",
  YOUTUBE_VIDEO: "YouTube Video",
};

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
          setSelectedTriggerIds([]);
          setShowExportModal(false);
        }}
        selectedTriggers={selectedTriggers}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Triggers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all GTM triggers inside your selected workspace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedTriggerIds.length === 0}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            Export Selected ({selectedTriggerIds.length})
          </button>

          <button
            onClick={openCreateTriggerModal}
            disabled={!store.selectedWorkspaceId}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            + New Trigger
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search triggers..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* WORKSPACE WARNING */}
      {!store.selectedWorkspaceId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-2xl text-sm">
          Please select a workspace first.
        </div>
      )}

      {/* LOADING / ERROR */}
      {store.triggersLoading && (
        <p className="text-sm text-slate-500 mt-3">Loading triggers...</p>
      )}

      {store.triggersError && (
        <p className="text-sm text-red-600 mt-3">{store.triggersError}</p>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Trigger Name
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Trigger Type
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredTriggers.map((trigger: any) => {
              const isChecked = selectedTriggerIds.includes(trigger.triggerId);

              return (
                <tr
                  key={trigger.triggerId}
                  className={`border-b border-slate-100 hover:bg-indigo-50/40 transition ${
                    isChecked ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleTrigger(trigger.triggerId)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {trigger.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Trigger ID: {trigger.triggerId}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {triggerTypeMap[trigger.type] ||
                        trigger.type ||
                        "Unknown"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredTriggers.length === 0 && !store.triggersLoading && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-500">
                  No triggers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-slate-500">
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

// const triggerTypeMap: Record<string, string> = {
//   PAGEVIEW: "Page View",
//   DOM_READY: "DOM Ready",
//   WINDOW_LOADED: "Window Loaded",
//   CLICK: "Click",
//   LINK_CLICK: "Link Click",
//   FORM_SUBMISSION: "Form Submission",
//   HISTORY_CHANGE: "History Change",
//   CUSTOM_EVENT: "Custom Event",
//   TIMER: "Timer",
//   SCROLL_DEPTH: "Scroll Depth",
//   ELEMENT_VISIBILITY: "Element Visibility",
//   YOUTUBE_VIDEO: "YouTube Video",
// };

// export default function TriggersPage() {
//   const store = useDashboardStore();
//   const { fetchTriggers, openCreateTriggerModal } = useDashboardActions();

//   const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
//   const [showExportModal, setShowExportModal] = useState(false);

//   const [searchText, setSearchText] = useState("");

//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchTriggers();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   useEffect(() => {
//     setSelectedTriggerIds([]);
//   }, [store.selectedWorkspaceId]);

//   const filteredTriggers = useMemo(() => {
//     return store.triggers.filter((trigger: any) =>
//       trigger.name?.toLowerCase().includes(searchText.toLowerCase())
//     );
//   }, [store.triggers, searchText]);

//   const allSelected = useMemo(() => {
//     if (filteredTriggers.length === 0) return false;
//     return selectedTriggerIds.length === filteredTriggers.length;
//   }, [selectedTriggerIds, filteredTriggers]);

//   function toggleSelectAll() {
//     if (allSelected) {
//       setSelectedTriggerIds([]);
//     } else {
//       const ids = filteredTriggers.map((trigger: any) => trigger.triggerId);
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

//   const selectedTriggers = useMemo(() => {
//     return store.triggers.filter((t: any) =>
//       selectedTriggerIds.includes(t.triggerId)
//     );
//   }, [store.triggers, selectedTriggerIds]);

//   return (
//     <div className="p-6">
//       {/* CREATE TRIGGER MODAL */}
//       <TriggerModal />

//       {/* EXPORT TRIGGER MODAL */}
//       <ExportTriggersModal
//         show={showExportModal}
//         onClose={() => setShowExportModal(false)}
//         onExportSuccess={() => {
//           setSelectedTriggerIds([]); // ✅ Clear only on success
//           setShowExportModal(false);
//         }}
//         selectedTriggers={selectedTriggers}
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

//       {/* SEARCH */}
//       <div className="mb-4">
//         <input
//           type="text"
//           placeholder="Search triggers..."
//           value={searchText}
//           onChange={(e) => setSearchText(e.target.value)}
//           className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
//         />
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
//             {filteredTriggers.map((trigger: any) => {
//               const isChecked = selectedTriggerIds.includes(trigger.triggerId);

//               return (
//                 <tr
//                   key={trigger.triggerId}
//                   className={`border-b hover:bg-gray-50 ${
//                     isChecked ? "bg-blue-50" : ""
//                   }`}
//                 >
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

//                   <td className="px-4 py-3">
//                     <p className="font-medium text-gray-900">
//                       {triggerTypeMap[trigger.type] ||
//                         trigger.type ||
//                         "Unknown"}
//                     </p>
//                   </td>
//                 </tr>
//               );
//             })}

//             {filteredTriggers.length === 0 && !store.triggersLoading && (
//               <tr>
//                 <td colSpan={3} className="text-center py-8 text-gray-500">
//                   No triggers found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-4 text-xs text-gray-500">
//         Showing {filteredTriggers.length} trigger(s). Selected{" "}
//         {selectedTriggerIds.length}.
//       </div>
//     </div>
//   );
// }