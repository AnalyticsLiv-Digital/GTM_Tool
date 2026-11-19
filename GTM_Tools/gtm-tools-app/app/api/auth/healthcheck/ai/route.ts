
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

import {
  AnthropicFailure,
  classifyAnthropicError,
} from "@/lib/anthropicError";

import {
  clearAnthropicKeyCookie,
  readAnthropicKey,
} from "@/lib/anthropicKeyCookie";

import { ClaudeNotConfiguredError } from "@/lib/claudeClient";

// =====================================================
// TYPES
// =====================================================

type HealthCheckReport = {
  score: number;
  results: Array<Record<string, any>>;
  [key: string]: unknown;
};

type RequestMode = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
};

type ClaudeErrorShape = {
  status?: unknown;
  name?: unknown;
  message?: unknown;
  error?: {
    message?: unknown;
    type?: unknown;
  };
  type?: unknown;
  requestId?: unknown;
  request_id?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

// =====================================================
// CONFIGURATION
// =====================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FALLBACK_CODES = [
  "no_key",
  "quota",
  "rate_limit",
  "overloaded",
  "api_error",
];

// =====================================================
// PRESERVE COMPLETE GTM AFFECTED ITEM
// =====================================================

function affectedItem(x: unknown): Record<string, any> {
  if (typeof x === "string") {
    return {
      name: x,
    };
  }

  if (x && typeof x === "object" && !Array.isArray(x)) {
    const item = x as Record<string, any>;

    return {
      ...item,

      name:
        typeof item.name === "string" && item.name.trim()
          ? item.name
          : typeof item.variableName === "string"
            ? item.variableName
            : typeof item.tagName === "string"
              ? item.tagName
              : typeof item.triggerName === "string"
                ? item.triggerName
                : "Unknown item",
    };
  }

  try {
    return {
      name: JSON.stringify(x) || "Unknown item",
    };
  } catch {
    return {
      name: "Unknown item",
    };
  }
}

// =====================================================
// ERROR DETAILS
// =====================================================

function extractErrorDetails(error: unknown): {
  message: string;
  errorType: string;
  status?: number;
  requestId?: string;
} {
  const details = {
    message: "Unknown Claude API error.",
    errorType: "unknown_error",
    status: undefined as number | undefined,
    requestId: undefined as string | undefined,
  };

  if (error instanceof Error) {
    details.message = error.message;
    details.errorType = error.name || "Error";
  }

  if (!error || typeof error !== "object") {
    if (typeof error === "string" && error.trim()) {
      details.message = error;
    }

    return details;
  }

  const value = error as ClaudeErrorShape;

  if (typeof value.status === "number") {
    details.status = value.status;
  }

  if (typeof value.name === "string" && value.name.trim()) {
    details.errorType = value.name;
  }

  if (typeof value.message === "string" && value.message.trim()) {
    details.message = value.message;
  }

  if (
    typeof value.error?.message === "string" &&
    value.error.message.trim()
  ) {
    details.message = value.error.message;
  }

  if (
    typeof value.error?.type === "string" &&
    value.error.type.trim()
  ) {
    details.errorType = value.error.type;
  }

  if (
    typeof value.type === "string" &&
    value.type.trim() &&
    value.type !== "Error"
  ) {
    details.errorType = value.type;
  }

  if (typeof value.requestId === "string" && value.requestId.trim()) {
    details.requestId = value.requestId;
  }

  if (typeof value.request_id === "string" && value.request_id.trim()) {
    details.requestId = value.request_id;
  }

  if (!details.requestId && value.headers) {
    const requestIdHeader =
      value.headers["request-id"] ??
      value.headers["x-request-id"];

    if (typeof requestIdHeader === "string") {
      details.requestId = requestIdHeader;
    }

    if (
      Array.isArray(requestIdHeader) &&
      requestIdHeader.length > 0
    ) {
      details.requestId = requestIdHeader[0];
    }
  }

  return details;
}

// =====================================================
// USER-FRIENDLY CLAUDE ERRORS
// =====================================================

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

  const requestText = details.requestId
    ? `Request ID: ${details.requestId}`
    : "Request ID: unavailable";

  const message = details.message.toLowerCase();
  const errorType = details.errorType.toLowerCase();

  if (
    message.includes("credit balance") ||
    message.includes("credit") ||
    message.includes("billing")
  ) {
    return (
      `Claude API billing/credit error (${statusText}). ` +
      `${details.message} ${requestText}`
    );
  }

  if (
    errorType.includes("authentication") ||
    details.status === 401
  ) {
    return (
      `Claude API authentication failed (${statusText}). ` +
      `${details.message} ${requestText}`
    );
  }

  if (details.status === 429) {
    return (
      `Claude API rate limit reached (${statusText}). ` +
      `${details.message} ${requestText}`
    );
  }

  if (details.status === 400) {
    return (
      `Claude API rejected the request (${statusText}). ` +
      `${details.message} ${requestText}`
    );
  }

  return (
    `Claude API request failed (${statusText}). ` +
    `${details.message} ${requestText}`
  );
}

// =====================================================
// LOCAL RULE-ENGINE AUDIT FALLBACK
// =====================================================

function buildLocalAudit(report: HealthCheckReport): string {
  const failed = report.results.filter(
    (result) => !result.passed
  );

  const passed = report.results.filter(
    (result) => result.passed
  );

  const list = (severities: string[]) =>
    failed
      .filter((result) =>
        severities.includes(
          String(result.severity ?? "").toUpperCase()
        )
      )
      .map(
        (result) =>
          `- **${result.title || result.name || "Untitled rule"}**: ${
            result.recommendation ||
            result.description ||
            "Review this finding."
          }`
      )
      .join("\n") || "- None found";

  return `## Critical Issues
${list(["CRITICAL", "HIGH"])}

## Warnings / Cleanup Opportunities
${list(["MEDIUM", "LOW"])}

## What's Working Well
${
  passed
    .slice(0, 8)
    .map(
      (result) =>
        `- ${result.title || result.name || "Passed rule"}`
    )
    .join("\n") || "- Nothing passed yet"
}

## What To Do Next
- Fix critical and high-severity issues first.
- Review medium- and low-severity cleanup opportunities.
- Re-run the health check and validate changes in Preview Mode before publishing.

_Score: ${report.score}%. Generated by the built-in rule engine._`;
}

// =====================================================
// POST API
// =====================================================

export async function POST(req: NextRequest) {
  let healthReport: HealthCheckReport | null = null;

  let apiKey: string | undefined;

  const userKey =
    req.headers.get("x-anthropic-key")?.trim() || undefined;

  try {
    // =================================================
    // 1. READ REQUEST
    // =================================================

    let body: RequestMode;

    try {
      body = (await req.json()) as RequestMode;
    } catch {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error:
            "Invalid request body. Expected accountId, containerId, and workspaceId.",
          errorType: "validation_error",
        },
        { status: 400 }
      );
    }

    const {
      accountId,
      containerId,
      workspaceId,
    } = body;

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error:
            "Missing accountId, containerId, or workspaceId.",
          errorType: "validation_error",
        },
        { status: 400 }
      );
    }

    // =================================================
    // 2. CLAUDE API KEY
    // =================================================

    apiKey = readAnthropicKey(req) ?? undefined;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error:
            "Claude API key is missing. Add your Claude API key before running the Claude audit.",
          errorType: "no_key",
        },
        { status: 400 }
      );
    }

    // =================================================
    // 3. GOOGLE ACCESS TOKEN
    // =================================================

    const accessToken =
      await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: "Missing Google access token.",
          errorType: "google_auth_error",
        },
        { status: 401 }
      );
    }

    // =================================================
    // 4. GTM BASE URL
    // =================================================

    const base =
      `https://tagmanager.googleapis.com/tagmanager/v2/` +
      `accounts/${accountId}/` +
      `containers/${containerId}/` +
      `workspaces/${workspaceId}`;

    const opts = {
      deadlineMs: 8000,
    };

    // =================================================
    // 5. FETCH GTM ASSETS
    // =================================================

    const [
      tagsRes,
      triggersRes,
      variablesRes,
    ] = await Promise.all([
      gtmList<Record<string, unknown>>({
        url: `${base}/tags`,
        accessToken,
        listKey: "tag",
        options: opts,
      }),

      gtmList<Record<string, unknown>>({
        url: `${base}/triggers`,
        accessToken,
        listKey: "trigger",
        options: opts,
      }),

      gtmList<Record<string, unknown>>({
        url: `${base}/variables`,
        accessToken,
        listKey: "variable",
        options: opts,
      }),
    ]);

    // =================================================
    // 6. CHECK GTM API FAILURES
    // =================================================

    const hardFailures = [
      tagsRes,
      triggersRes,
      variablesRes,
    ].filter(
      (result) =>
        result.error && result.items.length === 0
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
        { status: 502 }
      );
    }

    // =================================================
    // 7. EXTRACT GTM ASSETS
    // =================================================

    const tags = tagsRes.items;
    const triggers = triggersRes.items;
    const variables = variablesRes.items;

    console.log("GTM HealthCheck asset counts:", {
      tags: tags.length,
      triggers: triggers.length,
      variables: variables.length,
    });

    // =================================================
    // 8. RUN RULE ENGINE
    // =================================================

    const rawReport = runHealthCheck({
      tags,
      triggers,
      variables,
      accountId,
      containerId,
      workspaceId,
    });

    // =================================================
    // 9. NORMALIZE AFFECTED ITEMS
    // IMPORTANT:
    // Preserve IDs, paths and edit URLs.
    // =================================================

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

      affectedTags: (
        result.affectedTags ?? []
      ).map(affectedItem),

      affectedTriggers: (
        result.affectedTriggers ?? []
      ).map(affectedItem),

      affectedVariables: (
        result.affectedVariables ?? []
      ).map(affectedItem),
    }));

    // =================================================
    // 10. BUILD FULL HEALTH REPORT
    // =================================================

    healthReport = {
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

    // =================================================
    // 11. PREPARE CLAUDE PROMPT
    // =================================================

    const containerExport = {
      tag: tags,
      trigger: triggers,
      variable: variables,
    };

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
## Warnings / Cleanup Opportunities
## What's Working Well
## What To Do Next

Keep the response focused and readable.

The container can contain many assets, so do not unnecessarily
list every tag, trigger, and variable.

RAW GTM CONTAINER:

${JSON.stringify(containerExport)}
`;

    // =================================================
    // 12. CALL CLAUDE
    // =================================================

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

      const client = new Anthropic({
        apiKey,
      });

      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 20000,

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
    } catch (claudeError: unknown) {
      console.error(
        "CLAUDE HEALTHCHECK FAILED",
        claudeError
      );

      const details =
        extractErrorDetails(claudeError);

      const userMessage =
        buildClaudeUserMessage(details);

      const failure =
        classifyAnthropicError(claudeError);

      const failureResponse = NextResponse.json(
        {
          success: false,

          source: "claude-healthcheck",

          code: failure.code,

          error: userMessage,

          errorType: details.errorType,

          status: details.status ?? 502,

          requestId: details.requestId ?? null,

          claude: {
            failed: true,
            message: details.message,
            type: details.errorType,
            status: details.status ?? null,
            requestId: details.requestId ?? null,
          },

          counts: {
            tags: tags.length,
            triggers: triggers.length,
            variables: variables.length,
          },
        },
        {
          status: failure.status,
        }
      );

      if (failure.code === "invalid_key") {
        clearAnthropicKeyCookie(failureResponse);
      }

      return failureResponse;
    }

    // =================================================
    // 13. VERIFY CLAUDE RESPONSE
    // =================================================

    if (!response) {
      console.error(
        "Claude returned no response object."
      );

      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          code: "scan_failed",
          error:
            "Could not load the live GTM health report because the Claude response was empty.",
        },
        { status: 502 }
      );
    }

    // =================================================
    // 14. EXTRACT CLAUDE TEXT
    // =================================================

    const textBlocks = response.content
      .filter(
        (content) => content.type === "text"
      )
      .map((content) => {
        if (content.type === "text") {
          return content.text;
        }

        return "";
      })
      .filter(Boolean);

    const resultText =
      textBlocks.join("\n\n").trim();

    // =================================================
    // 15. CHECK EMPTY RESPONSE
    // =================================================

    if (!resultText) {
      console.error(
        "CLAUDE RETURNED EMPTY TEXT",
        {
          requestId:
            response._request_id ?? "unavailable",

          stopReason:
            response.stop_reason,

          content:
            response.content,
        }
      );

      return NextResponse.json(
        {
          success: false,
          source: "claude-healthcheck",
          error: "Claude returned an empty response.",
          errorType: "empty_claude_response",

          requestId:
            response._request_id ?? null,

          stopReason:
            response.stop_reason ?? null,

          contentTypes:
            response.content?.map(
              (content) => content.type
            ) ?? [],
        },
        { status: 502 }
      );
    }

    // =================================================
    // 16. TOKEN TRUNCATION
    // =================================================

    const truncated =
      response.stop_reason === "max_tokens";

    if (truncated) {
      console.warn(
        "Claude AI audit reached max_tokens."
      );
    }

    // =================================================
    // 17. SUCCESS RESPONSE
    // =================================================

    console.log(
      "CLAUDE HEALTHCHECK SUCCESS",
      {
        requestId:
          response._request_id ?? "unavailable",

        stopReason:
          response.stop_reason,

        resultLength:
          resultText.length,
      }
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
    // =================================================
    // 18. OUTER ERROR HANDLER
    // =================================================

    const details =
      extractErrorDetails(error);

    const notConfigured =
      error instanceof ClaudeNotConfiguredError;

    type RouteAnthropicFailure =
      | AnthropicFailure
      | {
          status: number;
          code: "no_key";
          message: string;
        };

    const failure: RouteAnthropicFailure =
      notConfigured
        ? {
            status: 500,
            code: "no_key",
            message: "AI audit is not configured.",
          }
        : classifyAnthropicError(error);

    if (notConfigured) {
      console.error(
        "[claude] Not configured:",
        (error as Error).message
      );
    }

    // User's own API key failed.
    if (
      userKey &&
      ["invalid_key", "quota", "rate_limit"].includes(
        failure.code
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          code: failure.code,
          error: failure.message,
        },
        {
          status:
            failure.code === "rate_limit"
              ? 429
              : 401,
        }
      );
    }

    // =================================================
    // 19. RULE-ENGINE FALLBACK
    // =================================================

    if (
      healthReport &&
      FALLBACK_CODES.includes(failure.code)
    ) {
      return NextResponse.json({
        success: true,

        source: "claude-healthcheck",

        mode: "live",

        fallback: true,

        healthReport,

        resultText:
          buildLocalAudit(healthReport),

        truncated: false,
      });
    }

    return NextResponse.json(
      {
        success: false,

        source: "claude-healthcheck",

        error: details.message,

        errorType: details.errorType,

        status: details.status ?? 500,

        requestId: details.requestId ?? null,
      },
      {
        status: 500,
      }
    );
  }
}
