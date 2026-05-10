/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ExportTemplatesModal({
  show,
  onClose,
  onExportSuccess,
  selectedTemplates,
}: {
  show: boolean;
  onClose: () => void;
  onExportSuccess: () => void;
  selectedTemplates: any[];
}) {
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

  // ----------------------------
  // SAFE ARRAY (IMPORTANT FIX)
  // ----------------------------
  const safeTemplates = Array.isArray(selectedTemplates)
    ? selectedTemplates
    : [];

  // ----------------------------
  // FETCH ACCOUNTS
  // ----------------------------
  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch accounts");

        setAccounts(Array.isArray(data.account) ? data.account : []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [show]);

  // ----------------------------
  // FETCH CONTAINERS
  // ----------------------------
  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadContainers() {
      try {
        setLoadingContainers(true);

        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );
        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch containers");

        setContainers(Array.isArray(data.container) ? data.container : []);

        setSelectedContainerId("");
        setSelectedWorkspaceId("");
        setWorkspaces([]);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingContainers(false);
      }
    }

    loadContainers();
  }, [selectedAccountId]);

  // ----------------------------
  // FETCH WORKSPACES
  // ----------------------------
  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );

        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch workspaces");

        setWorkspaces(Array.isArray(data.workspace) ? data.workspace : []);

        setSelectedWorkspaceId("");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  // ----------------------------
  // EXPORT FUNCTION
  // ----------------------------
  async function handleExportTemplates() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (safeTemplates.length === 0)
      return toast.warning("No templates selected for export.");

    setExportLoading(true);

    const failedTemplates: string[] = [];

    try {
      for (const template of safeTemplates) {
        try {
          let exportSuccess = false;
          let attempt = 0;
          const maxAttempts = 5;

          while (!exportSuccess && attempt < maxAttempts) {
            const updatedName =
              attempt === 0 ? template.name : `${template.name}_${attempt}`;

            const cleanedTemplate = {
              name: updatedName,
              templateData: template.templateData,
            };

            const res = await fetch("/api/auth/gtm/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: selectedAccountId,
                containerId: selectedContainerId,
                workspaceId: selectedWorkspaceId,
                template: cleanedTemplate,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              const errorMsg =
                data?.details?.error?.message ||
                data?.error ||
                "Failed to export template";

              if (
                errorMsg.toLowerCase().includes("already exists") ||
                errorMsg.toLowerCase().includes("duplicate")
              ) {
                attempt++;
                continue;
              }

              throw new Error(errorMsg);
            }

            exportSuccess = true;
          }

          if (!exportSuccess) {
            throw new Error("Failed after retries");
          }
        } catch {
          failedTemplates.push(template?.name || "Unknown Template");
        }
      }

      if (failedTemplates.length > 0) {
        toast.warning(
          `Export finished with failures: ${failedTemplates.join(", ")}`
        );
        return;
      }

      toast.success("Templates exported successfully!");
      onExportSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-line">
          <h2 className="text-[15px] font-semibold text-fg">Export Templates</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-100">
          {/* LEFT */}
          <div className="col-span-5 border-r border-line bg-card-hi p-4">
            <p className="text-[12.5px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
              Selected Templates ({safeTemplates.length})
            </p>

            <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-80">
              {safeTemplates.length === 0 ? (
                <p className="text-[12px] text-faint p-4">No templates found.</p>
              ) : (
                safeTemplates.map((template: any, idx: number) => (
                  <div
                    key={template.templateId || template.name || idx}
                    className="px-4 py-3 border-b border-line last:border-none"
                  >
                    <p className="text-[13px] font-medium text-fg">
                      {template.name}
                    </p>
                    <p className="text-[11px] text-faint">
                      ID: {template.templateId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6">
            <h3 className="text-[14px] font-semibold text-fg mb-5">
              Select Destination
            </h3>

            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mt-5"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mt-5"
            >
              <option value="">-- Select Workspace --</option>
              {workspaces.map((w: any) => (
                <option key={w.workspaceId} value={w.workspaceId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 border rounded-xl">
            Cancel
          </button>

          <button
            onClick={handleExportTemplates}
            disabled={exportLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl"
          >
            {exportLoading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}