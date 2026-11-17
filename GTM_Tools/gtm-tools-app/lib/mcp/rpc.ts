/* eslint-disable @typescript-eslint/no-explicit-any */
import { TOOLS, callTool } from "./tools";

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export type RpcContext = { googleRefreshToken: string };

const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

/** Handle one JSON-RPC message. Notifications do not require a reply. */
export async function handleRpc(msg: any, ctx: RpcContext): Promise<unknown | null> {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid request");
  }

  const isNotification = msg.id === undefined || msg.id === null;
  const { method, params } = msg;
  if (isNotification) return null;

  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return ok(msg.id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "gtm-healthcheck", version: "1.0.0" },
        instructions:
          "Use gtm_list_workspaces to find IDs, then gtm_run_healthcheck to scan a workspace. Write the report from the returned data.",
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = params?.name;
      if (typeof name !== "string" || !TOOLS.some((tool) => tool.name === name)) {
        return err(msg.id, -32602, "Unknown tool");
      }
      const args = params?.arguments && typeof params.arguments === "object" ? params.arguments : {};
      return ok(msg.id, await callTool(name, args, ctx.googleRefreshToken));
    }
    default:
      return err(msg.id, -32601, `Method not found: ${method}`);
  }
}
