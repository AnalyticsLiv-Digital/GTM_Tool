import type {
  DetectedSelector,
  EventSchemaRow,
} from "@/lib/event-automation/types";

// =====================================================
// SELECTOR DETECTION
// =====================================================

export function detectSelector(
  selector: string
): DetectedSelector | null {

  const value =
    selector.trim();

  if (!value) {
    return null;
  }

  // ===================================================
  // ID
  // ===================================================

  if (
    value.startsWith("#") &&
    value.length > 1
  ) {
    return {
      type: "id",

      value:
        value.substring(1).trim(),

      selector: value,

      confidence: 1,
    };
  }

  // ===================================================
  // CLASS
  // ===================================================

  if (
    value.startsWith(".") &&
    value.length > 1
  ) {
    return {
      type: "class",

      value:
        value.substring(1).trim(),

      selector: value,

      confidence: 1,
    };
  }

  return null;
}

// =====================================================
// DETECT SELECTORS FOR EVENTS
// =====================================================

export function detectSelectors(
  rows: EventSchemaRow[]
): DetectedSelector[] {

  const selectors: DetectedSelector[] = [];

  const existing =
    new Set<string>();

  for (const row of rows) {

    const rawSelector =
      typeof row.selector === "string"
        ? row.selector.trim()
        : "";

    if (!rawSelector) {
      continue;
    }

    const detected =
      detectSelector(rawSelector);

    if (!detected) {
      continue;
    }

    const key =
      `${detected.type}:${detected.value}`;

    if (existing.has(key)) {
      continue;
    }

    existing.add(key);

    selectors.push({
      ...detected,

      source:
        row.eventName,
    });
  }

  return selectors;
}