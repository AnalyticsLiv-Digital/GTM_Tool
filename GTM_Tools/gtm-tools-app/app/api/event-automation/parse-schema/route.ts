import { NextResponse } from "next/server";

import {
  parseExcelBuffer,
} from "@/lib/event-automation/excelParser";

// =====================================================
// NEXT.JS CONFIG
// =====================================================

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// =====================================================
// JSON ERROR
// =====================================================

function jsonError(
  message: string,
  status = 500,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details !== undefined
        ? { details }
        : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    console.log(
      "[Event Automation] Excel upload received"
    );

    // -------------------------------------------------
    // CONTENT TYPE
    // -------------------------------------------------

    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    console.log(
      "[Event Automation] Request content type:",
      contentType
    );

    if (
      !contentType
        .toLowerCase()
        .includes("multipart/form-data")
    ) {
      return jsonError(
        "Invalid request. Excel file must be uploaded as multipart/form-data.",
        400
      );
    }

    // -------------------------------------------------
    // FORM DATA
    // -------------------------------------------------

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    // -------------------------------------------------
    // FILE CHECK
    // -------------------------------------------------

    if (!(file instanceof File)) {
      console.error(
        "[Event Automation] Invalid file object:",
        file
      );

      return jsonError(
        "Excel file is required.",
        400
      );
    }

    console.log(
      "[Event Automation] File received:",
      {
        name: file.name,
        type: file.type,
        size: file.size,
      }
    );

    // -------------------------------------------------
    // FILE NAME
    // -------------------------------------------------

    const fileName =
      String(
        file.name || ""
      ).toLowerCase();

    const isXlsx =
      fileName.endsWith(".xlsx");

    const isXls =
      fileName.endsWith(".xls");

    if (!isXlsx && !isXls) {
      return jsonError(
        "Only .xlsx and .xls files are supported.",
        400
      );
    }

    // -------------------------------------------------
    // SIZE
    // -------------------------------------------------

    if (file.size <= 0) {
      return jsonError(
        "The uploaded Excel file is empty.",
        400
      );
    }

    const MAX_FILE_SIZE =
      10 * 1024 * 1024;

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return jsonError(
        "The Excel file is too large. Maximum allowed size is 10 MB.",
        400
      );
    }

    // -------------------------------------------------
    // READ FILE
    // -------------------------------------------------

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    console.log(
      "[Event Automation] Buffer created:",
      {
        bytes: buffer.length,
      }
    );

    // -------------------------------------------------
    // PARSE EXCEL
    // -------------------------------------------------

    const parsed =
      parseExcelBuffer(
        buffer,
        file.name
      );

    console.log(
      "[Event Automation] Excel parsed:",
      {
        sheets: parsed.sheets,
        events:
          parsed.events.length,
        commonEvents:
          parsed.commonEvents.length,
        uniqueEvents:
          parsed.uniqueEvents.length,
      }
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        schema: {
          events:
            parsed.events,

          commonEvents:
            parsed.commonEvents,

          uniqueEvents:
            parsed.uniqueEvents,

          sheets:
            parsed.sheets,

          columns:
            parsed.columns,

          fileName:
            parsed.fileName,
        },
      },
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Event Automation] Excel parser error:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to parse Excel file.",
      500,
      process.env.NODE_ENV ===
        "development"
        ? String(error)
        : undefined
    );
  }
}

// =====================================================
// GET
// =====================================================

export async function GET() {
  return NextResponse.json(
    {
      success: true,

      message:
        "Event Automation Excel Parser API is running.",

      endpoint:
        "/api/event-automation/parse-schema",

      method: "POST",
    },
    {
      status: 200,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store",
      },
    }
  );
}