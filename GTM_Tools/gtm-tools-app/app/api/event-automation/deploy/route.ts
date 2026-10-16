import { NextRequest, NextResponse } from "next/server";

import {
  createVariable,
} from "@/lib/gtm/variables";

import {
  createTrigger,
} from "@/lib/gtm/triggers";

import {
  createTag,
} from "@/lib/gtm/tags";

export async function POST(
  request: NextRequest
) {
  try {
    const accessToken =
      request.headers.get(
        "x-gtm-access-token"
      );

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "GTM access token missing",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      accountId,
      containerId,
      workspaceId,
      variables,
      triggers,
      tags,
    } = body;

    if (
      !accountId ||
      !containerId ||
      !workspaceId
    ) {
      return NextResponse.json(
        {
          error:
            "Account, container and workspace are required",
        },
        { status: 400 }
      );
    }

    const createdVariables = [];

    for (const variable of variables || []) {
      const created =
        await createVariable(
          accessToken,
          accountId,
          containerId,
          workspaceId,
          variable
        );

      createdVariables.push(created);
    }

    const createdTriggers = [];

    for (const trigger of triggers || []) {
      const created =
        await createTrigger(
          accessToken,
          accountId,
          containerId,
          workspaceId,
          trigger
        );

      createdTriggers.push(created);
    }

    const createdTags = [];

    for (const tag of tags || []) {
      const created =
        await createTag(
          accessToken,
          accountId,
          containerId,
          workspaceId,
          tag
        );

      createdTags.push(created);
    }

    return NextResponse.json({
      success: true,
      variables: createdVariables,
      triggers: createdTriggers,
      tags: createdTags,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Deployment failed",
      },
      { status: 500 }
    );
  }
}