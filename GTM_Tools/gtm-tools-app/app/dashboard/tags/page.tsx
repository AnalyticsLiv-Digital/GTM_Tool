/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TagModal from "@/app/dashboard/components/modals/TagModal";
import ExportTagsModal from "@/app/dashboard/components/modals/ExportTagsModal";
import ExportTagDependenciesModal from "@/app/dashboard/components/modals/ExportTagDependenciesModal";

import {
  ChevronDown,
  Search,
  Tag,
  Code,
  BarChart3,
  Target,
  ShieldCheck,
  Globe,
  Briefcase,
  Pin,
  PlayCircle,
  Music,
  MessageCircle,
  AtSign,
} from "lucide-react";

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

function getTagIcon(type: string) {
  if (type === "gaawc" || type === "gaawe") {
    return <BarChart3 size={16} color="#E37400" />;
  }

  if (type === "ua") {
    return <BarChart3 size={16} color="#F9AB00" />;
  }

  if (type.startsWith("aw")) {
    return <Target size={16} color="#4285F4" />;
  }

  if (type === "googtag") {
    return <ShieldCheck size={16} color="#246FDB" />;
  }

  if (type === "html") {
    return <Code size={16} color="#E34F26" />;
  }

  if (type === "fbq") {
    return <Globe size={16} color="#1877F2" />;
  }

  if (type === "linkedin") {
    return <Briefcase size={16} color="#0A66C2" />;
  }

  if (type === "pinterest" || type === "pntr") {
    return <Pin size={16} color="#E60023" />;
  }

  if (type === "twitter") {
    return <AtSign size={16} color="#111827" />;
  }

  if (type === "snapchat") {
    return <MessageCircle size={16} color="#FFFC00" />;
  }

  if (type === "tiktok") {
    return <Music size={16} color="#000000" />;
  }

  if (type === "youtube") {
    return <PlayCircle size={16} color="#FF0000" />;
  }

  return <Tag size={16} color="#6b7280" />;
}

export default function TagsPage() {
  const store = useDashboardStore();
  const { fetchTags, openCreateTagModal } = useDashboardActions();

  const [selectedTagType, setSelectedTagType] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dependency modal state
  const [showDependenciesModal, setShowDependenciesModal] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Store selected items before dependency modal opens
  const [pendingSelectedTags, setPendingSelectedTags] = useState<any[]>([]);

  // store modal callbacks (safe to keep in ref because not used in render)
  const exportCallbacksRef = useRef<any>(null);

  // store dependency selection payload
  const [dependencyPayload, setDependencyPayload] = useState<{
    selectedTags: any[];
    selectedTriggerIds: string[];
    selectedVariableNames: string[];
    selectedTemplateIds: string[];
  } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Count tag types
  const tagTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.tags || []).forEach((tag: any) => {
      const type = tag.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.tags]);

  // Unique sorted types
  const uniqueTagTypes = useMemo(() => {
    return Object.keys(tagTypeCounts).sort((a, b) =>
      (tagTypeMap[a] || a).localeCompare(tagTypeMap[b] || b)
    );
  }, [tagTypeCounts]);

  // Filtered types for search
  const filteredTagTypes = useMemo(() => {
    if (!search.trim()) return uniqueTagTypes;

    return uniqueTagTypes.filter((type) =>
      (tagTypeMap[type] || type).toLowerCase().includes(search.toLowerCase())
    );
  }, [uniqueTagTypes, search]);

  const builtInTriggerMap: Record<string, string> = {
    "2147479553": "All Pages",
    "2147479554": "DOM Ready",
    "2147479555": "Window Loaded",
  };

  const selectedLabel = selectedTagType
    ? `${tagTypeMap[selectedTagType] || selectedTagType} (${
        tagTypeCounts[selectedTagType] || 0
      })`
    : `All Tag Types (${store.tags?.length || 0})`;

  return (
    <>
      {/* DEPENDENCY MODAL */}
      <ExportTagDependenciesModal
        show={showDependenciesModal}
        onClose={() => {
          setShowDependenciesModal(false);
          setDependencyPayload(null);
          setPendingSelectedTags([]);
          exportCallbacksRef.current = null;
        }}
        selectedTags={pendingSelectedTags}
        onContinue={(payload) => {
          setDependencyPayload(payload);
          setShowDependenciesModal(false);
          setShowExportModal(true);
        }}
      />

      {/* EXPORT TAGS MODAL */}
      <ExportTagsModal
        show={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setDependencyPayload(null);

          if (exportCallbacksRef.current?.onClose) {
            exportCallbacksRef.current.onClose();
          }
        }}
        onExportSuccess={() => {
          setShowExportModal(false);

          if (exportCallbacksRef.current?.onExportSuccess) {
            exportCallbacksRef.current.onExportSuccess();
          }

          setDependencyPayload(null);
          setPendingSelectedTags([]);
          exportCallbacksRef.current = null;
        }}
        selectedTags={dependencyPayload?.selectedTags || []}
        selectedTriggerIds={dependencyPayload?.selectedTriggerIds || []}
        selectedVariableNames={dependencyPayload?.selectedVariableNames || []}
        selectedTemplateIds={dependencyPayload?.selectedTemplateIds || []}
      />

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
        filterField={(t) => t.name}
        customFilter={(t) => {
          if (!selectedTagType) return true;
          return t.type === selectedTagType;
        }}
        filters={
          <div className="relative w-full" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="shrink-0">
                  {selectedTagType ? (
                    getTagIcon(selectedTagType)
                  ) : (
                    <Tag size={16} color="#6b7280" />
                  )}
                </span>

                <span className="truncate font-medium text-fg">
                  {selectedLabel}
                </span>
              </div>

              <ChevronDown
                size={16}
                className={`text-muted transition ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
                <div className="p-2 border-b border-line bg-card-hi">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
                    <Search size={15} className="text-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search tag types..."
                      className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTagType("");
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                      selectedTagType === "" ? "bg-card-hi" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={16} color="#6b7280" />
                      <span className="text-fg font-medium">
                        All Tag Types
                      </span>
                    </div>

                    <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                      {store.tags?.length || 0}
                    </span>
                  </button>

                  {filteredTagTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedTagType(type);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                        selectedTagType === type ? "bg-card-hi" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{getTagIcon(type)}</span>
                        <span className="text-fg font-medium">
                          {tagTypeMap[type] || type}
                        </span>
                      </div>

                      <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                        {tagTypeCounts[type]}
                      </span>
                    </button>
                  ))}

                  {filteredTagTypes.length === 0 && (
                    <p className="text-sm text-muted px-4 py-3">
                      No matching tag types.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        }
        columns={[
          {
            label: "Tag Name",
            render: (t) => (
              <>
                <p className="font-medium text-fg">{t.name}</p>
                <p className="text-[11px] font-mono text-faint mt-0.5">
                  {t.tagId}
                </p>
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
                return (
                  <span className="text-faint text-[12px]">No trigger</span>
                );
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
          },
        ]}
        renderCreateEditModal={() => <TagModal />}
        renderExportModal={({ show, onClose, onExportSuccess, selectedItems }) => {
          if (show && !showDependenciesModal && !showExportModal) {
            setPendingSelectedTags(selectedItems || []);
            exportCallbacksRef.current = { onClose, onExportSuccess };
            setShowDependenciesModal(true);
          }

          return null;
        }}
      />
    </>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useMemo, useState, useRef, useEffect } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";
// import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
// import TagModal from "@/app/dashboard/components/modals/TagModal";
// import ExportTagsModal from "@/app/dashboard/components/modals/ExportTagsModal";

// import {
//   ChevronDown,
//   Search,
//   Tag,
//   Code,
//   BarChart3,
//   Target,
//   ShieldCheck,
//   Globe,
//   Briefcase,
//   Pin,
//   PlayCircle,
//   Music,
//   MessageCircle,
//   AtSign,
// } from "lucide-react";

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

// function getTagIcon(type: string) {
//   // GA4
//   if (type === "gaawc" || type === "gaawe") {
//     return <BarChart3 size={16} color="#E37400" />;
//   }

//   // Universal Analytics
//   if (type === "ua") {
//     return <BarChart3 size={16} color="#F9AB00" />;
//   }

//   // Google Ads
//   if (type.startsWith("aw")) {
//     return <Target size={16} color="#4285F4" />;
//   }

//   // Google Tag
//   if (type === "googtag") {
//     return <ShieldCheck size={16} color="#246FDB" />;
//   }

//   // HTML / IMG
//   if (type === "html") {
//     return <Code size={16} color="#E34F26" />;
//   }

//   // if (type === "img") {
//   //   return <Image size={16} color="#E34F26" />;
//   // }

//   // Facebook
//   if (type === "fbq") {
//     return <Globe size={16} color="#1877F2" />;
//   }

//   // LinkedIn
//   if (type === "linkedin") {
//     return <Briefcase size={16} color="#0A66C2" />;
//   }

//   // Pinterest
//   if (type === "pinterest" || type === "pntr") {
//     return <Pin size={16} color="#E60023" />;
//   }

//   // Twitter / X
//   if (type === "twitter") {
//     return <AtSign size={16} color="#111827" />;
//   }

//   // Snapchat
//   if (type === "snapchat") {
//     return <MessageCircle size={16} color="#FFFC00" />;
//   }

//   // TikTok
//   if (type === "tiktok") {
//     return <Music size={16} color="#000000" />;
//   }

//   // YouTube
//   if (type === "youtube") {
//     return <PlayCircle size={16} color="#FF0000" />;
//   }

//   return <Tag size={16} color="#6b7280" />;
// }

// export default function TagsPage() {
//   const store = useDashboardStore();
//   const { fetchTags, openCreateTagModal } = useDashboardActions();

//   const [selectedTagType, setSelectedTagType] = useState("");
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [search, setSearch] = useState("");

//   const dropdownRef = useRef<HTMLDivElement>(null);

//   // Close dropdown on outside click
//   useEffect(() => {
//     function handleOutsideClick(e: MouseEvent) {
//       if (!dropdownRef.current?.contains(e.target as Node)) {
//         setDropdownOpen(false);
//       }
//     }

//     document.addEventListener("mousedown", handleOutsideClick);
//     return () => document.removeEventListener("mousedown", handleOutsideClick);
//   }, []);

//   // Count tag types
//   const tagTypeCounts = useMemo(() => {
//     const counts: Record<string, number> = {};

//     (store.tags || []).forEach((tag: any) => {
//       const type = tag.type || "unknown";
//       counts[type] = (counts[type] || 0) + 1;
//     });

//     return counts;
//   }, [store.tags]);

//   // Unique sorted types
//   const uniqueTagTypes = useMemo(() => {
//     return Object.keys(tagTypeCounts).sort((a, b) =>
//       (tagTypeMap[a] || a).localeCompare(tagTypeMap[b] || b)
//     );
//   }, [tagTypeCounts]);

//   // Filtered types for search
//   const filteredTagTypes = useMemo(() => {
//     if (!search.trim()) return uniqueTagTypes;

//     return uniqueTagTypes.filter((type) =>
//       (tagTypeMap[type] || type).toLowerCase().includes(search.toLowerCase())
//     );
//   }, [uniqueTagTypes, search]);

//   const builtInTriggerMap: Record<string, string> = {
//     "2147479553": "All Pages",
//     "2147479554": "DOM Ready",
//     "2147479555": "Window Loaded",
//   };

//   const selectedLabel = selectedTagType
//     ? `${tagTypeMap[selectedTagType] || selectedTagType} (${
//         tagTypeCounts[selectedTagType] || 0
//       })`
//     : `All Tag Types (${store.tags?.length || 0})`;

//   return (
//     <EntityListPage<any>
//       title="Tags"
//       description="Manage all GTM tags inside your selected workspace."
//       singularName="tag"
//       pluralName="tags"
//       newButtonLabel="+ New Tag"
//       searchPlaceholder="Search tags by name..."
//       items={store.tags}
//       loading={store.tagsLoading}
//       error={store.tagsError}
//       getId={(t) => t.tagId}
//       workspaceSelected={!!store.selectedWorkspaceId}
//       onFetch={fetchTags}
//       onCreate={openCreateTagModal}
//       filterField={(t) => t.name}
//       customFilter={(t) => {
//         if (!selectedTagType) return true;
//         return t.type === selectedTagType;
//       }}
//       filters={
//         <div className="relative w-full" ref={dropdownRef}>
//           {/* Trigger Button */}
//           <button
//             type="button"
//             onClick={() => setDropdownOpen((prev) => !prev)}
//             className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm"
//           >
//             <div className="flex items-center gap-2 truncate">
//               <span className="shrink-0">
//                 {selectedTagType ? (
//                   getTagIcon(selectedTagType)
//                 ) : (
//                   <Tag size={16} color="#6b7280" />
//                 )}
//               </span>

//               <span className="truncate font-medium text-fg">
//                 {selectedLabel}
//               </span>
//             </div>

//             <ChevronDown
//               size={16}
//               className={`text-muted transition ${
//                 dropdownOpen ? "rotate-180" : ""
//               }`}
//             />
//           </button>

//           {/* Dropdown */}
//           {dropdownOpen && (
//             <div className="absolute mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
//               {/* Search */}
//               <div className="p-2 border-b border-line bg-card-hi">
//                 <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
//                   <Search size={15} className="text-muted" />
//                   <input
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     placeholder="Search tag types..."
//                     className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
//                   />
//                 </div>
//               </div>

//               {/* Options */}
//               <div className="max-h-72 overflow-y-auto">
//                 {/* All */}
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSelectedTagType("");
//                     setDropdownOpen(false);
//                   }}
//                   className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
//                     selectedTagType === "" ? "bg-card-hi" : ""
//                   }`}
//                 >
//                   <div className="flex items-center gap-2">
//                     <Tag size={16} color="#6b7280" />
//                     <span className="text-fg font-medium">
//                       All Tag Types
//                     </span>
//                   </div>

//                   <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
//                     {store.tags?.length || 0}
//                   </span>
//                 </button>

//                 {/* Types */}
//                 {filteredTagTypes.map((type) => (
//                   <button
//                     key={type}
//                     type="button"
//                     onClick={() => {
//                       setSelectedTagType(type);
//                       setDropdownOpen(false);
//                     }}
//                     className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
//                       selectedTagType === type ? "bg-card-hi" : ""
//                     }`}
//                   >
//                     <div className="flex items-center gap-2">
//                       <span className="shrink-0">{getTagIcon(type)}</span>
//                       <span className="text-fg font-medium">
//                         {tagTypeMap[type] || type}
//                       </span>
//                     </div>

//                     <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
//                       {tagTypeCounts[type]}
//                     </span>
//                   </button>
//                 ))}

//                 {filteredTagTypes.length === 0 && (
//                   <p className="text-sm text-muted px-4 py-3">
//                     No matching tag types.
//                   </p>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       }
//       columns={[
//         {
//           label: "Tag Name",
//           render: (t) => (
//             <>
//               <p className="font-medium text-fg">{t.name}</p>
//               <p className="text-[11px] font-mono text-faint mt-0.5">
//                 {t.tagId}
//               </p>
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
//         {
//           label: "Firing Triggers",
//           render: (t) => {
//             const triggerNames =
//               (t.firingTriggerId || [])
//                 .map((id: string) => {
//                   const trig = (store.triggers || []).find(
//                     (tr: any) => tr.triggerId === id
//                   );

//                   return trig?.name || builtInTriggerMap[id] || id;
//                 })
//                 .filter(Boolean);

//             if (triggerNames.length === 0) {
//               return (
//                 <span className="text-faint text-[12px]">No trigger</span>
//               );
//             }

//             return (
//               <div className="flex flex-wrap gap-1 max-w-70">
//                 {triggerNames.map((name: string, idx: number) => (
//                   <span
//                     key={idx}
//                     className="text-[11px] px-2 py-0.5 rounded-md border border-line bg-card-hi whitespace-nowrap"
//                   >
//                     {name}
//                   </span>
//                 ))}
//               </div>
//             );
//           },
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