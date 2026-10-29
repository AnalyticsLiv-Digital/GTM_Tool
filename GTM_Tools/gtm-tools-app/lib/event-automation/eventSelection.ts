import type {
    EventSchemaRow,
} from "./types";

// =====================================================
// CREATE EVENT KEY
// =====================================================

export function createEventKey(
    event: EventSchemaRow
): string {
    return [
        event.eventName,
        event.eventCategory,
        event.eventAction,
        event.pageUrl ?? "",
    ]
        .map((value) =>
            String(value ?? "")
                .trim()
                .toLowerCase()
        )
        .join("|");
}

// =====================================================
// SPLIT EVENTS
// =====================================================

export function splitEventsBySelection(
    events: EventSchemaRow[],
    selectedEvents: Set<string>
): {
    ga4Events: EventSchemaRow[];
    dataLayerEvents: EventSchemaRow[];
} {
    const ga4Events: EventSchemaRow[] = [];

    const dataLayerEvents: EventSchemaRow[] = [];

    for (const event of events) {
        const key =
            createEventKey(event);

        if (
            selectedEvents.has(key)
        ) {
            ga4Events.push(event);
        } else {
            dataLayerEvents.push(event);
        }
    }

    return {
        ga4Events,
        dataLayerEvents,
    };
}