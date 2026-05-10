import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

export async function GET() {
  try {
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const result = await gtmList<Record<string, unknown>>({
      url: "https://tagmanager.googleapis.com/tagmanager/v2/accounts",
      accessToken,
      listKey: "account",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch accounts", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      account: result.items,
      truncated: result.truncated,
      pages: result.pages,
    });
  } catch (err: unknown) {
    console.error("Accounts GET Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
