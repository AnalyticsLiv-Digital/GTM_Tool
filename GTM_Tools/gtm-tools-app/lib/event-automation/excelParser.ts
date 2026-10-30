/* eslint-disable @typescript-eslint/no-unused-vars */
import * as XLSX from "xlsx";

import type {EventSchemaRow,ParsedEventSchema,EventParameter,SelectorType,} from "./types";

// =====================================================
// TYPES
// =====================================================

export interface ParsedExcelResult extends ParsedEventSchema {
  rows: never[];
  fileName: string;
}

// =====================================================
// SAFE STRING
// =====================================================

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

// =====================================================
// NORMALIZE HEADER
// =====================================================

function normalizeHeader(value: unknown): string {
  return toStringValue(value)
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .replace(/[^\w]/g, "");
}

// =====================================================
// GET COLUMN VALUE
// =====================================================

function getColumnValue(row: Record<string, unknown>,possibleNames: string[]): string {
  const normalizedPossibleNames = possibleNames.map(normalizeHeader);

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);

    if (normalizedPossibleNames.includes(normalizedKey)) {
      return toStringValue(value);
    }
  }

  return "";
}

// =====================================================
// EXTRACT CUSTOM DIMENSION
//
// Example:
//
// {{eventCategory}} : header
// {{eventAction}} eg : Analyticsliv logo click
// {{pageName}} : home_page
// =====================================================

function extractCustomDimension(
  customDimensions: string,
  dimensionName: string
): string {
  if (!customDimensions) {
    return "";
  }

  const escapedName = dimensionName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `\\{\\{\\s*${escapedName}\\s*\\}\\}\\s*(?::|eg\\s*:?)\\s*(.+?)(?=\\n|\\r|\\{\\{|$)`,
    "i"
  );

  const match = customDimensions.match(regex);

  if (match?.[1]) {
    return match[1].trim();
  }

  // Fallback for formats such as:
  //
  // {{eventAction}} eg: Read
  //
  const fallbackRegex = new RegExp(
    `\\{\\{\\s*${escapedName}\\s*\\}\\}[^\\n\\r]*?\\s+(?:eg\\s*)?:?\\s*(.+?)(?=\\n|\\r|\\{\\{|$)`,
    "i"
  );

  const fallbackMatch = customDimensions.match(fallbackRegex);

  return fallbackMatch?.[1]?.trim() || "";
}

// =====================================================
// EXTRACT ALL CUSTOM DIMENSIONS
// =====================================================

function parseCustomDimensions(
  value: string
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!value) {
    return result;
  }

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^\{\{\s*([^}]+?)\s*\}\}\s*(?::|eg\s*:?)\s*(.*)$/i
    );

    if (!match) {
      continue;
    }

    const key = match[1].trim();

    const rawValue = match[2]
      .replace(/^eg\s*:?\s*/i, "")
      .trim();

    if (!rawValue) {
      continue;
    }

    result[key] = rawValue;
  }

  return result;
}

// =====================================================
// PARAMETERS
// =====================================================

function parseParameters(
  row: Record<string, unknown>
): EventParameter[] {
  const parameters: EventParameter[] = [];

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);

    if (
      normalizedKey.startsWith("parameter") ||
      normalizedKey.startsWith("param")
    ) {
      const parameterValue = toStringValue(value);

      if (parameterValue) {
        parameters.push({
          name: key,
          value: parameterValue,
        });
      }
    }
  }

  return parameters;
}

// =====================================================
// SOURCE SHEET
// =====================================================

function getSourceSheet(
  sheetName: string
): "Common Event" | "Unique event" | undefined {
  const normalized = normalizeHeader(sheetName);

  if (
    normalized === "commonevent" ||
    normalized === "commonevents"
  ) {
    return "Common Event";
  }

  if (
    normalized === "uniqueevent" ||
    normalized === "uniqueevents"
  ) {
    return "Unique event";
  }

  return undefined;
}

// =====================================================
// EVENT KEY
// =====================================================

function createEventKey(row: EventSchemaRow): string {
  return [
    row.eventName,
    row.eventCategory,
    row.eventAction,
    row.pageUrl ?? "",
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
}

// =====================================================
// PARSE SELECTOR TYPE
// =====================================================

function parseSelectorType(
  value: string
): SelectorType | undefined {
  const normalized = value.trim().toLowerCase();

  if (normalized === "id") {
    return "id";
  }

  if (normalized === "class") {
    return "class";
  }

  if (normalized === "auto") {
    return "auto";
  }

  return undefined;
}

// =====================================================
// PARSE ROW
// =====================================================

function parseRow(
  rawRow: Record<string, unknown>,
  sourceSheet?: "Common Event" | "Unique event"
): EventSchemaRow | null {
  // -------------------------------------------------
  // ACTUAL EXCEL COLUMNS
  // -------------------------------------------------

  const eventName = getColumnValue(rawRow, [
    "eventName",
    "event name",
    "event_name",
    "event",
  ]);

  const pageUrl = getColumnValue(rawRow, [
    "pageUrl",
    "pageURL",
    "page url",
    "url",
    "page",
    "page path",
  ]);

  const scenario = getColumnValue(rawRow, [
    "scenario",
  ]);

  const customDimensions = getColumnValue(rawRow, [
    "customDimensions",
    "custom dimensions",
    "custom dimension",
  ]);

  // -------------------------------------------------
  // IGNORE COMPLETELY EMPTY ROWS
  // -------------------------------------------------

  if (!eventName) {
    return null;
  }

  // -------------------------------------------------
  // PARSE CUSTOM DIMENSIONS
  // -------------------------------------------------

  const dimensions =
    parseCustomDimensions(customDimensions);

  // -------------------------------------------------
  // EVENT CATEGORY
  // -------------------------------------------------

  const eventCategory =
    dimensions.eventCategory ||
    dimensions.EventCategory ||
    "";

  // -------------------------------------------------
  // EVENT ACTION
  // -------------------------------------------------

  const eventAction =
    dimensions.eventAction ||
    dimensions.EventAction ||
    "";

  // -------------------------------------------------
  // SUPPORT EVENT SUB CATEGORY
  // -------------------------------------------------

  const eventSubCategory =
    dimensions.eventSubCategory ||
    dimensions.EventSubCategory ||
    "";

  // -------------------------------------------------
  // SELECTOR
  // -------------------------------------------------

  const selector = getColumnValue(rawRow, [
    "selector",
    "querySelector",
    "query selector",
    "element selector",
  ]);

  const selectorTypeValue = getColumnValue(rawRow, [
    "selectorType",
    "selector type",
    "selector_type",
  ]);

  const element = getColumnValue(rawRow, [
    "element",
    "elementName",
    "element name",
  ]);

  const tagName = getColumnValue(rawRow, [
    "tagName",
    "tag",
    "tag name",
  ]);

  const triggerName = getColumnValue(rawRow, [
    "triggerName",
    "trigger",
    "trigger name",
  ]);

  // -------------------------------------------------
  // PAGE NAME
  // -------------------------------------------------

  const pageName =
    dimensions.pageName ||
    dimensions.PageName ||
    "";

  // -------------------------------------------------
  // PARAMETERS
  // -------------------------------------------------

  const parameters =
    parseParameters(rawRow);

  // Also add custom dimensions as parameters.
  for (const [key, value] of Object.entries(dimensions)) {
    if (
      key === "eventCategory" ||
      key === "eventAction"
    ) {
      continue;
    }

    if (
      value &&
      !parameters.some(
        (parameter) => parameter.name === key
      )
    ) {
      parameters.push({
        name: key,
        value,
      });
    }
  }

  // -------------------------------------------------
  // VALIDATION
  //
  // Event name is mandatory.
  // Category/action can legitimately be absent
  // in some rows, but should be extracted whenever
  // available from Custom Dimensions.
  // -------------------------------------------------

  if (!eventName.trim()) {
    return null;
  }

  // -------------------------------------------------
  // CREATE EVENT
  // -------------------------------------------------

  const row: EventSchemaRow = {
    ...rawRow,

    eventName: eventName.trim(),

    eventCategory:
      eventCategory.trim(),

    eventAction:
      eventAction.trim(),

    selector:
      selector.trim() || undefined,

    selectorType:
      parseSelectorType(selectorTypeValue),

    element:
      element.trim() || undefined,

    pageUrl:
      pageUrl.trim() || undefined,

    tagName:
      tagName.trim() || undefined,

    triggerName:
      triggerName.trim() || undefined,

    parameters,

    source:
      sourceSheet === "Common Event"
        ? "common"
        : sourceSheet === "Unique event"
          ? "unique"
          : undefined,

    sourceSheet,

    // Additional useful fields
    scenario:
      scenario || undefined,

    customDimensions:
      customDimensions || undefined,

    eventSubCategory:
      eventSubCategory || undefined,

    pageName:
      pageName || undefined,
  };

  return row;
}

// =====================================================
// PARSE WORKSHEET
// =====================================================

function parseWorksheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string
): {
  rows: EventSchemaRow[];
  columns: string[];
} {
  const jsonRows =
    XLSX.utils.sheet_to_json<
      Record<string, unknown>
    >(worksheet, {
      defval: "",
      raw: false,
    });

  const range = XLSX.utils.decode_range(
    worksheet["!ref"] || "A1:A1"
  );

  const headerRows =
    XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false,
        range: {
          s: {
            r: range.s.r,
            c: range.s.c,
          },
          e: {
            r: range.s.r,
            c: range.e.c,
          },
        },
      }
    );

  const headerRow = headerRows[0];

  const columns =
    Array.isArray(headerRow)
      ? headerRow
        .map(toStringValue)
        .filter(Boolean)
      : [];

  const sourceSheet =
    getSourceSheet(sheetName);

  const rows: EventSchemaRow[] = [];

  for (const rawRow of jsonRows) {
    const parsed =
      parseRow(rawRow, sourceSheet);

    if (parsed) {
      rows.push(parsed);
    }
  }

  return {
    rows,
    columns,
  };
}

// =====================================================
// DEDUPLICATE EVENTS
// =====================================================

function deduplicateEvents(
  rows: EventSchemaRow[]
): EventSchemaRow[] {
  const seen = new Set<string>();

  const result: EventSchemaRow[] = [];

  for (const row of rows) {
    const key = createEventKey(row);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(row);
  }

  return result;
}

// =====================================================
// PARSE EXCEL BUFFER
// =====================================================

export function parseExcelBuffer(
  buffer: Buffer,
  fileName = "event-schema.xlsx"
): ParsedExcelResult {
  if (!buffer || buffer.length === 0) {
    throw new Error(
      "The uploaded Excel file is empty."
    );
  }

  // -------------------------------------------------
  // READ WORKBOOK
  // -------------------------------------------------

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheets = workbook.SheetNames;

  if (!sheets.length) {
    throw new Error(
      "The Excel workbook does not contain any worksheets."
    );
  }

  // -------------------------------------------------
  // STORAGE
  // -------------------------------------------------

  const allEvents: EventSchemaRow[] = [];

  const commonEvents: EventSchemaRow[] = [];

  const uniqueEvents: EventSchemaRow[] = [];

  const allColumns = new Set<string>();

  // -------------------------------------------------
  // PROCESS SHEETS
  // -------------------------------------------------

  for (const sheetName of sheets) {
    const worksheet =
      workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    const parsed =
      parseWorksheet(
        worksheet,
        sheetName
      );

    for (const column of parsed.columns) {
      allColumns.add(column);
    }

    for (const row of parsed.rows) {
      allEvents.push(row);

      if (
        row.sourceSheet ===
        "Common Event"
      ) {
        commonEvents.push(row);
      }

      if (
        row.sourceSheet ===
        "Unique event"
      ) {
        uniqueEvents.push(row);
      }
    }
  }

  // -------------------------------------------------
  // DEDUPLICATE
  // -------------------------------------------------

  const normalizedAllEvents =
    deduplicateEvents(
      allEvents
    );

  const normalizedCommonEvents =
    deduplicateEvents(
      commonEvents
    );

  const normalizedUniqueEvents =
    deduplicateEvents(
      uniqueEvents
    );

  // -------------------------------------------------
  // VALIDATION
  // -------------------------------------------------

  if (
    normalizedAllEvents.length === 0
  ) {
    throw new Error(
      "No valid events were found in the Excel file. Make sure the workbook contains an Event Name column."
    );
  }

  // -------------------------------------------------
  // DEBUG
  // -------------------------------------------------

  console.log(
    "[Event Automation] Excel parsing completed:",
    {
      fileName,

      sheets,

      totalEvents:
        normalizedAllEvents.length,

      commonEvents:
        normalizedCommonEvents.length,

      uniqueEvents:
        normalizedUniqueEvents.length,

      columns:
        Array.from(allColumns),
    }
  );

  console.log(
    "[Event Automation] First parsed event:",
    normalizedAllEvents[0]
  );

  // -------------------------------------------------
  // RETURN
  // -------------------------------------------------

  return {
    fileName,

    events:
      normalizedAllEvents,

    commonEvents:
      normalizedCommonEvents,

    uniqueEvents:
      normalizedUniqueEvents,

    sheets,

    columns:
      Array.from(allColumns),

    rows: [],
  };
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default parseExcelBuffer;