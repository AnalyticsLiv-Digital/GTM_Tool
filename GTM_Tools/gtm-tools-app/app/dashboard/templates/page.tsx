/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TemplateModal from "@/app/dashboard/components/modals/TemplateModal";
import ExportTemplatesModal from "@/app/dashboard/components/modals/ExportTemplatesModal";

export default function TemplatesPage() {
  const store = useDashboardStore();
  const { fetchTemplates } = useDashboardActions();

  const [selectedTemplateType, setSelectedTemplateType] = useState("");

  // ✅ Count Template Types
  const templateTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.templates || []).forEach((template: any) => {
      const type = template.templateType || "Custom Template";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.templates]);

  // ✅ Unique Template Types sorted
  const uniqueTemplateTypes = useMemo(() => {
    return Object.keys(templateTypeCounts).sort((a, b) => a.localeCompare(b));
  }, [templateTypeCounts]);

  return (
    <EntityListPage<any>
      title="Templates"
      description="Manage all GTM custom templates inside your selected workspace."
      singularName="template"
      pluralName="templates"
      newButtonLabel="+ New Template"
      searchPlaceholder="Search templates by name..."
      items={store.templates}
      loading={store.templatesLoading}
      error={store.templatesError}
      getId={(t) => t.templateId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTemplates}
      onCreate={() => store.setShowTemplateModal(true)}
      filterField={(t) => t.name} // ✅ search by template name
      customFilter={(t) => {
        if (!selectedTemplateType) return true;
        return (t.templateType || "unknown") === selectedTemplateType;
      }}
      filters={
        <select
          value={selectedTemplateType}
          onChange={(e) => setSelectedTemplateType(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            All Template Types ({store.templates?.length || 0})
          </option>

          {uniqueTemplateTypes.map((type) => (
            <option key={type} value={type}>
              {type} ({templateTypeCounts[type]})
            </option>
          ))}
        </select>
      }
      columns={[
        {
          label: "Template Name",
          render: (t) => (
            <>
              <p className="font-medium text-fg">
                {t.name || "Untitled Template"}
              </p>
              <p className="text-[11px] font-mono text-faint mt-0.5">
                {t.templateId}
              </p>
            </>
          ),
        },
        {
          label: "Template Type",
          render: () => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #8b5cf6 14%, transparent)",
                color: "#8b5cf6",
                borderColor: "color-mix(in srgb, #8b5cf6 25%, transparent)",
              }}
            >
              Custom Template
            </span>
          ),
        }
      ]}
      renderCreateEditModal={() => <TemplateModal />}
      renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => (
        <ExportTemplatesModal
          show={show}
          onClose={onClose}
          onExportSuccess={onExportSuccess}
          selectedTemplates={selectedItems}
        />
      )}
    />
  );
}