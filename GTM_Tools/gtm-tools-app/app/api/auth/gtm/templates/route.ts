import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { templateBodySchema } from "@/lib/gtm/schemas";
import { validateBody } from "@/lib/validation";

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
        { error: "Failed to create template", details: data },
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
