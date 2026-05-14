/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, Search } from "lucide-react";

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

  // ============================================================
  // HELPERS
  // ============================================================
  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  // ============================================================
  // CUSTOM DROPDOWN COMPONENT
  // ============================================================
  function CustomDropdown({
    label,
    value,
    setValue,
    options,
    disabled,
    loading,
    placeholder,
  }: {
    label: string;
    value: string;
    setValue: (val: string) => void;
    options: any[];
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
  }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleOutside(e: MouseEvent) {
        if (!ref.current?.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const selectedLabel = useMemo(() => {
      const found = options.find((o) => o.value === value);
      return found?.label || placeholder || "-- Select --";
    }, [value, options, placeholder]);

    const filtered = useMemo(() => {
      if (!search.trim()) return options;
      return options.filter((o) =>
        (o.label || "").toLowerCase().includes(search.toLowerCase())
      );
    }, [options, search]);

    return (
      <div className="w-full" ref={ref}>
        <label className="block text-[12.5px] font-medium text-fg mb-2">
          {label}
        </label>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm transition text-sm
            ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-card-hi"}
          `}
        >
          <span className="truncate">
            {loading ? "Loading..." : selectedLabel}
          </span>

          <ChevronDown
            size={16}
            className={`text-muted transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && !disabled && (
          <div className="absolute mt-2 w-[calc(100%-3rem)] max-w-105 z-50 rounded-xl border border-line bg-card shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-line bg-card-hi">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
                <Search size={15} className="text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-72 overflow-y-auto">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setValue(o.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-card-hi transition flex items-center justify-between
                    ${value === o.value ? "bg-card-hi" : ""}
                  `}
                >
                  <span className="text-fg truncate">{o.label}</span>
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="text-sm text-muted px-4 py-3">
                  No matching results.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // LOAD ACCOUNTS
  // ============================================================
  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await safeJsonParse(res);

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

  // ============================================================
  // LOAD CONTAINERS
  // ============================================================
  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadContainers() {
      try {
        setLoadingContainers(true);

        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );

        const data = await safeJsonParse(res);

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

  // ============================================================
  // LOAD WORKSPACES
  // ============================================================
  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );

        const data = await safeJsonParse(res);

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

  // ============================================================
  // EXPORT TEMPLATE FUNCTION
  // ============================================================
  async function handleExportTemplates() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTemplates || selectedTemplates.length === 0) {
      return toast.warning("No templates selected for export.");
    }

    try {
      setExportLoading(true);

      for (const t of selectedTemplates) {
        const res = await fetch("/api/auth/gtm/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            workspaceId: selectedWorkspaceId,
            template: t,
          }),
        });

        const data = await safeJsonParse(res);

        if (!res.ok) {
          console.log("❌ Template export failed:", t.name, data);
        }
      }

      toast.success("✅ Templates exported successfully!");
      onExportSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  // ============================================================
  // DROPDOWN OPTIONS
  // ============================================================
  const accountOptions = accounts.map((a: any) => ({
    value: a.accountId,
    label: a.name,
  }));

  const containerOptions = containers.map((c: any) => ({
    value: c.containerId,
    label: c.name,
  }));

  const workspaceOptions = workspaces.map((w: any) => ({
    value: w.workspaceId,
    label: w.name,
  }));

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-line">
          <h2 className="text-[15px] font-semibold text-fg">
            Export Templates
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
              Selected Templates ({selectedTemplates.length})
            </p>

            <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-72">
              {selectedTemplates.length === 0 ? (
                <p className="text-[12px] text-faint p-4">
                  No templates selected.
                </p>
              ) : (
                selectedTemplates.map((t: any) => (
                  <div
                    key={t.templateId}
                    className="px-4 py-3 border-b border-line last:border-none"
                  >
                    <p className="text-[13px] font-medium text-fg">{t.name}</p>
                    <p className="text-[11px] text-faint">
                      ID: {t.templateId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6 relative">
            <h3 className="text-[14px] font-semibold text-fg mb-5">
              Select Destination
            </h3>

            <CustomDropdown
              label="Account"
              value={selectedAccountId}
              setValue={setSelectedAccountId}
              options={accountOptions}
              loading={loadingAccounts}
              placeholder="-- Select Account --"
            />

            <div className="mt-5">
              <CustomDropdown
                label="Container"
                value={selectedContainerId}
                setValue={setSelectedContainerId}
                options={containerOptions}
                loading={loadingContainers}
                disabled={!selectedAccountId}
                placeholder="-- Select Container --"
              />
            </div>

            <div className="mt-5">
              <CustomDropdown
                label="Workspace"
                value={selectedWorkspaceId}
                setValue={setSelectedWorkspaceId}
                options={workspaceOptions}
                loading={loadingWorkspaces}
                disabled={!selectedContainerId}
                placeholder="-- Select Workspace --"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
          <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
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
            className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? "Exporting..." : "Export Templates"}
          </button>
        </div>
      </div>
    </div>
  );
}