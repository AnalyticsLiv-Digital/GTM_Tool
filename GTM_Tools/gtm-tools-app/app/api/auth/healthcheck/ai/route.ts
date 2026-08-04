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

    // Give Claude the RAW container shape — not our precomputed rule
    // results — so it forms its own independent judgment, the same way it
    // would in a normal conversation if you pasted this data directly.
    // Kept compact (names/types/counts, not full parameter blobs) so the
    // input stays a reasonable size, but nothing here is filtered through
    // our own rule engine's conclusions.
    // Send Claude the FULL raw tag/trigger/variable objects, shaped like an
    // actual GTM export file — the same experience as pasting a real
    // exported JSON and asking for a health check, not a stripped-down
    // summary. No file-upload feature is added; this uses the data already
    // fetched live from the GTM API above.
    const containerExport = {
      tag: tags,
      trigger: triggers,
      variable: variables,
    };

    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `You're an expert Google Tag Manager consultant. Here is the raw exported JSON of my GTM container — the same shape as a real GTM container export file (tag, trigger, variable arrays with full config). Give me a full health check audit of it, exactly like you would if I'd shared this file with you directly in a normal conversation. Don't restate categories from some external checklist — look at the actual data and tell me what you genuinely find. Use your own judgment and expertise.

Structure your response in this order:

## Critical Issues
The most serious problems — things that break tracking, cause duplicate/conflicting data, or are outright dead (e.g. legacy Universal Analytics tags, tags with contradictory trigger config, missing consent setup on ad/analytics tags, duplicate GA4 config, tags firing on every page that shouldn't be). Explain *why* each one matters, not just that it exists.

## Warnings / Cleanup Opportunities
Lower-severity but real issues — paused tags left in the workspace, unused tags/triggers/variables, naming inconsistencies, tags that look like duplicates of each other, overly broad triggers, risky Custom HTML.

## What's Working Well
Call out genuinely good patterns you notice — a real audit isn't just a list of problems.

## What To Do Next
A prioritized, concrete action list. Name specific tags/triggers/variables for the highest-priority items; group the rest by pattern/count. Order it by what matters most to fix first.

Keep it focused and readable — this container may have 100+ items. Don't enumerate every single tag/trigger/variable by name in the first three sections; summarize patterns and counts, and only name specific items when they're a standout example worth calling out individually. Use markdown headers/bold/bullets as shown above.

Container export:
${JSON.stringify(containerExport)}`,
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