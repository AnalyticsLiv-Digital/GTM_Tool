/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Check, Plus, X } from "lucide-react";
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
    setSelectedAccountName,
    setSelectedContainerName,
    setSelectedWorkspaceName,
    containers,
    containersLoading,
    workspaces,
    workspacesLoading,
    workspaceCrudLoading,
    setWorkspaceNameInput,
  } = useDashboardStore();

  const { fetchContainers, fetchWorkspaces, handleSaveWorkspace } = useDashboardActions();

  useEffect(() => {
    if (selectedAccountId) {
      setStep("container");
      fetchContainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedContainerId && selectedAccountId) {
      setStep("workspace");
      fetchWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContainerId, selectedAccountId]);

  if (!show) return null;

  const handleAccountSelect = (account: any) => {
    setSelectedAccountId(account.accountId);
    setSelectedAccountName(account.name);
    setSelectedContainerId("");
    setSelectedContainerName("");
    setSelectedWorkspaceId("");
    setSelectedWorkspaceName("");
  };

  const handleContainerSelect = (container: any) => {
    setSelectedContainerId(container.containerId);
    setSelectedContainerName(container.name);
    setSelectedWorkspaceId("");
    setSelectedWorkspaceName("");
  };

  const handleWorkspaceSelect = (workspace: any) => {
    setSelectedWorkspaceId(workspace.workspaceId);
    setSelectedWorkspaceName(workspace.name);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-fg w-full max-w-6xl h-[80vh] rounded-xl shadow-lg border border-edge overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line">
          <div className="flex items-center gap-5">
            <h2 className="text-[14px] font-semibold text-fg">Select workspace</h2>
            <span className="text-[11px] text-faint">
              Pick an account, container, then workspace.
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi transition-colors"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* THREE-PANE BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT — ACCOUNTS */}
          <Pane label="Accounts" width="w-[24%]">
            {accountsLoading ? (
              <Hint>Loading accounts…</Hint>
            ) : accounts.length === 0 ? (
              <Hint>No accounts found.</Hint>
            ) : (
              accounts.map((account: any) => (
                <PaneButton
                  key={account.accountId}
                  active={selectedAccountId === account.accountId}
                  onClick={() => handleAccountSelect(account)}
                  trailing={<ChevronRight size={13} strokeWidth={2} className="text-faint" />}
                  primary={account.name}
                  secondary={account.accountId}
                />
              ))
            )}
          </Pane>

          {/* MIDDLE — CONTAINERS */}
          <Pane label="Containers" width="w-[36%]">
            {!selectedAccountId ? (
              <Hint>Select an account first.</Hint>
            ) : containersLoading ? (
              <Hint>Loading containers…</Hint>
            ) : containers.length === 0 ? (
              <Hint>No containers found.</Hint>
            ) : (
              containers.map((container: any) => (
                <PaneButton
                  key={container.containerId}
                  active={selectedContainerId === container.containerId}
                  onClick={() => handleContainerSelect(container)}
                  trailing={
                    selectedContainerId === container.containerId ? (
                      <Check size={13} strokeWidth={2.5} className="text-accent" />
                    ) : (
                      <ChevronRight size={13} strokeWidth={2} className="text-faint" />
                    )
                  }
                  primary={container.name}
                  secondary={container.publicId || container.containerId}
                />
              ))
            )}
          </Pane>

          {/* RIGHT — WORKSPACES */}
          <Pane
            label="Workspaces"
            width="flex-1"
            action={
              selectedContainerId && !isCreatingWorkspace ? (
                <button
                  onClick={() => setIsCreatingWorkspace(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-accent hover:bg-accent-soft transition-colors"
                >
                  <Plus size={12} strokeWidth={2.4} />
                  New
                </button>
              ) : undefined
            }
          >
            {!selectedContainerId ? (
              <Hint>Select a container first.</Hint>
            ) : workspacesLoading ? (
              <Hint>Loading workspaces…</Hint>
            ) : workspaces.length === 0 ? (
              <Hint>No workspaces found.</Hint>
            ) : (
              workspaces.map((workspace: any) => (
                <PaneButton
                  key={workspace.workspaceId}
                  active={selectedWorkspaceId === workspace.workspaceId}
                  onClick={() => handleWorkspaceSelect(workspace)}
                  trailing={
                    selectedWorkspaceId === workspace.workspaceId ? (
                      <Check size={13} strokeWidth={2.5} className="text-accent" />
                    ) : null
                  }
                  primary={workspace.name}
                />
              ))
            )}

            {/* CREATE WORKSPACE FORM */}
            {isCreatingWorkspace && (
              <div className="mt-3 p-3 rounded-lg bg-card-hi border border-line">
                <p className="text-[12px] font-medium text-fg mb-2">Create workspace</p>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full bg-card text-[13px] py-2"
                  autoFocus
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={workspaceCrudLoading || !newWorkspaceName.trim()}
                    className="btn-primary !py-1.5 !px-3 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {workspaceCrudLoading ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingWorkspace(false);
                      setNewWorkspaceName("");
                    }}
                    className="btn-secondary !py-1.5 !px-3 flex-1 justify-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Pane>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary !py-1.5 !px-3">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────── helpers */

function Pane({
  label,
  width,
  action,
  children,
}: {
  label: string;
  width: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`${width} flex flex-col border-r border-line last:border-r-0 overflow-hidden`}>
      <div className="px-4 py-2.5 border-b border-line bg-card-hi flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-faint font-semibold">
          {label}
        </span>
        {action}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">{children}</div>
    </div>
  );
}

function PaneButton({
  active,
  onClick,
  primary,
  secondary,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  primary: string;
  secondary?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
        active
          ? "bg-accent-soft border border-accent/25"
          : "hover:bg-card-hi border border-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] truncate ${active ? "text-accent font-medium" : "text-fg"}`}>
          {primary}
        </p>
        {secondary && (
          <p className="text-[11px] font-mono text-faint truncate mt-0.5">{secondary}</p>
        )}
      </div>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] text-faint px-3 py-2">{children}</p>;
}
