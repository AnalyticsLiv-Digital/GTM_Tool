import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanTemplatePayload(template: Record<string, unknown>) {
  const cleaned = { ...template };

  delete cleaned.templateId;
  delete cleaned.path;
  delete cleaned.fingerprint;
  delete cleaned.accountId;
  delete cleaned.containerId;
  delete cleaned.workspaceId;
  delete cleaned.tagManagerUrl;

  return cleaned;
}

// ✅ GET (Export Templates)
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
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`,
      accessToken,
      listKey: "template",
    });

    return NextResponse.json({
      template: result.items,
      pages: result.pages,
      truncated: result.truncated,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ POST (Import Template)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId, template } = body;

    if (!accountId || !containerId || !workspaceId || !template) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, template required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const selectedTemplate = Array.isArray(template) ? template[0] : template;
    const cleanedTemplate = cleanTemplatePayload(selectedTemplate);

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

    const maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedTemplate),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return NextResponse.json({ success: true, template: data });
      }

      if ([429, 502, 503, 504].includes(res.status)) {
        attempt++;
        await sleep(attempt * 1000);
        continue;
      }

      return NextResponse.json(
        { error: "Failed to create template", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template after retries" },
      { status: 502 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";
// import { templateBodySchema } from "@/lib/gtm/schemas";
// import { validateBody } from "@/lib/validation";

// export async function POST(req: Request) {
//   try {
//     const parsed = await validateBody(req, templateBodySchema);
//     if (!parsed.ok) return parsed.response;
//     const { accountId, containerId, workspaceId, template } = parsed.data;

//     const accessToken = await getValidGoogleAccessToken();
//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Access token missing. Please login again." },
//         { status: 401 }
//       );
//     }

//     const selectedTemplate = Array.isArray(template) ? template[0] : template;

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;
//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: selectedTemplate.name,
//         templateData: selectedTemplate.templateData,
//       }),
//     });

//     const data = await res.json().catch(() => ({}));

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create template", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, template: data });
//   } catch (err: unknown) {
//     return NextResponse.json(
//       { error: err instanceof Error ? err.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
