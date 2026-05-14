/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import VariableModal from "@/app/dashboard/components/modals/VariableModal";
import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

import {
  MdOutlineDataObject,
  MdOutlineCookie,
  MdOutlineLink,
  MdOutlineCode,
  MdOutlineStorage,
  MdOutlineTag,
  MdOutlineKeyboardArrowDown,
} from "react-icons/md";
import { FaRegClock } from "react-icons/fa";
import { Search } from "lucide-react";

const variableTypeMap: Record<string, string> = {
  c: "Constant",
  v: "Data Layer Variable",
  u: "URL",
  js: "Custom JavaScript",
  jsm: "JavaScript Variable",
  k: "First Party Cookie",
  cookie: "Cookie",
  r: "Regex Table",
  l: "Lookup Table",
  f: "Auto-Event Variable",
  e: "Event Settings Variable",
  g: "Google Analytics Settings",
  s: "Session Storage",
  localStorage: "Local Storage",
  timestamp: "Timestamp",
};

function getVariableIcon(type: string) {
  if (type === "c") {
    return <MdOutlineTag size={16} color="#3b82f6" />;
  }

  if (type === "v") {
    return <MdOutlineDataObject size={16} color="#22c55e" />;
  }

  if (type === "u") {
    return <MdOutlineLink size={16} color="#0ea5e9" />;
  }

  if (type === "js" || type === "jsm") {
    return <MdOutlineCode size={16} color="#9333ea" />;
  }

  if (type === "k" || type === "cookie") {
    return <MdOutlineCookie size={16} color="#f59e0b" />;
  }

  if (type === "s" || type === "localStorage") {
    return <MdOutlineStorage size={16} color="#64748b" />;
  }

  if (type === "timestamp") {
    return <FaRegClock size={15} color="#f97316" />;
  }

  return <MdOutlineTag size={16} color="#6b7280" />;
}

export default function VariablesPage() {
  const store = useDashboardStore();
  const { fetchVariables } = useDashboardActions();

  const [selectedVariableType, setSelectedVariableType] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Count variable types
  const variableTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.variables || []).forEach((v: any) => {
      const type = v.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.variables]);

  // Unique sorted variable types
  const uniqueVariableTypes = useMemo(() => {
    return Object.keys(variableTypeCounts).sort((a, b) =>
      (variableTypeMap[a] || a).localeCompare(variableTypeMap[b] || b)
    );
  }, [variableTypeCounts]);

  // Filter variable types by search
  const filteredVariableTypes = useMemo(() => {
    if (!search.trim()) return uniqueVariableTypes;

    return uniqueVariableTypes.filter((type) =>
      (variableTypeMap[type] || type)
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [uniqueVariableTypes, search]);

  const selectedLabel = selectedVariableType
    ? `${variableTypeMap[selectedVariableType] || selectedVariableType} (${
        variableTypeCounts[selectedVariableType] || 0
      })`
    : `All Variable Types (${store.variables?.length || 0})`;

  return (
    <EntityListPage<any>
      title="Variables"
      description="Manage all GTM variables inside your selected workspace."
      singularName="variable"
      pluralName="variables"
      newButtonLabel="+ New Variable"
      searchPlaceholder="Search variables by name..."
      items={store.variables}
      loading={store.variablesLoading}
      error={store.variablesError}
      getId={(v) => v.variableId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchVariables}
      onCreate={() => store.setShowVariableModal(true)}
      filterField={(v) => v.name}
      customFilter={(v) => {
        if (!selectedVariableType) return true;
        return v.type === selectedVariableType;
      }}
      filters={
        <div className="relative w-full" ref={dropdownRef}>
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="shrink-0">
                {selectedVariableType ? (
                  getVariableIcon(selectedVariableType)
                ) : (
                  <MdOutlineDataObject size={16} color="#6b7280" />
                )}
              </span>

              <span className="truncate font-medium text-fg">
                {selectedLabel}
              </span>
            </div>

            <MdOutlineKeyboardArrowDown
              size={18}
              className={`text-muted transition ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-line bg-card-hi">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
                  <Search size={15} className="text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search variable types..."
                    className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-72 overflow-y-auto">
                {/* All */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVariableType("");
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                    selectedVariableType === "" ? "bg-card-hi" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MdOutlineDataObject size={16} color="#6b7280" />
                    <span className="text-fg font-medium">
                      All Variable Types
                    </span>
                  </div>

                  <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                    {store.variables?.length || 0}
                  </span>
                </button>

                {/* Types */}
                {filteredVariableTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedVariableType(type);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                      selectedVariableType === type ? "bg-card-hi" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{getVariableIcon(type)}</span>
                      <span className="text-fg font-medium">
                        {variableTypeMap[type] || type}
                      </span>
                    </div>

                    <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                      {variableTypeCounts[type]}
                    </span>
                  </button>
                ))}

                {filteredVariableTypes.length === 0 && (
                  <p className="text-sm text-muted px-4 py-3">
                    No matching variable types.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      }
      columns={[
        {
          label: "Variable Name",
          render: (v) => (
            <>
              <p className="font-medium text-fg">{v.name}</p>
              <p className="text-[11px] font-mono text-faint mt-0.5">
                {v.variableId}
              </p>
            </>
          ),
        },
        {
          label: "Variable Type",
          render: (v) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #3b82f6 14%, transparent)",
                color: "#3b82f6",
                borderColor: "color-mix(in srgb, #3b82f6 25%, transparent)",
              }}
            >
              {variableTypeMap[v.type] || v.type || "Unknown"}
            </span>
          ),
        },
      ]}
      renderCreateEditModal={() => <VariableModal />}
      renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => (
        <ExportVariablesModal
          show={show}
          onClose={onClose}
          onExportSuccess={onExportSuccess}
          selectedVariables={selectedItems}
        />
      )}
    />
  );
}