"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  ParsedEventSchema,
  EventSchemaRow,
  GA4MeasurementIdConfig,
  InspectedElement,
  SelectorCandidate,
  SelectorType,
  SelectorSource,
} from "@/lib/event-automation/types";

import EventSchemaUpload from "./EventSchemaUpload";
import WebsiteInput from "./WebsiteInput";
import GTMSelector from "./GTMSelector";
import AutomationPreview from "./AutomationPreview";
import GA4MeasurementId from "./GA4MeasurementId";

import {
  createEventKey,
  splitEventsBySelection,
} from "@/lib/event-automation/eventSelection";

import {
  generateGA4Automation,
} from "@/lib/event-automation/ga4Generator";

// ============================================================
// GTM SELECTION
// ============================================================

interface GTMSelection {
  accountId: string;
  containerId: string;
  workspaceId: string;
}

// ============================================================
// EVENT AUTOMATION MODE
// ============================================================

type EventAutomationMode = | "common" | "unique" | null;

// ============================================================
// API RESPONSE
// ============================================================

interface ApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  websiteUrl?: string;

  elements?: InspectedElement[];

  events?: Array<Record<string, unknown>>;

  inspectedCount?: number;

  count?: number;

  pagesVisited?: string[];

  created?: {
    events?: number;
    variables?: number;
    triggers?: number;
    tags?: number;
  };

  results?: Array<{
    eventName: string;
    selector?: string;
    selectorType?: string;
    variableId?: string;
    variableName?: string;
    triggerId?: string;
    triggerName?: string;
    tagId?: string;
    tagName?: string;
    status?: string;
    error?: string;
  }>;

  [key: string]: unknown;
}

// ============================================================
// CLEAN EVENTS
// ============================================================

function cleanEvents(
  events: EventSchemaRow[]
): EventSchemaRow[] {
  return events.map(
    (event) => ({
      ...event,

      selector: undefined,

      selectorType: undefined,

      selectorSource: undefined,

      interactionExpression: undefined,

      querySelectorExpression: undefined,

      variableName: undefined,

      matchType: undefined,

      matchValue: undefined,

      closestTag: undefined,

      matchCount: undefined,

      selectorUnique: undefined,

      candidates: undefined,
    })
  );
}

// ============================================================
// SELECTOR CANDIDATES
// ============================================================

function isSelectorCandidates(
  value: unknown
): value is SelectorCandidate[] {
  return (
    Array.isArray(value) &&
    value.every((candidate) => candidate !== null && typeof candidate === "object" && typeof (candidate as Record<string, unknown>).selector === "string"
    )
  );
}

// ============================================================
// STEP
// ============================================================

interface StepItem {
  number: number;
  label: string;
  shortLabel: string;
}

// ============================================================
// EVENT AUTOMATION PAGE
// ============================================================

export default function EventAutomationPage() {
  // ==========================================================
  // SCHEMA
  // ==========================================================

  const [parsedSchema, setParsedSchema,] =
    useState<ParsedEventSchema | null>(null);

  // ==========================================================
  // EVENT TYPE
  // ==========================================================

  const [eventAutomationMode, setEventAutomationMode,] =
    useState<EventAutomationMode>(null);

  // ==========================================================
  // SELECTED EVENTS
  // ==========================================================

  const [selectedEvents, setSelectedEvents,] =
    useState<Set<string>>(new Set());

  // ==========================================================
  // GA4 MEASUREMENT ID
  // ==========================================================

  const [ga4MeasurementConfig, setGA4MeasurementConfig,] =
    useState<GA4MeasurementIdConfig>(
      {
        mode: "gtm_variable",

        value: "{{GA4 Measurement ID}}",
      }
    );

  // ==========================================================
  // WEBSITE
  // ==========================================================

  const [websiteUrl, setWebsiteUrl,] = useState("");

  const [inspecting, setInspecting,] = useState(false);

  // ==========================================================
  // INSPECTED ELEMENTS
  // ==========================================================

  const [inspectedElements, setInspectedElements,] = useState<InspectedElement[]>([]);

  // ==========================================================
  // UPLOAD
  // ==========================================================

  const [uploading, setUploading,] = useState(false);

  // ==========================================================
  // CREATE
  // ==========================================================

  const [creating, setCreating,] = useState(false);

  // ==========================================================
  // ERROR
  // ==========================================================

  const [error, setError,] = useState("");

  // ==========================================================
  // SUCCESS
  // ==========================================================

  const [success, setSuccess,] = useState("");

  // ==========================================================
  // GTM
  // ==========================================================

  const [gtmSelection, setGtmSelection,] =
    useState<GTMSelection>({
      accountId: "",
      containerId: "",
      workspaceId: "",
    });

  // ==========================================================
  // STEPS
  // ==========================================================

  const steps: StepItem[] = [
    {
      number: 1,
      label: "Upload Event Schema",
      shortLabel: "Upload",
    },
    {
      number: 2,
      label: "Select Event Type",
      shortLabel: "Select",
    },
    {
      number: 3,
      label: "Select Events",
      shortLabel: "Events",
    },
    {
      number: 4,
      label: "Inspect Website",
      shortLabel: "Inspect",
    },
    {
      number: 5,
      label: "Select GTM Workspace",
      shortLabel: "GTM",
    },
    {
      number: 6,
      label: "Automation Preview",
      shortLabel: "Preview",
    },
    {
      number: 7,
      label: "Create Automation",
      shortLabel: "Create",
    },
  ];

  // ==========================================================
  // CURRENT STEP
  // ==========================================================

  const currentStep =
    useMemo(() => {
      if (!parsedSchema) {
        return 1;
      }

      if (!eventAutomationMode) {
        return 2;
      }

      if (selectedEvents.size === 0) {
        return 3;
      }

      if (inspectedElements.length === 0) {
        return 4;
      }

      if (!gtmSelection.accountId || !gtmSelection.containerId || !gtmSelection.workspaceId) {
        return 5;
      }

      return 6;
    }, [parsedSchema, eventAutomationMode, selectedEvents.size, inspectedElements.length, gtmSelection,]);

  // ==========================================================
  // UPLOAD SCHEMA
  // ==========================================================

  const handleSchemaUpload = (schema: ParsedEventSchema) => {
    try {
      setUploading(true);

      setError("");

      setSuccess("");

      if (!schema || !Array.isArray(schema.events) || schema.events.length === 0
      ) {
        throw new Error("No valid events were found in the uploaded event schema.");
      }

      const events = cleanEvents(schema.events);

      const commonEvents = cleanEvents(Array.isArray(schema.commonEvents) ? schema.commonEvents : []);

      const uniqueEvents = cleanEvents(Array.isArray(schema.uniqueEvents) ? schema.uniqueEvents : []);

      setParsedSchema({
        ...schema,

        events,

        commonEvents,

        uniqueEvents,
      });

      setEventAutomationMode(null);

      setSelectedEvents(new Set());

      setInspectedElements([]);

      setGA4MeasurementConfig({
        mode: "gtm_variable",

        value: "{{GA4 Measurement ID}}",
      });

      setGtmSelection({
        accountId: "",
        containerId: "",
        workspaceId: "",
      });
    } catch (uploadError) {
      console.error("[Event Automation] Upload error:", uploadError);

      setError(uploadError instanceof Error ? uploadError.message : "Failed to process Excel file.");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // AVAILABLE EVENTS
  // ==========================================================

  const availableEvents =
    useMemo(() => {
      if (!parsedSchema || !eventAutomationMode) {
        return [] as EventSchemaRow[];
      }

      if (eventAutomationMode === "common") {
        return (parsedSchema.commonEvents ?? []);
      }

      return (parsedSchema.uniqueEvents ?? []);
    }, [parsedSchema, eventAutomationMode,]);

  // ==========================================================
  // EVENT TYPE CHANGE
  // ==========================================================

  const handleEventTypeChange = (
    value: string
  ) => {
    const nextMode = value === "common" ? "common" : value === "unique" ? "unique" : null;

    setEventAutomationMode(nextMode);

    setSelectedEvents(new Set());

    setInspectedElements([]);

    setSuccess("");

    setError("");
  };

  // ==========================================================
  // EVENT SELECTION
  // ==========================================================

  const handleEventSelection = (event: EventSchemaRow
  ) => {
    const eventKey = createEventKey(event);

    setSelectedEvents((currentSelection) => {
      const next = new Set(currentSelection);

      if (next.has(eventKey)
      ) {
        next.delete(eventKey);
      } else {
        next.add(eventKey);
      }

      return next;
    }
    );

    setSuccess("");

    setError("");
  };

  // ==========================================================
  // SELECT ALL
  // ==========================================================

  const handleSelectAll =
    () => {
      if (!availableEvents.length) {
        return;
      }

      setSelectedEvents(new Set(availableEvents.map((event) => createEventKey(event))));

      setSuccess("");

      setError("");
    };

  // ==========================================================
  // CLEAR ALL
  // ==========================================================

  const handleClearAll = () => {
    setSelectedEvents(new Set());

    setSuccess("");

    setError("");
  };

  // ==========================================================
  // SPLIT EVENTS
  // ==========================================================

  const { ga4Events, dataLayerEvents, } =
    useMemo(() => {
      if (
        !availableEvents.length
      ) {
        return {
          ga4Events:
            [] as EventSchemaRow[],

          dataLayerEvents:
            [] as EventSchemaRow[],
        };
      }

      return splitEventsBySelection(
        availableEvents,
        selectedEvents
      );
    }, [
      availableEvents,
      selectedEvents,
    ]);

  // ==========================================================
  // GA4 AUTOMATION
  // ==========================================================

  const ga4Automation =
    useMemo(() => {
      if (
        ga4Events.length === 0
      ) {
        return null;
      }

      try {
        return generateGA4Automation(
          ga4Events,
          ga4MeasurementConfig
        );
      } catch (
      generationError
      ) {
        console.error(
          "[Event Automation] GA4 generation error:",
          generationError
        );

        return null;
      }
    }, [
      ga4Events,
      ga4MeasurementConfig,
    ]);

  // ==========================================================
  // INSPECT WEBSITE
  // ==========================================================

  const handleWebsiteInspect =
    async () => {
      if (
        !websiteUrl.trim()
      ) {
        setError(
          "Enter website URL first."
        );

        return;
      }

      if (
        !parsedSchema
      ) {
        setError(
          "Upload the event schema first."
        );

        return;
      }

      if (
        !ga4Events.length
      ) {
        setError(
          "Select at least one event first."
        );

        return;
      }

      try {
        setInspecting(
          true
        );

        setError("");

        setSuccess("");

        // ----------------------------------------------------
        // SELECTED EVENT KEYS
        // ----------------------------------------------------

        const selectedEventKeys =
          new Set(
            ga4Events.map(
              (event) =>
                createEventKey(
                  event
                )
            )
          );

        // ----------------------------------------------------
        // EVENTS FOR INSPECTION
        // ----------------------------------------------------

        const eventsForInspection =
          parsedSchema.events
            .map(
              (
                event,
                eventIndex
              ) => ({
                event,
                eventIndex,
              })
            )
            .filter(
              ({
                event,
              }) =>
                selectedEventKeys.has(
                  createEventKey(
                    event
                  )
                )
            )
            .map(
              ({
                event,
                eventIndex,
              }) => ({
                eventIndex,

                eventName:
                  event.eventName,

                eventCategory:
                  event.eventCategory,

                eventAction:
                  event.eventAction,

                eventLabel:
                  event.eventLabel,

                pageUrl:
                  event.pageUrl,

                sectionHeading:
                  event.sectionHeading,

                menuName:
                  event.menuName,

                subMenuName:
                  event.subMenuName,

                subMenuItem:
                  event.subMenuItem,

                buttonText:
                  event.buttonText,

                clickUrl:
                  event.clickUrl,

                scenario:
                  event.scenario,
              })
            );

        // ----------------------------------------------------
        // API
        // ----------------------------------------------------

        const response =
          await fetch(
            "/api/event-automation/inspect",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  websiteUrl:
                    websiteUrl.trim(),

                  events:
                    eventsForInspection,
                }),

              cache:
                "no-store",
            }
          );
        console.log("[Event Automation] Inspection API response:", response);

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        const responseText =
          await response.text();

        if (
          !contentType
            .toLowerCase()
            .includes(
              "application/json"
            )
        ) {
          throw new Error(
            `Inspection API returned ${response.status} instead of JSON.`
          );
        }

        let result:
          ApiResponse;

        try {
          result =
            JSON.parse(
              responseText
            ) as ApiResponse;
        } catch {
          throw new Error(
            "Inspection API returned invalid JSON."
          );
        }

        if (
          !response.ok ||
          result.success ===
          false
        ) {
          throw new Error(
            result.error ||
            "Website inspection failed."
          );
        }

        // ----------------------------------------------------
        // ELEMENTS
        // ----------------------------------------------------

        const elements =
          Array.isArray(
            result.elements
          )
            ? result.elements
            : [];

        setInspectedElements(
          elements
        );

        // ----------------------------------------------------
        // RESOLVED EVENTS
        // ----------------------------------------------------

        const resolvedEvents =
          Array.isArray(
            result.events
          )
            ? result.events
            : [];

        // ----------------------------------------------------
        // MERGE SELECTORS
        // ----------------------------------------------------

        setParsedSchema(
          (
            current
          ) => {
            if (!current) {
              return current;
            }

            const resolvedByIndex =
              new Map<
                number,
                Record<
                  string,
                  unknown
                >
              >();

            for (
              const resolved of resolvedEvents
            ) {
              const idx =
                resolved.eventIndex;

              if (
                typeof idx ===
                "number"
              ) {
                resolvedByIndex.set(
                  idx,
                  resolved
                );
              }
            }

            const updatedEvents:
              EventSchemaRow[] =
              current.events.map(
                (
                  event,
                  eventIndex
                ): EventSchemaRow => {
                  const resolved =
                    resolvedByIndex.get(
                      eventIndex
                    );

                  if (
                    !resolved ||
                    typeof resolved.selector !==
                    "string"
                  ) {
                    return event;
                  }

                  return {
                    ...event,

                    selector:
                      resolved.selector,

                    selectorType:
                      resolved.selectorType as
                      | SelectorType
                      | undefined,

                    selectorSource:
                      resolved.selectorSource as
                      | SelectorSource
                      | undefined,

                    element:
                      resolved.element as
                      | string
                      | undefined,

                    closestTag:
                      resolved.closestTag as
                      | string
                      | undefined,

                    interactionExpression:
                      resolved.interactionExpression as
                      | string
                      | undefined,

                    querySelectorExpression:
                      resolved.querySelectorExpression as
                      | string
                      | undefined,

                    matchCount:
                      resolved.matchCount as
                      | number
                      | undefined,

                    selectorUnique:
                      resolved.selectorUnique as
                      | boolean
                      | undefined,

                    confidence:
                      resolved.confidence as
                      | number
                      | undefined,

                    candidates:
                      isSelectorCandidates(
                        resolved.candidates
                      )
                        ? resolved.candidates
                        : undefined,
                  };
                }
              );

            const findUpdatedEvent =
              (
                event: EventSchemaRow
              ) =>
                updatedEvents.find(
                  (
                    updatedEvent
                  ) =>
                    updatedEvent.eventName ===
                    event.eventName &&
                    updatedEvent.eventCategory ===
                    event.eventCategory &&
                    updatedEvent.eventAction ===
                    event.eventAction &&
                    updatedEvent.pageUrl ===
                    event.pageUrl
                ) ?? event;

            return {
              ...current,

              events:
                updatedEvents,

              commonEvents:
                current.commonEvents?.map(
                  findUpdatedEvent
                ),

              uniqueEvents:
                current.uniqueEvents?.map(
                  findUpdatedEvent
                ),
            };
          }
        );

        // ----------------------------------------------------
        // SUMMARY
        // ----------------------------------------------------

        const uniqueMatches =
          resolvedEvents.filter(
            (
              resolved
            ) =>
              resolved.selectorUnique ===
              true
          ).length;

        const pagesVisited =
          Array.isArray(
            result.pagesVisited
          )
            ? result.pagesVisited.length
            : 1;

        if (
          resolvedEvents.length ===
          0
        ) {
          setError(
            "Website was inspected, but no selected events were resolved. Check the Event Schema values and try again."
          );

          return;
        }

        setSuccess(
          `Website inspected successfully across ${pagesVisited} page${pagesVisited === 1
            ? ""
            : "s"
          }. ${uniqueMatches} of ${resolvedEvents.length
          } selected event${resolvedEvents.length === 1
            ? ""
            : "s"
          } received unique DOM selectors.`
        );
      } catch (
      inspectionError
      ) {
        console.error(
          "[Event Automation] Inspection error:",
          inspectionError
        );

        setError(
          inspectionError instanceof
            Error
            ? inspectionError.message
            : "Website inspection failed."
        );
      } finally {
        setInspecting(
          false
        );
      }
    };

  // ==========================================================
  // CREATE GA4
  // ==========================================================

  const handleCreateGA4 =
    async () => {
      if (
        !eventAutomationMode
      ) {
        setError(
          "Select Common Event or Unique Event first."
        );

        return;
      }

      if (
        ga4Events.length === 0
      ) {
        setError(
          "Select at least one event for GA4."
        );

        return;
      }

      if (
        !gtmSelection.accountId ||
        !gtmSelection.containerId ||
        !gtmSelection.workspaceId
      ) {
        setError(
          "Select Account, Container and Workspace first."
        );

        return;
      }

      if (
        ga4MeasurementConfig.mode ===
        "manual" &&
        !/^G-[A-Z0-9]+$/i.test(
          ga4MeasurementConfig.value.trim()
        )
      ) {
        setError(
          "Enter a valid GA4 Measurement ID, for example G-XXXXXXXXXX."
        );

        return;
      }

      const invalidEvents =
        ga4Events.filter(
          (event) =>
            !event.selector ||
            event.selectorUnique !==
            true
        );

      if (
        invalidEvents.length
      ) {
        setError(
          `Unique selector is missing for: ${invalidEvents
            .map(
              (
                event
              ) =>
                event.eventName
            )
            .join(
              ", "
            )}. Inspect the website again.`
        );

        return;
      }

      const measurementId =
        ga4MeasurementConfig.mode ===
          "gtm_variable"
          ? "{{GA4 Measurement ID}}"
          : ga4MeasurementConfig.value.trim();

      const confirmed =
        window.confirm(
          `Create ${ga4Events.length
          } selected ${eventAutomationMode ===
            "common"
            ? "Common"
            : "Unique"
          } GA4 event${ga4Events.length ===
            1
            ? ""
            : "s"
          } in Google Tag Manager?\n\nMeasurement ID: ${measurementId}`
        );

      if (!confirmed) {
        return;
      }

      try {
        setCreating(
          true
        );

        setError("");

        setSuccess("");

        const response =
          await fetch(
            "/api/event-automation/create-ga4",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  accountId:
                    gtmSelection.accountId,

                  containerId:
                    gtmSelection.containerId,

                  workspaceId:
                    gtmSelection.workspaceId,

                  events:
                    ga4Events,

                  eventType:
                    eventAutomationMode,

                  measurementId,

                  measurementIdVariable:
                    measurementId,
                }),

              cache:
                "no-store",
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        const text =
          await response.text();

        if (
          !contentType
            .toLowerCase()
            .includes(
              "application/json"
            )
        ) {
          throw new Error(
            `Create GA4 API returned ${response.status} instead of JSON.`
          );
        }

        let result:
          ApiResponse;

        try {
          result =
            JSON.parse(
              text
            ) as ApiResponse;
        } catch {
          throw new Error(
            "Create GA4 API returned invalid JSON."
          );
        }

        if (
          !response.ok ||
          result.success ===
          false
        ) {
          throw new Error(
            result.error ||
            "Failed to create GA4 automation."
          );
        }

        const created =
          result.created ??
          {};

        setSuccess(
          `Automation created successfully — ${created.variables ??
          0
          } variable(s), ${created.triggers ??
          0
          } trigger(s), and ${created.tags ??
          0
          } tag(s).`
        );
      } catch (
      createError
      ) {
        console.error(
          "[Event Automation] Create error:",
          createError
        );

        setError(
          createError instanceof
            Error
            ? createError.message
            : "Failed to create GA4 automation."
        );
      } finally {
        setCreating(
          false
        );
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* ====================================================
          STICKY EVENT AUTOMATION HEADER
          ==================================================== */}

      <div className="sticky top-0 z-50 -mx-4 border-b border-line bg-card/95 px-4 pb-3 pt-3 shadow-sm backdrop-blur-md sm:-mx-6 sm:px-6">

        {/* --------------------------------------------------
            HEADER
            -------------------------------------------------- */}

        <div className="mb-3 flex items-center justify-between gap-4">

          <div className="min-w-0">

            <h1 className="truncate text-lg font-bold text-fg sm:text-xl">
              GTM Event Automation
            </h1>

            <p className="mt-0.5 hidden text-xs text-muted sm:block">
              Automate your GA4 events
              from your Event Schema
            </p>

          </div>

          {parsedSchema && (
            <div className="shrink-0 rounded-full border border-line bg-card-hi px-3 py-1.5">

              <span className="text-xs font-medium text-muted">
                {parsedSchema.events.length}{" "}
                Events
              </span>

            </div>
          )}

        </div>

        {/* --------------------------------------------------
            PROGRESS BAR
            -------------------------------------------------- */}

        <div className="overflow-x-auto">

          <div className="flex min-w-175 items-center">

            {steps.map(
              (
                step,
                index
              ) => {

                const completed =
                  step.number <
                  currentStep;

                const active =
                  step.number ===
                  currentStep;

                const enabled =
                  step.number <=
                  currentStep;

                return (
                  <div
                    key={
                      step.number
                    }
                    className="flex flex-1 items-center"
                  >

                    {/* -------------------------------------
                        STEP
                        ------------------------------------- */}

                    <div className="flex min-w-0 items-center gap-2">

                      <div
                        className={`
                          flex h-7 w-7 shrink-0
                          items-center justify-center
                          rounded-full
                          border
                          text-[11px]
                          font-semibold
                          transition-all
                          ${completed
                            ? "border-(--accent) bg-(--accent) text-white"
                            : active
                              ? "border-(--accent) bg-card text-(--accent) ring-2 ring-(--accent)/15"
                              : enabled
                                ? "border-line bg-card-hi text-fg"
                                : "border-line bg-card text-muted"
                          }
                        `}
                      >

                        {completed ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        ) : (
                          step.number
                        )}

                      </div>

                      <div className="hidden min-w-0 lg:block">

                        <p
                          className={`
                            whitespace-nowrap
                            text-[10px]
                            font-medium
                            ${active
                              ? "text-(--accent)"
                              : completed
                                ? "text-fg"
                                : "text-muted"
                            }
                          `}
                        >
                          {step.shortLabel}
                        </p>

                      </div>

                    </div>

                    {/* -------------------------------------
                        CONNECTOR
                        ------------------------------------- */}

                    {index <
                      steps.length -
                      1 && (
                        <div
                          className={`
                          mx-2 h-px flex-1
                          transition-colors
                          ${step.number <
                              currentStep
                              ? "bg-(--accent)"
                              : "bg-line"
                            }
                        `}
                        />
                      )}

                  </div>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* ====================================================
          1. UPLOAD
          ==================================================== */}

      <div
        className="rounded-xl border border-line bg-card p-5"
        id="event-automation-upload"
      >

        <h2 className="text-base font-semibold text-fg">
          1. Upload Event Schema
        </h2>

        <p className="mt-1 text-xs text-muted">
          Upload your event schema in
          Excel format.
        </p>

        <div className="mt-4">

          <EventSchemaUpload
            onSchemaParsed={
              handleSchemaUpload
            }
            loading={
              uploading ||
              creating
            }
          />

        </div>

      </div>

      {/* ====================================================
          2. EVENT TYPE
          ==================================================== */}

      {parsedSchema && (
        <div
          className="rounded-xl border border-line bg-card p-5"
          id="event-automation-type"
        >

          <h2 className="text-base font-semibold text-fg">
            2. Select Event Type
          </h2>

          <p className="mt-1 text-xs text-muted">
            Choose whether you want to
            automate Common Events or
            Unique Events.
          </p>

          <div className="mt-4">

            <select
              value={
                eventAutomationMode ??
                ""
              }
              onChange={(
                event
              ) =>
                handleEventTypeChange(
                  event.target.value
                )
              }
              disabled={
                creating ||
                inspecting
              }
              className="w-full rounded-lg border border-line bg-card px-3 py-3 text-sm text-fg outline-none transition focus:border-(--accent)"
            >

              <option value="">
                Select Event Type
              </option>

              <option value="common">
                Common Event
              </option>

              <option value="unique">
                Unique Event
              </option>

            </select>

          </div>

        </div>
      )}

      {/* ====================================================
          3. MEASUREMENT ID
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode && (
          <GA4MeasurementId
            value={
              ga4MeasurementConfig
            }
            onChange={
              setGA4MeasurementConfig
            }
            disabled={
              creating
            }
          />
        )}

      {/* ====================================================
          4. EVENTS
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode && (
          <div
            className="rounded-xl border border-line bg-card p-5"
            id="event-automation-events"
          >

            <div className="mb-4 flex items-center justify-between gap-4">

              <div>

                <h2 className="text-base font-semibold text-fg">

                  4. Select{" "}

                  {eventAutomationMode ===
                    "common"
                    ? "Common"
                    : "Unique"}{" "}

                  Events

                </h2>

                <p className="mt-1 text-xs text-muted">
                  Select the events that
                  should be inspected.
                </p>

              </div>

              <div className="flex shrink-0 gap-2">

                <button
                  type="button"
                  onClick={
                    handleSelectAll
                  }
                  disabled={
                    creating ||
                    inspecting ||
                    availableEvents.length ===
                    0
                  }
                  className="rounded-lg border border-line px-3 py-2 text-xs transition hover:bg-card-hi disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={
                    handleClearAll
                  }
                  disabled={
                    creating ||
                    inspecting
                  }
                  className="rounded-lg border border-line px-3 py-2 text-xs transition hover:bg-card-hi disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear All
                </button>

              </div>

            </div>

            {availableEvents.length ===
              0 ? (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">

                <p className="text-sm font-medium text-yellow-800">
                  No{" "}
                  {eventAutomationMode ===
                    "common"
                    ? "Common"
                    : "Unique"}{" "}
                  Events found.
                </p>

              </div>
            ) : (
              <div className="space-y-2">

                {availableEvents.map(
                  (
                    event,
                    index
                  ) => {

                    const key =
                      createEventKey(
                        event
                      );

                    const checked =
                      selectedEvents.has(
                        key
                      );

                    return (
                      <label
                        key={`${key}-${index}`}
                        className={`
                          flex cursor-pointer
                          items-start gap-3
                          rounded-lg border p-4
                          transition
                          ${checked
                            ? "border-(--accent) bg-card-hi"
                            : "border-line hover:bg-card-hi/50"
                          }
                        `}
                      >

                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          disabled={
                            creating ||
                            inspecting
                          }
                          onChange={() =>
                            handleEventSelection(
                              event
                            )
                          }
                          className="mt-1 h-4 w-4 accent-(--accent)"
                        />

                        <div className="min-w-0 flex-1">

                          <p className="font-medium text-fg">
                            {
                              event.eventName
                            }
                          </p>

                          <p className="mt-1 text-xs text-muted">
                            Category:{" "}
                            {
                              event.eventCategory ||
                              "-"
                            }
                          </p>

                          <p className="text-xs text-muted">
                            Action:{" "}
                            {
                              event.eventAction ||
                              "-"
                            }
                          </p>

                          {event.selector && (
                            <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-2">

                              <p className="text-[10px] font-semibold uppercase text-green-700">
                                DOM Selector
                              </p>

                              <p className="mt-1 break-all font-mono text-xs text-green-800">
                                {
                                  event.selector
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-green-700">
                                {event.selectorUnique
                                  ? "Unique selector"
                                  : "Selector is not unique"}
                              </p>

                            </div>
                          )}

                          {event.interactionExpression && (
                            <p className="mt-2 break-all text-xs text-blue-600">
                              {
                                event.interactionExpression
                              }
                            </p>
                          )}

                        </div>

                        <span className="ml-auto shrink-0 text-xs text-muted">
                          {checked
                            ? "Selected"
                            : "Not selected"}
                        </span>

                      </label>
                    );
                  }
                )}

              </div>
            )}

            <div className="mt-4 rounded-lg border border-line bg-card-hi p-3">

              <p className="text-sm font-medium text-fg">

                {ga4Events.length}{" "}

                {eventAutomationMode ===
                  "common"
                  ? "Common"
                  : "Unique"}{" "}

                Event
                {ga4Events.length ===
                  1
                  ? ""
                  : "s"}{" "}
                selected

              </p>

            </div>

          </div>
        )}

      {/* ====================================================
          5. WEBSITE INSPECTION
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode &&
        ga4Events.length > 0 && (
          <div
            className="rounded-xl border border-line bg-card p-5"
            id="event-automation-inspect"
          >

            <h2 className="text-base font-semibold text-fg">
              5. Inspect Website
            </h2>

            <p className="mt-1 text-xs text-muted">
              The website inspector
              generates selectors directly
              from the inspected DOM. No
              website-specific selector is
              hard-coded.
            </p>

            <div className="mt-4">

              <WebsiteInput
                value={
                  websiteUrl
                }
                onChange={
                  setWebsiteUrl
                }
                onInspect={
                  handleWebsiteInspect
                }
                loading={
                  inspecting
                }
              />

            </div>

            {inspectedElements.length >
              0 && (
                <div className="mt-4 rounded-lg border border-line bg-card-hi p-3">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <p className="text-sm font-medium text-fg">
                        Website Inspection
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {
                          inspectedElements.length
                        } DOM elements inspected.
                      </p>

                    </div>

                    <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1">

                      <span className="text-xs font-medium text-green-700">
                        Inspection Complete
                      </span>

                    </div>

                  </div>

                </div>
              )}

          </div>
        )}

      {/* ====================================================
          6. GTM
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode &&
        ga4Events.length > 0 && (
          <div
            className="rounded-xl border border-line bg-card p-5"
            id="event-automation-gtm"
          >

            <h2 className="text-base font-semibold text-fg">
              6. Select GTM Workspace
            </h2>

            <p className="mt-1 text-xs text-muted">
              Select the GTM account,
              container and workspace where
              the automation should be created.
            </p>

            <div className="mt-4">

              <GTMSelector
                onChange={
                  setGtmSelection
                }
              />

            </div>

          </div>
        )}

      {/* ====================================================
          7. PREVIEW
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode &&
        ga4Events.length > 0 && (
          <div
            className="rounded-xl border border-line bg-card p-5"
            id="event-automation-preview"
          >

            <h2 className="mb-4 text-base font-semibold text-fg">
              7. GA4 Automation Preview
            </h2>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

              {/* VARIABLES */}

              <div className="rounded-lg border border-line bg-card-hi p-4">

                <p className="text-xs text-muted">
                  Variables
                </p>

                <p className="mt-1 text-2xl font-bold text-fg">
                  {
                    ga4Automation
                      ?.variables
                      ?.length ??
                    0
                  }
                </p>

              </div>

              {/* TRIGGERS */}

              <div className="rounded-lg border border-line bg-card-hi p-4">

                <p className="text-xs text-muted">
                  Triggers
                </p>

                <p className="mt-1 text-2xl font-bold text-fg">
                  {
                    ga4Automation
                      ?.triggers
                      ?.length ??
                    0
                  }
                </p>

              </div>

              {/* TAGS */}

              <div className="rounded-lg border border-line bg-card-hi p-4">

                <p className="text-xs text-muted">
                  Tags
                </p>

                <p className="mt-1 text-2xl font-bold text-fg">
                  {
                    ga4Automation
                      ?.tags
                      ?.length ??
                    0
                  }
                </p>

              </div>

            </div>

            <AutomationPreview
              automation={
                ga4Automation
              }
              events={
                availableEvents
              }
              ga4Events={
                ga4Events
              }
              dataLayerEvents={
                dataLayerEvents
              }
            />

          </div>
        )}

      {/* ====================================================
          8. CREATE
          ==================================================== */}

      {parsedSchema &&
        eventAutomationMode &&
        ga4Events.length > 0 && (
          <div
            className="rounded-xl border border-line bg-card p-5"
            id="event-automation-create"
          >

            <h2 className="text-base font-semibold text-fg">
              8. Create Automation
            </h2>

            <p className="mt-1 text-xs text-muted">
              Inspect the website first,
              verify the generated DOM
              selectors, then create the GTM
              automation.
            </p>

            {/* SELECTOR STATUS */}

            {ga4Events.length > 0 && (
              <div className="mt-4 rounded-lg border border-line bg-card-hi p-3">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-medium text-fg">
                      Selector Validation
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {
                        ga4Events.filter(
                          (
                            event
                          ) =>
                            event.selector &&
                            event.selectorUnique ===
                            true
                        ).length
                      }{" "}
                      of{" "}
                      {
                        ga4Events.length
                      }{" "}
                      selected events have
                      unique selectors.
                    </p>

                  </div>

                  <div
                    className={`
                      rounded-full px-3 py-1 text-xs font-medium
                      ${ga4Events.every(
                      (
                        event
                      ) =>
                        event.selector &&
                        event.selectorUnique ===
                        true
                    )
                        ? "border border-green-200 bg-green-50 text-green-700"
                        : "border border-yellow-200 bg-yellow-50 text-yellow-700"
                      }
                    `}
                  >
                    {ga4Events.every(
                      (
                        event
                      ) =>
                        event.selector &&
                        event.selectorUnique ===
                        true
                    )
                      ? "Ready"
                      : "Inspection Required"}
                  </div>

                </div>

              </div>
            )}

            <button
              type="button"
              onClick={
                handleCreateGA4
              }
              disabled={
                creating ||
                !inspectedElements.length ||
                !gtmSelection.accountId ||
                !gtmSelection.containerId ||
                !gtmSelection.workspaceId
              }
              className="mt-4 w-full rounded-lg bg-(--accent) px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {creating
                ? "Creating Automation..."
                : `Create ${eventAutomationMode ===
                  "common"
                  ? "Common"
                  : "Unique"
                } Event Automation`}

            </button>

          </div>
        )}

      {/* ====================================================
          SUCCESS
          ==================================================== */}

      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">

          <div className="flex items-start gap-2">

            <svg
              className="mt-0.5 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>

            <span>
              {success}
            </span>

          </div>

        </div>
      )}

      {/* ====================================================
          ERROR
          ==================================================== */}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">

          <div className="flex items-start gap-2">

            <svg
              className="mt-0.5 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle
                cx="12"
                cy="12"
                r="9"
              />
            </svg>

            <span>
              {error}
            </span>

          </div>

        </div>
      )}

    </div>
  );
}