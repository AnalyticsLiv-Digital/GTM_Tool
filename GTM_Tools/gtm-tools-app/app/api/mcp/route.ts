/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { baseUrl, CORS_HEADERS, getMcpConfig } from "@/lib/mcp/config";
import { open } from "@/lib/mcp/crypto";
import { handleRpc } from "@/lib/mcp/rpc";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const unauthorized = (req: Request, message: string) =>
  NextResponse.json(
    { error: "unauthorized", error_description: message },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "WWW-Authenticate": `Bearer realm="gtm-healthcheck", resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource/api/mcp"`,
      },
    }
  );

/** MCP Streamable HTTP endpoint: clients POST JSON-RPC messages here. */
export async function POST(req: NextRequest) {
  const cfg = getMcpConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "The Claude connector is not configured on this server." },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!bearer) return unauthorized(req, "Sign in is required.");

  const token = open<{ rt: string }>(cfg.secret, bearer, "access");
  if (!token || typeof token.rt !== "string" || !token.rt) {
    return unauthorized(req, "The access token is invalid or expired.");
  }

  const allowed = rateLimit(`mcp:${clientIp(req)}`, 60, 60_000);
if (!allowed) {
  return NextResponse.json(
    { error: "Too many requests." },
    { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const ctx = { googleRefreshToken: token.rt };

  if (Array.isArray(body)) {
    const replies = (await Promise.all(body.map((message) => handleRpc(message, ctx)))).filter((reply) => reply !== null);
    return replies.length
      ? NextResponse.json(replies, { headers: CORS_HEADERS })
      : new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  }

  const reply = await handleRpc(body, ctx);
  return reply === null
    ? new NextResponse(null, { status: 202, headers: CORS_HEADERS })
    : NextResponse.json(reply, { headers: CORS_HEADERS });
}

export const GET = () =>
  new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
export const DELETE = () =>
  new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });
