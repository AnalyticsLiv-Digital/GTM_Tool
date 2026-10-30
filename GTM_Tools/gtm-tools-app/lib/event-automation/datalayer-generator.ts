import type { EventSchemaRow, } from "@/lib/event-automation/types";

import { normalizeEventName, } from "./helpers";

// =====================================================
// ESCAPE JAVASCRIPT
// =====================================================

function escapeJS(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}


// =====================================================
// GENERATE SINGLE DATALAYER
// =====================================================

export function generateDataLayerCode(row: EventSchemaRow): string {
  const eventName = normalizeEventName(row.eventName);
  const eventCategory = String(row.eventCategory ?? "").trim();
  const eventAction = String(row.eventAction ?? "").trim();

  return `dataLayer.push({
  event: "custom",
  eventName: "${escapeJS(eventName)}",
  eventCategory: "${escapeJS(eventCategory)}",
  eventAction: "${escapeJS(eventAction)}"
});`;
}


// =====================================================
// GENERATE DATALAYER EVENT
// =====================================================

export function generateDataLayerEvent(row: EventSchemaRow) {
  const eventName = normalizeEventName(row.eventName);

  const eventCategory = String(row.eventCategory ?? "").trim();

  const eventAction = String(row.eventAction ?? "").trim();

  return {
    event: "custom",
    eventName,
    eventCategory,
    eventAction,
    parameters: row.parameters
      ? Object.fromEntries(
        Object.entries(row.parameters).map(
          ([name, value]) => [name, value ?? ""]
        )
      )
      : undefined,

    code: generateDataLayerCode(row
    ),
  };
}


// =====================================================
// GENERATE ALL
// =====================================================

export function generateDataLayerEvents(
  rows: EventSchemaRow[]
): ReturnType<typeof generateDataLayerEvent>[] {
  return rows.map(generateDataLayerEvent);
}


// =====================================================
// GENERATE HTML SCRIPT
// =====================================================

export function generateEventScript(
  rows: EventSchemaRow[]
): string {
  const eventBlocks = rows.map((row) => {
    const selector = row.selector;

    if (!selector) {
      return "";
    }

    return `
  if (e.target.closest(${JSON.stringify(selector)})) {
    ${generateDataLayerCode(row).replace(/\n/g, "\n    ")}
  }`;
  }).filter(Boolean).join("\n");

  return `<script>
document.addEventListener("click", function(e) {
${eventBlocks}
});
</script>`;
}