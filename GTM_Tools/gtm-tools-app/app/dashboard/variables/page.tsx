/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import VariableModal from "@/app/dashboard/components/modals/VariableModal";
import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

const variableTypeMap: Record<string, string> = {
  v: "Data Layer Variable",
  js: "Custom JavaScript",
  cookie: "1st Party Cookie",
  url: "URL Variable",
  dom: "DOM Element",
  constant: "Constant",
  lookupTable: "Lookup Table",
  regexTable: "RegEx Table",
  autoEvent: "Auto-Event Variable",
  containerVersion: "Container Version Number",
  debugMode: "Debug Mode",
};

export default function VariablesPage() {
  const store = useDashboardStore();
  const { fetchVariables } = useDashboardActions();

  const [selectedVariableType, setSelectedVariableType] = useState("");

  // ✅ Count Variable Types
  const variableTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.variables || []).forEach((variable: any) => {
      const type = variable.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.variables]);

  // ✅ Unique Variable Types sorted
  const uniqueVariableTypes = useMemo(() => {
    return Object.keys(variableTypeCounts).sort((a, b) =>
      (variableTypeMap[a] || a).localeCompare(variableTypeMap[b] || b)
    );
  }, [variableTypeCounts]);

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
      filterField={(v) => v.name} // ✅ search by variable name
      customFilter={(v) => {
        if (!selectedVariableType) return true;
        return v.type === selectedVariableType;
      }}
      filters={
        <select
          value={selectedVariableType}
          onChange={(e) => setSelectedVariableType(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            All Variable Types ({store.variables?.length || 0})
          </option>

          {uniqueVariableTypes.map((type) => (
            <option key={type} value={type}>
              {(variableTypeMap[type] || type) +
                ` (${variableTypeCounts[type]})`}
            </option>
          ))}
        </select>
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
                background: "color-mix(in srgb, #f97316 14%, transparent)",
                color: "#f97316",
                borderColor: "color-mix(in srgb, #f97316 25%, transparent)",
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