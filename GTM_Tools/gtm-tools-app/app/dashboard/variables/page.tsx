/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import VariableModal from "@/app/dashboard/components/modals/VariableModal";
import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

export default function VariablesPage() {
  const store = useDashboardStore();
  const { fetchVariables, openCreateVariableModal } = useDashboardActions();

  const [selectedVariableIds, setSelectedVariableIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  // Variable Type Mapping
  const variableTypeMap: Record<string, string> = {
    v: "Constant",
    c: "Cookie",
    e: "Data Layer Variable",
    jsm: "Custom JavaScript",
    dom: "DOM Element",
    u: "URL",
    aev: "Auto-Event Variable",
    j: "JavaScript Variable",
    r: "Random Number",
    ctv: "Container Version Number",
    dbg: "Debug Mode",
    d: "Event",
    f: "First Party Collection",
    g: "Google Analytics Settings",
    gas: "Google Analytics Settings Variable",
    gtm: "Google Tag Manager",
    hid: "HTTP Referrer",
    k: "Lookup Table",
    smm: "Session Storage",
    l: "Local Storage",
    remm: "Regex Table",
    vjs: "Custom JavaScript Variable",
    vis: "Visitor Region",
    tc: "Traffic Source",
    tel: "Element Visibility",
    ec: "Element Clicks",
    eh: "Element History",
    ev: "Element Visibility Trigger Variable",
    aud: "Audience Variable",
    fp: "First Party Cookie",
    pd: "Page Data",
    ua: "Universal Analytics Variable",
    gclid: "Google Click ID",
    ga4: "GA4 Settings Variable",
    opt: "Google Optimize Variable",
    fpc: "First Party Cookie Variable",
    user: "User-Defined Variable",
    cs: "Custom Template Variable",
  };

  // Fetch Variables only when workspace changes
  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchVariables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  // Reset selection when workspace changes
  useEffect(() => {
    setSelectedVariableIds([]);
  }, [store.selectedWorkspaceId]);

  const allSelected = useMemo(() => {
    if (store.variables.length === 0) return false;
    return selectedVariableIds.length === store.variables.length;
  }, [selectedVariableIds, store.variables]);

  const selectedVariables = useMemo(() => {
    return store.variables.filter((variable: any) =>
      selectedVariableIds.includes(variable.variableId)
    );
  }, [selectedVariableIds, store.variables]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedVariableIds([]);
    } else {
      const ids = store.variables.map((variable: any) => variable.variableId);
      setSelectedVariableIds(ids);
    }
  }

  function toggleSingleVariable(variableId: string) {
    setSelectedVariableIds((prev) => {
      if (prev.includes(variableId)) {
        return prev.filter((id) => id !== variableId);
      }
      return [...prev, variableId];
    });
  }

  return (
    <div className="p-6">
      {/* CREATE VARIABLE MODAL */}
      <VariableModal />

      {/* EXPORT VARIABLE MODAL */}
      <ExportVariablesModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        variableIds={selectedVariables}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-900">Variables</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedVariableIds.length === 0}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            Export Selected ({selectedVariableIds.length})
          </button>

          <button
            onClick={openCreateVariableModal}
            disabled={!store.selectedWorkspaceId}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            New Variable
          </button>
        </div>
      </div>

      {/* WORKSPACE WARNING */}
      {!store.selectedWorkspaceId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
          Please select a workspace first.
        </div>
      )}

      {/* LOADING / ERROR */}
      {store.variablesLoading && (
        <p className="text-sm text-gray-500 mt-3">Loading variables...</p>
      )}

      {store.variablesError && (
        <p className="text-sm text-red-600 mt-3">{store.variablesError}</p>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {/* SELECT ALL */}
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>

              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Name
              </th>

              <th className="text-left px-4 py-3 font-semibold text-gray-700">
                Type
              </th>
            </tr>
          </thead>

          <tbody>
            {store.variables.map((variable: any) => {
              const isChecked = selectedVariableIds.includes(
                variable.variableId
              );

              return (
                <tr
                  key={variable.variableId}
                  className={`border-b hover:bg-gray-50 ${
                    isChecked ? "bg-blue-50" : ""
                  }`}
                >
                  {/* CHECKBOX */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        toggleSingleVariable(variable.variableId)
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-900">
                    {variable.name}
                    <p className="text-xs text-gray-500">
                      ID: {variable.variableId}
                    </p>
                  </td>

                  {/* TYPE NAME MAPPING */}
                  <td className="px-4 py-3">
                    {variableTypeMap[variable.type] ? (
                      variableTypeMap[variable.type]
                    ) : (
                      <span className="text-gray-500">
                        Custom Template Variable ({variable.type})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {store.variables.length === 0 && !store.variablesLoading && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No variables found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-gray-500">
        Showing {store.variables.length} variable(s). Selected{" "}
        {selectedVariableIds.length}.
      </div>
    </div>
  );
}