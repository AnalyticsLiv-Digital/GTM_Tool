import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  connectWebGoogleTagToServer,
} from "@/lib/gtm-web-tags";

async function getGoogleAccessToken(): Promise<string> {
  throw new Error(
    "Connect this to your existing Google OAuth implementation."
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const {
      accountId,
      webContainerId,
      webWorkspaceId,
      serverContainerUrl,
    } = body;

    if (
      !accountId ||
      !webContainerId ||
      !webWorkspaceId ||
      !serverContainerUrl
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "accountId, webContainerId, webWorkspaceId and serverContainerUrl are required.",
        },

        {
          status: 400,
        }
      );
    }

    const accessToken =
      await getGoogleAccessToken();

    const googleTag =
      await connectWebGoogleTagToServer(
        accessToken,

        accountId,

        webContainerId,

        webWorkspaceId,

        serverContainerUrl
      );

    return NextResponse.json({
      success: true,

      phase: 1,

      message:
        "Web GTM is connected to Server GTM.",

      googleTag,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Phase 1 failed.",
      },

      {
        status: 500,
      }
    );
  }
}