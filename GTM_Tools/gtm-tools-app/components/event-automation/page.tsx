export interface GTMAccount {
  accountId?: string;
  name?: string;
  path?: string;
  fingerprint?: string;
  [key: string]: unknown;
}

export interface GTMContainer {
  containerId?: string;
  name?: string;
  publicId?: string;
  path?: string;
  fingerprint?: string;
  usageContext?: string[];
  [key: string]: unknown;
}

export interface GTMWorkspace {
  workspaceId?: string;
  name?: string;
  path?: string;
  fingerprint?: string;
  description?: string;
  [key: string]: unknown;
}

/* =====================================================
   EVENT SCHEMA
===================================================== */

export interface EventSchemaParameter {
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  description?: string;
}

export interface EventSchemaRow {
  eventName: string;
  eventCategory: string;
  eventAction: string;

  selector?: string;

  selectorType?: "id" | "class";

  dataLayer?: Record<string, unknown>;

  parameters?: EventSchemaParameter[];

  tagName?: string;
  triggerName?: string;

  [key: string]: unknown;
}

export interface ParsedEventSchema {
  uniqueEvents: never;
  commonEvents(commonEvents: never): unknown;
  events: EventSchemaRow[];

  columns: string[];

  fileName?: string;
}

/* =====================================================
   SELECTOR
===================================================== */

export type SelectorType =
  | "id"
  | "class";

export interface DetectedSelector {
  type: SelectorType;

  value: string;

  selector: string;

  source?: string;

  confidence?: number;
}

/* =====================================================
   DATALAYER
===================================================== */

export interface DataLayerEvent {
  event: "custom";

  eventName: string;

  eventCategory: string;

  eventAction: string;

  parameters?: Record<string, unknown>;

  code: string;
}

/* =====================================================
   GTM VARIABLE
===================================================== */

export interface GeneratedVariable {
  name: string;

  type: string;

  parameter: Array<{
    key: string;
    type: string;
    value: string;
  }>;

  description?: string;

  sourceEvent?: string;
}

/* =====================================================
   GTM TRIGGER
===================================================== */

export interface GeneratedTrigger {
  name: string;

  type: string;

  customEventName?: string;

  parameter?: Array<{
    key: string;
    type: string;
    value: string;
  }>;

  description?: string;

  sourceEvent?: string;
}

/* =====================================================
   GTM TAG
===================================================== */

export interface GeneratedTag {
  name: string;

  type: string;

  parameter: Array<{
    key: string;
    type: string;
    value: string;
  }>;

  firingTriggerId?: string;

  firingTriggerName?: string;

  description?: string;

  sourceEvent?: string;
}

/* =====================================================
   COMPLETE AUTOMATION
===================================================== */

export interface GeneratedAutomation {
  dataLayer: DataLayerEvent[];

  variables: GeneratedVariable[];

  triggers: GeneratedTrigger[];

  tags: GeneratedTag[];

  selectors: DetectedSelector[];

  events: EventSchemaRow[];
}

/* =====================================================
   AUTOMATION STATE
===================================================== */

export interface EventAutomationState {
  selectedAccountId: string;

  selectedContainerId: string;

  selectedWorkspaceId: string;

  websiteUrl: string;

  schema: ParsedEventSchema | null;

  automation: GeneratedAutomation | null;

  loading: boolean;

  error: string | null;
}