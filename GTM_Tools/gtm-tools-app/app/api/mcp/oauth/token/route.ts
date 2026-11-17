import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, getMcpConfig, MCP_SCOPE } from "@/lib/mcp/config";
import { open, pkceMatches, safeEqual, seal } from "@/lib/mcp/crypto";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 30 * 24 * 60 * 60;

const fail = (error: string, description: string, status = 400) =>
  NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );

const decodeBasicCredential = (value: string) => decodeURIComponent(value.replace(/\+/g, " "));

/** Step 3: exchange an authorization code or refresh token for an access token. */
export async function POST(req: NextRequest) {
  const cfg = getMcpConfig();
  if (!cfg) return fail("server_error", "The connector is not configured.", 503);

  const limit = rateLimit(`mcp-token:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return fail("slow_down", "Too many requests.", 429);

  const form = new URLSearchParams(await req.text());

  let clientId = form.get("client_id") ?? "";
  let clientSecret = form.get("client_secret") ?? "";
  const basic = req.headers.get("authorization");
  if (basic?.toLowerCase().startsWith("basic ")) {
    try {
      const credentials = Buffer.from(basic.slice(6), "base64").toString("utf8");
      const separator = credentials.indexOf(":");
      if (separator < 0) return fail("invalid_client", "Client authentication failed.", 401);
      clientId = decodeBasicCredential(credentials.slice(0, separator));
      clientSecret = decodeBasicCredential(credentials.slice(separator + 1));
    } catch {
      return fail("invalid_client", "Client authentication failed.", 401);
    }
  }

  if (!safeEqual(clientId, cfg.clientId) || !safeEqual(clientSecret, cfg.clientSecret)) {
    return fail("invalid_client", "Client authentication failed.", 401);
  }

  const grant = form.get("grant_type");
  let googleRefreshToken: string | null = null;

  if (grant === "authorization_code") {
    const code = open<{ rt: string; cid: string; ru: string; cc: string }>(
      cfg.secret,
      form.get("code") ?? "",
      "code"
    );
    const verifier = form.get("code_verifier") ?? "";
    if (!code || typeof code.rt !== "string") return fail("invalid_grant", "The code is invalid or expired.");
    if (code.cid !== clientId) return fail("invalid_grant", "The code was issued to another client.");
    if (code.ru !== (form.get("redirect_uri") ?? "")) return fail("invalid_grant", "redirect_uri does not match.");
    if (!pkceMatches(verifier, code.cc)) return fail("invalid_grant", "PKCE verification failed.");
    googleRefreshToken = code.rt;
  } else if (grant === "refresh_token") {
    const refresh = open<{ rt: string; cid: string }>(cfg.secret, form.get("refresh_token") ?? "", "refresh");
    if (!refresh || typeof refresh.rt !== "string" || refresh.cid !== clientId) {
      return fail("invalid_grant", "The refresh token is invalid or expired.");
    }
    googleRefreshToken = refresh.rt;
  } else {
    return fail("unsupported_grant_type", "Use authorization_code or refresh_token.");
  }

  return NextResponse.json(
    {
      access_token: seal(cfg.secret, { typ: "access", rt: googleRefreshToken, scope: MCP_SCOPE }, ACCESS_TTL),
      token_type: "Bearer",
      expires_in: ACCESS_TTL,
      refresh_token: seal(cfg.secret, { typ: "refresh", rt: googleRefreshToken, cid: clientId }, REFRESH_TTL),
      scope: MCP_SCOPE,
    },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store", Pragma: "no-cache" } }
  );
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });
