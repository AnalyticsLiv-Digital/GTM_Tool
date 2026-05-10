import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId } = body;

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
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

    // If any fetch had a hard error AND returned no data, fail the run; otherwise
    // accept partials and flag truncation so the UI can surface a warning.
    const hardFailures = [tagsRes, triggersRes, variablesRes].filter(
      (r) => r.error && r.items.length === 0
    );
    if (hardFailures.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to fetch GTM data",
          details: hardFailures.map((r) => r.error),
        },
        { status: 502 }
      );
    }

    const tags = tagsRes.items;
    const triggers = triggersRes.items;
    const variables = variablesRes.items;

    const report = runHealthCheck({
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
    const normalizedResults = ((report.results || []) as ResultRow[]).map((r) => ({
      ...r,
      affectedTags: (r.affectedTags ?? []).map(affectedItem),
      affectedTriggers: (r.affectedTriggers ?? []).map(affectedItem),
      affectedVariables: (r.affectedVariables ?? []).map(affectedItem),
    }));

    return NextResponse.json({
      ...report,
      results: normalizedResults,
      truncated:
        tagsRes.truncated || triggersRes.truncated || variablesRes.truncated,
      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    });
  } catch (error) {
    console.error("HealthCheck API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
