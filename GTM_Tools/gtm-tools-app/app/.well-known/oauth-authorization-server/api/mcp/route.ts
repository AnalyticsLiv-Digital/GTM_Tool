import { NextResponse } from "next/server";
import { baseUrl, CORS_HEADERS, MCP_SCOPE } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const base = baseUrl(req);
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
      token_endpoint: `${base}/api/mcp/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      scopes_supported: [MCP_SCOPE],
    },
    { headers: CORS_HEADERS }
  );
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });
