import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
      accessToken,
      listKey: "container",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to fetch containers",
          details: result.error.body,
        },
        {
          status: result.error.status || 502,
        }
      );
    }

    /*
     * Normalize the Google response.
     *
     * This makes sure usageContext is preserved and visible
     * to the frontend.
     */
    const containers = result.items.map((container) => {
      const item = container as Record<string, unknown>;

      return {
        accountId: item.accountId,
        containerId: item.containerId,
        name: item.name,
        publicId: item.publicId,
        path: item.path,
        usageContext: Array.isArray(item.usageContext)
          ? item.usageContext
          : [],
        domainName: Array.isArray(item.domainName)
          ? item.domainName
          : [],
        tagManagerUrl: item.tagManagerUrl,
        fingerprint: item.fingerprint,
      };
    });

    console.log(
      "========== GTM CONTAINERS =========="
    );

    console.log(
      JSON.stringify(
        containers,
        null,
        2
      )
    );

    console.log(
      "===================================="
    );

    return NextResponse.json({
      container: containers,
      truncated: result.truncated,
      pages: result.pages,
    });
  } catch (err: unknown) {
    console.error(
      "GTM containers GET error:",
      err
    );

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
