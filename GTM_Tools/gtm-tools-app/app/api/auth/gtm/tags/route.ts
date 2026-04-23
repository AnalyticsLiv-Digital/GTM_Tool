import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// GET Tags
export async function GET(req: Request) {
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tags", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ tag: data.tag || [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// CREATE Tag
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId, tag } = body;

    if (!accountId || !containerId || !workspaceId || !tag) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tag required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tag),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, tag: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE Tag
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId, tagId, tag } = body;

    if (!accountId || !containerId || !workspaceId || !tagId || !tag) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tagId, tag required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tag),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, tag: data });
   
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : String(err)) || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE Tag
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get("accountId");
    const containerId = searchParams.get("containerId");
    const workspaceId = searchParams.get("workspaceId");
    const tagId = searchParams.get("tagId");

    if (!accountId || !containerId || !workspaceId || !tagId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tagId required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: "Failed to delete tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}