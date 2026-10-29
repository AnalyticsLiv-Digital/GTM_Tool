import {
  EventSchema,
  WebsiteSelector,
} from "@/types/event-automation";

export function normalizeSelector(
  selector: string
): string {
  return selector.trim();
}

export function validateSelector(
  selector: string
): "id" | "class" | null {
  const value = normalizeSelector(selector);

  if (value.startsWith("#")) {
    return "id";
  }

  if (value.startsWith(".")) {
    return "class";
  }

  return null;
}

export function buildSelector(
  element: {
    id?: string;
    className?: string;
  }
): {
  selector: string;
  selectorType: "id" | "class";
} | null {
  const id =
    typeof element.id === "string"
      ? element.id.trim()
      : "";

  if (id) {
    return {
      selector: `#${id}`,
      selectorType: "id",
    };
  }

  const className =
    typeof element.className === "string"
      ? element.className.trim()
      : "";

  if (className) {
    const classes = className
      .split(/\s+/)
      .filter(Boolean);

    if (classes.length) {
      return {
        selector: `.${classes[0]}`,
        selectorType: "class",
      };
    }
  }

  return null;
}

export function generateSelectorCandidates(
  event: EventSchema
): WebsiteSelector[] {
  return event.fields.map((field) => ({
    fieldName: field.fieldName,
    selector: "",
    selectorType: "class",
    matched: false,
  }));
}