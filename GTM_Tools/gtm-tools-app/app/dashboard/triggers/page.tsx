/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

const triggerTypeMap: Record<string, string> = {
  PAGEVIEW: "Page View",
  DOM_READY: "DOM Ready",
  WINDOW_LOADED: "Window Loaded",
  CLICK: "Click",
  LINK_CLICK: "Link Click",
  FORM_SUBMISSION: "Form Submission",
  HISTORY_CHANGE: "History Change",
  CUSTOM_EVENT: "Custom Event",
  TIMER: "Timer",
  SCROLL_DEPTH: "Scroll Depth",
  ELEMENT_VISIBILITY: "Element Visibility",
  YOUTUBE_VIDEO: "YouTube Video",
};

export default function TriggersPage() {
  const store = useDashboardStore();
  const { fetchTriggers, openCreateTriggerModal } = useDashboardActions();

  return (
    <EntityListPage<any>
      title="Triggers"
      description="Manage all GTM triggers inside your selected workspace."
      singularName="trigger"
      pluralName="triggers"
      newButtonLabel="+ New Trigger"
      searchPlaceholder="Search triggers..."
      items={store.triggers}
      loading={store.triggersLoading}
      error={store.triggersError}
      getId={(t) => t.triggerId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTriggers}
      onCreate={openCreateTriggerModal}
      columns={[
        {
          label: "Trigger Name",
          render: (t) => (
            <>
              <p className="font-medium text-fg">{t.name}</p>
              <p className="text-[11px] font-mono text-faint mt-0.5">{t.triggerId}</p>
            </>
          ),
        },
        {
          label: "Trigger Type",
          render: (t) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #f59e0b 14%, transparent)",
                color: "#f59e0b",
                borderColor: "color-mix(in srgb, #f59e0b 25%, transparent)",
              }}
            >
              {triggerTypeMap[t.type] || t.type || "Unknown"}
            </span>
          ),
        },
      ]}
      renderCreateEditModal={() => <TriggerModal />}
      renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => (
        <ExportTriggersModal
          show={show}
          onClose={onClose}
          onExportSuccess={onExportSuccess}
          selectedTriggers={selectedItems}
        />
      )}
    />
  );
}
