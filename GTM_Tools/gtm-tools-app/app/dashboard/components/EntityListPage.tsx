/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search, Download, Plus } from "lucide-react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { EntityTableSkeleton } from "@/components/ui/Skeleton";

export type EntityColumn<T> = {
  label: string;
  render: (item: T) => ReactNode;
};

export type EntityListPageProps<T> = {
  title: string;
  description: string;
  singularName: string;
  pluralName: string;
  newButtonLabel: string;
  searchPlaceholder: string;

  items: T[];
  loading: boolean;
  error?: string | null;
  getId: (item: T) => string;
  filterField?: (item: T) => string;

  columns: EntityColumn<T>[];

  workspaceSelected: boolean;

  onFetch: () => void;
  onCreate: () => void;

  renderCreateEditModal: () => ReactNode;
  renderExportModal: (props: {
    show: boolean;
    onClose: () => void;
    onExportSuccess: () => void;
    selectedItems: T[];
  }) => ReactNode;

  // ✅ NEW (Optional filter UI like dropdowns)
  filters?: ReactNode;

  // ✅ NEW (Optional additional filtering logic)
  customFilter?: (item: T) => boolean;
};

export function EntityListPage<T>({
  title,
  description,
  pluralName,
  singularName,
  newButtonLabel,
  searchPlaceholder,
  items,
  loading,
  error,
  getId,
  filterField,
  columns,
  workspaceSelected,
  onFetch,
  onCreate,
  renderCreateEditModal,
  renderExportModal,
  filters,
  customFilter,
}: EntityListPageProps<T>) {
  const store = useDashboardStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (workspaceSelected) onFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  useEffect(() => {
    setSelectedIds([]);
  }, [store.selectedWorkspaceId]);

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    const getStr = filterField ?? ((it: T) => (it as any)?.name ?? "");

    return items.filter((it) => {
      const searchMatch = String(getStr(it) ?? "")
        .toLowerCase()
        .includes(q);

      const extraMatch = customFilter ? customFilter(it) : true;

      return searchMatch && extraMatch;
    });
  }, [items, searchText, filterField, customFilter]);

  const allSelected = useMemo(
    () => filtered.length > 0 && selectedIds.length === filtered.length,
    [filtered, selectedIds]
  );

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.includes(getId(it))),
    [items, selectedIds, getId]
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(filtered.map(getId));
  };

  const toggleOne = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div>
      {renderCreateEditModal()}

      {renderExportModal({
        show: showExportModal,
        onClose: () => setShowExportModal(false),
        onExportSuccess: () => {
          setSelectedIds([]);
          setShowExportModal(false);
        },
        selectedItems,
      })}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint mb-2">
            {pluralName}
          </p>
          <h1 className="text-[26px] md:text-[30px] font-semibold text-fg leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          <p className="text-[14px] text-muted mt-1.5">{description}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            disabled={selectedIds.length === 0}
            className="btn-secondary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Export ({selectedIds.length})
          </button>

          <button
            type="button"
            onClick={onCreate}
            disabled={!workspaceSelected}
            className="btn-primary py-2! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} strokeWidth={2.4} />
            {newButtonLabel.replace(/^\+\s*/, "")}
          </button>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="mb-5 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-card pl-10 pr-4 py-2.5 text-[13.5px]"
            aria-label={searchPlaceholder}
          />
        </div>

        {/* ✅ FILTER SLOT */}
        {filters && <div className="min-w-55">{filters}</div>}
      </div>

      {!workspaceSelected && (
        <div className="mb-4 bg-(--warn)/10 border border-(--warn)/25 text-(--warn) px-4 py-3 rounded-lg text-[13px]">
          Please select a workspace first.
        </div>
      )}

      {error && (
        <p className="text-[13px] text-(--danger) mt-2 mb-3">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <EntityTableSkeleton rows={6} />
      ) : (
        <div className="bg-card rounded-xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="bg-card-hi border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer accent-(--accent)"
                      aria-label={`Select all ${pluralName}`}
                    />
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c.label}
                      className="text-left px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint font-medium"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => {
                  const id = getId(item);
                  const isChecked = selectedIds.includes(id);

                  return (
                    <tr
                      key={id}
                      className={`border-b border-line transition-colors ${isChecked ? "bg-accent-soft" : "hover:bg-card-hi"
                        }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(id)}
                          className="w-3.5 h-3.5 cursor-pointer accent-(--accent)"
                          aria-label={`Select ${singularName}`}
                        />
                      </td>

                      {columns.map((c) => (
                        <td key={c.label} className="px-4 py-3 text-fg align-top">
                          {c.render(item)}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-12 text-faint text-[13.5px]"
                    >
                      No {pluralName} found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 font-mono text-[11px] text-faint">
        Showing {filtered.length} {singularName}(s) · selected {selectedIds.length}
      </div>
    </div>
  );
}