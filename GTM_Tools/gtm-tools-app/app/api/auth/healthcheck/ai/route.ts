import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/claude";
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

type GtmRecord = Record<string, unknown>;

function affectedItem(x: unknown): { name: string } {
  if (typeof x === "string") return { name: x };
  if (x && typeof x === "object" && "name" in x && typeof (x as { name: unknown }).name === "string") {
    return { name: (x as { name: string }).name };
  }
  return { name: JSON.stringify(x) };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId } = body;

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: "Missing accountId, containerId, or workspaceId." },
        { status: 400 }
      );
    }

    // ── Below this line duplicates /api/auth/healthcheck/route.ts exactly,
    // so this endpoint is fully independent and never calls that route. ──

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const base = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
    // 8s budget across all three so we stay under Hobby's 10s function limit.
    const opts = { deadlineMs: 8_000 };

    const [tagsRes, triggersRes, variablesRes] = await Promise.all([
      gtmList<GtmRecord>({ url: `${base}/tags`, accessToken, listKey: "tag", options: opts }),
      gtmList<GtmRecord>({ url: `${base}/triggers`, accessToken, listKey: "trigger", options: opts }),
      gtmList<GtmRecord>({ url: `${base}/variables`, accessToken, listKey: "variable", options: opts }),
    ]);

    const hardFailures = [tagsRes, triggersRes, variablesRes].filter(
      (r) => r.error && r.items.length === 0
    );
    if (hardFailures.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch GTM data",
          details: hardFailures.map((r) => r.error),
        },
        { status: 502 }
      );
    }

    const tags = tagsRes.items;
    const triggers = triggersRes.items;
    const variables = variablesRes.items;

    const rawReport = runHealthCheck({
      tags,
      triggers,
      variables,
      accountId,
      containerId,
      workspaceId,
    });

    type ResultRow = {
      affectedTags?: unknown[];
      affectedTriggers?: unknown[];
      affectedVariables?: unknown[];
      [k: string]: unknown;
    };
    const normalizedResults = ((rawReport.results || []) as ResultRow[]).map((r) => ({
      ...r,
      affectedTags: (r.affectedTags ?? []).map(affectedItem),
      affectedTriggers: (r.affectedTriggers ?? []).map(affectedItem),
      affectedVariables: (r.affectedVariables ?? []).map(affectedItem),
    }));

    const healthReport = {
      ...rawReport,
      results: normalizedResults,
      truncated:
        tagsRes.truncated || triggersRes.truncated || variablesRes.truncated,
      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    };

    // ── End of duplicated logic. From here it's Claude-specific. ──

    // Build a compact version for the prompt — replace affected item arrays
    // with just their counts. This removes hundreds of tag/trigger/variable
    // names from what Claude has to read and (crucially) echo back, which
    // was the actual driver of truncation, not the ruleBreakdown schema.
    const compactResults = ((healthReport as { results?: unknown[] }).results ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        id: r.id,
        title: r.title,
        passed: r.passed,
        severity: r.severity,
        description: r.description,
        recommendation: r.recommendation,
        affectedTagsCount: r.affectedTags?.length ?? 0,
        affectedTriggersCount: r.affectedTriggers?.length ?? 0,
        affectedVariablesCount: r.affectedVariables?.length ?? 0,
      })
    );

    const compactHealthReport = {
      score: (healthReport as { score?: number }).score,
      passedCount: (healthReport as { passedCount?: number }).passedCount,
      failedCount: (healthReport as { failedCount?: number }).failedCount,
      counts: (healthReport as { counts?: unknown }).counts,
      results: compactResults,
    };

    const response = await client.messages.create({
      // Update this if your account/SDK version prefers a different current
      // alias — this route was previously pinned to the old
      // "claude-3-5-sonnet-latest" model.
      model: "claude-sonnet-5",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `You are an expert Google Tag Manager consultant. Analyze this GTM Health Check Report and respond with ONLY valid JSON — no markdown code fences, no backticks, no commentary before or after.

The report's "results" array is the ONLY source of truth — it already contains one entry per rule (id, title, passed, description, recommendation, affected item COUNTS — names have been omitted on purpose) from these exact rules: HC_HR_001, HC_HR_002, HC_HR_003, HC_HR_004, HC_HR_005, HC_MR_001, HC_MR_002, HC_MR_003, HC_MR_004, HC_LR_001, HC_LR_002, HC_LR_003, HC_LR_003A, HC_LR_003B, HC_LR_004, HC_LR_005. Do not introduce any other checks, categories, or opinions beyond what these 16 rules already found. Your job is to faithfully interpret and prioritize THESE results — not to run your own independent audit.

Return exactly this shape, and nothing else:
{
  "healthScore": number,
  "summary": string,
  "ruleBreakdown": [
    {
      "id": string,
      "status": "pass" | "fail",
      "insight": string
    }
  ],
  "criticalIssues": string[],
  "recommendations": string[],
  "priority": string[]
}

Rules for "healthScore": use the report's own top-level "score" field verbatim — do not recalculate or re-estimate it.

Rules for "ruleBreakdown" (keep this compact — do NOT repeat the rule's title, the client already has it):
- Include EXACTLY ONE entry per rule id found in the Health Report's "results" array — every single one of the 16, in the same order, none skipped and none added.
- "status" mirrors that rule's "passed" field ("pass" if passed is true, "fail" if false).
- "insight" is ONE short sentence, 12 words or fewer, using the given counts. For passed rules, a brief confirmation is fine (e.g. "No paused tags found.").

Other fields (all derived only from the same 16 results and their counts, nothing invented beyond them):
- "summary": 2-3 sentences, high-level synthesis across all 16 rules.
- "criticalIssues": at most the 8 most important FAILED rules' findings, most severe first, short sentences.
- "recommendations": at most 8 concrete next steps, each tied to a specific failed rule, short sentences.
- "priority": at most 6 short phrases naming which failed rule ids to fix first, in order.

Health Report:
${JSON.stringify(compactHealthReport, null, 2)}`,
        },
      ],
    });

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // If Claude ran out of tokens before finishing, the JSON will always be
    // truncated — surface that clearly instead of a generic parse error.
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json({
        success: true,
        healthReport,
        report: null,
        rawText,
        parseError:
          "Claude's response was cut off before it finished (hit the token limit). Try again — if this keeps happening, the max_tokens value in the API route may need to be raised further.",
      });
    }

    // Claude sometimes wraps JSON in ```json fences despite instructions —
    // strip them before parsing so the frontend always gets a real object.
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown = null;
    let parseError: string | null = null;

    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Failed to parse Claude's response as JSON.";
    }

    if (parseError) {
      return NextResponse.json({
        success: true,
        healthReport,
        report: null,
        rawText,
        parseError,
      });
    }

    // Guarantee healthScore always matches the deterministic report.score,
    // regardless of what Claude output — this is not something Claude
    // should be re-deriving.
    const finalReport =
      parsed && typeof parsed === "object"
        ? {
          ...(parsed as Record<string, unknown>),
          healthScore: (healthReport as { score?: number })?.score,
        }
        : parsed;

    return NextResponse.json({
      success: true,
      healthReport,
      report: finalReport,
    });
  } catch (error) {
    console.error("Claude Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}