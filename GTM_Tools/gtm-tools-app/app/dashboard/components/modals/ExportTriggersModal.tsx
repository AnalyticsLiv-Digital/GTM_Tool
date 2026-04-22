/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";

export default function ExportTriggersModal({
  show,
  onClose,
  triggerIds,
}: {
  show: boolean;
  onClose: () => void;
  triggerIds: string[];
}) {
  const store = useDashboardStore();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!show) return;

    async function fetchAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch("/api/auth/gtm/accounts");
        const data = await res.json();

        setAccounts(data.account || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAccounts(false);
      }
    }

    fetchAccounts();
  }, [show]);

  useEffect(() => {
    if (!selectedAccountId) return;

    async function fetchContainers() {
      try {
        setLoadingContainers(true);
        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );
        const data = await res.json();

        setContainers(data.container || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContainers(false);
      }
    }

    fetchContainers();
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function fetchWorkspaces() {
      try {
        setLoadingWorkspaces(true);
        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );
        const data = await res.json();

        setWorkspaces(data.workspace || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    fetchWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  async function handleExport() {
    if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId) {
      alert("Please select Account, Container, and Workspace");
      return;
    }

    try {
      setExportLoading(true);

      const res = await fetch("/api/auth/gtm/triggers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAccountId: store.selectedAccountId,
          sourceContainerId: store.selectedContainerId,
          sourceWorkspaceId: store.selectedWorkspaceId,

          destinationAccountId: selectedAccountId,
          destinationContainerId: selectedContainerId,
          destinationWorkspaceId: selectedWorkspaceId,

          triggerIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Export failed");
        return;
      }

      alert("Triggers Exported Successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Export Selected Triggers ({triggerIds.length})
          </h2>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* ACCOUNT */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Select Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedContainerId("");
                setSelectedWorkspaceId("");
              }}
              className="w-full mt-2 border rounded-xl px-4 py-3 text-sm"
            >
              <option value="">-- Select Account --</option>
              {loadingAccounts ? (
                <option>Loading...</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.accountId} value={acc.accountId}>
                    {acc.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* CONTAINER */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Select Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => {
                setSelectedContainerId(e.target.value);
                setSelectedWorkspaceId("");
              }}
              disabled={!selectedAccountId}
              className="w-full mt-2 border rounded-xl px-4 py-3 text-sm disabled:bg-gray-100"
            >
              <option value="">-- Select Container --</option>
              {loadingContainers ? (
                <option>Loading...</option>
              ) : (
                containers.map((c) => (
                  <option key={c.containerId} value={c.containerId}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* WORKSPACE */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Select Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId}
              className="w-full mt-2 border rounded-xl px-4 py-3 text-sm disabled:bg-gray-100"
            >
              <option value="">-- Select Workspace --</option>
              {loadingWorkspaces ? (
                <option>Loading...</option>
              ) : (
                workspaces.map((ws) => (
                  <option key={ws.workspaceId} value={ws.workspaceId}>
                    {ws.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border text-sm font-semibold hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {exportLoading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}