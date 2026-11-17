import { NextRequest, NextResponse } from "next/server";
import { allowedRedirects, baseUrl, getMcpConfig, MCP_SCOPE } from "@/lib/mcp/config";
import { open, safeEqual, seal } from "@/lib/mcp/crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const page = (title: string, body: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f6f4;color:#161616;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
.card{background:#fff;border:1px solid #e2e2de;border-radius:14px;padding:28px;max-width:440px;width:100%}
h1{font-size:19px;margin:0 0 10px}p{font-size:14px;line-height:1.55;color:#444;margin:8px 0}ul{font-size:14px;color:#444;padding-left:18px;line-height:1.6}
.row{display:flex;gap:10px;margin-top:18px}button,a.btn{flex:1;text-align:center;padding:10px 14px;border-radius:9px;border:1px solid #cfcfca;background:#fff;font-size:14px;cursor:pointer;text-decoration:none;color:#161616}
button.primary{background:#161616;color:#fff;border-color:#161616}</style></head><body><div class="card">${body}</div></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "DENY",
      },
    }
  );

type AuthRequest = {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
};

const denyRedirect = (redirectUri: string, state: string, error: string) => {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url, 303);
};

/** Step 1: show consent in the user's signed-in browser. */
export async function GET(req: NextRequest) {
  const cfg = getMcpConfig();
  if (!cfg) {
    return page(
      "Not configured",
      "<h1>Connector not configured</h1><p>The server administrator must set the MCP environment variables first.</p>",
      503
    );
  }

  const query = req.nextUrl.searchParams;
  const clientId = query.get("client_id") ?? "";
  const redirectUri = query.get("redirect_uri") ?? "";
  const state = query.get("state") ?? "";
  const challenge = query.get("code_challenge") ?? "";

  if (!safeEqual(clientId, cfg.clientId)) {
    return page("Invalid request", "<h1>Invalid request</h1><p>Unknown client.</p>", 400);
  }
  if (!allowedRedirects().includes(redirectUri)) {
    return page("Invalid request", "<h1>Invalid request</h1><p>This return address is not allowed.</p>", 400);
  }
  if (
    query.get("response_type") !== "code" ||
    query.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)
  ) {
    return denyRedirect(redirectUri, state, "invalid_request");
  }

  if (!req.cookies.get("google_refresh_token")?.value) {
    return page(
      "Sign in first",
      `<h1>Sign in to GTM HealthCheck first</h1><p>You are not signed in with Google in this browser.</p>
<p>Open the app, sign in with Google, then go back to Claude and click Connect again.</p>
<div class="row"><a class="btn primary" href="${escapeHtml(baseUrl(req))}" target="_blank" rel="noopener">Open GTM HealthCheck</a></div>`
    );
  }

  const authRequest: AuthRequest = {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
  };
  const sealed = seal(cfg.secret, { typ: "authreq", ...authRequest }, 600);

  return page(
    "Connect Claude",
    `<h1>Let Claude use GTM HealthCheck?</h1>
<p>Claude will be able to:</p>
<ul><li>list your Google Tag Manager accounts, containers and workspaces</li><li>run read-only health checks on a workspace you choose</li></ul>
<p>It cannot change, publish or delete anything in your containers.</p>
<form method="post" action="${escapeHtml(baseUrl(req))}/api/mcp/oauth/authorize"><input type="hidden" name="req" value="${escapeHtml(sealed)}">
<div class="row"><button type="submit" name="decision" value="deny">Cancel</button><button class="primary" type="submit" name="decision" value="allow">Allow</button></div></form>`
  );
}

/** Step 2: issue a short-lived sealed authorization code after consent. */
export async function POST(req: NextRequest) {
  const cfg = getMcpConfig();
  if (!cfg) return page("Not configured", "<h1>Connector not configured</h1>", 503);

  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(baseUrl(req)).origin) {
    return page("Blocked", "<h1>Request blocked</h1><p>Cross-site request.</p>", 403);
  }

  const form = await req.formData().catch(() => null);
  const sealed = String(form?.get("req") ?? "");
  const decision = String(form?.get("decision") ?? "");
  const authRequest = open<AuthRequest>(cfg.secret, sealed, "authreq");

  if (
    !authRequest ||
    authRequest.client_id !== cfg.clientId ||
    !allowedRedirects().includes(authRequest.redirect_uri)
  ) {
    return page("Expired", "<h1>This request expired</h1><p>Go back to Claude and click Connect again.</p>", 400);
  }

  if (decision !== "allow") {
    return denyRedirect(authRequest.redirect_uri, authRequest.state, "access_denied");
  }

  const refreshToken = req.cookies.get("google_refresh_token")?.value;
  if (!refreshToken) {
    return page(
      "Sign in first",
      "<h1>Sign in first</h1><p>Your Google session ended. Sign in to GTM HealthCheck, then connect again from Claude.</p>",
      401
    );
  }

  const code = seal(
    cfg.secret,
    {
      typ: "code",
      rt: refreshToken,
      cid: authRequest.client_id,
      ru: authRequest.redirect_uri,
      cc: authRequest.code_challenge,
      scope: MCP_SCOPE,
    },
    120
  );

  const url = new URL(authRequest.redirect_uri);
  url.searchParams.set("code", code);
  if (authRequest.state) url.searchParams.set("state", authRequest.state);
  return NextResponse.redirect(url, 303);
}
