import type {
  EventSchemaRow,
  GeneratedGA4Trigger,
} from "@/lib/event-automation/types";

import {
  createTriggerName,
  normalizeEventName,
} from "./helpers";

// =====================================================
// GENERATE TRIGGERS
// =====================================================

export function generateTriggers(
  rows: EventSchemaRow[]
): GeneratedGA4Trigger[] {
  const triggers: GeneratedGA4Trigger[] = [];

  const existing = new Set<string>();

  for (const row of rows) {
    const eventName = normalizeEventName(row.eventName);

    if (!eventName) {
      continue;
    }

    const name =
      (typeof row.triggerName === "string" && row.triggerName.trim()) ||
      createTriggerName(eventName);

    if (existing.has(name)) {
      continue;
    }

    existing.add(name);

    triggers.push({
      name,
      type: "customEvent",
      customEventName: eventName,
      parameter: [
        {
          key: "eventName",
          type: "template",
          value: eventName,
        },
      ],
      sourceEvent: eventName,
    });
  }

  return triggers;
}