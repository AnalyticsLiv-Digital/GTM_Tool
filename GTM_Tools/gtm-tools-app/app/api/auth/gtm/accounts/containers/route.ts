import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "path is required (example: accounts/123/containers/456)" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}