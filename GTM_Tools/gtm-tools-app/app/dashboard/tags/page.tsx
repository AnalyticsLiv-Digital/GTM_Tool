/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
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

  const [selectedTagType, setSelectedTagType] = useState("");

  // ✅ Count tag types
  const tagTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.tags || []).forEach((tag: any) => {
      const type = tag.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.tags]);

  // ✅ Unique sorted types
  const uniqueTagTypes = useMemo(() => {
    return Object.keys(tagTypeCounts).sort((a, b) =>
      (tagTypeMap[a] || a).localeCompare(tagTypeMap[b] || b)
    );
  }, [tagTypeCounts]);

  const builtInTriggerMap: Record<string, string> = {
    "2147479553": "All Pages",
    "2147479554": "DOM Ready",
    "2147479555": "Window Loaded",
  };

  return (
    <EntityListPage<any>
      title="Tags"
      description="Manage all GTM tags inside your selected workspace."
      singularName="tag"
      pluralName="tags"
      newButtonLabel="+ New Tag"
      searchPlaceholder="Search tags by name..."
      items={store.tags}
      loading={store.tagsLoading}
      error={store.tagsError}
      getId={(t) => t.tagId}
      workspaceSelected={!!store.selectedWorkspaceId}
      onFetch={fetchTags}
      onCreate={openCreateTagModal}
      filterField={(t) => t.name} // ✅ Search only Tag Name
      customFilter={(t) => {
        if (!selectedTagType) return true;
        return t.type === selectedTagType;
      }}
      filters={
        <select
          value={selectedTagType}
          onChange={(e) => setSelectedTagType(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            All Tag Types ({store.tags?.length || 0})
          </option>

          {uniqueTagTypes.map((type) => (
            <option key={type} value={type}>
              {(tagTypeMap[type] || type) + ` (${tagTypeCounts[type]})`}
            </option>
          ))}
        </select>
      }
      
      // columns={[
      //   {
      //     label: "Tag Name",
      //     render: (t) => (
      //       <>
      //         <p className="font-medium text-fg">{t.name}</p>
      //         <p className="text-[11px] font-mono text-faint mt-0.5">
      //           {t.tagId}
      //         </p>
      //       </>
      //     ),
      //   },
      //   {
      //     label: "Tag Type",
      //     render: (t) => (
      //       <span
      //         className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
      //         style={{
      //           background: "color-mix(in srgb, #3b82f6 14%, transparent)",
      //           color: "#3b82f6",
      //           borderColor: "color-mix(in srgb, #3b82f6 25%, transparent)",
      //         }}
      //       >
      //         {tagTypeMap[t.type] || t.type || "Unknown"}
      //       </span>
      //     ),
      //   },
      // ]}

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
        // {
        //   label: "Firing Triggers",
        //   render: (t) => {
        //     const triggerNames =
        //       (t.firingTriggerId || [])
        //         .map((id: string) => {
        //           const trig = (store.triggers || []).find(
        //             (tr: any) => tr.triggerId === id
        //           );
        //           return trig?.name || id;
        //         })
        //         .filter(Boolean);

        //     if (triggerNames.length === 0) {
        //       return <span className="text-faint text-[12px]">No trigger</span>;
        //     }

        //     return (
        //       <div className="flex flex-col gap-1">
        //         {triggerNames.slice(0, 3).map((name: string, idx: number) => (
        //           <span
        //             key={idx}
        //             className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi"
        //           >
        //             {name}
        //           </span>
        //         ))}

        //         {triggerNames.length > 3 && (
        //           <span className="text-[11px] text-faint">
        //             +{triggerNames.length - 3} more
        //           </span>
        //         )}
        //       </div>
        //     );
        //   },
        // },
        {
          label: "Firing Triggers",
          render: (t) => {
            const triggerNames =
              (t.firingTriggerId || [])
                .map((id: string) => {
                  const trig = (store.triggers || []).find(
                    (tr: any) => tr.triggerId === id
                  );

                  return trig?.name || builtInTriggerMap[id] || id;
                })
                .filter(Boolean);

            if (triggerNames.length === 0) {
              return <span className="text-faint text-[12px]">No trigger</span>;
            }

            return (
              <div className="flex flex-wrap gap-1 max-w-70">
                {triggerNames.map((name: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-line bg-card-hi whitespace-nowrap"
                  >
                    {name}
                  </span>
                ))}
              </div>
            );
          },
        }
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


// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";
// import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
// import TagModal from "@/app/dashboard/components/modals/TagModal";
// import ExportTagsModal from "@/app/dashboard/components/modals/ExportTagsModal";

// const tagTypeMap: Record<string, string> = {
//   html: "Custom HTML",
//   img: "Custom Image",
//   ua: "Google Analytics (Universal Analytics)",
//   gaawc: "GA4 Configuration",
//   gaawe: "GA4 Event",
//   awct: "Google Ads Conversion Tracking",
//   awgt: "Google Ads Remarketing",
//   sp: "Conversion Linker",
//   flc: "Floodlight Counter",
//   fls: "Floodlight Sales",
//   gcs: "Consent Mode / Consent Settings",
//   consentInit: "Consent Initialization",
//   fbq: "Facebook Pixel",
//   twitter: "Twitter Universal Website Tag",
//   linkedin: "LinkedIn Insight Tag",
//   pinterest: "Pinterest Tag",
//   tiktok: "TikTok Pixel",
//   snapchat: "Snapchat Pixel",
//   googtag: "Google Tag",
//   bzi: "Bizrate Insights Tag",
//   gclidw: "Google Ads Click ID (GCLID) Tracking",
//   awud: "Google Ads User Data (Enhanced Conversions)",
//   awcc: "Google Ads Call Conversion Tracking",
//   pntr: "Pinterest Tag",
// };

// export default function TagsPage() {
//   const store = useDashboardStore();
//   const { fetchTags, openCreateTagModal } = useDashboardActions();

//   return (
//     <EntityListPage<any>
//       title="Tags"
//       description="Manage all GTM tags inside your selected workspace."
//       singularName="tag"
//       pluralName="tags"
//       newButtonLabel="+ New Tag"
//       searchPlaceholder="Search tags..."
//       items={store.tags}
//       loading={store.tagsLoading}
//       error={store.tagsError}
//       getId={(t) => t.tagId}
//       workspaceSelected={!!store.selectedWorkspaceId}
//       onFetch={fetchTags}
//       onCreate={openCreateTagModal}
//       columns={[
//         {
//           label: "Tag Name",
//           render: (t) => (
//             <>
//               <p className="font-medium text-fg">{t.name}</p>
//               <p className="text-[11px] font-mono text-faint mt-0.5">{t.tagId}</p>
//             </>
//           ),
//         },
//         {
//           label: "Tag Type",
//           render: (t) => (
//             <span
//               className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border"
//               style={{
//                 background: "color-mix(in srgb, #3b82f6 14%, transparent)",
//                 color: "#3b82f6",
//                 borderColor: "color-mix(in srgb, #3b82f6 25%, transparent)",
//               }}
//             >
//               {tagTypeMap[t.type] || t.type || "Unknown"}
//             </span>
//           ),
//         },
//       ]}
//       renderCreateEditModal={() => <TagModal />}
//       renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => (
//         <ExportTagsModal
//           show={show}
//           onClose={onClose}
//           onExportSuccess={onExportSuccess}
//           selectedTags={selectedItems}
//         />
//       )}
//     />
//   );
// }
