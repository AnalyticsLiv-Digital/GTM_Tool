import type { GTMParameter } from "./gtm-types";
import type { TemplateField } from "./gtm-template-parser";

export function buildTemplateParameters(
  fields: TemplateField[],
  values: Record<string, unknown>
): GTMParameter[] {
  return fields
    .filter((field) => {
      return (
        values[field.name] !== undefined &&
        values[field.name] !== null &&
        values[field.name] !== ""
      );
    })
    .map((field) => {
      const value = values[field.name];

      if (field.type === "CHECKBOX") {
        return {
          type: "BOOLEAN",
          key: field.name,
          value: value ? "true" : "false",
        };
      }

      if (
        field.type === "NUMBER" ||
        field.type === "INTEGER"
      ) {
        return {
          type: "INTEGER",
          key: field.name,
          value: String(value),
        };
      }

      return {
        type: "TEMPLATE",
        key: field.name,
        value: String(value),
      };
    });
}