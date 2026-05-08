import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

async function safeJson(res: Response) {
  const rawText = await res.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { __invalidJson: true, rawText };
  }
}

// ======================================================
// GET TRIGGERS
// ======================================================
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
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await safeJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch triggers", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ trigger: data.trigger || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ======================================================
// POST CREATE TRIGGER
// ======================================================
export async function POST(req: Request) {
  try {
    console.log("🔥 HIT POST /api/auth/gtm/triggers");

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, workspaceId, trigger } = body;

    if (!accountId || !containerId || !workspaceId || !trigger) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, trigger required" },
        { status: 400 }
      );
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

    const data = await safeJson(res);

    console.log("📩 Google Trigger POST Status:", res.status);
    console.log("📩 Google Trigger POST Data:", data);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create trigger", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, trigger: data });
  } catch (err: any) {
    console.log("❌ Trigger POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// // GET Triggers
// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");
//     const workspaceId = searchParams.get("workspaceId");

//     if (!accountId || !containerId || !workspaceId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

//     const res = await fetch(apiUrl, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch triggers", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ trigger: data.trigger || [] });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // CREATE Trigger
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId, trigger } = body;

//     if (!accountId || !containerId || !workspaceId || !trigger) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, trigger required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(trigger),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create trigger", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, trigger: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // UPDATE Trigger
// export async function PUT(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId, triggerId, trigger } = body;

//     if (!accountId || !containerId || !workspaceId || !triggerId || !trigger) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, triggerId, trigger required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

//     const res = await fetch(apiUrl, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(trigger),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to update trigger", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, trigger: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // DELETE Trigger
// export async function DELETE(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");
//     const workspaceId = searchParams.get("workspaceId");
//     const triggerId = searchParams.get("triggerId");

//     if (!accountId || !containerId || !workspaceId || !triggerId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, triggerId required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

//     const res = await fetch(apiUrl, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//       const data = await res.json();
//       return NextResponse.json(
//         { error: "Failed to delete trigger", details: data },
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