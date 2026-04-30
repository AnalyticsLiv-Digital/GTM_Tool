/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import TemplateModal from "@/app/dashboard/components/modals/TemplateModal";
import ExportTemplatesModal from "@/app/dashboard/components/modals/ExportTemplatesModal";

export default function TemplatesPage() {
  const store = useDashboardStore();
  const { fetchTemplates } = useDashboardActions();
  store.selectedWorkspaceId;

  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const [searchText, setSearchText] = useState("");

  // Fetch Templates only when workspace changes
  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  // Reset selection when workspace changes
  useEffect(() => {
    setSelectedTemplateIds([]);
  }, [store.selectedWorkspaceId]);

  const filteredTemplates = useMemo(() => {
    return store.templates.filter((template: any) =>
      template.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [store.templates, searchText]);

  const allSelected = useMemo(() => {
    if (filteredTemplates.length === 0) return false;
    return selectedTemplateIds.length === filteredTemplates.length;
  }, [selectedTemplateIds, filteredTemplates]);

  const selectedTemplates = useMemo(() => {
    return store.templates.filter((t: any) =>
      selectedTemplateIds.includes(t.templateId)
    );
  }, [selectedTemplateIds, store.templates]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedTemplateIds([]);
    } else {
      const ids = filteredTemplates.map((t: any) => t.templateId);
      setSelectedTemplateIds(ids);
    }
  }

  function toggleSingleTemplate(templateId: string) {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  }

  return (
    <div className="p-6">
      {/* TEMPLATE MODAL */}
      <TemplateModal />

      {/* EXPORT TEMPLATE MODAL */}
      <ExportTemplatesModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          setSelectedTemplateIds([]); // ✅ clear only on success
          setShowExportModal(false);
        }}
        selectedTemplates={selectedTemplates}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all GTM templates inside your selected workspace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedTemplateIds.length === 0}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            Export Selected ({selectedTemplateIds.length})
          </button>

          <button
            onClick={() => store.setShowTemplateModal(true)}
            disabled={!store.selectedWorkspaceId}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            + New Template
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* WORKSPACE WARNING */}
      {!store.selectedWorkspaceId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-2xl text-sm">
          Please select a workspace first.
        </div>
      )}

      {/* LOADING / ERROR */}
      {store.templatesLoading && (
        <p className="text-sm text-slate-500 mt-3">Loading templates...</p>
      )}

      {store.templatesError && (
        <p className="text-sm text-red-600 mt-3">{store.templatesError}</p>
      )}

      {/* TABLE */}
      <div className="mt-4 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Template Name
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Template ID
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredTemplates.map((template: any) => {
              const isChecked = selectedTemplateIds.includes(
                template.templateId
              );

              return (
                <tr
                  key={template.templateId}
                  className={`border-b border-slate-100 hover:bg-indigo-50/40 transition ${
                    isChecked ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleTemplate(template.templateId)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">
                      {template.name || "Untitled Template"}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {template.templateId || "-"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredTemplates.length === 0 && !store.templatesLoading && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-500">
                  No templates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-slate-500">
        Showing {filteredTemplates.length} template(s). Selected{" "}
        {selectedTemplateIds.length}.
      </div>
    </div>
  );
}