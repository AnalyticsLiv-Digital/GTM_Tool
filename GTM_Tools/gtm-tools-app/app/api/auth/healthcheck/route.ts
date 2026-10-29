import { NextRequest, NextResponse } from "next/server";
import { healthCheckRules, } from "@/lib/healthcheck/rules";
import type { GTMHealthData, HealthCheckResult, } from "@/lib/healthcheck/types";

type GTMResponse = {
  tag?: Record<string, unknown>[];
  trigger?: Record<string, unknown>[];
  variable?: Record<string, unknown>[];
};

type RequestBody = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;

  tags?: Record<string, unknown>[];
  triggers?: Record<string, unknown>[];
  variables?: Record<string, unknown>[];
};

const getString = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

/**
 * Fetch GTM resource from the existing internal GTM API.
 */
async function fetchGTMResource(
  req: NextRequest,
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<Record<string, unknown>[]> {
  const origin = req.nextUrl.origin;

  const url = `${origin}/api/auth/gtm/${type}` + `?accountId=${encodeURIComponent(accountId)}` + `&containerId=${encodeURIComponent(containerId)}` + `&workspaceId=${encodeURIComponent(workspaceId)}`;

  const response = await fetch(url, {
    method: "GET", headers: {
      cookie: req.headers.get("cookie") || "", authorization:
        req.headers.get("authorization") || "",
    }, cache: "no-store",
  });

  const text = await response.text();
  let data: GTMResponse = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON returned from GTM ${type} API.`);
  }

  if (!response.ok) {
    const errorMessage = typeof (data as Record<string, unknown>).error === "string"
      ? String(
        (data as Record<string, unknown>).error
      )
      : `Failed to fetch GTM ${type}.`;

    throw new Error(
      `${errorMessage} HTTP ${response.status}`
    );
  }

  if (type === "tags") {
    return Array.isArray(data.tag)
      ? data.tag
      : [];
  }

  if (type === "triggers") {
    return Array.isArray(data.trigger)
      ? data.trigger
      : [];
  }

  return Array.isArray(data.variable)
    ? data.variable
    : [];
}

/**
 * Safely execute one health-check rule.
 *
 * If one rule crashes, the complete HealthCheck should
 * still return a report. The failed rule is returned as
 * a failed result instead of breaking the entire API.
 */
function executeRule(
  rule: {
    id: string;
    title: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    check: (
      data: GTMHealthData
    ) => HealthCheckResult;
  },
  data: GTMHealthData
): HealthCheckResult {
  try {
    const result =
      rule.check(data);

    return {
      ...result,

      id:
        result.id || rule.id,

      title:
        result.title || rule.title,

      severity:
        result.severity || rule.severity,

      passed:
        Boolean(result.passed),

      description:
        result.description ||
        `${rule.title} health check.`,
    };
  } catch (error) {
    console.error(
      `HealthCheck rule failed: ${rule.id}`,
      error
    );

    return {
      id: rule.id,
      title: rule.title,
      description:
        `Health check rule "${rule.title}" could not be evaluated.`,
      severity: rule.severity,
      passed: false,

      recommendation:
        "Review this rule and the underlying GTM configuration manually.",
    };
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    // ============================================================
    // READ REQUEST
    // ============================================================

    const body =
      (await req.json()) as RequestBody;

    const accountId =
      getString(body.accountId);

    const containerId =
      getString(body.containerId);

    const workspaceId =
      getString(body.workspaceId);

    // ============================================================
    // VALIDATE GTM SELECTION
    // ============================================================

    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing accountId. Please select a GTM account.",
        },
        {
          status: 400,
        }
      );
    }

    if (!containerId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing containerId. Please select a GTM container.",
        },
        {
          status: 400,
        }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing workspaceId. Please select a GTM workspace.",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // GET GTM DATA
    // ============================================================

    let tags: Record<string, unknown>[] = [];
    let triggers: Record<string, unknown>[] = [];
    let variables: Record<string, unknown>[] = [];

    /*
     * If the frontend already sends the GTM objects,
     * use them directly.
     *
     * Otherwise fetch them from the existing GTM APIs.
     */

    if (
      Array.isArray(body.tags) &&
      Array.isArray(body.triggers) &&
      Array.isArray(body.variables)
    ) {
      tags = body.tags;
      triggers = body.triggers;
      variables = body.variables;
    } else {
      [
        tags,
        triggers,
        variables,
      ] = await Promise.all([
        fetchGTMResource(
          req,
          "tags",
          accountId,
          containerId,
          workspaceId
        ),

        fetchGTMResource(
          req,
          "triggers",
          accountId,
          containerId,
          workspaceId
        ),

        fetchGTMResource(
          req,
          "variables",
          accountId,
          containerId,
          workspaceId
        ),
      ]);
    }

    // ============================================================
    // BUILD HEALTH DATA
    // ============================================================

    const healthData: GTMHealthData = {
      accountId,
      containerId,
      workspaceId,

      tags,
      triggers,
      variables,
    };

    // ============================================================
    // RUN ALL HEALTH CHECK RULES
    // ============================================================

    const results: HealthCheckResult[] =
      healthCheckRules.map(
        (rule) =>
          executeRule(
            rule as {
              id: string;
              title: string;
              severity: "HIGH" | "MEDIUM" | "LOW";
              check: (
                data: GTMHealthData
              ) => HealthCheckResult;
            },
            healthData
          )
      );

    // ============================================================
    // SCORE
    // ============================================================

    const totalRules =
      results.length;

    const passedCount =
      results.filter(
        (result) =>
          result.passed
      ).length;

    const failedCount =
      results.filter(
        (result) =>
          !result.passed
      ).length;

    const score =
      totalRules === 0
        ? 100
        : Math.round(
          (passedCount /
            totalRules) *
          100
        );

    // ============================================================
    // COUNTS
    // IMPORTANT:
    // These are the actual GTM entity counts.
    // Do NOT calculate these from health-check rules.
    // ============================================================

    const counts = {
      tags: tags.length,
      triggers: triggers.length,
      variables: variables.length,
    };

    // ============================================================
    // SUMMARY INFORMATION
    // ============================================================

    const failedResults =
      results.filter(
        (result) =>
          !result.passed
      );

    const highFailures =
      failedResults.filter(
        (result) =>
          result.severity ===
          "HIGH"
      ).length;

    const mediumFailures =
      failedResults.filter(
        (result) =>
          result.severity ===
          "MEDIUM"
      ).length;

    const lowFailures =
      failedResults.filter(
        (result) =>
          result.severity ===
          "LOW"
      ).length;

    // ============================================================
    // FINAL REPORT
    // ============================================================

    const healthReport = {
      score,

      passedCount,

      failedCount,

      counts,

      severityCounts: {
        high: highFailures,
        medium: mediumFailures,
        low: lowFailures,
      },

      results,
    };

    // ============================================================
    // SERVER LOG
    // ============================================================

    console.log(
      "[HealthCheck] Completed",
      {
        accountId,
        containerId,
        workspaceId,

        tags: counts.tags,
        triggers: counts.triggers,
        variables: counts.variables,

        totalRules,
        passedCount,
        failedCount,

        score,
      }
    );

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        healthReport,

        // Keep these at the top level because
        // your HealthCheckPage already expects them.
        score,
        passedCount,
        failedCount,
        counts,
        results,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("[HealthCheck API Error]", error);

    const message =
      error instanceof Error ? error.message : "Unknown HealthCheck API error.";

    return NextResponse.json(
      {
        success: false,
        error: message,

        // Useful during debugging.
        details: "HealthCheck failed while fetching GTM data or executing the health-check rules.",
      },
      {
        status: 500,
      }
    );
  }
}