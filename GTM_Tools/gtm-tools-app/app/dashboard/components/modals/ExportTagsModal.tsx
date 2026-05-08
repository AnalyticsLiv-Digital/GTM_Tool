/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { toast } from "react-toastify";

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

  async function fetchWithRetry(url: string, options: any, retries = 6) {
    let delay = 2000;

    for (let i = 0; i < retries; i++) {
      const res = await fetch(url, options);
      const data = await safeJsonParse(res);

      if (res.ok) return { res, data };

      const msg =
        data?.details?.error?.message ||
        data?.error ||
        data?.message ||
        data?.raw ||
        "";

      // Retry only quota errors
      if (
        res.status === 429 ||
        msg.toLowerCase().includes("quota exceeded") ||
        msg.toLowerCase().includes("rate limit exceeded")
      ) {
        console.log(`⏳ Rate limited. Retrying after ${delay / 1000}s...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }

      throw new Error(msg || "Request failed");
    }

    throw new Error("Rate limit exceeded. Try again after 1 minute.");
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
  // SOURCE DATA (FROM STORE)
  // ============================================================
  const sourceAccountId = store.selectedAccountId;
  const sourceContainerId = store.selectedContainerId;
  const sourceWorkspaceId = store.selectedWorkspaceId;

  // const sourceTriggers = store.triggers || [];
  // const sourceVariables = store.variables || [];

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

  // ============================================================
  // EXPORT VARIABLE (WITH DUPLICATE RETRY)
  // ============================================================
  async function exportVariable(variable: any) {
    let attempt = 0;
    const maxAttempts = 5;

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

        return data;
      } catch (err: any) {
        const msg = err.message || "";

        if (
          msg.toLowerCase().includes("already exists") ||
          msg.toLowerCase().includes("duplicate name")
        ) {
          attempt++;
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
    const maxAttempts = 5;

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

        return data;
      } catch (err: any) {
        const msg = err.message || "";

        if (
          msg.toLowerCase().includes("already exists") ||
          msg.toLowerCase().includes("duplicate name")
        ) {
          attempt++;
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

    return newTemplateId;
  }

  // ============================================================
  // EXPORT TAG (WITH TRIGGER MAPPING)
  // ============================================================
  async function exportTag(tag: any, finalTagType: string, triggerMap: any) {
    const mappedFiringTriggers =
      (tag.firingTriggerId || []).map((id: string) => triggerMap[id]) || [];

    const mappedBlockingTriggers =
      (tag.blockingTriggerId || []).map((id: string) => triggerMap[id]) || [];

    const cleanedTag: any = {
      name: tag.name,
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

    return data;
  }

  // ============================================================
  // MAIN EXPORT FUNCTION
  // ============================================================
  async function handleExportTags() {
    if (!selectedAccountId) return toast.warning("Please select an Account");
    if (!selectedContainerId) return toast.warning("Please select a Container");
    if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

    if (!selectedTags || selectedTags.length === 0)
      return toast.warning("No tags selected for export.");

    if (
      !confirm(
        `Are you sure you want to export ${selectedTags.length} tag(s) with triggers/variables/templates?`
      )
    )
      return;

    const failedTags: string[] = [];

    try {
      setExportLoading(true);

      console.log("===========================================");
      console.log(" EXPORT STARTED");
      console.log("Selected Tags:", selectedTags.length);
      console.log("===========================================");

      // Fetch destination triggers + variables
      let destinationTriggers = await fetchDestinationTriggers();
      let destinationVariables = await fetchDestinationVariables();

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
        requiredTriggerIds.has(t.triggerId)
      );

      console.log("Required triggers:", requiredTriggers.length);

      // ============================================================
      // REQUIRED VARIABLES
      // ============================================================
      const requiredVariableNames = new Set<string>();

      for (const tag of selectedTags) {
        if (Array.isArray(tag.parameter)) {
          tag.parameter.forEach((p: any) => {
            if (typeof p?.value === "string" && p.value.includes("{{")) {
              const match = p.value.match(/{{(.*?)}}/);
              if (match?.[1]) requiredVariableNames.add(match[1]);
            }
          });
        }
      }

      const requiredVariables = sourceVariables.filter((v: any) =>
        requiredVariableNames.has(v.name)
      );

      console.log("Required variables:", requiredVariables.length);

      // ============================================================
      // EXPORT VARIABLES (ONLY MISSING)
      // ============================================================
      const missingVariables = requiredVariables.filter((v: any) => {
        return !destinationVariables.some((dv: any) => dv.name === v.name);
      });

      if (missingVariables.length > 0) {
        const confirmVar = confirm(
          `Missing ${missingVariables.length} variable(s). Export them?`
        );

        if (confirmVar) {
          for (const v of missingVariables) {
            try {
              console.log("Exporting variable:", v.name);
              await exportVariable(v);
            } catch (err) {
              console.log(" Variable export failed:", v.name, err);
            }
          }

          destinationVariables = await fetchDestinationVariables();
        }
      }

      // ============================================================
      // EXPORT TRIGGERS + CREATE TRIGGER MAP
      // ============================================================
      const triggerMap: Record<string, string> = {};

      for (const t of requiredTriggers) {
        const destTrigger = destinationTriggers.find(
          (dt: any) => dt.name === t.name
        );

        if (destTrigger) {
          triggerMap[t.triggerId] = destTrigger.triggerId;
        } else {
          try {
            console.log("Exporting trigger:", t.name);
            const created = await exportTrigger(t);

            if (created?.trigger?.triggerId) {
              triggerMap[t.triggerId] = created.trigger.triggerId;
            }
          } catch (err) {
            console.log(" Trigger export failed:", t.name, err);
          }
        }
      }

      destinationTriggers = await fetchDestinationTriggers();

      // fallback map refresh
      for (const t of requiredTriggers) {
        if (!triggerMap[t.triggerId]) {
          const destTrigger = destinationTriggers.find(
            (dt: any) => dt.name === t.name
          );
          if (destTrigger) {
            triggerMap[t.triggerId] = destTrigger.triggerId;
          }
        }
      }

      console.log("Trigger map created:", Object.keys(triggerMap).length);

      // ============================================================
      // EXPORT REQUIRED TEMPLATES WITH CACHE
      // ============================================================
      const templateMap: Record<string, string> = {};

      for (const tag of selectedTags) {
        const templateId = getTemplateIdFromTagType(tag.type);
        if (!templateId) continue;

        if (templateMap[templateId]) continue;

        try {
          console.log("Exporting template:", templateId);
          const newTemplateId = await exportTemplate(templateId);
          templateMap[templateId] = newTemplateId;
        } catch (err) {
          console.log(" Template export failed:", templateId, err);
        }
      }

      console.log("Template map created:", templateMap);

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

      // export config first
      for (const tag of ga4ConfigTags) {
        try {
          console.log("Exporting GA4 Config:", tag.name);
          await exportTag(tag, tag.type, triggerMap);
        } catch (err: any) {
          console.log(" GA4 Config export failed:", tag.name, err);
          failedTags.push(tag.name);
        }
      }

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

      // export event tags
      for (const tag of ga4EventTags) {
        try {
          console.log("Exporting GA4 Event:", tag.name);

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
          console.log(" GA4 Event export failed:", tag.name, err);
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
            }
          }

          console.log("Exporting tag:", tag.name);
          await exportTag(tag, finalTagType, triggerMap);
        } catch (err) {
          console.log(" Tag export failed:", tag.name, err);
          failedTags.push(tag.name);
        }
      }

      if (failedTags.length > 0) {
        toast.warning(
          `Export completed with failures. Failed tags: ${failedTags.join(", ")}`
        );
        return;
      }

      toast.success("Tags exported successfully with triggers & variables!");
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Export Tags (Full Export)
          </h2>

          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-90">
          {/* LEFT */}
          <div className="col-span-5 border-r bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Selected Tags ({selectedTags.length})
            </p>

            <div className="bg-white border rounded-xl overflow-y-auto max-h-80">
              {selectedTags.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">No tags selected.</p>
              ) : (
                selectedTags.map((tag: any) => (
                  <div
                    key={tag.tagId}
                    className="px-4 py-3 border-b last:border-none"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {tag.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Type: {tag.type} | ID: {tag.tagId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-7 p-6">
            <h3 className="text-md font-bold text-gray-900 mb-5">
              Select Destination
            </h3>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc: any) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Container
            </label>
            <select
              value={selectedContainerId}
              onChange={(e) => setSelectedContainerId(e.target.value)}
              disabled={!selectedAccountId || loadingContainers}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Container --</option>
              {containers.map((c: any) => (
                <option key={c.containerId} value={c.containerId}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mt-5 mb-2">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={!selectedContainerId || loadingWorkspaces}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
          >
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
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {exportLoading ? "Exporting..." : "Export Full Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { useEffect, useState } from "react";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { toast } from "react-toastify";

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

//   // --------------------------------------
//   // HELPERS
//   // --------------------------------------
//   const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

//   async function fetchWithRetry(url: string, options: any, retries = 6) {
//     let delay = 2000;

//     for (let i = 0; i < retries; i++) {
//       const res = await fetch(url, options);
//       const data = await res.json();

//       if (res.ok) return { res, data };

//       const msg =
//         data?.details?.error?.message || data?.error || data?.message || "";

//       // ✅ Retry only for quota errors
//       if (res.status === 429 || msg.toLowerCase().includes("quota exceeded")) {
//         console.log(`Rate limited. Retrying after ${delay / 1000}s...`);
//         await sleep(delay);
//         delay *= 2;
//         continue;
//       }

//       throw new Error(msg || "Request failed");
//     }

//     throw new Error("Rate limit exceeded. Try again after 1 minute.");
//   }

//   // --------------------------------------
//   // FETCH ACCOUNTS WHEN MODAL OPENS
//   // --------------------------------------
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

//   // --------------------------------------
//   // FETCH CONTAINERS WHEN ACCOUNT SELECTED
//   // --------------------------------------
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

//   // --------------------------------------
//   // FETCH WORKSPACES WHEN CONTAINER SELECTED
//   // --------------------------------------
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

//   // --------------------------------------
//   // EXPORT TAGS FUNCTION
//   // --------------------------------------
//   async function handleExportTags() {
//     if (!selectedAccountId) return toast.warning("Please select an Account");
//     if (!selectedContainerId) return toast.warning("Please select a Container");
//     if (!selectedWorkspaceId) return toast.warning("Please select a Workspace");

//     if (!selectedTags || selectedTags.length === 0)
//       return toast.warning("No tags selected for export.");

//     if (
//       !confirm(
//         `Are you sure you want to export ${selectedTags.length} tag(s) to selected workspace?`
//       )
//     )
//       return;

//     const failedTags: string[] = [];

//     try {
//       setExportLoading(true);

//       for (const tag of selectedTags) {
//         try {
//           let finalTagType = tag.type;

//           // --------------------------------------------------
//           // IF TAG TYPE HAS CVT TEMPLATE => EXPORT TEMPLATE FIRST
//           // --------------------------------------------------
//           if (tag.type?.includes("cvt_")) {
//             const parts = tag.type.split("_");
//             const templateId = parts[parts.length - 1];

//             const sourceAccountId = store.selectedAccountId;
//             const sourceContainerId = store.selectedContainerId;
//             const sourceWorkspaceId = store.selectedWorkspaceId;

//             const fetchTemplateRes = await fetch(
//               `/api/auth/gtm/templates/export?accountId=${sourceAccountId}&containerId=${sourceContainerId}&workspaceId=${sourceWorkspaceId}&templateId=${templateId}`
//             );

//             const fetchTemplateData = await fetchTemplateRes.json();

//             if (!fetchTemplateRes.ok) {
//               throw new Error(
//                 fetchTemplateData?.error || "Failed to fetch template"
//               );
//             }

//             const sourceTemplate = fetchTemplateData.template;

//             if (!sourceTemplate) {
//               throw new Error("Template not found in source workspace");
//             }

//             // CREATE TEMPLATE WITH RETRY
//             const { data: createTemplateData } = await fetchWithRetry(
//               "/api/auth/gtm/templates",
//               //C:\Users\Admin\Desktop\GTM_Tools\gtm-tools-app\app\api\auth\gtm\templates\export\route.ts
//               {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                   accountId: selectedAccountId,
//                   containerId: selectedContainerId,
//                   workspaceId: selectedWorkspaceId,
//                   template: {
//                     name: sourceTemplate.name,
//                     templateData: sourceTemplate.templateData,
//                   },
//                 }),
//               }
//             );

//             const newTemplateId = createTemplateData?.template?.templateId;

//             if (!newTemplateId) {
//               throw new Error("New templateId missing after template creation");
//             }

//             finalTagType = `cvt_${selectedContainerId}_${newTemplateId}`;
//           }

//           // --------------------------------------------------
//           // EXPORT TAG WITH DUPLICATE NAME RETRY
//           // --------------------------------------------------
//           let exportSuccess = false;
//           let attempt = 0;
//           const maxAttempts = 5;

//           while (!exportSuccess && attempt < maxAttempts) {
//             const updatedName =
//               attempt === 0 ? tag.name : `${tag.name}_${attempt}`;

//             const cleanedTag = {
//               name: updatedName,
//               type: finalTagType,
//               parameter: tag.parameter || [],
//             };

//             try {
//               await fetchWithRetry("/api/auth/gtm/tags", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                   accountId: selectedAccountId,
//                   containerId: selectedContainerId,
//                   workspaceId: selectedWorkspaceId,
//                   tag: cleanedTag,
//                 }),
//               });

//               exportSuccess = true;
//             } catch (err: any) {
//               const msg = err.message || "";

//               if (
//                 msg.toLowerCase().includes("already exists") ||
//                 msg.toLowerCase().includes("duplicate name")
//               ) {
//                 attempt++;
//                 continue;
//               }

//               throw err;
//             }
//           }

//           if (!exportSuccess) {
//             throw new Error("Failed after retries (duplicate name issue)");
//           }
//         } catch (err: any) {
//           console.log("Tag export failed:", tag?.name, err);
//           failedTags.push(tag?.name || "Unknown Tag");
//           continue;
//         }
//       }

//       if (failedTags.length > 0) {
//         toast.warning(
//           `Export finished with failures. Failed: ${failedTags.join(", ")}`
//         );
//         return;
//       }

//       toast.success("Tags exported successfully!");
//       store.setSelectedTagId("");
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
//       <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
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

