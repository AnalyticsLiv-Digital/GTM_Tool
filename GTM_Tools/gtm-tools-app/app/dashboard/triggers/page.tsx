/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { EntityListPage } from "@/app/dashboard/components/EntityListPage";
import TriggerModal from "@/app/dashboard/components/modals/TriggerModal";
import ExportTriggersModal from "@/app/dashboard/components/modals/ExportTriggersModal";

import {
  MdOutlineBolt,
  MdOutlineTimer,
  MdOutlineMouse,
  MdOutlineLink,
  MdOutlineTouchApp,
  MdOutlineHistory,
  MdOutlineCode,
  MdOutlineKeyboardArrowDown,
} from "react-icons/md";
import { SiYoutube } from "react-icons/si";
import { Search } from "lucide-react";

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

function getTriggerIcon(type: string) {
  if (type === "pageview" || type === "allPages") {
    return <MdOutlineBolt size={16} color="#22c55e" />;
  }

  if (type === "domReady") {
    return <MdOutlineBolt size={16} color="#f59e0b" />;
  }

  if (type === "windowLoaded") {
    return <MdOutlineBolt size={16} color="#3b82f6" />;
  }

  if (type === "click") {
    return <MdOutlineMouse size={16} color="#9333ea" />;
  }

  if (type === "linkClick") {
    return <MdOutlineLink size={16} color="#0ea5e9" />;
  }

  if (type === "formSubmission") {
    return <MdOutlineTouchApp size={16} color="#ec4899" />;
  }

  if (type === "timer") {
    return <MdOutlineTimer size={16} color="#f97316" />;
  }

  if (type === "scrollDepth") {
    return <MdOutlineTouchApp size={16} color="#14b8a6" />;
  }

  if (type === "youtubeVideo") {
    return <SiYoutube size={16} color="#FF0000" />;
  }

  if (type === "historyChange") {
    return <MdOutlineHistory size={16} color="#64748b" />;
  }

  if (type === "customEvent") {
    return <MdOutlineCode size={16} color="#6366f1" />;
  }

  return <MdOutlineBolt size={16} color="#6b7280" />;
}

export default function TriggersPage() {
  const store = useDashboardStore();
  const { fetchTriggers } = useDashboardActions();

  const [selectedTriggerType, setSelectedTriggerType] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Count trigger types
  const triggerTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    (store.triggers || []).forEach((trigger: any) => {
      const type = trigger.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [store.triggers]);

  // Unique trigger types sorted
  const uniqueTriggerTypes = useMemo(() => {
    return Object.keys(triggerTypeCounts).sort((a, b) =>
      (triggerTypeMap[a] || a).localeCompare(triggerTypeMap[b] || b)
    );
  }, [triggerTypeCounts]);

  // Filter trigger types by search
  const filteredTriggerTypes = useMemo(() => {
    if (!search.trim()) return uniqueTriggerTypes;

    return uniqueTriggerTypes.filter((type) =>
      (triggerTypeMap[type] || type).toLowerCase().includes(search.toLowerCase())
    );
  }, [uniqueTriggerTypes, search]);

  const selectedLabel = selectedTriggerType
    ? `${triggerTypeMap[selectedTriggerType] || selectedTriggerType} (${
        triggerTypeCounts[selectedTriggerType] || 0
      })`
    : `All Trigger Types (${store.triggers?.length || 0})`;

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
      filterField={(t) => t.name}
      customFilter={(t) => {
        if (!selectedTriggerType) return true;
        return t.type === selectedTriggerType;
      }}
      filters={
        <div className="relative w-full" ref={dropdownRef}>
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="shrink-0">
                {selectedTriggerType ? (
                  getTriggerIcon(selectedTriggerType)
                ) : (
                  <MdOutlineBolt size={16} color="#6b7280" />
                )}
              </span>

              <span className="truncate font-medium text-fg">
                {selectedLabel}
              </span>
            </div>

            <MdOutlineKeyboardArrowDown
              size={18}
              className={`text-muted transition ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-line bg-card-hi">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card">
                  <Search size={15} className="text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search trigger types..."
                    className="w-full bg-transparent outline-none text-sm text-fg placeholder:text-muted"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-72 overflow-y-auto">
                {/* All */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTriggerType("");
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                    selectedTriggerType === "" ? "bg-card-hi" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MdOutlineBolt size={16} color="#6b7280" />
                    <span className="text-fg font-medium">
                      All Trigger Types
                    </span>
                  </div>

                  <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                    {store.triggers?.length || 0}
                  </span>
                </button>

                {/* Types */}
                {filteredTriggerTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedTriggerType(type);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                      selectedTriggerType === type ? "bg-card-hi" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{getTriggerIcon(type)}</span>
                      <span className="text-fg font-medium">
                        {triggerTypeMap[type] || type}
                      </span>
                    </div>

                    <span className="text-[12px] px-2 py-0.5 rounded-md border border-line bg-card-hi text-muted font-mono">
                      {triggerTypeCounts[type]}
                    </span>
                  </button>
                ))}

                {filteredTriggerTypes.length === 0 && (
                  <p className="text-sm text-muted px-4 py-3">
                    No matching trigger types.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
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