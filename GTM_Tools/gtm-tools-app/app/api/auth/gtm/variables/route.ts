import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";
import { variableBodySchema } from "@/lib/gtm/schemas";
import { validateBody } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const containerId = searchParams.get("containerId");
    const workspaceId = searchParams.get("workspaceId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
      accessToken,
      listKey: "variable",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch variables", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      variable: result.items,
      truncated: result.truncated,
      pages: result.pages,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await validateBody(req, variableBodySchema);
    if (!parsed.ok) return parsed.response;
    const { accountId, containerId, workspaceId, variable } = parsed.data;

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(variable),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create variable", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, variable: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = await validateBody(req, variableBodySchema);
    if (!parsed.ok) return parsed.response;
    const { accountId, containerId, workspaceId, variableId, variable } = parsed.data;

    if (!variableId) {
      return NextResponse.json({ error: "variableId required" }, { status: 400 });
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`;
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(variable),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update variable", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, variable: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
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
    const variableId = searchParams.get("variableId");

    if (!accountId || !containerId || !workspaceId || !variableId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, variableId required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`;
    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to delete variable", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
