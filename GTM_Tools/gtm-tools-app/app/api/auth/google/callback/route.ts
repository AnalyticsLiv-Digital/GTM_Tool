
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { generateToken } from "@/lib/auth";
import { getUserByEmail, createUser } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      return NextResponse.json(
        { error: "Missing Google authorization code" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("oauth_state")?.value;

    if (
      !returnedState ||
      !expectedState ||
      !statesEqual(returnedState, expectedState)
    ) {
      console.error("Google OAuth state validation failed:", {
        returnedStatePresent: Boolean(returnedState),
        cookieStatePresent: Boolean(expectedState),
        returnedStateLength: returnedState?.length || 0,
        cookieStateLength: expectedState?.length || 0,
        callbackHost: url.host,
      });

      return NextResponse.json(
        {
          error: "Invalid OAuth state",
          details: "The OAuth state cookie is missing or does not match. Start Google login again using the same deployment URL.",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "Google OAuth environment variables are missing" },
        { status: 500 }
      );
    }

    const tokenRes = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        cache: "no-store",
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", tokenData);

      return NextResponse.json(
        { error: "Google token exchange failed" },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    const accessTokenExpiry = Date.now() + expiresIn * 1000;

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const googleUser = await userRes.json();

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google user information" },
        { status: 401 }
      );
    }

    const {
      id: googleId,
      email,
      name,
      picture,
    } = googleUser;

    if (!email) {
      return NextResponse.json(
        { error: "Google account email not found" },
        { status: 400 }
      );
    }

    let user = await getUserByEmail(email);

    if (!user) {
      user = await createUser({
        name,
        email,
        picture,
        googleId,
      });
    }

    const jwtToken = generateToken(user);

    // Redirect to the same deployment that handled the callback.
    const appUrl = url.origin;

    const response = NextResponse.redirect(
      `${appUrl}/dashboard`
    );

    response.cookies.delete("oauth_state");

    response.cookies.set("auth_token", jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("google_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn,
    });

    response.cookies.set(
      "google_access_token_expiry",
      accessTokenExpiry.toString(),
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      }
    );

    if (refreshToken) {
      response.cookies.set("google_refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 90 * 24 * 60 * 60,
      });
    }

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Google callback error:", error);

    return NextResponse.json(
      { error: "Google authentication failed" },
      { status: 500 }
    );
  }
}
