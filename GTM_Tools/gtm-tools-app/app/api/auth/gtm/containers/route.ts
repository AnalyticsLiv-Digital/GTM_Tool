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
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
      accessToken,
      listKey: "container",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch containers", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      container: result.items,
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
    const { accountId, name } = body;

    if (!accountId || !name) {
      return NextResponse.json(
        { error: "accountId and name are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;
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
        { error: "Failed to create container", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, container: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update container", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, container: data });
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;
    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to delete container", details: data },
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
