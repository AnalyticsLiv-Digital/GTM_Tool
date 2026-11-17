/** Exchange the user's stored Google refresh token for a short-lived access token. */
export async function googleAccessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as
    | { access_token?: string; error?: string }
    | null;
  if (!res.ok || !data?.access_token) {
    throw new Error(
      data?.error === "invalid_grant"
        ? "Google access was revoked or expired. Open the GTM tools app, sign in with Google again, and reconnect the connector in Claude."
        : "Could not refresh Google access."
    );
  }
  return data.access_token;
}
