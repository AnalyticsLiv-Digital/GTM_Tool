import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { generateToken } from "@/lib/auth";
import { getUserByEmail, createUser } from "@/lib/db";

function statesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // CSRF: state must match the cookie issued in /api/auth/google/login.
    const cookieStore = await cookies();
    const expectedState = cookieStore.get("oauth_state")?.value;
    if (!returnedState || !expectedState || !statesEqual(returnedState, expectedState)) {
      return NextResponse.json(
        { error: "Invalid OAuth state" },
        { status: 400 }
      );
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "Token exchange failed", details: tokenData },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const accessTokenExpiry = Date.now() + expiresIn * 1000;

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const googleUser = await userRes.json();
    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user info", details: googleUser },
        { status: 401 }
      );
    }

    const { id: googleId, email, name, picture } = googleUser;
    if (!email) {
      return NextResponse.json(
        { error: "Google account email not found" },
        { status: 400 }
      );
    }

    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser({ name, email, picture, googleId });
    }

    const jwtToken = generateToken(user);
    const appUrl = process.env.APP_URL || url.origin;
    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.redirect(`${appUrl}/dashboard`);

    // Burn the state cookie — single use.
    response.cookies.delete("oauth_state");

    response.cookies.set("auth_token", jwtToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("google_access_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn,
    });

    response.cookies.set("google_access_token_expiry", accessTokenExpiry.toString(), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    if (refreshToken) {
      // 90d cap so a stale cookie can't outlive a session forever; Google may
      // invalidate it sooner if the user revokes access.
      response.cookies.set("google_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 90 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
