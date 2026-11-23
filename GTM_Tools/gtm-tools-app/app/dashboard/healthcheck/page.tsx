"use client";

import {
  CheckCircle,
  ShieldCheck,
  Zap,
  BarChart3,
  FileText,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createPortal } from "react-dom";
import {
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";

import type { AffectedItem, HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";


type HealthCheckCounts = { tags: number; triggers: number; variables: number };
type GtmResourceType = "tags" | "triggers" | "variables";
type GtmSelection = {
  accountId?: string | null;
  containerId?: string | null;
  workspaceId?: string | null;
};
type GtmAffectedItem = AffectedItem & {
  path?: string;
  detail?: string;
  editUrl?: string;
  tagId?: string | number;
  triggerId?: string | number;
  variableId?: string | number;
};
type HealthCheckAsset = {
  item: GtmAffectedItem;
  resourceType: GtmResourceType;
  id: string | null;
};
type HealthCheckFixHandler = (
  rule: HealthCheckResult,
  selectedAssets?: HealthCheckAsset[]
) => Promise<string>;

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  counts?: HealthCheckCounts;
  results: HealthCheckResult[];
};

type HealthCheckApiResponse = {
  success?: boolean;
  healthReport?: unknown;
  report?: unknown;
  results?: HealthCheckResult[];
  score?: number;
  scoreReliable?: boolean;
  scoreLabel?: string;
  passedCount?: number;
  failedCount?: number;
  counts?: {
    tags?: number;
    triggers?: number;
    variables?: number;
  };
  warnings?: string[];
  error?: string;
  details?: string;
};

/* =====================================================
   HELPERS
===================================================== */

function normalizeHealthReport(
  data: HealthCheckApiResponse | null | undefined
): HealthCheckReport | null {
  if (!data) return null;

  const candidate =
    data.healthReport ??
    data.report ??
    data;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const value = candidate as Partial<HealthCheckApiResponse> & Partial<HealthCheckReport>;

  // Accept both nested and top-level results.
  const results = Array.isArray(value.results)
    ? value.results
    : Array.isArray(data.results)
      ? data.results
      : [];

  if (!Array.isArray(results)) return null;

  return {
    score: Number(value.score ?? data.score ?? 0),

    passedCount: Number(
      value.passedCount ??
      data.passedCount ??
      results.filter((r: HealthCheckResult) => r?.passed === true).length
    ),

    failedCount: Number(
      value.failedCount ??
      data.failedCount ??
      results.filter((r:  HealthCheckResult) => r?.passed === false).length
    ),

    counts: value.counts ?? data.counts
      ? {
        tags: Number(
          value.counts?.tags ?? data.counts?.tags ?? 0
        ),
        triggers: Number(
          value.counts?.triggers ?? data.counts?.triggers ?? 0
        ),
        variables: Number(
          value.counts?.variables ?? data.counts?.variables ?? 0
        ),
      }
      : undefined,

    results,
  };
}

/** Every affected / unused item attached to one check. */
function allAffected(r?: HealthCheckResult | null): AffectedItem[] {
  if (!r) return [];
  return [
    ...(r.affectedTags ?? []),
    ...(r.affectedTriggers ?? []),
    ...(r.affectedVariables ?? []),
    ...(r.unusedTags ?? []),
    ...(r.unusedTriggers ?? []),
    ...(r.unusedVariables ?? []),
  ];
}

function getRuleAffectedAssets(
  result: HealthCheckResult
): HealthCheckAsset[] {
  const groups: { items: GtmAffectedItem[]; resourceType: GtmResourceType }[] = [
    {
      items: [
        ...(result.affectedTags ?? []),
        ...(result.unusedTags ?? []),
        ...(result.pausedTags ?? []),
      ],
      resourceType: "tags",
    },
    {
      items: [
        ...(result.affectedTriggers ?? []),
        ...(result.unusedTriggers ?? []),
      ],
      resourceType: "triggers",
    },
    {
      items: [
        ...(result.affectedVariables ?? []),
        ...(result.unusedVariables ?? []),
      ],
      resourceType: "variables",
    },
  ];

  const seen = new Set<string>();
  return groups.flatMap(({ items, resourceType }) =>
    items.map((item) => {
      const id = getGtmResourceId(item, resourceType);
      return { item, resourceType, id };
    }).filter(({ item, id }) => {
      const key = `${resourceType}:${id ?? itemName(item)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  );
}

function affectedItemCount(result: HealthCheckResult): number {
  return allAffected(result).length;
}

function rowHasDetail(result: HealthCheckResult): boolean {
  return Boolean(
    result.recommendation ||
    result.description ||
    affectedItemCount(result) > 0
  );
}




async function fetchReport(ids: { accountId: string; containerId: string; workspaceId: string }): Promise<HealthCheckReport> {
  const res = await fetch("/api/auth/healthcheck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  const data = (await res.json().catch(() => null)) as HealthCheckApiResponse | null;

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || `HealthCheck request failed (${res.status}).`);
  }
  const normalized = normalizeHealthReport(data);
  if (!normalized) throw new Error("HealthCheck API returned an invalid report.");
  return normalized;
}

function getSelectedIds() {
  const s = useDashboardStore.getState();
  if (!s.selectedAccountId || !s.selectedContainerId || !s.selectedWorkspaceId) return null;
  return { accountId: s.selectedAccountId, containerId: s.selectedContainerId, workspaceId: s.selectedWorkspaceId };
}

/* =====================================================
   PAGE
===================================================== */

export default function HealthCheckPage() {
  const store = useDashboardStore();

  const [loading, setLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [report, setReport] = useState<HealthCheckReport | null>(null);
  const [claudeNotice, setClaudeNotice] = useState<string | null>(null);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  /* ---------- RUN FUNCTIONAL HEALTH CHECK ---------- */

  /* ---------- RUN FUNCTIONAL HEALTH CHECK ---------- */

  const handleRunHealthCheck = async () => {
    setClaudeError(null);
    setClaudeNotice(null);

    const ids = getSelectedIds();
    if (!ids) {
      setPageError("Select an account, container, and workspace first.");
      return;
    }

    try {
      setLoading(true);
      const normalized = await fetchReport(ids);
      setReport(normalized);

      /* A fresh scan means the previous Claude prompt notice may be out of date. */
      setClaudeNotice(null);
      setClaudeError(null);

    } catch (error) {
      console.error("[HealthCheck] Run failed:", error);

      setClaudeError(
        error instanceof Error
          ? error.message
          : "Something went wrong while running HealthCheck."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- OPEN AUDIT IN CLAUDE.AI (NO API KEY REQUIRED) ---------- */

  const buildClaudeAuditPrompt = (currentReport: HealthCheckReport) => {
    const failed = currentReport.results.filter((rule) => !rule.passed);
    const passed = currentReport.results.filter((rule) => rule.passed);

    return [
      "You are a senior Google Tag Manager (GTM) implementation and analytics auditor.",
      "Analyze the actual rule-based HealthCheck report below. Do not invent tags, triggers, variables, issues, or metrics that are not present in the supplied data.",
      "Prioritize critical/high-severity issues, explain business and measurement impact, and provide specific step-by-step remediation guidance.",
      "For every failed rule, explain why it matters, identify the affected assets, and give a safe fix. Distinguish confirmed findings from recommendations or items that need manual validation.",
      "Do not claim to access or modify the user's Google Tag Manager account. Do not recommend publishing without Preview Mode validation.",
      "Return a structured audit with: Executive Summary, Overall Score, Critical/High Findings, Medium/Low Findings, Rule-by-Rule Analysis, Prioritized Fix Plan, Validation Checklist, and Final Recommendations.",
      "\nHEALTHCHECK SUMMARY",
      JSON.stringify({
        score: currentReport.score,
        passedCount: currentReport.passedCount,
        failedCount: currentReport.failedCount,
        counts: currentReport.counts ?? null,
        totalRules: currentReport.results.length,
      }, null, 2),
      "\nFAILED RULES (PRIMARY AUDIT INPUT)",
      JSON.stringify(failed, null, 2),
      "\nPASSED RULES (CONTEXT; DO NOT REPORT THESE AS ISSUES)",
      JSON.stringify(passed, null, 2),
      "\nFULL REPORT DATA",
      JSON.stringify(currentReport, null, 2),
    ].join("\n\n");
  };

  const copyPromptAndOpenClaude = async (prompt: string, claudeTab: Window | null) => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch (error) {
      console.warn("Clipboard permission unavailable:", error);
    }

    if (claudeTab) {
      claudeTab.location.href = "https://claude.ai/new";
      claudeTab.focus();
    } else {
      window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
    }

    setClaudeNotice(
      copied
        ? "Audit prompt copied. Claude.ai opened in a new tab — paste the prompt into Claude to review your audit."
        : "Claude.ai opened in a new tab, but the browser blocked clipboard access. Copy the audit prompt manually if needed."
    );
  };

  const handleClaudeHealthCheck = async () => {
    if (claudeLoading || !store.selectedWorkspaceId) return;

    // Open synchronously during the click so popup blockers do not block the tab.
    const claudeTab = window.open("about:blank", "_blank");
    setClaudeLoading(true);
    setClaudeError(null);
    setClaudeNotice(null);

    try {
      const ids = getSelectedIds();
      if (!ids) throw new Error("Select an account, container, and workspace before opening the audit.");
      const currentReport = report ?? await fetchReport(ids);
      if (!report) setReport(currentReport);
      await copyPromptAndOpenClaude(buildClaudeAuditPrompt(currentReport), claudeTab);
    } catch (error) {
      if (claudeTab) claudeTab.close();
      setClaudeError(error instanceof Error ? error.message : "Could not prepare the Claude audit prompt.");
    } finally {
      setClaudeLoading(false);
    }
  };

  const handleFixWithAI = async (
    rule: HealthCheckResult,
    selectedAssets?: HealthCheckAsset[]
  ): Promise<string> => {
    // Open the tab before any async GTM fetch to avoid popup blockers.
    const claudeTab = window.open("about:blank", "_blank");
    if (!report) {
      if (claudeTab) claudeTab.close();
      throw new Error("Run the health check before requesting an AI fix.");
    }

    const isCustomHtmlTryCatchRule = rule.id === "HC_HR_005";
    let prompt: string;

    if (isCustomHtmlTryCatchRule) {
      const selectedTags = (selectedAssets ?? []).filter(
        (asset) => asset.resourceType === "tags"
      );
      if (selectedTags.length === 0) {
        if (claudeTab) claudeTab.close();
        throw new Error("Select at least one affected Custom HTML tag first.");
      }

      const { selectedAccountId, selectedContainerId, selectedWorkspaceId } =
        useDashboardStore.getState();
      if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId) {
        if (claudeTab) claudeTab.close();
        throw new Error("Select an account, container, and workspace first.");
      }

      const query = new URLSearchParams({
        accountId: selectedAccountId,
        containerId: selectedContainerId,
        workspaceId: selectedWorkspaceId,
      });
      const tagsResponse = await fetch(`/api/auth/gtm/tags?${query}`);
      const tagsData = (await tagsResponse.json().catch(() => null)) as
        | { tag?: unknown; error?: string }
        | null;
      if (!tagsResponse.ok || !Array.isArray(tagsData?.tag)) {
        if (claudeTab) claudeTab.close();
        throw new Error(
          tagsData?.error || "Could not load Custom HTML from this GTM workspace."
        );
      }

      const workspaceTags = tagsData.tag.filter(
        (tag): tag is GtmAffectedItem & {
          type?: unknown;
          parameter?: unknown;
        } =>
          typeof tag === "object" &&
          tag !== null &&
          !Array.isArray(tag) &&
          "name" in tag &&
          typeof tag.name === "string"
      );
      const htmlSources = selectedTags.map((asset) => {
        const matchedTag = workspaceTags.find((tag) => {
          if (tag.type !== "html") return false;
          const tagId = getGtmResourceId(tag, "tags");
          return asset.id
            ? tagId === asset.id
            : tag.name === itemName(asset.item);
        });
        if (!matchedTag) {
          if (claudeTab) claudeTab.close();
          throw new Error(
            `Could not find the selected Custom HTML tag "${itemName(asset.item)}" in the current workspace.`
          );
        }

        const parameters = Array.isArray(matchedTag.parameter)
          ? matchedTag.parameter
          : [];
        const htmlParameter = parameters.find(
          (parameter) =>
            typeof parameter === "object" &&
            parameter !== null &&
            "key" in parameter &&
            parameter.key === "html"
        );
        const html =
          typeof htmlParameter === "object" &&
          htmlParameter !== null &&
          "value" in htmlParameter &&
          typeof htmlParameter.value === "string"
            ? htmlParameter.value
            : "";
        if (!html.trim()) {
          if (claudeTab) claudeTab.close();
          throw new Error(
            `The selected tag "${itemName(asset.item)}" has no Custom HTML code.`
          );
        }
        return { name: itemName(asset.item), html };
      });

      prompt = [
        "Fix the selected Google Tag Manager Custom HTML code by adding safe, appropriate try/catch handling.",
        "Return the complete corrected HTML for each selected tag, not a diff or general instructions.",
        "Preserve the tag's existing behavior, markup, selectors, URLs, event names, and GTM variables. Do not invent missing business logic.",
        "Wrap executable JavaScript in try/catch without swallowing errors silently; log caught errors with console.error.",
        "Label each output with its exact tag name and provide one fenced html code block per tag. Do not make or claim to make changes to GTM.",
        ...htmlSources.map(
          ({ name, html }, index) =>
            `Selected tag ${index + 1}: ${name}\nCurrent HTML:\n${html}`
        ),
      ].join("\n\n");
    } else {
      prompt = [
        "Suggest a safe, specific way to fix this GTM health-check rule.",
        "Do not make or claim to make changes to the GTM container.",
        `Rule: ${rule.title}`,
        `Description: ${rule.description}`,
        `Rule recommendation: ${rule.recommendation || "None provided."}`,
        `Affected items: ${allAffected(rule).map(itemName).join(", ") || "None listed."}`,
      ].join("\n");
    }

    const completePrompt = [
      "You are a senior Google Tag Manager implementation specialist. Review the following HealthCheck finding and provide a safe, practical remediation.",
      "Do not claim to make changes to the GTM container. Explain any risks and how to validate the change in GTM Preview before publishing.",
      `HealthCheck score: ${report.score}% (${report.passedCount} passed, ${report.failedCount} failed)`,
      `Rule ID: ${rule.id}`,
      `Rule title: ${rule.title}`,
      `Severity: ${rule.severity}`,
      `Description: ${rule.description || "Not provided."}`,
      `Recommendation: ${rule.recommendation || "Not provided."}`,
      `Affected items: ${allAffected(rule).map(itemName).join(", ") || "None listed."}`,
      prompt,
    ].join("\n\n");

    try {
      await copyPromptAndOpenClaude(completePrompt, claudeTab);
    } catch (error) {
      if (claudeTab) claudeTab.close();
      throw error;
    }
    return "The fix prompt has been copied and Claude.ai opened in a new tab. Paste the prompt into Claude to get the suggested fix. No GTM changes have been made.";
  };

  /* ---------- FAILED / PASSED ---------- */

  const failedChecks = report?.results?.filter((r) => !r.passed) ?? [];
  const passedChecks = report?.results?.filter((r) => r.passed) ?? [];

  /* ---------- PDF ---------- */

  const handleDownloadPDF = () => {
    if (!report) return;

    const names = (list?: AffectedItem[]) =>
      list?.map((item) => item.name).filter(Boolean).join(", ") || "-";

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(
      "GTM HealthCheck Report",
      14,
      18
    );

    doc.setFontSize(12);
    doc.text(`Score: ${report.score}%`, 14, 30);
    doc.text(`Passed Checks: ${report.passedCount}`, 14, 38);
    doc.text(`Failed Checks: ${report.failedCount}`, 14, 46);

    let currentY = 60;

    if (failedChecks.length > 0) {
      doc.setFontSize(14);
      doc.text("Failed Checks", 14, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        head: [["ID", "Title", "Severity", "Affected Items"]],
        body: failedChecks.map((r) => [
          r.id,
          r.title,
          r.severity,
          `Tags: ${names(r.affectedTags)}\nTriggers: ${names(r.affectedTriggers)}\nVars: ${names(r.affectedVariables)}`,
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fontSize: 10 },
      });

      currentY =
        ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY || currentY) + 12;
    }

    if (passedChecks.length > 0) {
      doc.setFontSize(14);
      doc.text("Passed Checks", 14, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        head: [["ID", "Title"]],
        body: passedChecks.map((r) => [r.id, r.title]),
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fontSize: 11 },
      });
    }

    doc.save(
      "GTM_HealthCheck_Report.pdf"
    );
  };

  /* ---------- GRADE ---------- */

  const grade = report ? (report.score >= 80 ? "A" : report.score >= 50 ? "B" : "C") : "";

  const verdictColor =
    report && report.score >= 80 ? "var(--success)" : report && report.score >= 50 ? "var(--warn)" : "var(--danger)";

  /* ---------- RENDER ---------- */

  return (
    <div>
      {/* HERO */}

      {!report && (
        <section className="relative max-w-4xl mx-auto py-16 text-center overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="hero-glow" />

          <div className="relative">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent mb-4">GTM HealthCheck</p>

            <h2 className="text-[clamp(34px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-fg">
              Audit your tag manager,
              <br />
              <span className="text-accent accent-glow-text">in seconds</span>.
            </h2>

            <p className="mt-5 text-[15.5px] text-muted max-w-xl mx-auto leading-relaxed">
              Find tracking issues, unused tags, duplicate triggers, broken variables, and performance bottlenecks with a complete container audit.
            </p>

            <div className="mt-9 flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRunHealthCheck}
                disabled={loading || !store.selectedWorkspaceId}
                className="btn-primary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Run HealthCheck
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClaudeHealthCheck}
                disabled={claudeLoading || !store.selectedWorkspaceId}
                className="btn-secondary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claudeLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <ExternalLink size={14} />
                    Open in Claude
                  </>
                )}
              </button>
            </div>

            {!store.selectedWorkspaceId && (
              <p className="mt-4 text-[12.5px] text-(--warn)">Select a workspace before running the audit.</p>
            )}

            {pageError && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">{pageError}</div>
            )}

            {pageError && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">
                {pageError}
              </div>
            )}

            {claudeError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-500">
                      HealthCheck / Claude Error
                    </p>
                    <p className="mt-1 text-sm text-fg">{claudeError}</p>
                  </div>
                </div>
              </div>
            )}

            {claudeNotice && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-(--warn)/25 bg-(--warn)/8 text-(--warn) text-[13px]">{claudeNotice}</div>
            )}

            <div className="mt-12 flex justify-center gap-3 flex-wrap">
              <Badge icon={<CheckCircle size={13} />} label="Secure & fast" />
              <Badge icon={<ShieldCheck size={13} />} label="Workspace-safe" />
              <Badge icon={<Zap size={13} />} label="Automated" />
            </div>
          </div>
        </section>
      )}

      {/* REPORT */}

      {report && (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          {/* REPORT HEADER */}

          <div className="p-6 md:p-7 border-b border-line">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint mb-2">HealthCheck report</p>

                <h2 className="text-[24px] md:text-[28px] font-semibold text-fg tracking-[-0.02em]">Container audit</h2>

                <p className="text-[13px] text-muted mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {report.passedCount} passed
                  </span>

                  <span className="text-faint">·</span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--danger)" />
                    {report.failedCount} failed
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Score</p>

                  <p className="text-[40px] font-semibold text-fg leading-none tracking-[-0.04em] mt-1">
                    {report.score}
                    <span className="text-[18px] text-faint ml-1">%</span>
                  </p>
                </div>

                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-semibold text-[22px] border"
                  style={{
                    background: `color-mix(in srgb, ${verdictColor} 14%, transparent)`,
                    color: verdictColor,
                    borderColor: `color-mix(in srgb, ${verdictColor} 25%, transparent)`,
                  }}
                >
                  {grade}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleRunHealthCheck} disabled={loading} className="btn-secondary py-2! disabled:opacity-50">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing…" : "Refresh"}
              </button>

              <button type="button" onClick={handleClaudeHealthCheck} disabled={claudeLoading} className="btn-secondary py-2! disabled:opacity-50">
                {claudeLoading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                {claudeLoading ? "Preparing…" : "Open in Claude"}
              </button>

              <button type="button" onClick={handleDownloadPDF} className="btn-primary py-2!">
                <Download size={13} />
                Download PDF
              </button>
            </div>

            {pageError && <p className="mt-3 text-[12.5px] text-(--danger)">{pageError}</p>}
            {claudeError && <p className="mt-3 text-[12.5px] text-(--danger)">{claudeError}</p>}
            {claudeNotice && <p className="mt-3 text-[12.5px] text-(--warn)">{claudeNotice}</p>}
          </div>

          {/* BODY */}

          <div className="p-6 md:p-7">
            <CompactHealthCheckSummary
              report={report}
              selection={{
                accountId: store.selectedAccountId,
                containerId: store.selectedContainerId,
                workspaceId: store.selectedWorkspaceId,
              }}
              onDeleted={handleRunHealthCheck}
              onFixWithAI={handleFixWithAI}
            />

            <HealthCheckTable
              results={report.results}
              passedCount={report.passedCount}
              failedCount={report.failedCount}
              selection={{
                accountId: store.selectedAccountId,
                containerId: store.selectedContainerId,
                workspaceId: store.selectedWorkspaceId,
              }}
              onDeleted={handleRunHealthCheck}
              onFixWithAI={handleFixWithAI}
            />

            {/* NOTE */}

            <div className="mt-10 flex items-start gap-3 p-4 rounded-lg border border-line bg-card-hi">
              <AlertTriangle size={15} className="text-(--warn) mt-0.5 shrink-0" />

              <p className="text-[13px] text-muted leading-relaxed">
                <span className="font-medium text-fg">Note:</span> This report is based on best-practice GTM rules and automated scanning. Always validate in
                Preview Mode before publishing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES */}

      {!report && (
        <section className="border-t border-line mt-16 pt-16">
          <div className="text-center mb-10">
            <h3 className="text-[26px] font-semibold text-fg">Why HealthCheck?</h3>

            <p className="text-muted mt-2 max-w-xl mx-auto text-[14.5px]">
              Improve tracking accuracy, reduce container clutter, and optimize tag performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<BarChart3 size={18} />}
              accent="#3b82f6"
              title="Tag performance audit"
              body="Identify slow tags, excessive triggers, and unnecessary execution that impact load time."
            />
            <FeatureCard
              icon={<ShieldCheck size={18} />}
              accent="#10b981"
              title="Tracking validation"
              body="Validate tag firing logic, variable configuration, and ensure correct analytics tracking."
            />
            <FeatureCard
              icon={<FileText size={18} />}
              accent="#f59e0b"
              title="Smart reports"
              body="Structured report with issues, severity levels, and actionable recommendations."
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* =====================================================
   HEALTHCHECK RULES
===================================================== */

const itemName = (item: AffectedItem): string =>
  item?.name || item?.id || "Unnamed";

function getGtmResourceId(
  item: AffectedItem,
  resourceType: GtmResourceType
): string | null {
  if (resourceType === "tags") {
    const tag = item as GtmAffectedItem;
    return tag.tagId != null ? String(tag.tagId) : null;
  }
  if (resourceType === "triggers") {
    const trigger = item as GtmAffectedItem;
    return trigger.triggerId != null ? String(trigger.triggerId) : null;
  }
  const variable = item as GtmAffectedItem;
  return variable.variableId != null ? String(variable.variableId) : null;
}

function RuleTitleWithTooltip({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const tooltip = description || title;
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const showTooltip = (
    event: ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
      top: Math.min(rect.bottom + 8, window.innerHeight - 120),
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{title}</span>
      <button
        type="button"
        aria-label={`Rule details: ${tooltip}`}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltipPosition(null)}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-[10px] font-medium leading-none text-muted hover:text-fg"
      >
        ?
      </button>
      {tooltipPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-100 w-80 max-h-[50vh] overflow-y-auto whitespace-normal wrap-break-word rounded-md border border-line bg-card p-3 text-left text-[13px] leading-5 text-fg shadow-xl"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            {tooltip}
          </span>,
          document.body
        )}
    </span>
  );
}

function CompactHealthCheckSummary({
  report,
  selection,
  onDeleted,
  onFixWithAI,
}: {
  report: HealthCheckReport;
  selection: GtmSelection;
  onDeleted: () => Promise<void>;
  onFixWithAI: HealthCheckFixHandler;
}) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(
    () => new Set()
  );
  const [fixRule, setFixRule] = useState<HealthCheckResult | null>(null);
  const [deleteRule, setDeleteRule] = useState<HealthCheckResult | null>(null);
  const counts = report.counts ?? { tags: 0, triggers: 0, variables: 0 };
  const scanned = [
    { label: "Tags", value: counts.tags },
    { label: "Triggers", value: counts.triggers },
    { label: "Variables", value: counts.variables },
  ];

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-line bg-card-hi">
      <div className="grid grid-cols-3 border-b border-line">
        {scanned.map((box, index) => (
          <div key={box.label} className={`px-4 py-3 ${index > 0 ? "border-l border-line" : ""}`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              {box.label} scanned
            </p>
            <p className="mt-1 text-[22px] font-semibold leading-tight text-fg">
              {box.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-175 text-left">
          <tbody>
            {report.results.map((rule, index) => {
              const items = allAffected(rule);
              const assets = getRuleAffectedAssets(rule);
              const expanded = expandedRules.has(rule.id);

              return (
                <tr key={rule.id} className={index > 0 ? "border-t border-line" : ""}>
                  <td className="w-[30%] px-4 py-2.5 align-top text-[13px] text-fg">
                    <RuleTitleWithTooltip
                      title={rule.title}
                      description={rule.description}
                    />
                  </td>
                  <td className="w-40 whitespace-nowrap px-4 py-2.5 align-top">
                    {!rule.passed && items.length > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 font-mono text-[11.5px] text-(--danger)">
                        {items.length}
                      </span>
                    ) : rule.passed ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-accent">
                        <CheckCircle size={13} />
                        No Issue Found
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 text-[11.5px] text-(--danger)">
                        Review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top text-[12px] text-muted">
                    {items.length > 0 && (
                      <>
                        {items
                          .slice(0, expanded ? items.length : 6)
                          .map(itemName)
                          .join(", ")}
                        {items.length > 6 && (
                          <>
                            {", "}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRules((previous) => {
                                  const next = new Set(previous);
                                  if (expanded) next.delete(rule.id);
                                  else next.add(rule.id);
                                  return next;
                                })
                              }
                              className="text-accent hover:underline"
                              aria-expanded={expanded}
                            >
                              {expanded ? "Show less" : `+${items.length - 6} more`}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                  <td className="w-28 px-4 py-2.5 text-right align-top">
                    {!rule.passed && rule.recommendation && (
                      <button
                        type="button"
                        onClick={() => setFixRule(rule)}
                        className="btn-secondary inline-flex whitespace-nowrap px-3! py-1.5! text-[11.5px]"
                      >
                        Fix this
                      </button>
                    )}
                    {!rule.passed &&
                      !rule.recommendation &&
                      assets.some((asset) => asset.id) && (
                      <button
                        type="button"
                        onClick={() => setDeleteRule(rule)}
                        className="btn-secondary ml-2 inline-flex whitespace-nowrap border-(--danger)/30 px-3! py-1.5! text-[11.5px] text-(--danger)"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {fixRule && (
        <FixThisModal
          rule={fixRule}
          onClose={() => setFixRule(null)}
          onFixWithAI={onFixWithAI}
          selection={selection}
          onDeleted={onDeleted}
        />
      )}
      {deleteRule && (
        <DeleteAffectedItemsModal
          rule={deleteRule}
          selection={selection}
          onClose={() => setDeleteRule(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function FixThisModal({
  rule,
  onClose,
  onFixWithAI,
  selection,
  onDeleted,
}: {
  rule: HealthCheckResult;
  onClose: () => void;
  onFixWithAI: HealthCheckFixHandler;
  selection: GtmSelection;
  onDeleted: () => Promise<void>;
}) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAffectedAssets = getRuleAffectedAssets(rule).length > 0;

  const handleAiFix = async (selectedAssets?: HealthCheckAsset[]) => {
    setLoadingAI(true);
    setError(null);
    try {
      setAiSuggestion(await onFixWithAI(rule, selectedAssets));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate an AI fix."
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const fixWithAIButton = (selectedAssets?: HealthCheckAsset[]) => (
    <button
      type="button"
      onClick={() => void handleAiFix(selectedAssets)}
      disabled={
        loadingAI ||
        (rule.id === "HC_HR_005" &&
          !selectedAssets?.some((asset) => asset.resourceType === "tags"))
      }
      className="btn-primary disabled:opacity-50"
    >
      {loadingAI
        ? "Preparing Claude prompt…"
        : rule.id === "HC_HR_005"
          ? "Open selected HTML in Claude"
          : "Open in Claude"}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="healthcheck-fix-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-card p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="healthcheck-fix-title"
              className="text-[16px] font-semibold text-fg"
            >
              Fix this rule
            </h2>
            <p className="mt-1 text-[13px] text-muted">{rule.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary shrink-0 px-3! py-1.5! text-[11.5px]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-card-hi p-3 text-[13px] leading-relaxed text-fg">
          <span className="font-semibold">Fix:</span>{" "}
          {rule.recommendation || "No specific recommendation is available."}
        </div>

        {hasAffectedAssets ? (
          <DeleteAffectedItemsModal
            rule={rule}
            selection={selection}
            onClose={onClose}
            onDeleted={onDeleted}
            footerAction={(selectedAssets) =>
              fixWithAIButton(selectedAssets)
            }
            embedded
          />
        ) : (
          <div className="mt-4 flex justify-end">{fixWithAIButton()}</div>
        )}

        <p className="mt-2 text-[11.5px] text-muted">
          {rule.id === "HC_HR_005"
            ? "Selected Custom HTML source will be included in a prompt for Claude to generate a try/catch-safe version. GTM will not be changed."
            : "Claude will review the selected finding and suggest a fix. It will not change your GTM container."}
        </p>

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-(--danger)">
            {error}
          </p>
        )}
        {aiSuggestion && (
          <div className="mt-4 rounded-lg border border-accent/20 bg-accent-soft p-3">
            <p className="mb-1 text-[12px] font-semibold text-fg">
              Claude prompt status
            </p>
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">
              {aiSuggestion}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function DeleteAffectedItemsModal({
  rule,
  selection,
  onClose,
  onDeleted,
  embedded = false,
  footerAction,
}: {
  rule: HealthCheckResult;
  selection: GtmSelection;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  embedded?: boolean;
  footerAction?: (selectedAssets: HealthCheckAsset[]) => ReactNode;
}) {
  const assets = getRuleAffectedAssets(rule);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssets = assets.filter(
    (asset) => selected.has(`${asset.resourceType}:${asset.id ?? itemName(asset.item)}`)
  );

  const handleDelete = async () => {
    if (selectedAssets.length === 0) return;
    if (!selection.accountId || !selection.containerId || !selection.workspaceId) {
      setError("Select an account, container, and workspace before deleting.");
      return;
    }

    setDeleting(true);
    setError(null);
    let deletedCount = 0;
    try {
      const inventoryByType = new Map<GtmResourceType, Record<string, unknown>[]>();
      const getInventory = async (resourceType: GtmResourceType) => {
        const cached = inventoryByType.get(resourceType);
        if (cached) return cached;

        const query = new URLSearchParams({
          accountId: selection.accountId!,
          containerId: selection.containerId!,
          workspaceId: selection.workspaceId!,
        });
        const response = await fetch(
          `/api/auth/gtm/${resourceType}?${query}`
        );
        const data = (await response.json().catch(() => null)) as
          | Record<string, unknown>
          | null;
        if (!response.ok || !data) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : `Could not load ${resourceType} from the selected GTM workspace.`
          );
        }

        const listKey =
          resourceType === "tags"
            ? "tag"
            : resourceType === "triggers"
              ? "trigger"
              : "variable";
        const inventory = data[listKey];
        if (!Array.isArray(inventory)) {
          throw new Error(`The GTM ${resourceType} list response was invalid.`);
        }
        const records = inventory.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && !Array.isArray(item)
        );
        inventoryByType.set(resourceType, records);
        return records;
      };

      const resolvedAssets: {
        item: GtmAffectedItem;
        resourceType: GtmResourceType;
        id: string;
      }[] = [];

      for (const asset of selectedAssets) {
        let id = asset.id;
        if (!id) {
          const idField =
            asset.resourceType === "tags"
              ? "tagId"
              : asset.resourceType === "triggers"
                ? "triggerId"
                : "variableId";
          const matches = (await getInventory(asset.resourceType)).filter(
            (record) => record.name === itemName(asset.item)
          );
          const ids = matches
            .map((record) => record[idField])
            .filter(
              (candidate): candidate is string | number =>
                typeof candidate === "string" || typeof candidate === "number"
            )
            .map(String);
          if (ids.length !== 1 || !ids[0]) {
            throw new Error(
              ids.length > 1
                ? `More than one ${asset.resourceType.slice(0, -1)} is named "${itemName(asset.item)}".`
                : `Could not find "${itemName(asset.item)}" in the selected GTM workspace.`
            );
          }
          id = ids[0];
        }

        resolvedAssets.push({ item: asset.item, resourceType: asset.resourceType, id });
      }

      for (const asset of resolvedAssets) {
        const idParam =
          asset.resourceType === "tags"
            ? "tagId"
            : asset.resourceType === "triggers"
              ? "triggerId"
              : "variableId";
        const query = new URLSearchParams({
          accountId: selection.accountId,
          containerId: selection.containerId,
          workspaceId: selection.workspaceId,
          [idParam]: asset.id,
        });
        const response = await fetch(
          `/api/auth/gtm/${asset.resourceType}?${query}`,
          { method: "DELETE" }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          const details =
            data?.details?.error?.message ||
            data?.details?.error_description ||
            data?.details?.message ||
            (typeof data?.details === "string" ? data.details : null);
          throw new Error(
            details
              ? `${data?.error || `Could not delete ${itemName(asset.item)}.`} ${details}`
              : data?.error || `Could not delete ${itemName(asset.item)}.`
          );
        }
        deletedCount += 1;
      }

      await onDeleted();
      onClose();
    } catch (deleteError) {
      if (deletedCount > 0) await onDeleted();
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the selected GTM assets."
      );
    } finally {
      setDeleting(false);
    }
  };

  const assetSelection = (
    <>
      {!embedded && (
        <p className="mt-3 text-[12px] text-(--danger)">
          Select the assets to delete. This changes the GTM workspace.
        </p>
      )}

      <div className={`${embedded ? "mt-3" : "mt-4"} grid grid-cols-1 gap-2 sm:grid-cols-2`}>
        {assets.map((asset) => {
          const key = `${asset.resourceType}:${asset.id ?? itemName(asset.item)}`;
          const checked = selected.has(key);

          return (
            <label
              key={key}
              className="flex items-start gap-2 rounded-md border border-line bg-card-hi p-2.5 text-[12.5px] text-fg"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={deleting}
                onChange={() =>
                  setSelected((previous) => {
                    const next = new Set(previous);
                    if (checked) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1 break-all">
                {itemName(asset.item)}
              </span>
              <span className="shrink-0 text-[10px] uppercase text-muted">
                {asset.resourceType.slice(0, -1)}
              </span>
            </label>
          );
        })}
      </div>

      {selectedAssets.some(
        (asset) => asset.resourceType === "variables"
      ) && (
        <p className="mt-3 text-[12px] text-(--warn)" role="status">
          Deleting a variable may affect attached tags or triggers. Review affected items before continuing.
        </p>
      )}
      {selectedAssets.some(
        (asset) => asset.resourceType === "triggers"
      ) && (
        <p className="mt-3 text-[12px] text-(--warn)" role="status">
          Deleting a trigger may affect attached tags. Review affected items before continuing.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-(--danger)">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {embedded && footerAction?.(selectedAssets)}
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || selectedAssets.length === 0}
          className="btn-primary bg-(--danger)! disabled:opacity-50"
        >
          {deleting ? "Deleting…" : `Delete selected (${selectedAssets.length})`}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="mt-4 border-t border-line pt-4">
        <h3 className="text-[13px] font-semibold text-fg">Affected items</h3>
        {assetSelection}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="healthcheck-delete-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-card p-5 shadow-xl"
      >
        <h2
          id="healthcheck-delete-title"
          className="text-[16px] font-semibold text-fg"
        >
          Delete affected GTM assets
        </h2>
        <p className="mt-1 text-[13px] text-muted">{rule.title}</p>
        {assetSelection}
      </section>
    </div>
  );
}

type TableFilter = "all" | "failed" | "passed";

function HealthCheckTable({
  results,
  passedCount,
  failedCount,
  selection,
  onDeleted,
  onFixWithAI,
}: {
  results: HealthCheckResult[];
  passedCount: number;
  failedCount: number;
  selection: GtmSelection;
  onDeleted: () => Promise<void>;
  onFixWithAI: HealthCheckFixHandler;
}) {
  const [filter, setFilter] = useState<TableFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fixRule, setFixRule] = useState<HealthCheckResult | null>(null);
  const [deleteRule, setDeleteRule] = useState<HealthCheckResult | null>(null);

  const filtered = results.filter((result) => {
    if (filter === "failed") return !result.passed;
    if (filter === "passed") return result.passed;
    return true;
  });

  const toggleRow = (result: HealthCheckResult) => {
    if (!rowHasDetail(result)) return;
    setExpandedId((previous) => (previous === result.id ? null : result.id));
  };

  const tabs: {
    key: TableFilter;
    label: string;
    count: number;
    tone: "neutral" | "danger" | "accent";
  }[] = [
    { key: "all", label: "All", count: results.length, tone: "neutral" },
    { key: "failed", label: "Failed", count: failedCount, tone: "danger" },
    { key: "passed", label: "Passed", count: passedCount, tone: "accent" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          const base =
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors";
          const activeClass =
            tab.tone === "danger"
              ? "border-(--danger)/30 bg-(--danger)/10 text-(--danger)"
              : tab.tone === "accent"
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-edge bg-card-hi text-fg";
          const idleClass =
            "border-line bg-card text-muted hover:border-edge hover:text-fg";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`${base} ${active ? activeClass : idleClass}`}
            >
              {tab.label}
              <span className="font-mono text-[11px] opacity-70">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-card-hi">
                <th className="w-8 px-3 py-2.5" />
                <th className="w-23 px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  ID
                </th>
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Check
                </th>
                <th className="w-27.5 px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Severity
                </th>
                <th className="w-23 px-3 py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Affected
                </th>
                <th className="w-20 px-3 py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Status
                </th>
                <th className="w-40 px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((result) => (
                <FragmentRow
                  key={result.id}
                  result={result}
                  detail={rowHasDetail(result)}
                  expanded={expandedId === result.id}
                  affected={affectedItemCount(result)}
                  onToggle={() => toggleRow(result)}
                  onFix={() => setFixRule(result)}
                  onDelete={() => setDeleteRule(result)}
                />
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[13px] text-muted"
                  >
                    No checks in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-faint">
        Tip: click a row to see the fix and affected items.
      </p>
      {fixRule && (
        <FixThisModal
          rule={fixRule}
          onClose={() => setFixRule(null)}
          onFixWithAI={onFixWithAI}
          selection={selection}
          onDeleted={onDeleted}
        />
      )}
      {deleteRule && (
        <DeleteAffectedItemsModal
          rule={deleteRule}
          selection={selection}
          onClose={() => setDeleteRule(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function FragmentRow({
  result,
  detail,
  expanded,
  affected,
  onToggle,
  onFix,
  onDelete,
}: {
  result: HealthCheckResult;
  detail: boolean;
  expanded: boolean;
  affected: number;
  onToggle: () => void;
  onFix: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-t border-line transition-colors ${detail ? "cursor-pointer hover:bg-card-hi" : ""} ${expanded ? "bg-card-hi" : ""}`}
      >
        <td className="px-3 py-3 align-top">
          {detail ? (
            expanded ? (
              <ChevronDown size={14} className="text-muted" />
            ) : (
              <ChevronRight size={14} className="text-faint" />
            )
          ) : null}
        </td>

        <td className="px-3 py-3 align-top">
          <span className="font-mono text-[11.5px] text-faint">
            {result.id}
          </span>
        </td>

        <td className="px-3 py-3 align-top">
          <RuleTitleWithTooltip
            title={result.title}
            description={result.description}
          />
          {result.description && (
            <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-muted">
              {result.description}
            </p>
          )}
        </td>

        <td className="px-3 py-3 align-top">
          <SeverityBadge severity={result.severity} />
        </td>

        <td className="px-3 py-3 text-center align-top">
          {affected > 0 ? (
            <span className="inline-flex min-w-5.5 items-center justify-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 font-mono text-[11.5px] text-(--danger)">
              {affected}
            </span>
          ) : (
            <span className="text-[12px] text-faint">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-right align-top">
          {!result.passed && (
            <div className="inline-flex items-center gap-2">
              {result.recommendation && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFix();
                  }}
                  className="btn-secondary inline-flex whitespace-nowrap px-3! py-1.5! text-[11.5px]"
                >
                  Fix this
                </button>
              )}
              {!result.recommendation &&
                getRuleAffectedAssets(result).some((asset) => asset.id) && (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  className="btn-secondary inline-flex whitespace-nowrap border-(--danger)/30 px-3! py-1.5! text-[11.5px] text-(--danger)"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </td>

        <td className="px-3 py-3 text-center align-top">
          {result.passed ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
              <CheckCircle size={13} />
              Pass
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-(--danger)">
              <XCircle size={13} />
              Fail
            </span>
          )}
        </td>
      </tr>

      {detail && expanded && (
        <tr className="border-t border-line bg-card-hi">
          <td />
          <td colSpan={6} className="px-3 pb-5 pt-1 align-top">
            {result.description && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
                {result.description}
              </p>
            )}

            {result.recommendation && (
              <div className="mt-3 w-fit max-w-2xl rounded-md border border-(--danger)/20 bg-(--danger)/8 px-3 py-2 text-[12.5px] text-(--danger)">
                <span className="font-semibold">Fix:</span>{" "}
                {result.recommendation}
              </div>
            )}

            <AffectedList label="Affected Tags" items={result.affectedTags} resourceType="tags" />
            <AffectedList label="Affected Triggers" items={result.affectedTriggers} resourceType="triggers" />
            <AffectedList label="Affected Variables" items={result.affectedVariables} resourceType="variables" />
            <AffectedList label="Unused Tags" items={result.unusedTags} resourceType="tags" />
            <AffectedList label="Unused Triggers" items={result.unusedTriggers} resourceType="triggers" />
            <AffectedList label="Unused Variables" items={result.unusedVariables} resourceType="variables" />

            <AffectedList label={result.passed ? "Checked tags — passed" : "Other tags checked — no issue"} items={result.passedTags} resourceType="tags" total={result.passedCounts?.tags} tone="pass" />
            <AffectedList label={result.passed ? "Checked triggers — passed" : "Other triggers checked — no issue"} items={result.passedTriggers} resourceType="triggers" total={result.passedCounts?.triggers} tone="pass" />
            <AffectedList label={result.passed ? "Checked variables — passed" : "Other variables checked — no issue"} items={result.passedVariables} resourceType="variables" total={result.passedCounts?.variables} tone="pass" />
          </td>
        </tr>
      )}
    </>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-line text-[12.5px] text-muted">
      <span className="text-accent">{icon}</span>
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === "HIGH"
      ? "var(--danger)"
      : severity === "MEDIUM"
        ? "var(--warn)"
        : "var(--accent)";

  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.12em]"
      style={{
        background: `color-mix(in srgb, ${tone} 14%, transparent)`,
        color: tone,
        borderColor: `color-mix(in srgb, ${tone} 30%, transparent)`,
      }}
    >
      {severity}
    </span>
  );
}

function AffectedList({
  label,
  items,
  resourceType = "tags",
  total,
  tone = "issue",
}: {
  label: string;
  items?: GtmAffectedItem[];
  resourceType?: GtmResourceType;
  total?: number;
  tone?: "issue" | "pass";
}) {
  const [showAll, setShowAll] = useState(false);
  if (!items || items.length === 0) return null;

  const LIMIT = 12;
  const visibleItems = showAll ? items : items.slice(0, LIMIT);
  const hiddenCount = items.length - visibleItems.length;
  const chip =
    tone === "pass"
      ? "inline-flex items-center rounded-md border border-line bg-card px-2.5 py-1 text-[11.5px] text-fg"
      : "inline-flex items-center rounded-md border border-(--danger)/20 bg-(--danger)/8 px-2.5 py-1 text-[11.5px] text-fg";

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}{typeof total === "number" ? ` (${total})` : ""}
      </h4>

      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item, index) => {
          const content = itemName(item);
          const key = `${getGtmResourceId(item, resourceType) ?? content}-${index}`;
          return item.editUrl ? (
            <a
              key={key}
              href={item.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={`${chip} hover:opacity-80 transition-opacity`}
            >
              {content}
              {item.detail && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">→ {item.detail}</span>}
            </a>
          ) : (
            <span key={key} className={chip}>
              {content}
              {item.detail && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">→ {item.detail}</span>}
            </span>
          );
        })}

        {!showAll && items.length > LIMIT && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAll(true);
            }}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
          >
            Show {items.length - LIMIT} more
          </button>
        )}

        {hiddenCount > 0 && showAll && <span className="px-2 py-1.5 text-xs text-faint">+{hiddenCount} not listed</span>}
      </div>
    </div>
  );
}

function FeatureCard({ icon, accent, title, body }: { icon: ReactNode; accent: string; title: string; body: string }) {
  return (
    <div className="bg-card p-6 rounded-xl border border-line transition-all hover:border-edge hover:bg-card-hi">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
      >
        {icon}
      </div>

      <h4 className="text-[15px] font-semibold text-fg mb-1.5">{title}</h4>

      <p className="text-[13px] text-muted leading-relaxed">{body}</p>
    </div>
  );
}



// "use client";

// import {
//   CheckCircle,
//   ShieldCheck,
//   Zap,
//   BarChart3,
//   FileText,
//   XCircle,
//   AlertTriangle,
//   Download,
//   RefreshCw,
//   Bot,
//   Wrench,
//   ArrowUp,
//   Plus,
//   Loader2,
//   ChevronDown,
//   ChevronRight,
// } from "lucide-react";

// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import { createPortal } from "react-dom";
// import {
//   useRef,
//   useState,
//   type ReactNode,
//   type MouseEvent as ReactMouseEvent,
//   type FocusEvent as ReactFocusEvent,
// } from "react";

// import type { AffectedItem, HealthCheckResult } from "@/lib/healthcheck/types";
// import { useDashboardStore } from "@/app/store/useDashboardStore";
// import { useAnthropicKey } from "@/hooks/useAnthropicKey";
// import { ApiKeyModal, ConnectionBadge } from "@/app/dashboard/components/ApiKeyModal";

// type ChatMessage = { role: "user" | "assistant"; content: string };

// type HealthCheckCounts = { tags: number; triggers: number; variables: number };
// type GtmResourceType = "tags" | "triggers" | "variables";
// type GtmSelection = {
//   accountId?: string | null;
//   containerId?: string | null;
//   workspaceId?: string | null;
// };
// type GtmAffectedItem = AffectedItem & {
//   path?: string;
//   detail?: string;
//   editUrl?: string;
//   tagId?: string | number;
//   triggerId?: string | number;
//   variableId?: string | number;
// };
// type HealthCheckAsset = {
//   item: GtmAffectedItem;
//   resourceType: GtmResourceType;
//   id: string | null;
// };
// type HealthCheckFixHandler = (
//   rule: HealthCheckResult,
//   selectedAssets?: HealthCheckAsset[]
// ) => Promise<string>;

// type HealthCheckReport = {
//   score: number;
//   passedCount: number;
//   failedCount: number;
//   counts?: HealthCheckCounts;
//   results: HealthCheckResult[];
// };

// type HealthCheckApiResponse = {
//   success?: boolean;
//   healthReport?: unknown;
//   report?: unknown;
//   results?: HealthCheckResult[];
//   score?: number;
//   scoreReliable?: boolean;
//   scoreLabel?: string;
//   passedCount?: number;
//   failedCount?: number;
//   counts?: {
//     tags?: number;
//     triggers?: number;
//     variables?: number;
//   };
//   warnings?: string[];
//   error?: string;
//   details?: string;
// };

// type HealthCheckAiResponse = {
//   success?: boolean;
//   code?: string;
//   error?: string;
//   resultText?: string;
//   healthReport?: unknown;
//   truncated?: boolean;
//   fallback?: boolean;
// };

// /* =====================================================
//    HELPERS
// ===================================================== */

// function parseHealthCheckAiResponse(value: unknown): HealthCheckAiResponse | null {
//   if (!value || typeof value !== "object" || Array.isArray(value)) {
//     return null;
//   }

//   const data = value as Record<string, unknown>;
//   return {
//     success: typeof data.success === "boolean" ? data.success : undefined,
//     code: typeof data.code === "string" ? data.code : undefined,
//     error: typeof data.error === "string" ? data.error : undefined,
//     resultText:
//       typeof data.resultText === "string" ? data.resultText : undefined,
//     healthReport: data.healthReport,
//     truncated: typeof data.truncated === "boolean" ? data.truncated : undefined,
//   };
// }

// function normalizeHealthReport(
//   data: HealthCheckApiResponse | null | undefined
// ): HealthCheckReport | null {
//   if (!data) return null;

//   const candidate =
//     data.healthReport ??
//     data.report ??
//     data;

//   if (!candidate || typeof candidate !== "object") {
//     return null;
//   }

//   const value = candidate as Partial<HealthCheckApiResponse> & Partial<HealthCheckReport>;

//   // Accept both nested and top-level results.
//   const results = Array.isArray(value.results)
//     ? value.results
//     : Array.isArray(data.results)
//       ? data.results
//       : [];

//   if (!Array.isArray(results)) return null;

//   return {
//     score: Number(value.score ?? data.score ?? 0),

//     passedCount: Number(
//       value.passedCount ??
//       data.passedCount ??
//       results.filter((r: HealthCheckResult) => r?.passed === true).length
//     ),

//     failedCount: Number(
//       value.failedCount ??
//       data.failedCount ??
//       results.filter((r:  HealthCheckResult) => r?.passed === false).length
//     ),

//     counts: value.counts ?? data.counts
//       ? {
//         tags: Number(
//           value.counts?.tags ?? data.counts?.tags ?? 0
//         ),
//         triggers: Number(
//           value.counts?.triggers ?? data.counts?.triggers ?? 0
//         ),
//         variables: Number(
//           value.counts?.variables ?? data.counts?.variables ?? 0
//         ),
//       }
//       : undefined,

//     results,
//   };
// }

// /** Every affected / unused item attached to one check. */
// function allAffected(r?: HealthCheckResult | null): AffectedItem[] {
//   if (!r) return [];
//   return [
//     ...(r.affectedTags ?? []),
//     ...(r.affectedTriggers ?? []),
//     ...(r.affectedVariables ?? []),
//     ...(r.unusedTags ?? []),
//     ...(r.unusedTriggers ?? []),
//     ...(r.unusedVariables ?? []),
//   ];
// }

// function getRuleAffectedAssets(
//   result: HealthCheckResult
// ): HealthCheckAsset[] {
//   const groups: { items: GtmAffectedItem[]; resourceType: GtmResourceType }[] = [
//     {
//       items: [
//         ...(result.affectedTags ?? []),
//         ...(result.unusedTags ?? []),
//         ...(result.pausedTags ?? []),
//       ],
//       resourceType: "tags",
//     },
//     {
//       items: [
//         ...(result.affectedTriggers ?? []),
//         ...(result.unusedTriggers ?? []),
//       ],
//       resourceType: "triggers",
//     },
//     {
//       items: [
//         ...(result.affectedVariables ?? []),
//         ...(result.unusedVariables ?? []),
//       ],
//       resourceType: "variables",
//     },
//   ];

//   const seen = new Set<string>();
//   return groups.flatMap(({ items, resourceType }) =>
//     items.map((item) => {
//       const id = getGtmResourceId(item, resourceType);
//       return { item, resourceType, id };
//     }).filter(({ item, id }) => {
//       const key = `${resourceType}:${id ?? itemName(item)}`;
//       if (seen.has(key)) return false;
//       seen.add(key);
//       return true;
//     })
//   );
// }

// function affectedItemCount(result: HealthCheckResult): number {
//   return allAffected(result).length;
// }

// function rowHasDetail(result: HealthCheckResult): boolean {
//   return Boolean(
//     result.recommendation ||
//     result.description ||
//     affectedItemCount(result) > 0
//   );
// }




// async function fetchReport(ids: { accountId: string; containerId: string; workspaceId: string }): Promise<HealthCheckReport> {
//   const res = await fetch("/api/auth/healthcheck", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(ids),
//   });
//   const data = (await res.json().catch(() => null)) as HealthCheckApiResponse | null;

//   if (!res.ok || data?.success === false) {
//     throw new Error(data?.error || `HealthCheck request failed (${res.status}).`);
//   }
//   const normalized = normalizeHealthReport(data);
//   if (!normalized) throw new Error("HealthCheck API returned an invalid report.");
//   return normalized;
// }

// function getSelectedIds() {
//   const s = useDashboardStore.getState();
//   if (!s.selectedAccountId || !s.selectedContainerId || !s.selectedWorkspaceId) return null;
//   return { accountId: s.selectedAccountId, containerId: s.selectedContainerId, workspaceId: s.selectedWorkspaceId };
// }

// function keyNoticeFromCode(code?: string, fallback?: string) {
//   switch (code) {
//     case "invalid_key":
//       return "Your API key is invalid or expired. Please enter a new one.";
//     case "quota":
//       return "This key has run out of credits. Add credits in the Anthropic console or enter a different key.";
//     case "rate_limit":
//       return "This key hit its rate limit. Wait a moment or connect a different key.";
//     case "no_key":
//       return "Please connect an Anthropic API key to use the AI audit.";
//     default:
//       return fallback || "Please reconnect your Anthropic API key.";
//   }
// }

// /* =====================================================
//    PAGE
// ===================================================== */

// export default function HealthCheckPage() {
//   const store = useDashboardStore();

//   const [loading, setLoading] = useState(false);
//   const [claudeLoading, setClaudeLoading] = useState(false);
//   const [report, setReport] = useState<HealthCheckReport | null>(null);
//   const [claudeText, setClaudeText] = useState<string | null>(null);
//   const [claudeTruncated, setClaudeTruncated] = useState(false);
//   const [claudeError, setClaudeError] = useState<string | null>(null);
//   const [claudeNotice, setClaudeNotice] = useState<string | null>(null);
//   const [pageError, setPageError] = useState<string | null>(null);
//   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
//   const [chatInput, setChatInput] = useState("");
//   const [chatSending, setChatSending] = useState(false);

//   /* The user's own Anthropic token: stored encrypted in this browser only, sent with each AI request. */
//   const anthropic = useAnthropicKey();
//   const anthropicCompat = anthropic as typeof anthropic & {
//     getKey?: () => Promise<string | null>;
//     markDisconnected?: () => void;
//   };
//   const [keyModalOpen, setKeyModalOpen] = useState(false);
//   const [keyModalNotice, setKeyModalNotice] = useState<string | null>(null);
//   const pendingRunRef = useRef(false); // true while an audit waits for the user to connect a token
//   const hasKey = anthropic.status !== "no_key" && anthropic.status !== "unknown";

//   const canRun = Boolean(store.selectedWorkspaceId);

//   /* Prevents two chat requests when Enter + click happen together. */
//   const chatRequestLock = useRef(false);

//   /* ---------- RUN FUNCTIONAL HEALTH CHECK ---------- */

//   /* ---------- RUN FUNCTIONAL HEALTH CHECK ---------- */

//   const handleRunHealthCheck = async () => {
//     setClaudeError(null);
//     setClaudeNotice(null);

//     const ids = getSelectedIds();
//     if (!ids) {
//       setPageError("Select an account, container, and workspace first.");
//       return;
//     }

//     try {
//       setLoading(true);
//       const normalized = await fetchReport(ids);
//       setReport(normalized);

//       /* A fresh scan means the previous Claude audit may be out of date. */
//       setClaudeText(null);
//       setClaudeTruncated(false);
//       setChatMessages([]);
//       setClaudeError(null);

//     } catch (error) {
//       console.error("[HealthCheck] Run failed:", error);

//       setClaudeError(
//         error instanceof Error
//           ? error.message
//           : "Something went wrong while running HealthCheck."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ---------- CLAUDE AI AUDIT (uses the token the user pasted) ---------- */

//   const handleClaudeHealthCheck = async () => {
//     if (claudeLoading || !store.selectedWorkspaceId) return;

//     const ready = anthropic.status === "connected" || (await anthropic.verify());

//     if (!ready) {
//       setKeyModalNotice("Connect your Anthropic API key to run the Claude AI Audit.");
//       setKeyModalOpen(true);
//       return;
//     }

//     await runClaudeAudit();
//   };

//   const runClaudeAudit = async () => {
//     setClaudeError(null);
//     setClaudeNotice(null);
//     setPageError(null);

//     const ids = getSelectedIds();
//     if (!ids) {
//       setClaudeError("Select an account, container, and workspace before running the audit.");
//       return;
//     }

//     /* 1) Make sure a working token exists; otherwise ask for it and continue afterwards. */
//     let activeKey = await anthropicCompat.getKey?.();
//     if (!activeKey) {
//       pendingRunRef.current = true;
//       setKeyModalNotice(keyNoticeFromCode("no_key"));
//       setKeyModalOpen(true);
//       return;
//     }

//     if (anthropic.status !== "connected") {
//       const ok = await anthropic.verify();
//       if (!ok) {
//         pendingRunRef.current = true;
//         setKeyModalNotice("Please connect a valid Anthropic API key to run the AI audit.");
//         setKeyModalOpen(true);
//         return;
//       }
//       activeKey = (await anthropicCompat.getKey?.()) ?? activeKey;
//     }

//     try {
//       setClaudeLoading(true);
//       setChatMessages([]);

//       /* 2) Send the IDs (and the report we already have) together with the token. */
//       const aiRes = await fetch("/api/auth/healthcheck/ai", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", "x-anthropic-key": activeKey },
//         body: JSON.stringify({ ...ids, ...(report ? { healthReport: report } : {}) }),
//       });

//       const aiData = (await aiRes.json().catch(() => null)) as any;

//       if (!aiRes.ok || !aiData?.success) {
//         /* Token problems reopen the popup instead of showing a raw error. */
//         if (aiData?.code && ["no_key", "invalid_key", "quota", "rate_limit"].includes(aiData.code)) {
//           if (aiData.code === "invalid_key" || aiData.code === "quota") anthropic.disconnect();
//           else anthropicCompat.markDisconnected?.();

//           pendingRunRef.current = false;
//           setKeyModalNotice(keyNoticeFromCode(aiData.code, aiData.error));
//           setKeyModalOpen(true);
//           setClaudeError(keyNoticeFromCode(aiData.code, aiData.error));
//           return;
//         }
//         throw new Error(aiData?.error || `AI audit failed (${aiRes.status}).`);
//       }

//       const text = String(aiData.resultText ?? "").trim();
//       if (!text) throw new Error("Claude returned an empty audit response.");

//       const fresh = normalizeHealthReport({ healthReport: aiData.healthReport });
//       if (fresh) setReport(fresh);
//       else if (!report) setReport(await fetchReport(ids));

//       setClaudeText(text);
//       setClaudeTruncated(Boolean(aiData.truncated));
//     } catch (error) {
//       console.error("Claude AI Audit Error:", error);
//       setClaudeError(error instanceof Error ? error.message : "Unable to run Claude AI Audit.");
//     } finally {
//       setClaudeLoading(false);
//     }
//   };

//   /* Called by the popup after the user pastes a token; resumes the audit that was waiting. */
//   const handleConnectKey = async (key: string) => {
//     const res = await anthropic.connect(key);
//     if (res.ok && pendingRunRef.current) {
//       pendingRunRef.current = false;
//       setKeyModalOpen(false);
//       setTimeout(() => {
//         void handleClaudeHealthCheck();
//       }, 0);
//     }
//     return res;
//   };

//   const openKeyManager = () => {
//     setKeyModalNotice(null);
//     setKeyModalOpen(true);
//   };

//   /* ---------- CHAT WITH CLAUDE ---------- */

//   const handleSendChatMessage = async () => {
//     const text = chatInput.trim();
//     if (!text || chatSending || chatRequestLock.current || !report) return;

//     chatRequestLock.current = true;

//     const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
//     setChatMessages(nextMessages);
//     setChatInput("");
//     setChatSending(true);

//     try {
//       const chatKey = await anthropicCompat.getKey?.();
//       if (!chatKey) {
//         setChatMessages([...nextMessages, { role: "assistant", content: "Please connect your Anthropic API key first." }]);
//         setKeyModalNotice(keyNoticeFromCode("no_key"));
//         setKeyModalOpen(true);
//         return;
//       }

//       const res = await fetch("/api/auth/healthcheck/chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", "x-anthropic-key": chatKey },
//         body: JSON.stringify({ healthReport: report, claudeText, messages: nextMessages }),
//       });

//       const data = await res.json().catch(() => null);

//       if (data?.code === "no_key" || data?.code === "invalid_key") {
//         anthropic.markNoKey();
//         setKeyModalNotice("Your API key is no longer connected. Enter a key, then send your message again.");
//         setKeyModalOpen(true);
//       }

//       if (!res.ok || !data?.success) {
//         throw new Error(data?.error || `Chat request failed (${res.status}).`);
//       }

//       const reply = typeof data.reply === "string" ? data.reply.trim() : "";
//       if (!reply) throw new Error("Claude returned an empty reply.");

//       setChatMessages([...nextMessages, { role: "assistant", content: reply }]);
//     } catch (error) {
//       console.error("Claude Chat Error:", error);
//       setChatMessages([
//         ...nextMessages,
//         {
//           role: "assistant",
//           content: error instanceof Error ? `Sorry, something went wrong: ${error.message}` : "Sorry, something went wrong while contacting Claude.",
//         },
//       ]);
//     } finally {
//       setChatSending(false);
//       chatRequestLock.current = false;
//     }
//   };

//   const handleFixWithAI = async (
//     rule: HealthCheckResult,
//     selectedAssets?: HealthCheckAsset[]
//   ): Promise<string> => {
//     if (!report) throw new Error("Run the health check before requesting an AI fix.");

//     const isCustomHtmlTryCatchRule = rule.id === "HC_HR_005";
//     let prompt: string;

//     if (isCustomHtmlTryCatchRule) {
//       const selectedTags = (selectedAssets ?? []).filter(
//         (asset) => asset.resourceType === "tags"
//       );
//       if (selectedTags.length === 0) {
//         throw new Error("Select at least one affected Custom HTML tag first.");
//       }

//       const { selectedAccountId, selectedContainerId, selectedWorkspaceId } =
//         useDashboardStore.getState();
//       if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId) {
//         throw new Error("Select an account, container, and workspace first.");
//       }

//       const query = new URLSearchParams({
//         accountId: selectedAccountId,
//         containerId: selectedContainerId,
//         workspaceId: selectedWorkspaceId,
//       });
//       const tagsResponse = await fetch(`/api/auth/gtm/tags?${query}`);
//       const tagsData = (await tagsResponse.json().catch(() => null)) as
//         | { tag?: unknown; error?: string }
//         | null;
//       if (!tagsResponse.ok || !Array.isArray(tagsData?.tag)) {
//         throw new Error(
//           tagsData?.error || "Could not load Custom HTML from this GTM workspace."
//         );
//       }

//       const workspaceTags = tagsData.tag.filter(
//         (tag): tag is GtmAffectedItem & {
//           type?: unknown;
//           parameter?: unknown;
//         } =>
//           typeof tag === "object" &&
//           tag !== null &&
//           !Array.isArray(tag) &&
//           "name" in tag &&
//           typeof tag.name === "string"
//       );
//       const htmlSources = selectedTags.map((asset) => {
//         const matchedTag = workspaceTags.find((tag) => {
//           if (tag.type !== "html") return false;
//           const tagId = getGtmResourceId(tag, "tags");
//           return asset.id
//             ? tagId === asset.id
//             : tag.name === itemName(asset.item);
//         });
//         if (!matchedTag) {
//           throw new Error(
//             `Could not find the selected Custom HTML tag "${itemName(asset.item)}" in the current workspace.`
//           );
//         }

//         const parameters = Array.isArray(matchedTag.parameter)
//           ? matchedTag.parameter
//           : [];
//         const htmlParameter = parameters.find(
//           (parameter) =>
//             typeof parameter === "object" &&
//             parameter !== null &&
//             "key" in parameter &&
//             parameter.key === "html"
//         );
//         const html =
//           typeof htmlParameter === "object" &&
//           htmlParameter !== null &&
//           "value" in htmlParameter &&
//           typeof htmlParameter.value === "string"
//             ? htmlParameter.value
//             : "";
//         if (!html.trim()) {
//           throw new Error(
//             `The selected tag "${itemName(asset.item)}" has no Custom HTML code.`
//           );
//         }
//         return { name: itemName(asset.item), html };
//       });

//       prompt = [
//         "Fix the selected Google Tag Manager Custom HTML code by adding safe, appropriate try/catch handling.",
//         "Return the complete corrected HTML for each selected tag, not a diff or general instructions.",
//         "Preserve the tag's existing behavior, markup, selectors, URLs, event names, and GTM variables. Do not invent missing business logic.",
//         "Wrap executable JavaScript in try/catch without swallowing errors silently; log caught errors with console.error.",
//         "Label each output with its exact tag name and provide one fenced html code block per tag. Do not make or claim to make changes to GTM.",
//         ...htmlSources.map(
//           ({ name, html }, index) =>
//             `Selected tag ${index + 1}: ${name}\nCurrent HTML:\n${html}`
//         ),
//       ].join("\n\n");
//     } else {
//       prompt = [
//         "Suggest a safe, specific way to fix this GTM health-check rule.",
//         "Do not make or claim to make changes to the GTM container.",
//         `Rule: ${rule.title}`,
//         `Description: ${rule.description}`,
//         `Rule recommendation: ${rule.recommendation || "None provided."}`,
//         `Affected items: ${allAffected(rule).map(itemName).join(", ") || "None listed."}`,
//       ].join("\n");
//     }

//     const res = await fetch("/api/auth/healthcheck/chat", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         healthReport: report,
//         claudeText,
//         responseMode: isCustomHtmlTryCatchRule
//           ? "custom_html_try_catch"
//           : undefined,
//         messages: [{ role: "user", content: prompt }],
//       }),
//     });
//     const data = await res.json().catch(() => null);

//     if (data?.code === "no_key" || data?.code === "invalid_key") {
//       anthropic.markNoKey();
//       setKeyModalNotice("Your API key is no longer connected. Enter a key, then try the AI fix again.");
//       setKeyModalOpen(true);
//     }

//     if (!res.ok || !data?.success) {
//       throw new Error(data?.error || `AI fix request failed (${res.status}).`);
//     }

//     const suggestion = typeof data.reply === "string" ? data.reply.trim() : "";
//     if (!suggestion) throw new Error("Claude returned an empty fix suggestion.");
//     return suggestion;
//   };

//   /* ---------- FAILED / PASSED ---------- */

//   const failedChecks = report?.results?.filter((r) => !r.passed) ?? [];
//   const passedChecks = report?.results?.filter((r) => r.passed) ?? [];

//   /* ---------- PDF ---------- */

//   const handleDownloadPDF = () => {
//     if (!report) return;

//     const names = (list?: AffectedItem[]) =>
//       list?.map((item) => item.name).filter(Boolean).join(", ") || "-";

//     const doc = new jsPDF();

//     doc.setFontSize(18);
//     doc.text(
//       "GTM HealthCheck Report",
//       14,
//       18
//     );

//     doc.setFontSize(12);
//     doc.text(`Score: ${report.score}%`, 14, 30);
//     doc.text(`Passed Checks: ${report.passedCount}`, 14, 38);
//     doc.text(`Failed Checks: ${report.failedCount}`, 14, 46);

//     let currentY = 60;

//     if (failedChecks.length > 0) {
//       doc.setFontSize(14);
//       doc.text("Failed Checks", 14, currentY);
//       currentY += 6;

//       autoTable(doc, {
//         startY: currentY,
//         head: [["ID", "Title", "Severity", "Affected Items"]],
//         body: failedChecks.map((r) => [
//           r.id,
//           r.title,
//           r.severity,
//           `Tags: ${names(r.affectedTags)}\nTriggers: ${names(r.affectedTriggers)}\nVars: ${names(r.affectedVariables)}`,
//         ]),
//         styles: { fontSize: 9, cellPadding: 2 },
//         headStyles: { fontSize: 10 },
//       });

//       currentY =
//         ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
//           ?.finalY || currentY) + 12;
//     }

//     if (passedChecks.length > 0) {
//       doc.setFontSize(14);
//       doc.text("Passed Checks", 14, currentY);
//       currentY += 6;

//       autoTable(doc, {
//         startY: currentY,
//         head: [["ID", "Title"]],
//         body: passedChecks.map((r) => [r.id, r.title]),
//         styles: { fontSize: 10, cellPadding: 2 },
//         headStyles: { fontSize: 11 },
//       });
//     }

//     doc.save(
//       "GTM_HealthCheck_Report.pdf"
//     );
//   };

//   /* ---------- GRADE ---------- */

//   const grade = report ? (report.score >= 80 ? "A" : report.score >= 50 ? "B" : "C") : "";

//   const verdictColor =
//     report && report.score >= 80 ? "var(--success)" : report && report.score >= 50 ? "var(--warn)" : "var(--danger)";

//   /* ---------- RENDER ---------- */

//   return (
//     <div>
//       <ApiKeyModal
//         open={keyModalOpen}
//         notice={keyModalNotice}
//         checking={anthropic.checking}
//         hasKey={hasKey}
//         onConnect={handleConnectKey}
//         onRemove={anthropic.disconnect}
//         onClose={() => setKeyModalOpen(false)}
//       />

//       {/* HERO */}

//       {!report && (
//         <section className="relative max-w-4xl mx-auto py-16 text-center overflow-hidden">
//           <div className="absolute inset-0 grid-bg opacity-30" />
//           <div className="hero-glow" />

//           <div className="relative">
//             <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent mb-4">GTM HealthCheck</p>

//             <h2 className="text-[clamp(34px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-fg">
//               Audit your tag manager,
//               <br />
//               <span className="text-accent accent-glow-text">in seconds</span>.
//             </h2>

//             <p className="mt-5 text-[15.5px] text-muted max-w-xl mx-auto leading-relaxed">
//               Find tracking issues, unused tags, duplicate triggers, broken variables, and performance bottlenecks with a complete container audit.
//             </p>

//             <div className="mt-9 flex justify-center gap-3 flex-wrap">
//               <button
//                 type="button"
//                 onClick={handleRunHealthCheck}
//                 disabled={loading || !store.selectedWorkspaceId}
//                 className="btn-primary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? (
//                   <>
//                     <Loader2 size={14} className="animate-spin" />
//                     Running…
//                   </>
//                 ) : (
//                   <>
//                     <Zap size={14} />
//                     Run HealthCheck
//                   </>
//                 )}
//               </button>

//               <button
//                 type="button"
//                 onClick={handleClaudeHealthCheck}
//                 disabled={claudeLoading || !store.selectedWorkspaceId}
//                 className="btn-secondary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {claudeLoading ? (
//                   <>
//                     <Loader2 size={14} className="animate-spin" />
//                     Analyzing…
//                   </>
//                 ) : (
//                   <>
//                     <Bot size={14} />
//                     Claude AI Audit
//                   </>
//                 )}
//               </button>
//             </div>

//             <div className="mt-4 flex justify-center">
//               <ConnectionBadge status={anthropic.status} onManage={openKeyManager} />
//             </div>

//             {!store.selectedWorkspaceId && (
//               <p className="mt-4 text-[12.5px] text-(--warn)">Select a workspace before running the audit.</p>
//             )}

//             {pageError && (
//               <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">{pageError}</div>
//             )}

//             {pageError && (
//               <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">
//                 {pageError}
//               </div>
//             )}

//             {claudeError && (
//               <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
//                 <div className="flex items-start gap-2">
//                   <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-500" />
//                   <div>
//                     <p className="text-sm font-semibold text-red-500">
//                       HealthCheck Error
//                     </p>
//                     <p className="mt-1 text-sm text-fg">{claudeError}</p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {claudeNotice && (
//               <div className="mt-5 px-4 py-3 rounded-lg border border-(--warn)/25 bg-(--warn)/8 text-(--warn) text-[13px]">{claudeNotice}</div>
//             )}

//             <div className="mt-12 flex justify-center gap-3 flex-wrap">
//               <Badge icon={<CheckCircle size={13} />} label="Secure & fast" />
//               <Badge icon={<ShieldCheck size={13} />} label="Workspace-safe" />
//               <Badge icon={<Zap size={13} />} label="Automated" />
//             </div>
//           </div>
//         </section>
//       )}

//       {/* REPORT */}

//       {report && (
//         <div className="bg-card border border-line rounded-xl overflow-hidden">
//           {/* REPORT HEADER */}

//           <div className="p-6 md:p-7 border-b border-line">
//             <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
//               <div>
//                 <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint mb-2">HealthCheck report</p>

//                 <h2 className="text-[24px] md:text-[28px] font-semibold text-fg tracking-[-0.02em]">Container audit</h2>

//                 <p className="text-[13px] text-muted mt-2 flex items-center gap-3">
//                   <span className="inline-flex items-center gap-1.5">
//                     <span className="w-1.5 h-1.5 rounded-full bg-accent" />
//                     {report.passedCount} passed
//                   </span>

//                   <span className="text-faint">·</span>

//                   <span className="inline-flex items-center gap-1.5">
//                     <span className="w-1.5 h-1.5 rounded-full bg-(--danger)" />
//                     {report.failedCount} failed
//                   </span>
//                 </p>
//               </div>

//               <div className="flex items-center gap-5">
//                 <div className="text-right">
//                   <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Score</p>

//                   <p className="text-[40px] font-semibold text-fg leading-none tracking-[-0.04em] mt-1">
//                     {report.score}
//                     <span className="text-[18px] text-faint ml-1">%</span>
//                   </p>
//                 </div>

//                 <div
//                   className="w-14 h-14 rounded-xl flex items-center justify-center font-semibold text-[22px] border"
//                   style={{
//                     background: `color-mix(in srgb, ${verdictColor} 14%, transparent)`,
//                     color: verdictColor,
//                     borderColor: `color-mix(in srgb, ${verdictColor} 25%, transparent)`,
//                   }}
//                 >
//                   {grade}
//                 </div>
//               </div>
//             </div>

//             <div className="mt-6 flex flex-wrap items-center gap-2">
//               <button type="button" onClick={handleRunHealthCheck} disabled={loading} className="btn-secondary py-2! disabled:opacity-50">
//                 <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
//                 {loading ? "Refreshing…" : "Refresh"}
//               </button>

//               <button type="button" onClick={handleClaudeHealthCheck} disabled={claudeLoading} className="btn-secondary py-2! disabled:opacity-50">
//                 {claudeLoading ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
//                 {claudeLoading ? "Analyzing…" : "Claude AI Audit"}
//               </button>

//               <button type="button" onClick={handleDownloadPDF} className="btn-primary py-2!">
//                 <Download size={13} />
//                 Download PDF
//               </button>

//               <div className="ml-auto">
//                 <ConnectionBadge status={anthropic.status} onManage={openKeyManager} />
//               </div>
//             </div>

//             {pageError && <p className="mt-3 text-[12.5px] text-(--danger)">{pageError}</p>}
//             {claudeError && <p className="mt-3 text-[12.5px] text-(--danger)">{claudeError}</p>}
//             {claudeNotice && <p className="mt-3 text-[12.5px] text-(--warn)">{claudeNotice}</p>}
//           </div>

//           {/* BODY */}

//           <div className="p-6 md:p-7">
//             <CompactHealthCheckSummary
//               report={report}
//               selection={{
//                 accountId: store.selectedAccountId,
//                 containerId: store.selectedContainerId,
//                 workspaceId: store.selectedWorkspaceId,
//               }}
//               onDeleted={handleRunHealthCheck}
//               onFixWithAI={handleFixWithAI}
//             />

//             {/* CLAUDE AUDIT */}

//             {claudeText && (
//               <ClaudeAuditChatBlock
//                 claudeText={claudeText}
//                 claudeTruncated={
//                   claudeTruncated
//                 }
//                 chatMessages={
//                   chatMessages
//                 }
//                 chatInput={chatInput}
//                 setChatInput={setChatInput}
//                 chatSending={chatSending}
//                 onSend={handleSendChatMessage}
//               />
//             )}

//             <HealthCheckTable
//               results={report.results}
//               passedCount={report.passedCount}
//               failedCount={report.failedCount}
//               selection={{
//                 accountId: store.selectedAccountId,
//                 containerId: store.selectedContainerId,
//                 workspaceId: store.selectedWorkspaceId,
//               }}
//               onDeleted={handleRunHealthCheck}
//               onFixWithAI={handleFixWithAI}
//             />

//             {/* NOTE */}

//             <div className="mt-10 flex items-start gap-3 p-4 rounded-lg border border-line bg-card-hi">
//               <AlertTriangle size={15} className="text-(--warn) mt-0.5 shrink-0" />

//               <p className="text-[13px] text-muted leading-relaxed">
//                 <span className="font-medium text-fg">Note:</span> This report is based on best-practice GTM rules and automated scanning. Always validate in
//                 Preview Mode before publishing.
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* FEATURES */}

//       {!report && (
//         <section className="border-t border-line mt-16 pt-16">
//           <div className="text-center mb-10">
//             <h3 className="text-[26px] font-semibold text-fg">Why HealthCheck?</h3>

//             <p className="text-muted mt-2 max-w-xl mx-auto text-[14.5px]">
//               Improve tracking accuracy, reduce container clutter, and optimize tag performance.
//             </p>
//           </div>

//           <div className="grid md:grid-cols-3 gap-4">
//             <FeatureCard
//               icon={<BarChart3 size={18} />}
//               accent="#3b82f6"
//               title="Tag performance audit"
//               body="Identify slow tags, excessive triggers, and unnecessary execution that impact load time."
//             />
//             <FeatureCard
//               icon={<ShieldCheck size={18} />}
//               accent="#10b981"
//               title="Tracking validation"
//               body="Validate tag firing logic, variable configuration, and ensure correct analytics tracking."
//             />
//             <FeatureCard
//               icon={<FileText size={18} />}
//               accent="#f59e0b"
//               title="Smart reports"
//               body="Structured report with issues, severity levels, and actionable recommendations."
//             />
//           </div>
//         </section>
//       )}
//     </div>
//   );
// }

// /* =====================================================
//    HEALTHCHECK RULES
// ===================================================== */

// const itemName = (item: AffectedItem): string =>
//   item?.name || item?.id || "Unnamed";

// function getGtmResourceId(
//   item: AffectedItem,
//   resourceType: GtmResourceType
// ): string | null {
//   if (resourceType === "tags") {
//     const tag = item as GtmAffectedItem;
//     return tag.tagId != null ? String(tag.tagId) : null;
//   }
//   if (resourceType === "triggers") {
//     const trigger = item as GtmAffectedItem;
//     return trigger.triggerId != null ? String(trigger.triggerId) : null;
//   }
//   const variable = item as GtmAffectedItem;
//   return variable.variableId != null ? String(variable.variableId) : null;
// }

// function RuleTitleWithTooltip({
//   title,
//   description,
// }: {
//   title: string;
//   description: string;
// }) {
//   const tooltip = description || title;
//   const [tooltipPosition, setTooltipPosition] = useState<{
//     left: number;
//     top: number;
//   } | null>(null);

//   const showTooltip = (
//     event: ReactMouseEvent<HTMLButtonElement> | ReactFocusEvent<HTMLButtonElement>
//   ) => {
//     const rect = event.currentTarget.getBoundingClientRect();
//     setTooltipPosition({
//       left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
//       top: Math.min(rect.bottom + 8, window.innerHeight - 120),
//     });
//   };

//   return (
//     <span className="inline-flex items-center gap-1.5">
//       <span>{title}</span>
//       <button
//         type="button"
//         aria-label={`Rule details: ${tooltip}`}
//         onMouseEnter={showTooltip}
//         onMouseLeave={() => setTooltipPosition(null)}
//         onFocus={showTooltip}
//         onBlur={() => setTooltipPosition(null)}
//         className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-[10px] font-medium leading-none text-muted hover:text-fg"
//       >
//         ?
//       </button>
//       {tooltipPosition &&
//         typeof document !== "undefined" &&
//         createPortal(
//           <span
//             role="tooltip"
//             className="pointer-events-none fixed z-100 w-80 max-h-[50vh] overflow-y-auto whitespace-normal wrap-break-word rounded-md border border-line bg-card p-3 text-left text-[13px] leading-5 text-fg shadow-xl"
//             style={{
//               left: tooltipPosition.left,
//               top: tooltipPosition.top,
//             }}
//           >
//             {tooltip}
//           </span>,
//           document.body
//         )}
//     </span>
//   );
// }

// function CompactHealthCheckSummary({
//   report,
//   selection,
//   onDeleted,
//   onFixWithAI,
// }: {
//   report: HealthCheckReport;
//   selection: GtmSelection;
//   onDeleted: () => Promise<void>;
//   onFixWithAI: HealthCheckFixHandler;
// }) {
//   const [expandedRules, setExpandedRules] = useState<Set<string>>(
//     () => new Set()
//   );
//   const [fixRule, setFixRule] = useState<HealthCheckResult | null>(null);
//   const [deleteRule, setDeleteRule] = useState<HealthCheckResult | null>(null);
//   const counts = report.counts ?? { tags: 0, triggers: 0, variables: 0 };
//   const scanned = [
//     { label: "Tags", value: counts.tags },
//     { label: "Triggers", value: counts.triggers },
//     { label: "Variables", value: counts.variables },
//   ];

//   return (
//     <div className="mb-8 overflow-hidden rounded-xl border border-line bg-card-hi">
//       <div className="grid grid-cols-3 border-b border-line">
//         {scanned.map((box, index) => (
//           <div key={box.label} className={`px-4 py-3 ${index > 0 ? "border-l border-line" : ""}`}>
//             <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
//               {box.label} scanned
//             </p>
//             <p className="mt-1 text-[22px] font-semibold leading-tight text-fg">
//               {box.value}
//             </p>
//           </div>
//         ))}
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full min-w-175 text-left">
//           <tbody>
//             {report.results.map((rule, index) => {
//               const items = allAffected(rule);
//               const assets = getRuleAffectedAssets(rule);
//               const expanded = expandedRules.has(rule.id);

//               return (
//                 <tr key={rule.id} className={index > 0 ? "border-t border-line" : ""}>
//                   <td className="w-[30%] px-4 py-2.5 align-top text-[13px] text-fg">
//                     <RuleTitleWithTooltip
//                       title={rule.title}
//                       description={rule.description}
//                     />
//                   </td>
//                   <td className="w-40 whitespace-nowrap px-4 py-2.5 align-top">
//                     {!rule.passed && items.length > 0 ? (
//                       <span className="inline-flex min-w-5 items-center justify-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 font-mono text-[11.5px] text-(--danger)">
//                         {items.length}
//                       </span>
//                     ) : rule.passed ? (
//                       <span className="inline-flex items-center gap-1 text-[12px] text-accent">
//                         <CheckCircle size={13} />
//                         No Issue Found
//                       </span>
//                     ) : (
//                       <span className="inline-flex items-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 text-[11.5px] text-(--danger)">
//                         Review
//                       </span>
//                     )}
//                   </td>
//                   <td className="px-4 py-2.5 align-top text-[12px] text-muted">
//                     {items.length > 0 && (
//                       <>
//                         {items
//                           .slice(0, expanded ? items.length : 6)
//                           .map(itemName)
//                           .join(", ")}
//                         {items.length > 6 && (
//                           <>
//                             {", "}
//                             <button
//                               type="button"
//                               onClick={() =>
//                                 setExpandedRules((previous) => {
//                                   const next = new Set(previous);
//                                   if (expanded) next.delete(rule.id);
//                                   else next.add(rule.id);
//                                   return next;
//                                 })
//                               }
//                               className="text-accent hover:underline"
//                               aria-expanded={expanded}
//                             >
//                               {expanded ? "Show less" : `+${items.length - 6} more`}
//                             </button>
//                           </>
//                         )}
//                       </>
//                     )}
//                   </td>
//                   <td className="w-28 px-4 py-2.5 text-right align-top">
//                     {!rule.passed && rule.recommendation && (
//                       <button
//                         type="button"
//                         onClick={() => setFixRule(rule)}
//                         className="btn-secondary inline-flex whitespace-nowrap px-3! py-1.5! text-[11.5px]"
//                       >
//                         Fix this
//                       </button>
//                     )}
//                     {!rule.passed &&
//                       !rule.recommendation &&
//                       assets.some((asset) => asset.id) && (
//                       <button
//                         type="button"
//                         onClick={() => setDeleteRule(rule)}
//                         className="btn-secondary ml-2 inline-flex whitespace-nowrap border-(--danger)/30 px-3! py-1.5! text-[11.5px] text-(--danger)"
//                       >
//                         Delete
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       {fixRule && (
//         <FixThisModal
//           rule={fixRule}
//           onClose={() => setFixRule(null)}
//           onFixWithAI={onFixWithAI}
//           selection={selection}
//           onDeleted={onDeleted}
//         />
//       )}
//       {deleteRule && (
//         <DeleteAffectedItemsModal
//           rule={deleteRule}
//           selection={selection}
//           onClose={() => setDeleteRule(null)}
//           onDeleted={onDeleted}
//         />
//       )}
//     </div>
//   );
// }

// function FixThisModal({
//   rule,
//   onClose,
//   onFixWithAI,
//   selection,
//   onDeleted,
// }: {
//   rule: HealthCheckResult;
//   onClose: () => void;
//   onFixWithAI: HealthCheckFixHandler;
//   selection: GtmSelection;
//   onDeleted: () => Promise<void>;
// }) {
//   const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
//   const [loadingAI, setLoadingAI] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const hasAffectedAssets = getRuleAffectedAssets(rule).length > 0;

//   const handleAiFix = async (selectedAssets?: HealthCheckAsset[]) => {
//     setLoadingAI(true);
//     setError(null);
//     try {
//       setAiSuggestion(await onFixWithAI(rule, selectedAssets));
//     } catch (requestError) {
//       setError(
//         requestError instanceof Error
//           ? requestError.message
//           : "Could not generate an AI fix."
//       );
//     } finally {
//       setLoadingAI(false);
//     }
//   };

//   const fixWithAIButton = (selectedAssets?: HealthCheckAsset[]) => (
//     <button
//       type="button"
//       onClick={() => void handleAiFix(selectedAssets)}
//       disabled={
//         loadingAI ||
//         (rule.id === "HC_HR_005" &&
//           !selectedAssets?.some((asset) => asset.resourceType === "tags"))
//       }
//       className="btn-primary disabled:opacity-50"
//     >
//       {loadingAI
//         ? "Generating suggestion…"
//         : rule.id === "HC_HR_005"
//           ? "Fix selected HTML with AI"
//           : "Fix with AI"}
//     </button>
//   );

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//       onMouseDown={(event) => {
//         if (event.target === event.currentTarget) onClose();
//       }}
//     >
//       <section
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="healthcheck-fix-title"
//         className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-card p-5 shadow-xl"
//       >
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <h2
//               id="healthcheck-fix-title"
//               className="text-[16px] font-semibold text-fg"
//             >
//               Fix this rule
//             </h2>
//             <p className="mt-1 text-[13px] text-muted">{rule.title}</p>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="btn-secondary shrink-0 px-3! py-1.5! text-[11.5px]"
//           >
//             Close
//           </button>
//         </div>

//         <div className="mt-4 rounded-lg border border-line bg-card-hi p-3 text-[13px] leading-relaxed text-fg">
//           <span className="font-semibold">Fix:</span>{" "}
//           {rule.recommendation || "No specific recommendation is available."}
//         </div>

//         {hasAffectedAssets ? (
//           <DeleteAffectedItemsModal
//             rule={rule}
//             selection={selection}
//             onClose={onClose}
//             onDeleted={onDeleted}
//             footerAction={(selectedAssets) =>
//               fixWithAIButton(selectedAssets)
//             }
//             embedded
//           />
//         ) : (
//           <div className="mt-4 flex justify-end">{fixWithAIButton()}</div>
//         )}

//         <p className="mt-2 text-[11.5px] text-muted">
//           {rule.id === "HC_HR_005"
//             ? "Selected Custom HTML code will be sent to AI to generate a try/catch-safe version. GTM will not be changed."
//             : "AI will suggest a fix; it will not change your GTM container."}
//         </p>

//         {error && (
//           <p role="alert" className="mt-3 text-[12px] text-(--danger)">
//             {error}
//           </p>
//         )}
//         {aiSuggestion && (
//           <div className="mt-4 rounded-lg border border-accent/20 bg-accent-soft p-3">
//             <p className="mb-1 text-[12px] font-semibold text-fg">
//               AI suggestion
//             </p>
//             <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">
//               {aiSuggestion}
//             </p>
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }

// function DeleteAffectedItemsModal({
//   rule,
//   selection,
//   onClose,
//   onDeleted,
//   embedded = false,
//   footerAction,
// }: {
//   rule: HealthCheckResult;
//   selection: GtmSelection;
//   onClose: () => void;
//   onDeleted: () => Promise<void>;
//   embedded?: boolean;
//   footerAction?: (selectedAssets: HealthCheckAsset[]) => ReactNode;
// }) {
//   const assets = getRuleAffectedAssets(rule);
//   const [selected, setSelected] = useState<Set<string>>(() => new Set());
//   const [deleting, setDeleting] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const selectedAssets = assets.filter(
//     (asset) => selected.has(`${asset.resourceType}:${asset.id ?? itemName(asset.item)}`)
//   );

//   const handleDelete = async () => {
//     if (selectedAssets.length === 0) return;
//     if (!selection.accountId || !selection.containerId || !selection.workspaceId) {
//       setError("Select an account, container, and workspace before deleting.");
//       return;
//     }

//     setDeleting(true);
//     setError(null);
//     let deletedCount = 0;
//     try {
//       const inventoryByType = new Map<GtmResourceType, Record<string, unknown>[]>();
//       const getInventory = async (resourceType: GtmResourceType) => {
//         const cached = inventoryByType.get(resourceType);
//         if (cached) return cached;

//         const query = new URLSearchParams({
//           accountId: selection.accountId!,
//           containerId: selection.containerId!,
//           workspaceId: selection.workspaceId!,
//         });
//         const response = await fetch(
//           `/api/auth/gtm/${resourceType}?${query}`
//         );
//         const data = (await response.json().catch(() => null)) as
//           | Record<string, unknown>
//           | null;
//         if (!response.ok || !data) {
//           throw new Error(
//             typeof data?.error === "string"
//               ? data.error
//               : `Could not load ${resourceType} from the selected GTM workspace.`
//           );
//         }

//         const listKey =
//           resourceType === "tags"
//             ? "tag"
//             : resourceType === "triggers"
//               ? "trigger"
//               : "variable";
//         const inventory = data[listKey];
//         if (!Array.isArray(inventory)) {
//           throw new Error(`The GTM ${resourceType} list response was invalid.`);
//         }
//         const records = inventory.filter(
//           (item): item is Record<string, unknown> =>
//             typeof item === "object" && item !== null && !Array.isArray(item)
//         );
//         inventoryByType.set(resourceType, records);
//         return records;
//       };

//       const resolvedAssets: {
//         item: GtmAffectedItem;
//         resourceType: GtmResourceType;
//         id: string;
//       }[] = [];

//       for (const asset of selectedAssets) {
//         let id = asset.id;
//         if (!id) {
//           const idField =
//             asset.resourceType === "tags"
//               ? "tagId"
//               : asset.resourceType === "triggers"
//                 ? "triggerId"
//                 : "variableId";
//           const matches = (await getInventory(asset.resourceType)).filter(
//             (record) => record.name === itemName(asset.item)
//           );
//           const ids = matches
//             .map((record) => record[idField])
//             .filter(
//               (candidate): candidate is string | number =>
//                 typeof candidate === "string" || typeof candidate === "number"
//             )
//             .map(String);
//           if (ids.length !== 1 || !ids[0]) {
//             throw new Error(
//               ids.length > 1
//                 ? `More than one ${asset.resourceType.slice(0, -1)} is named "${itemName(asset.item)}".`
//                 : `Could not find "${itemName(asset.item)}" in the selected GTM workspace.`
//             );
//           }
//           id = ids[0];
//         }

//         resolvedAssets.push({ item: asset.item, resourceType: asset.resourceType, id });
//       }

//       for (const asset of resolvedAssets) {
//         const idParam =
//           asset.resourceType === "tags"
//             ? "tagId"
//             : asset.resourceType === "triggers"
//               ? "triggerId"
//               : "variableId";
//         const query = new URLSearchParams({
//           accountId: selection.accountId,
//           containerId: selection.containerId,
//           workspaceId: selection.workspaceId,
//           [idParam]: asset.id,
//         });
//         const response = await fetch(
//           `/api/auth/gtm/${asset.resourceType}?${query}`,
//           { method: "DELETE" }
//         );
//         const data = await response.json().catch(() => null);
//         if (!response.ok || !data?.success) {
//           const details =
//             data?.details?.error?.message ||
//             data?.details?.error_description ||
//             data?.details?.message ||
//             (typeof data?.details === "string" ? data.details : null);
//           throw new Error(
//             details
//               ? `${data?.error || `Could not delete ${itemName(asset.item)}.`} ${details}`
//               : data?.error || `Could not delete ${itemName(asset.item)}.`
//           );
//         }
//         deletedCount += 1;
//       }

//       await onDeleted();
//       onClose();
//     } catch (deleteError) {
//       if (deletedCount > 0) await onDeleted();
//       setError(
//         deleteError instanceof Error
//           ? deleteError.message
//           : "Could not delete the selected GTM assets."
//       );
//     } finally {
//       setDeleting(false);
//     }
//   };

//   const assetSelection = (
//     <>
//       {!embedded && (
//         <p className="mt-3 text-[12px] text-(--danger)">
//           Select the assets to delete. This changes the GTM workspace.
//         </p>
//       )}

//       <div className={`${embedded ? "mt-3" : "mt-4"} grid grid-cols-1 gap-2 sm:grid-cols-2`}>
//         {assets.map((asset) => {
//           const key = `${asset.resourceType}:${asset.id ?? itemName(asset.item)}`;
//           const checked = selected.has(key);

//           return (
//             <label
//               key={key}
//               className="flex items-start gap-2 rounded-md border border-line bg-card-hi p-2.5 text-[12.5px] text-fg"
//             >
//               <input
//                 type="checkbox"
//                 checked={checked}
//                 disabled={deleting}
//                 onChange={() =>
//                   setSelected((previous) => {
//                     const next = new Set(previous);
//                     if (checked) next.delete(key);
//                     else next.add(key);
//                     return next;
//                   })
//                 }
//                 className="mt-0.5"
//               />
//               <span className="min-w-0 flex-1 break-all">
//                 {itemName(asset.item)}
//               </span>
//               <span className="shrink-0 text-[10px] uppercase text-muted">
//                 {asset.resourceType.slice(0, -1)}
//               </span>
//             </label>
//           );
//         })}
//       </div>

//       {selectedAssets.some(
//         (asset) => asset.resourceType === "variables"
//       ) && (
//         <p className="mt-3 text-[12px] text-(--warn)" role="status">
//           Deleting a variable may affect attached tags or triggers. Review affected items before continuing.
//         </p>
//       )}
//       {selectedAssets.some(
//         (asset) => asset.resourceType === "triggers"
//       ) && (
//         <p className="mt-3 text-[12px] text-(--warn)" role="status">
//           Deleting a trigger may affect attached tags. Review affected items before continuing.
//         </p>
//       )}

//       {error && (
//         <p role="alert" className="mt-3 text-[12px] text-(--danger)">
//           {error}
//         </p>
//       )}

//       <div className="mt-5 flex justify-end gap-2">
//         {embedded && footerAction?.(selectedAssets)}
//         {!embedded && (
//           <button
//             type="button"
//             onClick={onClose}
//             disabled={deleting}
//             className="btn-secondary"
//           >
//             Cancel
//           </button>
//         )}
//         <button
//           type="button"
//           onClick={handleDelete}
//           disabled={deleting || selectedAssets.length === 0}
//           className="btn-primary bg-(--danger)! disabled:opacity-50"
//         >
//           {deleting ? "Deleting…" : `Delete selected (${selectedAssets.length})`}
//         </button>
//       </div>
//     </>
//   );

//   if (embedded) {
//     return (
//       <div className="mt-4 border-t border-line pt-4">
//         <h3 className="text-[13px] font-semibold text-fg">Affected items</h3>
//         {assetSelection}
//       </div>
//     );
//   }

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//       onMouseDown={(event) => {
//         if (event.target === event.currentTarget && !deleting) onClose();
//       }}
//     >
//       <section
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="healthcheck-delete-title"
//         className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-card p-5 shadow-xl"
//       >
//         <h2
//           id="healthcheck-delete-title"
//           className="text-[16px] font-semibold text-fg"
//         >
//           Delete affected GTM assets
//         </h2>
//         <p className="mt-1 text-[13px] text-muted">{rule.title}</p>
//         {assetSelection}
//       </section>
//     </div>
//   );
// }

// type TableFilter = "all" | "failed" | "passed";

// function HealthCheckTable({
//   results,
//   passedCount,
//   failedCount,
//   selection,
//   onDeleted,
//   onFixWithAI,
// }: {
//   results: HealthCheckResult[];
//   passedCount: number;
//   failedCount: number;
//   selection: GtmSelection;
//   onDeleted: () => Promise<void>;
//   onFixWithAI: HealthCheckFixHandler;
// }) {
//   const [filter, setFilter] = useState<TableFilter>("all");
//   const [expandedId, setExpandedId] = useState<string | null>(null);
//   const [fixRule, setFixRule] = useState<HealthCheckResult | null>(null);
//   const [deleteRule, setDeleteRule] = useState<HealthCheckResult | null>(null);

//   const filtered = results.filter((result) => {
//     if (filter === "failed") return !result.passed;
//     if (filter === "passed") return result.passed;
//     return true;
//   });

//   const toggleRow = (result: HealthCheckResult) => {
//     if (!rowHasDetail(result)) return;
//     setExpandedId((previous) => (previous === result.id ? null : result.id));
//   };

//   const tabs: {
//     key: TableFilter;
//     label: string;
//     count: number;
//     tone: "neutral" | "danger" | "accent";
//   }[] = [
//     { key: "all", label: "All", count: results.length, tone: "neutral" },
//     { key: "failed", label: "Failed", count: failedCount, tone: "danger" },
//     { key: "passed", label: "Passed", count: passedCount, tone: "accent" },
//   ];

//   return (
//     <div>
//       <div className="mb-4 flex flex-wrap items-center gap-2">
//         {tabs.map((tab) => {
//           const active = filter === tab.key;
//           const base =
//             "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors";
//           const activeClass =
//             tab.tone === "danger"
//               ? "border-(--danger)/30 bg-(--danger)/10 text-(--danger)"
//               : tab.tone === "accent"
//                 ? "border-accent/30 bg-accent-soft text-accent"
//                 : "border-edge bg-card-hi text-fg";
//           const idleClass =
//             "border-line bg-card text-muted hover:border-edge hover:text-fg";

//           return (
//             <button
//               key={tab.key}
//               type="button"
//               onClick={() => setFilter(tab.key)}
//               className={`${base} ${active ? activeClass : idleClass}`}
//             >
//               {tab.label}
//               <span className="font-mono text-[11px] opacity-70">
//                 {tab.count}
//               </span>
//             </button>
//           );
//         })}
//       </div>

//       <div className="overflow-hidden rounded-xl border border-line">
//         <div className="overflow-x-auto">
//           <table className="w-full border-collapse text-left">
//             <thead>
//               <tr className="border-b border-line bg-card-hi">
//                 <th className="w-8 px-3 py-2.5" />
//                 <th className="w-23 px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   ID
//                 </th>
//                 <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   Check
//                 </th>
//                 <th className="w-27.5 px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   Severity
//                 </th>
//                 <th className="w-23 px-3 py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   Affected
//                 </th>
//                 <th className="w-20 px-3 py-2.5 text-center text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   Status
//                 </th>
//                 <th className="w-40 px-3 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-faint">
//                   Actions
//                 </th>
//               </tr>
//             </thead>

//             <tbody>
//               {filtered.map((result) => (
//                 <FragmentRow
//                   key={result.id}
//                   result={result}
//                   detail={rowHasDetail(result)}
//                   expanded={expandedId === result.id}
//                   affected={affectedItemCount(result)}
//                   onToggle={() => toggleRow(result)}
//                   onFix={() => setFixRule(result)}
//                   onDelete={() => setDeleteRule(result)}
//                 />
//               ))}

//               {filtered.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={7}
//                     className="px-4 py-8 text-center text-[13px] text-muted"
//                   >
//                     No checks in this view.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <p className="mt-3 text-[12px] text-faint">
//         Tip: click a row to see the fix and affected items.
//       </p>
//       {fixRule && (
//         <FixThisModal
//           rule={fixRule}
//           onClose={() => setFixRule(null)}
//           onFixWithAI={onFixWithAI}
//           selection={selection}
//           onDeleted={onDeleted}
//         />
//       )}
//       {deleteRule && (
//         <DeleteAffectedItemsModal
//           rule={deleteRule}
//           selection={selection}
//           onClose={() => setDeleteRule(null)}
//           onDeleted={onDeleted}
//         />
//       )}
//     </div>
//   );
// }

// function FragmentRow({
//   result,
//   detail,
//   expanded,
//   affected,
//   onToggle,
//   onFix,
//   onDelete,
// }: {
//   result: HealthCheckResult;
//   detail: boolean;
//   expanded: boolean;
//   affected: number;
//   onToggle: () => void;
//   onFix: () => void;
//   onDelete: () => void;
// }) {
//   return (
//     <>
//       <tr
//         onClick={onToggle}
//         className={`border-t border-line transition-colors ${detail ? "cursor-pointer hover:bg-card-hi" : ""} ${expanded ? "bg-card-hi" : ""}`}
//       >
//         <td className="px-3 py-3 align-top">
//           {detail ? (
//             expanded ? (
//               <ChevronDown size={14} className="text-muted" />
//             ) : (
//               <ChevronRight size={14} className="text-faint" />
//             )
//           ) : null}
//         </td>

//         <td className="px-3 py-3 align-top">
//           <span className="font-mono text-[11.5px] text-faint">
//             {result.id}
//           </span>
//         </td>

//         <td className="px-3 py-3 align-top">
//           <RuleTitleWithTooltip
//             title={result.title}
//             description={result.description}
//           />
//           {result.description && (
//             <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-muted">
//               {result.description}
//             </p>
//           )}
//         </td>

//         <td className="px-3 py-3 align-top">
//           <SeverityBadge severity={result.severity} />
//         </td>

//         <td className="px-3 py-3 text-center align-top">
//           {affected > 0 ? (
//             <span className="inline-flex min-w-5.5 items-center justify-center rounded-md border border-(--danger)/20 bg-(--danger)/10 px-1.5 py-0.5 font-mono text-[11.5px] text-(--danger)">
//               {affected}
//             </span>
//           ) : (
//             <span className="text-[12px] text-faint">—</span>
//           )}
//         </td>
//         <td className="px-3 py-3 text-right align-top">
//           {!result.passed && (
//             <div className="inline-flex items-center gap-2">
//               {result.recommendation && (
//                 <button
//                   type="button"
//                   aria-haspopup="dialog"
//                   onClick={(event) => {
//                     event.stopPropagation();
//                     onFix();
//                   }}
//                   className="btn-secondary inline-flex whitespace-nowrap px-3! py-1.5! text-[11.5px]"
//                 >
//                   Fix this
//                 </button>
//               )}
//               {!result.recommendation &&
//                 getRuleAffectedAssets(result).some((asset) => asset.id) && (
//                 <button
//                   type="button"
//                   aria-haspopup="dialog"
//                   onClick={(event) => {
//                     event.stopPropagation();
//                     onDelete();
//                   }}
//                   className="btn-secondary inline-flex whitespace-nowrap border-(--danger)/30 px-3! py-1.5! text-[11.5px] text-(--danger)"
//                 >
//                   Delete
//                 </button>
//               )}
//             </div>
//           )}
//         </td>

//         <td className="px-3 py-3 text-center align-top">
//           {result.passed ? (
//             <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
//               <CheckCircle size={13} />
//               Pass
//             </span>
//           ) : (
//             <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-(--danger)">
//               <XCircle size={13} />
//               Fail
//             </span>
//           )}
//         </td>
//       </tr>

//       {detail && expanded && (
//         <tr className="border-t border-line bg-card-hi">
//           <td />
//           <td colSpan={6} className="px-3 pb-5 pt-1 align-top">
//             {result.description && (
//               <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
//                 {result.description}
//               </p>
//             )}

//             {result.recommendation && (
//               <div className="mt-3 w-fit max-w-2xl rounded-md border border-(--danger)/20 bg-(--danger)/8 px-3 py-2 text-[12.5px] text-(--danger)">
//                 <span className="font-semibold">Fix:</span>{" "}
//                 {result.recommendation}
//               </div>
//             )}

//             <AffectedList label="Affected Tags" items={result.affectedTags} resourceType="tags" />
//             <AffectedList label="Affected Triggers" items={result.affectedTriggers} resourceType="triggers" />
//             <AffectedList label="Affected Variables" items={result.affectedVariables} resourceType="variables" />
//             <AffectedList label="Unused Tags" items={(result as any).unusedTags} resourceType="tags" />
//             <AffectedList label="Unused Triggers" items={(result as any).unusedTriggers} resourceType="triggers" />
//             <AffectedList label="Unused Variables" items={(result as any).unusedVariables} resourceType="variables" />

//             <AffectedList label={result.passed ? "Checked tags — passed" : "Other tags checked — no issue"} items={(result as any).passedTags} resourceType="tags" total={(result as any).passedCounts?.tags} tone="pass" />
//             <AffectedList label={result.passed ? "Checked triggers — passed" : "Other triggers checked — no issue"} items={(result as any).passedTriggers} resourceType="triggers" total={(result as any).passedCounts?.triggers} tone="pass" />
//             <AffectedList label={result.passed ? "Checked variables — passed" : "Other variables checked — no issue"} items={(result as any).passedVariables} resourceType="variables" total={(result as any).passedCounts?.variables} tone="pass" />
//           </td>
//         </tr>
//       )}
//     </>
//   );
// }

// /* =====================================================
//    CLAUDE AUDIT + CHAT
// ===================================================== */

// function ClaudeAuditChatBlock({
//   claudeText,
//   claudeTruncated,
//   chatMessages,
//   chatInput,
//   setChatInput,
//   chatSending,
//   onSend,
// }: {
//   claudeText: string;
//   claudeTruncated: boolean;
//   chatMessages: ChatMessage[];
//   chatInput: string;
//   setChatInput: (value: string) => void;
//   chatSending: boolean;
//   onSend: () => void;
// }) {
//   return (
//     <div className="mb-10 rounded-xl border border-line bg-card overflow-hidden">
//       <div className="p-5 space-y-4">
//         {/* TOOL */}

//         <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card-hi">
//           <Wrench size={13} className="text-muted" />
//           <span className="font-mono text-[12.5px] text-fg">gtm_ai_audit</span>
//           <span className="w-1.5 h-1.5 rounded-full bg-accent" />
//         </div>

//         {/* CLAUDE RESPONSE */}

//         <div className="text-[13.5px] text-fg leading-relaxed">{renderMarkdownLite(claudeText)}</div>

//         {claudeTruncated && (
//           <div className="px-3 py-2 rounded-md bg-(--warn)/8 border border-(--warn)/20 text-(--warn) text-[12px]">
//             Claude response was truncated. Some audit details may be missing.
//           </div>
//         )}

//         {/* CHAT */}

//         {chatMessages.length > 0 && (
//           <div className="border-t border-line pt-4 space-y-3">
//             {chatMessages.map((message, index) => (
//               <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
//                 <div
//                   className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${message.role === "user" ? "bg-emerald-600 text-white whitespace-pre-wrap" : "bg-card-hi border border-line text-fg"
//                     }`}
//                 >
//                   {message.role === "assistant" ? renderMarkdownLite(message.content) : message.content}
//                 </div>
//               </div>
//             ))}

//             {chatSending && (
//               <div className="flex justify-start">
//                 <div className="rounded-lg px-3.5 py-2 bg-card-hi border border-line">
//                   <Loader2 size={14} className="animate-spin text-muted" />
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* CHAT INPUT */}

//       <div className="border-t border-line p-3">
//         <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hi px-2 py-2">
//           <button
//             type="button"
//             disabled
//             className="w-7 h-7 rounded-md flex items-center justify-center text-muted border border-line shrink-0 opacity-50"
//           >
//             <Plus size={14} />
//           </button>

//           <input
//             type="text"
//             value={chatInput}
//             onChange={(e) => setChatInput(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 if (!chatSending && chatInput.trim()) onSend();
//               }
//             }}
//             placeholder="Message Claude…"
//             disabled={chatSending}
//             className="flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-faint outline-none px-1"
//           />

//           <button
//             type="button"
//             onClick={onSend}
//             disabled={chatSending || !chatInput.trim()}
//             className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 shrink-0"
//           >
//             {chatSending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* =====================================================
//    MARKDOWN
// ===================================================== */

// function renderMarkdownLite(text: string): ReactNode[] {
//   const lines = text.split("\n");
//   const blocks: ReactNode[] = [];
//   let listItems: string[] = [];

//   const renderInline = (line: string, key: string | number): ReactNode => {
//     const parts = line.split(/(\*\*[^*]+\*\*)/g);

//     return (
//       <span key={key}>
//         {parts.map((part, index) =>
//           part.startsWith("**") && part.endsWith("**") ? (
//             <strong key={index} className="font-semibold text-fg">
//               {part.slice(2, -2)}
//             </strong>
//           ) : (
//             <span key={index}>{part}</span>
//           )
//         )}
//       </span>
//     );
//   };

//   const flushList = (key: string | number) => {
//     if (listItems.length === 0) return;

//     blocks.push(
//       <ul key={`list-${key}`} className="list-disc list-inside space-y-1 my-2">
//         {listItems.map((item, index) => (
//           <li key={index}>{renderInline(item, index)}</li>
//         ))}
//       </ul>
//     );

//     listItems = [];
//   };

//   lines.forEach((line, index) => {
//     const trimmed = line.trim();

//     if (trimmed.startsWith("### ")) {
//       flushList(index);
//       blocks.push(
//         <h4 key={index} className="text-[13.5px] font-semibold text-fg mt-4 mb-1.5">
//           {renderInline(trimmed.slice(4), index)}
//         </h4>
//       );
//     } else if (trimmed.startsWith("## ")) {
//       flushList(index);
//       blocks.push(
//         <h3 key={index} className="text-[15px] font-semibold text-fg mt-5 mb-2">
//           {renderInline(trimmed.slice(3), index)}
//         </h3>
//       );
//     } else if (trimmed.startsWith("# ")) {
//       flushList(index);
//       blocks.push(
//         <h2 key={index} className="text-[16px] font-semibold text-fg mt-5 mb-2">
//           {renderInline(trimmed.slice(2), index)}
//         </h2>
//       );
//     } else if (/^[-*]\s+/.test(trimmed)) {
//       listItems.push(trimmed.replace(/^[-*]\s+/, ""));
//     } else if (trimmed === "") {
//       flushList(index);
//     } else {
//       flushList(index);
//       blocks.push(
//         <p key={index} className="mb-2 last:mb-0">
//           {renderInline(trimmed, index)}
//         </p>
//       );
//     }
//   });

//   flushList("end");

//   return blocks;
// }

// /* =====================================================
//    SMALL COMPONENTS
// ===================================================== */

// function Badge({ icon, label }: { icon: ReactNode; label: string }) {
//   return (
//     <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-line text-[12.5px] text-muted">
//       <span className="text-accent">{icon}</span>
//       {label}
//     </span>
//   );
// }

// function SeverityBadge({ severity }: { severity: string }) {
//   const tone =
//     severity === "HIGH"
//       ? "var(--danger)"
//       : severity === "MEDIUM"
//         ? "var(--warn)"
//         : "var(--accent)";

//   return (
//     <span
//       className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.12em]"
//       style={{
//         background: `color-mix(in srgb, ${tone} 14%, transparent)`,
//         color: tone,
//         borderColor: `color-mix(in srgb, ${tone} 30%, transparent)`,
//       }}
//     >
//       {severity}
//     </span>
//   );
// }

// function AffectedList({
//   label,
//   items,
//   resourceType = "tags",
//   total,
//   tone = "issue",
// }: {
//   label: string;
//   items?: GtmAffectedItem[];
//   resourceType?: GtmResourceType;
//   total?: number;
//   tone?: "issue" | "pass";
// }) {
//   const [showAll, setShowAll] = useState(false);
//   if (!items || items.length === 0) return null;

//   const LIMIT = 12;
//   const visibleItems = showAll ? items : items.slice(0, LIMIT);
//   const hiddenCount = items.length - visibleItems.length;
//   const chip =
//     tone === "pass"
//       ? "inline-flex items-center rounded-md border border-line bg-card px-2.5 py-1 text-[11.5px] text-fg"
//       : "inline-flex items-center rounded-md border border-(--danger)/20 bg-(--danger)/8 px-2.5 py-1 text-[11.5px] text-fg";

//   return (
//     <div className="mt-4">
//       <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
//         {label}{typeof total === "number" ? ` (${total})` : ""}
//       </h4>

//       <div className="flex flex-wrap gap-2">
//         {visibleItems.map((item, index) => {
//           const content = itemName(item);
//           const key = `${getGtmResourceId(item, resourceType) ?? content}-${index}`;
//           return item.editUrl ? (
//             <a
//               key={key}
//               href={item.editUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               onClick={(event) => event.stopPropagation()}
//               className={`${chip} hover:opacity-80 transition-opacity`}
//             >
//               {content}
//               {item.detail && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">→ {item.detail}</span>}
//             </a>
//           ) : (
//             <span key={key} className={chip}>
//               {content}
//               {item.detail && <span className="ml-1.5 font-mono text-[10.5px] opacity-70">→ {item.detail}</span>}
//             </span>
//           );
//         })}

//         {!showAll && items.length > LIMIT && (
//           <button
//             type="button"
//             onClick={(e) => {
//               e.stopPropagation();
//               setShowAll(true);
//             }}
//             className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-fg"
//           >
//             Show {items.length - LIMIT} more
//           </button>
//         )}

//         {hiddenCount > 0 && showAll && <span className="px-2 py-1.5 text-xs text-faint">+{hiddenCount} not listed</span>}
//       </div>
//     </div>
//   );
// }

// function FeatureCard({ icon, accent, title, body }: { icon: ReactNode; accent: string; title: string; body: string }) {
//   return (
//     <div className="bg-card p-6 rounded-xl border border-line transition-all hover:border-edge hover:bg-card-hi">
//       <div
//         className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
//         style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
//       >
//         {icon}
//       </div>

//       <h4 className="text-[15px] font-semibold text-fg mb-1.5">{title}</h4>

//       <p className="text-[13px] text-muted leading-relaxed">{body}</p>
//     </div>
//   );
// }