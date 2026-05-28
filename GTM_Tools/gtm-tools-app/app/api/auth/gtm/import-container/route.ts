import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 400 }
      );
    }

    const text = await file.text();

    let parsedJson;

    try {
      parsedJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON file" },
        { status: 400 }
      );
    }

    // OPTIONAL:
    // Save parsedJson to DB
    // OR call GTM API here

    return NextResponse.json({
      success: true,
      message: "JSON imported successfully",
      data: parsedJson,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json(
      {
         error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}