
import { NextRequest, NextResponse } from "next/server";

const GTM_API = "https://tagmanager.googleapis.com/tagmanager/v2";

type GTMParameter = {
  type: string;
  key?: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
};

type GTMTag = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  tagId?: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
  fingerprint?: string;
  [key: string]: unknown;
};

/**
 * IMPORTANT:
 * Replace this function with your EXISTING Google OAuth session/token
 * helper. Never accept an access token sent by the browser.
 *
 * The helper must return the signed-in user's valid Google access token.
 */
async function getGoogleAccessToken(
  _request: NextRequest
): Promise<string> {
  void _request;
  throw new Error(
    "Connect getGoogleAccessToken() to your existing Google OAuth implementation."
  );
}

async function gtmRequest<T>(
  accessToken: string,
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(`${GTM_API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Google Tag Manager API ${response.status}: ${text}`);
  }

  return (text ? JSON.parse(text) : {}) as T;
}

function encodePath(value: string) {
  return encodeURIComponent(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      accountId,
      webContainerId,
      webWorkspaceId,
      serverContainerId,
      serverContainerUrl,
    } = body as {
      accountId?: string;
      webContainerId?: string;
      webWorkspaceId?: string;
      serverContainerId?: string;
      serverContainerUrl?: string;
    };

    if (
      !accountId ||
      !webContainerId ||
      !webWorkspaceId ||
      !serverContainerId ||
      !serverContainerUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All container, workspace, and URL fields are required.",
        },
        { status: 400 }
      );
    }

    const parsedUrl = new URL(serverContainerUrl);

    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== "/" ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter an HTTPS Server Container origin, e.g. https://sgtm.example.com.",
        },
        { status: 400 }
      );
    }

    // Confirm that the selected container is actually a Server container.
    const accessToken = await getGoogleAccessToken(request);

    const serverContainer = await gtmRequest<{
      containerId: string;
      usageContext?: string[];
    }>(
      accessToken,
      `accounts/${encodePath(accountId)}/containers/${encodePath(serverContainerId)}`
    );

    if (
      !serverContainer.usageContext?.includes("SERVER")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected container is not identified as a Server GTM container.",
        },
        { status: 400 }
      );
    }

    const workspacePath =
      `accounts/${encodePath(accountId)}` +
      `/containers/${encodePath(webContainerId)}` +
      `/workspaces/${encodePath(webWorkspaceId)}`;

    // Read existing Web workspace tags.
    const response = await gtmRequest<{ tag?: GTMTag[] }>(
      accessToken,
      `${workspacePath}/tags`
    );

    const googleTags = (response.tag || []).filter(
      (tag) => tag.type === "googtag"
    );

    if (googleTags.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No Google Tag (googtag) was found in this Web workspace. Create or import a Google Tag first.",
        },
        { status: 404 }
      );
    }

    // Update each Google Tag in the workspace so the connection
    // applies to all Google Tags found here.
    const updatedTags: string[] = [];

    for (const tag of googleTags) {
      if (!tag.tagId) continue;

      const parameters = [...(tag.parameter || [])];

      const serverUrlParameter = parameters.find(
        (parameter) => parameter.key === "server_container_url"
      );

      if (serverUrlParameter) {
        serverUrlParameter.type = "TEMPLATE";
        serverUrlParameter.value = parsedUrl.origin;
      } else {
        parameters.push({
          type: "TEMPLATE",
          key: "server_container_url",
          value: parsedUrl.origin,
        });
      }

      const updatedTag: GTMTag = {
        ...tag,
        parameter: parameters,
      };

      await gtmRequest<GTMTag>(
        accessToken,
        `${workspacePath}/tags/${encodePath(tag.tagId)}`,
        "PUT",
        updatedTag
      );

      updatedTags.push(tag.name);
    }

    if (updatedTags.length === 0) {
      throw new Error("No Google Tags could be updated.");
    }

    return NextResponse.json({
      success: true,
      message:
        `Configured ${updatedTags.length} Google Tag(s). ` +
        "Changes are saved to the Web workspace and have not been published.",
      serverContainerId,
      serverContainerUrl: parsedUrl.origin,
      updatedTags,
    });
  } catch (error) {
    console.error("Web-to-Server GTM configuration failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to configure Web-to-Server GTM.",
      },
      { status: 500 }
    );
  }
}
