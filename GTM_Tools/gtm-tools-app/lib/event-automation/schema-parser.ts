"use client";

import * as XLSX from "xlsx";

import type { EventSchemaRow, ParsedEventSchema } from "./types";

type EventParameter = { name: string; value: string; };

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
    .replace(/[\s_-]+/g, "")
    .replace(/[^\w]/g, "");
}

// =====================================================
// GET COLUMN VALUE
// =====================================================

function getColumnValue(row: Record<string, unknown>, possibleNames: string[]): string {
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
// PARSE PARAMETERS
// =====================================================

function parseParameters(row: Record<string, unknown>): EventParameter[] {
  const parameters: EventParameter[] = [];

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);

    if (normalizedKey.startsWith("parameter") || normalizedKey.startsWith("param")) {
      const parameterValue = toStringValue(value);

      if (parameterValue) {
        parameters.push({ name: key, value: parameterValue });
      }
    }
  }

  return parameters;
}

// =====================================================
// SOURCE SHEET
// =====================================================

function getSourceSheet(sheetName: string): "Common Event" | "Unique event" | undefined {
  const normalized = normalizeHeader(sheetName);

  if (normalized === "commonevent" || normalized === "commonevents") {
    return "Common Event";
  }

  if (normalized === "uniqueevent" || normalized === "uniqueevents") {
    return "Unique event";
  }

  return undefined;
}

// =====================================================
// EVENT KEY
// =====================================================

function createEventKey(row: EventSchemaRow): string {
  return [row.eventName, row.eventCategory, row.eventAction, row.pageUrl ?? ""]
    .map((value) => toStringValue(value).toLowerCase())
    .join("|");
}

// =====================================================
// FORWARD-FILL PAGE URL
//
// Excel merges the "Page Url" cell across a group of rows
// (e.g. one "All Pages" cell spanning 9 event rows below
// it). sheet_to_json does NOT carry merged values down —
// every row after the first in a merged group reads as
// blank. This restores that: each blank Page Url inherits
// the last VALID value seen above it in the same sheet.
//
// "Valid" means it looks like a URL or is literally
// "All Pages" — this avoids accidentally forward-filling
// section-header rows like "Career Page" or
// "Contact Us page" (single-cell divider rows with no
// real event data) into the real event rows below them.
// =====================================================

function looksLikeValidPageUrlValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (normalized === "all pages") {
    return true;
  }

  return /^https?:\/\//i.test(value.trim());
}

// =====================================================
// RESOLVE PAGE URLS
//
// A schema row's Page Url can be:
//   - "All Pages"        -> event applies sitewide
//   - a single URL
//   - multiple URLs separated by newlines (the event can
//     occur on any of them)
//   - blank (after forward-fill this should be rare, but
//     falls back to sitewide too)
//
// Returns a normalized list of absolute URLs, or an empty
// array to mean "sitewide / use the base URL".
// =====================================================

export function resolvePageUrls(pageUrl: string | undefined, baseUrl: string): string[] {
  const raw = (pageUrl ?? "").trim();

  if (!raw || raw.toLowerCase() === "all pages") {
    return [];
  }

  const candidates = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const resolved: string[] = [];

  for (const candidate of candidates) {
    try {
      const url = /^https?:\/\//i.test(candidate) ? new URL(candidate) : new URL(candidate, baseUrl);

      resolved.push(url.toString());
    } catch {
      // Not a valid URL/path fragment — skip it rather
      // than crash the whole inspection run.
      continue;
    }
  }

  return resolved;
}

// =====================================================
// PARSE ROW
// =====================================================

function parseRow(
  rawRow: Record<string, unknown>,
  sourceSheet: "Common Event" | "Unique event" | undefined,
  carriedPageUrl: string
): EventSchemaRow | null {
  const eventName = getColumnValue(rawRow, ["eventName", "event", "event name", "event_name"]);

  const eventCategory = getColumnValue(rawRow, ["eventCategory", "category", "event category", "event_category",]);

  const eventAction = getColumnValue(rawRow, ["eventAction", "action", "event action", "event_action"]);

  // Ignore empty rows
  if (!eventName && !eventCategory && !eventAction) {
    return null;
  }

  // eventName is required
  if (!eventName) {
    return null;
  }

  const selector = getColumnValue(rawRow, ["selector", "querySelector", "query selector", "element selector",]);

  const selectorTypeValue = getColumnValue(rawRow, ["selectorType", "selector type", "selector_type"]);

  const element = getColumnValue(rawRow, ["element", "elementName", "element name"]);

  // Page Url uses the forward-filled value (carriedPageUrl),
  // NOT a fresh read — a blank cell here means "inherit the
  // last valid Page Url above", which is exactly what
  // carriedPageUrl represents.
  const pageUrl = carriedPageUrl;

  const tagName = getColumnValue(rawRow, ["tagName", "tag", "tag name"]);

  const triggerName = getColumnValue(rawRow, ["triggerName", "trigger", "trigger name"]);

  let selectorType: "id" | "class" | "auto" | undefined;

  const normalizedSelectorType = selectorTypeValue.toLowerCase();

  if (normalizedSelectorType === "id") {
    selectorType = "id";
  } else if (normalizedSelectorType === "class") {
    selectorType = "class";
  } else if (normalizedSelectorType === "auto") {
    selectorType = "auto";
  }

  return {
    ...rawRow,
    eventName,
    eventCategory,
    eventAction,
    selector: selector || undefined,
    selectorType,
    element: element || undefined,
    pageUrl: pageUrl || undefined,
    tagName: tagName || undefined,
    triggerName: triggerName || undefined,
    parameters: parseParameters(rawRow),
    source: sourceSheet === "Common Event" ? "common" : sourceSheet === "Unique event" ? "unique" : undefined,
    sourceSheet,
  };
}

// =====================================================
// PARSE WORKSHEET
// =====================================================

function parseWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): {
  rows: EventSchemaRow[];
  columns: string[];
} {
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");

  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    range: {
      s: { r: range.s.r, c: range.s.c },
      e: { r: range.s.r, c: range.e.c },
    },
  });

  const headerRow = headerRows[0];

  const columns = Array.isArray(headerRow) ? headerRow.map(toStringValue).filter(Boolean) : [];

  const sourceSheet = getSourceSheet(sheetName);

  const rows: EventSchemaRow[] = [];

  // -----------------------------------------------------
  // FORWARD-FILL STATE
  // Carries the last valid Page Url value down through
  // blank rows within this sheet (merged-cell behaviour).
  // -----------------------------------------------------

  let carriedPageUrl = "";

  for (const rawRow of jsonRows) {
    const rawPageUrlValue = getColumnValue(rawRow, ["pageUrl", "pageURL", "page url", "url", "page", "page path",]);

    if (looksLikeValidPageUrlValue(rawPageUrlValue)) {
      carriedPageUrl = rawPageUrlValue.trim();
    }
    // If the cell is blank OR looks like a section-header
    // label (e.g. "Career Page"), we deliberately do NOT
    // update carriedPageUrl — we keep using whatever the
    // last real URL/"All Pages" value was.

    const parsed = parseRow(rawRow, sourceSheet, carriedPageUrl);

    if (parsed) {
      rows.push(parsed);
    }
  }

  return { rows, columns };
}

// =====================================================
// DEDUPLICATE
// =====================================================

function deduplicateEvents(rows: EventSchemaRow[]): EventSchemaRow[] {
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
// PARSE EXCEL FILE
// =====================================================

export async function parseSchemaFile(file: File): Promise<ParsedEventSchema> {
  if (!file) {
    throw new Error("Please select an Excel file.");
  }

  const fileName = String(file.name || "").trim().toLowerCase();

  if (!fileName) {
    throw new Error("The selected file has no name.");
  }

  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    throw new Error("Only .xlsx and .xls files are supported.");
  }

  if (!file.size || file.size <= 0) {
    throw new Error("The selected Excel file is empty.");
  }

  let arrayBuffer: ArrayBuffer;

  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error) {
    console.error("[Event Automation] Failed to read file:", error);
    throw new Error("Unable to read the Excel file. Please select the file again.");
  }

  if (!arrayBuffer.byteLength) {
    throw new Error("Invalid Excel file. Please select the Excel file again.");
  }

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  } catch (error) {
    console.error("[Event Automation] XLSX parser error:", error);
    throw new Error("Invalid Excel file. Please select a valid .xlsx file.");
  }

  const sheets = workbook.SheetNames || [];

  if (!sheets.length) {
    throw new Error("The Excel workbook does not contain any worksheets.");
  }

  const allEvents: EventSchemaRow[] = [];
  const commonEvents: EventSchemaRow[] = [];
  const uniqueEvents: EventSchemaRow[] = [];
  const allColumns = new Set<string>();

  for (const sheetName of sheets) {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    const parsed = parseWorksheet(worksheet, sheetName);

    for (const column of parsed.columns) {
      allColumns.add(column);
    }

    for (const row of parsed.rows) {
      allEvents.push(row);

      if (row.sourceSheet === "Common Event") {
        commonEvents.push(row);
      }

      if (row.sourceSheet === "Unique event") {
        uniqueEvents.push(row);
      }
    }
  }

  const normalizedAllEvents = deduplicateEvents(allEvents);
  const normalizedCommonEvents = deduplicateEvents(commonEvents);
  const normalizedUniqueEvents = deduplicateEvents(uniqueEvents);

  if (normalizedAllEvents.length === 0) {
    throw new Error("No valid events were found in the Excel file. Make sure the workbook contains eventName, eventCategory and eventAction columns.");
  }

  return {
    fileName: file.name,
    events: normalizedAllEvents,
    commonEvents: normalizedCommonEvents,
    uniqueEvents: normalizedUniqueEvents,
    sheets,
    columns: Array.from(allColumns),
  };
}

export default parseSchemaFile;