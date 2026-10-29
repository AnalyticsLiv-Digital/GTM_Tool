import type {
  EventSchemaRow,
  GeneratedGA4Variable,
} from "./types";

// =====================================================
// CLEAN NAME
// =====================================================

function cleanName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

// =====================================================
// GENERATE DATA LAYER VARIABLES
// =====================================================

export function generateDataLayerVariables(
  event: EventSchemaRow
): GeneratedGA4Variable[] {
  const parameters =
    Array.isArray(event.eventParameters)
      ? event.eventParameters
      : Array.isArray(event.parameters)
        ? event.parameters
        : [];

  return parameters
    .filter(
      (parameter) =>
        typeof parameter?.name === "string" &&
        parameter.name.trim()
    )
    .map((parameter) => {
      const parameterName =
        parameter.name.trim();

      const variableName =
        `DLV - ${cleanName(
          event.eventName
        )} - ${cleanName(
          parameterName
        )}`;

      const dataLayerPath =
        typeof parameter.value === "string" &&
        parameter.value.trim()
          ? parameter.value.trim()
          : parameterName;

      return {
        name: variableName,

        type: "v",

        parameter: [
          {
            key: "name",
            type: "template",
            value: dataLayerPath,
          },
          {
            key: "dataLayerVersion",
            type: "template",
            value: "2",
          },
        ],

        sourceEvent:
          event.eventName,
      };
    });
}

export function generateVariables(
  events: EventSchemaRow[]
): GeneratedGA4Variable[] {
  return events.flatMap(
    (event) =>
      generateDataLayerVariables(event)
  );
}
