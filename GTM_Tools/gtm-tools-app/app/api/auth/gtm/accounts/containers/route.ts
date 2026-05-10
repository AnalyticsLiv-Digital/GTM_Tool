import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// Only allow GTM v2 paths shaped like `accounts/<id>(/<segment>)*`. Disallow
// schemes, traversal, query strings, and fragments so this route can never be
// turned into a generic SSRF proxy with the user's Google access token.
const SAFE_PATH = /^accounts\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\/?$/;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "path is required (example: accounts/123/containers/456)" },
        { status: 400 }
      );
    }

    if (!SAFE_PATH.test(path)) {
      return NextResponse.json(
        { error: "Invalid path. Must be a GTM v2 resource under accounts/." },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken().catch(() => null);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing or expired" },
        { status: 401 }
      );
    }

    const res = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/${path}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("accounts/containers proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
