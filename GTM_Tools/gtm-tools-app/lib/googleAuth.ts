import { cookies } from "next/headers";

export async function getValidGoogleAccessToken() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("google_access_token")?.value;
  const refreshToken = cookieStore.get("google_refresh_token")?.value;
  const expiry = cookieStore.get("google_access_token_expiry")?.value;

  // if access token exists and expiry exists
  if (accessToken && expiry) {
    const expiryTime = Number(expiry);

    // if token is still valid (keep 30 sec buffer)
    if (Date.now() < expiryTime - 30_000) {
      return accessToken;
    }
  }

  // if access token expired, try refresh token
  if (!refreshToken) {
    throw new Error("Refresh token missing. User must login again.");
  }

  // refresh access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Refresh token failed:", tokenData);
    throw new Error("Failed to refresh access token. User must login again.");
  }

  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const newExpiry = Date.now() + expiresIn * 1000;

  const isProd = process.env.NODE_ENV === "production";

  // update cookies with new access token
  cookieStore.set("google_access_token", newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });

  cookieStore.set("google_access_token_expiry", newExpiry.toString(), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return newAccessToken;
}