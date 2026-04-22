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
//     const workspaceId = url.searchParams.get("workspaceId");

//     if (!accountId || !containerId || !workspaceId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId are required" },
//         { status: 400 }
//       );
//     }

//     const parent = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

//     const res = await fetch(
//       `https://tagmanager.googleapis.com/tagmanager/v2/${parent}/tags`,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch tags", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json(data);
//   } catch (error) {
//     console.error("Tags API Error:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getAccessToken() {
  return (await cookies()).get("google_access_token")?.value;
}

// --------------------
// GET Tags
// --------------------
export async function GET(req: Request) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId required" },
        { status: 400 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tags", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ tag: data.tag || [] });
  } catch (err) {
    console.error("Tags GET Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --------------------
// CREATE Tag
// --------------------
export async function POST(req: Request) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, workspaceId, tag } = body;

    if (!accountId || !containerId || !workspaceId || !tag) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tag required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(data);
  } catch (err) {
    console.error("Tags POST Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --------------------
// UPDATE Tag
// --------------------
export async function PUT(req: Request) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, workspaceId, tagId, tag } = body;

    if (!accountId || !containerId || !workspaceId || !tagId || !tag) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tagId, tag required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(data);
  } catch (err) {
    console.error("Tags PUT Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --------------------
// DELETE Tag
// --------------------
export async function DELETE(req: Request) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");
    const tagId = url.searchParams.get("tagId");

    if (!accountId || !containerId || !workspaceId || !tagId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tagId required" },
        { status: 400 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: "Failed to delete tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Tags DELETE Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}