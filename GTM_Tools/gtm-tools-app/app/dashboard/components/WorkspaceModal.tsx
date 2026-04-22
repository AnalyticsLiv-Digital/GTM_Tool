/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

export default function WorkspaceModal({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const {
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaces,
    workspacesLoading,
    workspacesError,
    selectedContainerId,
    workspaceCrudLoading,
  } = useDashboardStore();

  // ✅ CRUD functions stay in this modal
  const {
    fetchWorkspaces,
    openCreateWorkspaceModal,
    openEditWorkspaceModal,
    handleDeleteWorkspace,
  } = useDashboardActions();

  useEffect(() => {
    if (show && selectedContainerId) {
      fetchWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, selectedContainerId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            Select Workspace
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <button
              disabled={workspaceCrudLoading || workspaces.length >= 3}
              onClick={openCreateWorkspaceModal}
              className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              + New Workspace
            </button>

            <button
              disabled={workspaceCrudLoading || !selectedWorkspaceId}
              onClick={openEditWorkspaceModal}
              className="px-4 py-2 text-sm font-semibold border rounded hover:bg-gray-100 disabled:bg-gray-200"
            >
              Edit
            </button>

            <button
              disabled={workspaceCrudLoading || !selectedWorkspaceId}
              onClick={handleDeleteWorkspace}
              className="px-4 py-2 text-sm font-semibold border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:bg-gray-200"
            >
              Delete
            </button>
          </div>

          <select
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            disabled={workspacesLoading}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="" disabled>
              -- Select Workspace --
            </option>

            {workspaces.map((w: any) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.name}
              </option>
            ))}
          </select>

          {workspacesLoading && (
            <p className="text-xs text-gray-500 mt-2">Fetching workspaces...</p>
          )}

          {workspacesError && (
            <p className="text-xs text-red-600 mt-2">{workspacesError}</p>
          )}

          {workspaces.length >= 3 && (
            <p className="text-xs text-orange-600 mt-2">
              You can only create maximum 3 workspaces (default + 2 custom).
            </p>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded border hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";

// export default function WorkspaceModal({
//   show,
//   onClose,
// }: {
//   show: boolean;
//   onClose: () => void;
// }) {
//   const {
//     selectedWorkspaceId,
//     setSelectedWorkspaceId,
//     workspaces,
//     workspacesLoading,
//     workspacesError,
//     fetchWorkspaces,
//     selectedContainerId,
//   } = useDashboardStore();

//   useEffect(() => {
//     if (show && selectedContainerId) {
//       fetchWorkspaces();
//     }
//   }, [show, selectedContainerId, fetchWorkspaces]);

//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//       <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
//         <div className="flex justify-between items-center mb-5">
//           <h2 className="text-xl font-bold text-gray-900">
//             Select Workspace
//           </h2>

//           <button
//             onClick={onClose}
//             className="text-gray-600 hover:text-gray-900 font-bold"
//           >
//             ✕
//           </button>
//         </div>

//         <select
//           value={selectedWorkspaceId}
//           onChange={(e) => setSelectedWorkspaceId(e.target.value)}
//           disabled={workspacesLoading}
//           className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
//         >
//           <option value="" disabled>
//             -- Select Workspace --
//           </option>

//           {workspaces.map((w: any) => (
//             <option key={w.workspaceId} value={w.workspaceId}>
//               {w.name}
//             </option>
//           ))}
//         </select>

//         {workspacesLoading && (
//           <p className="text-xs text-gray-500 mt-2">Fetching workspaces...</p>
//         )}

//         {workspacesError && (
//           <p className="text-xs text-red-600 mt-2">{workspacesError}</p>
//         )}

//         <div className="flex justify-end mt-6">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }