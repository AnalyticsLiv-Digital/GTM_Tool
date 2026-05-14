/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/ui/dialog";

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
        console.log(
          `⏳ Retry ${i + 1}/${retries} (${res.status}). Waiting ${
            delay / 1000
          }s...`
        );
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
    // ✅ FIXED: use correct export route
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
  // EXPORT TEMPLATE (FETCH FROM SOURCE + CREATE IN DEST)
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
      console.log("✅ Template already exists:", sourceTemplate.name);
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
  // EXPORT TAG (WITH DUPLICATE RETRY + TRIGGER MAPPING)
  // ============================================================
  async function exportTag(tag: any, finalTagType: string, triggerMap: any) {
    let attempt = 0;
    const maxAttempts = 6;

    while (attempt < maxAttempts) {
      const updatedName = attempt === 0 ? tag.name : `${tag.name}_${attempt}`;

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

    const failedTags: string[] = [];

    try {
      setExportLoading(true);

      console.log("===========================================");
      console.log("🚀 EXPORT STARTED");
      console.log("Selected Tags:", selectedTags.length);
      console.log("===========================================");

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
      // REQUIRED TRIGGERS
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

      console.log("Required triggers:", requiredTriggers.length);

      // ============================================================
      // REQUIRED VARIABLES (RECURSIVE EXTRACTION FIXED)
      // ============================================================
      const requiredVariableNames = new Set<string>();

      for (const tag of selectedTags) {
        extractVariablesFromAny(tag.parameter, requiredVariableNames);
      }

      const requiredVariables = sourceVariables; // ✅ export all variables

      console.log("Required variables:", requiredVariables.length);

      // ============================================================
      // EXPORT REQUIRED TEMPLATES FIRST
      // ============================================================
      const templateMap: Record<string, string> = {};

      for (const tag of selectedTags) {
        const templateId = getTemplateIdFromTagType(tag.type);
        if (!templateId) continue;

        if (templateMap[templateId]) continue;

        try {
          console.log("📦 Exporting template:", templateId);
          const newTemplateId = await exportTemplate(templateId);
          templateMap[templateId] = newTemplateId;
        } catch (err: any) {
          console.log("❌ Template export failed:", templateId, err);
        }
      }

      console.log("Template map created:", templateMap);

      // ============================================================
      // EXPORT VARIABLES
      // ============================================================
      let destinationVariables = await fetchDestinationVariables();

      const missingVariables = requiredVariables.filter((v: any) => {
        return !destinationVariables.some((dv: any) => dv.name === v.name);
      });

      console.log("Missing variables:", missingVariables.length);

      if (missingVariables.length > 0) {
        for (const v of missingVariables) {
          try {
            console.log("🧩 Exporting variable:", v.name);
            await exportVariable(v);
          } catch (err) {
            console.log("❌ Variable export failed:", v.name, err);
          }
        }
      }

      destinationVariables = await fetchDestinationVariables();

      // ============================================================
      // EXPORT TRIGGERS + CREATE TRIGGER MAP
      // ============================================================
      let destinationTriggers = await fetchDestinationTriggers();

      const triggerMap: Record<string, string> = {};

      for (const t of requiredTriggers) {
        const destTrigger = destinationTriggers.find(
          (dt: any) => dt.name === t.name
        );

        if (destTrigger) {
          triggerMap[t.triggerId] = destTrigger.triggerId;
        } else {
          try {
            console.log("⚡ Exporting trigger:", t.name);
            const created = await exportTrigger(t);

            if (created?.trigger?.triggerId) {
              triggerMap[t.triggerId] = created.trigger.triggerId;
            }
          } catch (err) {
            console.log("❌ Trigger export failed:", t.name, err);
          }
        }
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

      console.log("Trigger map created:", Object.keys(triggerMap).length);

      // ============================================================
      // EXPORT GA4 CONFIG FIRST
      // ============================================================
      const ga4ConfigTags = selectedTags.filter(isGA4ConfigTag);
      const ga4EventTags = selectedTags.filter(isGA4EventTag);
      const otherTags = selectedTags.filter(
        (t) => !isGA4ConfigTag(t) && !isGA4EventTag(t)
      );

      console.log("GA4 Config tags:", ga4ConfigTags.length);
      console.log("GA4 Event tags:", ga4EventTags.length);
      console.log("Other tags:", otherTags.length);

      // export GA4 config tags first
      for (const tag of ga4ConfigTags) {
        try {
          console.log("📌 Exporting GA4 Config:", tag.name);
          await exportTag(tag, tag.type, triggerMap);
        } catch (err) {
          console.log("❌ GA4 Config export failed:", tag.name, err);
          failedTags.push(tag.name);
        }
      }

      // map GA4 configs
      const refreshedTags = await fetchDestinationTags();

      const ga4ConfigMap: Record<string, string> = {};
      for (const srcConfig of ga4ConfigTags) {
        const destConfig = refreshedTags.find(
          (dt: any) => dt.name === srcConfig.name
        );

        if (destConfig) {
          ga4ConfigMap[srcConfig.tagId] = destConfig.tagId;
        }
      }

      console.log("GA4 Config map:", ga4ConfigMap);

      // export GA4 event tags
      for (const tag of ga4EventTags) {
        try {
          console.log("📌 Exporting GA4 Event:", tag.name);

          const cloned = JSON.parse(JSON.stringify(tag));

          if (cloned.parameter && Array.isArray(cloned.parameter)) {
            cloned.parameter = cloned.parameter.map((p: any) => {
              if (p.key === "configTag" && ga4ConfigMap[p.value]) {
                return { ...p, value: ga4ConfigMap[p.value] };
              }
              return p;
            });
          }

          await exportTag(cloned, cloned.type, triggerMap);
        } catch (err) {
          console.log("❌ GA4 Event export failed:", tag.name, err);
          failedTags.push(tag.name);
        }
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

          console.log("📌 Exporting tag:", tag.name);
          await exportTag(tag, finalTagType, triggerMap);
        } catch (err) {
          console.log("❌ Tag export failed:", tag.name, err);
          failedTags.push(tag.name);
        }
      }

      if (failedTags.length > 0) {
        toast.warning(
          `Export finished with ${failedTags.length} failure(s): ${failedTags.join(
            ", "
          )}`
        );
        return;
      }

      toast.success("✅ Tags exported successfully with full dependencies!");
      onExportSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExportLoading(false);
      console.log("===========================================");
      console.log("🏁 EXPORT FINISHED");
      console.log("===========================================");
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

            {/* SUMMARY */}
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
              {selectedTags.length === 0 ? (
                <p className="text-[12px] text-faint p-4">No tags selected.</p>
              ) : (
                selectedTags.map((tag: any) => (
                  <div
                    key={tag.tagId}
                    className="px-4 py-3 border-b border-line last:border-none"
                  >
                    <p className="text-[13px] font-medium text-fg">{tag.name}</p>
                    <p className="text-[11px] text-faint">
                      Type: {tag.type} | ID: {tag.tagId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6">
            <h3 className="text-[14px] font-semibold text-fg mb-5">
              Select Destination
            </h3>

            <label className="block text-[12.5px] font-medium text-fg mb-2">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full bg-page-soft py-2.5 text-[13px]"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
              Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full bg-page-soft py-2.5 text-[13px]"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-[12.5px] font-medium text-fg mt-5 mb-2">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full bg-page-soft py-2.5 text-[13px]"
            >
              <option value="">-- Select Workspace --</option>
              {workspaces.map((w: any) => (
                <option key={w.workspaceId} value={w.workspaceId}>
                  {w.name}
                </option>
              ))}
            </select>
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
              !selectedWorkspaceId ||
              selectedTags.length === 0
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

// import { useEffect, useState } from "react";
// import { toast } from "react-toastify";
// import { useDashboardStore } from "@/app/store/useDashboardStore";

// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// function extractVariableNamesFromTag(tag: any): string[] {
//   const found = new Set<string>();

//   const scan = (obj: any) => {
//     if (!obj) return;

//     if (typeof obj === "string") {
//       const matches = obj.match(/{{(.*?)}}/g);
//       if (matches) {
//         matches.forEach((m) => {
//           const clean = m.replace("{{", "").replace("}}", "").trim();
//           if (clean) found.add(clean);
//         });
//       }
//     } else if (Array.isArray(obj)) {
//       obj.forEach(scan);
//     } else if (typeof obj === "object") {
//       Object.values(obj).forEach(scan);
//     }
//   };

//   scan(tag);

//   return Array.from(found);
// }

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

//   // ----------------------------------------------------
//   // LOAD ACCOUNTS
//   // ----------------------------------------------------
//   useEffect(() => {
//     if (!show) return;

//     async function loadAccounts() {
//       try {
//         setLoadingAccounts(true);

//         const res = await fetch("/api/auth/gtm/accounts");
//         const data = await res.json();

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

//   // ----------------------------------------------------
//   // LOAD CONTAINERS
//   // ----------------------------------------------------
//   useEffect(() => {
//     if (!selectedAccountId) return;

//     async function loadContainers() {
//       try {
//         setLoadingContainers(true);

//         const res = await fetch(
//           `/api/auth/gtm/containers?accountId=${selectedAccountId}`
//         );
//         const data = await res.json();

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

//   // ----------------------------------------------------
//   // LOAD WORKSPACES
//   // ----------------------------------------------------
//   useEffect(() => {
//     if (!selectedAccountId || !selectedContainerId) return;

//     async function loadWorkspaces() {
//       try {
//         setLoadingWorkspaces(true);

//         const res = await fetch(
//           `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
//         );

//         const data = await res.json();

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

//   // ----------------------------------------------------
//   // EXPORT TAGS (WITH DEPENDENCIES)
//   // ----------------------------------------------------
//   async function handleExportTags() {
//     if (!selectedAccountId) return toast.warning("Please select an Account");
//     if (!selectedContainerId) return toast.warning("Please select a Container");
//     if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

//     if (!selectedTags || selectedTags.length === 0)
//       return toast.warning("No tags selected for export.");

//     if (
//       !confirm(
//         `Are you sure you want to export ${selectedTags.length} tag(s) with triggers, variables, and templates?`
//       )
//     )
//       return;

//     const failedTags: string[] = [];

//     try {
//       setExportLoading(true);

//       const sourceAccountId = store.selectedAccountId;
//       const sourceContainerId = store.selectedContainerId;
//       const sourceWorkspaceId = store.selectedWorkspaceId;

//       const triggersRes = await fetch(
//         `/api/auth/gtm/triggers?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
//       );
//       const triggersData = await triggersRes.json();
//       const sourceTriggers = triggersData.trigger || [];

//       const variablesRes = await fetch(
//         `/api/auth/gtm/variables?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}`
//       );
//       const variablesData = await variablesRes.json();
//       const sourceVariables = variablesData.variable || [];

//       const destTriggersRes = await fetch(
//         `/api/auth/gtm/triggers?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//       );
//       const destTriggersData = await destTriggersRes.json();
//       const sourceDestTriggers = destTriggersData.trigger || [];

//       const destVariablesRes = await fetch(
//         `/api/auth/gtm/variables?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//       );
//       const destVariablesData = await destVariablesRes.json();
//       const sourceDestVariables = destVariablesData.variable || [];

//       const triggerIdMap: Record<string, string> = {};
//       const destTriggerNameMap: Record<string, any> = {};
//       sourceDestTriggers.forEach((t: any) => {
//         destTriggerNameMap[t.name] = t;
//       });

//       const destVariableNameSet = new Set<string>(
//         sourceDestVariables.map((v: any) => v.name)
//       );

//       const templateIdMap: Record<string, string> = {};

//       async function exportTriggerIfNeeded(triggerId: string) {
//         if (triggerIdMap[triggerId]) return triggerIdMap[triggerId];
//         const sourceTrigger = sourceTriggers.find(
//           (t: any) => t.triggerId === triggerId
//         );
//         if (!sourceTrigger) return "";
//         if (destTriggerNameMap[sourceTrigger.name]) {
//           triggerIdMap[triggerId] =
//             destTriggerNameMap[sourceTrigger.name].triggerId;
//           return triggerIdMap[triggerId];
//         }

//         const cleanedTrigger: any = { ...sourceTrigger };
//         delete cleanedTrigger.triggerId;
//         delete cleanedTrigger.path;
//         delete cleanedTrigger.fingerprint;
//         delete cleanedTrigger.accountId;
//         delete cleanedTrigger.containerId;
//         delete cleanedTrigger.workspaceId;

//         let attempt = 0;
//         const maxRetries = 10;
//         while (attempt < maxRetries) {
//           const res = await fetch("/api/auth/gtm/triggers", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               accountId: selectedAccountId,
//               containerId: selectedContainerId,
//               workspaceId: selectedWorkspaceId,
//               trigger: cleanedTrigger,
//             }),
//           });
//           const data = await res.json().catch(() => ({}));
//           if (res.ok) {
//             triggerIdMap[triggerId] = data.trigger.triggerId;
//             destTriggerNameMap[sourceTrigger.name] = data.trigger;
//             return data.trigger.triggerId;
//           }
//           if ([429, 502, 503, 504].includes(res.status)) {
//             attempt++;
//             await sleep(1000 * attempt);
//             continue;
//           }
//           throw new Error(
//             data?.details?.error?.message || "Failed to export trigger"
//           );
//         }
//         throw new Error("Trigger export failed after retries");
//       }

//       async function exportVariableIfNeeded(variableName: string) {
//         if (destVariableNameSet.has(variableName)) return;
//         const sourceVar = sourceVariables.find(
//           (v: any) => v.name === variableName
//         );
//         if (!sourceVar) return;
//         const cleanedVar: any = { ...sourceVar };
//         delete cleanedVar.variableId;
//         delete cleanedVar.path;
//         delete cleanedVar.fingerprint;
//         delete cleanedVar.accountId;
//         delete cleanedVar.containerId;
//         delete cleanedVar.workspaceId;

//         let attempt = 0;
//         const maxRetries = 10;
//         while (attempt < maxRetries) {
//           const res = await fetch("/api/auth/gtm/variables", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               accountId: selectedAccountId,
//               containerId: selectedContainerId,
//               workspaceId: selectedWorkspaceId,
//               variable: cleanedVar,
//             }),
//           });
//           const data = await res.json().catch(() => ({}));
//           if (res.ok) {
//             destVariableNameSet.add(variableName);
//             return;
//           }
//           if ([429, 502, 503, 504].includes(res.status)) {
//             attempt++;
//             await sleep(1000 * attempt);
//             continue;
//           }
//           throw new Error(
//             data?.details?.error?.message || "Failed to export variable"
//           );
//         }
//         throw new Error("Variable export failed after retries");
//       }

//       async function exportTemplateIfNeeded(tag: any): Promise<string> {
//         if (!tag.type?.startsWith("cvt_")) return tag.type;
//         const parts = tag.type.split("_");
//         const sourceTemplateId = parts[parts.length - 1];
//         if (templateIdMap[sourceTemplateId]) {
//           return `cvt_${selectedContainerId}_${templateIdMap[sourceTemplateId]}`;
//         }
//         const fetchTemplateRes = await fetch(
//           `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${sourceTemplateId}`
//         );
//         const fetchTemplateData = await fetchTemplateRes.json();
//         if (!fetchTemplateRes.ok) {
//           throw new Error(
//             fetchTemplateData?.error || "Failed to fetch template"
//           );
//         }
//         const sourceTemplate = fetchTemplateData.template;
//         if (!sourceTemplate) throw new Error("Template not found");

//         let attempt = 0;
//         const maxRetries = 10;
//         while (attempt < maxRetries) {
//           const createTemplateRes = await fetch("/api/auth/gtm/templates", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               accountId: selectedAccountId,
//               containerId: selectedContainerId,
//               workspaceId: selectedWorkspaceId,
//               template: {
//                 name: sourceTemplate.name,
//                 templateData: sourceTemplate.templateData,
//               },
//             }),
//           });
//           const createTemplateData = await createTemplateRes
//             .json()
//             .catch(() => ({}));
//           if (createTemplateRes.ok) {
//             const newTemplateId = createTemplateData?.template?.templateId;
//             if (!newTemplateId) throw new Error("Template creation failed");
//             templateIdMap[sourceTemplateId] = newTemplateId;
//             return `cvt_${selectedContainerId}_${newTemplateId}`;
//           }
//           if ([429, 502, 503, 504].includes(createTemplateRes.status)) {
//             attempt++;
//             await sleep(1000 * attempt);
//             continue;
//           }
//           const msg =
//             createTemplateData?.details?.error?.message ||
//             createTemplateData?.error ||
//             "";
//           if (msg.toLowerCase().includes("already exists")) return tag.type;
//           throw new Error(msg || "Failed to create template");
//         }
//         throw new Error("Template export failed after retries");
//       }

//       for (const tag of selectedTags) {
//         try {
//           const finalTagType = await exportTemplateIfNeeded(tag);
//           const firingTriggerIds: string[] = tag.firingTriggerId || [];
//           const blockingTriggerIds: string[] = tag.blockingTriggerId || [];
//           const mappedFiring: string[] = [];
//           for (const id of firingTriggerIds) {
//             const mapped = await exportTriggerIfNeeded(id);
//             if (mapped) mappedFiring.push(mapped);
//           }
//           const mappedBlocking: string[] = [];
//           for (const id of blockingTriggerIds) {
//             const mapped = await exportTriggerIfNeeded(id);
//             if (mapped) mappedBlocking.push(mapped);
//           }
//           const usedVarNames = extractVariableNamesFromTag(tag);
//           for (const varName of usedVarNames) {
//             await exportVariableIfNeeded(varName);
//           }

//           let exportSuccess = false;
//           let attempt = 0;
//           const maxAttempts = 10;
//           while (!exportSuccess && attempt < maxAttempts) {
//             const updatedName =
//               attempt === 0 ? tag.name : `${tag.name}_${attempt}`;
//             const cleanedTag: any = { ...tag };
//             delete cleanedTag.tagId;
//             delete cleanedTag.path;
//             delete cleanedTag.fingerprint;
//             delete cleanedTag.accountId;
//             delete cleanedTag.containerId;
//             delete cleanedTag.workspaceId;
//             cleanedTag.name = updatedName;
//             cleanedTag.type = finalTagType;
//             cleanedTag.firingTriggerId = mappedFiring;
//             cleanedTag.blockingTriggerId = mappedBlocking;

//             const res = await fetch("/api/auth/gtm/tags", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 accountId: selectedAccountId,
//                 containerId: selectedContainerId,
//                 workspaceId: selectedWorkspaceId,
//                 tag: cleanedTag,
//               }),
//             });
//             const data = await res.json().catch(() => ({}));
//             if (res.ok) {
//               exportSuccess = true;
//               break;
//             }
//             const errorMsg =
//               data?.details?.error?.message ||
//               data?.error ||
//               "Failed to export tag";
//             if (
//               errorMsg.toLowerCase().includes("already exists") ||
//               errorMsg.toLowerCase().includes("duplicate name")
//             ) {
//               attempt++;
//               continue;
//             }
//             if ([429, 502, 503, 504].includes(res.status)) {
//               attempt++;
//               await sleep(1000 * attempt);
//               continue;
//             }
//             throw new Error(errorMsg);
//           }
//           if (!exportSuccess)
//             throw new Error("Tag export failed after retries");
//           await sleep(300);
//         } catch {
//           failedTags.push(tag?.name || "Unknown Tag");
//         }
//       }

//       if (failedTags.length > 0) {
//         toast.warning(
//           `Export finished with failures. Failed: ${failedTags.join(", ")}`
//         );
//         return;
//       }
//       toast.success("Tags exported successfully!");
//       onExportSuccess();
//     } catch (err: any) {
//       toast.error(err.message);
//     } finally {
//       setExportLoading(false);
//     }
//   }

//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//       <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden">
//         {/* HEADER */}
//         <div className="flex justify-between items-center px-6 py-4 border-b">
//           <h2 className="text-lg font-bold text-gray-900">Export Tags</h2>
//           <button
//             onClick={onClose}
//             className="text-gray-600 hover:text-gray-900 font-bold text-lg"
//           >
//             ✕
//           </button>
//         </div>

//         {/* BODY */}
//         <div className="grid grid-cols-12 min-h-90">
//           {/* LEFT */}
//           <div className="col-span-5 border-r bg-gray-50 p-4">
//             <p className="text-sm font-semibold text-gray-700 mb-3">
//               Selected Tags ({selectedTags.length})
//             </p>

//             <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
//               {selectedTags.length === 0 ? (
//                 <p className="text-xs text-gray-500 p-4">No tags selected.</p>
//               ) : (
//                 selectedTags.map((tag: any) => (
//                   <div
//                     key={tag.tagId}
//                     className="px-4 py-3 border-b last:border-none"
//                   >
//                     <p className="text-sm font-semibold text-gray-900">
//                       {tag.name}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       Type: {tag.type} | ID: {tag.tagId}
//                     </p>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* RIGHT */}
//           <div className="col-span-7 p-6">
//             <h3 className="text-md font-bold text-gray-900 mb-5">
//               Select Destination
//             </h3>

//             <label className="block text-sm font-semibold text-gray-700 mb-2">
//               Account
//             </label>
//             <select
//               value={selectedAccountId}
//               onChange={(e) => setSelectedAccountId(e.target.value)}
//               disabled={loadingAccounts}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">-- Select Account --</option>
//               {accounts.map((acc: any) => (
//                 <option key={acc.accountId} value={acc.accountId}>
//                   {acc.name}
//                 </option>
//               ))}
//             </select>

//             <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
//               Container
//             </label>
//             <select
//               value={selectedContainerId}
//               onChange={(e) => setSelectedContainerId(e.target.value)}
//               disabled={!selectedAccountId || loadingContainers}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">-- Select Container --</option>
//               {containers.map((c: any) => (
//                 <option key={c.containerId} value={c.containerId}>
//                   {c.name}
//                 </option>
//               ))}
//             </select>

//             <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
//               Workspace
//             </label>
//             <select
//               value={selectedWorkspaceId}
//               onChange={(e) => setSelectedWorkspaceId(e.target.value)}
//               disabled={!selectedContainerId || loadingWorkspaces}
//               className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
//         <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
//           >
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
//             className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
//           >
//             {exportLoading ? "Exporting..." : "Export Selected Tags"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }