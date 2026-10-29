import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      accountId,
      containerId,
      workspaceId,
      galleryOwner,
      galleryRepository,
      gallerySha,
    } = body;

    if (
      !accountId ||
      !containerId ||
      !workspaceId ||
      !galleryOwner ||
      !galleryRepository
    ) {
      return NextResponse.json(
        { error: "Missing required template import fields." },
        { status: 400 }
      );
    }

    // Replace this with your existing server-side
    // Google OAuth access-token retrieval helper.
    const accessToken = await getGtmAccessToken();

    const parent =
      `accounts/${accountId}/containers/${containerId}` +
      `/workspaces/${workspaceId}`;

    const params = new URLSearchParams({
      galleryOwner,
      galleryRepository,
      acknowledgePermissions: "true",
    });

    if (gallerySha) {
      params.set("gallerySha", gallerySha);
    }

    const response = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/` +
        `${parent}/templates:import_from_gallery?${params}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Google GTM API returned an invalid response.");
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error?.message || "Template import failed." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      template: result,
      message: "Custom Template imported successfully.",
    });
  } catch (error) {
    console.error("Template import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Template import failed.",
      },
      { status: 500 }
    );
  }
}

// Connect this to your existing Google OAuth implementation.
async function getGtmAccessToken(): Promise<string> {
  throw new Error(
    "Connect getGtmAccessToken() to your existing Google OAuth helper."
  );
}