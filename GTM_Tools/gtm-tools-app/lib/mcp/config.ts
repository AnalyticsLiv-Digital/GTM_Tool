  /** Settings for the Claude connector (MCP server and sign-in). */

  export const MCP_SCOPE = "gtm:healthcheck";

  const DEFAULT_REDIRECTS = [
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
  ];

  export function allowedRedirects(): string[] {
    const extra = (process.env.MCP_EXTRA_REDIRECT_URIS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return [...DEFAULT_REDIRECTS, ...extra];
  }

  export type McpConfig = {
    secret: string;
    clientId: string;
    clientSecret: string;
  };

  export function getMcpConfig(): McpConfig | null {
    const secret = process.env.MCP_TOKEN_SECRET?.trim() ?? "";
    const clientId = process.env.MCP_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.MCP_CLIENT_SECRET?.trim() ?? "";
    if (secret.length < 32 || !clientId || clientSecret.length < 16) return null;
    return { secret, clientId, clientSecret };
  }

  /** Public HTTPS origin of the app; configure APP_BASE_URL in production. */
  export function baseUrl(req: Request): string {
    const fromEnv = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
    if (fromEnv) return fromEnv;
    const url = new URL(req.url);
    const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
    return `${proto}://${host}`;
  }

  export const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
  };
