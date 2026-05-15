"use client";

import { X } from "lucide-react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

export default function WorkspaceCrudModal() {
  const store = useDashboardStore();
  const { handleSaveWorkspace } = useDashboardActions();

  if (!store.showWorkspaceModal) return null;

  const isCreate = store.workspaceModalMode === "create";
  const atLimit = store.workspaces.length >= 3 && isCreate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={() => store.setShowWorkspaceModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-fg w-full max-w-lg rounded-xl shadow-lg border border-edge overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="text-[15px] font-semibold text-fg">
            {isCreate ? "Create workspace" : "Edit workspace"}
          </h2>
          <button
            onClick={() => store.setShowWorkspaceModal(false)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi transition-colors"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-fg mb-2">
              Workspace name
            </label>
            <input
              value={store.workspaceNameInput}
              onChange={(e) => store.setWorkspaceNameInput(e.target.value)}
              placeholder="Enter workspace name…"
              className="w-full bg-page-soft"
              autoFocus
            />
          </div>

          {atLimit && (
            <p className="text-[12px] text-(--danger) flex items-start gap-1.5">
              <span aria-hidden>⚠</span>
              You can only create a maximum of 3 workspaces.
            </p>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-end gap-2">
          <button
            onClick={() => store.setShowWorkspaceModal(false)}
            disabled={store.workspaceCrudLoading}
            className="btn-secondary py-1.5! px-3! disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveWorkspace}
            disabled={store.workspaceCrudLoading || atLimit}
            className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {store.workspaceCrudLoading
              ? "Saving…"
              : isCreate
              ? "Create workspace"
              : "Update workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
