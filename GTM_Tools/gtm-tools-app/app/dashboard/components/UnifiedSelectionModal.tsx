/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { useGtmAccounts } from "@/hooks/useGtmAccounts";

interface Props {
  show: boolean;
  onClose: () => void;
}

export default function UnifiedSelectionModal({ show, onClose }: Props) {
  const [, setStep] = useState<"account" | "container" | "workspace">("account");

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const { accounts, loading: accountsLoading } = useGtmAccounts();

  const {
    selectedAccountId,
    setSelectedAccountId,
    selectedContainerId,
    setSelectedContainerId,
    selectedWorkspaceId,
    setSelectedWorkspaceId,

    containers,
    containersLoading,

    workspaces,
    workspacesLoading,

    workspaceCrudLoading,
    setWorkspaceNameInput,
  } = useDashboardStore();

  const { fetchContainers, fetchWorkspaces, handleSaveWorkspace } =
    useDashboardActions();

  // Fetch containers when account selected
  useEffect(() => {
    if (selectedAccountId) {
      setStep("container");
      fetchContainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // Fetch workspaces when container selected
  useEffect(() => {
    if (selectedContainerId && selectedAccountId) {
      setStep("workspace");
      fetchWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContainerId, selectedAccountId]);

  if (!show) return null;

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId(containerId);
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    onClose();
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      setWorkspaceNameInput(newWorkspaceName.trim());
      await handleSaveWorkspace();

      setNewWorkspaceName("");
      setIsCreatingWorkspace(false);

      await fetchWorkspaces();
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-6xl h-[80vh] rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        {/* TOP NAVBAR */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">All</h2>
            <h2 className="text-sm font-medium text-gray-500">Favourites</h2>
            <h2 className="text-sm font-medium text-gray-500">Recent</h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL (ACCOUNTS) */}
          <div className="w-[25%] border-r bg-gray-50 overflow-y-auto">
            <div className="px-4 py-3 border-b bg-white font-semibold text-sm text-gray-700">
              Tag Manager Accounts
            </div>

            <div className="p-2 space-y-1">
              {accountsLoading ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  Loading accounts...
                </p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  No accounts found
                </p>
              ) : (
                accounts.map((account: any) => (
                  <button
                    key={account.accountId}
                    onClick={() => handleAccountSelect(account.accountId)}
                    className={`w-full flex justify-between items-center px-3 py-3 rounded-md text-left text-sm font-medium transition ${
                      selectedAccountId === account.accountId
                        ? "bg-blue-100 text-blue-800"
                        : "hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-xs text-gray-500">
                        {account.accountId}
                      </p>
                    </div>

                    <span className="text-gray-400">{">"}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* MIDDLE PANEL (CONTAINERS) */}
          <div className="w-[40%] border-r bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b bg-white font-semibold text-sm text-gray-700">
              Containers
            </div>

            <div className="p-2 space-y-1">
              {!selectedAccountId ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  Select an account first
                </p>
              ) : containersLoading ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  Loading containers...
                </p>
              ) : containers.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  No containers found
                </p>
              ) : (
                containers.map((container: any) => (
                  <button
                    key={container.containerId}
                    onClick={() => handleContainerSelect(container.containerId)}
                    className={`w-full flex justify-between items-center px-3 py-3 rounded-md text-left text-sm font-medium transition ${
                      selectedContainerId === container.containerId
                        ? "bg-gray-100 border border-gray-300"
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{container.name}</p>
                      <p className="text-xs text-gray-500">
                        {container.publicId || container.containerId}
                      </p>
                    </div>

                    {selectedContainerId === container.containerId && (
                      <span className="text-green-600 font-bold">✔</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL (WORKSPACES) */}
          <div className="flex-1 bg-white overflow-y-auto">
            <div className="px-4 py-3 border-b bg-white font-semibold text-sm text-gray-700 flex justify-between items-center">
              <span>Workspaces</span>

              {selectedContainerId && !isCreatingWorkspace && (
                <button
                  onClick={() => setIsCreatingWorkspace(true)}
                  className="text-xs font-semibold px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  + New Workspace
                </button>
              )}
            </div>

            <div className="p-2 space-y-1">
              {!selectedContainerId ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  Select a container first
                </p>
              ) : workspacesLoading ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  Loading workspaces...
                </p>
              ) : workspaces.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-2">
                  No workspaces found
                </p>
              ) : (
                workspaces.map((workspace: any) => (
                  <button
                    key={workspace.workspaceId}
                    onClick={() => handleWorkspaceSelect(workspace.workspaceId)}
                    className={`w-full flex justify-between items-center px-3 py-3 rounded-md text-left text-sm font-medium transition ${
                      selectedWorkspaceId === workspace.workspaceId
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 text-gray-800"
                    }`}
                  >
                    <span>{workspace.name}</span>

                    {selectedWorkspaceId === workspace.workspaceId && (
                      <span className="font-bold">✔</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* CREATE WORKSPACE FORM */}
            {isCreatingWorkspace && (
              <div className="p-4 border-t bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Create Workspace
                </h3>

                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={workspaceCrudLoading || !newWorkspaceName.trim()}
                    className="flex-1 px-3 py-2 text-sm font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
                  >
                    {workspaceCrudLoading ? "Creating..." : "Create"}
                  </button>

                  <button
                    onClick={() => setIsCreatingWorkspace(false)}
                    className="flex-1 px-3 py-2 text-sm font-semibold border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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