import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";
import { templateBodySchema } from "@/lib/gtm/schemas";
import { validateBody } from "@/lib/validation";

// Note: this route is misnamed historically — POST creates a template in the
// destination workspace (used by the cross-workspace export flow), GET lists
// templates or fetches one by id.

export async function POST(req: Request) {
  try {
    const parsed = await validateBody(req, templateBodySchema);
    if (!parsed.ok) return parsed.response;
    const { accountId, containerId, workspaceId, template } = parsed.data;

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const selectedTemplate = Array.isArray(template) ? template[0] : template;

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: selectedTemplate.name,
        templateData: selectedTemplate.templateData,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to export template", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, template: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");
    const templateId = url.searchParams.get("templateId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 401 });
    }

    // Single-template fetch — no pagination needed.
    if (templateId) {
      const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates/${templateId}`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: "Failed to fetch template", details: data },
          { status: res.status }
        );
      }
      return NextResponse.json({ template: data });
    }

    const result = await gtmList<Record<string, unknown>>({
      url: `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`,
      accessToken,
      listKey: "template",
    });

    if (result.error && result.items.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch templates", details: result.error.body },
        { status: result.error.status || 502 }
      );
    }

    return NextResponse.json({
      template: result.items,
      truncated: result.truncated,
      pages: result.pages,
    });
  } catch (err: unknown) {
    console.error("Templates GET Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
