import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// GET Workspaces
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch workspaces", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ workspace: data.workspace || [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// CREATE Workspace
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create workspace", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, workspace: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE Workspace
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId, name } = body;

    if (!accountId || !containerId || !workspaceId || !name) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, name are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update workspace", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, workspace: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE Workspace
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: "Failed to delete workspace", details: data },
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
// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";

// export async function GET(req: Request) {
//   try {
//     const cookieStore = await cookies();
//     const accessToken = cookieStore.get("google_access_token")?.value;

//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Google access token missing. Please login again." },
//         { status: 401 }
//       );
//     }

//     const url = new URL(req.url);
//     const accountId = url.searchParams.get("accountId");
//     const containerId = url.searchParams.get("containerId");

//     if (!accountId || !containerId) {
//       return NextResponse.json(
//         { error: "accountId and containerId are required" },
//         { status: 400 }
//       );
//     }

//     const parent = `accounts/${accountId}/containers/${containerId}`;

//     const res = await fetch(
//       `https://tagmanager.googleapis.com/tagmanager/v2/${parent}/workspaces`,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch workspaces", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json(data);
//   } catch (error) {
//     console.error("Workspaces API Error:", error);

//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }