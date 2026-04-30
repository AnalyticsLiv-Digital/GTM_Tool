/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import VariableModal from "@/app/dashboard/components/modals/VariableModal";
import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

const variableTypeMap: Record<string, string> = {
  v: "Constant",
  c: "Cookie",
  e: "Data Layer Variable",
  jsm: "Custom JavaScript",
  dom: "DOM Element",
  u: "URL",
  aev: "Auto-Event Variable",
  j: "JavaScript Variable",
  r: "Random Number",
  ctv: "Container Version Number",
  dbg: "Debug Mode",
  d: "Event",
  f: "First Party Collection",
  g: "Google Analytics Settings",
  gas: "Google Analytics Settings Variable",
  gtm: "Google Tag Manager",
  hid: "HTTP Referrer",
  k: "Lookup Table",
  smm: "Session Storage",
  l: "Local Storage",
  remm: "Regex Table",
  vjs: "Custom JavaScript Variable",
  vis: "Visitor Region",
  tc: "Traffic Source",
  tel: "Element Visibility",
  ec: "Element Clicks",
  eh: "Element History",
  ev: "Element Visibility Trigger Variable",
  aud: "Audience Variable",
  fp: "First Party Cookie",
  pd: "Page Data",
  ua: "Universal Analytics Variable",
  gclid: "Google Click ID",
  ga4: "GA4 Settings Variable",
  opt: "Google Optimize Variable",
  fpc: "First Party Cookie Variable",
  user: "User-Defined Variable",
  cs: "Custom Template Variable",
};

export default function VariablesPage() {
  const store = useDashboardStore();
  const { fetchVariables, openCreateVariableModal } = useDashboardActions();

  const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchVariables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  useEffect(() => {
    setSelectedVariableIds([]);
  }, [store.selectedWorkspaceId]);

  const filteredVariables = useMemo(() => {
    return store.variables.filter((variable: any) =>
      variable.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [store.variables, searchText]);

  const allSelected = useMemo(() => {
    if (filteredVariables.length === 0) return false;
    return selectedVariableIds.length === filteredVariables.length;
  }, [selectedVariableIds, filteredVariables]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedVariableIds([]);
    } else {
      const ids = filteredVariables.map((v: any) => v.variableId);
      setSelectedVariableIds(ids);
    }
  }

  function toggleSingleVariable(variableId: string) {
    setSelectedVariableIds((prev) => {
      if (prev.includes(variableId)) {
        return prev.filter((id) => id !== variableId);
      }
      return [...prev, variableId];
    });
  }

  const selectedVariables = useMemo(() => {
    return store.variables.filter((v: any) =>
      selectedVariableIds.includes(v.variableId)
    );
  }, [store.variables, selectedVariableIds]);

  return (
    <div className="p-6">
      {/* CREATE VARIABLE MODAL */}
      <VariableModal />

      {/* EXPORT VARIABLE MODAL */}
      <ExportVariablesModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          setSelectedVariableIds([]);
          setShowExportModal(false);
        }}
        selectedVariables={selectedVariables}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Variables
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all GTM variables inside your selected workspace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedVariableIds.length === 0}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            Export Selected ({selectedVariableIds.length})
          </button>

          <button
            onClick={openCreateVariableModal}
            disabled={!store.selectedWorkspaceId}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            + New Variable
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search variables..."
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
      {store.variablesLoading && (
        <p className="text-sm text-slate-500 mt-3">Loading variables...</p>
      )}

      {store.variablesError && (
        <p className="text-sm text-red-600 mt-3">{store.variablesError}</p>
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
                Variable Name
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Variable Type
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredVariables.map((variable: any) => {
              const isChecked = selectedVariableIds.includes(
                variable.variableId
              );

              return (
                <tr
                  key={variable.variableId}
                  className={`border-b border-slate-100 hover:bg-indigo-50/40 transition ${
                    isChecked ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        toggleSingleVariable(variable.variableId)
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {variable.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Variable ID: {variable.variableId}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {variableTypeMap[variable.type] ||
                        variable.type ||
                        "Unknown"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredVariables.length === 0 && !store.variablesLoading && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-500">
                  No variables found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-slate-500">
        Showing {filteredVariables.length} variable(s). Selected{" "}
        {selectedVariableIds.length}.
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";

// import VariableModal from "@/app/dashboard/components/modals/VariableModal";
// import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

// const variableTypeMap: Record<string, string> = {
//   v: "Constant",
//   c: "Cookie",
//   e: "Data Layer Variable",
//   jsm: "Custom JavaScript",
//   dom: "DOM Element",
//   u: "URL",
//   aev: "Auto-Event Variable",
//   j: "JavaScript Variable",
//   r: "Random Number",
//   ctv: "Container Version Number",
//   dbg: "Debug Mode",
//   d: "Event",
//   f: "First Party Collection",
//   g: "Google Analytics Settings",
//   gas: "Google Analytics Settings Variable",
//   gtm: "Google Tag Manager",
//   hid: "HTTP Referrer",
//   k: "Lookup Table",
//   smm: "Session Storage",
//   l: "Local Storage",
//   remm: "Regex Table",
//   vjs: "Custom JavaScript Variable",
//   vis: "Visitor Region",
//   tc: "Traffic Source",
//   tel: "Element Visibility",
//   ec: "Element Clicks",
//   eh: "Element History",
//   ev: "Element Visibility Trigger Variable",
//   aud: "Audience Variable",
//   fp: "First Party Cookie",
//   pd: "Page Data",
//   ua: "Universal Analytics Variable",
//   gclid: "Google Click ID",
//   ga4: "GA4 Settings Variable",
//   opt: "Google Optimize Variable",
//   fpc: "First Party Cookie Variable",
//   user: "User-Defined Variable",
//   cs: "Custom Template Variable",
// };

// export default function VariablesPage() {
//   const store = useDashboardStore();
//   const { fetchVariables, openCreateVariableModal } = useDashboardActions();

//   const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>([]);
//   const [showExportModal, setShowExportModal] = useState(false);

//   const [searchText, setSearchText] = useState("");

//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchVariables();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   useEffect(() => {
//     setSelectedVariableIds([]);
//   }, [store.selectedWorkspaceId]);

//   const filteredVariables = useMemo(() => {
//     return store.variables.filter((variable: any) =>
//       variable.name?.toLowerCase().includes(searchText.toLowerCase())
//     );
//   }, [store.variables, searchText]);

//   const allSelected = useMemo(() => {
//     if (filteredVariables.length === 0) return false;
//     return selectedVariableIds.length === filteredVariables.length;
//   }, [selectedVariableIds, filteredVariables]);

//   function toggleSelectAll() {
//     if (allSelected) {
//       setSelectedVariableIds([]);
//     } else {
//       const ids = filteredVariables.map((v: any) => v.variableId);
//       setSelectedVariableIds(ids);
//     }
//   }

//   function toggleSingleVariable(variableId: string) {
//     setSelectedVariableIds((prev) => {
//       if (prev.includes(variableId)) {
//         return prev.filter((id) => id !== variableId);
//       }
//       return [...prev, variableId];
//     });
//   }

//   const selectedVariables = useMemo(() => {
//     return store.variables.filter((v: any) =>
//       selectedVariableIds.includes(v.variableId)
//     );
//   }, [store.variables, selectedVariableIds]);

//   return (
//     <div className="p-6">
//       {/* CREATE VARIABLE MODAL */}
//       <VariableModal />

//       {/* EXPORT VARIABLE MODAL */}
//       <ExportVariablesModal
//         show={showExportModal}
//         onClose={() => setShowExportModal(false)}
//         onExportSuccess={() => {
//           setSelectedVariableIds([]); // ✅ clear only if export success
//           setShowExportModal(false);
//         }}
//         selectedVariables={selectedVariables}
//       />

//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-5">
//         <h1 className="text-xl font-bold text-gray-900">Variables</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={() => setShowExportModal(true)}
//             disabled={selectedVariableIds.length === 0}
//             className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
//           >
//             Export Selected ({selectedVariableIds.length})
//           </button>

//           <button
//             onClick={openCreateVariableModal}
//             disabled={!store.selectedWorkspaceId}
//             className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
//           >
//             New Variable
//           </button>
//         </div>
//       </div>

//       {/* SEARCH */}
//       <div className="mb-4">
//         <input
//           type="text"
//           placeholder="Search variables..."
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
//       {store.variablesLoading && (
//         <p className="text-sm text-gray-500 mt-3">Loading variables...</p>
//       )}

//       {store.variablesError && (
//         <p className="text-sm text-red-600 mt-3">{store.variablesError}</p>
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
//             {filteredVariables.map((variable: any) => {
//               const isChecked = selectedVariableIds.includes(
//                 variable.variableId
//               );

//               return (
//                 <tr
//                   key={variable.variableId}
//                   className={`border-b hover:bg-gray-50 ${
//                     isChecked ? "bg-blue-50" : ""
//                   }`}
//                 >
//                   <td className="px-4 py-3">
//                     <input
//                       type="checkbox"
//                       checked={isChecked}
//                       onChange={() =>
//                         toggleSingleVariable(variable.variableId)
//                       }
//                       className="w-4 h-4 cursor-pointer"
//                     />
//                   </td>

//                   <td className="px-4 py-3 font-medium text-gray-900">
//                     {variable.name}
//                     <p className="text-xs text-gray-500">
//                       ID: {variable.variableId}
//                     </p>
//                   </td>

//                   <td className="px-4 py-3">
//                     <p className="font-medium text-gray-900">
//                       {variableTypeMap[variable.type] ||
//                         variable.type ||
//                         "Unknown"}
//                     </p>
//                   </td>
//                 </tr>
//               );
//             })}

//             {filteredVariables.length === 0 && !store.variablesLoading && (
//               <tr>
//                 <td colSpan={3} className="text-center py-8 text-gray-500">
//                   No variables found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-4 text-xs text-gray-500">
//         Showing {filteredVariables.length} variable(s). Selected{" "}
//         {selectedVariableIds.length}.
//       </div>
//     </div>
//   );
// }