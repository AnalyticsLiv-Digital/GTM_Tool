import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI missing)" },
      { status: 500 }
    );
  }

  const state = randomBytes(32).toString("hex");

  const scope = encodeURIComponent(
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/tagmanager.edit.containers",
      "https://www.googleapis.com/auth/tagmanager.delete.containers",
    ].join(" ")
  );

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    "client_id=" + encodeURIComponent(clientId) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=code" +
    "&scope=" + scope +
    "&state=" + state +
    "&access_type=offline" +
    "&prompt=consent" +
    "&include_granted_scopes=true";

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
