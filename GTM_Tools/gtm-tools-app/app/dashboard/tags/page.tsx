/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

import TagModal from "@/app/dashboard/components/modals/TagModal";
import ExportTagsModal from "@/app/dashboard/components/modals/ExportTagsModal";

export default function TagsPage() {
  const store = useDashboardStore();
  const { fetchTags, openCreateTagModal } = useDashboardActions();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch Tags only when workspace changes
  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  // Reset selection when workspace changes
  useEffect(() => {
    setSelectedTagIds([]);
  }, [store.selectedWorkspaceId]);

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

  const allSelected = useMemo(() => {
    if (store.tags.length === 0) return false;
    return selectedTagIds.length === store.tags.length;
  }, [selectedTagIds, store.tags]);

  const selectedTags = useMemo(() => {
    return store.tags.filter((tag: any) => selectedTagIds.includes(tag.tagId));
  }, [selectedTagIds, store.tags]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedTagIds([]);
    } else {
      const ids = store.tags.map((tag: any) => tag.tagId);
      setSelectedTagIds(ids);
    }
  }

  function toggleSingleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
  }

  return (
    <div className="p-6">
      {/* CREATE TAG MODAL */}
      <TagModal />

      {/* EXPORT TAG MODAL */}
      <ExportTagsModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedTags={selectedTags}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-900">Tags</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedTagIds.length === 0}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            Export Selected ({selectedTagIds.length})
          </button>

          <button
            onClick={openCreateTagModal}
            disabled={!store.selectedWorkspaceId}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            New Tag
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
      {store.tagsLoading && (
        <p className="text-sm text-gray-500 mt-3">Loading tags...</p>
      )}

      {store.tagsError && (
        <p className="text-sm text-red-600 mt-3">{store.tagsError}</p>
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
            {store.tags.map((tag: any) => {
              const isChecked = selectedTagIds.includes(tag.tagId);

              return (
                <tr
                  key={tag.tagId}
                  className={`border-b hover:bg-gray-50 ${
                    isChecked ? "bg-blue-50" : ""
                  }`}
                >
                  {/* CHECKBOX */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleTag(tag.tagId)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-900">
                    {tag.name}
                    <p className="text-xs text-gray-500">ID: {tag.tagId}</p>
                  </td>

                  <td className="px-4 py-3">
                    {tagTypeMap[tag.type] ? (
                      tagTypeMap[tag.type]
                    ) : (
                      <span className="text-gray-500">
                        Custom Template Tag ({tag.type})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {store.tags.length === 0 && !store.tagsLoading && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-500">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-gray-500">
        Showing {store.tags.length} tag(s). Selected {selectedTagIds.length}.
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";
// import TagModal from "../components/modals/TagModal";

// export default function TagsPage() {
//   const store = useDashboardStore();
//   const { fetchTags, openCreateTagModal, openEditTagModal, handleDeleteTag } =
//     useDashboardActions();

//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchTags();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);
//   const tagTypeMap: Record<string, string> = {
//     html: "Custom HTML",
//     img: "Custom Image",
//     ua: "Google Analytics (Universal Analytics)",
//     gaawc: "GA4 Configuration",
//     gaawe: "GA4 Event",
//     awct: "Google Ads Conversion Tracking",
//     awgt: "Google Ads Remarketing",
//     sp: "Conversion Linker",
//     flc: "Floodlight Counter",
//     fls: "Floodlight Sales",
//     gcs: "Consent Mode / Consent Settings",
//     consentInit: "Consent Initialization",
//     fbq: "Facebook Pixel",
//     twitter: "Twitter Universal Website Tag",
//     linkedin: "LinkedIn Insight Tag",
//     pinterest: "Pinterest Tag",
//     tiktok: "TikTok Pixel",
//     snapchat: "Snapchat Pixel",
//     googtag: "Google Tag",
//     cvt_48377659_174: "Custom Template Tag (Conversion / Vendor Template)",
//     bzi: "Bizrate Insights Tag",
//     gclidw: "Google Ads Click ID (GCLID) Tracking",
//     awud: "Google Ads User Data (Enhanced Conversions)",
//     awcc: "Google Ads Call Conversion Tracking",
//     pntr: "Pinterest Tag"
//   };
//   return (
//     <div className="p-6">
//       <TagModal />

//       <div className="flex justify-between items-center mb-5">
//         <h1 className="text-xl font-bold text-gray-900">Tags</h1>

//         <button
//           onClick={openCreateTagModal}
//           disabled={!store.selectedWorkspaceId}
//           className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
//         >
//           New
//         </button>
//       </div>

//       {!store.selectedWorkspaceId && (
//         <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
//           Please select a workspace first.
//         </div>
//       )}

//       {store.tagsLoading && (
//         <p className="text-sm text-gray-500 mt-3">Loading tags...</p>
//       )}

//       {store.tagsError && (
//         <p className="text-sm text-red-600 mt-3">{store.tagsError}</p>
//       )}

//       <div className="mt-4 bg-white rounded-2xl shadow border overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b">
//             <tr>
//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Name
//               </th>
//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Type
//               </th>
//               <th className="text-right px-4 py-3 font-semibold text-gray-700">
//                 Actions
//               </th>
//             </tr>
//           </thead>

//           <tbody>
//             {store.tags.map((tag: any) => (
//               <tr
//                 key={tag.tagId}
//                 className={`border-b hover:bg-gray-50 ${store.selectedTagId === tag.tagId ? "bg-blue-50" : ""
//                   }`}
//                 onClick={() => store.setSelectedTagId(tag.tagId)}
//               >
//                 <td className="px-4 py-3">{tag.name}</td>
//                 <td className="px-4 py-3">
//                   {tagTypeMap[tag.type] ? (
//                     tagTypeMap[tag.type]
//                   ) : (
//                     <span className="text-gray-500">
//                       Custom Template Tag ({tag.type})
//                     </span>
//                   )}
//                 </td>

//                 <td className="px-4 py-3 text-right space-x-2">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       store.setSelectedTagId(tag.tagId);
//                       openEditTagModal();
//                     }}
//                     className="px-3 py-1 rounded-lg border text-xs font-semibold hover:bg-gray-100"
//                   >
//                     Edit
//                   </button>

//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       store.setSelectedTagId(tag.tagId);
//                       handleDeleteTag();
//                     }}
//                     className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}

//             {store.tags.length === 0 && !store.tagsLoading && (
//               <tr>
//                 <td colSpan={3} className="text-center py-8 text-gray-500">
//                   No tags found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }