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
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useAnthropicKey } from "@/hooks/useAnthropicKey";
import { ApiKeyModal, ConnectionBadge } from "@/app/dashboard/components/ApiKeyModal";

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
  code?: string;
};

/* =====================================================
   HELPERS
===================================================== */

function keyNoticeFromCode(code?: string, fallback?: string) {
  switch (code) {
    case "invalid_key":
      return "Your API key is invalid or expired. Please enter a new one.";
    case "quota":
      return "This key has run out of credits/quota. Enter a different key to continue.";
    case "rate_limit":
      return "This key hit its rate/usage limit. Wait a moment or connect a different key.";
    case "no_key":
      return "Please connect an Anthropic API key to use the AI audit.";
    default:
      return fallback || "Please reconnect your Anthropic API key.";
  }
}

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

/*
 * Total number of affected / unused items on a single check.
 * Used to render the "Affected" column in the table.
 */
function affectedItemCount(r: HealthCheckResult): number {
  const any = r as any;

  return (
    (r.affectedTags?.length ?? 0) +
    (r.affectedTriggers?.length ?? 0) +
    (r.affectedVariables?.length ?? 0) +
    (any.unusedTags?.length ?? 0) +
    (any.unusedTriggers?.length ?? 0) +
    (any.unusedVariables?.length ?? 0)
  );
}

/*
 * A row has expandable detail if it has a recommendation,
 * a description, or any affected items.
 */
function rowHasDetail(r: HealthCheckResult): boolean {
  return Boolean(
    r.recommendation ||
    r.description ||
    affectedItemCount(r) > 0
  );
}

export default function HealthCheckPage() {
  const store = useDashboardStore();

  /*
   * --------------------------------------------------
   * ANTHROPIC (BRING YOUR OWN KEY)
   * --------------------------------------------------
   */
  const anthropic = useAnthropicKey();
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyModalNotice, setKeyModalNotice] =
    useState<string | null>(null);

  /*
   * When true, a Claude audit run is waiting for the
   * user to connect a key. Once they connect, we auto
   * continue the run.
   */
  const pendingRunRef = useRef(false);

  const hasKey =
    anthropic.status !== "no_key" &&
    anthropic.status !== "unknown";

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

    /*
     * 1. Ensure we have a working API key first.
     *    If not -> open modal and wait for the user.
     */
    let activeKey = await anthropic.getKey();

    if (!activeKey) {
      pendingRunRef.current = true;
      setKeyModalNotice(
        keyNoticeFromCode("no_key")
      );
      setKeyModalOpen(true);
      return;
    }

    if (anthropic.status !== "connected") {
      const ok = await anthropic.verify();
      if (!ok) {
        pendingRunRef.current = true;
        setKeyModalNotice(
          "Please connect a valid Anthropic API key to run the AI audit."
        );
        setKeyModalOpen(true);
        return;
      }
      activeKey =
        (await anthropic.getKey()) ?? activeKey;
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
              accountId: store.selectedAccountId,
              containerId: store.selectedContainerId,
              workspaceId: store.selectedWorkspaceId,
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
       * to Claude, along with the user's key.
       */
      const aiRes = await fetch(
        "/api/auth/healthcheck/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-anthropic-key": activeKey,
          },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            healthReport: currentReport,
          }),
        }
      );

      const aiData: ClaudeAuditResponse =
        await aiRes.json();


      if (!aiRes.ok || aiData?.success === false) {
        // Known key / quota problems -> handle via modal, don't throw.
        if (
          aiData?.code &&
          ["no_key", "invalid_key", "quota", "rate_limit"].includes(
            aiData.code
          )
        ) {
          if (
            aiData.code === "invalid_key" ||
            aiData.code === "quota"
          ) {
            anthropic.disconnect();
          } else {
            anthropic.markDisconnected();
          }

          pendingRunRef.current = false;
          setKeyModalNotice(
            keyNoticeFromCode(aiData.code, aiData.error)
          );
          setKeyModalOpen(true);

          // Show inline message, then stop quietly (no red overlay).
          setClaudeError(
            keyNoticeFromCode(aiData.code, aiData.error)
          );
          setClaudeLoading(false);
          return;
        }

        // Genuine unexpected failures still throw.
        throw new Error(
          aiData?.error ||
          aiData?.parseError ||
          `Claude AI Audit failed (${aiRes.status}).`
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
      /*
       * Chat also needs the user's API key.
       */
      const chatKey = await anthropic.getKey();

      if (!chatKey) {
        setChatMessages([
          ...nextMessages,
          {
            role: "assistant",
            content:
              "Please connect your Anthropic API key first.",
          },
        ]);
        setKeyModalNotice(
          keyNoticeFromCode("no_key")
        );
        setKeyModalOpen(true);
        return;
      }

      const res = await fetch(
        "/api/auth/healthcheck/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-anthropic-key": chatKey,
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
        /*
         * Key / quota issues while chatting -> prompt reconnect.
         */
        if (
          data?.code &&
          ["no_key", "invalid_key", "quota", "rate_limit"].includes(
            data.code
          )
        ) {
          if (
            data.code === "invalid_key" ||
            data.code === "quota"
          ) {
            anthropic.disconnect();
          } else {
            anthropic.markDisconnected();
          }

          setKeyModalNotice(
            keyNoticeFromCode(
              data.code,
              data.error
            )
          );
          setKeyModalOpen(true);
        }

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
   * KEY MODAL: connect handler (auto-resume run)
   * --------------------------------------------------
   */

  const handleConnectKey = async (k: string) => {
    const res = await anthropic.connect(k);

    if (res.ok && pendingRunRef.current) {
      pendingRunRef.current = false;
      setKeyModalOpen(false);

      /*
       * Resume the audit that was blocked on the key.
       */
      setTimeout(() => {
        void handleClaudeHealthCheck();
      }, 0);
    }

    return res;
  };

  const openKeyManager = () => {
    setKeyModalNotice(null);
    setKeyModalOpen(true);
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
            `Tags: ${(r.affectedTags || [])
              .map(
                (x: any) => x.name
              )
              .join(", ") || "-"
            }
Triggers: ${(r.affectedTriggers || [])
              .map(
                (x: any) => x.name
              )
              .join(", ") || "-"
            }
Vars: ${(r.affectedVariables || [])
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
      {/* API KEY MODAL (always mounted, controlled by open) */}
      <ApiKeyModal
        open={keyModalOpen}
        notice={keyModalNotice}
        checking={anthropic.checking}
        hasKey={hasKey}
        onConnect={handleConnectKey}
        onRemove={anthropic.disconnect}
        onClose={() => setKeyModalOpen(false)}
      />

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

            {/* CONNECTION STATUS */}
            <div className="mt-4 flex justify-center">
              <ConnectionBadge
                status={anthropic.status}
                onManage={openKeyManager}
              />
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

            <div className="mt-6 flex flex-wrap items-center gap-2">
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

              {/* CONNECTION STATUS */}
              <div className="ml-auto">
                <ConnectionBadge
                  status={anthropic.status}
                  onManage={openKeyManager}
                />
              </div>
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

            {/* TABLE VIEW */}

            <HealthCheckTable
              results={report.results}
              passedCount={report.passedCount}
              failedCount={report.failedCount}
            />

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
   HEALTHCHECK TABLE (report displayed as a table)
===================================================== */

type TableFilter = "all" | "failed" | "passed";

function HealthCheckTable({
  results,
  passedCount,
  failedCount,
}: {
  results: HealthCheckResult[];
  passedCount: number;
  failedCount: number;
}) {
  const [filter, setFilter] =
    useState<TableFilter>("all");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const filtered = results.filter((r) => {
    if (filter === "failed") return !r.passed;
    if (filter === "passed") return r.passed;
    return true;
  });

  const toggleRow = (r: HealthCheckResult) => {
    if (!rowHasDetail(r)) return;

    setExpandedId((prev) =>
      prev === r.id ? null : r.id
    );
  };

  const tabs: {
    key: TableFilter;
    label: string;
    count: number;
    tone: "neutral" | "danger" | "accent";
  }[] = [
      {
        key: "all",
        label: "All",
        count: results.length,
        tone: "neutral",
      },
      {
        key: "failed",
        label: "Failed",
        count: failedCount,
        tone: "danger",
      },
      {
        key: "passed",
        label: "Passed",
        count: passedCount,
        tone: "accent",
      },
    ];

  return (
    <div>
      {/* FILTER TABS */}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map((tab) => {
          const active = filter === tab.key;

          const base =
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors";

          const activeClass =
            tab.tone === "danger"
              ? "bg-(--danger)/10 border-(--danger)/30 text-(--danger)"
              : tab.tone === "accent"
                ? "bg-accent-soft border-accent/30 text-accent"
                : "bg-card-hi border-edge text-fg";

          const idleClass =
            "bg-card border-line text-muted hover:text-fg hover:border-edge";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setFilter(tab.key)
              }
              className={`${base} ${active ? activeClass : idleClass
                }`}
            >
              {tab.label}
              <span className="font-mono text-[11px] opacity-70">
                {tab.count}
              </span>
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

                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-[92px]">
                  ID
                </th>

                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  Check
                </th>

                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-[110px]">
                  Severity
                </th>

                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-[92px] text-center">
                  Affected
                </th>

                <th className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint w-[80px] text-center">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const detail = rowHasDetail(r);
                const expanded =
                  expandedId === r.id;
                const affected =
                  affectedItemCount(r);

                return (
                  <FragmentRow
                    key={r.id}
                    r={r}
                    detail={detail}
                    expanded={expanded}
                    affected={affected}
                    onToggle={() =>
                      toggleRow(r)
                    }
                  />
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[13px] text-muted"
                  >
                    No checks in this
                    view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-faint">
        Tip: click a row to see the fix
        and affected items.
      </p>
    </div>
  );
}

/*
 * A single check row + its expandable detail row.
 */
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
        className={`border-t border-line transition-colors ${detail
          ? "cursor-pointer hover:bg-card-hi"
          : ""
          } ${expanded ? "bg-card-hi" : ""}`}
      >
        {/* CHEVRON */}
        <td className="px-3 py-3 align-top">
          {detail ? (
            expanded ? (
              <ChevronDown
                size={14}
                className="text-muted"
              />
            ) : (
              <ChevronRight
                size={14}
                className="text-faint"
              />
            )
          ) : null}
        </td>

        {/* ID */}
        <td className="px-3 py-3 align-top">
          <span className="font-mono text-[11.5px] text-faint">
            {r.id}
          </span>
        </td>

        {/* CHECK */}
        <td className="px-3 py-3 align-top">
          <p className="text-[13.5px] font-medium text-fg">
            {r.title}
          </p>

          {r.description && (
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed line-clamp-1">
              {r.description}
            </p>
          )}
        </td>

        {/* SEVERITY */}
        <td className="px-3 py-3 align-top">
          <SeverityBadge
            severity={r.severity}
          />
        </td>

        {/* AFFECTED */}
        <td className="px-3 py-3 align-top text-center">
          {affected > 0 ? (
            <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-(--danger)/10 text-(--danger) border border-(--danger)/20">
              {affected}
            </span>
          ) : (
            <span className="text-faint text-[12px]">
              —
            </span>
          )}
        </td>

        {/* STATUS */}
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

      {/* EXPANDED DETAIL */}
      {detail && expanded && (
        <tr className="border-t border-line bg-card-hi">
          <td />
          <td
            colSpan={5}
            className="px-3 pb-5 pt-1 align-top"
          >
            {r.description && (
              <p className="text-[13px] text-muted leading-relaxed max-w-2xl">
                {r.description}
              </p>
            )}

            {r.recommendation && (
              <div className="mt-3 px-3 py-2 rounded-md bg-(--danger)/8 border border-(--danger)/20 text-(--danger) text-[12.5px] max-w-2xl w-fit">
                <span className="font-semibold">Fix:</span>{" "}
                {r.recommendation}
              </div>
            )}

            <AffectedList
              label="Affected Tags"
              items={r.affectedTags}
            />

            <AffectedList
              label="Affected Triggers"
              items={r.affectedTriggers}
            />

            <AffectedList
              label="Affected Variables"
              items={r.affectedVariables}
            />

            <AffectedList
              label="Unused Tags"
              items={(r as any).unusedTags}
            />

            <AffectedList
              label="Unused Triggers"
              items={
                (r as any).unusedTriggers
              }
            />

            <AffectedList
              label="Unused Variables"
              items={
                (r as any).unusedVariables
              }
            />
          </td>
        </tr>
      )}
    </>
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
                  className={`flex ${message.role ===
                    "user"
                    ? "justify-end"
                    : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${message.role ===
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
                  onClick={(e) =>
                    e.stopPropagation()
                  }
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