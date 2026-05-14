/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/ui/dialog";
import { ChevronDown } from "lucide-react";

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
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-line bg-card text-fg shadow-sm hover:bg-card-hi transition text-sm ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute mt-2 w-full z-9999 rounded-xl border border-line bg-card shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-card-hi transition ${
                  value === opt.value ? "bg-card-hi" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}

            {options.length === 0 && (
              <p className="text-sm text-muted px-4 py-3">
                No results found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DUPLICATE NAME HELPER (casestudy_download_GA4 -> casestudy_download_GA4(1))
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
}: {
  show: boolean;
  onClose: () => void;
  onExportSuccess: () => void;
  selectedTags: any[];
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

  // ============================================================
  // HELPERS
  // ============================================================
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    let delay = 1500;

    for (let i = 0; i < retries; i++) {
      const res = await fetch(url, options);
      const data = await safeJsonParse(res);

      if (res.ok) return { res, data };

      const msg = getErrorMessage(data);

      if (shouldRetry(res, msg)) {
        await sleep(delay);
        delay = Math.min(delay * 2, 15000);
        continue;
      }

      throw new Error(msg || `Request failed (${res.status})`);
    }

    throw new Error("Rate limit / backend error. Try again after 1 minute.");
  }

  function getTemplateIdFromTagType(tagType: string) {
    if (!tagType?.includes("cvt_")) return null;
    const parts = tagType.split("_");
    return parts[parts.length - 1];
  }

  function isGA4ConfigTag(tag: any) {
    return tag?.type === "gaawc";
  }

  function isGA4EventTag(tag: any) {
    return tag?.type === "gaawe";
  }

  // ============================================================
  // EXTRACT VARIABLE NAMES RECURSIVELY
  // ============================================================
  function extractVariablesFromAny(input: any, set: Set<string>) {
    if (!input) return;

    if (typeof input === "string") {
      const matches = input.match(/{{(.*?)}}/g);
      if (matches) {
        matches.forEach((m) => {
          const clean = m.replace("{{", "").replace("}}", "").trim();
          if (clean) set.add(clean);
        });
      }
      return;
    }

    if (Array.isArray(input)) {
      input.forEach((x) => extractVariablesFromAny(x, set));
      return;
    }

    if (typeof input === "object") {
      Object.values(input).forEach((val) => extractVariablesFromAny(val, set));
    }
  }

  function collectVariableDependencies(
    sourceVariables: any[],
    initialNames: Set<string>
  ) {
    const all = new Set(initialNames);

    let changed = true;
    while (changed) {
      changed = false;

      for (const v of sourceVariables) {
        if (!all.has(v.name)) continue;

        const temp = new Set<string>();
        extractVariablesFromAny(v.parameter, temp);

        for (const dep of temp) {
          if (!all.has(dep)) {
            all.add(dep);
            changed = true;
          }
        }
      }
    }

    return all;
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
  // EXPORT VARIABLE (WITH DUPLICATE RETRY)
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

        await sleep(600);
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(600);
          continue;
        }

        throw err;
      }
    }

    throw new Error("Variable export failed after retries");
  }

  // ============================================================
  // EXPORT TRIGGER (WITH DUPLICATE RETRY)
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

        await sleep(650);
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(650);
          continue;
        }

        throw err;
      }
    }

    throw new Error("Trigger export failed after retries");
  }

  // ============================================================
  // EXPORT TEMPLATE
  // ============================================================
  async function exportTemplate(templateId: string) {
    const fetchRes = await fetchWithRetry(
      `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${templateId}`,
      { method: "GET" }
    );

    const sourceTemplate = fetchRes.data?.template;

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
  // EXPORT TAG (ALLOW DUPLICATES WITH (1), (2) ... )
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

        await sleep(800);

        destinationTags.push({ name: updatedName });
        return data;
      } catch (err: any) {
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("already exists") || msg.includes("duplicate name")) {
          attempt++;
          await sleep(800);
          continue;
        }

        throw err;
      }
    }

    throw new Error("Tag export failed after retries");
  }

  // ============================================================
  // TAG TYPE SUMMARY
  // ============================================================
  const tagTypeSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of selectedTags || []) {
      const type = t?.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [selectedTags]);

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
      title: `Export ${selectedTags.length} tag(s) with their dependencies?`,
      description:
        "Templates, variables, triggers will be created first if missing. Existing items are not modified.",
      confirmLabel: "Export",
    });

    if (!ok) return;

    const toastId = toast.info(
      `Exporting... Templates ${progress.templatesDone}/${progress.templatesTotal}, Variables ${progress.variablesDone}/${progress.variablesTotal}, Triggers ${progress.triggersDone}/${progress.triggersTotal}, Tags ${progress.tagsDone}/${progress.tagsTotal}`,
      {
        position: "bottom-right",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      }
    );

    const failedTags: string[] = [];

    try {
      setExportLoading(true);

      // ============================================================
      // LOAD SOURCE TRIGGERS + VARIABLES
      // ============================================================
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

      // ============================================================
      // REQUIRED TRIGGERS (ONLY ATTACHED TO TAGS)
      // ============================================================
      const requiredTriggerIds = new Set<string>();

      for (const tag of selectedTags) {
        (tag.firingTriggerId || []).forEach((id: string) =>
          requiredTriggerIds.add(id)
        );
        (tag.blockingTriggerId || []).forEach((id: string) =>
          requiredTriggerIds.add(id)
        );
      }

      const requiredTriggers = sourceTriggers.filter((t: any) =>
        requiredTriggerIds.has(t.triggerId)
      );

      // ============================================================
      // REQUIRED VARIABLES (FROM TAG + FROM REQUIRED TRIGGERS)
      // ============================================================
      const requiredVariableNames = new Set<string>();

      // variables from tag parameters
      for (const tag of selectedTags) {
        extractVariablesFromAny(tag.parameter, requiredVariableNames);
      }

      // variables from trigger filters (IMPORTANT FIX)
      for (const trig of requiredTriggers) {
        extractVariablesFromAny(trig.filter, requiredVariableNames);
        extractVariablesFromAny(trig.autoEventFilter, requiredVariableNames);
        extractVariablesFromAny(trig.customEventFilter, requiredVariableNames);
      }

      // recursive nested variable dependencies (IMPORTANT FIX)
      const finalVariableSet = collectVariableDependencies(
        sourceVariables,
        requiredVariableNames
      );

      const requiredVariables = sourceVariables.filter((v: any) =>
        finalVariableSet.has(v.name)
      );

      // ============================================================
      // REQUIRED TEMPLATES
      // ============================================================
      const templateIds = new Set<string>();

      for (const tag of selectedTags) {
        const templateId = getTemplateIdFromTagType(tag.type);
        if (templateId) templateIds.add(templateId);
      }

      // ============================================================
      // SET PROGRESS TOTALS
      // ============================================================
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

      // ============================================================
      // EXPORT REQUIRED TEMPLATES FIRST
      // ============================================================
      const templateMap: Record<string, string> = {};
      let templatesDone = 0;

      for (const templateId of Array.from(templateIds)) {
        try {
          const newTemplateId = await exportTemplate(templateId);
          templateMap[templateId] = newTemplateId;
        } catch (err: any) {
          console.log("❌ Template export failed:", templateId, err);
        }

        templatesDone++;
        setProgress((p) => ({ ...p, templatesDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${progress.variablesDone}/${progress.variablesTotal}, Triggers ${progress.triggersDone}/${progress.triggersTotal}, Tags ${progress.tagsDone}/${progress.tagsTotal}`,
        });
      }

      // ============================================================
      // EXPORT VARIABLES
      // ============================================================
      let destinationVariables = await fetchDestinationVariables();

      const missingVariables = requiredVariables.filter((v: any) => {
        return !destinationVariables.some((dv: any) => dv.name === v.name);
      });

      let variablesDone = 0;

      for (const v of missingVariables) {
        try {
          await exportVariable(v);
        } catch (err) {
          console.log("❌ Variable export failed:", v.name, err);
        }

        variablesDone++;
        setProgress((p) => ({ ...p, variablesDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${progress.triggersDone}/${progress.triggersTotal}, Tags ${progress.tagsDone}/${progress.tagsTotal}`,
        });
      }

      destinationVariables = await fetchDestinationVariables();

      // ============================================================
      // EXPORT TRIGGERS + CREATE TRIGGER MAP
      // ============================================================
      let destinationTriggers = await fetchDestinationTriggers();
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
            }
          } catch (err) {
            console.log("❌ Trigger export failed:", t.name, err);
          }
        }

        triggersDone++;
        setProgress((p) => ({ ...p, triggersDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${triggersDone}/${requiredTriggers.length}, Tags ${progress.tagsDone}/${progress.tagsTotal}`,
        });
      }

      destinationTriggers = await fetchDestinationTriggers();

      for (const t of requiredTriggers) {
        if (!triggerMap[t.triggerId]) {
          const destTrigger = destinationTriggers.find(
            (dt: any) => dt.name === t.name
          );
          if (destTrigger) triggerMap[t.triggerId] = destTrigger.triggerId;
        }
      }

      // ============================================================
      // EXPORT TAGS
      // ============================================================
      let destinationTags = await fetchDestinationTags();

      const ga4ConfigTags = selectedTags.filter(isGA4ConfigTag);
      const ga4EventTags = selectedTags.filter(isGA4EventTag);
      const otherTags = selectedTags.filter(
        (t) => !isGA4ConfigTag(t) && !isGA4EventTag(t)
      );

      let tagsDone = 0;

      // export GA4 config tags first
      for (const tag of ga4ConfigTags) {
        try {
          await exportTag(tag, tag.type, triggerMap, destinationTags);
        } catch {
          failedTags.push(tag.name);
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${triggersDone}/${requiredTriggers.length}, Tags ${tagsDone}/${selectedTags.length}`,
        });
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

      // export GA4 event tags
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

          await exportTag(cloned, cloned.type, triggerMap, destinationTags);
        } catch {
          failedTags.push(tag.name);
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${triggersDone}/${requiredTriggers.length}, Tags ${tagsDone}/${selectedTags.length}`,
        });
      }

      // export other tags
      for (const tag of otherTags) {
        try {
          let finalTagType = tag.type;

          if (tag.type?.includes("cvt_")) {
            const templateId = getTemplateIdFromTagType(tag.type);
            const newTemplateId = templateMap[templateId || ""];

            if (newTemplateId) {
              finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
            } else {
              throw new Error("Missing template mapping for this tag");
            }
          }

          await exportTag(tag, finalTagType, triggerMap, destinationTags);
        } catch {
          failedTags.push(tag.name);
        }

        tagsDone++;
        setProgress((p) => ({ ...p, tagsDone }));

        toast.update(toastId, {
          render: `Exporting... Templates ${templatesDone}/${templateIds.size}, Variables ${variablesDone}/${missingVariables.length}, Triggers ${triggersDone}/${requiredTriggers.length}, Tags ${tagsDone}/${selectedTags.length}`,
        });
      }

      if (failedTags.length > 0) {
        toast.update(toastId, {
          render: `Export finished with ${failedTags.length} failure(s): ${failedTags.join(
            ", "
          )}`,
          type: "warning",
          position: "bottom-right",
          autoClose: 8000,
          closeOnClick: true,
          draggable: true,
        });
        return;
      }

      toast.update(toastId, {
        render: "✅ All tags exported successfully!",
        type: "success",
        position: "bottom-right",
        autoClose: 4000,
        closeOnClick: true,
        draggable: true,
      });

      onExportSuccess();
    } catch (err: any) {
      toast.update(toastId, {
        render: `❌ Export failed: ${err.message}`,
        type: "error",
        position: "bottom-right",
        autoClose: 8000,
      });
    } finally {
      setExportLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-line">
          <h2 className="text-[15px] font-semibold text-fg">
            Export Tags (Full Export)
          </h2>

          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-90">
          {/* LEFT */}
          <div className="col-span-5 border-r border-line bg-card-hi p-4">
            <p className="text-[12.5px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
              Selected Tags ({selectedTags.length})
            </p>

            <div className="bg-card border border-line rounded-lg p-3 mb-3">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-faint mb-2">
                Tag Type Summary
              </p>

              <div className="flex flex-wrap gap-2">
                {tagTypeSummary.map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-2 py-1 rounded-md text-[11px] border border-line bg-card-hi"
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-72">
              {selectedTags.map((tag: any) => (
                <div
                  key={tag.tagId}
                  className="px-4 py-3 border-b border-line last:border-none"
                >
                  <p className="text-[13px] font-medium text-fg">{tag.name}</p>
                  <p className="text-[11px] text-faint">
                    Type: {tag.type} | ID: {tag.tagId}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6 space-y-5">
            <h3 className="text-[14px] font-semibold text-fg mb-2">
              Select Destination
            </h3>

            <CustomDropdown
              label="Account"
              value={selectedAccountId}
              placeholder="-- Select Account --"
              disabled={loadingAccounts}
              options={accounts.map((a) => ({
                value: a.accountId,
                label: a.name,
              }))}
              onChange={(val) => setSelectedAccountId(val)}
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
              onChange={(val) => setSelectedContainerId(val)}
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
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
          <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
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
            className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? "Exporting..." : "Export Full Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { toast } from "react-toastify";
// import { confirmDialog } from "@/lib/ui/dialog";

// export default function ExportTagsModal({
//   show,
//   onClose,
//   onExportSuccess,
//   selectedTags,
// }: {
//   show: boolean;
//   onClose: () => void;
//   onExportSuccess: () => void;
//   selectedTags: any[];
// }) {
//   const store = useDashboardStore();

//   const [accounts, setAccounts] = useState<any[]>([]);
//   const [containers, setContainers] = useState<any[]>([]);
//   const [workspaces, setWorkspaces] = useState<any[]>([]);

//   const [selectedAccountId, setSelectedAccountId] = useState("");
//   const [selectedContainerId, setSelectedContainerId] = useState("");
//   const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");

//   const [loadingAccounts, setLoadingAccounts] = useState(false);
//   const [loadingContainers, setLoadingContainers] = useState(false);
//   const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

//   const [exportLoading, setExportLoading] = useState(false);

//   // ============================================================
//   // HELPERS
//   // ============================================================
//   const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

//   async function safeJsonParse(res: Response) {
//     const text = await res.text();
//     try {
//       return text ? JSON.parse(text) : {};
//     } catch {
//       return { raw: text };
//     }
//   }

//   function getErrorMessage(data: any) {
//     return (
//       data?.details?.error?.message ||
//       data?.details?.message ||
//       data?.error ||
//       data?.message ||
//       data?.raw ||
//       ""
//     );
//   }

//   function shouldRetry(res: Response, msg: string) {
//     const m = (msg || "").toLowerCase();

//     return (
//       [429, 502, 503, 504].includes(res.status) ||
//       m.includes("quota exceeded") ||
//       m.includes("rate limit exceeded") ||
//       m.includes("backend error") ||
//       m.includes("internal error") ||
//       m.includes("try again later")
//     );
//   }

//   async function fetchWithRetry(url: string, options: any, retries = 10) {
//     let delay = 1500;

//     for (let i = 0; i < retries; i++) {
//       const res = await fetch(url, options);
//       const data = await safeJsonParse(res);

//       if (res.ok) return { res, data };

//       const msg = getErrorMessage(data);

//       if (shouldRetry(res, msg)) {
//         console.log(
//           `⏳ Retry ${i + 1}/${retries} (${res.status}). Waiting ${
//             delay / 1000
//           }s...`
//         );
//         await sleep(delay);
//         delay = Math.min(delay * 2, 15000);
//         continue;
//       }

//       throw new Error(msg || `Request failed (${res.status})`);
//     }

//     throw new Error("Rate limit / backend error. Try again after 1 minute.");
//   }

//   function getTemplateIdFromTagType(tagType: string) {
//     if (!tagType?.includes("cvt_")) return null;
//     const parts = tagType.split("_");
//     return parts[parts.length - 1];
//   }

//   function isGA4ConfigTag(tag: any) {
//     return tag?.type === "gaawc";
//   }

//   function isGA4EventTag(tag: any) {
//     return tag?.type === "gaawe";
//   }

//   // ============================================================
//   // EXTRACT VARIABLE NAMES RECURSIVELY
//   // ============================================================
//   function extractVariablesFromAny(input: any, set: Set<string>) {
//     if (!input) return;

//     if (typeof input === "string") {
//       const matches = input.match(/{{(.*?)}}/g);
//       if (matches) {
//         matches.forEach((m) => {
//           const clean = m.replace("{{", "").replace("}}", "").trim();
//           if (clean) set.add(clean);
//         });
//       }
//       return;
//     }

//     if (Array.isArray(input)) {
//       input.forEach((x) => extractVariablesFromAny(x, set));
//       return;
//     }

//     if (typeof input === "object") {
//       Object.values(input).forEach((val) => extractVariablesFromAny(val, set));
//     }
//   }

//   // ============================================================
//   // LOAD ACCOUNTS
//   // ============================================================
//   useEffect(() => {
//     if (!show) return;

//     async function loadAccounts() {
//       try {
//         setLoadingAccounts(true);

//         const res = await fetch("/api/auth/gtm/accounts");
//         const data = await safeJsonParse(res);

//         if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

//         setAccounts(data.account || []);
//       } catch (err: any) {
//         toast.error(err.message);
//       } finally {
//         setLoadingAccounts(false);
//       }
//     }

//     loadAccounts();
//   }, [show]);

//   // ============================================================
//   // LOAD CONTAINERS
//   // ============================================================
//   useEffect(() => {
//     if (!selectedAccountId) return;

//     async function loadContainers() {
//       try {
//         setLoadingContainers(true);

//         const res = await fetch(
//           `/api/auth/gtm/containers?accountId=${selectedAccountId}`
//         );

//         const data = await safeJsonParse(res);

//         if (!res.ok)
//           throw new Error(data?.error || "Failed to fetch containers");

//         setContainers(data.container || []);
//         setSelectedContainerId("");
//         setSelectedWorkspaceId("");
//         setWorkspaces([]);
//       } catch (err: any) {
//         toast.error(err.message);
//       } finally {
//         setLoadingContainers(false);
//       }
//     }

//     loadContainers();
//   }, [selectedAccountId]);

//   // ============================================================
//   // LOAD WORKSPACES
//   // ============================================================
//   useEffect(() => {
//     if (!selectedAccountId || !selectedContainerId) return;

//     async function loadWorkspaces() {
//       try {
//         setLoadingWorkspaces(true);

//         const res = await fetch(
//           `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
//         );

//         const data = await safeJsonParse(res);

//         if (!res.ok)
//           throw new Error(data?.error || "Failed to fetch workspaces");

//         setWorkspaces(data.workspace || []);
//         setSelectedWorkspaceId("");
//       } catch (err: any) {
//         toast.error(err.message);
//       } finally {
//         setLoadingWorkspaces(false);
//       }
//     }

//     loadWorkspaces();
//   }, [selectedAccountId, selectedContainerId]);

//   // ============================================================
//   // SOURCE DATA
//   // ============================================================
//   const sourceAccountId = store.selectedAccountId;
//   const sourceContainerId = store.selectedContainerId;
//   const sourceWorkspaceId = store.selectedWorkspaceId;

//   // ============================================================
//   // FETCH DESTINATION DATA
//   // ============================================================
//   async function fetchDestinationTriggers() {
//     const res = await fetch(
//       `/api/auth/gtm/triggers?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//     );

//     const data = await safeJsonParse(res);

//     if (!res.ok) throw new Error(data?.error || "Failed to fetch triggers");

//     return data.trigger || [];
//   }

//   async function fetchDestinationVariables() {
//     const res = await fetch(
//       `/api/auth/gtm/variables?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//     );

//     const data = await safeJsonParse(res);

//     if (!res.ok) throw new Error(data?.error || "Failed to fetch variables");

//     return data.variable || [];
//   }

//   async function fetchDestinationTags() {
//     const res = await fetch(
//       `/api/auth/gtm/tags?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//     );

//     const data = await safeJsonParse(res);

//     if (!res.ok) throw new Error(data?.error || "Failed to fetch tags");

//     return data.tag || [];
//   }

//   async function fetchDestinationTemplates() {
//     // ✅ FIXED: use correct export route
//     const res = await fetch(
//       `/api/auth/gtm/templates/export?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//     );

//     const data = await safeJsonParse(res);

//     if (!res.ok) throw new Error(data?.error || "Failed to fetch templates");

//     return data.template || [];
//   }

//   // ============================================================
//   // EXPORT VARIABLE (WITH DUPLICATE RETRY)
//   // ============================================================
//   async function exportVariable(variable: any) {
//     let attempt = 0;
//     const maxAttempts = 6;

//     while (attempt < maxAttempts) {
//       const updatedName =
//         attempt === 0 ? variable.name : `${variable.name}_${attempt}`;

//       const cleanedVariable: any = {
//         name: updatedName,
//         type: variable.type,
//         parameter: variable.parameter || [],
//         formatValue: variable.formatValue,
//         convertUndefinedToValue: variable.convertUndefinedToValue,
//         convertUndefinedToValueTitle: variable.convertUndefinedToValueTitle,
//         convertUndefinedToValueDescription:
//           variable.convertUndefinedToValueDescription,
//         enableCookieOverrides: variable.enableCookieOverrides,
//         cookiePath: variable.cookiePath,
//         cookieDomain: variable.cookieDomain,
//         cookieExpires: variable.cookieExpires,
//         maxAgeSeconds: variable.maxAgeSeconds,
//         cookieName: variable.cookieName,
//       };

//       Object.keys(cleanedVariable).forEach((k) => {
//         if (cleanedVariable[k] === undefined) delete cleanedVariable[k];
//       });

//       try {
//         const { data } = await fetchWithRetry("/api/auth/gtm/variables", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             variable: cleanedVariable,
//           }),
//         });

//         await sleep(600);
//         return data;
//       } catch (err: any) {
//         const msg = (err.message || "").toLowerCase();

//         if (msg.includes("already exists") || msg.includes("duplicate name")) {
//           attempt++;
//           await sleep(600);
//           continue;
//         }

//         throw err;
//       }
//     }

//     throw new Error("Variable export failed after retries");
//   }

//   // ============================================================
//   // EXPORT TRIGGER (WITH DUPLICATE RETRY)
//   // ============================================================
//   async function exportTrigger(trigger: any) {
//     let attempt = 0;
//     const maxAttempts = 6;

//     while (attempt < maxAttempts) {
//       const updatedName =
//         attempt === 0 ? trigger.name : `${trigger.name}_${attempt}`;

//       const cleanedTrigger: any = {
//         name: updatedName,
//         type: trigger.type,
//         filter: trigger.filter || [],
//         autoEventFilter: trigger.autoEventFilter || [],
//         customEventFilter: trigger.customEventFilter || [],
//         waitForTags: trigger.waitForTags,
//         checkValidation: trigger.checkValidation,
//         waitForTagsTimeout: trigger.waitForTagsTimeout,
//         uniqueTriggerId: trigger.uniqueTriggerId,
//         interval: trigger.interval,
//         limit: trigger.limit,
//       };

//       Object.keys(cleanedTrigger).forEach((k) => {
//         if (cleanedTrigger[k] === undefined) delete cleanedTrigger[k];
//       });

//       try {
//         const { data } = await fetchWithRetry("/api/auth/gtm/triggers", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             trigger: cleanedTrigger,
//           }),
//         });

//         await sleep(650);
//         return data;
//       } catch (err: any) {
//         const msg = (err.message || "").toLowerCase();

//         if (msg.includes("already exists") || msg.includes("duplicate name")) {
//           attempt++;
//           await sleep(650);
//           continue;
//         }

//         throw err;
//       }
//     }

//     throw new Error("Trigger export failed after retries");
//   }

//   // ============================================================
//   // EXPORT TEMPLATE (FETCH FROM SOURCE + CREATE IN DEST)
//   // ============================================================
//   async function exportTemplate(templateId: string) {
//     const fetchRes = await fetchWithRetry(
//       `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${templateId}`,
//       { method: "GET" }
//     );

//     const sourceTemplate = fetchRes.data?.template;

//     if (!sourceTemplate) {
//       throw new Error("Template not found in source workspace");
//     }

//     const destTemplates = await fetchDestinationTemplates();
//     const existing = destTemplates.find(
//       (t: any) => t.name === sourceTemplate.name
//     );

//     if (existing?.templateId) {
//       console.log("✅ Template already exists:", sourceTemplate.name);
//       return existing.templateId;
//     }

//     const createRes = await fetchWithRetry("/api/auth/gtm/templates", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         accountId: selectedAccountId,
//         containerId: selectedContainerId,
//         workspaceId: selectedWorkspaceId,
//         template: {
//           name: sourceTemplate.name,
//           templateData: sourceTemplate.templateData,
//         },
//       }),
//     });

//     const newTemplateId = createRes.data?.template?.templateId;

//     if (!newTemplateId) {
//       throw new Error("New templateId missing after template creation");
//     }

//     await sleep(900);
//     return newTemplateId;
//   }

//   // ============================================================
//   // EXPORT TAG (WITH DUPLICATE RETRY + TRIGGER MAPPING)
//   // ============================================================
//   async function exportTag(tag: any, finalTagType: string, triggerMap: any) {
//     let attempt = 0;
//     const maxAttempts = 6;

//     while (attempt < maxAttempts) {
//       const updatedName = attempt === 0 ? tag.name : `${tag.name}_${attempt}`;

//       const mappedFiringTriggers =
//         (tag.firingTriggerId || []).map((id: string) => triggerMap[id]) || [];

//       const mappedBlockingTriggers =
//         (tag.blockingTriggerId || []).map((id: string) => triggerMap[id]) || [];

//       const cleanedTag: any = {
//         name: updatedName,
//         type: finalTagType,
//         parameter: tag.parameter || [],
//         firingTriggerId: mappedFiringTriggers.filter(Boolean),
//         blockingTriggerId: mappedBlockingTriggers.filter(Boolean),

//         tagFiringOption: tag.tagFiringOption,
//         consentSettings: tag.consentSettings,
//         monitoringMetadata: tag.monitoringMetadata,

//         scheduleStartMs: tag.scheduleStartMs,
//         scheduleEndMs: tag.scheduleEndMs,
//         priority: tag.priority,
//         notes: tag.notes,
//         parentFolderId: tag.parentFolderId,
//         paused: tag.paused,
//       };

//       Object.keys(cleanedTag).forEach((key) => {
//         if (cleanedTag[key] === undefined) delete cleanedTag[key];
//       });

//       try {
//         const { data } = await fetchWithRetry("/api/auth/gtm/tags", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             tag: cleanedTag,
//           }),
//         });

//         await sleep(800);
//         return data;
//       } catch (err: any) {
//         const msg = (err.message || "").toLowerCase();

//         if (msg.includes("already exists") || msg.includes("duplicate name")) {
//           attempt++;
//           await sleep(800);
//           continue;
//         }

//         throw err;
//       }
//     }

//     throw new Error("Tag export failed after retries");
//   }

//   // ============================================================
//   // TAG TYPE SUMMARY
//   // ============================================================
//   const tagTypeSummary = useMemo(() => {
//     const counts: Record<string, number> = {};
//     for (const t of selectedTags || []) {
//       const type = t?.type || "unknown";
//       counts[type] = (counts[type] || 0) + 1;
//     }
//     return Object.entries(counts).sort((a, b) => b[1] - a[1]);
//   }, [selectedTags]);

//   // ============================================================
//   // MAIN EXPORT FUNCTION
//   // ============================================================
//   async function handleExportTags() {
//     if (!selectedAccountId) return toast.warning("Please select an Account");
//     if (!selectedContainerId) return toast.warning("Please select a Container");
//     if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

//     if (!selectedTags || selectedTags.length === 0) {
//       return toast.warning("No tags selected for export.");
//     }

//     const ok = await confirmDialog({
//       title: `Export ${selectedTags.length} tag(s) with their dependencies?`,
//       description:
//         "Templates, variables, triggers will be created first if missing. Existing items are not modified.",
//       confirmLabel: "Export",
//     });

//     if (!ok) return;

//     const failedTags: string[] = [];

//     try {
//       setExportLoading(true);

//       console.log("===========================================");
//       console.log("🚀 EXPORT STARTED");
//       console.log("Selected Tags:", selectedTags.length);
//       console.log("===========================================");

//       // ============================================================
//       // LOAD SOURCE TRIGGERS + VARIABLES
//       // ============================================================
//       const sourceTriggersRes = await fetch(
//         `/api/auth/gtm/triggers?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
//       );
//       const sourceTriggersData = await safeJsonParse(sourceTriggersRes);
//       const sourceTriggers = sourceTriggersData.trigger || [];

//       const sourceVariablesRes = await fetch(
//         `/api/auth/gtm/variables?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
//       );
//       const sourceVariablesData = await safeJsonParse(sourceVariablesRes);
//       const sourceVariables = sourceVariablesData.variable || [];

//       // ============================================================
//       // REQUIRED TRIGGERS
//       // ============================================================
//       const requiredTriggerIds = new Set<string>();

//       for (const tag of selectedTags) {
//         (tag.firingTriggerId || []).forEach((id: string) =>
//           requiredTriggerIds.add(id)
//         );
//         (tag.blockingTriggerId || []).forEach((id: string) =>
//           requiredTriggerIds.add(id)
//         );
//       }

//       const requiredTriggers = sourceTriggers.filter((t: any) =>
//         requiredTriggerIds.has(t.triggerId)
//       );

//       console.log("Required triggers:", requiredTriggers.length);

//       // ============================================================
//       // REQUIRED VARIABLES (RECURSIVE EXTRACTION FIXED)
//       // ============================================================
//       const requiredVariableNames = new Set<string>();

//       for (const tag of selectedTags) {
//         extractVariablesFromAny(tag.parameter, requiredVariableNames);
//       }

//       const requiredVariables = sourceVariables; // ✅ export all variables

//       console.log("Required variables:", requiredVariables.length);

//       // ============================================================
//       // EXPORT REQUIRED TEMPLATES FIRST
//       // ============================================================
//       const templateMap: Record<string, string> = {};

//       for (const tag of selectedTags) {
//         const templateId = getTemplateIdFromTagType(tag.type);
//         if (!templateId) continue;

//         if (templateMap[templateId]) continue;

//         try {
//           console.log("📦 Exporting template:", templateId);
//           const newTemplateId = await exportTemplate(templateId);
//           templateMap[templateId] = newTemplateId;
//         } catch (err: any) {
//           console.log("❌ Template export failed:", templateId, err);
//         }
//       }

//       console.log("Template map created:", templateMap);

//       // ============================================================
//       // EXPORT VARIABLES
//       // ============================================================
//       let destinationVariables = await fetchDestinationVariables();

//       const missingVariables = requiredVariables.filter((v: any) => {
//         return !destinationVariables.some((dv: any) => dv.name === v.name);
//       });

//       console.log("Missing variables:", missingVariables.length);

//       if (missingVariables.length > 0) {
//         for (const v of missingVariables) {
//           try {
//             console.log("🧩 Exporting variable:", v.name);
//             await exportVariable(v);
//           } catch (err) {
//             console.log("❌ Variable export failed:", v.name, err);
//           }
//         }
//       }

//       destinationVariables = await fetchDestinationVariables();

//       // ============================================================
//       // EXPORT TRIGGERS + CREATE TRIGGER MAP
//       // ============================================================
//       let destinationTriggers = await fetchDestinationTriggers();

//       const triggerMap: Record<string, string> = {};

//       for (const t of requiredTriggers) {
//         const destTrigger = destinationTriggers.find(
//           (dt: any) => dt.name === t.name
//         );

//         if (destTrigger) {
//           triggerMap[t.triggerId] = destTrigger.triggerId;
//         } else {
//           try {
//             console.log("⚡ Exporting trigger:", t.name);
//             const created = await exportTrigger(t);

//             if (created?.trigger?.triggerId) {
//               triggerMap[t.triggerId] = created.trigger.triggerId;
//             }
//           } catch (err) {
//             console.log("❌ Trigger export failed:", t.name, err);
//           }
//         }
//       }

//       destinationTriggers = await fetchDestinationTriggers();

//       for (const t of requiredTriggers) {
//         if (!triggerMap[t.triggerId]) {
//           const destTrigger = destinationTriggers.find(
//             (dt: any) => dt.name === t.name
//           );
//           if (destTrigger) triggerMap[t.triggerId] = destTrigger.triggerId;
//         }
//       }

//       console.log("Trigger map created:", Object.keys(triggerMap).length);

//       // ============================================================
//       // EXPORT GA4 CONFIG FIRST
//       // ============================================================
//       const ga4ConfigTags = selectedTags.filter(isGA4ConfigTag);
//       const ga4EventTags = selectedTags.filter(isGA4EventTag);
//       const otherTags = selectedTags.filter(
//         (t) => !isGA4ConfigTag(t) && !isGA4EventTag(t)
//       );

//       console.log("GA4 Config tags:", ga4ConfigTags.length);
//       console.log("GA4 Event tags:", ga4EventTags.length);
//       console.log("Other tags:", otherTags.length);

//       // export GA4 config tags first
//       for (const tag of ga4ConfigTags) {
//         try {
//           console.log("📌 Exporting GA4 Config:", tag.name);
//           await exportTag(tag, tag.type, triggerMap);
//         } catch (err) {
//           console.log("❌ GA4 Config export failed:", tag.name, err);
//           failedTags.push(tag.name);
//         }
//       }

//       // map GA4 configs
//       const refreshedTags = await fetchDestinationTags();

//       const ga4ConfigMap: Record<string, string> = {};
//       for (const srcConfig of ga4ConfigTags) {
//         const destConfig = refreshedTags.find(
//           (dt: any) => dt.name === srcConfig.name
//         );

//         if (destConfig) {
//           ga4ConfigMap[srcConfig.tagId] = destConfig.tagId;
//         }
//       }

//       console.log("GA4 Config map:", ga4ConfigMap);

//       // export GA4 event tags
//       for (const tag of ga4EventTags) {
//         try {
//           console.log("📌 Exporting GA4 Event:", tag.name);

//           const cloned = JSON.parse(JSON.stringify(tag));

//           if (cloned.parameter && Array.isArray(cloned.parameter)) {
//             cloned.parameter = cloned.parameter.map((p: any) => {
//               if (p.key === "configTag" && ga4ConfigMap[p.value]) {
//                 return { ...p, value: ga4ConfigMap[p.value] };
//               }
//               return p;
//             });
//           }

//           await exportTag(cloned, cloned.type, triggerMap);
//         } catch (err) {
//           console.log("❌ GA4 Event export failed:", tag.name, err);
//           failedTags.push(tag.name);
//         }
//       }

//       // export other tags
//       for (const tag of otherTags) {
//         try {
//           let finalTagType = tag.type;

//           if (tag.type?.includes("cvt_")) {
//             const templateId = getTemplateIdFromTagType(tag.type);
//             const newTemplateId = templateMap[templateId || ""];

//             if (newTemplateId) {
//               finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
//             } else {
//               throw new Error("Missing template mapping for this tag");
//             }
//           }

//           console.log("📌 Exporting tag:", tag.name);
//           await exportTag(tag, finalTagType, triggerMap);
//         } catch (err) {
//           console.log("❌ Tag export failed:", tag.name, err);
//           failedTags.push(tag.name);
//         }
//       }

//       if (failedTags.length > 0) {
//         toast.warning(
//           `Export finished with ${failedTags.length} failure(s): ${failedTags.join(
//             ", "
//           )}`
//         );
//         return;
//       }

//       toast.success("✅ Tags exported successfully with full dependencies!");
//       onExportSuccess();
//     } catch (err: any) {
//       toast.error(err.message);
//     } finally {
//       setExportLoading(false);
//       console.log("===========================================");
//       console.log("🏁 EXPORT FINISHED");
//       console.log("===========================================");
//     }
//   }

//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-card text-fg w-full max-w-3xl rounded-xl border border-edge shadow-lg overflow-hidden">
//         {/* HEADER */}
//         <div className="flex justify-between items-center px-5 py-3 border-b border-line">
//           <h2 className="text-[15px] font-semibold text-fg">
//             Export Tags (Full Export)
//           </h2>

//           <button
//             onClick={onClose}
//             className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
//           >
//             ✕
//           </button>
//         </div>

//         {/* BODY */}
//         <div className="grid grid-cols-12 min-h-90">
//           {/* LEFT */}
//           <div className="col-span-5 border-r border-line bg-card-hi p-4">
//             <p className="text-[12.5px] font-medium text-faint mb-3 uppercase tracking-[0.05em]">
//               Selected Tags ({selectedTags.length})
//             </p>

//             {/* SUMMARY */}
//             <div className="bg-card border border-line rounded-lg p-3 mb-3">
//               <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-faint mb-2">
//                 Tag Type Summary
//               </p>

//               <div className="flex flex-wrap gap-2">
//                 {tagTypeSummary.map(([type, count]) => (
//                   <span
//                     key={type}
//                     className="inline-flex items-center px-2 py-1 rounded-md text-[11px] border border-line bg-card-hi"
//                   >
//                     {type}: {count}
//                   </span>
//                 ))}
//               </div>
//             </div>

//             <div className="bg-card border border-line rounded-lg overflow-y-auto max-h-72">
//               {selectedTags.length === 0 ? (
//                 <p className="text-[12px] text-faint p-4">No tags selected.</p>
//               ) : (
//                 selectedTags.map((tag: any) => (
//                   <div
//                     key={tag.tagId}
//                     className="px-4 py-3 border-b border-line last:border-none"
//                   >
//                     <p className="text-[13px] font-medium text-fg">{tag.name}</p>
//                     <p className="text-[11px] text-faint">
//                       Type: {tag.type} | ID: {tag.tagId}
//                     </p>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* RIGHT */}
//           <div className="col-span-7 p-6">
//             <h3 className="text-[14px] font-semibold text-fg mb-5">
//               Select Destination
//             </h3>

//             <label className="block text-[12.5px] font-medium text-fg mb-2">
//               Account
//             </label>
//             <select
//               value={selectedAccountId}
//               onChange={(e) => setSelectedAccountId(e.target.value)}
//               disabled={loadingAccounts}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Account --</option>
//               {accounts.map((acc: any) => (
//                 <option key={acc.accountId} value={acc.accountId}>
//                   {acc.name}
//                 </option>
//               ))}
//             </select>

//             <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
//               Container
//             </label>
//             <select
//               value={selectedContainerId}
//               onChange={(e) => setSelectedContainerId(e.target.value)}
//               disabled={!selectedAccountId || loadingContainers}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Container --</option>
//               {containers.map((c: any) => (
//                 <option key={c.containerId} value={c.containerId}>
//                   {c.name}
//                 </option>
//               ))}
//             </select>

//             <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
//               Workspace
//             </label>
//             <select
//               value={selectedWorkspaceId}
//               onChange={(e) => setSelectedWorkspaceId(e.target.value)}
//               disabled={!selectedContainerId || loadingWorkspaces}
//               className="w-full bg-page-soft py-2.5 text-[13px]"
//             >
//               <option value="">-- Select Workspace --</option>
//               {workspaces.map((w: any) => (
//                 <option key={w.workspaceId} value={w.workspaceId}>
//                   {w.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* FOOTER */}
//         <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
//           <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
//             Cancel
//           </button>

//           <button
//             onClick={handleExportTags}
//             disabled={
//               exportLoading ||
//               !selectedAccountId ||
//               !selectedContainerId ||
//               !selectedWorkspaceId ||
//               selectedTags.length === 0
//             }
//             className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
//           >
//             {exportLoading ? "Exporting..." : "Export Full Setup"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }