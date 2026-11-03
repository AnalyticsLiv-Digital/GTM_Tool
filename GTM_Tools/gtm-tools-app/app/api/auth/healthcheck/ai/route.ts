/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { POST as runHealthCheck } from "../route";
import {
  classifyAnthropicError,
  FALLBACK_CODES,
  type AnthropicFailure,
} from "@/lib/anthropicError";
import { ClaudeNotConfiguredError, getClaude } from "@/lib/claudeClient";
import { rateLimit, clientIp } from "@/lib/rateLimit";

type RequestBody = {
  accountId?: unknown;
  containerId?: unknown;
  workspaceId?: unknown;
};

type HealthCheckReport = {
  score: number;
  results: Array<Record<string, any>>;
  [key: string]: unknown;
};

type HealthCheckResponse = {
  success?: boolean;
  error?: string;
  healthReport?: HealthCheckReport;
  report?: HealthCheckReport;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/* ---------- helpers ---------- */

const namesOf = (list: any[] | undefined, limit?: number): string[] => {
  const names = (list ?? []).map((x: any) => x?.name ?? x?.id).filter(Boolean) as string[];
  return typeof limit === "number" ? names.slice(0, limit) : names;
};

const gradeOf = (score: number) => (score >= 80 ? "A" : score >= 50 ? "B" : "C");

type Finding = {
  id: string;
  title: string;
  severity: string;
  description: string;
  recommendation: string;
  totalAffected: number;
  liveAffected: number | null; // tags only: affected tags that are not paused
  pausedAffected: number | null;
  tags: string[];
  triggers: string[];
  variables: string[];
  notListed: number;
};

const NAME_LIMIT = 40;

/** Everything the AI (and the local report) needs, derived only from the scan results. */
function buildReportFacts(report: HealthCheckReport) {
  const results = report.results;
  const counts = ((report as any).counts ?? {}) as { tags?: number; triggers?: number; variables?: number };

  // Paused tags come from the "Paused Tags Found" rule, so live/paused splits need no raw container.
  const pausedList = namesOf(results.find((r) => r.id === "HC_LR_002")?.affectedTags);
  const paused = new Set(pausedList.map((n) => n.trim().toLowerCase()));

  const findings: Finding[] = results
    .filter((r) => !r.passed)
    .map((r) => {
      const tags = namesOf(r.affectedTags);
      const triggers = namesOf(r.affectedTriggers);
      const variables = namesOf(r.affectedVariables);
      const total = tags.length + triggers.length + variables.length;
      const pausedAffected = tags.length ? tags.filter((n) => paused.has(n.trim().toLowerCase())).length : null;
      const listed = Math.min(tags.length, NAME_LIMIT) + Math.min(triggers.length, NAME_LIMIT) + Math.min(variables.length, NAME_LIMIT);
      return {
        id: String(r.id),
        title: String(r.title),
        severity: String(r.severity),
        description: String(r.description ?? ""),
        recommendation: String(r.recommendation ?? ""),
        totalAffected: total,
        liveAffected: pausedAffected === null ? null : tags.length - pausedAffected,
        pausedAffected,
        tags: tags.slice(0, NAME_LIMIT),
        triggers: triggers.slice(0, NAME_LIMIT),
        variables: variables.slice(0, NAME_LIMIT),
        notListed: total - listed,
      };
    });

  const passed = results
    .filter((r) => r.passed)
    .map((r) => {
      const c = (r.passedCounts ?? {}) as { tags?: number; triggers?: number; variables?: number };
      return { title: String(r.title), checked: { tags: c.tags ?? 0, triggers: c.triggers ?? 0, variables: c.variables ?? 0 } };
    });

  const totalTags = counts.tags ?? 0;

  return {
    summary: {
      score: report.score,
      grade: gradeOf(report.score),
      rulesTotal: results.length,
      rulesPassed: passed.length,
      rulesFailed: findings.length,
      scanned: { tags: counts.tags ?? 0, triggers: counts.triggers ?? 0, variables: counts.variables ?? 0 },
      tags: totalTags ? { live: totalTags - pausedList.length, paused: pausedList.length } : null,
    },
    findings,
    passed,
    pausedTagNames: pausedList.slice(0, 40),
  };
}

/** Free, no-AI report in the same layout as the AI report (used when Claude is unavailable). */
function buildLocalAudit(report: HealthCheckReport): string {
  const { summary, findings, passed } = buildReportFacts(report);

  const block = (f: Finding) => {
    const names = [...f.tags, ...f.triggers, ...f.variables];
    const sample = names.slice(0, 10).join(", ");
    const more = f.totalAffected > 10 ? ` (+${f.totalAffected - 10} more)` : "";
    const split =
      f.pausedAffected !== null && f.pausedAffected > 0 ? `, ${f.liveAffected} live and ${f.pausedAffected} paused` : "";
    return `### ${f.title} (${f.totalAffected} item${f.totalAffected === 1 ? "" : "s"}${split})
${f.recommendation || f.description}${sample ? ` Affected: ${sample}${more}.` : ""}`;
  };

  const section = (title: string, sev: string[]) => {
    const list = findings.filter((f) => sev.includes(f.severity));
    return `## ${title} (${list.length})\n${list.length ? list.map(block).join("\n\n") : "- None found"}`;
  };

  const high = findings.filter((f) => f.severity === "HIGH").length;

  return `## Summary
- **Score:** ${summary.score}% (grade ${summary.grade}), ${summary.rulesPassed} of ${summary.rulesTotal} rules passed and ${summary.rulesFailed} failed
- **Scanned:** ${summary.scanned.tags} tags, ${summary.scanned.triggers} triggers, ${summary.scanned.variables} variables${
    summary.tags ? `\n- **Tags:** ${summary.tags.live} live, ${summary.tags.paused} paused` : ""
  }

${section("High severity", ["HIGH"])}

${section("Medium severity", ["MEDIUM"])}

${section("Low severity", ["LOW"])}

## What passed
${passed.slice(0, 15).map((p) => `- ${p.title}`).join("\n") || "- Nothing passed yet"}

## Suggested fix order
- ${high > 0 ? "Fix the high severity issues first, they can break tracking." : "No high severity issues, start with the warnings."}
- Then work through the medium severity items, then clean up paused and unused items.
- Re-run the health check and validate in Preview Mode before publishing.

_Generated by the built-in rule engine because AI was unavailable._`;
}

/* ---------- route ---------- */

export async function POST(req: NextRequest) {
  let healthReport: HealthCheckReport | null = null;
  const userKey = req.headers.get("x-anthropic-key")?.trim() || undefined;

  try {
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
    const containerId = typeof body.containerId === "string" ? body.containerId.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: "Select a GTM account, container, and workspace before running the AI audit." },
        { status: 400 }
      );
    }

    // Users paying with their own token don't need a limit; the shared server connection does.
    if (!userKey) {
      const limit = rateLimit(`ai-audit:${clientIp(req)}`, 5, 60 * 60 * 1000);
      if (!limit.ok) {
        return NextResponse.json(
          {
            success: false,
            code: "rate_limit",
            error: `AI audit limit reached. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
          },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
        );
      }
    }

    /* 1) Scan the live workspace with your existing HealthCheck route (it also checks the Google login). */
    const scanResponse = await runHealthCheck(
      new NextRequest(new URL("/api/auth/healthcheck", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization") as string } : {}),
        },
        body: JSON.stringify({ accountId, containerId, workspaceId }),
      })
    );

    const scanData = (await scanResponse.json().catch(() => null)) as HealthCheckResponse | null;
    healthReport = scanData?.healthReport ?? scanData?.report ?? null;

    if (!scanResponse.ok || scanData?.success === false || !healthReport || !Array.isArray(healthReport.results)) {
      console.error("[ai-audit] HealthCheck scan failed:", scanResponse.status, scanData?.error);
      return NextResponse.json(
        {
          success: false,
          code: "scan_failed",
          error: scanData?.error ?? `Could not load the live GTM health report (scan returned ${scanResponse.status}).`,
        },
        // Never forward the inner status (a 405/404 here would look like THIS route is missing).
        { status: scanResponse.status === 401 || scanResponse.status === 403 ? scanResponse.status : 502 }
      );
    }

    /* 2) Build the facts for the report from the real rule findings. */
    const facts = buildReportFacts(healthReport);

    const prompt = `You are writing a Google Tag Manager health check report for a live workspace.

The data below comes from a deterministic rule scan of THIS container. Every number and name is real. Use only this data; do not claim to have inspected anything else.

Write the report in Markdown with EXACTLY this structure (no JSON, no code fences, no tables, use "- " bullets only):

## Summary
- **Score:** <score>% (grade <grade>), <rulesPassed> of <rulesTotal> rules passed and <rulesFailed> failed
- **Scanned:** <tags> tags, <triggers> triggers, <variables> variables
- **Tags:** <live> live, <paused> paused   (only if provided)
- One short sentence on the overall state of the container.

## High severity (<number of HIGH findings>)
### <Finding title> (<totalAffected> items, <live> live)   <- add the live/paused split only for tag findings that have paused tags
<One or two sentences on the impact.> **Affected:** <exact names, comma separated; say "+N more" when notListed > 0>. **Fix:** <specific action>.

## Medium severity (<number>)
(same format as above)

## Low severity (<number>)
(same format as above)

## What passed
- <short bullets of the important checks that passed, e.g. one GA4 config tag, Conversion Linker present, no missing dependencies>

## Suggested fix order
- <5 or fewer prioritised steps, highest impact first>

Rules:
- Include EVERY finding, grouped under its severity. If a severity has none, write "- None found".
- Use the exact tag, trigger and variable names provided. Never invent names or numbers.
- Distinguish live from paused tags whenever the data gives the split; paused tags matter less than live ones.
- For consent findings, add one short caveat: Google tags using Consent Mode built-in checks are partly covered, but third-party tags (LinkedIn, Bing, Floodlight and similar) are not.
- Keep it concise and practical.

REPORT DATA:
${JSON.stringify(facts)}`;

    /* 3) Ask Claude (user's pasted token first, otherwise the server connection). */
    const { client, model } = await getClaude({ userApiKey: userKey });
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      system:
        "You are a senior Google Tag Manager implementation and analytics consultant. Be specific, accurate and actionable.",
      messages: [{ role: "user", content: prompt }],
    });

    const resultText = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n\n")
      .trim();

    if (!resultText) {
      return NextResponse.json({
        success: true,
        mode: "live",
        fallback: true,
        healthReport,
        resultText: buildLocalAudit(healthReport),
        truncated: false,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "live",
      healthReport,
      resultText,
      truncated: response.stop_reason === "max_tokens",
    });
  } catch (error: unknown) {
    const notConfigured = error instanceof ClaudeNotConfiguredError;
    const failure: AnthropicFailure = notConfigured
      ? { status: 500, code: "no_key", message: "AI audit is not configured." }
      : classifyAnthropicError(error);

    if (notConfigured) console.error("[claude] Not configured:", (error as Error).message);

    // The user's own token failed: send the code so the page can reopen the "paste token" popup.
    if (userKey && ["invalid_key", "quota", "rate_limit"].includes(failure.code)) {
      return NextResponse.json(
        { success: false, code: failure.code, error: failure.message },
        { status: failure.code === "rate_limit" ? 429 : 401 }
      );
    }

    // Shared connection unavailable: still give the user the rule-based report.
    if (healthReport && FALLBACK_CODES.includes(failure.code)) {
      return NextResponse.json({
        success: true,
        mode: "live",
        fallback: true,
        healthReport,
        resultText: buildLocalAudit(healthReport),
        truncated: false,
      });
    }

    return NextResponse.json(
      { success: false, code: failure.code, error: failure.message },
      { status: failure.status }
    );
  }
}