import { NextRequest, NextResponse } from "next/server";
import { getServerCustomTemplate } from "@/lib/gtm-server-templates";
import { getTemplateFields } from "@/lib/gtm-template-parser";

// Replace this function with your existing Google OAuth
// access-token helper. Do not leave the placeholder in production.
async function getGoogleAccessToken(): Promise<string> {
  throw new Error(
    "Google OAuth access token helper is not connected."
  );
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const accountId = params.get("accountId");
    const containerId = params.get("containerId");
    const workspaceId = params.get("workspaceId");
    const templateId = params.get("templateId");

    if (!accountId || !containerId || !workspaceId || !templateId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "accountId, containerId, workspaceId and templateId are required.",
        },
        { status: 400 }
      );
    }

    const accessToken = await getGoogleAccessToken();

    const template = await getServerCustomTemplate(
      accessToken,
      accountId,
      containerId,
      workspaceId,
      templateId
    );

    const fields = getTemplateFields(template.templateData);

    return NextResponse.json({
      success: true,
      template: {
        templateId: template.templateId,
        name: template.name,
      },
      fields,
    });
  } catch (error) {
    console.error("[GET /api/gtm/template-config]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load template configuration.",
      },
      { status: 500 }
    );
  }
}