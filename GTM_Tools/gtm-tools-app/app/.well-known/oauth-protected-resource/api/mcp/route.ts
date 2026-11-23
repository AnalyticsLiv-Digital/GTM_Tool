import { NextResponse } from "next/server";
import { baseUrl, CORS_HEADERS, MCP_SCOPE } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const base = baseUrl(req);
  return NextResponse.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ["header"],
    },
    { headers: CORS_HEADERS }
  );
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });
