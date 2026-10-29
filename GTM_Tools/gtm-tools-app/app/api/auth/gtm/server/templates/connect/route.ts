import { NextRequest, NextResponse } from "next/server";

import { getGA4ServerClient } from "@/lib/gtm-server-clients";
import { getOrCreateServerEventTrigger } from "@/lib/gtm-server-triggers";
import { getOrCreateServerTag } from "@/lib/gtm-server-tags";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      accessToken,
      accountId,
      serverContainerId,
      serverWorkspaceId,
      eventName,
      tagName,
      templateTagType,
      templateParameters,
    } = body;

    if (
      !accessToken ||
      !accountId ||
      !serverContainerId ||
      !serverWorkspaceId ||
      !eventName ||
      !tagName ||
      !templateTagType
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required Phase 2 parameters",
        },
        { status: 400 }
      );
    }

    /*
     * STEP 1
     * Find the GA4 Client in Server GTM
     */

    const ga4Client = await getGA4ServerClient(
      accessToken,
      accountId,
      serverContainerId,
      serverWorkspaceId
    );

    /*
     * STEP 2
     * Find or create the Server Event Trigger
     */

    const trigger = await getOrCreateServerEventTrigger(
      accessToken,
      accountId,
      serverContainerId,
      serverWorkspaceId,
      eventName
    );

    /*
     * STEP 3
     * Find or create the Custom Template Tag
     */

    const tag = await getOrCreateServerTag(
      accessToken,
      accountId,
      serverContainerId,
      serverWorkspaceId,
      tagName,
      templateTagType,
      templateParameters || [],
      trigger.triggerId!
    );

    return NextResponse.json({
      success: true,

      phase: 2,

      client: {
        id: ga4Client.clientId,
        name: ga4Client.name,
        type: ga4Client.type,
      },

      trigger: {
        id: trigger.triggerId,
        name: trigger.name,
      },

      tag: {
        id: tag.tagId,
        name: tag.name,
        type: tag.type,
        firingTriggerId: tag.firingTriggerId,
      },
    });
  } catch (error) {
    console.error("Phase 2 Server GTM error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to configure Server GTM",
      },
      { status: 500 }
    );
  }
} 