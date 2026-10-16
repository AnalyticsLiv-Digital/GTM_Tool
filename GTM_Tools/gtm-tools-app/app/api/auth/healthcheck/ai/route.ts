import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/claude";
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

type GtmRecord = Record<string, unknown>;

type ClaudeErrorShape = {
  status?: number;
  message?: string;
  name?: string;
  type?: string;
  requestId?: string;
  request_id?: string;
  error?: {
    type?: string;
    message?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
};

function affectedItem(x: unknown): { name: string } {
  if (typeof x === "string") {
    return {
      name: x,
    };
  }

  if (
    x &&
    typeof x === "object" &&
    "name" in x &&
    typeof (x as { name: unknown }).name === "string"
  ) {
    return {
      name: (x as { name: string }).name,
    };
  }

  try {
    return {
      name: JSON.stringify(x),
    };
  } catch {
    return {
      name: "Unknown item",
    };
  }
}

function extractErrorDetails(error: unknown): {
  message: string;
  errorType: string;
  status?: number;
  requestId?: string;
} {
  const fallback = {
    message: "Unknown Claude API error.",
    errorType: "unknown_error",
    status: undefined as number | undefined,
    requestId: undefined as string | undefined,
  };

  if (error instanceof Error) {
    fallback.message = error.message;
    fallback.errorType = error.name || "Error";
  }

  if (!error || typeof error !== "object") {
    if (typeof error === "string" && error.trim()) {
      fallback.message = error;
    }

    return fallback;
  }

  const value = error as ClaudeErrorShape;

  if (typeof value.status === "number") {
    fallback.status = value.status;
  }

  if (typeof value.name === "string" && value.name.trim()) {
    fallback.errorType = value.name;
  }

  if (typeof value.message === "string" && value.message.trim()) {
    fallback.message = value.message;
  }

  if (
    typeof value.error?.message === "string" &&
    value.error.message.trim()
  ) {
    fallback.message = value.error.message;
  }

  if (
    typeof value.error?.type === "string" &&
    value.error.type.trim()
  ) {
    fallback.errorType = value.error.type;
  }

  if (
    typeof value.type === "string" &&
    value.type.trim() &&
    value.type !== "Error"
  ) {
    fallback.errorType = value.type;
  }

  if (
    typeof value.requestId === "string" &&
    value.requestId.trim()
  ) {
    fallback.requestId = value.requestId;
  }

  if (
    typeof value.request_id === "string" &&
    value.request_id.trim()
  ) {
    fallback.requestId = value.request_id;
  }

  if (!fallback.requestId && value.headers) {
    const requestIdHeader =
      value.headers["request-id"] ??
      value.headers["x-request-id"];

    if (typeof requestIdHeader === "string") {
      fallback.requestId = requestIdHeader;
    }

    if (Array.isArray(requestIdHeader) && requestIdHeader.length > 0) {
      fallback.requestId = requestIdHeader[0];
    }
  }

  return fallback;
}

function buildClaudeUserMessage(details: {
  message: string;
  errorType: string;
  status?: number;
  requestId?: string;
}): string {
  const statusText =
    typeof details.status === "number"
      ? `HTTP ${details.status}`
      : "HTTP status unavailable";

  const requestText =
    details.requestId
      ? `Request ID: ${details.requestId}`
      : "Request ID: unavailable";

  if (
    details.message.toLowerCase().includes("credit balance") ||
    details.message.toLowerCase().includes("credit") ||
    details.message.toLowerCase().includes("billing")
  ) {
    return (
      `Claude API billing/credit error (${statusText}). ` +
      `${details.message} ` +
      `${requestText}`
    );
  }

  if (
    details.errorType.toLowerCase().includes("authentication") ||
    details.status === 401
  ) {
    return (
      `Claude API authentication failed (${statusText}). ` +
      `${details.message} ` +
      `${requestText}`
    );
  }

  if (details.status === 429) {
    return (
      `Claude API rate limit reached (${statusText}). ` +
      `${details.message} ` +
      `${requestText}`
    );
  }

  if (details.status === 400) {
    return (
      `Claude API rejected the request (${statusText}). ` +
      `${details.message} ` +
      `${requestText}`
    );
  }

  return (
    `Claude API request failed (${statusText}). ` +
    `${details.message} ` +
    `${requestText}`
  );
}

export async function POST(req: NextRequest) {
  try {
    /* =========================================================
       1. READ REQUEST
    ========================================================= */

    const body = await req.json();

    const {
      accountId,
      containerId,
      workspaceId,
    } = body ?? {};

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: "Missing accountId, containerId, or workspaceId.",
          errorType: "validation_error",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================================================
       2. GET GOOGLE ACCESS TOKEN
    ========================================================= */

    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: "Missing Google access token.",
          errorType: "google_auth_error",
        },
        {
          status: 401,
        }
      );
    }

    /* =========================================================
       3. GTM BASE URL
    ========================================================= */

    const base =
      `https://tagmanager.googleapis.com/tagmanager/v2/` +
      `accounts/${accountId}/` +
      `containers/${containerId}/` +
      `workspaces/${workspaceId}`;

    const opts = {
      deadlineMs: 8_000,
    };

    /* =========================================================
       4. FETCH TAGS / TRIGGERS / VARIABLES
    ========================================================= */

    const [
      tagsRes,
      triggersRes,
      variablesRes,
    ] = await Promise.all([
      gtmList<GtmRecord>({
        url: `${base}/tags`,
        accessToken,
        listKey: "tag",
        options: opts,
      }),

      gtmList<GtmRecord>({
        url: `${base}/triggers`,
        accessToken,
        listKey: "trigger",
        options: opts,
      }),

      gtmList<GtmRecord>({
        url: `${base}/variables`,
        accessToken,
        listKey: "variable",
        options: opts,
      }),
    ]);

    /* =========================================================
       5. CHECK GTM API FAILURES
    ========================================================= */

    const hardFailures = [
      tagsRes,
      triggersRes,
      variablesRes,
    ].filter(
      (result) =>
        result.error &&
        result.items.length === 0
    );

    if (hardFailures.length > 0) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: "Failed to fetch GTM data.",
          errorType: "gtm_api_error",
          details: hardFailures.map(
            (result) => result.error
          ),
        },
        {
          status: 502,
        }
      );
    }

    /* =========================================================
       6. GET GTM DATA
    ========================================================= */

    const tags = tagsRes.items;
    const triggers = triggersRes.items;
    const variables = variablesRes.items;

    /* =========================================================
       7. RUN NORMAL HEALTH CHECK
    ========================================================= */

    const rawReport = runHealthCheck({
      tags,
      triggers,
      variables,
      accountId,
      containerId,
      workspaceId,
    });

    /* =========================================================
       8. NORMALIZE AFFECTED ITEMS
    ========================================================= */

    type ResultRow = {
      affectedTags?: unknown[];
      affectedTriggers?: unknown[];
      affectedVariables?: unknown[];
      [key: string]: unknown;
    };

    const normalizedResults = (
      (rawReport.results || []) as ResultRow[]
    ).map((result) => ({
      ...result,

      affectedTags:
        (result.affectedTags ?? []).map(
          affectedItem
        ),

      affectedTriggers:
        (result.affectedTriggers ?? []).map(
          affectedItem
        ),

      affectedVariables:
        (result.affectedVariables ?? []).map(
          affectedItem
        ),
    }));

    /* =========================================================
       9. COMPLETE HEALTH REPORT
    ========================================================= */

    const healthReport = {
      ...rawReport,

      results: normalizedResults,

      truncated:
        Boolean(tagsRes.truncated) ||
        Boolean(triggersRes.truncated) ||
        Boolean(variablesRes.truncated),

      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    };

    /* =========================================================
       10. BUILD RAW GTM CONTAINER FOR CLAUDE
    ========================================================= */

    const containerExport = {
      tag: tags,
      trigger: triggers,
      variable: variables,
    };

    /* =========================================================
       11. CLAUDE PROMPT
    ========================================================= */

    const prompt = `
You are an expert Google Tag Manager consultant.

You are auditing a live GTM workspace.

Below is the raw GTM container data containing:

- Tags
- Triggers
- Variables

Analyze the actual configuration and identify real tracking,
configuration, duplication, cleanup, consent, trigger,
variable, and implementation problems.

Do NOT assume that every item is problematic.

Use your own GTM expertise and inspect the actual data.

IMPORTANT:

- Do not invent tags, triggers, or variables.
- Only mention items that actually exist in the provided data.
- If something cannot be determined from the data, say so.
- Do not assume that every "googtag" is a GA4 tag.
- Check tag types and parameters carefully.
- Consider trigger relationships.
- Consider variable references.
- Consider paused tags.
- Consider duplicate or very similar configurations.
- Consider overly broad triggers.
- Consider unused assets.
- Consider legacy implementations.
- Consider consent configuration when evidence exists.
- Consider Custom HTML risks.
- Consider GA4 and Google Ads configuration where applicable.

Return ONLY normal Markdown text.

Do NOT return JSON.

Do NOT wrap the response in a code block.

Use exactly these sections:

## Critical Issues

List the most serious problems that can affect tracking,
data accuracy, duplicate data, or production behavior.

For every important issue:

- Name the actual tag/trigger/variable.
- Explain what is wrong.
- Explain why it matters.
- Explain what should be changed.

## Warnings / Cleanup Opportunities

Identify lower-severity problems such as:

- Paused tags
- Unused tags
- Unused triggers
- Unused variables
- Duplicate or similar configurations
- Naming inconsistencies
- Broad triggers
- Risky Custom HTML
- Configuration clutter

Group similar issues where possible instead of listing
every item individually.

## What's Working Well

Mention genuinely good implementation patterns found
in the GTM container.

Do not invent positive findings.

## What To Do Next

Give a prioritized action plan.

Order actions from:

1. Critical tracking problems
2. Data accuracy problems
3. Consent/security issues
4. Duplicate configurations
5. Cleanup
6. Optimization

Keep the response focused and readable.

The container can contain many assets, so do not unnecessarily
list every tag, trigger, and variable.

RAW GTM CONTAINER:

${JSON.stringify(containerExport)}
`;

    /* =========================================================
       12. CALL CLAUDE
    ========================================================= */

    let response;

    try {
      console.log(
        "Starting Claude HealthCheck request..."
      );

      console.log(
        "Claude HealthCheck input counts:",
        {
          tags: tags.length,
          triggers: triggers.length,
          variables: variables.length,
        }
      );

      response = await client.messages.create({
        model: "claude-sonnet-5",

        /*
         * 12000 is enough for a detailed audit while avoiding
         * unnecessarily huge responses.
         */
        max_tokens: 12000,

        system:
          "You are a senior Google Tag Manager implementation and analytics consultant.",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      console.log(
        "Claude HealthCheck request completed."
      );

      console.log(
        "Claude request ID:",
        response._request_id ?? "unavailable"
      );

      console.log(
        "Claude stop reason:",
        response.stop_reason
      );

      console.log(
        "Claude content blocks:",
        response.content?.map(
          (content) => content.type
        ) ?? []
      );
    } catch (claudeError: unknown) {
      console.error(
        "===================================================="
      );

      console.error(
        "CLAUDE HEALTHCHECK FAILED"
      );

      console.error(
        "===================================================="
      );

      console.error(
        "Raw Claude error:",
        claudeError
      );

      const details =
        extractErrorDetails(claudeError);

      const userMessage =
        buildClaudeUserMessage(details);

      console.error(
        "Claude error type:",
        details.errorType
      );

      console.error(
        "Claude error status:",
        details.status
      );

      console.error(
        "Claude error message:",
        details.message
      );

      console.error(
        "Claude request ID:",
        details.requestId ?? "unavailable"
      );

      console.error(
        "===================================================="
      );

      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: userMessage,
          errorType: details.errorType,
          status:
            details.status ?? 502,
          requestId:
            details.requestId ?? null,

          claude: {
            failed: true,
            message: details.message,
            type: details.errorType,
            status:
              details.status ?? null,
            requestId:
              details.requestId ?? null,
          },

          counts: {
            tags: tags.length,
            triggers: triggers.length,
            variables: variables.length,
          },
        },
        {
          status:
            details.status &&
              details.status >= 400 &&
              details.status < 600
              ? 502
              : 502,
        }
      );
    }

    /* =========================================================
       13. VERIFY CLAUDE RESPONSE
    ========================================================= */

    if (!response) {
      console.error(
        "Claude returned no response object."
      );

      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error:
            "Claude returned no response object.",
          errorType:
            "empty_response_object",
        },
        {
          status: 502,
        }
      );
    }

    /* =========================================================
       14. EXTRACT CLAUDE TEXT
    ========================================================= */

    const textBlocks = response.content
      .filter(
        (content) =>
          content.type === "text"
      )
      .map((content) => {
        if (
          content.type === "text"
        ) {
          return content.text;
        }

        return "";
      })
      .filter(Boolean);

    const resultText =
      textBlocks.join("\n\n").trim();

    /* =========================================================
       15. EMPTY RESPONSE CHECK
    ========================================================= */

    if (!resultText) {
      console.error(
        "===================================================="
      );

      console.error(
        "CLAUDE RETURNED EMPTY TEXT"
      );

      console.error(
        "===================================================="
      );

      console.error(
        "Claude request ID:",
        response._request_id ??
        "unavailable"
      );

      console.error(
        "Claude stop reason:",
        response.stop_reason
      );

      console.error(
        "Claude content:",
        response.content
      );

      console.error(
        "===================================================="
      );

      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error:
            "Claude returned an empty response.",
          errorType:
            "empty_claude_response",
          requestId:
            response._request_id ?? null,
          stopReason:
            response.stop_reason ?? null,
          contentTypes:
            response.content?.map(
              (content) =>
                content.type
            ) ?? [],
        },
        {
          status: 502,
        }
      );
    }

    /* =========================================================
       16. TOKEN TRUNCATION
    ========================================================= */

    const truncated =
      response.stop_reason ===
      "max_tokens";

    if (truncated) {
      console.warn(
        "Claude AI audit reached max_tokens."
      );
    }

    /* =========================================================
       17. SUCCESS
    ========================================================= */

    console.log(
      "===================================================="
    );

    console.log(
      "CLAUDE HEALTHCHECK SUCCESS"
    );

    console.log(
      "===================================================="
    );

    console.log(
      "Claude request ID:",
      response._request_id ??
      "unavailable"
    );

    console.log(
      "Claude stop reason:",
      response.stop_reason
    );

    console.log(
      "Claude result length:",
      resultText.length
    );

    console.log(
      "===================================================="
    );

    return NextResponse.json({
      success: true,
      source: "claude-healthcheck",

      healthReport,

      resultText,

      truncated,

      requestId:
        response._request_id ?? null,

      stopReason:
        response.stop_reason ?? null,

      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    });
  } catch (error: unknown) {
    /* =========================================================
       18. GENERAL ERROR
    ========================================================= */

    console.error(
      "===================================================="
    );

    console.error(
      "CLAUDE HEALTHCHECK ROUTE ERROR"
    );

    console.error(
      "===================================================="
    );

    console.error(
      "Raw error:",
      error
    );

    const details =
      extractErrorDetails(error);

    console.error(
      "Error type:",
      details.errorType
    );

    console.error(
      "Error status:",
      details.status
    );

    console.error(
      "Error message:",
      details.message
    );

    console.error(
      "Request ID:",
      details.requestId ??
      "unavailable"
    );

    console.error(
      "===================================================="
    );

    return NextResponse.json(
      {
        success: false,
        source: "claude-healthcheck",
        error: details.message,
        errorType: details.errorType,
        status:
          details.status ?? 500,
        requestId:
          details.requestId ?? null,
      },
      {
        status: 500,
      }
    );
  }
}