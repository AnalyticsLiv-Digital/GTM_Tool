import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing. Please login again." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch containers", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Containers API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

//POST
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, name } = body;

    if (!accountId || !name) {
      return NextResponse.json(
        { error: "accountId and name are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          usageContext: ["web"],
        }),
      }
    );

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Create Container Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add Update Container (PUT)
export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, name } = body;

    if (!accountId || !containerId || !name) {
      return NextResponse.json(
        { error: "accountId, containerId, name are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
  `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      usageContext: ["WEB"],
    }),
  }
);

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Update Container Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

//Add Delete Container (DELETE)

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google access token missing. Please login again." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");

    if (!accountId || !containerId) {
      return NextResponse.json(
        { error: "accountId and containerId are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: "Failed to delete container", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Container Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}