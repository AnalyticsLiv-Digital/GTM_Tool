
import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";
import { triggerBodySchema } from "@/lib/gtm/schemas";
import { validateBody } from "@/lib/validation";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function cleanTriggerPayload(trigger: Record<string, unknown>) {
  const cleaned = { ...trigger };

  // Remove read-only fields.
  delete cleaned.triggerId;
  delete cleaned.path;
  delete cleaned.fingerprint;
  delete cleaned.accountId;
  delete cleaned.containerId;
  delete cleaned.workspaceId;

  // Remove fields that should not be included in export payloads.
  delete cleaned.parentFolderId;
  delete cleaned.tagManagerUrl;
  delete cleaned.notes;

  return cleaned;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get("accountId");
    const containerId = searchParams.get("containerId");
    const workspaceId = searchParams.get("workspaceId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "accountId, containerId, workspaceId required",
        },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Google access token",
        },
        { status: 401 }
      );
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
      accessToken,
      listKey: "trigger",
    });

    // If no triggers could be retrieved, return the API error.
    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch triggers",
          details: result.error.body,
          pages: result.pages,
          truncated: result.truncated,
        },
        { status: result.error.status || 502 }
      );
    }

    // Preserve partial results and expose pagination errors.
    return NextResponse.json({
      success: true,
      trigger: result.items,
      total: result.items.length,
      truncated: result.truncated,
      pages: result.pages,
      partial: Boolean(result.error) || result.truncated,
      paginationError: result.error
        ? {
            status: result.error.status,
            message: "Some GTM triggers could not be loaded.",
            details: result.error.body,
          }
        : null,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await validateBody(req, triggerBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const {
      accountId,
      containerId,
      workspaceId,
      trigger,
    } = parsed.data;

    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const cleanedTrigger = cleanTriggerPayload(trigger);

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedTrigger),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return NextResponse.json({
          success: true,
          trigger: data,
        });
      }

      if ([429, 502, 503, 504].includes(res.status)) {
        attempt++;

        const waitTime = 1000 * attempt;
        await sleep(waitTime);

        continue;
      }

      return NextResponse.json(
        {
          error: "Failed to create trigger",
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create trigger after retries",
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = await validateBody(req, triggerBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const {
      accountId,
      containerId,
      workspaceId,
      triggerId,
      trigger,
    } = parsed.data;

    if (!triggerId) {
      return NextResponse.json(
        { error: "triggerId required" },
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

    const cleanedTrigger = cleanTriggerPayload(trigger);

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanedTrigger),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Failed to update trigger",
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      trigger: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get("accountId");
    const containerId = searchParams.get("containerId");
    const workspaceId = searchParams.get("workspaceId");
    const triggerId = searchParams.get("triggerId");

    if (!accountId || !containerId || !workspaceId || !triggerId) {
      return NextResponse.json(
        {
          error:
            "accountId, containerId, workspaceId, triggerId required",
        },
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      return NextResponse.json(
        {
          error: "Failed to delete trigger",
          details: data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
