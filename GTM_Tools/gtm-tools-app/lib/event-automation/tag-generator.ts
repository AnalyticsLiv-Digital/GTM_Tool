import type {
  EventSchemaRow,
  GeneratedGA4Tag,
} from "@/lib/event-automation/types";

import {
  createTagName,
  createTriggerName,
  normalizeEventName,
} from "./helpers";

// =====================================================
// GENERATE GA4 TAGS
// =====================================================

export function generateTags(
  rows: EventSchemaRow[]
): GeneratedGA4Tag[] {
  const tags: GeneratedGA4Tag[] = [];

  for (const row of rows) {
    const eventName = normalizeEventName(row.eventName);

    if (!eventName) {
      continue;
    }

    const tagName = row.tagName?.trim() || createTagName(eventName);

    const triggerName =
      row.triggerName?.trim() || createTriggerName(eventName);

    tags.push({
      name: tagName,

      // GTM API type for GA4 Event
      type: "gaawe",

      parameter: [
        {
          key: "eventName",
          type: "template",
          value: eventName,
        },
        {
          key: "measurementId",
          type: "template",
          value: "{{GA4 Measurement ID}}",
        },
      ],

      firingTriggerName: triggerName,

      sourceEvent: eventName,

      // top-level convenience field defined on GeneratedGA4Tag,
      // separate from the "measurementId" entry inside `parameter`
      measurementId: "{{GA4 Measurement ID}}",
    });
  }

  return tags;
}