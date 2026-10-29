import type {
  EventSchemaRow,
  GeneratedAutomation,
} from "@/lib/event-automation/types";

import {
  generateTriggers,
} from "./trigger-generator";

import {
  generateTags,
} from "./tag-generator";

import {
  normalizeEventName,
} from "./helpers";
import { generateVariables } from "./variable-generator";

// =====================================================
// EVENT KEY
// =====================================================

function createEventKey(
  event: EventSchemaRow
): string {
  return [
    event.eventName ?? "",
    event.eventCategory ?? "",
    event.eventAction ?? "",
    event.pageUrl ?? "",
  ]
    .map((value) =>
      String(value).trim().toLowerCase()
    )
    .join("|");
}

// =====================================================
// DEDUPLICATE EVENTS
// =====================================================

function deduplicateEvents(
  rows: EventSchemaRow[]
): EventSchemaRow[] {
  const map =
    new Map<string, EventSchemaRow>();

  for (const row of rows) {
    const eventName =
      normalizeEventName(
        row.eventName ?? ""
      );

    if (!eventName) {
      continue;
    }

    const normalizedRow: EventSchemaRow = {
      ...row,
      eventName,
    };

    const key =
      createEventKey(
        normalizedRow
      );

    if (!map.has(key)) {
      map.set(
        key,
        normalizedRow
      );
    }
  }

  return Array.from(
    map.values()
  );
}

// =====================================================
// GET SELECTED GA4 EVENTS
// =====================================================

function getSelectedGA4Events(
  events: EventSchemaRow[],
  selectedEventKeys: string[]
): EventSchemaRow[] {
  if (
    !Array.isArray(
      selectedEventKeys
    ) ||
    selectedEventKeys.length === 0
  ) {
    return [];
  }

  const selected =
    new Set(
      selectedEventKeys
    );

  return events.filter(
    (event) =>
      selected.has(
        createEventKey(event)
      )
  );
}

// =====================================================
// GENERATE AUTOMATION
// =====================================================

export function generateAutomation(
  rows: EventSchemaRow[],
  selectedEventKeys: string[] = []
): GeneratedAutomation {
  // ===================================================
  // COMMON EVENTS
  // ===================================================

  const commonEvents =
    deduplicateEvents(
      rows.filter(
        (row) =>
          row.source === "common" ||
          row.sourceSheet ===
            "Common Event"
      )
    );

  // ===================================================
  // UNIQUE EVENTS
  // ===================================================

  const uniqueEvents =
    deduplicateEvents(
      rows.filter(
        (row) =>
          row.source === "unique" ||
          row.sourceSheet ===
            "Unique event"
      )
    );

  // ===================================================
  // ALL EVENTS
  // ===================================================

  const allEvents =
    deduplicateEvents([
      ...commonEvents,
      ...uniqueEvents,
    ]);

  // ===================================================
  // SELECTED GA4 EVENTS ONLY
  // ===================================================
  //
  // IMPORTANT:
  //
  // If the user has not selected any checkbox,
  // ga4Events will be EMPTY.
  //
  // This prevents the application from
  // automatically treating uploaded events
  // as GA4 events.
  // ===================================================

  const ga4Events =
    getSelectedGA4Events(
      allEvents,
      selectedEventKeys
    );

  // ===================================================
  // DATALAYER EVENTS
  // ===================================================
  //
  // DataLayer generation is intentionally disabled
  // for now.
  //
  // The property is still returned because
  // GeneratedAutomation requires it.
  // ===================================================

  const dataLayerEvents:
    EventSchemaRow[] = [];

  // ===================================================
  // GA4 VARIABLES
  // ===================================================

  const variables =
    generateVariables(
      ga4Events
    );

  // ===================================================
  // GA4 TRIGGERS
  // ===================================================

  const triggers =
    generateTriggers(
      ga4Events
    );

  // ===================================================
  // GA4 TAGS
  // ===================================================

  const tags =
    generateTags(
      ga4Events
    );

  // ===================================================
  // FINAL AUTOMATION
  // ===================================================

  return {
    ga4Events,

    dataLayerEvents,

    variables,

    triggers,

    tags,

    events: allEvents,

    commonEvents,

    uniqueEvents,
  };
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default generateAutomation;