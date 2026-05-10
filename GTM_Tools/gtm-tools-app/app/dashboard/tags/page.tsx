/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TagModal from "@/app/dashboard/components/modals/TagModal";
import ExportTagsModal from "@/app/dashboard/components/modals/ExportTagsModal";

const tagTypeMap: Record<string, string> = {
  html: "Custom HTML",
  img: "Custom Image",
  ua: "Google Analytics (Universal Analytics)",
  gaawc: "GA4 Configuration",
  gaawe: "GA4 Event",
  awct: "Google Ads Conversion Tracking",
  awgt: "Google Ads Remarketing",
  sp: "Conversion Linker",
  flc: "Floodlight Counter",
  fls: "Floodlight Sales",
  gcs: "Consent Mode / Consent Settings",
  consentInit: "Consent Initialization",
  fbq: "Facebook Pixel",
  twitter: "Twitter Universal Website Tag",
  linkedin: "LinkedIn Insight Tag",
  pinterest: "Pinterest Tag",
  tiktok: "TikTok Pixel",
  snapchat: "Snapchat Pixel",
  googtag: "Google Tag",
  bzi: "Bizrate Insights Tag",
  gclidw: "Google Ads Click ID (GCLID) Tracking",
  awud: "Google Ads User Data (Enhanced Conversions)",
  awcc: "Google Ads Call Conversion Tracking",
  pntr: "Pinterest Tag",
};

export default function TagsPage() {
  const store = useDashboardStore();
  const { fetchTags, openCreateTagModal } = useDashboardActions();

  return (
    <EntityListPage<any>
      title="Tags"
      description="Manage all GTM tags inside your selected workspace."
      singularName="tag"
      pluralName="tags"
      newButtonLabel="+ New Tag"
      searchPlaceholder="Search tags..."
      items={store.tags}
      loading={store.tagsLoading}
      error={store.tagsError}
      getId={(t) => t.tagId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTags}
      onCreate={openCreateTagModal}
      columns={[
        {
          label: "Tag Name",
          render: (t) => (
            <>
              <p className="font-medium text-fg">{t.name}</p>
              <p className="text-[11px] font-mono text-faint mt-0.5">{t.tagId}</p>
            </>
          ),
        },
        {
          label: "Tag Type",
          render: (t) => (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
              style={{
                background: "color-mix(in srgb, #3b82f6 14%, transparent)",
                color: "#3b82f6",
                borderColor: "color-mix(in srgb, #3b82f6 25%, transparent)",
              }}
            >
              {tagTypeMap[t.type] || t.type || "Unknown"}
            </span>
          ),
        },
      ]}
      renderCreateEditModal={() => <TagModal />}
      renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => (
        <ExportTagsModal
          show={show}
          onClose={onClose}
          onExportSuccess={onExportSuccess}
          selectedTags={selectedItems}
        />
      )}
    />
  );
}
