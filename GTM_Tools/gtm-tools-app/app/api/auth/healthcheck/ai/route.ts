import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";
import { classifyAnthropicError } from "@/lib/anthropicError";

type GtmRecord = Record<string, unknown>;

function affectedItem(x: unknown): { name: string } {
  if (typeof x === "string") return { name: x };
  if (x && typeof x === "object" && "name" in x && typeof (x as { name: unknown }).name === "string") {
    return { name: (x as { name: string }).name };
  }
  try {
    return { name: JSON.stringify(x) };
  } catch {
    return { name: "Unknown item" };
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. READ REQUEST
    const body = await req.json();
    const { accountId, containerId, workspaceId } = body ?? {};

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: "Missing accountId, containerId, or workspaceId." },
        { status: 400 }
      );
    }

    // 1b. READ USER API KEY (from header, never from a DB)
    const apiKey = req.headers.get("x-anthropic-key")?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, code: "no_key", error: "Missing Anthropic API key. Please connect your key." },
        { status: 401 }
      );
    }

    // 2. GOOGLE ACCESS TOKEN
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing Google access token." },
        { status: 401 }
      );
    }

    // 3. GTM BASE URL
    const base =
      `https://tagmanager.googleapis.com/tagmanager/v2/` +
      `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
    const opts = { deadlineMs: 8_000 };

    // 4. FETCH TAGS / TRIGGERS / VARIABLES
    const [tagsRes, triggersRes, variablesRes] = await Promise.all([
      gtmList<GtmRecord>({ url: `${base}/tags`, accessToken, listKey: "tag", options: opts }),
      gtmList<GtmRecord>({ url: `${base}/triggers`, accessToken, listKey: "trigger", options: opts }),
      gtmList<GtmRecord>({ url: `${base}/variables`, accessToken, listKey: "variable", options: opts }),
    ]);

    // 5. CHECK GTM FAILURES
    const hardFailures = [tagsRes, triggersRes, variablesRes].filter(
      (r) => r.error && r.items.length === 0
    );
    if (hardFailures.length > 0) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch GTM data.", details: hardFailures.map((r) => r.error) },
        { status: 502 }
      );
    }

    // 6. DATA
    const tags = tagsRes.items;
    const triggers = triggersRes.items;
    const variables = variablesRes.items;

    // 7. FUNCTIONAL HEALTH CHECK
    const rawReport = runHealthCheck({ tags, triggers, variables, accountId, containerId, workspaceId });

    // 8. NORMALIZE
    type ResultRow = {
      affectedTags?: unknown[];
      affectedTriggers?: unknown[];
      affectedVariables?: unknown[];
      [key: string]: unknown;
    };
    const normalizedResults = ((rawReport.results || []) as ResultRow[]).map((result) => ({
      ...result,
      affectedTags: (result.affectedTags ?? []).map(affectedItem),
      affectedTriggers: (result.affectedTriggers ?? []).map(affectedItem),
      affectedVariables: (result.affectedVariables ?? []).map(affectedItem),
    }));

    // 9. FULL REPORT
    const healthReport = {
      ...rawReport,
      results: normalizedResults,
      truncated:
        Boolean(tagsRes.truncated) || Boolean(triggersRes.truncated) || Boolean(variablesRes.truncated),
      counts: { tags: tags.length, triggers: triggers.length, variables: variables.length },
    };

    // 10. RAW CONTAINER FOR CLAUDE
    const containerExport = { tag: tags, trigger: triggers, variable: variables };

    // 11. PROMPT (unchanged)
    const prompt = `
You are an expert Google Tag Manager consultant.

You are auditing a live GTM workspace.

Below is the raw GTM container data containing:

- Tags
- Triggers
- Variables

Analyze the actual configuration and identify real tracking,
configuration, duplication, cleanup, consent, trigger,
variable, and implementation problems.

Do NOT assume that every item is problematic.

Use your own GTM expertise and inspect the actual data.

IMPORTANT:

- Do not invent tags, triggers, or variables.
- Only mention items that actually exist in the provided data.
- If something cannot be determined from the data, say so.
- Do not assume that every "googtag" is a GA4 tag.
- Check tag types and parameters carefully.
- Consider trigger relationships.
- Consider variable references.
- Consider paused tags.
- Consider duplicate or very similar configurations.
- Consider overly broad triggers.
- Consider unused assets.
- Consider legacy implementations.
- Consider consent configuration when evidence exists.
- Consider Custom HTML risks.
- Consider GA4 and Google Ads configuration where applicable.

Return ONLY normal Markdown text.

Do NOT return JSON.

Do NOT wrap the response in a code block.

Use exactly these sections:

## Critical Issues
## Warnings / Cleanup Opportunities
## What's Working Well
## What To Do Next

Keep the response focused and readable.
The container can contain many assets, so do not unnecessarily
list every tag, trigger, and variable.

RAW GTM CONTAINER:

${JSON.stringify(containerExport)}
`;

    // 12. CALL CLAUDE (per-request client using the USER's key)
    let response;
    try {
      const client = new Anthropic({ apiKey });

      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 20000,
        system: "You are a senior Google Tag Manager implementation and analytics consultant.",
        messages: [{ role: "user", content: prompt }],
      });
    } catch (claudeError: unknown) {
      const failure = classifyAnthropicError(claudeError);
      console.error("Claude API request failed:", failure.code, failure.message);
      return NextResponse.json(
        { success: false, code: failure.code, error: failure.message },
        { status: failure.status }
      );
    }

    // 13. EXTRACT TEXT
    const resultText = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c.type === "text" ? c.text : ""))
      .filter(Boolean)
      .join("\n\n")
      .trim();

    // 14. EMPTY CHECK
    if (!resultText) {
      console.error("Claude returned an empty response.", { stopReason: response.stop_reason });
      return NextResponse.json(
        { success: false, error: "Claude returned an empty response.", stopReason: response.stop_reason },
        { status: 502 }
      );
    }

    // 15. TRUNCATION
    const truncated = response.stop_reason === "max_tokens";
    if (truncated) console.warn("Claude AI audit reached max_tokens.");

    // 16. SUCCESS
    return NextResponse.json({
      success: true,
      healthReport,
      resultText,
      truncated,
      counts: { tags: tags.length, triggers: triggers.length, variables: variables.length },
    });
  } catch (error: unknown) {
    console.error("Claude HealthCheck Route Error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}