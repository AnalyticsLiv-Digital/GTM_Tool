/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import VariableModal from "@/app/dashboard/components/modals/VariableModal";
import ExportVariablesModal from "@/app/dashboard/components/modals/ExportVariablesModal";

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

export default function VariablesPage() {
  const store = useDashboardStore();
  const { fetchVariables, openCreateVariableModal } = useDashboardActions();

  return (
    <EntityListPage<any>
      title="Variables"
      description="Manage all GTM variables inside your selected workspace."
      singularName="variable"
      pluralName="variables"
      newButtonLabel="+ New Variable"
      searchPlaceholder="Search variables..."
      items={store.variables}
      loading={store.variablesLoading}
      error={store.variablesError}
      getId={(v) => v.variableId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchVariables}
      onCreate={openCreateVariableModal}
      columns={[
        {
          label: "Variable Name",
          render: (v) => (
            <>
              <p className="font-medium text-fg">{v.name}</p>
              <p className="text-[11px] font-mono text-faint mt-0.5">{v.variableId}</p>
            </>
          ),
        },
        {
          label: "Variable Type",
          render: (v) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #10b981 14%, transparent)",
                color: "#10b981",
                borderColor: "color-mix(in srgb, #10b981 25%, transparent)",
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
