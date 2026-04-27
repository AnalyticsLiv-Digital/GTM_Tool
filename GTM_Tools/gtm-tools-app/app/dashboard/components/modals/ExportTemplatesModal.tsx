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

  // ✅ SEARCH STATE
  const [searchText, setSearchText] = useState("");

  // --------------------------------------
  // FETCH ACCOUNTS WHEN MODAL OPENS
  // --------------------------------------
  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await res.json();

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch accounts");

        setAccounts(data.account || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [show]);

  // --------------------------------------
  // FETCH CONTAINERS WHEN ACCOUNT SELECTED
  // --------------------------------------
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

        setContainers(data.container || []);

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

  // --------------------------------------
  // FETCH WORKSPACES WHEN CONTAINER SELECTED
  // --------------------------------------
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

        setWorkspaces(data.workspace || []);

        setSelectedWorkspaceId("");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  // --------------------------------------
  // EXPORT TEMPLATES FUNCTION
  // --------------------------------------
  async function handleExportTemplates() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTemplates || selectedTemplates.length === 0)
      return toast.warning("No templates selected for export.");

    if (
      !confirm(
        `Are you sure you want to export ${selectedTemplates.length} template(s) to selected workspace?`
      )
    )
      return;

    const failedTemplates: string[] = [];

    try {
      setExportLoading(true);

      for (const template of selectedTemplates) {
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
                errorMsg.toLowerCase().includes("duplicate name")
              ) {
                attempt++;
                continue;
              } else {
                throw new Error(errorMsg);
              }
            }

            exportSuccess = true;
          }

          if (!exportSuccess) {
            throw new Error("Failed after retries (duplicate name issue)");
          }
        } catch {
          failedTemplates.push(template?.name || "Unknown Template");
          continue;
        }
      }

      // ✅ Clear checkbox only if ALL templates exported successfully
      if (failedTemplates.length > 0) {
        toast.warning(
          `Export finished with failures. Failed: ${failedTemplates.join(", ")}`
        );
        return;
      }

      toast.success("Templates exported successfully!");
      onExportSuccess(); // ✅ close modal + clear selection handled in TemplatesPage
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  // ✅ FILTERED LIST FOR SEARCH
  const filteredTemplates = selectedTemplates.filter((template: any) =>
    template.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Export Templates</h2>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-100">
          {/* LEFT */}
          <div className="col-span-5 border-r bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Selected Templates ({selectedTemplates.length})
            </p>

            {/* ✅ SEARCH INPUT (SAME AS TAGS PAGE STYLE) */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
              {filteredTemplates.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">
                  No templates found.
                </p>
              ) : (
                filteredTemplates.map((template: any) => (
                  <div
                    key={template.templateId}
                    className="px-4 py-3 border-b last:border-none"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {template.templateId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6">
            <h3 className="text-md font-bold text-gray-900 mb-5">
              Select Destination
            </h3>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleExportTemplates}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId ||
              selectedTemplates.length === 0
            }
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {exportLoading ? "Exporting..." : "Export Selected Templates"}
          </button>
        </div>
      </div>
    </div>
  );
}