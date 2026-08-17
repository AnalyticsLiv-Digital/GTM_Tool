import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/claude";
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { gtmList } from "@/lib/gtm/list";

type GtmRecord = Record<string, unknown>;

function affectedItem(x: unknown): { name: string } {
  if (typeof x === "string") {
    return {
      name: x,
    };
  }

  if ( x &&typeof x === "object" &&"name" in x && typeof (x as { name: unknown }).name === "string") {
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
          error:"Missing accountId, containerId, or workspaceId.",
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
          error: "Missing Google access token.",
        },
        {
          status: 401,
        }
      );
    }

    /* =========================================================
       3. GTM BASE URL
    ========================================================= */

    const base =`https://tagmanager.googleapis.com/tagmanager/v2/` + `accounts/${accountId}/`+`containers/${containerId}/`+`workspaces/${workspaceId}`;

    const opts = {deadlineMs: 8_000,};

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
          error: "Failed to fetch GTM data.",
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
    } catch (claudeError: unknown) {
      console.error(
        "Claude API request failed:",
        claudeError
      );

      let message =
        "Claude API request failed.";

      if (claudeError instanceof Error) {
        message = claudeError.message;
      } else if (
        typeof claudeError === "string"
      ) {
        message = claudeError;
      } else if (
        claudeError &&
        typeof claudeError === "object"
      ) {
        try {
          message = JSON.stringify(
            claudeError
          );
        } catch {
          message =
            "Claude API returned an unknown error.";
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        {
          status: 502,
        }
      );
    }

    /* =========================================================
       13. EXTRACT CLAUDE TEXT
    ========================================================= */

    const textBlocks = response.content
      .filter(
        (content) => content.type === "text"
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
       14. EMPTY RESPONSE CHECK
    ========================================================= */

    if (!resultText) {
      console.error(
        "Claude returned an empty response.",
        {
          stopReason:
            response.stop_reason,
          contentTypes:
            response.content.map(
              (content) =>
                content.type
            ),
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Claude returned an empty response.",
          stopReason:
            response.stop_reason,
        },
        {
          status: 502,
        }
      );
    }

    /* =========================================================
       15. TOKEN TRUNCATION
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
       16. SUCCESS
    ========================================================= */

    return NextResponse.json({
      success: true,

      healthReport,

      resultText,

      truncated,

      counts: {
        tags: tags.length,
        triggers: triggers.length,
        variables: variables.length,
      },
    });
  } catch (error: unknown) {
    /* =========================================================
       17. GENERAL ERROR
    ========================================================= */

    console.error(
      "Claude HealthCheck Route Error:",
      error
    );

    let message =
      "Unknown server error.";

    if (error instanceof Error) {
      message = error.message;
    } else if (
      typeof error === "string"
    ) {
      message = error;
    } else if (
      error &&
      typeof error === "object"
    ) {
      try {
        message = JSON.stringify(error);
      } catch {
        message =
          "Unable to determine server error.";
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}