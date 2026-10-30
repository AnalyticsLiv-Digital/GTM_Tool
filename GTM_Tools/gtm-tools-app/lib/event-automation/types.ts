// ============================================================
// EVENT AUTOMATION TYPES
// ============================================================

export type SelectorType =
  | "id"
  | "attribute"
  | "aria"
  | "role"
  | "text"
  | "href"
  | "tag"
  | "ancestor"
  | "compound"
  | "path"
  | "class"
  | "structural"
  | "shared"
  | "auto";

export type SelectorSource =
  | "website-inspection"
  | "schema"
  | "generated"
  | string;

// ============================================================
// EVENT SCHEMA ROW
// ============================================================

export interface EventSchemaRow {
  eventName: string;

  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;

  pageUrl?: string;

  scenario?: string;

  sectionHeading?: string;

  menuName?: string;
  subMenuName?: string;
  subMenuItem?: string;

  buttonText?: string;
  clickUrl?: string;

  variableName?: string;
  matchType?: string;
  matchValue?: string;

  selector?: string;
  selectorType?: SelectorType;

  interactionExpression?: string;
  querySelectorExpression?: string;

  selectorSource?: SelectorSource;

  closestTag?: string;

  element?: string;

  matchCount?: number;

  selectorUnique?: boolean;

  confidence?: number;

  [key: string]: unknown;
}

// ============================================================
// SELECTOR CANDIDATE
// ============================================================

export interface SelectorCandidate {
  selector: string;

  selectorType: SelectorType;

  matchCount: number;

  targetMatched: boolean;

  score: number;

  stabilityScore: number;

  specificityScore: number;

  depth?: number;

  reason?: string;
}

// ============================================================
// INSPECTED ELEMENT
// ============================================================

export interface InspectedElement {
  tagName: string;

  id?: string;

  classes: string[];

  text?: string;

  href?: string;

  src?: string;

  alt?: string;

  title?: string;

  role?: string;

  type?: string;

  name?: string;

  ariaLabel?: string;

  ariaRole?: string;

  dataAttributes?: Record<string, string>;

  attributes?: Record<string, string>;

  selector?: string;

  selectorType?: SelectorType;

  selectorSource?: SelectorSource;

  matchCount?: number;

  selectorUnique?: boolean;

  candidates?: SelectorCandidate[];

  interactionExpression?: string;

  querySelectorExpression?: string;

  closestTag?: string;

  closestId?: string;

  closestClasses?: string[];

  parentTagName?: string;

  parentId?: string;

  parentClasses?: string[];

  regionTag?: string;

  regionDepth?: number;

  depth?: number;

  confidence?: number;

  outerHTML?: string;

  pageUrl?: string;

  eventName?: string;

  eventMatches?: string[];

  triggerType?: string;

  triggerReason?: string;
}

// ============================================================
// WEBSITE RESOLVED EVENT
// ============================================================

export interface WebsiteResolvedEvent
  extends EventSchemaRow {
  selector?: string;

  selectorType?: SelectorType;

  selectorSource?: SelectorSource;

  interactionExpression?: string;

  querySelectorExpression?: string;

  closestTag?: string;

  element?: string;

  matchCount?: number;

  selectorUnique?: boolean;

  confidence?: number;

  candidates?: SelectorCandidate[];
}

// ============================================================
// INSPECTION REQUEST
// ============================================================

export interface InspectRequest {
  websiteUrl: string;

  events: EventSchemaRow[];
}

// ============================================================
// INSPECTION RESPONSE
// ============================================================

export interface InspectEventMatch {
  eventIndex: number;

  eventName: string;

  eventType?: string;

  pageUrl?: string;

  matches: number;

  selector?: string;

  selectorType?: SelectorType;

  selectorSource?: SelectorSource;

  selectorUnique?: boolean;

  matchCount?: number;

  confidence?: number;

  bestMatch?: InspectedElement | null;
}

export interface InspectResponse {
  success: boolean;

  websiteUrl: string;

  elements: InspectedElement[];

  events?: WebsiteResolvedEvent[];

  eventMatches?: InspectEventMatch[];

  inspectedCount: number;

  pagesVisited?: string[];

  error?: string;
}

// ============================================================
// PARSED EVENT SCHEMA
// ============================================================

export interface ParsedEventSchema {
  events: EventSchemaRow[];

  commonEvents?: EventSchemaRow[];

  uniqueEvents?: EventSchemaRow[];

  fileName?: string;

  fileType?: string;

  sheetName?: string;

  totalEvents?: number;

  [key: string]: unknown;
}

// ============================================================
// GA4 MEASUREMENT CONFIG
// ============================================================

export interface GA4MeasurementIdConfig {
  mode: "gtm_variable" | "manual";

  value: string;
}

// ============================================================
// AUTOMATION MODE
// ============================================================

export type EventAutomationMode =
  | "click"
  | "form_submit"
  | "custom"
  | null;

// ============================================================
// GENERATED GTM PARAMETER
// ============================================================

export interface GeneratedGTMParameter {
  key: string;

  type:
    | "TEMPLATE"
    | "template"
    | "BOOLEAN"
    | "boolean"
    | "INTEGER"
    | "integer"
    | "LIST"
    | "list"
    | "MAP"
    | "map"
    | string;

  value?: string;

  [key: string]: unknown;
}

// ============================================================
// GENERATED GA4 VARIABLE
// ============================================================

export interface GeneratedGA4Variable {
  name: string;

  type: string;

  parameter?: string;

  value?: string;

  sourceEvent?: string;

  selector?: string;

  selectorType?: SelectorType;

  selectorSource?: string;

  element?: string;

  closestTag?: string;

  querySelectorExpression?: string;

  interactionExpression?: string;

  dataLayerPath?: string;

  variableId?: string;

  parameterList?: GeneratedGTMParameter[];

  [key: string]: unknown;
}

// ============================================================
// GENERATED GA4 TRIGGER
// ============================================================

export interface GeneratedGA4Trigger {
  name: string;

  type: string;

  customEventFilter?: {
    type: string;

    parameter: string;

    value: string;
  };

  [key: string]: unknown;
}

// ============================================================
// GENERATED GA4 TAG
// ============================================================

export interface GeneratedGA4Tag {
  name: string;

  type: string;

  eventName: string;

  measurementId: string;

  triggerNames?: string[];

  parameters?: Record<string, string>;

  [key: string]: unknown;
}