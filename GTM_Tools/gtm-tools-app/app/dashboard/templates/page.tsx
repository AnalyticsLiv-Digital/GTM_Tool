/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TemplateModal from "@/app/dashboard/components/modals/TemplateModal";
import ExportTemplatesModal from "@/app/dashboard/components/modals/ExportTemplatesModal";

export default function TemplatesPage() {
  const store = useDashboardStore();
  const { fetchTemplates } = useDashboardActions();

  return (
    <EntityListPage<any>
      title="Templates"
      description="Manage all GTM custom templates inside your selected workspace."
      singularName="template"
      pluralName="templates"
      newButtonLabel="+ New Template"
      searchPlaceholder="Search templates..."
      items={store.templates}
      loading={store.templatesLoading}
      error={store.templatesError}
      getId={(t) => t.templateId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTemplates}
      onCreate={() => store.setShowTemplateModal(true)}
      columns={[
        {
          label: "Template Name",
          render: (t) => (
            <p className="font-medium text-fg">
              {t.name || "Untitled Template"}
            </p>
          ),
        },
        {
          label: "Template ID",
          render: (t) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border"
              style={{
                background: "color-mix(in srgb, #8b5cf6 14%, transparent)",
                color: "#8b5cf6",
                borderColor: "color-mix(in srgb, #8b5cf6 25%, transparent)",
              }}
            >
              {t.templateId || "-"}
            </span>
          ),
        },
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
