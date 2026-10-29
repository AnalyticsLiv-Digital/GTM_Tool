import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  chromium,
  type Browser,
  type Page,
} from "playwright";

import {
  inspectWebsite,
} from "@/lib/event-automation/domSelectorEngine";

import type {
  EventSchemaRow,
  InspectRequest,
  InspectResponse,
} from "@/lib/event-automation/types";

// ============================================================
// NEXT.JS CONFIG
// ============================================================

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

// ============================================================
// CONFIG
// ============================================================

const NAVIGATION_TIMEOUT = 30000;

const DOM_SETTLE_TIME = 2200;

// ============================================================
// NORMALIZE URL
// ============================================================

function normalizeWebsiteUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Website URL is required.");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Website URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Invalid website URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS websites are supported.");
  }

  url.hash = "";

  return url.toString();
}

// ============================================================
// NORMALIZE EVENT
// ============================================================

function normalizeEvent(
  value: unknown
): EventSchemaRow | null {
  if (
    !value ||
    typeof value !==
    "object"
  ) {
    return null;
  }

  const event =
    value as Record<
      string,
      unknown
    >;

  const eventName =
    typeof event.eventName ===
      "string"
      ? event.eventName.trim()
      : "";

  if (
    !eventName
  ) {
    return null;
  }

  /*
   * IMPORTANT:
   *
   * Do NOT strip pageUrl, scenario, customDimensions,
   * menuName, subMenuName, subMenuItem, buttonText,
   * clickUrl, sectionHeading, etc.
   *
   * The DOM selector engine uses these fields to identify
   * the correct element.
   */

  return {
    ...(event as EventSchemaRow),

    eventName,
  };
}

// ============================================================
// READ REQUEST
// ============================================================

async function getRequestBody(
  request: NextRequest
): Promise<InspectRequest> {
  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    throw new Error(
      "Invalid JSON request body."
    );
  }

  if (
    !body ||
    typeof body !==
    "object"
  ) {
    throw new Error(
      "Invalid request body."
    );
  }

  const record =
    body as Record<
      string,
      unknown
    >;

  const websiteUrl =
    normalizeWebsiteUrl(
      record.websiteUrl
    );

  const events =
    Array.isArray(
      record.events
    )
      ? record.events
        .map(
          normalizeEvent
        )
        .filter(
          (
            event
          ): event is EventSchemaRow =>
            Boolean(
              event
            )
        )
      : [];

  if (
    events.length ===
    0
  ) {
    throw new Error(
      "At least one selected event is required."
    );
  }

  return {
    websiteUrl,

    events,
  };
}

// ============================================================
// CREATE BROWSER
// ============================================================

async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless:
      true,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--disable-background-networking",
    ],
  });
}

// ============================================================
// CREATE PAGE
// ============================================================

async function createPage(
  browser: Browser
): Promise<Page> {
  const context =
    await browser.newContext({
      viewport: {
        width:
          1440,

        height:
          1000,
      },

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/151.0.0.0 Safari/537.36",

      locale:
        "en-US",

      colorScheme:
        "light",

      javaScriptEnabled:
        true,

      ignoreHTTPSErrors:
        true,
    });

  const page =
    await context.newPage();

  page.setDefaultTimeout(
    NAVIGATION_TIMEOUT
  );

  page.setDefaultNavigationTimeout(
    NAVIGATION_TIMEOUT
  );

  return page;
}

// ============================================================
// WAIT FOR RENDERED DOM
// ============================================================

async function waitForRenderedDOM(
  page: Page
): Promise<void> {
  try {
    await page.waitForLoadState(
      "domcontentloaded",
      {
        timeout:
          NAVIGATION_TIMEOUT,
      }
    );
  } catch {
    // Continue.
  }

  try {
    await page.waitForLoadState(
      "load",
      {
        timeout:
          10000,
      }
    );
  } catch {
    // Optional.
  }

  await page.waitForTimeout(
    DOM_SETTLE_TIME
  );

  try {
    await page.evaluate(
      async () => {
        await new Promise<void>(
          (
            resolve
          ) => {
            requestAnimationFrame(
              () => {
                requestAnimationFrame(
                  () => {
                    resolve();
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch {
    // Ignore.
  }
}

// ============================================================
// DISMISS COMMON CONSENT
// ============================================================

async function dismissCommonOverlays(
  page: Page
): Promise<void> {
  const names = [
    "Accept",
    "Accept All",
    "Allow All",
    "I Agree",
    "Agree",
    "Got it",
    "OK",
    "Okay",
  ];

  for (
    const name of names
  ) {
    try {
      const button =
        page.getByRole(
          "button",
          {
            name,
            exact:
              true,
          }
        );

      const count =
        await button.count();

      if (
        count ===
        0
      ) {
        continue;
      }

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        const current =
          button.nth(
            index
          );

        try {
          if (
            !(await current.isVisible())
          ) {
            continue;
          }

          await current.click({
            timeout:
              1500,
          });

          await page.waitForTimeout(
            500
          );

          return;
        } catch {
          // Try next.
        }
      }
    } catch {
      // Ignore.
    }
  }
}

// ============================================================
// DEBUG DOM
// ============================================================

async function getDOMDebugInfo(
  page: Page
): Promise<{
  url: string;

  title: string;

  elementCount: number;

  interactiveCount: number;
}> {
  return page.evaluate(
    () => {
      const selector = [
        "a",
        "button",
        "input",
        "select",
        "textarea",
        "summary",
        "[role='button']",
        "[role='link']",
        "[role='tab']",
        "[role='menuitem']",
      ].join(",");

      return {
        url:
          window.location.href,

        title:
          document.title,

        elementCount:
          document.querySelectorAll(
            "*"
          ).length,

        interactiveCount:
          document.querySelectorAll(
            selector
          ).length,
      };
    }
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  let browser:
    | Browser
    | undefined;

  try {
    // ========================================================
    // REQUEST
    // ========================================================

    const {
      websiteUrl,
      events,
    } =
      await getRequestBody(
        request
      );

    console.log(
      "================================================"
    );

    console.log(
      "[event-automation] INSPECTION START"
    );

    console.log(
      "[event-automation] Main website:",
      websiteUrl
    );

    console.log(
      "[event-automation] Selected events:",
      events.length
    );

    for (
      const event of events
    ) {
      console.log(
        "[event-automation] EVENT:",
        event.eventName,
        "| pageUrl:",
        event.pageUrl,
        "| category:",
        event.eventCategory,
        "| action:",
        event.eventAction,
        "| scenario:",
        event.scenario
      );
    }

    // ========================================================
    // BROWSER
    // ========================================================

    browser =
      await createBrowser();

    // ========================================================
    // PAGE
    // ========================================================

    const page =
      await createPage(
        browser
      );

    // ========================================================
    // OPEN MAIN WEBSITE FIRST
    // ========================================================

    console.log(
      "[event-automation] Opening main website..."
    );

    await page.goto(
      websiteUrl,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          NAVIGATION_TIMEOUT,
      }
    );

    await waitForRenderedDOM(
      page
    );

    await dismissCommonOverlays(
      page
    );

    await page.waitForTimeout(
      500
    );

    // ========================================================
    // DEBUG
    // ========================================================

    const debug =
      await getDOMDebugInfo(
        page
      );

    console.log(
      "[event-automation] MAIN DOM:",
      debug
    );

    // ========================================================
    // INSPECT
    //
    // domSelectorEngine now handles pageUrl grouping.
    // ========================================================

    console.log(
      "[event-automation] Starting page-aware DOM inspection..."
    );

    const result =
      await inspectWebsite(
        page,
        events
      );

    // ========================================================
    // LOG RESULTS
    // ========================================================

    console.log(
      "================================================"
    );

    console.log(
      "[event-automation] INSPECTION RESULTS"
    );

    for (
      const event of result.events
    ) {
      console.log(
        "[event-automation] Event:",
        event.eventName,

        "| page:",
        event.pageUrl,

        "| selector:",
        event.selector,

        "| selectorType:",
        event.selectorType,

        "| matches:",
        event.matchCount,

        "| unique:",
        event.selectorUnique,

        "| confidence:",
        event.confidence
      );

      if (
        event.selector
      ) {
        console.log(
          "[event-automation] QUERY:",
          event.querySelectorExpression
        );

        console.log(
          "[event-automation] INTERACTION:",
          event.interactionExpression
        );
      }
    }

    // ========================================================
    // COUNTS
    // ========================================================

    const selectorFoundCount =
      result.events.filter(
        (
          event
        ) =>
          Boolean(
            event.selector
          )
      ).length;

    const uniqueSelectorCount =
      result.events.filter(
        (
          event
        ) =>
          Boolean(
            event.selector
          ) &&
          event.selectorUnique ===
          true
      ).length;

    const unresolvedCount =
      result.events.filter(
        (
          event
        ) =>
          !event.selector
      ).length;

    console.log(
      "[event-automation] Selector found:",
      selectorFoundCount,
      "/",
      result.events.length
    );

    console.log(
      "[event-automation] Unique selectors:",
      uniqueSelectorCount,
      "/",
      result.events.length
    );

    console.log(
      "[event-automation] Unresolved:",
      unresolvedCount,
      "/",
      result.events.length
    );

    console.log(
      "[event-automation] Pages visited:",
      result.pagesVisited
    );

    console.log(
      "================================================"
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    const response: InspectResponse =
    {
      success:
        true,

      websiteUrl,

      elements:
        result.elements,

      events:
        result.events,

      inspectedCount:
        result.elements.length,

      pagesVisited:
        result.pagesVisited,
    };

    return NextResponse.json(
      response,
      {
        status:
          200,
      }
    );
  } catch (
  error
  ) {
    console.error(
      "[event-automation/inspect]",
      error
    );

    const message =
      error instanceof
        Error
        ? error.message
        : "Website inspection failed.";

    const response: InspectResponse =
    {
      success:
        false,

      websiteUrl:
        "",

      elements:
        [],

      events:
        [],

      inspectedCount:
        0,

      pagesVisited:
        [],

      error:
        message,
    };

    return NextResponse.json(
      response,
      {
        status:
          500,
      }
    );
  } finally {
    if (
      browser
    ) {
      try {
        await browser.close();
      } catch {
        // Ignore browser cleanup errors.
      }
    }
  }
}

// ============================================================
// OPTIONS
// ============================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(
    null,
    {
      status:
        204,

      headers: {
        Allow:
          "POST, OPTIONS",
      },
    }
  );
}