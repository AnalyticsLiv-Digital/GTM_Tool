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
// POST: CREATE TEMPLATE
// ======================================================
export async function POST(req: Request) {
  try {
    console.log("🔥 HIT POST /api/auth/gtm/templates");

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      console.log("❌ Access token missing");
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log("📦 Request Body:", body);

    const { accountId, containerId, workspaceId, template } = body;

    if (!accountId || !containerId || !workspaceId || !template) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, template required" },
        { status: 400 }
      );
    }

    const selectedTemplate = Array.isArray(template) ? template[0] : template;

    if (!selectedTemplate?.name || !selectedTemplate?.templateData) {
      console.log("❌ template.name or template.templateData missing");
      return NextResponse.json(
        { error: "template.name and template.templateData required" },
        { status: 400 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

    console.log("🌍 Google API URL:", apiUrl);

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

    const data = await safeJson(res);

    console.log("📩 Google Response Status:", res.status);
    console.log("📩 Google Response Data:", data);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to create template", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, template: data });
  } catch (err: any) {
    console.log("❌ Template POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}