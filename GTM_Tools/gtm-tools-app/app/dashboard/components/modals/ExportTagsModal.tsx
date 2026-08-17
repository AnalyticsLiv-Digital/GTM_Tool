/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/ui/dialog";
import {
  ChevronDown,
  CheckCircle2,
  Building2,
  Layers,
  Workflow,
} from "lucide-react";
import WorkspaceCrudSection from "@/app/dashboard/components/modals/WorkspaceCrudSection";

// ============================================================
// CUSTOM DROPDOWN (SHADCN STYLE) - NO SEARCH
// ============================================================

function CustomDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <label className="block text-[12.5px] font-medium text-fg mb-2">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm ${disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute mt-2 w-full z-50 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-card-hi transition ${value === opt.value ? "bg-card-hi" : ""
                  }`}
              >
                {opt.label}
              </button>
            ))}

            {options.length === 0 && (
              <p className="text-sm text-muted px-4 py-3">No results found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DUPLICATE NAME HELPER
// ============================================================

function getNextDuplicateName(existingNames: string[], baseName: string) {
  if (!existingNames.includes(baseName)) return baseName;

  let i = 1;
  while (existingNames.includes(`${baseName}(${i})`)) {
    i++;
  }

  return `${baseName}(${i})`;
}

export default function ExportTagsModal({
  show,
  onClose,
  onExportSuccess,
  selectedTags,
  selectedTriggerIds,
  selectedVariableNames,
  selectedTemplateIds,
}: {
  show: boolean;
  onClose: () => void;
  onExportSuccess: () => void;
  selectedTags: any[];

  selectedTriggerIds: string[];
  selectedVariableNames: string[];
  selectedTemplateIds: string[];
}) {
  const store = useDashboardStore();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [progress, setProgress] = useState({
    templatesTotal: 0,
    templatesDone: 0,
    variablesTotal: 0,
    variablesDone: 0,
    triggersTotal: 0,
    triggersDone: 0,
    tagsTotal: 0,
    tagsDone: 0,
  });

  // Track failed items for retry at end
  const failedItemsRef = useRef<
    Array<{
      type: "template" | "variable" | "trigger" | "tag";
      item: any;
      error: string;
      retryFn: () => Promise<any>;
    }>
  >([]);

  // ============================================================
  // HELPERS
  // ============================================================

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { raw: text };
    }
  }

  function getErrorMessage(data: any) {
    return (
      data?.details?.error?.message ||
      data?.details?.message ||
      data?.error ||
      data?.message ||
      data?.raw ||
      ""
    );
  }

  function shouldRetry(res: Response, msg: string) {
    const m = (msg || "").toLowerCase();

    return (
      [429, 502, 503, 504].includes(res.status) ||
      m.includes("quota exceeded") ||
      m.includes("rate limit exceeded") ||
      m.includes("backend error") ||
      m.includes("internal error") ||
      m.includes("try again later")
    );
  }

  async function fetchWithRetry(url: string, options: any, retries = 10) {
    let delay = 2000; // Start with 2 seconds

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        const data = await safeJsonParse(res);

        if (res.ok) return { res, data };

        const msg = getErrorMessage(data);

        if (shouldRetry(res, msg)) {
          console.warn(` Retry ${i + 1}/${retries} - ${msg}. Waiting ${delay}ms...`);
          await sleep(delay);
          delay = Math.min(delay * 2, 20000); // Exponential backoff, max 20s
          continue;
        }

        throw new Error(msg || `Request failed (${res.status})`);
      } catch (err: any) {
        if (i === retries - 1) throw err;
        console.warn(` Retry ${i + 1}/${retries} - Network error. Waiting ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * 2, 20000);
      }
    }

    throw new Error("Rate limit / backend error. Try again after 1 minute.");
  }

  function isGA4ConfigTag(tag: any) {
    return tag?.type === "gaawc";
  }

  function isGA4EventTag(tag: any) {
    return tag?.type === "gaawe";
  }

  // ============================================================
  // LOAD ACCOUNTS
  // ============================================================

  useEffect(() => {
    if (!show) return;

    async function loadAccounts() {
      try {
        setLoadingAccounts(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const data = await safeJsonParse(res);

        if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

        setAccounts(data.account || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [show]);

  // ============================================================
  // LOAD CONTAINERS
  // ============================================================

  useEffect(() => {
    if (!selectedAccountId) return;

    async function loadContainers() {
      try {
        setLoadingContainers(true);

        const res = await fetch(
          `/api/auth/gtm/containers?accountId=${selectedAccountId}`
        );

        const data = await safeJsonParse(res);

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch containers");

        setContainers(data.container || []);
        setSelectedContainerId("");
        setSelectedWorkspaceId("");
        setWorkspaces([]);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingContainers(false);
      }
    }

    loadContainers();
  }, [selectedAccountId]);

  // ============================================================
  // LOAD WORKSPACES
  // ============================================================

  useEffect(() => {
    if (!selectedAccountId || !selectedContainerId) return;

    async function loadWorkspaces() {
      try {
        setLoadingWorkspaces(true);

        const res = await fetch(
          `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
        );

        const data = await safeJsonParse(res);

        if (!res.ok)
          throw new Error(data?.error || "Failed to fetch workspaces");

        setWorkspaces(data.workspace || []);
        setSelectedWorkspaceId("");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingWorkspaces(false);
      }
    }

    loadWorkspaces();
  }, [selectedAccountId, selectedContainerId]);

  // ============================================================
  // SOURCE DATA
  // ============================================================

  const sourceAccountId = store.selectedAccountId;
  const sourceContainerId = store.selectedContainerId;
  const sourceWorkspaceId = store.selectedWorkspaceId;

  // ============================================================
  // FETCH DESTINATION DATA
  // ============================================================

  async function fetchDestinationTriggers() {
    const res = await fetch(
      `/api/auth/gtm/triggers?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
    );

    const data = await safeJsonParse(res);

    if (!res.ok) throw new Error(data?.error || "Failed to fetch triggers");

    return data.trigger || [];
  }

  async function fetchDestinationVariables() {
    const res = await fetch(
      `/api/auth/gtm/variables?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
    );

    const data = await safeJsonParse(res);

    if (!res.ok) throw new Error(data?.error || "Failed to fetch variables");

    return data.variable || [];
  }

  async function fetchDestinationTags() {
    const res = await fetch(
      `/api/auth/gtm/tags?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
    );

    const data = await safeJsonParse(res);

    if (!res.ok) throw new Error(data?.error || "Failed to fetch tags");

    return data.tag || [];
  }

  async function fetchDestinationTemplates() {
    const res = await fetch(
      `/api/auth/gtm/templates/export?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
    );

    const data = await safeJsonParse(res);

    if (!res.ok) throw new Error(data?.error || "Failed to fetch templates");

    return data.template || [];
  }

  // ============================================================
  // EXPORT VARIABLE (with defer on failure)
  // ============================================================

  async function exportVariable(variable: any) {
    let attempt = 0;
    const maxAttempts = 6;

    while (attempt < maxAttempts) {
      const updatedName =
        attempt === 0 ? variable.name : `${variable.name}_${attempt}`;

      const cleanedVariable: any = {
        name: updatedName,
        type: variable.type,
        parameter: variable.parameter || [],
        formatValue: variable.formatValue,
        convertUndefinedToValue: variable.convertUndefinedToValue,
        convertUndefinedToValueTitle: variable.convertUndefinedToValueTitle,
        convertUndefinedToValueDescription:
          variable.convertUndefinedToValueDescription,
        enableCookieOverrides: variable.enableCookieOverrides,
        cookiePath: variable.cookiePath,
        cookieDomain: variable.cookieDomain,
        cookieExpires: variable.cookieExpires,
        maxAgeSeconds: variable.maxAgeSeconds,
        cookieName: variable.cookieName,
      };

      Object.keys(cleanedVariable).forEach((k) => {
        if (cleanedVariable[k] === undefined) delete cleanedVariable[k];
      });

      try {
        const { data } = await fetchWithRetry("/api/auth/gtm/variables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            workspaceId: selectedWorkspaceId,
            variable: cleanedVariable,
          }),
        });

        await sleep(1200); // Increased from 600ms
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(600);
          continue;
        }

        // Add to failed items for retry at end
        failedItemsRef.current.push({
          type: "variable",
          item: variable,
          error: err.message,
          retryFn: () =>
            exportVariable(variable),
        });
        console.warn(
          ` Variable deferred to retry queue: ${variable.name}`
        );
        return null;
      }
    }
  }

  // ============================================================
  // EXPORT TRIGGER
  // ============================================================

  async function exportTrigger(trigger: any) {
    let attempt = 0;
    const maxAttempts = 6;

    while (attempt < maxAttempts) {
      const updatedName =
        attempt === 0 ? trigger.name : `${trigger.name}_${attempt}`;

      const cleanedTrigger: any = {
        name: updatedName,
        type: trigger.type,
        filter: trigger.filter || [],
        autoEventFilter: trigger.autoEventFilter || [],
        customEventFilter: trigger.customEventFilter || [],
        waitForTags: trigger.waitForTags,
        checkValidation: trigger.checkValidation,
        waitForTagsTimeout: trigger.waitForTagsTimeout,
        uniqueTriggerId: trigger.uniqueTriggerId,
        interval: trigger.interval,
        limit: trigger.limit,
      };

      Object.keys(cleanedTrigger).forEach((k) => {
        if (cleanedTrigger[k] === undefined) delete cleanedTrigger[k];
      });

      try {
        const { data } = await fetchWithRetry("/api/auth/gtm/triggers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            workspaceId: selectedWorkspaceId,
            trigger: cleanedTrigger,
          }),
        });

        await sleep(1200); // Increased from 650ms
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(650);
          continue;
        }

        // Add to failed items for retry at end
        failedItemsRef.current.push({
          type: "trigger",
          item: trigger,
          error: err.message,
          retryFn: () => exportTrigger(trigger),
        });
        console.warn(
          ` Trigger deferred to retry queue: ${trigger.name}`
        );
        return null;
      }
    }
  }

  // ============================================================
  // EXPORT TEMPLATE
  // ============================================================

  async function exportTemplate(templateId: string) {
    console.log("Logs in Function ---------------------------------------------------------", {
      sourceAccountId,
      sourceContainerId,
      sourceWorkspaceId,
      templateId,
    });

    const fetchRes = await fetchWithRetry(
      `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${templateId}`,
      { method: "GET" }
    );

    const sourceTemplate = fetchRes.data?.template;

    console.log("Fetch Response:", fetchRes.data);
    console.log("Source Template:", sourceTemplate);

    if (!sourceTemplate) {
      throw new Error("Template not found in source workspace");
    }

    const destTemplates = await fetchDestinationTemplates();
    const existing = destTemplates.find(
      (t: any) => t.name === sourceTemplate.name
    );

    if (existing?.templateId) {
      return existing.templateId;
    }



    const createRes = await fetchWithRetry("/api/auth/gtm/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: selectedAccountId,
        containerId: selectedContainerId,
        workspaceId: selectedWorkspaceId,
        template: {
          name: sourceTemplate.name,
          templateData: sourceTemplate.templateData,
        },
      }),
    });

    const newTemplateId = createRes.data?.template?.templateId;

    if (!newTemplateId) {
      throw new Error("New templateId missing after template creation");
    }

    await sleep(900);
    return newTemplateId;
  }

  // ============================================================
  // EXPORT TAG
  // ============================================================

  async function exportTag(
    tag: any,
    finalTagType: string,
    triggerMap: any,
    destinationTags: any[]
  ) {
    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      const existingTagNames = destinationTags.map((t: any) => t.name);

      const updatedName =
        attempt === 0
          ? getNextDuplicateName(existingTagNames, tag.name)
          : getNextDuplicateName(existingTagNames, `${tag.name}(${attempt})`);

      const mappedFiringTriggers =
        (tag.firingTriggerId || []).map((id: string) => triggerMap[id]) || [];

      const mappedBlockingTriggers =
        (tag.blockingTriggerId || []).map((id: string) => triggerMap[id]) || [];

      const cleanedTag: any = {
        name: updatedName,
        type: finalTagType,
        parameter: tag.parameter || [],
        firingTriggerId: mappedFiringTriggers.filter(Boolean),
        blockingTriggerId: mappedBlockingTriggers.filter(Boolean),

        tagFiringOption: tag.tagFiringOption,
        consentSettings: tag.consentSettings,
        monitoringMetadata: tag.monitoringMetadata,

        scheduleStartMs: tag.scheduleStartMs,
        scheduleEndMs: tag.scheduleEndMs,
        priority: tag.priority,
        notes: tag.notes,
        parentFolderId: tag.parentFolderId,
        paused: tag.paused,
      };

      Object.keys(cleanedTag).forEach((key) => {
        if (cleanedTag[key] === undefined) delete cleanedTag[key];
      });

      try {
        const { data } = await fetchWithRetry("/api/auth/gtm/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            workspaceId: selectedWorkspaceId,
            tag: cleanedTag,
          }),
        });

        await sleep(1500); // Increased from 800ms to avoid rate limiting
        console.log(` Tag exported: ${cleanedTag.name}`);

        destinationTags.push({ name: updatedName });
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(800);
          continue;
        }

        // Add to failed items for retry at end
        failedItemsRef.current.push({
          type: "tag",
          item: tag,
          error: err.message,
          retryFn: async () => {
            // Refresh destination tags before retry
            const freshDestTags = await fetchDestinationTags();
            return exportTag(tag, finalTagType, triggerMap, freshDestTags);
          },
        });
        console.warn(`⚠️ Tag deferred to retry queue: ${tag.name}`);
        return null;
      }
    }
  }

  // ============================================================
  // MAIN EXPORT FUNCTION
  // ============================================================

  async function handleExportTags() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTags || selectedTags.length === 0) {
      return toast.warning("No tags selected for export.");
    }

    const ok = await confirmDialog({
      title: `Export ${selectedTags.length} tag(s) with selected dependencies?`,
      description:
        "Templates, variables, triggers will be created first if missing. Existing items are not modified.",
      confirmLabel: "Export",
    });

    if (!ok) return;
    toast.info(
      "Important: Template-based tags require their corresponding template in the destination workspace. If the template cannot be exported, the tag must be exported manually.",
      {
        position: "bottom-right",
        autoClose: 10000,
      }
    );

    const toastId = toast.info("Export in progress...", {
      position: "bottom-right",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
    });

    const failedTags: string[] = [];

    try {
      setExportLoading(true);

      // Clear any previous failed items
      failedItemsRef.current = [];

      const sourceTriggersRes = await fetch(
        `/api/auth/gtm/triggers?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
      );
      const sourceTriggersData = await safeJsonParse(sourceTriggersRes);
      const sourceTriggers = sourceTriggersData.trigger || [];

      const sourceVariablesRes = await fetch(
        `/api/auth/gtm/variables?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
      );

      const sourceVariablesData = await safeJsonParse(sourceVariablesRes);
      const sourceVariables = sourceVariablesData.variable || [];

      const requiredTriggers = sourceTriggers.filter((t: any) =>
        (selectedTriggerIds || []).includes(t.triggerId)
      );

      const requiredVariables = sourceVariables.filter((v: any) =>
        (selectedVariableNames || []).includes(v.name)
      );

      const templateIds = new Set<string>();
      (selectedTemplateIds || []).forEach((id) => templateIds.add(id));

      // Automatically include templates used by selected tags
      selectedTags.forEach((tag: any) => {
        if (tag.type?.startsWith("cvt_")) {
          const templateId = getTemplateIdFromTagType(tag.type);

          if (templateId) {
            templateIds.add(templateId);
            console.log(`Template dependency detected: ${templateId} (${tag.name})`);
          }
        }
      });

      setProgress({
        templatesTotal: templateIds.size,
        templatesDone: 0,
        variablesTotal: requiredVariables.length,
        variablesDone: 0,
        triggersTotal: requiredTriggers.length,
        triggersDone: 0,
        tagsTotal: selectedTags.length,
        tagsDone: 0,
      });

      const templateMap: Record<string, string> = {};
      let templatesDone = 0;

      for (const templateId of Array.from(templateIds)) {
        try {
          const newTemplateId = await exportTemplate(templateId);
          templateMap[templateId] = newTemplateId;
          console.log(`Template exported: ${templateId} -> ${newTemplateId}`);
        } catch (err: any) {
          console.log("Template export failed:", templateId, err);
          failedItemsRef.current.push({
            type: "template",
            item: { templateId },
            error: err.message,
            retryFn: () => exportTemplate(templateId),
          });
        }

        templatesDone++;
        setProgress((p) => ({ ...p, templatesDone }));

        toast.update(toastId, {
          render: `Templates ${templatesDone}/${templateIds.size}`,
        });
      }

      const destinationVariables = await fetchDestinationVariables();

      const missingVariables = requiredVariables.filter((v: any) => {
        return !destinationVariables.some((dv: any) => dv.name === v.name);
      });

      let variablesDone = 0;

      for (const v of missingVariables) {
        try {
          const result = await exportVariable(v);
          if (result) {
            console.log(`Variable exported: ${v.name}`);
          }
        } catch (err) {
          console.log("Variable export failed:", v.name, err);
        }

        variablesDone++;
        setProgress((p) => ({ ...p, variablesDone }));

        toast.update(toastId, {
          render: `Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}`,
        });
      }

      const destinationTriggers = await fetchDestinationTriggers();
      const triggerMap: Record<string, string> = {};

      let triggersDone = 0;

      for (const t of requiredTriggers) {
        const destTrigger = destinationTriggers.find(
          (dt: any) => dt.name === t.name
        );

        if (destTrigger) {
          triggerMap[t.triggerId] = destTrigger.triggerId;
        } else {
          try {
            const created = await exportTrigger(t);

            if (created?.trigger?.triggerId) {
              triggerMap[t.triggerId] = created.trigger.triggerId;
              console.log(`Trigger exported: ${t.name}`);
            }
          } catch (err) {
            console.log("Trigger export failed:", t.name, err);
          }
        }

        triggersDone++;
        setProgress((p) => ({ ...p, triggersDone }));

        toast.update(toastId, {
          render: `Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${triggersDone}/${requiredTriggers.length}`,
        });
      }

      let destinationTags = await fetchDestinationTags();

      const ga4ConfigTags = selectedTags.filter(isGA4ConfigTag);
      const ga4EventTags = selectedTags.filter(isGA4EventTag);
      const otherTags = selectedTags.filter(
        (t) => !isGA4ConfigTag(t) && !isGA4EventTag(t)
      );

      let tagsDone = 0;

      for (const tag of ga4ConfigTags) {
        try {
          const result = await exportTag(tag, tag.type, triggerMap, destinationTags);
          if (result) {
            console.log(` GA4 Config Tag exported: ${tag.name}`);
          }
        } catch (err: any) {
          console.error(` GA4 Config Tag export failed: ${tag.name}`, err.message);
          // Note: error already added to failedItemsRef by exportTag
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));
      }

      destinationTags = await fetchDestinationTags();

      const ga4ConfigMap: Record<string, string> = {};
      for (const srcConfig of ga4ConfigTags) {
        const destConfig = destinationTags.find(
          (dt: any) => dt.name === srcConfig.name
        );

        if (destConfig) {
          ga4ConfigMap[srcConfig.tagId] = destConfig.tagId;
        }
      }

      for (const tag of ga4EventTags) {
        try {
          const cloned = JSON.parse(JSON.stringify(tag));

          if (cloned.parameter && Array.isArray(cloned.parameter)) {
            cloned.parameter = cloned.parameter.map((p: any) => {
              if (p.key === "configTag" && ga4ConfigMap[p.value]) {
                return { ...p, value: ga4ConfigMap[p.value] };
              }
              return p;
            });
          }

          const result = await exportTag(cloned, cloned.type, triggerMap, destinationTags);
          if (result) {
            console.log(` GA4 Event Tag exported: ${tag.name}`);
          }
        } catch (err: any) {
          console.error(` GA4 Event Tag export failed: ${tag.name}`, err.message);
          // Note: error already added to failedItemsRef by exportTag
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));
      }

      // for (const tag of otherTags) {
      //   try {
      //     let finalTagType = tag.type;

      //     if (tag.type?.includes("cvt_")) {
      //       const templateId = getTemplateIdFromTagType(tag.type);
      //       const newTemplateId = templateMap[templateId || ""];

      //       if (newTemplateId) {
      //         finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
      //       } else {
      //         throw new Error("Missing template mapping for this tag");
      //       }
      //     }

      //     const result = await exportTag(tag, finalTagType, triggerMap, destinationTags);
      //     if (result) {
      //       console.log(` Other Tag exported: ${tag.name}`);
      //     }
      //   } catch (err: any) {
      //     console.error(` Other Tag export failed: ${tag.name}`, err.message);
      //     // Note: error already added to failedItemsRef by exportTag
      //   }

      //   tagsDone++;
      //   setProgress((p) => ({ ...p, tagsDone }));
      // }

      // ============================================================
      // RETRY FAILED ITEMS ONCE AT THE END
      // ============================================================

      for (const tag of otherTags) {
        try {
          let finalTagType = tag.type;

          // Only rewrite Workspace Templates
          if (tag.type?.startsWith("cvt_")) {
            const parts = tag.type.split("_");

            // Workspace template format:
            // cvt_<containerId>_<templateId>
            if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
              const oldTemplateId = parts[2];
              const newTemplateId = templateMap[oldTemplateId];

              if (!newTemplateId) {
                throw new Error(
                  `Missing template mapping for workspace template ${oldTemplateId}`
                );
              }

              finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
            }

            // Gallery template
            // Example:
            // cvt_T9CP9
            else {
              console.log(
                `Gallery template detected (${tag.type}). No template export required.`
              );

              finalTagType = tag.type;
            }
          }

          const result = await exportTag(
            tag,
            finalTagType,
            triggerMap,
            destinationTags
          );

          if (result) {
            console.log(`Other Tag exported: ${tag.name}`);
          }
        } catch (err: any) {
          console.error(
            `Other Tag export failed: ${tag.name}`,
            err.message
          );

          // Add failed tag to retry queue
          failedItemsRef.current.push({
            type: "tag",
            item: tag,
            error: err.message,
            retryFn: async () => {
              let finalTagType = tag.type;

              if (tag.type?.startsWith("cvt_")) {
                const parts = tag.type.split("_");

                // Workspace Template
                if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
                  const oldTemplateId = parts[2];
                  const newTemplateId = templateMap[oldTemplateId];

                  if (!newTemplateId) {
                    throw new Error(
                      `Missing template mapping for workspace template ${oldTemplateId}`
                    );
                  }

                  finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
                }
                // Gallery Template
                else {
                  finalTagType = tag.type;
                }
              }

              const freshDestinationTags = await fetchDestinationTags();

              return exportTag(
                tag,
                finalTagType,
                triggerMap,
                freshDestinationTags
              );
            },
          });
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));
      }


      if (failedItemsRef.current.length > 0) {
        console.log(
          `\n Retrying ${failedItemsRef.current.length} failed item(s) one final time...\n`
        );

        toast.update(toastId, {
          render: `Retrying ${failedItemsRef.current.length} failed item(s)...`,
        });

        const retryResults: Array<{ item: string; type: string; success: boolean }> = [];

        for (const failedItem of failedItemsRef.current) {
          try {
            console.log(` Retrying ${failedItem.type}: ${failedItem.item.name || failedItem.item.templateId}`);
            await failedItem.retryFn();
            retryResults.push({
              item: failedItem.item.name || failedItem.item.templateId,
              type: failedItem.type,
              success: true,
            });

            console.log(
              ` Retry successful: ${failedItem.type} - ${failedItem.item.name || failedItem.item.templateId}`
            );
            
          } catch (err: any) {
            retryResults.push({
              item: failedItem.item.name || failedItem.item.templateId,
              type: failedItem.type,
              success: false,
            });
            
            console.error(
              ` Retry failed: ${failedItem.type} - ${failedItem.item.name || failedItem.item.templateId}:`,
              err.message
            );
          }

          await sleep(1000); // Space out retry attempts
        }

        const successfulRetries = retryResults.filter((r) => r.success).length;
        const stillFailed = retryResults.filter((r) => !r.success);

        if (stillFailed.length > 0) {
          failedTags.push(...stillFailed.map((r) => `${r.type}:${r.item}`));
        }

        console.log(
          `\n Retry Summary: ${successfulRetries} recovered, ${stillFailed.length} still failed\n`
        );
      }

      if (failedTags.length > 0) {
        console.warn(` Export completed with ${failedTags.length} failure(s):`, failedTags);
        toast.update(toastId, {
          render: `Export completed with ${failedTags.length} failed tag(s). The failed tag(s) must be exported manually.\n\nFailed Tags: ${failedTags.join(", ")}`,
          type: "warning",
          position: "bottom-right",
          autoClose: 8000,
        });
        return;
      }

      console.log(` All ${selectedTags.length} tags exported successfully!`);
      toast.update(toastId, {
        render: " All tags exported successfully!",
        type: "success",
        position: "bottom-right",
        autoClose: 4000,
      });

      onExportSuccess();
    } catch (err: any) {
      console.error(" Export failed:", err);
      toast.update(toastId, {
        render: ` Export failed: ${err.message}`,
        type: "error",
        position: "bottom-right",
        autoClose: 8000,
      });
    } finally {
      setExportLoading(false);
    }
  }

  // ============================================================
  // STEPPER
  // ============================================================

  const steps = useMemo(() => {
    return [
      {
        id: "account",
        title: "Account",
        done: !!selectedAccountId,
        icon: Building2,
      },
      {
        id: "container",
        title: "Container",
        done: !!selectedContainerId,
        icon: Layers,
      },
      {
        id: "workspace",
        title: "Workspace",
        done: !!selectedWorkspaceId,
        icon: Workflow,
      },
    ];
  }, [selectedAccountId, selectedContainerId, selectedWorkspaceId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-fg w-full max-w-6xl rounded-2xl border border-edge shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-line bg-card-hi">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">
              Export Tags (Full Export)
            </h2>
            <p className="text-[12.5px] text-muted mt-0.5">
              Export selected tags and dependencies into a destination workspace.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-card transition"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 h-140">
          {/* LEFT */}
          <div className="col-span-5 border-r border-line bg-card-hi p-5 flex flex-col min-h-0">
            <p className="text-[12px] font-medium text-faint mb-3 uppercase tracking-[0.08em]">
              Selected Tags ({selectedTags.length})
            </p>

            <div className="bg-card border border-line rounded-xl overflow-hidden flex-1 min-h-0">
              <div className="overflow-y-auto h-full">
                {selectedTags.map((tag: any) => (
                  <div
                    key={tag.tagId}
                    className="px-4 py-3 border-b border-line last:border-none hover:bg-card-hi transition"
                  >
                    <p className="text-[13px] font-medium text-fg">
                      {tag.name}
                    </p>
                    <p className="text-[11px] text-faint mt-0.5">
                      Type: {tag.type} · ID: {tag.tagId}
                    </p>
                  </div>
                ))}

                {selectedTags.length === 0 && (
                  <div className="p-6 text-center text-muted text-sm">
                    No tags selected.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6 min-h-0">
            <div className="flex flex-col h-full">

              {/* TOP HORIZONTAL STEPPER */}
              <div className="flex items-center justify-between w-full mb-6 px-2">
                {steps.map((s, idx) => {
                  const Icon = s.icon;
                  const done = s.done;
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={s.id} className="flex items-center flex-1">
                      {/* CIRCLE */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${done
                          ? "bg-green-500/15 border-green-500 text-green-500"
                          : "bg-card border-line text-muted"
                          }`}
                      >
                        {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                      </div>

                      {/* LINE */}
                      {!isLast && (
                        <div
                          className={`flex-1 h-0.5 mx-3 transition-all duration-300 ${steps[idx].done ? "bg-green-500/60" : "bg-line"
                            }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* INPUTS */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                <div className="mb-5">
                  <h3 className="text-[15px] font-semibold text-fg">
                    Destination Setup
                  </h3>
                  <p className="text-[12.5px] text-muted mt-1">
                    Select the account, container, and workspace where tags will
                    be exported.
                  </p>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1">
                  <CustomDropdown
                    label="Account"
                    value={selectedAccountId}
                    placeholder="-- Select Account --"
                    disabled={loadingAccounts}
                    options={accounts.map((a) => ({
                      value: a.accountId,
                      label: a.name,
                    }))}
                    onChange={(val) => {
                      setSelectedAccountId(val);
                      setSelectedContainerId("");
                      setSelectedWorkspaceId("");
                      setContainers([]);
                      setWorkspaces([]);
                    }}
                  />

                  <CustomDropdown
                    label="Container"
                    value={selectedContainerId}
                    placeholder="-- Select Container --"
                    disabled={!selectedAccountId || loadingContainers}
                    options={containers.map((c) => ({
                      value: c.containerId,
                      label: c.name,
                    }))}
                    onChange={(val) => {
                      setSelectedContainerId(val);
                      setSelectedWorkspaceId("");
                      setWorkspaces([]);
                    }}
                  />

                  <CustomDropdown
                    label="Workspace"
                    value={selectedWorkspaceId}
                    placeholder="-- Select Workspace --"
                    disabled={!selectedContainerId || loadingWorkspaces}
                    options={workspaces.map((w) => ({
                      value: w.workspaceId,
                      label: w.name,
                    }))}
                    onChange={(val) => setSelectedWorkspaceId(val)}
                  />

                  <WorkspaceCrudSection
                    selectedAccountId={selectedAccountId}
                    selectedContainerId={selectedContainerId}
                    selectedWorkspaceId={selectedWorkspaceId}
                    setSelectedWorkspaceId={setSelectedWorkspaceId}
                    workspaces={workspaces}
                    setWorkspaces={setWorkspaces}
                  />

                  {exportLoading && (
                    <div className="mt-2 bg-card border border-line rounded-xl p-4">
                      <p className="text-[12px] font-mono uppercase tracking-[0.12em] text-faint mb-2">
                        Export Progress
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-[12.5px] text-muted">
                        <p>
                          Templates:{" "}
                          <span className="text-fg font-medium">
                            {progress.templatesDone}/{progress.templatesTotal}
                          </span>
                        </p>

                        <p>
                          Variables:{" "}
                          <span className="text-fg font-medium">
                            {progress.variablesDone}/{progress.variablesTotal}
                          </span>
                        </p>

                        <p>
                          Triggers:{" "}
                          <span className="text-fg font-medium">
                            {progress.triggersDone}/{progress.triggersTotal}
                          </span>
                        </p>

                        <p>
                          Tags:{" "}
                          <span className="text-fg font-medium">
                            {progress.tagsDone}/{progress.tagsTotal}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-line bg-page-soft flex justify-between items-center">
          <button onClick={onClose} className="btn-secondary py-2! px-4!">
            Cancel
          </button>

          <button
            onClick={handleExportTags}
            disabled={
              exportLoading ||
              !selectedAccountId ||
              !selectedContainerId ||
              !selectedWorkspaceId
            }
            className="btn-primary py-2! px-4! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? "Cloning..." : "Clone Selected Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getTemplateIdFromTagType(type: any) {
  if (!type || typeof type !== "string") return null;

  const parts = type.split("_");

  if (parts.length >= 3) {
    // cvt_<container>_<templateId>
    return parts[2] || null;
  }

  if (parts.length === 2) {

    return parts[1] || null;
  }
  return null;
}