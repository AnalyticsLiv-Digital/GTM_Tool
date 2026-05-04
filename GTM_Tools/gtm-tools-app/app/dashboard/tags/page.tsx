/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

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

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  useEffect(() => {
    setSelectedTagIds([]);
  }, [store.selectedWorkspaceId]);

  const filteredTags = useMemo(() => {
    return store.tags.filter((tag: any) =>
      tag.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [store.tags, searchText]);

  const allSelected = useMemo(() => {
    if (filteredTags.length === 0) return false;
    return selectedTagIds.length === filteredTags.length;
  }, [selectedTagIds, filteredTags]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedTagIds([]);
    } else {
      const ids = filteredTags.map((tag: any) => tag.tagId);
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

  const selectedTags = useMemo(() => {
    return store.tags.filter((t: any) => selectedTagIds.includes(t.tagId));
  }, [store.tags, selectedTagIds]);

  return (
    <div className="p-6">
      {/* CREATE TAG MODAL */}
      <TagModal />

      {/* EXPORT TAG MODAL */}
      <ExportTagsModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          setSelectedTagIds([]);
          setShowExportModal(false);
        }}
        selectedTags={selectedTags}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Tags
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage all GTM tags inside your selected workspace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={selectedTagIds.length === 0}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-green-500 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            Export Selected ({selectedTagIds.length})
          </button>

          <button
            onClick={openCreateTagModal}
            disabled={!store.selectedWorkspaceId}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            + New Tag
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search tags..."
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
      {store.tagsLoading && (
        <p className="text-sm text-slate-500 mt-3">Loading tags...</p>
      )}

      {store.tagsError && (
        <p className="text-sm text-red-600 mt-3">{store.tagsError}</p>
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
                Tag Name
              </th>

              <th className="text-left px-4 py-4 font-semibold text-slate-700">
                Tag Type
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredTags.map((tag: any) => {
              const isChecked = selectedTagIds.includes(tag.tagId);

              return (
                <tr
                  key={tag.tagId}
                  className={`border-b border-slate-200 transition-all duration-200 ${isChecked
                      ? "bg-linear-to-r from-indigo-50 via-purple-50 to-white"
                      : "hover:bg-slate-50"
                    }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleTag(tag.tagId)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{tag.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tag ID: {tag.tagId}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {tagTypeMap[tag.type] || tag.type || "Unknown"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredTags.length === 0 && !store.tagsLoading && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-slate-500">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-4 text-xs text-slate-500">
        Showing {filteredTags.length} tag(s). Selected {selectedTagIds.length}.
      </div>
    </div>
  );
}


// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";

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

//   const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
//   const [showExportModal, setShowExportModal] = useState(false);

//   const [searchText, setSearchText] = useState("");

//   // Fetch Tags only when workspace changes
//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchTags();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   // Reset selection when workspace changes
//   useEffect(() => {
//     setSelectedTagIds([]);
//   }, [store.selectedWorkspaceId]);

//   const filteredTags = useMemo(() => {
//     return store.tags.filter((tag: any) =>
//       tag.name?.toLowerCase().includes(searchText.toLowerCase())
//     );
//   }, [store.tags, searchText]);

//   const allSelected = useMemo(() => {
//     if (filteredTags.length === 0) return false;
//     return selectedTagIds.length === filteredTags.length;
//   }, [selectedTagIds, filteredTags]);

//   function toggleSelectAll() {
//     if (allSelected) {
//       setSelectedTagIds([]);
//     } else {
//       const ids = filteredTags.map((tag: any) => tag.tagId);
//       setSelectedTagIds(ids);
//     }
//   }

//   function toggleSingleTag(tagId: string) {
//     setSelectedTagIds((prev) => {
//       if (prev.includes(tagId)) {
//         return prev.filter((id) => id !== tagId);
//       }
//       return [...prev, tagId];
//     });
//   }

//   const selectedTags = useMemo(() => {
//     return store.tags.filter((t: any) => selectedTagIds.includes(t.tagId));
//   }, [store.tags, selectedTagIds]);

//   return (
//     <div className="p-6">
//       {/* CREATE TAG MODAL */}
//       <TagModal />

//       {/* EXPORT TAG MODAL */}
//       <ExportTagsModal
//         show={showExportModal}
//         onClose={() => setShowExportModal(false)}
//         onExportSuccess={() => {
//           setSelectedTagIds([]); // ✅ clear only on success
//           setShowExportModal(false);
//         }}
//         selectedTags={selectedTags}
//       />

//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-5">
//         <h1 className="text-xl font-bold text-gray-900">Tags</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={() => setShowExportModal(true)}
//             disabled={selectedTagIds.length === 0}
//             className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
//           >
//             Export Selected ({selectedTagIds.length})
//           </button>

//           <button
//             onClick={openCreateTagModal}
//             disabled={!store.selectedWorkspaceId}
//             className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
//           >
//             New Tag
//           </button>
//         </div>
//       </div>

//       {/* SEARCH */}
//       <div className="mb-4">
//         <input
//           type="text"
//           placeholder="Search tags..."
//           value={searchText}
//           onChange={(e) => setSearchText(e.target.value)}
//           className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
//         />
//       </div>

//       {/* WORKSPACE WARNING */}
//       {!store.selectedWorkspaceId && (
//         <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
//           Please select a workspace first.
//         </div>
//       )}

//       {/* LOADING / ERROR */}
//       {store.tagsLoading && (
//         <p className="text-sm text-gray-500 mt-3">Loading tags...</p>
//       )}

//       {store.tagsError && (
//         <p className="text-sm text-red-600 mt-3">{store.tagsError}</p>
//       )}

//       {/* TABLE */}
//       <div className="mt-4 bg-white rounded-2xl shadow border overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b">
//             <tr>
//               {/* SELECT ALL */}
//               <th className="px-4 py-3 text-left w-12">
//                 <input
//                   type="checkbox"
//                   checked={allSelected}
//                   onChange={toggleSelectAll}
//                   className="w-4 h-4 cursor-pointer"
//                 />
//               </th>

//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Name
//               </th>

//               <th className="text-left px-4 py-3 font-semibold text-gray-700">
//                 Type
//               </th>
//             </tr>
//           </thead>

//           <tbody>
//             {filteredTags.map((tag: any) => {
//               const isChecked = selectedTagIds.includes(tag.tagId);

//               return (
//                 <tr
//                   key={tag.tagId}
//                   className={`border-b hover:bg-gray-50 ${isChecked ? "bg-blue-50" : ""
//                     }`}
//                 >
//                   {/* CHECKBOX */}
//                   <td className="px-4 py-3">
//                     <input
//                       type="checkbox"
//                       checked={isChecked}
//                       onChange={() => toggleSingleTag(tag.tagId)}
//                       className="w-4 h-4 cursor-pointer"
//                     />
//                   </td>

//                   <td className="px-4 py-3 font-medium text-gray-900">
//                     {tag.name}
//                     <p className="text-xs text-gray-500">ID: {tag.tagId}</p>
//                   </td>

//                   <td className="px-4 py-3">
//                     <p className="font-medium text-gray-900">
//                       {tagTypeMap[tag.type] || tag.type || "Unknown"}
//                     </p>
//                   </td>
//                 </tr>
//               );
//             })}

//             {filteredTags.length === 0 && !store.tagsLoading && (
//               <tr>
//                 <td colSpan={3} className="text-center py-8 text-gray-500">
//                   No tags found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* FOOTER INFO */}
//       <div className="mt-4 text-xs text-gray-500">
//         Showing {filteredTags.length} tag(s). Selected {selectedTagIds.length}.
//       </div>
//     </div>
//   );
// }
