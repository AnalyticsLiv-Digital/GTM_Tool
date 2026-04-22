import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getAccessToken() {
  return (await cookies()).get("google_access_token")?.value;
}

export async function GET(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch triggers", details: data }, { status: res.status });
    }

    return NextResponse.json({ trigger: data.trigger || [] });
  } catch (err) {
    console.error("Triggers GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const body = await req.json();
    const { accountId, containerId, workspaceId, trigger } = body;

    if (!accountId || !containerId || !workspaceId || !trigger) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(trigger),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create trigger", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Triggers POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const body = await req.json();
    const { accountId, containerId, workspaceId, triggerId, trigger } = body;

    if (!accountId || !containerId || !workspaceId || !triggerId || !trigger) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(trigger),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to update trigger", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Triggers PUT Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");
    const triggerId = url.searchParams.get("triggerId");

    if (!accountId || !containerId || !workspaceId || !triggerId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json({ error: "Failed to delete trigger", details: data }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Triggers DELETE Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}