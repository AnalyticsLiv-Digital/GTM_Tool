// =====================================================
// EVENT AUTOMATION HELPERS
// =====================================================

export function cleanText(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

// =====================================================
// NAME NORMALIZATION
// =====================================================

export function normalizeName(
  value: string
): string {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// SAFE GTM NAME
// =====================================================

export function createGTMName(
  value: string,
  fallback: string
): string {
  const cleaned = normalizeName(value);

  return cleaned || fallback;
}

// =====================================================
// EVENT NAME
// =====================================================

export function normalizeEventName(
  value: string
): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// =====================================================
// SELECTOR VALUE
// =====================================================

export function normalizeSelector(
  selector: string
): string {
  return cleanText(selector);
}

// =====================================================
// SELECTOR TYPE
// =====================================================

export function normalizeSelectorType(
  value: unknown
): "id" | "class" | undefined {
  const type = cleanText(value)
    .toLowerCase();

  if (type === "id") {
    return "id";
  }

  if (
    type === "class" ||
    type === "classname"
  ) {
    return "class";
  }

  return undefined;
}

// =====================================================
// DATA LAYER VARIABLE NAME
// =====================================================

export function createDataLayerVariableName(
  eventName: string,
  parameterName: string
): string {
  return [
    "DLV",
    normalizeEventName(eventName),
    normalizeEventName(parameterName),
  ].join(" - ");
}

// =====================================================
// TRIGGER NAME
// =====================================================

export function createTriggerName(
  eventName: string
): string {
  return `TR - ${normalizeEventName(
    eventName
  )}`;
}

// =====================================================
// TAG NAME
// =====================================================

export function createTagName(
  eventName: string
): string {
  return `GA4 - ${normalizeEventName(
    eventName
  )}`;
}

// =====================================================
// UNIQUE ARRAY
// =====================================================

export function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map(cleanText)
        .filter(Boolean)
    )
  );
}