/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";

interface Props {
  show: boolean;
  onClose: () => void;
}

export default function WorkspacePopup({ show, onClose }: Props) {
  const {
    workspaces,
    workspacesLoading,
    workspacesError,
    selectedWorkspaceId,
    setSelectedWorkspaceId,

    openCreateWorkspaceModal,
    openEditWorkspaceModal,
    handleDeleteWorkspace,
  } = useDashboardStore();

  const selectedWorkspace = useMemo(() => {
    return workspaces.find((w: any) => w.workspaceId === selectedWorkspaceId);
  }, [workspaces, selectedWorkspaceId]);

  // Auto select first workspace if none selected
  useEffect(() => {
    if (show && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].workspaceId);
    }
  }, [show, workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999">
      <div className="bg-white w-225 max-w-[95vw] h-130 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Workspaces
            </h2>

            <span className="text-xs text-gray-500">
              (Max 3 Workspaces)
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-sm font-semibold"
          >
            ✕ Close
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT COLUMN - WORKSPACE LIST */}
          <div className="w-65 border-r bg-gray-50 overflow-y-auto">
            <div className="px-4 py-3 border-b bg-white">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Workspaces
              </p>
            </div>

            {workspacesLoading && (
              <p className="p-4 text-sm text-gray-500">Loading workspaces...</p>
            )}

            {workspacesError && (
              <p className="p-4 text-sm text-red-600">{workspacesError}</p>
            )}

            {!workspacesLoading && workspaces.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No workspaces found.</p>
            )}

            <div className="divide-y">
              {workspaces.map((ws: any) => {
                const active = ws.workspaceId === selectedWorkspaceId;

                return (
                  <button
                    key={ws.workspaceId}
                    onClick={() => setSelectedWorkspaceId(ws.workspaceId)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition ${
                      active ? "bg-blue-50 border-l-4 border-blue-600" : ""
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        active ? "text-blue-700" : "text-gray-800"
                      }`}
                    >
                      {ws.name}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      ID: {ws.workspaceId}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN - DETAILS */}
          <div className="flex-1 overflow-y-auto">
            {/* TOP TOOLBAR LIKE GTM */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div>
                <p className="text-xs text-gray-500">Selected Workspace</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedWorkspace?.name || "No workspace selected"}
                </h3>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={openCreateWorkspaceModal}
                  className="px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Create
                </button>

                <button
                  onClick={openEditWorkspaceModal}
                  disabled={!selectedWorkspaceId}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Edit
                </button>

                <button
                  onClick={handleDeleteWorkspace}
                  disabled={!selectedWorkspaceId}
                  className="px-3 py-2 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* DETAILS SECTION */}
            <div className="p-6">
              {!selectedWorkspace && (
                <p className="text-gray-500 text-sm">
                  Please select a workspace from the left panel.
                </p>
              )}

              {selectedWorkspace && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs text-gray-500">Workspace Name</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedWorkspace.name}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs text-gray-500">Workspace ID</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedWorkspace.workspaceId}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-xs text-gray-500">Path</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">
                      {selectedWorkspace.path}
                    </p>
                  </div>

                  {/* EXTRA INFO LIKE GTM */}
                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
                      Workspace Settings
                    </p>

                    <p className="text-sm text-gray-600">
                      Workspace changes will be tracked here.
                      You can create tags, triggers, and variables inside this workspace.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Total Workspaces:{" "}
            <span className="font-semibold text-gray-800">
              {workspaces.length}/3
            </span>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-gray-200 rounded hover:bg-gray-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}