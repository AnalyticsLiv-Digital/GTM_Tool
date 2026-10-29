
import { NextRequest, NextResponse } from "next/server";

import {
  configureWebGtag,
  getOrCreateServerEventTrigger,
  configureServerGa4EventTag,
  verifyServerGa4Client,
} from "@/lib/gtm/gtm-automation";

export const runtime = "nodejs";

type Body = {
  accountId: string;
  webContainerId: string;
  webWorkspaceId: string;
  serverContainerId: string;
  serverWorkspaceId: string;
  serverContainerUrl: string;
  measurementId: string;
  eventNames?: string[];
};

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function validateUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid server tagging URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Server tagging URL must use HTTPS.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Enter the server tagging origin without credentials, query parameters, or a fragment."
    );
  }

  return url.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<Body>;

    const accountId = required(body.accountId, "accountId");
    const webContainerId = required(
      body.webContainerId,
      "webContainerId"
    );
    const webWorkspaceId = required(
      body.webWorkspaceId,
      "webWorkspaceId"
    );
    const serverContainerId = required(
      body.serverContainerId,
      "serverContainerId"
    );
    const serverWorkspaceId = required(
      body.serverWorkspaceId,
      "serverWorkspaceId"
    );
    const measurementId = required(
      body.measurementId,
      "measurementId"
    );

    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
      throw new Error(
        "Measurement ID must look like G-XXXXXXXXXX."
      );
    }

    const serverContainerUrl = validateUrl(
      required(body.serverContainerUrl, "serverContainerUrl")
    );

    const eventNames = Array.isArray(body.eventNames)
      ? [...new Set(body.eventNames)]
      : ["page_view"];

    if (
      eventNames.length === 0 ||
      eventNames.some(
        (event) =>
          typeof event !== "string" ||
          !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(event)
      )
    ) {
      throw new Error(
        "Event names must start with a letter and contain only letters, numbers, and underscores."
      );
    }

    // The caller supplies the signed-in user's Google OAuth access token.
    const authorization = request.headers.get("authorization") ?? "";
    const token = required(
      authorization.match(/^Bearer\s+(.+)$/i)?.[1],
      "Google access token (Authorization: Bearer <token>)"
    );

    const webIds = {
      accountId,
      containerId: webContainerId,
      workspaceId: webWorkspaceId,
    };

    const serverIds = {
      accountId,
      containerId: serverContainerId,
      workspaceId: serverWorkspaceId,
    };

    // Phase 1: Web GTM.
    const web = await configureWebGtag(
      token,
      webIds,
      measurementId,
      serverContainerUrl
    );

    // Phase 2: Server GTM.
    // Do not create an arbitrary Client type if one is missing.
    const client = await verifyServerGa4Client(token, serverIds);

    const events = [];

    for (const eventName of eventNames) {
      const trigger = await getOrCreateServerEventTrigger(
        token,
        serverIds,
        eventName
      );

      if (!trigger.triggerId) {
        throw new Error(
          `No trigger ID returned for event "${eventName}".`
        );
      }

      const tag = await configureServerGa4EventTag(
        token,
        serverIds,
        eventName,
        trigger.triggerId,
        measurementId
      );

      events.push({ eventName, trigger, tag });
    }

    return NextResponse.json({
      success: true,
      published: false,
      web: {
        success: true,
        containerId: webContainerId,
        workspaceId: webWorkspaceId,
        tag: web,
      },
      server: {
        success: true,
        containerId: serverContainerId,
        workspaceId: serverWorkspaceId,
        client,
        events,
      },
      nextSteps: [
        "Verify the Web Google tag in GTM Preview.",
        "Verify that Server GTM receives the request through its GA4 Client.",
        "Confirm the server-side GA4 tag fires for each event.",
        "Publish each container after reviewing and testing the changes.",
      ],
    });
  } catch (error) {
    console.error("GTM Configure All error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "GTM automation failed.",
      },
      { status: 400 }
    );
  }
}
