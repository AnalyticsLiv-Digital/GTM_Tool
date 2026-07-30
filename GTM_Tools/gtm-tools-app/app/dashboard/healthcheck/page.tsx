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

type ChatMessage = { role: "user" | "assistant"; content: string };

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  results: HealthCheckResult[];
};

// Matches the actual shape returned by /api/auth/healthcheck/ai
type ClaudeRuleInsight = {
  id: string;
  status: "pass" | "fail";
  insight: string;
};

type ClaudeAuditReport = {
  healthScore: number;
  summary: string;
  ruleBreakdown: ClaudeRuleInsight[];
  criticalIssues: string[];
  recommendations: string[];
  priority: string[];
};

type ClaudeAuditResponse =
  | { success: true; healthReport: unknown; report: ClaudeAuditReport }
  | { success: true; healthReport: unknown; report: null; rawText: string; parseError: string }
  | { success: false; error: string };

export default function HealthCheckPage() {
  const store = useDashboardStore();
  const [loading, setLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);

  const [report, setReport] = useState<HealthCheckReport | null>(null);

  // --- NEW: state to actually hold + surface the Claude AI result ---
  const [claudeReport, setClaudeReport] = useState<ClaudeAuditReport | null>(null);
  const [claudeRawText, setClaudeRawText] = useState<string | null>(null);
  const [claudeError, setClaudeError] = useState<string | null>(null);

  // --- NEW: follow-up chat thread underneath the Claude AI Audit result ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const handleRunHealthCheck = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/healthcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: store.selectedAccountId,
          containerId: store.selectedContainerId,
          workspaceId: store.selectedWorkspaceId,
        }),
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaudeHealthCheck = async () => {
    setClaudeError(null);
    setClaudeRawText(null);

    try {
      setClaudeLoading(true);
      setChatMessages([]);

      // Fully independent of "Run HealthCheck" — this route fetches and
      // computes its own GTM report server-side, so this call never
      // touches /api/auth/healthcheck at all.
      const res = await fetch("/api/auth/healthcheck/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: store.selectedAccountId,
          containerId: store.selectedContainerId,
          workspaceId: store.selectedWorkspaceId,
        }),
      });

      const data: ClaudeAuditResponse = await res.json();

      if (!res.ok || !data.success) {
        const message = "error" in data ? data.error : `Request failed (${res.status}).`;
        console.error(message);
        setClaudeError(message);
        return;
      }

      // The AI route returns its own independently-computed healthReport —
      // use it to populate the rest of the page (score, pass/fail lists, PDF).
      setReport(data.healthReport as HealthCheckReport);

      if (data.report) {
        setClaudeReport(data.report);
      } else {
        setClaudeRawText(data.rawText);
        setClaudeError(`Couldn't parse Claude's response as JSON: ${data.parseError}`);
      }
    } catch (err) {
      console.error(err);
      setClaudeError("Something went wrong while running the Claude AI Audit.");
    } finally {
      setClaudeLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatSending || !report) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch("/api/auth/healthcheck/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthReport: report,
          claudeReport,
          messages: nextMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setChatMessages([
          ...nextMessages,
          { role: "assistant", content: `Sorry, something went wrong: ${data.error || res.status}` },
        ]);
        return;
      }

      setChatMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: "Sorry, something went wrong sending that message." },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  const failedChecks = (report?.results || []).filter((r) => !r.passed);
  const passedChecks = (report?.results || []).filter((r) => r.passed);

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
        head: [["ID", "Title", "Severity", "Affected Items"]],
        body: failedChecks.map((r) => [
          r.id,
          r.title,
          r.severity,
          `Tags: ${(r.affectedTags || []).map((x: any) => x.name).join(", ") || "-"}
Triggers: ${(r.affectedTriggers || []).map((x: any) => x.name).join(", ") || "-"}
Vars: ${(r.affectedVariables || []).map((x: any) => x.name).join(", ") || "-"}`,
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fontSize: 10 },
      });

      const lastY = (doc as any).lastAutoTable?.finalY || currentY;
      currentY = lastY + 12;
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

      const lastY = (doc as any).lastAutoTable?.finalY || currentY;
      currentY = lastY + 12;
    }

    doc.save("GTM_HealthCheck_Report.pdf");
  };

  // Grade & verdict
  const grade = report ? (report.score >= 80 ? "A" : report.score >= 50 ? "B" : "C") : "";
  const verdictColor =
    report && report.score >= 80 ? "var(--success)" : report && report.score >= 50 ? "var(--warn)" : "var(--danger)";

  return (
    <div>
      {/* HERO — shown before a report exists */}
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
              <span className="text-accent accent-glow-text">in seconds</span>.
            </h2>

            <p className="mt-5 text-[15.5px] text-muted max-w-xl mx-auto leading-relaxed">
              Find tracking issues, unused tags, duplicate triggers, broken variables,
              and performance bottlenecks with a complete container audit.
            </p>

            <div className="mt-9 flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleRunHealthCheck}
                disabled={loading || !store.selectedWorkspaceId}
                className="btn-primary px-5! py-2.5!"
              >
                <Zap size={14} />
                {loading ? "Running…" : "Run HealthCheck"}
              </button>

              {/*
                Both buttons are now independently clickable — Claude AI
                Audit runs its own base health check first if one doesn't
                exist yet, instead of requiring "Run HealthCheck" first.
              */}
              <button
                onClick={handleClaudeHealthCheck}
                disabled={claudeLoading || !store.selectedWorkspaceId}
                className="btn-secondary px-5! py-2.5!"
              >
                <Bot size={14} />
                {claudeLoading ? "Analyzing…" : "Claude AI Audit"}
              </button>
            </div>

            {!store.selectedWorkspaceId && (
              <p className="mt-4 text-[12.5px] text-(--warn)">
                Select a workspace before running the audit.
              </p>
            )}

            {claudeError && (
              <p className="mt-4 text-[12.5px] text-(--danger)">{claudeError}</p>
            )}

            <div className="mt-12 flex justify-center gap-3 flex-wrap">
              <Badge icon={<CheckCircle size={13} strokeWidth={2} />} label="Secure & fast" />
              <Badge icon={<ShieldCheck size={13} strokeWidth={2} />} label="Workspace-safe" />
              <Badge icon={<Zap size={13} strokeWidth={2} />} label="Automated" />
            </div>
          </div>
        </section>
      )}

      {/* REPORT */}
      {report && (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          {/* Report header */}
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

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleRunHealthCheck}
                disabled={loading}
                className="btn-secondary py-2! disabled:opacity-50"
              >
                <RefreshCw size={13} strokeWidth={2} className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing…" : "Refresh"}
              </button>

              <button
                onClick={handleClaudeHealthCheck}
                disabled={claudeLoading}
                className="btn-secondary py-2! disabled:opacity-50"
              >
                <Bot size={13} strokeWidth={2.2} />
                {claudeLoading ? "Analyzing…" : "Claude AI Audit"}
              </button>

              <button onClick={handleDownloadPDF} className="btn-primary py-2!">
                <Download size={13} strokeWidth={2.2} />
                Download PDF
              </button>
            </div>

            {claudeError && (
              <p className="mt-3 text-[12.5px] text-(--danger)">{claudeError}</p>
            )}
          </div>

          {/* Body */}
          <div className="p-6 md:p-7">
            {/* Claude AI Audit — chat/tool-call style result */}
            {(claudeReport || claudeRawText) && (
              <ClaudeAuditChatBlock
                report={report}
                claudeReport={claudeReport}
                claudeRawText={claudeRawText}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                chatSending={chatSending}
                onSend={handleSendChatMessage}
              />
            )}

            {/* Failed checks */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <XCircle size={15} strokeWidth={2.2} className="text-(--danger)" />
                <h3 className="text-[15px] font-semibold text-fg">
                  Failed checks
                  <span className="text-faint font-normal ml-1.5">({failedChecks.length})</span>
                </h3>
              </div>

              <div className="space-y-3">
                {failedChecks.map((r) => (
                  <FailedCheckCard key={r.id} r={r} />
                ))}

                {failedChecks.length === 0 && (
                  <div className="px-4 py-5 rounded-lg bg-accent-soft border border-accent/25 text-accent text-[13.5px] flex items-center gap-2">
                    <CheckCircle size={15} strokeWidth={2} />
                    No failed checks. Your container looks healthy.
                  </div>
                )}
              </div>
            </div>

            {/* Passed checks */}
            {passedChecks.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={15} strokeWidth={2.2} className="text-accent" />
                  <h3 className="text-[15px] font-semibold text-fg">
                    Passed checks
                    <span className="text-faint font-normal ml-1.5">({passedChecks.length})</span>
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
                            <span className="font-mono text-[11px] text-faint mr-1.5">{r.id}</span>
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

            {/* Note */}
            <div className="mt-10 flex items-start gap-3 p-4 rounded-lg border border-line bg-card-hi">
              <AlertTriangle size={15} strokeWidth={2} className="text-(--warn) mt-0.5 shrink-0" />
              <p className="text-[13px] text-muted leading-relaxed">
                <span className="font-medium text-fg">Note:</span> This report is based on best-practice
                GTM rules and automated scanning. Always validate in Preview Mode before publishing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES — only when no report */}
      {!report && (
        <section className="border-t border-line mt-16 pt-16">
          <div className="text-center mb-10">
            <h3 className="text-[26px] font-semibold text-fg tracking-[-0.02em]">
              Why HealthCheck?
            </h3>

            <p className="text-muted mt-2 max-w-xl mx-auto text-[14.5px]">
              Improve tracking accuracy, reduce container clutter, and optimize tag performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<BarChart3 size={18} strokeWidth={1.7} />}
              accent="#3b82f6"
              title="Tag performance audit"
              body="Identify slow tags, excessive triggers, and unnecessary execution that impact load time."
            />
            <FeatureCard
              icon={<ShieldCheck size={18} strokeWidth={1.7} />}
              accent="#10b981"
              title="Tracking validation"
              body="Validate tag firing logic, variable configuration, and ensure correct analytics tracking."
            />
            <FeatureCard
              icon={<FileText size={18} strokeWidth={1.7} />}
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

/* ──────────────────────────────────────── helpers */

function ClaudeAuditChatBlock({
  report,
  claudeReport,
  claudeRawText,
  chatMessages,
  chatInput,
  setChatInput,
  chatSending,
  onSend,
}: {
  report: HealthCheckReport | null;
  claudeReport: ClaudeAuditReport | null;
  claudeRawText: string | null;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatSending: boolean;
  onSend: () => void;
}) {
  // The live backend already returns a top-level `counts` object
  // ({ tags, triggers, variables }) on the report — use that directly
  // instead of hunting for a summary rule that isn't in the deployed
  // rule set (there is no HC_LR_006 in the actual results array).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const counts = (report as any)?.counts as
    | { tags?: number; triggers?: number; variables?: number }
    | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findResult = (id: string) => report?.results.find((r) => r.id === id) as any;

  const pausedTagsResult = findResult("HC_LR_002"); // "Paused Tags Found"
  const unusedVariablesResult = findResult("HC_LR_003"); // "Unused Variables Found"
  const largeTriggersResult = findResult("HC_LR_005"); // "Large Number of Triggers"

  const pausedCount: number = pausedTagsResult?.affectedTags?.length ?? 0;
  const unusedVariablesCount: number = unusedVariablesResult?.affectedVariables?.length ?? 0;

  const entityRows = [
    {
      entity: "Tags",
      count: counts?.tags ?? 0,
      status: pausedCount > 0 ? `${pausedCount} paused` : "Healthy",
    },
    {
      entity: "Triggers",
      count: counts?.triggers ?? 0,
      status:
        largeTriggersResult && largeTriggersResult.passed === false
          ? "Review size"
          : "Healthy",
    },
    {
      entity: "Variables",
      count: counts?.variables ?? 0,
      status: unusedVariablesCount > 0 ? `${unusedVariablesCount} unused` : "Healthy",
    },
  ];

  return (
    <div className="mb-10 rounded-xl border border-line bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Tool-call pill */}
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card-hi">
          <Wrench size={13} strokeWidth={2} className="text-muted" />
          <span className="font-mono text-[12.5px] text-fg">gtm_ai_audit</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>

        {/* Entity / Count / Status table */}
        <div className="rounded-lg border border-line overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-card-hi border-b border-line">
                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">Entity</th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">Count</th>
                <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {entityRows.map((row, i) => (
                <tr key={row.entity} className={i > 0 ? "border-t border-line" : ""}>
                  <td className="px-4 py-2.5 text-[13px] text-fg">{row.entity}</td>
                  <td className="px-4 py-2.5 text-[13px] text-fg">{row.count}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Claude's natural-language takeaway */}
        {claudeReport && (
          <p className="text-[13.5px] text-fg leading-relaxed">
            {claudeReport.summary}
            {claudeReport.criticalIssues?.length > 0 && (
              <>
                {" "}
                I found {claudeReport.criticalIssues.length} issue
                {claudeReport.criticalIssues.length === 1 ? "" : "s"} worth reviewing before the
                next release.
              </>
            )}
          </p>
        )}

        {/* Per-rule breakdown — one entry per rule, guaranteed by the prompt,
            so nothing gets silently dropped from a capped top-N summary */}
        {claudeReport?.ruleBreakdown && claudeReport.ruleBreakdown.length > 0 && (
          <div className="rounded-lg border border-line overflow-hidden">
            <div className="px-4 py-2.5 bg-card-hi border-b border-line">
              <span className="text-[12px] font-semibold text-muted">
                Rule-by-rule breakdown ({claudeReport.ruleBreakdown.length})
              </span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-card-hi border-b border-line">
                  <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">Rule</th>
                  <th className="px-4 py-2.5 text-[12px] font-semibold text-muted w-20">Status</th>
                  <th className="px-4 py-2.5 text-[12px] font-semibold text-muted">Insight</th>
                </tr>
              </thead>
              <tbody>
                {claudeReport.ruleBreakdown.map((rule, i) => {
                  const localTitle =
                    report?.results.find((r) => r.id === rule.id)?.title ?? rule.id;

                  return (
                    <tr key={rule.id} className={i > 0 ? "border-t border-line" : ""}>
                      <td className="px-4 py-2.5 text-[13px] text-fg align-top">
                        <span className="font-mono text-[11px] text-faint block mb-0.5">
                          {rule.id}
                        </span>
                        {localTitle}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border ${
                            rule.status === "pass"
                              ? "bg-accent-soft text-accent border-accent/25"
                              : "bg-(--danger)/10 text-(--danger) border-(--danger)/25"
                          }`}
                        >
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12.5px] text-muted align-top">
                        {rule.insight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!claudeReport && claudeRawText && (
          <pre className="text-[12.5px] text-fg leading-relaxed whitespace-pre-wrap font-sans">
            {claudeRawText}
          </pre>
        )}

        {/* Follow-up chat thread */}
        {chatMessages.length > 0 && (
          <div className="space-y-3 pt-2">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-accent text-white"
                      : "bg-card-hi border border-line text-fg"
                  }`}
                >
                  {m.content}
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

      {/* Chat input */}
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
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
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
            disabled={chatSending || !chatInput.trim()}
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <ArrowUp size={15} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-line text-[12.5px] text-muted">
      <span className="text-accent">{icon}</span>
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === "HIGH" ? "var(--danger)" : severity === "MEDIUM" ? "var(--warn)" : "var(--accent)";
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

function FailedCheckCard({ r }: { r: HealthCheckResult }) {
  return (
    <div className="rounded-lg border border-(--danger)/25 bg-card p-5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg">
            <span className="font-mono text-[11px] text-faint mr-1.5">{r.id}</span>
            {r.title}
          </p>

          <p className="text-[13px] text-muted mt-2 leading-relaxed">{r.description}</p>
          {r.recommendation && (
            <div className="mt-3 px-3 py-2 rounded-md text-[12.5px] bg-(--danger)/8 border border-(--danger)/20 text-(--danger)">
              <span className="font-semibold">Fix:</span> {r.recommendation}
            </div>
          )}

          {/* Unused Tags */}
          <AffectedList
            label="Unused Tags"
            items={(r as any).unusedTags || []}
          />

          {/* Paused Tags */}
          <AffectedList
            label="Paused Tags"
            items={(r as any).pausedTags || []}
          />

          {/* Affected Tags */}
          <AffectedList
            label="Affected Tags"
            items={r.affectedTags}
          />

          {/* Affected Triggers */}
          <AffectedList
            label="Affected Triggers"
            items={r.affectedTriggers}
          />

          {/* Unused Triggers */}
          <AffectedList
            label="Unused Triggers"
            items={(r as any).unusedTriggers || []}
          />

          {/* Affected Variables */}
          <AffectedList
            label="Affected Variables"
            items={r.affectedVariables}
          />

          {/* Unused Variables */}
          <AffectedList
            label="Unused Variables"
            items={(r as any).unusedVariables || []}
          />
        </div>

        <div className="shrink-0">
          <SeverityBadge severity={r.severity} />
        </div>
      </div>
    </div>
  );
}

function AffectedList({
  label,
  items,
}: {
  label: string;
  items?: any[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
      </h4>

      <div className="flex flex-wrap gap-2">
        {items.map((item: any, index: number) => (
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
        ))}
      </div>
    </div>
  );
}

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
      <h4 className="text-[15px] font-semibold text-fg mb-1.5">{title}</h4>
      <p className="text-[13px] text-muted leading-relaxed">{body}</p>
    </div>
  );
}