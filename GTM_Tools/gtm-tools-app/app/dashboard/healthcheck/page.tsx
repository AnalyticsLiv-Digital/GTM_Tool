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
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";

type ChatMessage = { role: "user" | "assistant"; content: string; };

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  results: HealthCheckResult[];
  counts?: {
    tags?: number;
    triggers?: number;
    variables?: number;
  };
};

type ClaudeAuditResponse = {
  success: true;
  healthReport: unknown;
  resultText: string;
  truncated: boolean;
}
  | {
    success: false;
    error: string;
  };

export default function HealthCheckPage() {
  const store = useDashboardStore();

  const [loading, setLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);

  const [report, setReport] = useState<HealthCheckReport | null>(null);

  const [claudeText, setClaudeText] = useState<string | null>(null);
  const [claudeTruncated, setClaudeTruncated] = useState(false);
  const [claudeError, setClaudeError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  // ============================================================
  // RUN FUNCTIONAL HEALTH CHECK
  // ============================================================

  const handleRunHealthCheck = async () => {
    setClaudeError(null);

    const {
      selectedAccountId: accountId,
      selectedContainerId: containerId,
      selectedWorkspaceId: workspaceId,
    } = useDashboardStore.getState();

    if (!accountId || !containerId || !workspaceId) {
      setClaudeError("Select an account, container, and workspace before running the audit.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/healthcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          accountId,
          containerId,
          workspaceId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.results) {
        console.warn("HealthCheck API returned an unexpected response:", data);

        setClaudeError(data?.error || `Failed to run health check (${res.status}).`);

        return;
      }

      setReport(data);

      // Clear previous Claude result because the underlying
      // health report has changed.
      setClaudeText(null);
      setClaudeTruncated(false);
      setChatMessages([]);
    } catch (err) {
      console.error("HealthCheck Error:", err);

      setClaudeError("Something went wrong while running the health check.");
    } finally { setLoading(false); }
  };

  // ============================================================
  // CLAUDE AI AUDIT
  // ============================================================

  const handleClaudeHealthCheck = async () => {
    setClaudeError(null);

    const {
      selectedAccountId: accountId,
      selectedContainerId: containerId,
      selectedWorkspaceId: workspaceId,
    } = useDashboardStore.getState();

    if (!accountId || !containerId || !workspaceId) {
      setClaudeError("Select an account, container, and workspace before running the audit.");
      return;
    }

    try {
      setClaudeLoading(true);
      setChatMessages([]);

      const res = await fetch("/api/auth/healthcheck/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          accountId,
          containerId,
          workspaceId,
        }),
      });

      const data: ClaudeAuditResponse = await res
        .json()
        .catch(() => ({
          success: false,
          error: "Invalid response from Claude AI Audit API.",
        }));

      if (!res.ok) {
        console.error("Claude HealthCheck API Response:", data);

        setClaudeError("error" in data ? data.error : `Request failed (${res.status}).`);

        return;
      }

      if (!data.success) {
        console.error("Claude HealthCheck Error:", data.error);

        setClaudeError(data.error);

        return;
      }

      setReport(data.healthReport as HealthCheckReport);
      setClaudeText(data.resultText);
      setClaudeTruncated(data.truncated);
    } catch (err) {
      console.error("Claude AI Audit Error:", err);

      setClaudeError("Something went wrong while running the Claude AI Audit.");
    } finally { setClaudeLoading(false); }
  };

  // ============================================================
  // CLAUDE FOLLOW-UP CHAT
  // ============================================================

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();

    if (!text || chatSending || !report) {
      return;
    }

    const nextMessages: ChatMessage[] = [...chatMessages,
    { role: "user", content: text, },];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch("/api/auth/healthcheck/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          healthReport: report,
          claudeText,
          messages: nextMessages,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setChatMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: `Sorry, something went wrong: ${data?.error || res.status
              }`,
          },
        ]);

        return;
      }

      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply || "Claude returned an empty response.",
        },
      ]);
    } catch (err) {
      console.error("Claude Chat Error:", err);

      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: "Sorry, something went wrong sending that message.", },]);
    } finally {
      setChatSending(false);
    }
  };

  // ============================================================
  // FAILED / PASSED CHECKS
  // ============================================================

  const failedChecks = (report?.results || []).filter((r) => !r.passed);

  const passedChecks = (report?.results || []).filter((r) => r.passed);

  // ============================================================
  // PDF DOWNLOAD
  // ============================================================

  const handleDownloadPDF = () => {
    if (!report) return;

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

        head: [
          [
            "ID",
            "Title",
            "Severity",
            "Affected Items",
          ],
        ],

        body: failedChecks.map((r) => [
          r.id,
          r.title,
          r.severity,

          `Tags: ${(r.affectedTags || [])
            .map((x: any) => x.name)
            .join(", ") || "-"
          }

Triggers: ${(r.affectedTriggers || [])
            .map((x: any) => x.name)
            .join(", ") || "-"
          }

Vars: ${(r.affectedVariables || [])
            .map((x: any) => x.name)
            .join(", ") || "-"
          }`,
        ]),

        styles: {
          fontSize: 9,
          cellPadding: 2,
        },

        headStyles: {
          fontSize: 10,
        },
      });

      const lastY =
        (doc as any).lastAutoTable?.finalY ||
        currentY;

      currentY = lastY + 12;
    }

    if (passedChecks.length > 0) {
      doc.setFontSize(14);
      doc.text("Passed Checks", 14, currentY);

      currentY += 6;

      autoTable(doc, {
        startY: currentY,

        head: [["ID", "Title"]],

        body: passedChecks.map((r) => [
          r.id,
          r.title,
        ]),

        styles: {
          fontSize: 10,
          cellPadding: 2,
        },

        headStyles: {
          fontSize: 11,
        },
      });
    }

    doc.save("GTM_HealthCheck_Report.pdf");
  };

  // ============================================================
  // SCORE / GRADE
  // ============================================================

  const grade = report ? report.score >= 80 ? "A" : report.score >= 50 ? "B" : "C" : "";

  const verdictColor = report && report.score >= 80 ? "var(--success)" : report && report.score >= 50 ? "var(--warn)" : "var(--danger)";

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div>
      {/* ========================================================
          EMPTY STATE
      ======================================================== */}

      {!report && (
        <section className="relative max-w-4xl mx-auto py-16 text-center overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />

          <div className="hero-glow" />

          <div className="relative">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent mb-4">
              GTM HealthCheck
            </p>

            <h2 className="text-[clamp(34px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-fg">
              Audit your tag manager,
              <br />
              <span className="text-accent accent-glow-text">
                in seconds
              </span>
              .
            </h2>

            <p className="mt-5 text-[15.5px] text-muted max-w-xl mx-auto leading-relaxed">
              Find tracking issues, unused tags, duplicate
              triggers, broken variables, and performance
              bottlenecks with a complete container audit.
            </p>

            <div className="mt-9 flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleRunHealthCheck}
                disabled={
                  loading ||
                  !store.selectedWorkspaceId
                }
                className="btn-primary px-5! py-2.5!"
              >
                <Zap size={14} />

                {loading
                  ? "Running…"
                  : "Run HealthCheck"}
              </button>

              <button
                onClick={handleClaudeHealthCheck}
                disabled={
                  claudeLoading ||
                  !store.selectedWorkspaceId
                }
                className="btn-secondary px-5! py-2.5!"
              >
                <Bot size={14} />

                {claudeLoading
                  ? "Analyzing…"
                  : "Claude AI Audit"}
              </button>
            </div>

            {!store.selectedWorkspaceId && (
              <p className="mt-4 text-[12.5px] text-(--warn)">
                Select a workspace before running the audit.
              </p>
            )}

            {claudeError && (
              <p className="mt-4 text-[12.5px] text-(--danger)">
                {claudeError}
              </p>
            )}

            <div className="mt-12 flex justify-center gap-3 flex-wrap">
              <Badge
                icon={
                  <CheckCircle
                    size={13}
                    strokeWidth={2}
                  />
                }
                label="Secure & fast"
              />

              <Badge
                icon={
                  <ShieldCheck
                    size={13}
                    strokeWidth={2}
                  />
                }
                label="Workspace-safe"
              />

              <Badge
                icon={
                  <Zap
                    size={13}
                    strokeWidth={2}
                  />
                }
                label="Automated"
              />
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          REPORT
      ======================================================== */}

      {report && (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          {/* ====================================================
              REPORT HEADER
          ==================================================== */}

          <div className="p-6 md:p-7 border-b border-line">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint mb-2">
                  HealthCheck report
                </p>

                <h2 className="text-[24px] md:text-[28px] font-semibold text-fg tracking-[-0.02em]">
                  Container audit
                </h2>

                <p className="text-[13px] text-muted mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />

                    {report.passedCount} passed
                  </span>

                  <span className="text-faint">
                    ·
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--danger)" />

                    {report.failedCount} failed
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    Score
                  </p>

                  <p className="text-[40px] font-semibold text-fg leading-none tracking-[-0.04em] mt-1">
                    {report.score}

                    <span className="text-[18px] text-faint ml-1">
                      %
                    </span>
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

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleRunHealthCheck}
                disabled={loading}
                className="btn-secondary py-2! disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  strokeWidth={2}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />

                {loading
                  ? "Refreshing…"
                  : "Refresh"}
              </button>

              <button
                onClick={handleClaudeHealthCheck}
                disabled={
                  claudeLoading ||
                  !store.selectedWorkspaceId
                }
                title={
                  !store.selectedWorkspaceId
                    ? "Select a workspace first"
                    : undefined
                }
                className="btn-secondary py-2! disabled:opacity-50"
              >
                <Bot
                  size={13}
                  strokeWidth={2.2}
                />

                {claudeLoading
                  ? "Analyzing…"
                  : "Claude AI Audit"}
              </button>

              <button
                onClick={handleDownloadPDF}
                className="btn-primary py-2!"
              >
                <Download
                  size={13}
                  strokeWidth={2.2}
                />

                Download PDF
              </button>
            </div>

            {claudeError && (
              <p className="mt-3 text-[12.5px] text-(--danger)">
                {claudeError}
              </p>
            )}
          </div>

          {/* ====================================================
              REPORT BODY
          ==================================================== */}

          <div className="p-6 md:p-7">
            {claudeText && (
              <ClaudeAuditChatBlock
                report={report}
                claudeText={claudeText}
                claudeTruncated={claudeTruncated}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatSending={chatSending}
                onSend={handleSendChatMessage}
              />
            )}

            {/* ==================================================
                FAILED CHECKS
            ================================================== */}

            <div>
              <div className="flex items-center gap-2 mb-5">
                <XCircle
                  size={15}
                  strokeWidth={2.2}
                  className="text-(--danger)"
                />

                <h3 className="text-[15px] font-semibold text-fg">
                  Failed checks

                  <span className="text-faint font-normal ml-1.5">
                    ({failedChecks.length})
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {failedChecks.map((r) => (
                  <FailedCheckCard
                    key={r.id}
                    r={r}
                  />
                ))}

                {failedChecks.length === 0 && (
                  <div className="px-4 py-5 rounded-lg bg-accent-soft border border-accent/25 text-accent text-[13.5px] flex items-center gap-2">
                    <CheckCircle
                      size={15}
                      strokeWidth={2}
                    />

                    No failed checks. Your container
                    looks healthy.
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                PASSED CHECKS
            ================================================== */}

            {passedChecks.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle
                    size={15}
                    strokeWidth={2.2}
                    className="text-accent"
                  />

                  <h3 className="text-[15px] font-semibold text-fg">
                    Passed checks

                    <span className="text-faint font-normal ml-1.5">
                      ({passedChecks.length})
                    </span>
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {passedChecks.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-line bg-card-hi p-4 transition-colors hover:border-edge"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium text-fg">
                            <span className="font-mono text-[11px] text-faint mr-1.5">
                              {r.id}
                            </span>

                            {r.title}
                          </p>

                          <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">
                            {r.description}
                          </p>
                        </div>

                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-accent-soft text-accent border border-accent/25">
                          Pass
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================================================
                NOTE
            ================================================== */}

            <div className="mt-10 flex items-start gap-3 p-4 rounded-lg border border-line bg-card-hi">
              <AlertTriangle
                size={15}
                strokeWidth={2}
                className="text-(--warn) mt-0.5 shrink-0"
              />

              <p className="text-[13px] text-muted leading-relaxed">
                <span className="font-medium text-fg">
                  Note:
                </span>{" "}
                This report is based on best-practice GTM
                rules and automated scanning. Always validate
                in Preview Mode before publishing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          WHY HEALTHCHECK
      ======================================================== */}

      {!report && (
        <section className="border-t border-line mt-16 pt-16">
          <div className="text-center mb-10">
            <h3 className="text-[26px] font-semibold text-fg tracking-[-0.02em]">
              Why HealthCheck?
            </h3>

            <p className="text-muted mt-2 max-w-xl mx-auto text-[14.5px]">
              Improve tracking accuracy, reduce container
              clutter, and optimize tag performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={
                <BarChart3
                  size={18}
                  strokeWidth={1.7}
                />
              }
              accent="#3b82f6"
              title="Tag performance audit"
              body="Identify slow tags, excessive triggers, and unnecessary execution that impact load time."
            />

            <FeatureCard
              icon={
                <ShieldCheck
                  size={18}
                  strokeWidth={1.7}
                />
              }
              accent="#10b981"
              title="Tracking validation"
              body="Validate tag firing logic, variable configuration, and ensure correct analytics tracking."
            />

            <FeatureCard
              icon={
                <FileText
                  size={18}
                  strokeWidth={1.7}
                />
              }
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

// ============================================================
// CLAUDE AUDIT CHAT BLOCK
// ============================================================

function ClaudeAuditChatBlock({
  report,
  claudeText,
  claudeTruncated,
  chatMessages,
  chatInput,
  setChatInput,
  chatSending,
  onSend,
}: {
  report: HealthCheckReport | null;
  claudeText: string;
  claudeTruncated: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatSending: boolean;
  onSend: () => void;
}) {
  const counts = report?.counts;

  const findResult = (id: string) =>
    report?.results?.find(
      (r) => r.id === id
    ) as any;

  const pausedTagsResult =
    findResult("HC_LR_002");

  const unusedVariablesResult =
    findResult("HC_LR_003");

  const largeTriggersResult =
    findResult("HC_LR_005");

  const pausedCount =
    pausedTagsResult?.affectedTags?.length ?? 0;

  const unusedVariablesCount =
    unusedVariablesResult?.affectedVariables?.length ?? 0;

  const entityRows = [
    {
      entity: "Tags",
      count: counts?.tags ?? 0,
      status:
        pausedCount > 0
          ? `${pausedCount} paused`
          : "Healthy",
    },

    {
      entity: "Triggers",
      count: counts?.triggers ?? 0,
      status:
        largeTriggersResult &&
          largeTriggersResult.passed === false
          ? "Review size"
          : "Healthy",
    },

    {
      entity: "Variables",
      count: counts?.variables ?? 0,
      status:
        unusedVariablesCount > 0
          ? `${unusedVariablesCount} unused`
          : "Healthy",
    },
  ];

  return (
    <div className="mb-10 rounded-xl border border-line bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* AI TOOL HEADER */}

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card-hi">
          <Wrench
            size={13}
            strokeWidth={2}
            className="text-muted"
          />

          <span className="font-mono text-[12.5px] text-fg">
            gtm_ai_audit
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>

        {/* ENTITY TABLE */}

        <div className="rounded-lg border border-line overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-card-hi border-b border-line">
                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">
                  Entity
                </th>

                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">
                  Count
                </th>

                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {entityRows.map((row, i) => (
                <tr
                  key={row.entity}
                  className={
                    i > 0
                      ? "border-t border-line"
                      : ""
                  }
                >
                  <td className="px-4 py-2.5 text-[13px] text-fg">
                    {row.entity}
                  </td>

                  <td className="px-4 py-2.5 text-[13px] text-fg">
                    {row.count}
                  </td>

                  <td className="px-4 py-2.5 text-[13px] text-muted">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CLAUDE RESULT */}

        <div className="text-[13.5px] text-fg leading-relaxed">
          {renderMarkdownLite(claudeText)}
        </div>

        {claudeTruncated && (
          <p className="text-[12px] text-(--warn)">
            Note: this response may have been cut off before
            Claude finished.
          </p>
        )}

        {/* CHAT MESSAGES */}

        {chatMessages.length > 0 && (
          <div className="space-y-3 pt-2">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user"
                  ? "justify-end"
                  : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${m.role === "user"
                    ? "bg-emerald-600 text-white whitespace-pre-wrap"
                    : "bg-card-hi border border-line text-fg"
                    }`}
                >
                  {m.role === "assistant"
                    ? renderMarkdownLite(
                      m.content
                    )
                    : m.content}
                </div>
              </div>
            ))}

            {chatSending && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3.5 py-2 bg-card-hi border border-line">
                  <Loader2
                    size={14}
                    className="animate-spin text-muted"
                  />
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
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card border border-line shrink-0"
          >
            <Plus size={14} />
          </button>

          <input
            type="text"
            value={chatInput}
            onChange={(e) =>
              setChatInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Message Claude…"
            disabled={chatSending}
            className="flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-faint outline-none px-1"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={
              chatSending ||
              !chatInput.trim()
            }
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <ArrowUp
              size={15}
              strokeWidth={2.4}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MARKDOWN RENDERER
// ============================================================

function renderMarkdownLite(
  text: string
): React.ReactNode[] {
  const lines = text.split("\n");

  const blocks: React.ReactNode[] = [];

  let listItems: string[] = [];

  const renderInline = (
    line: string,
    key: string | number
  ): React.ReactNode => {
    const parts = line.split(
      /(\*\*[^*]+\*\*)/g
    );

    return (
      <span key={key}>
        {parts.map((part, i) =>
          part.startsWith("**") &&
            part.endsWith("**") ? (
            <strong
              key={i}
              className="font-semibold text-fg"
            >
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const flushList = (
    key: string | number
  ) => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      <ul
        key={`list-${key}`}
        className="list-disc list-inside space-y-1 my-2"
      >
        {listItems.map((item, i) => (
          <li key={i}>
            {renderInline(item, i)}
          </li>
        ))}
      </ul>
    );

    listItems = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList(idx);

      blocks.push(
        <h4
          key={idx}
          className="text-[13.5px] font-semibold text-fg mt-4 mb-1.5"
        >
          {renderInline(
            trimmed.slice(4),
            idx
          )}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(idx);

      blocks.push(
        <h3
          key={idx}
          className="text-[15px] font-semibold text-fg mt-5 mb-2 first:mt-0"
        >
          {renderInline(
            trimmed.slice(3),
            idx
          )}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(idx);

      blocks.push(
        <h2
          key={idx}
          className="text-[16px] font-semibold text-fg mt-5 mb-2 first:mt-0"
        >
          {renderInline(
            trimmed.slice(2),
            idx
          )}
        </h2>
      );
    } else if (
      /^[-*]\s+/.test(trimmed)
    ) {
      listItems.push(
        trimmed.replace(
          /^[-*]\s+/,
          ""
        )
      );
    } else if (trimmed === "") {
      flushList(idx);
    } else {
      flushList(idx);

      blocks.push(
        <p
          key={idx}
          className="mb-2 last:mb-0"
        >
          {renderInline(trimmed, idx)}
        </p>
      );
    }
  });

  flushList("end");

  return blocks;
}

// ============================================================
// BADGE
// ============================================================

function Badge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-line text-[12.5px] text-muted">
      <span className="text-accent">
        {icon}
      </span>

      {label}
    </span>
  );
}

// ============================================================
// SEVERITY BADGE
// ============================================================

function SeverityBadge({
  severity,
}: {
  severity: string;
}) {
  const tone =
    severity === "HIGH"
      ? "var(--danger)"
      : severity === "MEDIUM"
        ? "var(--warn)"
        : "var(--accent)";

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

// ============================================================
// FAILED CHECK CARD
// ============================================================

function FailedCheckCard({
  r,
}: {
  r: HealthCheckResult;
}) {
  return (
    <div className="rounded-lg border border-(--danger)/25 bg-card p-5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg">
            <span className="font-mono text-[11px] text-faint mr-1.5">
              {r.id}
            </span>

            {r.title}
          </p>

          <p className="text-[13px] text-muted mt-2 leading-relaxed">
            {r.description}
          </p>

          {r.recommendation && (
            <div className="mt-3 px-3 py-2 rounded-md text-[12.5px] bg-(--danger)/8 border border-(--danger)/20 text-(--danger)">
              <span className="font-semibold">
                Fix:
              </span>{" "}
              {r.recommendation}
            </div>
          )}

          {/* UNUSED TAGS */}

          <AffectedList
            label="Unused Tags"
            items={(r as any).unusedTags || []}
          />

          {/* PAUSED TAGS */}

          <AffectedList
            label="Paused Tags"
            items={(r as any).pausedTags || []}
          />

          {/* AFFECTED TAGS */}

          <AffectedList
            label="Affected Tags"
            items={r.affectedTags}
            itemType="tags"
          />

          {/* AFFECTED TRIGGERS */}

          <AffectedList
            label="Affected Triggers"
            items={r.affectedTriggers}
            itemType="triggers"
          />

          {/* UNUSED TRIGGERS */}

          <AffectedList
            label="Unused Triggers"
            items={
              (r as any).unusedTriggers || []
            }
          />

          {/* AFFECTED VARIABLES */}

          <AffectedList
            label="Affected Variables"
            items={r.affectedVariables}
            itemType="variables"
          />

          {/* UNUSED VARIABLES */}

          <AffectedList
            label="Unused Variables"
            items={
              (r as any).unusedVariables || []
            }
          />
        </div>

        <div className="shrink-0">
          <SeverityBadge
            severity={r.severity}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AFFECTED LIST
// ============================================================

function AffectedList({
  label,
  items,
}: {
  label: string;
  items?: any[];
  itemType?:
  | "tags"
  | "triggers"
  | "variables";
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
      </h4>

      <div className="flex flex-wrap gap-2">
        {items.map(
          (item: any, index: number) => (
            <a
              key={index}
              href={item.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-1.5
                text-xs
                font-medium
                text-gray-900
                hover:bg-blue-50
                transition-colors
                dark:bg-gray-800
                dark:border-gray-600
                dark:text-white
                dark:hover:bg-gray-700
              "
            >
              {item.name}
            </a>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// FEATURE CARD
// ============================================================

function FeatureCard({
  icon,
  accent,
  title,
  body,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card p-6 rounded-xl border border-line transition-all hover:border-edge hover:bg-card-hi">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
        style={{
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </div>

      <h4 className="text-[15px] font-semibold text-fg mb-1.5">
        {title}
      </h4>

      <p className="text-[13px] text-muted leading-relaxed">
        {body}
      </p>
    </div>
  );
}