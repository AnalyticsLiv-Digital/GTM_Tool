/* eslint-disable @typescript-eslint/no-explicit-any */
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { gtmList } from "@/lib/gtm/list";
import { buildReportFacts, REPORT_INSTRUCTIONS, cleanName } from "@/lib/healthcheck/reportFacts";
import { googleAccessTokenFromRefresh } from "./google";

type GtmRecord = Record<string, unknown>;

export const TOOLS = [
  {
    name: "gtm_list_workspaces",
    description:
      "Lists the Google Tag Manager accounts, containers and workspaces the signed-in user can access, with their IDs. Call this first to find the accountId, containerId and workspaceId needed by gtm_run_healthcheck.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "gtm_run_healthcheck",
    description:
      "Scans a live GTM workspace (tags, triggers, variables) with the health check rules and returns the verified findings plus instructions for writing the health check report. Read-only: it never changes the container.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "GTM account ID (digits), from gtm_list_workspaces." },
        containerId: { type: "string", description: "GTM container ID (digits), from gtm_list_workspaces." },
        workspaceId: { type: "string", description: "GTM workspace ID (digits), from gtm_list_workspaces." },
      },
      required: ["accountId", "containerId", "workspaceId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

const GTM = "https://tagmanager.googleapis.com/tagmanager/v2";
const isId = (value: unknown): value is string => typeof value === "string" && /^\d{1,20}$/.test(value.trim());

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };
const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: "text", text: value }],
  ...(isError ? { isError: true } : {}),
});

async function listWorkspaces(token: string): Promise<ToolResult> {
  const opts = { deadlineMs: 20_000 };
  const accounts = await gtmList<GtmRecord>({
    url: `${GTM}/accounts`,
    accessToken: token,
    listKey: "account",
    options: opts,
  });
  if (accounts.error && accounts.items.length === 0) {
    return text(`Could not list GTM accounts: ${accounts.error}`, true);
  }

  const out: any[] = [];
  let containerBudget = 25;

  for (const account of accounts.items.slice(0, 10)) {
    if (containerBudget <= 0) break;
    const accountId = String(account.accountId ?? "");
    if (!isId(accountId)) continue;

    const containers = await gtmList<GtmRecord>({
      url: `${GTM}/accounts/${accountId}/containers`,
      accessToken: token,
      listKey: "container",
      options: opts,
    });

    const picked = containers.items.slice(0, containerBudget);
    containerBudget -= picked.length;

    const withWorkspaces = await Promise.all(
      picked.map(async (container) => {
        const containerId = String(container.containerId ?? "");
        if (!isId(containerId)) return null;
        const workspaces = await gtmList<GtmRecord>({
          url: `${GTM}/accounts/${accountId}/containers/${containerId}/workspaces`,
          accessToken: token,
          listKey: "workspace",
          options: opts,
        });
        return {
          containerId,
          name: cleanName(container.name ?? ""),
          publicId: cleanName(container.publicId ?? ""),
          workspaces: workspaces.items.map((workspace) => ({
            workspaceId: String(workspace.workspaceId ?? ""),
            name: cleanName(workspace.name ?? ""),
          })),
        };
      })
    );

    out.push({
      accountId,
      name: cleanName(account.name ?? ""),
      containers: withWorkspaces.filter(Boolean),
    });
  }

  if (out.length === 0) return text("No Google Tag Manager accounts were found for this Google user.", true);
  return text(JSON.stringify(out, null, 2));
}

async function runHealthcheck(token: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { accountId, containerId, workspaceId } = args;
  if (!isId(accountId) || !isId(containerId) || !isId(workspaceId)) {
    return text(
      "accountId, containerId and workspaceId must be numeric GTM IDs. Call gtm_list_workspaces to find them.",
      true
    );
  }

  const base = `${GTM}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
  const opts = { deadlineMs: 30_000 };
  const [tagsRes, triggersRes, variablesRes] = await Promise.all([
    gtmList<GtmRecord>({ url: `${base}/tags`, accessToken: token, listKey: "tag", options: opts }),
    gtmList<GtmRecord>({ url: `${base}/triggers`, accessToken: token, listKey: "trigger", options: opts }),
    gtmList<GtmRecord>({ url: `${base}/variables`, accessToken: token, listKey: "variable", options: opts }),
  ]);

  const hardFailure = [tagsRes, triggersRes, variablesRes].find((result) => result.error && result.items.length === 0);
  if (hardFailure) return text(`Could not load the GTM workspace: ${hardFailure.error}`, true);

  const tags = tagsRes.items;
  const triggers = triggersRes.items;
  const variables = variablesRes.items;
  const incomplete = tagsRes.truncated || triggersRes.truncated || variablesRes.truncated;

  const raw = runHealthCheck({ tags, triggers, variables, accountId, containerId, workspaceId });
  const report = {
    ...raw,
    results: raw.results ?? [],
    counts: { tags: tags.length, triggers: triggers.length, variables: variables.length },
  };
  const facts = buildReportFacts(report);
  const note = incomplete
    ? "\n\nNOTE: some lists could not be loaded completely, so the counts and findings may be incomplete. Tell the user."
    : "";

  return text(`${REPORT_INSTRUCTIONS}${note}\n\nSCAN DATA:\n${JSON.stringify(facts)}`);
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  googleRefreshToken: string
): Promise<ToolResult> {
  try {
    const token = await googleAccessTokenFromRefresh(googleRefreshToken);
    if (name === "gtm_list_workspaces") return await listWorkspaces(token);
    if (name === "gtm_run_healthcheck") return await runHealthcheck(token, args);
    return text(`Unknown tool: ${name}`, true);
  } catch (error) {
    console.error("[mcp] tool failed:", name, error instanceof Error ? error.message : error);
    return text(error instanceof Error ? error.message : "The tool failed.", true);
  }
}
