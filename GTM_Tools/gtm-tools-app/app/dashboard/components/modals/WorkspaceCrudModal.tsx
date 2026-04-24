 
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

export default function WorkspaceCrudModal() {
  const store = useDashboardStore();
  const { handleSaveWorkspace } = useDashboardActions();

  if (!store.showWorkspaceModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {store.workspaceModalMode === "create"
              ? "Create Workspace"
              : "Edit Workspace"}
          </h2>

          <button
            onClick={() => store.setShowWorkspaceModal(false)}
            className="text-gray-500 hover:text-gray-900 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Workspace Name
            </label>

            <input
              value={store.workspaceNameInput}
              onChange={(e) => store.setWorkspaceNameInput(e.target.value)}
              placeholder="Enter workspace name..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {store.workspaces.length >= 3 && store.workspaceModalMode === "create" && (
            <p className="text-xs text-red-600">
              You can only create maximum 3 workspaces.
            </p>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
          <button
            onClick={() => store.setShowWorkspaceModal(false)}
            disabled={store.workspaceCrudLoading}
            className="px-4 py-2 text-sm font-semibold rounded border hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveWorkspace}
            disabled={store.workspaceCrudLoading}
            className="px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {store.workspaceCrudLoading
              ? "Saving..."
              : store.workspaceModalMode === "create"
              ? "Create Workspace"
              : "Update Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}