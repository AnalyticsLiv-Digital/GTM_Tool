/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/ui/dialog";

export default function WorkspaceCrudSection({
  selectedAccountId,
  selectedContainerId,
  selectedWorkspaceId,
  setSelectedWorkspaceId,
  workspaces,
  setWorkspaces,
}: {
  selectedAccountId: string;
  selectedContainerId: string;
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: (val: string) => void;
  workspaces: any[];
  setWorkspaces: (ws: any[]) => void;
}) {
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceCrudLoading, setWorkspaceCrudLoading] = useState(false);

  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState("");

  useEffect(() => {
    setIsCreatingWorkspace(false);
    setNewWorkspaceName("");
    setDeleteWorkspaceId("");
  }, [selectedAccountId, selectedContainerId]);

  const workspaceLimitReached = (workspaces || []).length >= 3;

  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  async function reloadWorkspaces() {
    if (!selectedAccountId || !selectedContainerId) return;

    const res = await fetch(
      `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
    );

    const data = await safeJsonParse(res);

    if (!res.ok) throw new Error(data?.error || "Failed to fetch workspaces");

    setWorkspaces(data.workspace || []);
  }

  async function handleCreateWorkspace() {
    if (!selectedAccountId || !selectedContainerId) {
      toast.warning("Please select account and container first.");
      return;
    }

    if (workspaceLimitReached) {
      toast.warning(
        "Max 3 workspaces allowed. Please review/delete existing workspace."
      );
      return;
    }

    if (!newWorkspaceName.trim()) {
      toast.warning("Workspace name required.");
      return;
    }

    const ok = await confirmDialog({
      title: "Create workspace?",
      description: `Workspace name: "${newWorkspaceName.trim()}"`,
      confirmLabel: "Create",
    });

    if (!ok) return;

    try {
      setWorkspaceCrudLoading(true);

      const res = await fetch("/api/auth/gtm/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          containerId: selectedContainerId,
          workspace: {
            name: newWorkspaceName.trim(),
          },
        }),
      });

      const data = await safeJsonParse(res);

      if (!res.ok) throw new Error(data?.error || "Failed to create workspace");

      toast.success("Workspace created successfully!");

      await reloadWorkspaces();

      setNewWorkspaceName("");
      setIsCreatingWorkspace(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkspaceCrudLoading(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!selectedAccountId || !selectedContainerId) {
      toast.warning("Please select account and container first.");
      return;
    }

    if (!deleteWorkspaceId) {
      toast.warning("Please select workspace to delete.");
      return;
    }

    const ws = workspaces.find((w: any) => w.workspaceId === deleteWorkspaceId);

    const ok = await confirmDialog({
      title: "Delete workspace?",
      description: `This will permanently delete: "${ws?.name || "Workspace"}"`,
      confirmLabel: "Delete",
    });

    if (!ok) return;

    try {
      setWorkspaceCrudLoading(true);

      const res = await fetch("/api/auth/gtm/workspaces", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          containerId: selectedContainerId,
          workspaceId: deleteWorkspaceId,
        }),
      });

      const data = await safeJsonParse(res);

      if (!res.ok) throw new Error(data?.error || "Failed to delete workspace");

      toast.success("Workspace deleted successfully!");

      if (selectedWorkspaceId === deleteWorkspaceId) {
        setSelectedWorkspaceId("");
      }

      setDeleteWorkspaceId("");

      await reloadWorkspaces();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorkspaceCrudLoading(false);
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {/* WARNING */}
      {workspaceLimitReached && (
        <div className="p-3 rounded-lg border border-line bg-card-hi text-[12px] text-black-300">
          Max 3 workspaces allowed. Please review/delete existing workspace.
        </div>
      )}

      {/* CREATE WORKSPACE */}
      <div className="flex justify-between items-center">
        <p className="text-[12px] font-medium text-faint uppercase tracking-[0.05em]">
          Workspace CRUD
        </p>

        <button
          type="button"
          disabled={!selectedContainerId || workspaceCrudLoading}
          onClick={() => {
            if (workspaceLimitReached) {
              toast.warning(
                "Max 3 workspaces allowed. Please review/select existing workspace."
              );
              return;
            }
            setIsCreatingWorkspace((p) => !p);
          }}
          className="btn-secondary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create
        </button>
      </div>

      {isCreatingWorkspace && (
        <div className="mt-2 p-3 rounded-lg bg-card-hi border border-line">
          <p className="text-[12px] font-medium text-fg mb-2">
            Create workspace
          </p>

          <input
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Workspace name"
            className="w-full bg-card text-[13px] py-2 px-3 rounded-md border border-line outline-none"
            autoFocus
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreateWorkspace}
              disabled={
                workspaceCrudLoading ||
                !newWorkspaceName.trim() ||
                workspaceLimitReached
              }
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

      {/* DELETE WORKSPACE */}
      <div className="p-3 rounded-lg bg-card-hi border border-line">
        <p className="text-[12px] font-medium text-fg mb-2">
          Delete workspace
        </p>

        <select
          value={deleteWorkspaceId}
          onChange={(e) => setDeleteWorkspaceId(e.target.value)}
          className="w-full bg-card text-[13px] py-2 px-3 rounded-md border border-line outline-none"
        >
          <option value="">-- Select workspace --</option>
          {workspaces.map((w: any) => (
            <option key={w.workspaceId} value={w.workspaceId}>
              {w.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleDeleteWorkspace}
          disabled={!deleteWorkspaceId || workspaceCrudLoading}
          className="btn-danger py-1.5! px-3! mt-3 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {workspaceCrudLoading ? "Deleting…" : "Delete Workspace"}
        </button>
      </div>
    </div>
  );
}