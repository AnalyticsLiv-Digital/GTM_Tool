
import { NextRequest, NextResponse } from "next/server";
import { healthCheckRules } from "@/lib/healthcheck/rules";
import type {
  GTMHealthData,
  HealthCheckResult,
  Severity,
} from "@/lib/healthcheck/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GTMResource = Record<string, unknown>;
type JsonObject = Record<string, unknown>;

type ResourceType = "tags" | "triggers" | "variables";

type RequestBody = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  tags?: GTMResource[];
  triggers?: GTMResource[];
  variables?: GTMResource[];
  importData?: JsonObject;
  containerName?: string;
};

type RuleLike = {
  id: string;
  title: string;
  severity: Severity;
  check: (data: GTMHealthData) => HealthCheckResult;
};

type ResourceBundle = {
  tags: GTMResource[];
  triggers: GTMResource[];
  variables: GTMResource[];
};

type PaginationError = {
  status?: number;
  message?: string;
  details?: unknown;
};

type ResourceFetchResult = {
  items: GTMResource[];
  pages: number;
  truncated: boolean;
  partial: boolean;
  paginationError: PaginationError | null;
};

type ResourceCompleteness = {
  complete: boolean;
  partial: boolean;
  truncated: boolean;
  pages: number;
  loaded: number;
  error: string | null;
};

type DataCompleteness = {
  complete: boolean;
  partialResources: ResourceType[];
  failedResources: ResourceType[];
  resources: Record<ResourceType, ResourceCompleteness>;
};

const RESOURCE_KEYS: Record<
  ResourceType,
  { singular: string; plural: string }
> = {
  tags: { singular: "tag", plural: "tags" },
  triggers: { singular: "trigger", plural: "triggers" },
  variables: { singular: "variable", plural: "variables" },
};

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getObject(value: unknown): JsonObject | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonObject;
}

function getArray(value: unknown): GTMResource[] | null {
  if (!Array.isArray(value)) return null;

  return value.filter(
    (item): item is GTMResource =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item)
  );
}

function getBoolean(value: unknown): boolean {
  return value === true;
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : 0;
}

function findResourceArray(
  sources: Array<JsonObject | null>,
  singularKey: string,
  pluralKey: string
): GTMResource[] | null {
  for (const source of sources) {
    if (!source) continue;

    const singular = getArray(source[singularKey]);
    if (singular !== null) return singular;

    const plural = getArray(source[pluralKey]);
    if (plural !== null) return plural;
  }

  return null;
}

function normalizeResourceResponse(
  payload: unknown,
  type: ResourceType
): GTMResource[] {
  const directArray = getArray(payload);

  if (directArray !== null) {
    return directArray;
  }

  const root = getObject(payload);

  if (!root) {
    throw new Error(
      `The GTM ${type} endpoint returned an unexpected response format.`
    );
  }

  const data = getObject(root.data);
  const result = getObject(root.result);
  const containerVersion = getObject(root.containerVersion);

  const sources = [
    root,
    data,
    result,
    containerVersion,
    getObject(data?.containerVersion),
    getObject(result?.containerVersion),
  ];

  const { singular, plural } = RESOURCE_KEYS[type];

  const resources = findResourceArray(
    sources,
    singular,
    plural
  );

  if (resources === null) {
    const errorMessage =
      getString(root.error) ||
      getString(root.message);

    throw new Error(
      errorMessage ||
        `The GTM ${type} endpoint did not return a "${singular}" or "${plural}" array.`
    );
  }

  return resources;
}

function getPaginationError(
  value: unknown
): PaginationError | null {
  const error = getObject(value);

  if (!error) return null;

  return {
    status: getNumber(error.status) || undefined,
    message:
      getString(error.message) ||
      getString(error.error) ||
      "Some resources could not be loaded.",
    details: error.details,
  };
}

/**
 * Reads both the resource array and pagination metadata.
 *
 * Supports:
 * - The updated API response:
 *   { success, tag/trigger/variable, truncated, pages, partial, paginationError }
 * - Older API responses:
 *   { tag/trigger/variable }
 * - Nested API responses:
 *   { data: { tag/trigger/variable } }
 */
function normalizeResourceFetchResult(
  payload: unknown,
  type: ResourceType
): ResourceFetchResult {
  const items = normalizeResourceResponse(payload, type);

  const root = getObject(payload);

  if (!root) {
    return {
      items,
      pages: 0,
      truncated: false,
      partial: false,
      paginationError: null,
    };
  }

  const data = getObject(root.data);
  const result = getObject(root.result);

  const metadataSources = [
    root,
    data,
    result,
  ].filter(
    (source): source is JsonObject => source !== null
  );

  let pages = 0;
  let truncated = false;
  let partial = false;
  let paginationError: PaginationError | null = null;

  for (const source of metadataSources) {
    pages = Math.max(pages, getNumber(source.pages));

    truncated ||= getBoolean(source.truncated);
    partial ||= getBoolean(source.partial);

    paginationError ??= getPaginationError(
      source.paginationError
    );

    // Backward compatibility with endpoints that use `error`.
    if (!paginationError && getObject(source.error)) {
      paginationError = getPaginationError(source.error);
    }
  }

  partial ||= truncated || paginationError !== null;

  return {
    items,
    pages,
    truncated,
    partial,
    paginationError,
  };
}

function getImportedResources(
  body: RequestBody
): {
  resources: ResourceBundle;
  metadata: JsonObject | null;
} | null {
  const imported = getObject(body.importData);

  // Direct resource arrays are supported for imported data and
  // callers that already provide the GTM resources.
  const root = imported ?? (body as unknown as JsonObject);

  const data = getObject(root.data);
  const containerVersion =
    getObject(root.containerVersion) ??
    getObject(data?.containerVersion);

  const rootContainer = getObject(root.container);
  const versionContainer = getObject(containerVersion?.container);

  const sources = [
    root,
    data,
    containerVersion,
    getObject(containerVersion?.containerVersion),
  ];

  const tags = findResourceArray(sources, "tag", "tags");

  const triggers = findResourceArray(
    sources,
    "trigger",
    "triggers"
  );

  const variables = findResourceArray(
    sources,
    "variable",
    "variables"
  );

  const hasDirectArrays =
    tags !== null ||
    triggers !== null ||
    variables !== null;

const hasExportMetadata = Boolean(
  rootContainer ||
  versionContainer ||
  root.exportFormatVersion !== undefined
);

  if (!hasDirectArrays && !hasExportMetadata) {
    return null;
  }

  return {
    resources: {
      tags: tags ?? [],
      triggers: triggers ?? [],
      variables: variables ?? [],
    },
    metadata:
      rootContainer ??
      versionContainer ??
      getObject(containerVersion) ??
      root,
  };
}

async function fetchGTMResource(
  req: NextRequest,
  type: ResourceType,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<ResourceFetchResult> {
  const url = new URL(
    `/api/auth/gtm/${type}`,
    req.nextUrl.origin
  );

  url.searchParams.set("accountId", accountId);
  url.searchParams.set("containerId", containerId);
  url.searchParams.set("workspaceId", workspaceId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") ?? "",
      authorization:
        req.headers.get("authorization") ?? "",
    },
    cache: "no-store",
  });

  const responseText = await response.text();

  let payload: unknown;

  try {
    payload = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    throw new Error(
      `The GTM ${type} endpoint returned invalid JSON (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    const errorObject = getObject(payload);

    const message =
      getString(errorObject?.error) ||
      getString(errorObject?.message);

    throw new Error(
      `${message || `Failed to fetch GTM ${type}`} (HTTP ${response.status}).`
    );
  }

  const result = normalizeResourceFetchResult(
    payload,
    type
  );

  if (result.partial) {
    console.warn(
      `[HealthCheck] GTM ${type} list is incomplete`,
      {
        pages: result.pages,
        loaded: result.items.length,
        truncated: result.truncated,
        paginationError: result.paginationError,
      }
    );
  }

  return result;
}

function executeRule(
  rule: RuleLike,
  data: GTMHealthData
): HealthCheckResult {
  try {
    const result = rule.check(data);

    return {
      ...result,
      id: result.id || rule.id,
      title: result.title || rule.title,
      severity: result.severity || rule.severity,
      passed: Boolean(result.passed),
      description:
        result.description ||
        `${rule.title} health check.`,
    };
  } catch (error) {
    console.error(
      `[HealthCheck] Rule "${rule.id}" failed:`,
      error
    );

    return {
      id: rule.id,
      title: rule.title,
      description:
        `Could not evaluate "${rule.title}".`,
      severity: rule.severity,
      passed: false,
      recommendation:
        "Review this rule's implementation and check the GTM configuration manually.",
    };
  }
}

function makeSystemResult(
  id: string,
  title: string,
  description: string,
  recommendation: string
): HealthCheckResult {
  return {
    id,
    title,
    description,
    severity: "HIGH",
    passed: false,
    recommendation,
  };
}

function makePartialSystemResult(
  id: string,
  title: string,
  description: string,
  recommendation: string
): HealthCheckResult {
  return {
    id,
    title,
    description,
    severity: "MEDIUM",
    passed: false,
    recommendation,
  };
}

function createEmptyCompleteness(): DataCompleteness {
  return {
    complete: true,
    partialResources: [],
    failedResources: [],
    resources: {
      tags: {
        complete: true,
        partial: false,
        truncated: false,
        pages: 0,
        loaded: 0,
        error: null,
      },
      triggers: {
        complete: true,
        partial: false,
        truncated: false,
        pages: 0,
        loaded: 0,
        error: null,
      },
      variables: {
        complete: true,
        partial: false,
        truncated: false,
        pages: 0,
        loaded: 0,
        error: null,
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    let body: RequestBody;

    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body. Expected JSON.",
        },
        { status: 400 }
      );
    }

    let accountId = getString(body.accountId);
    let containerId = getString(body.containerId);
    let workspaceId = getString(body.workspaceId);

    let resources: ResourceBundle = {
      tags: [],
      triggers: [],
      variables: [],
    };

    const resourceErrors: Partial<
      Record<ResourceType, string>
    > = {};

    const completeness = createEmptyCompleteness();

    const imported = getImportedResources(body);
    const isImportMode = imported !== null;

    if (imported) {
      resources = imported.resources;

      const metadata = imported.metadata;

      accountId ||= "imported";

      containerId ||=
        getString(body.containerName) ||
        getString(metadata?.publicId) ||
        getString(metadata?.containerId) ||
        getString(metadata?.name) ||
        "imported-container";

      workspaceId ||= "imported";

      // Imported data is treated as complete because it is supplied
      // as one export file rather than fetched through paginated APIs.
      for (const type of [
        "tags",
        "triggers",
        "variables",
      ] as ResourceType[]) {
        completeness.resources[type] = {
          complete: true,
          partial: false,
          truncated: false,
          pages: 0,
          loaded: resources[type].length,
          error: null,
        };
      }
    } else {
      if (!accountId || !containerId || !workspaceId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Select a GTM account, container, and workspace, or provide a supported GTM container export.",
          },
          { status: 400 }
        );
      }

      // Fetch independently so one failing endpoint does not
      // discard successful results from the other endpoints.
      const types: ResourceType[] = [
        "tags",
        "triggers",
        "variables",
      ];

      const settled = await Promise.allSettled(
        types.map((type) =>
          fetchGTMResource(
            req,
            type,
            accountId,
            containerId,
            workspaceId
          )
        )
      );

      settled.forEach((result, index) => {
        const type = types[index];

        if (result.status === "fulfilled") {
          const fetched = result.value;

          resources[type] = fetched.items;

          completeness.resources[type] = {
            complete: !fetched.partial,
            partial: fetched.partial,
            truncated: fetched.truncated,
            pages: fetched.pages,
            loaded: fetched.items.length,
            error:
              fetched.paginationError?.message ?? null,
          };

          if (fetched.partial) {
            completeness.partialResources.push(type);
          }
        } else {
          const message =
            result.reason instanceof Error
              ? result.reason.message
              : `Unknown error fetching GTM ${type}.`;

          resourceErrors[type] = message;

          completeness.resources[type] = {
            complete: false,
            partial: false,
            truncated: false,
            pages: 0,
            loaded: 0,
            error: message,
          };

          completeness.failedResources.push(type);

          console.error(
            `[HealthCheck] Failed to load ${type}:`,
            message
          );
        }
      });

      completeness.complete =
        completeness.partialResources.length === 0 &&
        completeness.failedResources.length === 0;
    }

    const { tags, triggers, variables } = resources;

    const counts = {
      tags: tags.length,
      triggers: triggers.length,
      variables: variables.length,
    };

    console.info("[HealthCheck] Resources loaded", {
      mode: isImportMode ? "import" : "gtm",
      accountId,
      containerId,
      workspaceId,
      ...counts,
      resourceErrors,
      dataCompleteness: completeness,
      totalRules: healthCheckRules.length,
    });

    const healthData: GTMHealthData = {
      accountId,
      containerId,
      workspaceId,
      tags,
      triggers,
      variables,
    };

    const rules = healthCheckRules as RuleLike[];

    const results: HealthCheckResult[] = rules.map(
      (rule) => executeRule(rule, healthData)
    );

    const warnings: string[] = [];

    // Report failed resource requests instead of silently treating
    // them as a clean container.
    for (const type of Object.keys(
      resourceErrors
    ) as ResourceType[]) {
      const message = resourceErrors[type];

      if (!message) continue;

      const resultId = `HC_SYS_FETCH_${type.toUpperCase()}`;

      results.push(
        makeSystemResult(
          resultId,
          `Could not load GTM ${type}`,
          `HealthCheck could not retrieve ${type} from the selected workspace. ${message}`,
          "Check your Google authentication, selected account/container/workspace, endpoint response, and required GTM permissions. Run the audit again after the request succeeds."
        )
      );

      warnings.push(
        `The ${type} resource request failed. Checks depending on ${type} may be incomplete.`
      );
    }

    // Report partial or truncated pagination separately.
    for (const type of completeness.partialResources) {
      const resourceInfo = completeness.resources[type];

      const paginationMessage = resourceInfo.error
        ? ` Pagination detail: ${resourceInfo.error}`
        : "";

      const truncationMessage = resourceInfo.truncated
        ? " The pagination limit or time limit was reached before all pages were loaded."
        : "";

      results.push(
        makePartialSystemResult(
          `HC_SYS_PARTIAL_${type.toUpperCase()}`,
          `GTM ${type} list is incomplete`,
          `HealthCheck loaded ${resourceInfo.loaded} ${type} across ${resourceInfo.pages} page(s), but the endpoint reported incomplete data.${truncationMessage}${paginationMessage}`,
          `Load the complete ${type} list from the selected GTM workspace. Check the pagination endpoint, Google API response, and configured pagination limits, then run HealthCheck again.`
        )
      );

      warnings.push(
        `The ${type} list is incomplete. ${resourceInfo.loaded} resource(s) were loaded across ${resourceInfo.pages} page(s). The audit score is provisional.`
      );
    }

    const failedResourceTypes = Object.keys(
      resourceErrors
    );

    if (
      !isImportMode &&
      failedResourceTypes.length === 0 &&
      counts.tags === 0 &&
      counts.triggers === 0 &&
      counts.variables === 0
    ) {
      results.push(
        makeSystemResult(
          "HC_SYS_EMPTY",
          "No GTM resources were loaded",
          "The selected workspace returned zero tags, triggers, and variables. A meaningful audit cannot be completed with an entirely empty resource set.",
          "Confirm the selected account, container, and workspace. Verify that the GTM API endpoints return the expected resource arrays."
        )
      );

      warnings.push(
        "No GTM resources were loaded. This report should not be treated as a reliable assessment of the container."
      );
    } else {
      if (counts.tags === 0) {
        warnings.push(
          "No tags were returned. Confirm that the selected workspace is correct."
        );
      }

      if (counts.triggers === 0) {
        warnings.push(
          "No triggers were returned. Trigger-related checks may be incomplete."
        );
      }

      if (counts.variables === 0) {
        warnings.push(
          "No variables were returned. Variable-related checks may be incomplete."
        );
      }
    }

    const passedCount = results.filter(
      (result) => result.passed
    ).length;

    const failedResults = results.filter(
      (result) => !result.passed
    );

    const failedCount = failedResults.length;

    const score =
      results.length > 0
        ? Math.round(
            (passedCount / results.length) * 100
          )
        : 0;

    const severityCounts = {
      high: failedResults.filter(
        (result) => result.severity === "HIGH"
      ).length,
      medium: failedResults.filter(
        (result) => result.severity === "MEDIUM"
      ).length,
      low: failedResults.filter(
        (result) => result.severity === "LOW"
      ).length,
    };

    const scoreReliable =
      completeness.complete &&
      !(
        !isImportMode &&
        counts.tags === 0 &&
        counts.triggers === 0 &&
        counts.variables === 0
      );

    const scoreLabel = scoreReliable
      ? "Final score"
      : "Provisional score";

    const healthReport = {
      score,
      scoreReliable,
      scoreLabel,
      passedCount,
      failedCount,
      counts,
      severityCounts,
      dataCompleteness: completeness,
      results,
      warnings,
    };

    console.info("[HealthCheck] Completed", {
      mode: isImportMode ? "import" : "gtm",
      accountId,
      containerId,
      workspaceId,
      ...counts,
      totalRules: rules.length,
      totalResults: results.length,
      passedCount,
      failedCount,
      score,
      scoreReliable,
      dataCompleteness: completeness,
      warnings,
    });

    return NextResponse.json({
      success: true,
      mode: isImportMode ? "import" : "gtm",
      healthReport,
      score,
      scoreReliable,
      scoreLabel,
      passedCount,
      failedCount,
      counts,
      severityCounts,
      dataCompleteness: completeness,
      warnings,
      results,
    });
  } catch (error) {
    console.error("[HealthCheck API Error]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown HealthCheck API error.";

    return NextResponse.json(
      {
        success: false,
        error: message,
        details:
          "HealthCheck failed while loading GTM resources or executing health-check rules.",
      },
      { status: 500 }
    );
  }
}
