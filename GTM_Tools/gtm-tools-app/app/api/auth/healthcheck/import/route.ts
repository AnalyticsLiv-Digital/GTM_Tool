import { NextRequest, NextResponse } from "next/server";
import { OfficeParser } from "officeparser";
import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 30_000;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Select a file to import." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The selected file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Files must be 15 MB or smaller." },
        { status: 413 }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    let text: string;

    if (extension === "csv") {
      text = await file.text();
    } else if (extension === "xls" || extension === "xlsx") {
      const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
        type: "buffer",
      });
      text = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join("\n\n");

    } else if (extension === "pdf") {
      const parsed = await pdfParse(Buffer.from(await file.arrayBuffer()));
      text = parsed.text;
      
    } else if (extension === "pptx") {
      const parsed = await OfficeParser.parseOffice(
        Buffer.from(await file.arrayBuffer())
      );
      text = parsed.toText();

    } else if (extension === "ppt") {
      return NextResponse.json(
        { error: "Legacy .ppt files are not supported. Save the presentation as .pptx and import it again." },
        { status: 415 }
      );

    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Import PDF, XLS/XLSX, CSV, or PPTX files." },
        { status: 415 }
      );
    }

    const content = text.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No readable text was found in this file." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      name: file.name,
      text: content.slice(0, MAX_EXTRACTED_CHARACTERS),
      truncated: content.length > MAX_EXTRACTED_CHARACTERS,
    });
  } catch (error) {
    console.error("HealthCheck file import failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse the selected file." },
      { status: 422 }
    );
  }
}
