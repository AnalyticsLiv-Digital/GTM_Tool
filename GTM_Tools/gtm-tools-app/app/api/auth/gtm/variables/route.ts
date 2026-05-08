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
// GET VARIABLES
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await safeJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch variables", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ variable: data.variable || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ======================================================
// POST CREATE VARIABLE
// ======================================================
export async function POST(req: Request) {
  try {
    console.log("🔥 HIT POST /api/auth/gtm/variables");

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, workspaceId, variable } = body;

    if (!accountId || !containerId || !workspaceId || !variable) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, variable required" },
        { status: 400 }
      );
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

    const data = await safeJson(res);

    console.log("📩 Google Variable POST Status:", res.status);
    console.log("📩 Google Variable POST Data:", data);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create variable", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, variable: data });
  } catch (err: any) {
    console.log("❌ Variable POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}


// import { NextResponse } from "next/server";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// // GET Variables
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

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

//     const res = await fetch(apiUrl, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch variables", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ variable: data.variable || [] });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // CREATE Variable
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId, variable } = body;

//     if (!accountId || !containerId || !workspaceId || !variable) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, variable required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(variable),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create variable", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, variable: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // UPDATE Variable
// export async function PUT(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId, variableId, variable } = body;

//     if (
//       !accountId ||
//       !containerId ||
//       !workspaceId ||
//       !variableId ||
//       !variable
//     ) {
//       return NextResponse.json(
//         {
//           error:
//             "accountId, containerId, workspaceId, variableId, variable required",
//         },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`;

//     const res = await fetch(apiUrl, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(variable),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to update variable", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, variable: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// // DELETE Variable
// export async function DELETE(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);

//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");
//     const workspaceId = searchParams.get("workspaceId");
//     const variableId = searchParams.get("variableId");

//     if (!accountId || !containerId || !workspaceId || !variableId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, variableId required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${variableId}`;

//     const res = await fetch(apiUrl, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//       const data = await res.json();
//       return NextResponse.json(
//         { error: "Failed to delete variable", details: data },
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