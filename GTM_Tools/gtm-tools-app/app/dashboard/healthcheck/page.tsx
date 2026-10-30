/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Bot,
  Wrench,
  ArrowUp,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRef, useState, type ReactNode } from "react";

import type { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";

type ChatMessage = { role: "user" | "assistant"; content: string };

type HealthCheckCounts = { tags: number; triggers: number; variables: number };

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

  const value = candidate as any;

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
      results.filter((r: any) => r?.passed === true).length
    ),

    failedCount: Number(
      value.failedCount ??
      data.failedCount ??
      results.filter((r: any) => r?.passed === false).length
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
function allAffected(r?: HealthCheckResult | null): any[] {
  if (!r) return [];
  const any = r as any;
  return [any.affectedTags, any.affectedTriggers, any.affectedVariables, any.unusedTags, any.unusedTriggers, any.unusedVariables].flatMap((list) =>
    Array.isArray(list) ? list : []
  );
}

function affectedItemCount(r: HealthCheckResult): number {
  return allAffected(r).length;
}

function rowHasDetail(r: HealthCheckResult): boolean {
  return Boolean(r.recommendation || r.description || affectedItemCount(r) > 0);
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
  const [claudeText, setClaudeText] = useState<string | null>(null);
  const [claudeTruncated, setClaudeTruncated] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);
  const [claudeNotice, setClaudeNotice] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  /* Prevents two chat requests when Enter + click happen together. */
  const chatRequestLock = useRef(false);

  /* ---------- RUN FUNCTIONAL HEALTH CHECK ---------- */

  const handleRunHealthCheck = async () => {
    setClaudeError(null);

    const {
      selectedAccountId: accountId,
      selectedContainerId: containerId,
      selectedWorkspaceId: workspaceId,
    } = useDashboardStore.getState();

    if (!accountId || !containerId || !workspaceId) {
      setClaudeError(
        "Select an account, container, and workspace before running the audit."
      );
      return;
    }

    try {
      setLoading(true);

      console.log("[HealthCheck] Starting audit", {
        accountId,
        containerId,
        workspaceId,
      });

      const res = await fetch("/api/auth/healthcheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          containerId,
          workspaceId,
        }),
        cache: "no-store",
      });

      const responseText = await res.text();

      let data: HealthCheckApiResponse | null = null;

      try {
        data = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        throw new Error(
          `HealthCheck returned invalid JSON. HTTP ${res.status}.`
        );
      }

      console.log("[HealthCheck] API response:", data);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.error ||
          data?.details ||
          `HealthCheck request failed. HTTP ${res.status}.`
        );
      }

      const nextReport = normalizeHealthReport(data);

      if (!nextReport) {
        console.error(
          "[HealthCheck] Could not normalize response:",
          data
        );

        throw new Error(
          "The API responded, but no valid results array was found. Check the server response."
        );
      }

      console.log("[HealthCheck] Report generated:", {
        score: nextReport.score,
        passed: nextReport.passedCount,
        failed: nextReport.failedCount,
        totalResults: nextReport.results.length,
      });

      setReport(nextReport);
      setClaudeText(null);
      setClaudeTruncated(false);
      setChatMessages([]);
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

  /* ---------- CLAUDE AI AUDIT (no key needed in the browser) ---------- */

  const handleClaudeHealthCheck = async () => {
    if (claudeLoading || !store.selectedWorkspaceId) return;

    setClaudeError(null);
    setClaudeNotice(null);
    setPageError(null);

    const ids = getSelectedIds();
    if (!ids) {
      setClaudeError("Select an account, container, and workspace before running the audit.");
      return;
    }

    try {
      setClaudeLoading(true);
      setChatMessages([]);

      /* The audit route scans the live container itself, so no report is required first. */
      const aiRes = await fetch("/api/auth/healthcheck/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });

      const aiData = (await aiRes.json().catch(() => null)) as any;

      if (!aiRes.ok || !aiData?.success) {
        throw new Error(aiData?.error || `AI audit failed (${aiRes.status}).`);
      }

      const text = String(aiData.resultText ?? "").trim();
      if (!text) throw new Error("Claude returned an empty audit response.");

      /* Show the exact same scan Claude analysed, so the table and the AI text always match. */
      const fresh = normalizeHealthReport({ healthReport: aiData.healthReport });
      if (fresh) {
        setReport(fresh);
      } else if (!report) {
        setReport(await fetchReport(ids));
      }

      setClaudeText(text);
      setClaudeTruncated(Boolean(aiData.truncated));

      if (aiData.fallback) {
        setClaudeNotice("AI is unavailable right now, so this is the built-in rule-based audit.");
      }
    } catch (error) {
      console.error("Claude AI Audit Error:", error);
      setClaudeError(error instanceof Error ? error.message : "Unable to run Claude AI Audit.");
    } finally {
      setClaudeLoading(false);
    }
  };

  /* ---------- CHAT WITH CLAUDE ---------- */

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatSending || chatRequestLock.current || !report) return;

    chatRequestLock.current = true;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch("/api/auth/healthcheck/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthReport: report, claudeText, messages: nextMessages }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Chat request failed (${res.status}).`);
      }

      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("Claude returned an empty reply.");

      setChatMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("Claude Chat Error:", error);
      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: error instanceof Error ? `Sorry, something went wrong: ${error.message}` : "Sorry, something went wrong while contacting Claude.",
        },
      ]);
    } finally {
      setChatSending(false);
      chatRequestLock.current = false;
    }
  };

  /* ---------- FAILED / PASSED ---------- */

  const failedChecks = report?.results?.filter((r) => !r.passed) ?? [];
  const passedChecks = report?.results?.filter((r) => r.passed) ?? [];

  /* ---------- PDF ---------- */

  const handleDownloadPDF = () => {
    if (!report) return;

    const names = (list?: any[]) => (list ?? []).map((x: any) => x?.name).filter(Boolean).join(", ") || "-";

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("GTM HealthCheck Report", 14, 18);

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

      currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 12;
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

    doc.save("GTM_HealthCheck_Report.pdf");
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
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Bot size={14} />
                    Claude AI Audit
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

            {claudeError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold text-red-500">
                      HealthCheck Error
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
                {claudeLoading ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                {claudeLoading ? "Analyzing…" : "Claude AI Audit"}
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
            {/* ALWAYS-VISIBLE FINDINGS SUMMARY (real data from the rules) */}

            <FindingsSummary report={report} />

            {/* CLAUDE AUDIT */}

            {claudeText && (
              <ClaudeAuditChatBlock
                claudeText={claudeText}
                claudeTruncated={claudeTruncated}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatSending={chatSending}
                onSend={handleSendChatMessage}
              />
            )}

            {/* TABLE VIEW */}

            <HealthCheckTable results={report.results} passedCount={report.passedCount} failedCount={report.failedCount} />

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
   FINDINGS SUMMARY
   Shows the real result of the cleanup rules (paused tags,
   unused items, ...) so nothing depends on the AI text.
===================================================== */

const SUMMARY_ROWS: { id: string; label: string }[] = [
  { id: "HC_LR_002", label: "Paused tags" },
  { id: "HC_LR_001", label: "Unused tags (no trigger)" },
  { id: "HC_LR_007", label: "Paused triggers" },
  { id: "HC_LR_006", label: "Unused triggers" },
  { id: "HC_LR_003", label: "Unused variables" },
  { id: "HC_HR_007", label: "Tags with missing triggers" },
  { id: "HC_HR_008", label: "Missing variable references" },
  { id: "HC_LR_008", label: "Test / debug tags" },
  { id: "HC_LR_009", label: "Generic tag names" },
  { id: "HC_LR_010", label: "Duplicate names" },
];

function FindingsSummary({ report }: { report: HealthCheckReport }) {
  const counts = report.counts ?? { tags: 0, triggers: 0, variables: 0 };

  const rows = SUMMARY_ROWS.map((row) => {
    const result = report.results.find((r) => r.id === row.id);
    const items = allAffected(result);
    return { ...row, found: Boolean(result), items };
  });

  return (
    <div className="mb-8 rounded-xl border border-line bg-card-hi overflow-hidden">
      <div className="grid grid-cols-3 border-b border-line">
        {[
          { label: "Tags", value: counts.tags },
          { label: "Triggers", value: counts.triggers },
          { label: "Variables", value: counts.variables },
        ].map((box, index) => (
          <div key={box.label} className={`px-4 py-3 ${index > 0 ? "border-l border-line" : ""}`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">{box.label} scanned</p>
            <p className="text-[22px] font-semibold text-fg leading-tight mt-1">{box.value}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-left">
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className={index > 0 ? "border-t border-line" : ""}>
              <td className="px-4 py-2.5 text-[13px] text-fg align-top w-56">{row.label}</td>

              <td className="px-4 py-2.5 align-top w-24">
                {!row.found ? (
                  <span className="text-faint text-[12px]">not run</span>
                ) : row.items.length > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-5.5 px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-(--danger)/10 text-(--danger) border border-(--danger)/20">
                    {row.items.length}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-accent text-[12px]">
                    <CheckCircle size={12} />
                    None
                  </span>
                )}
              </td>

              <td className="px-4 py-2.5 text-[12px] text-muted align-top">
                {row.items.length > 0 && (
                  <>
                    {row.items
                      .slice(0, 6)
                      .map((item: any) => item?.name || item?.id || "Unnamed")
                      .join(", ")}
                    {row.items.length > 6 && <span className="text-faint"> +{row.items.length - 6} more</span>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================
   HEALTHCHECK TABLE
===================================================== */

type TableFilter = "all" | "failed" | "passed";

function HealthCheckTable({ results, passedCount, failedCount }: { results: HealthCheckResult[]; passedCount: number; failedCount: number }) {
  const [filter, setFilter] = useState<TableFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = results.filter((r) => {
    if (filter === "failed") return !r.passed;
    if (filter === "passed") return r.passed;
    return true;
  });

  const toggleRow = (r: HealthCheckResult) => {
    if (!rowHasDetail(r)) return;
    setExpandedId((prev) => (prev === r.id ? null : r.id));
  };

  const tabs: { key: TableFilter; label: string; count: number; tone: "neutral" | "danger" | "accent" }[] = [
    { key: "all", label: "All", count: results.length, tone: "neutral" },
    { key: "failed", label: "Failed", count: failedCount, tone: "danger" },
    { key: "passed", label: "Passed", count: passedCount, tone: "accent" },
  ];

  return (
    <div>
      {/* FILTER TABS */}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map((tab) => {
          const active = filter === tab.key;

          const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors";

          const activeClass =
            tab.tone === "danger"
              ? "bg-(--danger)/10 border-(--danger)/30 text-(--danger)"
              : tab.tone === "accent"
                ? "bg-accent-soft border-accent/30 text-accent"
                : "bg-card-hi border-edge text-fg";

          const idleClass = "bg-card border-line text-muted hover:text-fg hover:border-edge";

          return (
            <button key={tab.key} type="button" onClick={() => setFilter(tab.key)} className={`${base} ${active ? activeClass : idleClass}`}>
              {tab.label}
              <span className="font-mono text-[11px] opacity-70">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* TABLE */}

      <div className="rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-card-hi border-b border-line">
                <th className="w-8 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-23">ID</th>
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">Check</th>
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-27.5">Severity</th>
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-23 text-center">Affected</th>
                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-20 text-center">Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <FragmentRow
                  key={r.id}
                  r={r}
                  detail={rowHasDetail(r)}
                  expanded={expandedId === r.id}
                  affected={affectedItemCount(r)}
                  onToggle={() => toggleRow(r)}
                />
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted">
                    No checks in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-faint">Tip: click a row to see the fix and affected items.</p>
    </div>
  );
}

/* A single check row + its expandable detail row. */
function FragmentRow({
  r,
  detail,
  expanded,
  affected,
  onToggle,
}: {
  r: HealthCheckResult;
  detail: boolean;
  expanded: boolean;
  affected: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-t border-line transition-colors ${detail ? "cursor-pointer hover:bg-card-hi" : ""} ${expanded ? "bg-card-hi" : ""}`}
      >
        <td className="px-3 py-3 align-top">
          {detail ? (
            expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-faint" />
          ) : null}
        </td>

        <td className="px-3 py-3 align-top">
          <span className="font-mono text-[11.5px] text-faint">{r.id}</span>
        </td>

        <td className="px-3 py-3 align-top">
          <p className="text-[13.5px] font-medium text-fg">{r.title}</p>

          {r.description && <p className="text-[12px] text-muted mt-0.5 leading-relaxed line-clamp-1">{r.description}</p>}
        </td>

        <td className="px-3 py-3 align-top">
          <SeverityBadge severity={r.severity} />
        </td>

        <td className="px-3 py-3 align-top text-center">
          {affected > 0 ? (
            <span className="inline-flex items-center justify-center min-w-5.5 px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-(--danger)/10 text-(--danger) border border-(--danger)/20">
              {affected}
            </span>
          ) : (
            <span className="text-faint text-[12px]">—</span>
          )}
        </td>

        <td className="px-3 py-3 align-top text-center">
          {r.passed ? (
            <span className="inline-flex items-center gap-1 text-accent text-[11.5px] font-medium">
              <CheckCircle size={13} />
              Pass
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-(--danger) text-[11.5px] font-medium">
              <XCircle size={13} />
              Fail
            </span>
          )}
        </td>
      </tr>

      {detail && expanded && (
        <tr className="border-t border-line bg-card-hi">
          <td />
          <td colSpan={5} className="px-3 pb-5 pt-1 align-top">
            {r.description && <p className="text-[13px] text-muted leading-relaxed max-w-2xl">{r.description}</p>}

            {r.recommendation && (
              <div className="mt-3 px-3 py-2 rounded-md bg-(--danger)/8 border border-(--danger)/20 text-(--danger) text-[12.5px] max-w-2xl w-fit">
                <span className="font-semibold">Fix:</span> {r.recommendation}
              </div>
            )}

            <AffectedList label="Affected Tags" items={r.affectedTags} />
            <AffectedList label="Affected Triggers" items={r.affectedTriggers} />
            <AffectedList label="Affected Variables" items={r.affectedVariables} />
            <AffectedList label="Unused Tags" items={(r as any).unusedTags} />
            <AffectedList label="Unused Triggers" items={(r as any).unusedTriggers} />
            <AffectedList label="Unused Variables" items={(r as any).unusedVariables} />
          </td>
        </tr>
      )}
    </>
  );
}

/* =====================================================
   CLAUDE AUDIT + CHAT
===================================================== */

function ClaudeAuditChatBlock({
  claudeText,
  claudeTruncated,
  chatMessages,
  chatInput,
  setChatInput,
  chatSending,
  onSend,
}: {
  claudeText: string;
  claudeTruncated: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatSending: boolean;
  onSend: () => void;
}) {
  return (
    <div className="mb-10 rounded-xl border border-line bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* TOOL */}

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card-hi">
          <Wrench size={13} className="text-muted" />
          <span className="font-mono text-[12.5px] text-fg">gtm_ai_audit</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>

        {/* CLAUDE RESPONSE */}

        <div className="text-[13.5px] text-fg leading-relaxed">{renderMarkdownLite(claudeText)}</div>

        {claudeTruncated && (
          <div className="px-3 py-2 rounded-md bg-(--warn)/8 border border-(--warn)/20 text-(--warn) text-[12px]">
            Claude response was truncated. Some audit details may be missing.
          </div>
        )}

        {/* CHAT */}

        {chatMessages.length > 0 && (
          <div className="border-t border-line pt-4 space-y-3">
            {chatMessages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${message.role === "user" ? "bg-emerald-600 text-white whitespace-pre-wrap" : "bg-card-hi border border-line text-fg"
                    }`}
                >
                  {message.role === "assistant" ? renderMarkdownLite(message.content) : message.content}
                </div>
              </div>
            ))}

            {chatSending && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3.5 py-2 bg-card-hi border border-line">
                  <Loader2 size={14} className="animate-spin text-muted" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT INPUT */}

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-card-hi px-2 py-2">
          <button
            type="button"
            disabled
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted border border-line shrink-0 opacity-50"
          >
            <Plus size={14} />
          </button>

          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!chatSending && chatInput.trim()) onSend();
              }
            }}
            placeholder="Message Claude…"
            disabled={chatSending}
            className="flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-faint outline-none px-1"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={chatSending || !chatInput.trim()}
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            {chatSending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MARKDOWN
===================================================== */

function renderMarkdownLite(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const renderInline = (line: string, key: string | number): ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <span key={key}>
        {parts.map((part, index) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index} className="font-semibold text-fg">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  };

  const flushList = (key: string | number) => {
    if (listItems.length === 0) return;

    blocks.push(
      <ul key={`list-${key}`} className="list-disc list-inside space-y-1 my-2">
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item, index)}</li>
        ))}
      </ul>
    );

    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList(index);
      blocks.push(
        <h4 key={index} className="text-[13.5px] font-semibold text-fg mt-4 mb-1.5">
          {renderInline(trimmed.slice(4), index)}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(index);
      blocks.push(
        <h3 key={index} className="text-[15px] font-semibold text-fg mt-5 mb-2">
          {renderInline(trimmed.slice(3), index)}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(index);
      blocks.push(
        <h2 key={index} className="text-[16px] font-semibold text-fg mt-5 mb-2">
          {renderInline(trimmed.slice(2), index)}
        </h2>
      );
    } else if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (trimmed === "") {
      flushList(index);
    } else {
      flushList(index);
      blocks.push(
        <p key={index} className="mb-2 last:mb-0">
          {renderInline(trimmed, index)}
        </p>
      );
    }
  });

  flushList("end");

  return blocks;
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
  const tone = severity === "HIGH" ? "var(--danger)" : severity === "MEDIUM" ? "var(--warn)" : "var(--accent)";

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-[0.12em] border"
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

function AffectedList({ label, items }: { label: string; items?: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</h4>

      <div className="flex flex-wrap gap-2">
        {items.map((item: any, index) => {
          const content = item?.name || item?.id || "Unnamed";

          if (item?.editUrl) {
            return (
              <a
                key={index}
                href={item.editUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-blue-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                {content}
              </a>
            );
          }

          return (
            <span key={index} className="rounded-md border border-line bg-card px-3 py-1.5 text-xs font-medium text-fg">
              {content}
            </span>
          );
        })}
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