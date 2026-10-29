export type TemplateField = {
  name: string;
  displayName?: string;
  type?: string;
  help?: string;
  defaultValue?: unknown;
  selectItems?: {
    value: string;
    displayValue: string;
  }[];
};

function getTemplateSection(
  templateData: string,
  sectionName: string
) {
  const start = templateData.indexOf(sectionName);

  if (start === -1) {
    return null;
  }

  const sectionStart = start + sectionName.length;

  const nextSection = templateData.indexOf(
    "___",
    sectionStart
  );

  if (nextSection === -1) {
    return templateData.substring(sectionStart).trim();
  }

  return templateData
    .substring(sectionStart, nextSection)
    .trim();
}

export function getTemplateFields(
  templateData?: string
): TemplateField[] {
  if (!templateData) {
    return [];
  }

  const section = getTemplateSection(
    templateData,
    "___TEMPLATE_PARAMETERS___"
  );

  if (!section) {
    return [];
  }

  try {
    const parameters = JSON.parse(section);

    if (!Array.isArray(parameters)) {
      return [];
    }

    return parameters.map((parameter) => ({
      name: parameter.name,
      displayName:
        parameter.displayName ||
        parameter.name,
      type: parameter.type,
      help: parameter.help,
      defaultValue: parameter.defaultValue,
      selectItems: parameter.selectItems,
    }));
  } catch (error) {
    console.error(
      "Unable to parse template parameters:",
      error
    );

    return [];
  }
}