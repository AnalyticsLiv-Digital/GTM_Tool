/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

const triggerTypeMap: Record<string, string> = {
  pageview: "Page View",
  domReady: "DOM Ready",
  windowLoaded: "Window Loaded",
  click: "Click",
  linkClick: "Link Click",
  formSubmission: "Form Submission",
  timer: "Timer",
  scrollDepth: "Scroll Depth",
  youtubeVideo: "YouTube Video",
  historyChange: "History Change",
  customEvent: "Custom Event",
  allPages: "All Pages",
};

export default function TriggersPage() {
  const store = useDashboardStore();
  const { fetchTriggers } = useDashboardActions();

  const [selectedTriggerType, setSelectedTriggerType] = useState("");

  // ✅ Count trigger types
  const triggerTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.triggers || []).forEach((trigger: any) => {
      const type = trigger.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.triggers]);

  // ✅ Unique trigger types sorted
  const uniqueTriggerTypes = useMemo(() => {
    return Object.keys(triggerTypeCounts).sort((a, b) =>
      (triggerTypeMap[a] || a).localeCompare(triggerTypeMap[b] || b)
    );
  }, [triggerTypeCounts]);

  return (
    <EntityListPage<any>
      title="Triggers"
      description="Manage all GTM triggers inside your selected workspace."
      singularName="trigger"
      pluralName="triggers"
      newButtonLabel="+ New Trigger"
      searchPlaceholder="Search triggers by name..."
      items={store.triggers}
      loading={store.triggersLoading}
      error={store.triggersError}
      getId={(t) => t.triggerId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTriggers}
      onCreate={() => store.setShowTriggerModal(true)}
      filterField={(t) => t.name} // ✅ Search only Trigger Name
      customFilter={(t) => {
        if (!selectedTriggerType) return true;
        return t.type === selectedTriggerType;
      }}
      filters={
        <select
          value={selectedTriggerType}
          onChange={(e) => setSelectedTriggerType(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            All Trigger Types ({store.triggers?.length || 0})
          </option>

          {uniqueTriggerTypes.map((type) => (
            <option key={type} value={type}>
              {(triggerTypeMap[type] || type) +
                ` (${triggerTypeCounts[type]})`}
            </option>
          ))}
        </select>
      }
      columns={[
        {
          label: "Trigger Name",
          render: (t) => (
            <>
              <p className="font-medium text-fg">{t.name}</p>
              <p className="text-[11px] font-mono text-faint mt-0.5">
                {t.triggerId}
              </p>
            </>
          ),
        },
        {
          label: "Trigger Type",
          render: (t) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #22c55e 14%, transparent)",
                color: "#22c55e",
                borderColor: "color-mix(in srgb, #22c55e 25%, transparent)",
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