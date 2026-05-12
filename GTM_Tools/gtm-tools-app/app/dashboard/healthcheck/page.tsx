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
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState } from "react";
import { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  results: HealthCheckResult[];
};

export default function HealthCheckPage() {
  const store = useDashboardStore();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HealthCheckReport | null>(null);

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
    report && report.score >= 80
      ? "var(--success)"
      : report && report.score >= 50
      ? "var(--warn)"
      : "var(--danger)";

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
                className="btn-primary px-5! py-2.5! disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Zap size={14} strokeWidth={2.4} />
                    Run HealthCheck
                  </>
                )}
              </button>
            </div>

            {!store.selectedWorkspaceId && (
              <p className="mt-4 text-[12.5px] text-(--warn)">
                Select a workspace before running the audit.
              </p>
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

              <button onClick={handleDownloadPDF} className="btn-primary py-2!">
                <Download size={13} strokeWidth={2.2} />
                Download PDF
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-7">
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

          <AffectedList label="Affected tags" items={r.affectedTags} />
          <AffectedList label="Affected triggers" items={r.affectedTriggers} />
          <AffectedList label="Affected variables" items={r.affectedVariables} />
        </div>

        <div className="shrink-0">
          <SeverityBadge severity={r.severity} />
        </div>
      </div>
    </div>
  );
}

function AffectedList({ label, items }: { label: string; items?: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-faint mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t: any, i: number) => (
          <span
            key={i}
            className="inline-flex px-2 py-0.5 rounded-md text-[12px] bg-card-hi border border-line text-muted"
          >
            {t.name}
          </span>
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
