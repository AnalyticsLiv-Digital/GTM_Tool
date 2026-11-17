import { baseUrl, CORS_HEADERS, MCP_SCOPE } from "./config";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS_HEADERS },
  });

/** RFC 9728 metadata for the protected /api/mcp resource. */
export function protectedResourceMetadata(req: Request): Response {
  const base = baseUrl(req);
  return json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: [MCP_SCOPE],
    resource_name: "GTM HealthCheck",
  });
}

/** RFC 8414 metadata for the authorization server. */
export function authorizationServerMetadata(req: Request): Response {
  const base = baseUrl(req);
  return json({
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
    token_endpoint: `${base}/api/mcp/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    scopes_supported: [MCP_SCOPE],
  });
}

export const corsPreflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });
