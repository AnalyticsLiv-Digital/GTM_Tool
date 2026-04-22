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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch variables", details: data }, { status: res.status });
    }

    return NextResponse.json({ variable: data.variable || [] });
  } catch (err) {
    console.error("Variables GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const body = await req.json();
    const { accountId, containerId, workspaceId, variable } = body;

    if (!accountId || !containerId || !workspaceId || !variable) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create variable", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Variables POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const body = await req.json();
    const { accountId, containerId, workspaceId, variableId, variable } = body;

    if (!accountId || !containerId || !workspaceId || !variableId || !variable) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to update variable", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Variables PUT Error:", err);
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
    const variableId = url.searchParams.get("variableId");

    if (!accountId || !containerId || !workspaceId || !variableId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json({ error: "Failed to delete variable", details: data }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Variables DELETE Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}