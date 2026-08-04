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

    // Compact version for the prompt — counts only, no full name lists, so
    // the input stays small and Claude has less material to over-quote.
    const compactResults = normalizedResults.map((r: ResultRow) => ({
      id: r.id,
      title: r.title,
      passed: r.passed,
      severity: r.severity,
      description: r.description,
      recommendation: r.recommendation,
      affectedTagsCount: r.affectedTags?.length ?? 0,
      affectedTriggersCount: r.affectedTriggers?.length ?? 0,
      affectedVariablesCount: r.affectedVariables?.length ?? 0,
    }));

    const compactHealthReport = {
      score: healthReport.score,
      passedCount: healthReport.passedCount,
      failedCount: healthReport.failedCount,
      counts: healthReport.counts,
      results: compactResults,
    };

    // No forced JSON schema — this is a normal Claude conversation turn,
    // same as talking to Claude directly. It writes its own natural,
    // well-organized response (markdown headers/bullets are fine), just
    // grounded in the real rule results instead of inventing new checks.
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You're an expert Google Tag Manager consultant looking at a health check report for my container. Give me your actual take on it — like you would in a normal conversation, not a rigid template.

Ground everything in the report below (score, pass/fail per rule, counts) — don't invent findings beyond what these checks actually found. Feel free to use markdown (headers, bold, bullet points) to organize your answer, prioritize what matters most, and write in your own voice. Keep it focused — I don't need every passing rule restated, just what's actually worth my attention and what to do about it.

Health Check Report:
${JSON.stringify(compactHealthReport, null, 2)}`,
        },
      ],
    });

    // Don't assume content[0] is the text block — some responses include a
    // non-text block first (e.g. thinking), which previously caused an
    // empty resultText even though Claude actually returned real text.
    const textBlock = response.content.find((c) => c.type === "text");
    const resultText = textBlock && "text" in textBlock ? textBlock.text : "";

    return NextResponse.json({
      success: true,
      healthReport,
      resultText,
      truncated: response.stop_reason === "max_tokens",
    });
  } catch (error) {
    console.error("Claude Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}