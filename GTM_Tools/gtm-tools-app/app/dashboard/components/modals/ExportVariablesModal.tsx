/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/ui/dialog";

export default function ExportVariablesModal({
  show,
  onClose,
  onExportSuccess,
  selectedVariables,
}: {
  show: boolean;
  onClose: () => void;
  onExportSuccess: () => void;
  selectedVariables: any[];
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

        if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

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
  // EXPORT VARIABLES FUNCTION
  // --------------------------------------
  async function handleExportVariables() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedVariables || selectedVariables.length === 0)
      return toast.warning("No variables selected for export.");

    const ok = await confirmDialog({
      title: `Export ${selectedVariables.length} variable(s)?`,
      description: "They will be created in the selected destination workspace. Existing variables in that workspace are not modified.",
      confirmLabel: "Export",
    });
    if (!ok) return;

    const failedVariables: string[] = [];

    try {
      setExportLoading(true);

      for (const variable of selectedVariables) {
        try {
          let exportSuccess = false;
          let attempt = 0;
          const maxAttempts = 5;

          while (!exportSuccess && attempt < maxAttempts) {
            const updatedName =
              attempt === 0 ? variable.name : `${variable.name}_${attempt}`;

            const cleanedVariable = {
              name: updatedName,
              type: variable.type,
              parameter: variable.parameter || [],
              formatValue: variable.formatValue,
              convertUndefinedToValue: variable.convertUndefinedToValue,
              convertUndefinedToValueTitle:
                variable.convertUndefinedToValueTitle,
              convertUndefinedToValueDescription:
                variable.convertUndefinedToValueDescription,
              enableCookieOverrides: variable.enableCookieOverrides,
              cookiePath: variable.cookiePath,
              cookieDomain: variable.cookieDomain,
              cookieExpires: variable.cookieExpires,
              maxAgeSeconds: variable.maxAgeSeconds,
              cookieName: variable.cookieName,
            };

            const res = await fetch("/api/auth/gtm/variables", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId: selectedAccountId,
                containerId: selectedContainerId,
                workspaceId: selectedWorkspaceId,
                variable: cleanedVariable,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              const errorMsg =
                data?.details?.error?.message ||
                data?.error ||
                "Failed to export variable";

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
          failedVariables.push(variable?.name || "Unknown Variable");
          continue;
        }
      }

      // ✅ Clear selection only if all variables exported successfully
      if (failedVariables.length > 0) {
        toast.warning(
          `Export finished with failures. Failed: ${failedVariables.join(", ")}`
        );

        // ❌ do not close modal or clear selection
        return;
      }

      toast.success("Variables exported successfully!");
      onExportSuccess(); // ✅ close modal + clear selection handled in VariablesPage
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
          <h2 className="text-[15px] font-semibold text-fg">
            Export Variables
          </h2>

          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-90">
          {/* LEFT */}
          <div className="col-span-5 border-r border-line bg-card-hi p-4">
            <p className="text-[12.5px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
              Selected Variables ({selectedVariables.length})
            </p>

            <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-80">
              {selectedVariables.length === 0 ? (
                <p className="text-[12px] text-faint p-4">
                  No variables selected.
                </p>
              ) : (
                selectedVariables.map((variable: any) => (
                  <div
                    key={variable.variableId}
                    className="px-4 py-3 border-b border-line last:border-none"
                  >
                    <p className="text-[13px] font-medium text-fg">
                      {variable.name}
                    </p>
                    <p className="text-[11px] text-faint">
                      Type: {variable.type} | ID: {variable.variableId}
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

            <label className="block text-[12.5px] font-medium text-fg mb-2">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full bg-page-soft py-2.5 text-[13px]"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
              Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full bg-page-soft py-2.5 text-[13px]"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full bg-page-soft py-2.5 text-[13px]"
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
        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
          <button
            onClick={onClose}
            className="btn-secondary py-1.5! px-3!"
          >
            Cancel
          </button>

          <button
            onClick={handleExportVariables}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId ||
              selectedVariables.length === 0
            }
            className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? "Exporting..." : "Export Selected Variables"}
          </button>
        </div>
      </div>
    </div>
  );
}