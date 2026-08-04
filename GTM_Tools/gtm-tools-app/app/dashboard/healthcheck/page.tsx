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
import {
  useRef,
  useState,
  type ReactNode,
} from "react";

import { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HealthCheckCounts = {
  tags: number;
  triggers: number;
  variables: number;
};

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  counts?: HealthCheckCounts;
  results: HealthCheckResult[];
};

type HealthCheckApiResponse = {
  success?: boolean;
  healthReport?: HealthCheckReport;
  report?: HealthCheckReport;
  score?: number;
  passedCount?: number;
  failedCount?: number;
  counts?: HealthCheckCounts;
  results?: HealthCheckResult[];
  error?: string;
};

type ClaudeAuditResponse = {
  success: boolean;
  healthReport?: HealthCheckReport;
  resultText?: string;
  truncated?: boolean;
  report?: unknown;
  rawText?: string;
  parseError?: string;
  error?: string;
};

function normalizeHealthReport(
  data: HealthCheckApiResponse
): HealthCheckReport | null {
  const candidate =
    data?.healthReport ??
    data?.report ??
    data;

  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    return null;
  }

  const value = candidate as any;

  if (!Array.isArray(value.results)) {
    return null;
  }

  return {
    score: Number(value.score ?? 0),
    passedCount: Number(
      value.passedCount ??
      value.results.filter((r: any) => r?.passed === true).length
    ),
    failedCount: Number(
      value.failedCount ??
      value.results.filter((r: any) => r?.passed === false).length
    ),
    counts: value.counts
      ? {
          tags: Number(value.counts.tags ?? 0),
          triggers: Number(value.counts.triggers ?? 0),
          variables: Number(value.counts.variables ?? 0),
        }
      : undefined,
    results: value.results,
  };
}

export default function HealthCheckPage() {
  const store = useDashboardStore();

  const [loading, setLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);

  const [report, setReport] =
    useState<HealthCheckReport | null>(null);

  const [claudeText, setClaudeText] =
    useState<string | null>(null);

  const [claudeTruncated, setClaudeTruncated] =
    useState(false);

  const [claudeError, setClaudeError] =
    useState<string | null>(null);

  const [pageError, setPageError] =
    useState<string | null>(null);

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [chatInput, setChatInput] =
    useState("");

  const [chatSending, setChatSending] =
    useState(false);

  /*
   * Prevents two chat requests from being fired
   * when Enter + click happen very close together.
   */
  const chatRequestLock = useRef(false);

  /*
   * --------------------------------------------------
   * RUN FUNCTIONAL HEALTH CHECK
   * --------------------------------------------------
   */

  const handleRunHealthCheck = async () => {
    if (
      loading ||
      !store.selectedWorkspaceId
    ) {
      return;
    }

    setPageError(null);
    setClaudeError(null);

    try {
      setLoading(true);

      const res = await fetch(
        "/api/auth/healthcheck",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId:
              store.selectedAccountId,
            containerId:
              store.selectedContainerId,
            workspaceId:
              store.selectedWorkspaceId,
          }),
        }
      );

      const data: HealthCheckApiResponse =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `HealthCheck request failed (${res.status}).`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.error ||
            "HealthCheck request failed."
        );
      }

      const normalized =
        normalizeHealthReport(data);

      if (!normalized) {
        throw new Error(
          "HealthCheck API returned an invalid report."
        );
      }

      setReport(normalized);

      /*
       * A fresh functional health check means
       * the previous Claude audit is no longer
       * guaranteed to match the report.
       */
      setClaudeText(null);
      setClaudeTruncated(false);
      setChatMessages([]);
    } catch (error) {
      console.error(
        "Functional HealthCheck Error:",
        error
      );

      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to run HealthCheck."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * --------------------------------------------------
   * CLAUDE AI AUDIT
   * --------------------------------------------------
   */

  const handleClaudeHealthCheck = async () => {
    if (
      claudeLoading ||
      !store.selectedWorkspaceId
    ) {
      return;
    }

    setClaudeError(null);
    setPageError(null);

    try {
      setClaudeLoading(true);
      setChatMessages([]);

      let currentReport = report;

      /*
       * Claude Audit can work independently.
       *
       * If the user hasn't run the functional
       * HealthCheck yet, get the report first.
       */
      if (!currentReport) {
        const healthRes = await fetch(
          "/api/auth/healthcheck",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              accountId:
                store.selectedAccountId,
              containerId:
                store.selectedContainerId,
              workspaceId:
                store.selectedWorkspaceId,
            }),
          }
        );

        const healthData: HealthCheckApiResponse =
          await healthRes.json();

        if (!healthRes.ok) {
          throw new Error(
            healthData?.error ||
              `HealthCheck request failed (${healthRes.status}).`
          );
        }

        currentReport =
          normalizeHealthReport(
            healthData
          );

        if (!currentReport) {
          throw new Error(
            "Unable to create a valid HealthCheck report for Claude."
          );
        }

        setReport(currentReport);
      }

      /*
       * Send the actual HealthCheck report
       * to Claude.
       */
      const aiRes = await fetch(
        "/api/auth/healthcheck/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            healthReport: currentReport,
          }),
        }
      );

      const aiData: ClaudeAuditResponse =
        await aiRes.json();

      if (!aiRes.ok) {
        throw new Error(
          aiData?.error ||
            `Claude AI Audit failed (${aiRes.status}).`
        );
      }

      if (aiData?.success === false) {
        throw new Error(
          aiData?.error ||
            aiData?.parseError ||
            "Claude AI Audit failed."
        );
      }

      /*
       * Current AI route returns resultText.
       * Keep support for rawText/report too so the
       * page remains compatible if the API changes.
       */
      const text =
        aiData.resultText ??
        aiData.rawText ??
        (
          typeof aiData.report === "string"
            ? aiData.report
            : ""
        );

      if (!text.trim()) {
        throw new Error(
          aiData.parseError ||
            "Claude returned an empty audit response."
        );
      }

      setClaudeText(text);
      setClaudeTruncated(
        Boolean(aiData.truncated)
      );
    } catch (error) {
      console.error(
        "Claude AI Audit Error:",
        error
      );

      setClaudeError(
        error instanceof Error
          ? error.message
          : "Unable to run Claude AI Audit."
      );
    } finally {
      setClaudeLoading(false);
    }
  };

  /*
   * --------------------------------------------------
   * CHAT WITH CLAUDE
   * --------------------------------------------------
   */

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();

    if (
      !text ||
      chatSending ||
      chatRequestLock.current ||
      !report
    ) {
      return;
    }

    /*
     * Lock immediately before React state updates.
     * This prevents duplicate network requests.
     */
    chatRequestLock.current = true;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      userMessage,
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch(
        "/api/auth/healthcheck/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            healthReport: report,

            /*
             * IMPORTANT:
             *
             * Your chat API expects "claudeReport".
             * The previous page was sending "claudeText".
             */
            claudeReport: claudeText
              ? {
                  resultText: claudeText,
                }
              : null,

            messages: nextMessages,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error ||
            `Chat request failed (${res.status}).`
        );
      }

      const reply =
        typeof data.reply === "string"
          ? data.reply.trim()
          : "";

      if (!reply) {
        throw new Error(
          "Claude returned an empty reply."
        );
      }

      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (error) {
      console.error(
        "Claude Chat Error:",
        error
      );

      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Sorry, something went wrong: ${error.message}`
              : "Sorry, something went wrong while contacting Claude.",
        },
      ]);
    } finally {
      setChatSending(false);
      chatRequestLock.current = false;
    }
  };

  /*
   * --------------------------------------------------
   * FAILED / PASSED CHECKS
   * --------------------------------------------------
   */

  const failedChecks =
    report?.results?.filter(
      (r) => !r.passed
    ) ?? [];

  const passedChecks =
    report?.results?.filter(
      (r) => r.passed
    ) ?? [];

  /*
   * --------------------------------------------------
   * PDF
   * --------------------------------------------------
   */

  const handleDownloadPDF = () => {
    if (!report) {
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(
      "GTM HealthCheck Report",
      14,
      18
    );

    doc.setFontSize(12);

    doc.text(
      `Score: ${report.score}%`,
      14,
      30
    );

    doc.text(
      `Passed Checks: ${report.passedCount}`,
      14,
      38
    );

    doc.text(
      `Failed Checks: ${report.failedCount}`,
      14,
      46
    );

    let currentY = 60;

    if (failedChecks.length > 0) {
      doc.setFontSize(14);
      doc.text(
        "Failed Checks",
        14,
        currentY
      );

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
        body: failedChecks.map(
          (r) => [
            r.id,
            r.title,
            r.severity,
            `Tags: ${
              (r.affectedTags || [])
                .map(
                  (x: any) => x.name
                )
                .join(", ") || "-"
            }
Triggers: ${
              (r.affectedTriggers || [])
                .map(
                  (x: any) => x.name
                )
                .join(", ") || "-"
            }
Vars: ${
              (r.affectedVariables || [])
                .map(
                  (x: any) => x.name
                )
                .join(", ") || "-"
            }`,
          ]
        ),
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        headStyles: {
          fontSize: 10,
        },
      });

      const lastY =
        (doc as any)
          .lastAutoTable
          ?.finalY ||
        currentY;

      currentY = lastY + 12;
    }

    if (passedChecks.length > 0) {
      doc.setFontSize(14);

      doc.text(
        "Passed Checks",
        14,
        currentY
      );

      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        head: [["ID", "Title"]],
        body: passedChecks.map(
          (r) => [
            r.id,
            r.title,
          ]
        ),
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        headStyles: {
          fontSize: 11,
        },
      });
    }

    doc.save(
      "GTM_HealthCheck_Report.pdf"
    );
  };

  /*
   * --------------------------------------------------
   * GRADE
   * --------------------------------------------------
   */

  const grade =
    report
      ? report.score >= 80
        ? "A"
        : report.score >= 50
          ? "B"
          : "C"
      : "";

  const verdictColor =
    report && report.score >= 80
      ? "var(--success)"
      : report && report.score >= 50
        ? "var(--warn)"
        : "var(--danger)";

  /*
   * --------------------------------------------------
   * PAGE
   * --------------------------------------------------
   */

  return (
    <div>
      {/* HERO */}

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
              Find tracking issues, unused
              tags, duplicate triggers,
              broken variables, and
              performance bottlenecks with
              a complete container audit.
            </p>

            <div className="mt-9 flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={
                  handleRunHealthCheck
                }
                disabled={
                  loading ||
                  !store.selectedWorkspaceId
                }
                className="btn-primary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
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
                onClick={
                  handleClaudeHealthCheck
                }
                disabled={
                  claudeLoading ||
                  !store.selectedWorkspaceId
                }
                className="btn-secondary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claudeLoading ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
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
              <p className="mt-4 text-[12.5px] text-(--warn)">
                Select a workspace before
                running the audit.
              </p>
            )}

            {pageError && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">
                {pageError}
              </div>
            )}

            {claudeError && (
              <div className="mt-5 px-4 py-3 rounded-lg border border-(--danger)/25 bg-(--danger)/8 text-(--danger) text-[13px]">
                {claudeError}
              </div>
            )}

            <div className="mt-12 flex justify-center gap-3 flex-wrap">
              <Badge
                icon={
                  <CheckCircle
                    size={13}
                  />
                }
                label="Secure & fast"
              />

              <Badge
                icon={
                  <ShieldCheck
                    size={13}
                  />
                }
                label="Workspace-safe"
              />

              <Badge
                icon={
                  <Zap size={13} />
                }
                label="Automated"
              />
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
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint mb-2">
                  HealthCheck report
                </p>

                <h2 className="text-[24px] md:text-[28px] font-semibold text-fg tracking-[-0.02em]">
                  Container audit
                </h2>

                <p className="text-[13px] text-muted mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {report.passedCount}
                    {" "}
                    passed
                  </span>

                  <span className="text-faint">
                    ·
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--danger)" />
                    {report.failedCount}
                    {" "}
                    failed
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
                type="button"
                onClick={
                  handleRunHealthCheck
                }
                disabled={loading}
                className="btn-secondary py-2! disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
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
                type="button"
                onClick={
                  handleClaudeHealthCheck
                }
                disabled={claudeLoading}
                className="btn-secondary py-2! disabled:opacity-50"
              >
                {claudeLoading ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <Bot size={13} />
                )}

                {claudeLoading
                  ? "Analyzing…"
                  : "Claude AI Audit"}
              </button>

              <button
                type="button"
                onClick={
                  handleDownloadPDF
                }
                className="btn-primary py-2!"
              >
                <Download size={13} />
                Download PDF
              </button>
            </div>

            {pageError && (
              <p className="mt-3 text-[12.5px] text-(--danger)">
                {pageError}
              </p>
            )}

            {claudeError && (
              <p className="mt-3 text-[12.5px] text-(--danger)">
                {claudeError}
              </p>
            )}
          </div>

          {/* BODY */}

          <div className="p-6 md:p-7">
            {/* CLAUDE AUDIT */}

            {claudeText && (
              <ClaudeAuditChatBlock
                report={report}
                claudeText={claudeText}
                claudeTruncated={
                  claudeTruncated
                }
                chatMessages={
                  chatMessages
                }
                chatInput={chatInput}
                setChatInput={
                  setChatInput
                }
                chatSending={
                  chatSending
                }
                onSend={
                  handleSendChatMessage
                }
              />
            )}

            {/* FAILED CHECKS */}

            <div>
              <div className="flex items-center gap-2 mb-5">
                <XCircle
                  size={15}
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
                {failedChecks.map(
                  (r) => (
                    <FailedCheckCard
                      key={r.id}
                      r={r}
                    />
                  )
                )}

                {failedChecks.length ===
                  0 && (
                  <div className="px-4 py-5 rounded-lg bg-accent-soft border border-accent/25 text-accent text-[13.5px] flex items-center gap-2">
                    <CheckCircle
                      size={15}
                    />
                    No failed checks.
                    Your container looks
                    healthy.
                  </div>
                )}
              </div>
            </div>

            {/* PASSED CHECKS */}

            {passedChecks.length >
              0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle
                    size={15}
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
                  {passedChecks.map(
                    (r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-line bg-card-hi p-4"
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
                    )
                  )}
                </div>
              </div>
            )}

            {/* NOTE */}

            <div className="mt-10 flex items-start gap-3 p-4 rounded-lg border border-line bg-card-hi">
              <AlertTriangle
                size={15}
                className="text-(--warn) mt-0.5 shrink-0"
              />

              <p className="text-[13px] text-muted leading-relaxed">
                <span className="font-medium text-fg">
                  Note:
                </span>{" "}
                This report is based
                on best-practice GTM
                rules and automated
                scanning. Always validate
                in Preview Mode before
                publishing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES */}

      {!report && (
        <section className="border-t border-line mt-16 pt-16">
          <div className="text-center mb-10">
            <h3 className="text-[26px] font-semibold text-fg">
              Why HealthCheck?
            </h3>

            <p className="text-muted mt-2 max-w-xl mx-auto text-[14.5px]">
              Improve tracking accuracy,
              reduce container clutter, and
              optimize tag performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={
                <BarChart3
                  size={18}
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

/* =====================================================
   CLAUDE AUDIT CHAT BLOCK
===================================================== */

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
  report: HealthCheckReport;
  claudeText: string;
  claudeTruncated: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (
    value: string
  ) => void;
  chatSending: boolean;
  onSend: () => void;
}) {
  const counts =
    report.counts ?? {
      tags: 0,
      triggers: 0,
      variables: 0,
    };

  const findResult = (
    id: string
  ) =>
    report.results.find(
      (r) => r.id === id
    ) as any;

  /*
   * Don't depend on a summary rule.
   * Use actual counts from the API.
   */

  const pausedResult =
    findResult("HC_LR_002");

  const unusedVariablesResult =
    findResult("HC_LR_003");

  const pausedCount =
    pausedResult?.affectedTags
      ?.length ?? 0;

  const unusedVariablesCount =
    unusedVariablesResult
      ?.affectedVariables?.length ??
    0;

  const entityRows = [
    {
      entity: "Tags",
      count: counts.tags,
      status:
        pausedCount > 0
          ? `${pausedCount} paused`
          : "Healthy",
    },
    {
      entity: "Triggers",
      count: counts.triggers,
      status: "Healthy",
    },
    {
      entity: "Variables",
      count: counts.variables,
      status:
        unusedVariablesCount > 0
          ? `${unusedVariablesCount} unused`
          : "Healthy",
    },
  ];

  return (
    <div className="mb-10 rounded-xl border border-line bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* TOOL */}

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-card-hi">
          <Wrench
            size={13}
            className="text-muted"
          />

          <span className="font-mono text-[12.5px] text-fg">
            gtm_ai_audit
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>

        {/* COUNTS */}

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
              {entityRows.map(
                (row, index) => (
                  <tr
                    key={row.entity}
                    className={
                      index > 0
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
                )
              )}
            </tbody>
          </table>
        </div>

        {/* CLAUDE RESPONSE */}

        <div className="text-[13.5px] text-fg leading-relaxed">
          {renderMarkdownLite(
            claudeText
          )}
        </div>

        {claudeTruncated && (
          <div className="px-3 py-2 rounded-md bg-(--warn)/8 border border-(--warn)/20 text-(--warn) text-[12px]">
            Claude response was
            truncated. Some audit details
            may be missing.
          </div>
        )}

        {/* CHAT */}

        {chatMessages.length > 0 && (
          <div className="border-t border-line pt-4 space-y-3">
            {chatMessages.map(
              (message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex ${
                    message.role ===
                    "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${
                      message.role ===
                      "user"
                        ? "bg-emerald-600 text-white whitespace-pre-wrap"
                        : "bg-card-hi border border-line text-fg"
                    }`}
                  >
                    {message.role ===
                    "assistant"
                      ? renderMarkdownLite(
                          message.content
                        )
                      : message.content}
                  </div>
                </div>
              )
            )}

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
            disabled
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted border border-line shrink-0 opacity-50"
          >
            <Plus size={14} />
          </button>

          <input
            type="text"
            value={chatInput}
            onChange={(e) =>
              setChatInput(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();

                if (
                  !chatSending &&
                  chatInput.trim()
                ) {
                  onSend();
                }
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
            {chatSending ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <ArrowUp
                size={15}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MARKDOWN
===================================================== */

function renderMarkdownLite(
  text: string
): ReactNode[] {
  const lines = text.split("\n");

  const blocks: ReactNode[] = [];

  let listItems: string[] = [];

  const renderInline = (
    line: string,
    key: string | number
  ): ReactNode => {
    const parts =
      line.split(
        /(\*\*[^*]+\*\*)/g
      );

    return (
      <span key={key}>
        {parts.map(
          (part, index) =>
            part.startsWith(
              "**"
            ) &&
            part.endsWith(
              "**"
            ) ? (
              <strong
                key={index}
                className="font-semibold text-fg"
              >
                {part.slice(
                  2,
                  -2
                )}
              </strong>
            ) : (
              <span key={index}>
                {part}
              </span>
            )
        )}
      </span>
    );
  };

  const flushList = (
    key: string | number
  ) => {
    if (
      listItems.length === 0
    ) {
      return;
    }

    blocks.push(
      <ul
        key={`list-${key}`}
        className="list-disc list-inside space-y-1 my-2"
      >
        {listItems.map(
          (item, index) => (
            <li key={index}>
              {renderInline(
                item,
                index
              )}
            </li>
          )
        )}
      </ul>
    );

    listItems = [];
  };

  lines.forEach(
    (line, index) => {
      const trimmed =
        line.trim();

      if (
        trimmed.startsWith(
          "### "
        )
      ) {
        flushList(index);

        blocks.push(
          <h4
            key={index}
            className="text-[13.5px] font-semibold text-fg mt-4 mb-1.5"
          >
            {renderInline(
              trimmed.slice(4),
              index
            )}
          </h4>
        );
      } else if (
        trimmed.startsWith(
          "## "
        )
      ) {
        flushList(index);

        blocks.push(
          <h3
            key={index}
            className="text-[15px] font-semibold text-fg mt-5 mb-2"
          >
            {renderInline(
              trimmed.slice(3),
              index
            )}
          </h3>
        );
      } else if (
        trimmed.startsWith(
          "# "
        )
      ) {
        flushList(index);

        blocks.push(
          <h2
            key={index}
            className="text-[16px] font-semibold text-fg mt-5 mb-2"
          >
            {renderInline(
              trimmed.slice(2),
              index
            )}
          </h2>
        );
      } else if (
        /^[-*]\s+/.test(
          trimmed
        )
      ) {
        listItems.push(
          trimmed.replace(
            /^[-*]\s+/,
            ""
          )
        );
      } else if (
        trimmed === ""
      ) {
        flushList(index);
      } else {
        flushList(index);

        blocks.push(
          <p
            key={index}
            className="mb-2 last:mb-0"
          >
            {renderInline(
              trimmed,
              index
            )}
          </p>
        );
      }
    }
  );

  flushList("end");

  return blocks;
}

/* =====================================================
   BADGE
===================================================== */

function Badge({
  icon,
  label,
}: {
  icon: ReactNode;
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

/* =====================================================
   SEVERITY
===================================================== */

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

/* =====================================================
   FAILED CHECK CARD
===================================================== */

function FailedCheckCard({
  r,
}: {
  r: HealthCheckResult;
}) {
  return (
    <div className="rounded-xl border border-line bg-card-hi p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-fg">
            <span className="font-mono text-[11px] text-faint mr-1.5">
              {r.id}
            </span>

            {r.title}
          </p>

          <p className="text-[13px] text-muted mt-2 leading-relaxed">
            {r.description}
          </p>

          {r.recommendation && (
            <div className="mt-3 px-3 py-2 rounded-md bg-(--danger)/8 border border-(--danger)/20 text-(--danger) text-[12.5px]">
              <span className="font-semibold">
                Fix:
              </span>{" "}
              {r.recommendation}
            </div>
          )}

          <AffectedList
            label="Affected Tags"
            items={r.affectedTags}
          />

          <AffectedList
            label="Affected Triggers"
            items={
              r.affectedTriggers
            }
          />

          <AffectedList
            label="Affected Variables"
            items={
              r.affectedVariables
            }
          />

          <AffectedList
            label="Unused Tags"
            items={
              (r as any)
                .unusedTags
            }
          />

          <AffectedList
            label="Unused Triggers"
            items={
              (r as any)
                .unusedTriggers
            }
          />

          <AffectedList
            label="Unused Variables"
            items={
              (r as any)
                .unusedVariables
          }
          />
        </div>

        <div className="shrink-0">
          <SeverityBadge
            severity={
              r.severity
            }
          />
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   AFFECTED ITEMS
===================================================== */

function AffectedList({
  label,
  items,
}: {
  label: string;
  items?: any[];
}) {
  if (
    !items ||
    items.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        {label}
      </h4>

      <div className="flex flex-wrap gap-2">
        {items.map(
          (
            item: any,
            index
          ) => {
            const content =
              item?.name ||
              item?.id ||
              "Unnamed";

            if (
              item?.editUrl
            ) {
              return (
                <a
                  key={index}
                  href={
                    item.editUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-blue-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                >
                  {content}
                </a>
              );
            }

            return (
              <span
                key={index}
                className="rounded-md border border-line bg-card px-3 py-1.5 text-xs font-medium text-fg"
              >
                {content}
              </span>
            );
          }
        )}
      </div>
    </div>
  );
}

/* =====================================================
   FEATURE CARD
===================================================== */

function FeatureCard({
  icon,
  accent,
  title,
  body,
}: {
  icon: ReactNode;
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