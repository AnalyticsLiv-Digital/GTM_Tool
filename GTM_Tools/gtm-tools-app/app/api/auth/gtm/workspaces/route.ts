import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const containerId = searchParams.get("containerId");

    if (!accountId || !containerId) {
      return NextResponse.json(
        { error: "accountId and containerId are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`,
      accessToken,
      listKey: "workspace",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch workspaces", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      workspace: result.items,
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
    const body = await req.json();
    const { accountId, containerId, name } = body;

    if (!accountId || !containerId || !name) {
      return NextResponse.json(
        { error: "accountId, containerId and name are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create workspace", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, workspace: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Per GTM v2 docs, fingerprint is a field on the workspace resource sent in
// the request body for optimistic concurrency — not a query parameter. Sending
// it in the body lets Google return 409 if the workspace was modified after
// the fingerprint we have. Caller may omit fingerprint to do a blind update.
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId, name, fingerprint } = body;

    if (!accountId || !containerId || !workspaceId || !name) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, name are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
    const updateBody: Record<string, unknown> = { name };
    if (fingerprint) updateBody.fingerprint = fingerprint;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update workspace", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, workspace: data });
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

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: "No response body from Google API" }));
      return NextResponse.json(
        { error: "Failed to delete workspace", details: data },
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
