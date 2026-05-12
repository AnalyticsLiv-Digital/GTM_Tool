import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";
import { tagBodySchema } from "@/lib/gtm/schemas";
import { validateBody } from "@/lib/validation";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanTagPayload(tag: Record<string, unknown>) {
  const cleaned = { ...tag };

  // ❌ remove readonly fields
  delete cleaned.tagId;
  delete cleaned.path;
  delete cleaned.fingerprint;
  delete cleaned.accountId;
  delete cleaned.containerId;
  delete cleaned.workspaceId;

  // ❌ these also break export sometimes
  delete cleaned.parentFolderId;
  delete cleaned.tagManagerUrl;
  delete cleaned.notes;

  return cleaned;
}

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

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
      accessToken,
      listKey: "tag",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch tags", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      tag: result.items,
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
    const parsed = await validateBody(req, tagBodySchema);
    if (!parsed.ok) return parsed.response;

    const { accountId, containerId, workspaceId, tag } = parsed.data;

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const cleanedTag = cleanTagPayload(tag);

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedTag),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return NextResponse.json({ success: true, tag: data });
      }

      // ✅ Retry for rate limit + Google backend temporary errors
      if ([429, 502, 503, 504].includes(res.status)) {
        attempt++;
        const waitTime = 1000 * attempt; // 1s,2s,3s...
        await sleep(waitTime);
        continue;
      }

      return NextResponse.json(
        { error: "Failed to create tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tag after retries" },
      { status: 502 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const parsed = await validateBody(req, tagBodySchema);
    if (!parsed.ok) return parsed.response;

    const { accountId, containerId, workspaceId, tagId, tag } = parsed.data;

    if (!tagId) {
      return NextResponse.json({ error: "tagId required" }, { status: 400 });
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const cleanedTag = cleanTagPayload(tag);

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cleanedTag),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to update tag", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, tag: data });
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
    const workspaceId = searchParams.get("workspaceId");
    const tagId = searchParams.get("tagId");

    if (!accountId || !containerId || !workspaceId || !tagId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, tagId required" },
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

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to delete tag", details: data },
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

// import { NextResponse } from "next/server";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";
// import { gtmList } from "@/lib/gtm/list";
// import { tagBodySchema } from "@/lib/gtm/schemas";
// import { validateBody } from "@/lib/validation";

// export async function GET(req: Request) {
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
//     if (!accessToken) {
//       return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
//     }

//     const result = await gtmList<Record<string, unknown>>({
//       url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
//       accessToken,
//       listKey: "tag",
//     });

//     if (result.error && result.items.length === 0) {
//       return NextResponse.json(
//         { error: "Failed to fetch tags", details: result.error.body },
//         { status: result.error.status || 502 }
//       );
//     }

//     return NextResponse.json({
//       tag: result.items,
//       truncated: result.truncated,
//       pages: result.pages,
//     });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       { error: err instanceof Error ? err.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const parsed = await validateBody(req, tagBodySchema);
//     if (!parsed.ok) return parsed.response;
//     const { accountId, containerId, workspaceId, tag } = parsed.data;

//     const accessToken = await getValidGoogleAccessToken();
//     if (!accessToken) {
//       return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;
//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(tag),
//     });

//     const data = await res.json().catch(() => ({}));

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create tag", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, tag: data });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       { error: err instanceof Error ? err.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(req: Request) {
//   try {
//     const parsed = await validateBody(req, tagBodySchema);
//     if (!parsed.ok) return parsed.response;
//     const { accountId, containerId, workspaceId, tagId, tag } = parsed.data;

//     if (!tagId) {
//       return NextResponse.json({ error: "tagId required" }, { status: 400 });
//     }

//     const accessToken = await getValidGoogleAccessToken();
//     if (!accessToken) {
//       return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;
//     const res = await fetch(apiUrl, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(tag),
//     });

//     const data = await res.json().catch(() => ({}));

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to update tag", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, tag: data });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       { error: err instanceof Error ? err.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const accountId = searchParams.get("accountId");
//     const containerId = searchParams.get("containerId");
//     const workspaceId = searchParams.get("workspaceId");
//     const tagId = searchParams.get("tagId");

//     if (!accountId || !containerId || !workspaceId || !tagId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, tagId required" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();
//     if (!accessToken) {
//       return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`;
//     const res = await fetch(apiUrl, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//       const data = await res.json().catch(() => ({}));
//       return NextResponse.json(
//         { error: "Failed to delete tag", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       { error: err instanceof Error ? err.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
