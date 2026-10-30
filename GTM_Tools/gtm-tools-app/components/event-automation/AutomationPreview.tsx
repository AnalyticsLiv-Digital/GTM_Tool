/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import type { EventSchemaRow } from "@/lib/event-automation/types";

import type {
  generateGA4Automation,
} from "@/lib/event-automation/ga4Generator";

// =====================================================
// TYPES
// =====================================================

type GA4Automation =
  ReturnType<
    typeof generateGA4Automation
  >;

interface AutomationPreviewProps {
  automation:
  | GA4Automation
  | null;

  events:
  EventSchemaRow[];

  ga4Events:
  EventSchemaRow[];

  dataLayerEvents:
  EventSchemaRow[];
}

// =====================================================
// SAFE VALUE RENDERER
// =====================================================

function renderValue(
  value: unknown
): string {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        renderValue(item)
      )
      .filter(Boolean)
      .join(", ");
  }

  if (
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    /*
     * GTM parameter object:
     *
     * {
     *   key: "...",
     *   type: "...",
     *   value: "..."
     * }
     */

    if (
      "key" in object ||
      "type" in object ||
      "value" in object
    ) {

      const key =
        renderValue(
          object.key
        );

      const type =
        renderValue(
          object.type
        );

      const objectValue =
        renderValue(
          object.value
        );

      if (
        key &&
        objectValue
      ) {
        return `${key}: ${objectValue}`;
      }

      if (
        objectValue
      ) {
        return objectValue;
      }

      if (
        key &&
        type
      ) {
        return `${key} (${type})`;
      }

      return (
        key ||
        type ||
        ""
      );
    }

    /*
     * Generic object fallback.
     */

    try {
      return JSON.stringify(
        value
      );
    } catch {
      return "";
    }
  }

  return String(value);
}

// =====================================================
// COMPONENT
// =====================================================

export default function AutomationPreview({
  automation,
  events,
  ga4Events,
  dataLayerEvents,
}: AutomationPreviewProps) {

  // ===================================================
  // SAFE EVENT ARRAYS
  // ===================================================

  const safeEvents =
    Array.isArray(events)
      ? events
      : [];

  const safeGA4Events =
    Array.isArray(ga4Events)
      ? ga4Events
      : [];

  const safeDataLayerEvents =
    Array.isArray(dataLayerEvents)
      ? dataLayerEvents
      : [];

  // ===================================================
  // COUNTS
  // ===================================================

  const totalEvents =
    safeEvents.length;

  const totalGA4Events =
    safeGA4Events.length;

  const totalDataLayerEvents =
    safeDataLayerEvents.length;

  // ===================================================
  // GENERATED VARIABLES
  // ===================================================

  const generatedVariables =
    automation &&
      Array.isArray(
        (automation as any).variables
      )
      ? (automation as any).variables
      : [];

  // ===================================================
  // GENERATED TRIGGERS
  // ===================================================

  const generatedTriggers =
    automation &&
      Array.isArray(
        (automation as any).triggers
      )
      ? (automation as any).triggers
      : [];

  // ===================================================
  // GENERATED TAGS
  // ===================================================

  const generatedTags =
    automation &&
      Array.isArray(
        (automation as any).tags
      )
      ? (automation as any).tags
      : [];

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          DESCRIPTION
          ================================================= */}

      <div>

        <h3 className="text-base font-semibold text-fg">
          Automation Preview
        </h3>

        <p className="mt-1 text-sm text-muted">
          Review the events selected for GA4 and the
          remaining events before creating the GTM
          configuration.
        </p>

      </div>

      {/* =================================================
          COUNTS
          ================================================= */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

        <PreviewCount
          label="Total Events"
          value={totalEvents}
        />

        <PreviewCount
          label="GA4 Events"
          value={totalGA4Events}
        />

        <PreviewCount
          label="DataLayer Events"
          value={totalDataLayerEvents}
        />

        <PreviewCount
          label="Variables"
          value={
            generatedVariables.length
          }
        />

        <PreviewCount
          label="Triggers"
          value={
            generatedTriggers.length
          }
        />

      </div>

      {/* =================================================
          GA4 EVENTS
          ================================================= */}

      <PreviewSection
        title="GA4 Events"
        description="These events will generate GA4 tags, triggers and variables."
        count={totalGA4Events}
      >

        {safeGA4Events.length === 0 ? (

          <EmptyState>
            No events selected for GA4.
          </EmptyState>

        ) : (

          <div className="space-y-2">

            {safeGA4Events.map(
              (
                event,
                index
              ) => (

                <EventPreviewRow
                  key={
                    `${renderValue(event.eventName)}-${index}`
                  }
                  event={event}
                />

              )
            )}

          </div>

        )}

      </PreviewSection>

      {/* =================================================
          DATALAYER EVENTS
          ================================================= */}

      <PreviewSection
        title="DataLayer Events"
        description="These events are not selected for GA4 and will remain available for DataLayer implementation."
        count={totalDataLayerEvents}
      >

        {safeDataLayerEvents.length === 0 ? (

          <EmptyState>
            No remaining events.
          </EmptyState>

        ) : (

          <div className="space-y-2">

            {safeDataLayerEvents.map(
              (
                event,
                index
              ) => (

                <EventPreviewRow
                  key={
                    `${renderValue(event.eventName)}-datalayer-${index}`
                  }
                  event={event}
                />

              )
            )}

          </div>

        )}

      </PreviewSection>

      {/* =================================================
          GENERATED VARIABLES
          ================================================= */}

      <PreviewSection
        title="Generated Variables"
        description="Variables that will be created in Google Tag Manager."
        count={
          generatedVariables.length
        }
      >

        {generatedVariables.length === 0 ? (

          <EmptyState>
            No variables will be created yet.
            Select at least one GA4 event.
          </EmptyState>

        ) : (

          <div className="space-y-2">

            {generatedVariables.map(
              (
                variable: any,
                index: number
              ) => {

                const variableName =
                  renderValue(
                    variable?.name
                  ) ||
                  "Unnamed Variable";

                const variableType =
                  renderValue(
                    variable?.type
                  );

                const variableParameter =
                  renderValue(
                    variable?.parameter
                  );

                const variableValue =
                  renderValue(
                    variable?.value
                  );

                return (
                  <div
                    key={
                      variable?.variableId ||
                      variableName ||
                      index
                    }
                    className="rounded-lg border border-line bg-card-hi p-3"
                  >

                    {/* VARIABLE NAME */}

                    <p className="text-sm font-medium text-fg">
                      {variableName}
                    </p>

                    {/* VARIABLE TYPE */}

                    {variableType && (
                      <p className="mt-1 text-xs text-muted">
                        Type:{" "}
                        {variableType}
                      </p>
                    )}

                    {/* PARAMETER */}

                    {variableParameter && (
                      <p className="mt-1 break-all text-xs text-muted">
                        Parameter:{" "}
                        <span className="font-mono">
                          {variableParameter}
                        </span>
                      </p>
                    )}

                    {/* VALUE */}

                    {variableValue && (
                      <p className="mt-1 break-all text-xs text-muted">
                        Value:{" "}
                        <span className="font-mono">
                          {variableValue}
                        </span>
                      </p>
                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </PreviewSection>

      {/* =================================================
          GENERATED TRIGGERS
          ================================================= */}

      <PreviewSection
        title="Generated Triggers"
        description="Triggers that will be created in Google Tag Manager."
        count={
          generatedTriggers.length
        }
      >

        {generatedTriggers.length === 0 ? (

          <EmptyState>
            No triggers will be created yet.
            Select at least one GA4 event.
          </EmptyState>

        ) : (

          <div className="space-y-2">

            {generatedTriggers.map(
              (
                trigger: any,
                index: number
              ) => {

                const triggerName =
                  renderValue(
                    trigger?.name
                  ) ||
                  "Unnamed Trigger";

                const triggerType =
                  renderValue(
                    trigger?.type
                  );

                return (
                  <div
                    key={
                      trigger?.triggerId ||
                      triggerName ||
                      index
                    }
                    className="rounded-lg border border-line bg-card-hi p-3"
                  >

                    <p className="text-sm font-medium text-fg">
                      {triggerName}
                    </p>

                    {triggerType && (
                      <p className="mt-1 text-xs text-muted">
                        Type:{" "}
                        {triggerType}
                      </p>
                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </PreviewSection>

      {/* =================================================
          GENERATED TAGS
          ================================================= */}

      <PreviewSection
        title="Generated Tags"
        description="GA4 tags that will be created in Google Tag Manager."
        count={
          generatedTags.length
        }
      >

        {generatedTags.length === 0 ? (

          <EmptyState>
            No GA4 tags will be created yet.
            Select at least one GA4 event.
          </EmptyState>

        ) : (

          <div className="space-y-2">

            {generatedTags.map(
              (
                tag: any,
                index: number
              ) => {

                const tagName =
                  renderValue(
                    tag?.name
                  ) ||
                  "Unnamed Tag";

                const tagType =
                  renderValue(
                    tag?.type
                  );

                return (
                  <div
                    key={
                      tag?.tagId ||
                      tagName ||
                      index
                    }
                    className="rounded-lg border border-line bg-card-hi p-3"
                  >

                    <p className="text-sm font-medium text-fg">
                      {tagName}
                    </p>

                    {tagType && (
                      <p className="mt-1 text-xs text-muted">
                        Type:{" "}
                        {tagType}
                      </p>
                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </PreviewSection>

    </div>
  );
}

// =====================================================
// COUNT CARD
// =====================================================

function PreviewCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {

  return (
    <div className="rounded-lg border border-line bg-card-hi p-3">

      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-fg">
        {value}
      </p>

    </div>
  );
}

// =====================================================
// SECTION
// =====================================================

function PreviewSection({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {

  return (
    <div>

      <div className="mb-3 flex items-start justify-between gap-4">

        <div>

          <h4 className="text-sm font-semibold text-fg">
            {title}
          </h4>

          <p className="mt-1 text-xs text-muted">
            {description}
          </p>

        </div>

        <span className="shrink-0 rounded-full border border-line bg-card-hi px-3 py-1 text-xs font-medium text-muted">
          {count}
        </span>

      </div>

      {children}

    </div>
  );
}

// =====================================================
// EVENT ROW
// =====================================================

function EventPreviewRow({
  event,
}: {
  event: EventSchemaRow;
}) {

  const eventName =
    renderValue(
      event.eventName
    ) ||
    "(No event name)";

  const eventCategory =
    renderValue(
      event.eventCategory
    );

  const eventAction =
    renderValue(
      event.eventAction
    );

  const eventSource =
    renderValue(
      event.source
    ) ||
    "event";

  const selector =
    renderValue(
      event.selector
    );

  return (
    <div className="rounded-lg border border-line bg-card-hi p-3">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-sm font-medium text-fg">
            {eventName}
          </p>

          {eventCategory && (
            <p className="mt-1 text-xs text-muted">
              Category:{" "}
              {eventCategory}
            </p>
          )}

          {eventAction && (
            <p className="text-xs text-muted">
              Action:{" "}
              {eventAction}
            </p>
          )}

        </div>

        <span className="shrink-0 rounded-md border border-line bg-card px-2 py-1 text-[10px] text-muted">
          {eventSource}
        </span>

      </div>

      {/* =================================================
          SELECTOR
          ================================================= */}

      {selector && (

        <div className="mt-2 rounded-md border border-line bg-card p-2">

          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Selector
          </p>

          <p className="mt-1 break-all font-mono text-xs text-fg">
            {event.selectorType === "id"
              ? `#${selector}`
              : event.selectorType === "class"
                ? `.${selector}`
                : selector}
          </p>

        </div>

      )}

    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="rounded-lg border border-dashed border-line bg-card-hi p-4">

      <p className="text-xs text-muted">
        {children}
      </p>

    </div>
  );
}