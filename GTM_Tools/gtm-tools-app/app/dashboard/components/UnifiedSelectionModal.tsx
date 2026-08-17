/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Check, Plus, X, Trash2, Search } from "lucide-react";
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

  // 🔍 SEARCH STATE — one per pane
  const [accountSearch, setAccountSearch] = useState("");
  const [containerSearch, setContainerSearch] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");

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

  const { fetchContainers, fetchWorkspaces, handleSaveWorkspace, handleDeleteWorkspace } = useDashboardActions();

  useEffect(() => {
    if (!show || !selectedAccountId) return;

    setStep("container");
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, selectedAccountId]);

  useEffect(() => {
    if (!show || !selectedContainerId) return;

    setStep("workspace");
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, selectedContainerId]);

  useEffect(() => {
    if (!show) return;

    setStep("account");

    setSelectedAccountId("");
    setSelectedAccountName("");

    setSelectedContainerId("");
    setSelectedContainerName("");

    setSelectedWorkspaceId("");
    setSelectedWorkspaceName("");

    // reset search boxes whenever modal opens
    setAccountSearch("");
    setContainerSearch("");
    setWorkspaceSearch("");

    useDashboardStore.getState().setContainers([]);
    useDashboardStore.getState().setWorkspaces([]);
  }, [setSelectedAccountId, setSelectedAccountName, setSelectedContainerId, setSelectedContainerName, setSelectedWorkspaceId, setSelectedWorkspaceName, show]);

  if (!show) return null;

  const handleAccountSelect = async (account: any) => {
    if (selectedAccountId === account.accountId) return;

    setSelectedAccountId(account.accountId);
    setSelectedAccountName(account.name);

    // reset downstream search when account changes
    setContainerSearch("");
    setWorkspaceSearch("");

    // Hide workspace immediately
    useDashboardStore.getState().setWorkspaces([]);

    // Load containers for the new account
    await fetchContainers();
  };

  const handleContainerSelect = async (container: any) => {
    setSelectedWorkspaceId("");
    setSelectedWorkspaceName("");
    setWorkspaceSearch("");
    if (selectedContainerId === container.containerId) {
      await fetchWorkspaces();
      return;
    }
    setSelectedContainerId(container.containerId);
    setSelectedContainerName(container.name);
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

  // 🔍 FILTERED LISTS — case-insensitive match on name + id fields
  const q = (s: string) => s.trim().toLowerCase();

  const filteredAccounts = accounts.filter((account: any) => {
    if (!accountSearch.trim()) return true;
    const term = q(accountSearch);
    return (
      account.name?.toLowerCase().includes(term) ||
      String(account.accountId ?? "").toLowerCase().includes(term)
    );
  });

  const filteredContainers = containers.filter((container: any) => {
    if (!containerSearch.trim()) return true;
    const term = q(containerSearch);
    return (
      container.name?.toLowerCase().includes(term) ||
      String(container.publicId ?? "").toLowerCase().includes(term) ||
      String(container.containerId ?? "").toLowerCase().includes(term)
    );
  });

  const filteredWorkspaces = workspaces.filter((workspace: any) => {
    if (!workspaceSearch.trim()) return true;
    const term = q(workspaceSearch);
    return workspace.name?.toLowerCase().includes(term);
  });

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
          <Pane
            label="Accounts"
            width="w-[24%]"
            searchValue={accountSearch}
            onSearchChange={setAccountSearch}
            searchPlaceholder="Search accounts…"
          >
            {accountsLoading ? (
              <Hint>Loading accounts…</Hint>
            ) : accounts.length === 0 ? (
              <Hint>No accounts found.</Hint>
            ) : filteredAccounts.length === 0 ? (
              <Hint>No accounts match “{accountSearch}”.</Hint>
            ) : (
              filteredAccounts.map((account: any) => (
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
          <Pane
            label="Containers"
            width="w-[36%]"
            searchValue={containerSearch}
            onSearchChange={setContainerSearch}
            searchPlaceholder="Search containers…"
            searchDisabled={!selectedAccountId}
          >
            {!selectedAccountId ? (
              <Hint>Select an account first.</Hint>
            ) : containersLoading ? (
              <Hint>Loading containers…</Hint>
            ) : containers.length === 0 ? (
              <Hint>No containers found.</Hint>
            ) : filteredContainers.length === 0 ? (
              <Hint>No containers match “{containerSearch}”.</Hint>
            ) : (
              filteredContainers.map((container: any) => (
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
            searchValue={workspaceSearch}
            onSearchChange={setWorkspaceSearch}
            searchPlaceholder="Search workspaces…"
            searchDisabled={!selectedContainerId}
            action={
              selectedContainerId && !isCreatingWorkspace ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCreatingWorkspace(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-accent hover:bg-accent-soft transition-colors"
                  >
                    <Plus size={12} strokeWidth={2.4} />
                    New
                  </button>
                  <button
                    onClick={handleDeleteWorkspace}
                    disabled={!selectedWorkspaceId || workspaceCrudLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-(--danger) hover:bg-(--danger)/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} strokeWidth={2.4} />
                    Delete
                  </button>
                </div>
              ) : undefined
            }
          >
            {!selectedContainerId ? (
              <Hint>Select a container first.</Hint>
            ) : workspacesLoading ? (
              <Hint>Loading workspaces…</Hint>
            ) : workspaces.length === 0 ? (
              <Hint>No workspaces found.</Hint>
            ) : filteredWorkspaces.length === 0 ? (
              <Hint>No workspaces match “{workspaceSearch}”.</Hint>
            ) : (
              filteredWorkspaces.map((workspace: any) => (
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
                    className="btn-primary py-1.5! px-3! flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {workspaceCrudLoading ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingWorkspace(false);
                      setNewWorkspaceName("");
                    }}
                    className="btn-secondary py-1.5! px-3! flex-1 justify-center"
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
          <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
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
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchDisabled,
}: {
  label: string;
  width: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
}) {
  const hasSearch = typeof onSearchChange === "function";

  return (
    <div className={`${width} flex flex-col border-r border-line last:border-r-0 overflow-hidden`}>
      <div className="px-4 py-2.5 border-b border-line bg-card-hi flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-faint font-semibold">
          {label}
        </span>
        {action}
      </div>

      {/* 🔍 SEARCH BAR */}
      {hasSearch && (
        <div className="px-2 pt-2">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none z-10"
            />
            <input
              type="text"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder ?? "Search…"}
              disabled={searchDisabled}
              className="w-full bg-card border border-line rounded-md text-[12.5px] py-1.5! pl-9! pr-8! outline-none focus:border-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {searchValue ? (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-fg transition-colors"
                aria-label="Clear search"
              >
                <X size={12} strokeWidth={2.2} />
              </button>
            ) : null}
          </div>
        </div>
      )}

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
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${active
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