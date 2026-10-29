import type {
  EventSchemaRow,
} from "@/lib/event-automation/types";

import { generateAutomation } from "./schema-engine";

type GeneratedAutomation = ReturnType<typeof generateAutomation>;

// =====================================================
// BUILD AUTOMATION
// =====================================================

export function buildAutomation(
  rows: EventSchemaRow[]
): GeneratedAutomation {
  if (!rows.length) {
    return {
      variables: [],
      triggers: [],
      tags: [],
      events: [],
      commonEvents: [],
      uniqueEvents: [],
      ga4Events: [],
      dataLayerEvents: [],
    };
  }

  const automation = generateAutomation(rows);

  return automation;
}

// =====================================================
// VALIDATE
// =====================================================

export function validateAutomation(
  automation: GeneratedAutomation
): string[] {
  const errors: string[] = [];

  if (!automation.events.length) {
    errors.push("No valid events found.");
  }

  if (
    !automation.commonEvents?.length &&
    !automation.uniqueEvents?.length
  ) {
    errors.push("No Common or Unique Events found.");
  }

  return errors;
}