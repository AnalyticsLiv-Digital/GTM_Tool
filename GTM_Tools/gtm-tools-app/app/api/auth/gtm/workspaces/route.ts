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
    const { accountId, containerId, workspaceId, name, fingerprint } = body;

    if (!accountId || !containerId || !workspaceId || !name) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, name are required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();

    // ✅ IMPORTANT: fingerprint is required for update
    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}${
      fingerprint ? `?fingerprint=${fingerprint}` : ""
    }`;

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

    // ✅ sometimes delete returns empty body
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorData: any = {};
      try {
        errorData = await res.json();
      } catch {
        errorData = { message: "No response body from Google API" };
      }

      return NextResponse.json(
        { error: "Failed to delete workspace", details: errorData },
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
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// // GET Workspaces
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");

//     if (!accountId || !containerId) {
//       return NextResponse.json(
//         { error: "accountId and containerId are required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;

//     const res = await fetch(apiUrl, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch workspaces", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ workspace: data.workspace || [] });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // CREATE Workspace
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, name } = body;

//     if (!accountId || !containerId || !name) {
//       return NextResponse.json(
//         { error: "accountId, containerId and name are required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;

//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ name }),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create workspace", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, workspace: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // UPDATE Workspace
// export async function PUT(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId, name } = body;

//     if (!accountId || !containerId || !workspaceId || !name) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, name are required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

//     const res = await fetch(apiUrl, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ name }),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to update workspace", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, workspace: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // DELETE Workspace
// export async function DELETE(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");
//     const workspaceId = searchParams.get("workspaceId");

//     if (!accountId || !containerId || !workspaceId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId are required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

//     const res = await fetch(apiUrl, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//       const data = await res.json();
//       return NextResponse.json(
//         { error: "Failed to delete workspace", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
