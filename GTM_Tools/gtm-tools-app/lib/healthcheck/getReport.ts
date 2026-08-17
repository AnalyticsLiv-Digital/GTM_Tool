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

export type GetReportParams = {
  accountId: string;
  containerId: string;
  workspaceId: string;
};

export type GetReportResult =
  | { ok: true; report: Record<string, unknown> }
  | { ok: false; status: number; error: string; details?: unknown };

/**
 * Fetches GTM tags/triggers/variables and runs the health check rules.
 * Both /api/auth/healthcheck and /api/auth/healthcheck/ai call this
 * independently — neither route depends on the other.
 */
export async function getHealthCheckReport({
  accountId,
  containerId,
  workspaceId,
}: GetReportParams): Promise<GetReportResult> {
  if (!accountId || !containerId || !workspaceId) {
    return { ok: false, status: 400, error: "Missing required fields" };
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing Google access token" };
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
    return {
      ok: false,
      status: 502,
      error: "Failed to fetch GTM data",
      details: hardFailures.map((r) => r.error),
    };
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

  return {
    ok: true,
    report: {
      ...report,
      results: normalizedResults,
      truncated:
        tagsRes.truncated || triggersRes.truncated || variablesRes.truncated,
      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    },
  };
}