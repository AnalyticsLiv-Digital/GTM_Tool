import { getValidGoogleAccessToken } from "@/lib/googleAuth";
import { NextResponse } from "next/server";

// =====================================================
// TYPES
// =====================================================

interface EventParameter { name: string; value?: string; }

type SelectorType = | "id" | "class" | "auto";

interface EventSchemaRow {
  eventName: string;
  eventCategory?: string;
  eventAction?: string;
  selector?: string;
  selectorType?: SelectorType;
  element?: string;
  tagName?: string;
  triggerName?: string;
  tagNameOverride?: string;
  eventParameters?: EventParameter[];
  parameters?: EventParameter[];
  measurementIdVariable?: string;

  // ===================================================
  // WEBSITE INSPECTION DATA
  // ===================================================

  interactionExpression?: string;
  querySelectorExpression?: string;
  closestTag?: string;
  selectorSource?: string;
  websiteDerived?: boolean;
  inspected?: boolean;
  [key: string]: unknown;
}

interface RequestBody {
  accountId: string;
  containerId: string;
  workspaceId: string;
  events: EventSchemaRow[];
  measurementIdVariable?: string;
  measurementId?: string;
}

interface EventResult {
  eventName: string;
  selector?: string;
  selectorType?: string;
  interactionExpression?: string;
  querySelectorExpression?: string;
  closestTag?: string;
  selectorSource?: string;
  triggerId?: string;
  triggerName?: string;
  tagId?: string;
  tagName?: string;
  status: | "success" | "failed";
  error?: string;
}

// =====================================================
// ERROR RESPONSE
// =====================================================

function jsonError(
  message: string,
  status = 500
) {
  return NextResponse.json({ success: false, error: message, }, { status, });
}

// =====================================================
// STRING HELPERS
// =====================================================

function cleanName(value: string): string { return value.trim().replace(/\s+/g, " "); }

// =====================================================
// GTM REQUEST
// =====================================================

async function gtmRequest(
  token: string,
  path: string,
  method: string,
  body?: unknown
) {
  const response = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", },
      ...(body !== undefined ? { body: JSON.stringify(body), } : {}),
      cache: "no-store",
    }
  );

  const text = await response.text();

  let data: unknown = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, };
  }

  if (!response.ok) {
    throw new Error(typeof data === "object" && data !== null && "error" in data ? JSON.stringify((data as { error: unknown; }).error) : `GTM API returned ${response.status}`);
  }

  return data;
}

// =====================================================
// EXISTING TAGS
// =====================================================

async function getExistingTags(
  token: string,
  workspacePath: string
): Promise<Map<string, string>> {
  const result = (await gtmRequest(token, `${workspacePath}/tags`, "GET")) as { tag?: Array<{ tagId?: string; name?: string; }>; };

  const map = new Map<string, string>();

  for (const tag of result.tag ?? []
  ) {
    if (tag.name && tag.tagId) {
      map.set(tag.name, tag.tagId);
    }
  }

  return map;
}

// =====================================================
// EXISTING TRIGGERS
// =====================================================

async function getExistingTriggers(token: string, workspacePath: string): Promise<Map<string, string>> {
  const result = (await gtmRequest(token, `${workspacePath}/triggers`, "GET")) as { trigger?: Array<{ triggerId?: string; name?: string; }>; };

  const map = new Map<string, string>();

  for (const trigger of result.trigger ?? []
  ) {
    if (trigger.name && trigger.triggerId
    ) {
      map.set(trigger.name, trigger.triggerId);
    }
  }

  return map;
}

// =====================================================
// GET WEBSITE SELECTOR
// =====================================================
//
// IMPORTANT:
//
// This selector MUST come from website inspection.
//
// We do NOT generate a selector from eventName.
//
// We do NOT generate:
//
// {{Event Name}} equals logo_click
//
// We use:
//
// {{Click Element}} matches CSS selector
//
// =====================================================

function getWebsiteSelector(event: EventSchemaRow): string {
  const selector = typeof event.selector === "string" ? event.selector.trim() : "";
  if (selector) { return selector; }
  return "";
}

// =====================================================
// VALIDATE WEBSITE SELECTOR
// =====================================================

function validateWebsiteSelector(event: EventSchemaRow): void {
  const selector = getWebsiteSelector(event);

  if (!selector) {
    throw new Error(`Website selector is missing for "${event.eventName}". Inspect the website again before creating GTM automation.`);
  }
}

// =====================================================
// CREATE CUSTOM EVENT TRIGGER
// =====================================================
//
// FINAL GTM STRUCTURE:
//
// Trigger Type:
//   Custom Event
//
// Event name:
//   custom
//
// Fire on:
//   Some Custom Events
//
// Condition:
//
// {{Click Element}}
// matches CSS selector
// <website-derived selector>
//
// IMPORTANT:
//
// There is NO:
//
// {{Event Name}} equals logo_click
//
// There is NO:
//
// eventName condition
//
// There is NO:
//
// Custom HTML DataLayer tag.
//
// =====================================================

async function createCustomEventTrigger(
  token: string,
  workspacePath: string,
  event: EventSchemaRow,
  existingTriggers: Map<string, string>
): Promise<{
  id: string;
  name: string;
}> {
  validateWebsiteSelector(event);

  const eventName = cleanName(event.eventName);

  const selector = getWebsiteSelector(event);

  const triggerName = event.triggerName?.trim() || `GA4 - ${eventName} - Trigger`;

  const existing = existingTriggers.get(triggerName);

  if (existing) {
    return { id: existing, name: triggerName, };
  }

  // ===================================================
  // CUSTOM EVENT
  // ===================================================
  //
  // {{_event}} equals custom
  //
  // This makes the GTM trigger listen to the
  // website's existing custom Data Layer event.
  //
  // We are NOT creating the Data Layer push here.
  //
  // ===================================================

  const customEventFilter = [
    {
      type: "equals",
      parameter: [
        { type: "template", key: "arg0", value: "{{_event}}", },
        { type: "template", key: "arg1", value: "custom", },
      ],
    },
  ];

  // ===================================================
  // CLICK ELEMENT CSS SELECTOR
  // ===================================================
  //
  // {{Click Element}}
  // matches CSS selector
  // <selector>
  //
  // ===================================================

  const selectorFilter = {
    type: "cssSelector",

    parameter: [
      { type: "template", key: "arg0", value: "{{Click Element}}", },
      { type: "template", key: "arg1", value: selector, },
    ],
  };

  const trigger = (await gtmRequest(token, `${workspacePath}/triggers`, "POST",
    {
      name: triggerName,
      type: "customEvent",
      customEventFilter,
      filter: [selectorFilter,],
    }
  )) as { triggerId?: string; };

  if (!trigger.triggerId) {
    throw new Error(`GTM did not return triggerId for ${triggerName}.`);
  }

  existingTriggers.set(triggerName, trigger.triggerId);

  return { id: trigger.triggerId, name: triggerName, };
}

// =====================================================
// CREATE GA4 EVENT TAG
// =====================================================

async function createGA4Tag(
  token: string,
  workspacePath: string,
  event: EventSchemaRow,
  triggerId: string,
  measurementId: string,
  existingTags: Map<string, string>
) {
  const eventName = cleanName(event.eventName);

  const tagName = event.tagName?.trim() || `GA4 - ${eventName} - Event`;

  const existing = existingTags.get(tagName);

  if (existing) {
    return { id: existing, name: tagName, };
  }

  // ===================================================
  // VALIDATE MEASUREMENT ID
  // ===================================================

  const resolvedMeasurementId = measurementId.trim();

  if (!resolvedMeasurementId) {
    throw new Error(`GA4 Measurement ID is missing for "${eventName}".`);
  }

  // ===================================================
  // EVENT PARAMETERS
  // ===================================================

  const parameters = event.eventParameters ?? event.parameters ?? [];

  const eventParameterList = parameters.filter((parameter) => parameter.name?.trim()).map((parameter) => ({
    type: "map",
    map: [
      {
        type: "template",
        key: "name",
        value: parameter.name,
      },

      {
        type: "template",
        key: "value",
        value: parameter.value ?? "",
      },
    ],
  })
  );

  // ===================================================
  // GA4 TAG
  // ===================================================

  const tag = (await gtmRequest(token, `${workspacePath}/tags`, "POST",
    {
      name: tagName,
      type: "gaawe",
      parameter: [
        {
          type: "template",
          key: "eventName",
          value: event.eventName,
        },

        // IMPORTANT:
        //
        // GTM GA4 Event vendor template expects
        // measurementIdOverride.
        //

        {
          type: "template",
          key: "measurementIdOverride",
          value: resolvedMeasurementId,
        },

        ...(eventParameterList.length
          ? [
            {
              type: "list",
              key: "eventSettingsTable",
              list: eventParameterList,
            },
          ] : []),
      ],

      firingTriggerId: [triggerId,],
    }
  )) as { tagId?: string; };

  if (!tag.tagId) {
    throw new Error(`GTM did not return tagId for ${tagName}.`);
  }

  return { id: tag.tagId, name: tagName, };
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    const body = (await request.json()) as RequestBody;

    const { accountId, containerId, workspaceId, events, } = body;

    // =================================================
    // VALIDATION
    // =================================================

    if (!accountId || !containerId || !workspaceId
    ) {
      return jsonError("Account, container and workspace are required.", 400);
    }

    if (!Array.isArray(events) || events.length === 0
    ) {
      return jsonError("Select at least one event.", 400);
    }

    // =================================================
    // VALIDATE ALL WEBSITE SELECTORS FIRST
    // =================================================

    for (const event of events) {
      validateWebsiteSelector(event);
    }

    // =================================================
    // MEASUREMENT ID
    // =================================================

    const measurementId = (body.measurementId?.trim() || body.measurementIdVariable?.trim() || "").trim();

    if (!measurementId) {
      return jsonError("GA4 Measurement ID is required.", 400);
    }

    // =================================================
    // GOOGLE ACCESS TOKEN
    // =================================================

    const token = await getValidGoogleAccessToken();

    if (!token) {
      return jsonError("Google access token is not available. Please connect GTM again.", 401);
    }

    // =================================================
    // WORKSPACE
    // =================================================

    const workspacePath = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

    // =================================================
    // EXISTING GTM OBJECTS
    // =================================================

    const existingTags = await getExistingTags(token, workspacePath);
    const existingTriggers = await getExistingTriggers(token, workspacePath);

    // =================================================
    // RESULTS
    // =================================================

    const results: EventResult[] = [];

    // =================================================
    // PROCESS EVENTS
    // =================================================

    for (const event of events) {
      const result: EventResult = {
        eventName: event.eventName,
        selector: event.selector,
        selectorType: event.selectorType,
        interactionExpression: event.interactionExpression,
        querySelectorExpression: event.querySelectorExpression,
        closestTag: event.closestTag,
        selectorSource: event.selectorSource,
        status: "success",
      };

      try {
        // =============================================
        // 1. VALIDATE WEBSITE SELECTOR
        // =============================================

        validateWebsiteSelector(event);

        // =============================================
        // 2. CREATE TRIGGER
        // =============================================

        const trigger = await createCustomEventTrigger(token, workspacePath, event, existingTriggers);
        result.triggerId = trigger.id;
        result.triggerName = trigger.name;

        // =============================================
        // 3. CREATE GA4 EVENT TAG
        // =============================================

        const tag = await createGA4Tag(token, workspacePath, event, trigger.id, measurementId, existingTags);
        result.tagId = tag.id;
        result.tagName = tag.name;
      } catch (error) {
        result.status = "failed";
        result.error = error instanceof Error ? error.message : "Failed to create event.";
      }
      results.push(result);
    }

    // =================================================
    // COUNTS
    // =================================================

    const createdTriggers = results.filter((result) => Boolean(result.triggerId)).length;
    const createdTags = results.filter((result) => Boolean(result.tagId)).length;
    const failed = results.filter((result) => result.status === "failed");

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: failed.length === 0,
      message: failed.length === 0 ? "GA4 automation created successfully." : `Automation completed with ${failed.length} failed event(s).`,
      created: {
        events: events.length,
        variables: 0,
        interactionTags: 0,
        triggers: createdTriggers,
        tags: createdTags,
      },
      results,
    });
  } catch (error) {
    console.error("[Create GA4 Automation]", error);
    return jsonError(error instanceof Error ? error.message : "Failed to create GA4 automation.", 500);
  }
}