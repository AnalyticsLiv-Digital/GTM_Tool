import { NextRequest, NextResponse } from "next/server";

function extractSelectors(html: string) {
  const results: {
    selector: string;
    selectorType: "id" | "class";
    element: string;
  }[] = [];

  const idRegex =
    /<([a-zA-Z0-9-]+)[^>]*\sid=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(html)) !== null) {
    results.push({
      selector: `#${match[2]}`,
      selectorType: "id",
      element: match[1],
    });
  }

  const classRegex =
    /<([a-zA-Z0-9-]+)[^>]*\sclass=["']([^"']+)["'][^>]*>/gi;

  while ((match = classRegex.exec(html)) !== null) {
    const classes = match[2]
      .split(/\s+/)
      .filter(Boolean);

    for (const className of classes) {
      results.push({
        selector: `.${className}`,
        selectorType: "class",
        element: match[1],
      });
    }
  }

  return results;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const websiteUrl = String(
      body.websiteUrl || ""
    ).trim();

    if (!websiteUrl) {
      return NextResponse.json(
        {
          error: "Website URL is required",
        },
        { status: 400 }
      );
    }

    const url = new URL(websiteUrl);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      throw new Error(
        "Only HTTP and HTTPS websites are supported"
      );
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "GTM-Event-Automation/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Website returned ${response.status}`
      );
    }

    const html = await response.text();

    const selectors = extractSelectors(html);

    return NextResponse.json({
      websiteUrl,
      selectors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Website scan failed",
      },
      { status: 500 }
    );
  }
}