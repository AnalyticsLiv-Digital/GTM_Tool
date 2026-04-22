import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("google_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ accessToken: null }, { status: 200 });
  }

  return NextResponse.json({ accessToken }, { status: 200 });
}