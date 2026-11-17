type GTMParameter = {
  type: string;
  key?: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
};

type GTMCondition = {
  type: string;
  parameter: GTMParameter[];
};

type GTMTag = {
  tagId?: string;
  name?: string;
  type?: string;
  parameter?: GTMParameter[];
  firingTriggerId?: string[];
  tagFiringOption?: string;
  fingerprint?: string;
  path?: string;
};

type GTMTrigger = {
  triggerId?: string;
  name?: string;
  type?: string;
  filter?: GTMCondition[];
  customEventFilter?: GTMCondition[];
  fingerprint?: string;
};

type GTMVariable = {
  variableId?: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
  fingerprint?: string;
};

type GTMTemplate = {
  templateId?: string;
  name?: string;
  templateData?: string;
  galleryReference?: {
    host?: string;
    owner?: string;
    repository?: string;
    templateDeveloperId?: string;
    galleryTemplateId?: string;
  };
};

type Ids = {
  accountId: string;
  containerId: string;
  workspaceId: string;
};

/* -------------------------------------------------------------------------- */
/* Low-level helpers                                                          */
/* -------------------------------------------------------------------------- */

async function gtmRequest<T>(
  token: string,
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {}
): Promise<T> {
  const response = await fetch(
    `https://tagmanager.googleapis.com/tagmanager/v2/${path}`,
    {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      cache: "no-store",
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    let message = responseText;

    try {
      const parsed = JSON.parse(responseText);
      message = parsed?.error?.message || parsed?.message || responseText;
    } catch {
      // Keep the original response text.
    }

    throw new Error(
      `Google Tag Manager API request failed (${response.status}): ${message}`
    );
  }

  if (!responseText.trim()) return {} as T;

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`GTM returned an invalid JSON response for ${path}.`);
  }
}

function parent(ids: Ids) {
  return (
    `accounts/${ids.accountId}` +
    `/containers/${ids.containerId}` +
    `/workspaces/${ids.workspaceId}`
  );
}

function template(key: string, value: string): GTMParameter {
  return { type: "TEMPLATE", key, value };
}

function bool(key: string, value: boolean): GTMParameter {
  return { type: "BOOLEAN", key, value: String(value) };
}

function mergeParameters(
  base: GTMParameter[],
  overrides: GTMParameter[]
): GTMParameter[] {
  const overrideKeys = new Set(overrides.map((parameter) => parameter.key));
  return [
    ...base.filter(
      (parameter) =>
        !parameter.key || !overrideKeys.has(parameter.key)
    ),
    ...overrides,
  ];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The UI accepts the value supplied by the user. GTM can still reject values
 * that do not satisfy the Google Tag type's own requirements.
 */
function validateWebMeasurementId(value: string) {
  const measurementId = value.trim();
  if (measurementId.length > 10) {
    throw new Error("Web Measurement ID cannot exceed 10 characters.");
  }
  return measurementId;
}

function validateServerMeasurementId(value: string) {
  const measurementId = value.trim();
  if (!measurementId) {
    throw new Error("Server Measurement ID is required when GA4 is selected.");
  }
  if (measurementId.length > 10) {
    throw new Error("Server Measurement ID cannot exceed 10 characters.");
  }
  return measurementId;
}

async function listAll<T>(
  token: string,
  path: string,
  field: string
): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;

  do {
    const query = pageToken
      ? `?pageToken=${encodeURIComponent(pageToken)}`
      : "";
    const result = await gtmRequest<
      Record<string, unknown> & { nextPageToken?: string }
    >(token, `${path}${query}`);
    const page = result[field];

    if (Array.isArray(page)) items.push(...(page as T[]));
    pageToken = result.nextPageToken;
  } while (pageToken);

  return items;
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                       */
/* -------------------------------------------------------------------------- */

async function listTags(token: string, ids: Ids) {
  return listAll<GTMTag>(token, `${parent(ids)}/tags`, "tag");
}

async function saveTag(
  token: string,
  ids: Ids,
  existing: GTMTag | undefined,
  desired: GTMTag
) {
  if (existing?.tagId) {
    return gtmRequest<GTMTag>(
      token,
      `${parent(ids)}/tags/${existing.tagId}`,
      {
        method: "PUT",
        body: {
          ...existing,
          ...desired,
          tagId: existing.tagId,
        },
      }
    );
  }

  return gtmRequest<GTMTag>(token, `${parent(ids)}/tags`, {
    method: "POST",
    body: desired,
  });
}

export async function debugListServerTags(token: string, ids: Ids) {
  const tags = await listTags(token, ids);
  return tags.map((tag) => ({
    tagId: tag.tagId,
    name: tag.name,
    type: tag.type,
    parameter: tag.parameter,
    firingTriggerId: tag.firingTriggerId,
    tagFiringOption: tag.tagFiringOption,
  }));
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

async function listTemplates(token: string, ids: Ids) {
  return listAll<GTMTemplate>(
    token,
    `${parent(ids)}/templates`,
    "template"
  );
}

export async function debugListServerTemplates(token: string, ids: Ids) {
  const templates = await listTemplates(token, ids);
  return templates.map((item) => ({
    templateId: item.templateId,
    name: item.name,
    galleryReference: item.galleryReference,
  }));
}

/* -------------------------------------------------------------------------- */
/* Variables                                                                  */
/* -------------------------------------------------------------------------- */

async function listVariables(token: string, ids: Ids) {
  return listAll<GTMVariable>(
    token,
    `${parent(ids)}/variables`,
    "variable"
  );
}

const PLATFORM_PARAMETER_NAMES: Record<string, string> = {
  kp_ga4: "ga4",
  ga4: "ga4",
  meta: "meta",
  linkedin: "linkedin",
  tiktok: "tiktok",
};

const TRACKING_PLATFORMS_PARAMETER = "tracking_platforms";

function platformsParameterValue(platforms: string[]) {
  return [
    ...new Set(
      platforms
        .map((platform) => PLATFORM_PARAMETER_NAMES[platform])
        .filter((platform): platform is string => Boolean(platform))
    ),
  ].join(",");
}

/**
 * Creates/updates the Web GTM Configuration Settings Variable.
 * The selected platforms and server URL are sent together to the Google Tag.
 */
async function getOrCreateServerUrlVariable(
  token: string,
  ids: Ids,
  serverUrl: string,
  platforms: string[] = []
) {
  const platformsValue = platformsParameterValue(platforms);
  const variables = await listVariables(token, ids);
  const name = "Automation - Server Container URL";

  const desired: GTMVariable = {
    name,
    type: "gtcs",
    parameter: [
      {
        type: "LIST",
        key: "configSettingsTable",
        list: [
          {
            type: "MAP",
            map: [
              template("parameter", "server_container_url"),
              template("parameterValue", serverUrl),
            ],
          },
          ...(platformsValue
            ? [
                {
                  type: "MAP",
                  map: [
                    template("parameter", TRACKING_PLATFORMS_PARAMETER),
                    template("parameterValue", platformsValue),
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };

  const existing = variables.find((item) => item.name === name);

  if (existing?.variableId) {
    return gtmRequest<GTMVariable>(
      token,
      `${parent(ids)}/variables/${existing.variableId}`,
      {
        method: "PUT",
        body: {
          ...existing,
          ...desired,
          variableId: existing.variableId,
        },
      }
    );
  }

  return gtmRequest<GTMVariable>(
    token,
    `${parent(ids)}/variables`,
    {
      method: "POST",
      body: desired,
    }
  );
}

/** Creates or updates a Constant variable, used by the server GA4 tag helper. */
async function upsertConstantVariable(
  token: string,
  ids: Ids,
  name: string,
  value: string
) {
  const variables = await listVariables(token, ids);
  const existing = variables.find((item) => item.name === name);
  const desired: GTMVariable = {
    name,
    type: "c",
    parameter: [template("value", value)],
  };

  if (existing?.variableId) {
    return gtmRequest<GTMVariable>(
      token,
      `${parent(ids)}/variables/${existing.variableId}`,
      {
        method: "PUT",
        body: {
          ...existing,
          ...desired,
          variableId: existing.variableId,
        },
      }
    );
  }

  return gtmRequest<GTMVariable>(token, `${parent(ids)}/variables`, {
    method: "POST",
    body: desired,
  });
}

/* -------------------------------------------------------------------------- */
/* Triggers                                                                   */
/* -------------------------------------------------------------------------- */

async function listTriggers(token: string, ids: Ids) {
  return listAll<GTMTrigger>(
    token,
    `${parent(ids)}/triggers`,
    "trigger"
  );
}

export async function debugListServerTriggers(token: string, ids: Ids) {
  const triggers = await listTriggers(token, ids);
  return triggers.map((trigger) => ({
    triggerId: trigger.triggerId,
    name: trigger.name,
    type: trigger.type,
    filter: trigger.filter,
    customEventFilter: trigger.customEventFilter,
  }));
}

async function getOrCreatePageViewTrigger(
  token: string,
  ids: Ids
) {
  const triggers = await listTriggers(token, ids);
  const name = "Automation - All Pages";
  const existing = triggers.find((item) => item.name === name);

  if (existing?.triggerId) return existing.triggerId;

  const created = await gtmRequest<GTMTrigger>(
    token,
    `${parent(ids)}/triggers`,
    {
      method: "POST",
      body: { name, type: "pageview" },
    }
  );

  if (!created.triggerId) {
    throw new Error("Could not create the All Pages trigger.");
  }

  return created.triggerId;
}

const SERVER_TRIGGER_CLIENT_NAME = "GA4";
const SERVER_TRIGGER_NAME = `Automation - Client ${SERVER_TRIGGER_CLIENT_NAME}`;

function serverClientTriggerBody(type: string) {
  return {
    name: SERVER_TRIGGER_NAME,
    type,
    filter: [
      {
        type: "equals",
        parameter: [
          template("arg0", "{{Client Name}}"),
          template("arg1", SERVER_TRIGGER_CLIENT_NAME),
        ],
      },
    ],
  };
}

function triggerMatchesClientCondition(
  trigger: GTMTrigger,
  type: string
) {
  if (trigger.type !== type) return false;

  return Boolean(
    trigger.filter?.some((condition) => {
      const params = condition.parameter || [];
      const arg0 = params.find((item) => item.key === "arg0")?.value;
      const arg1 = params.find((item) => item.key === "arg1")?.value;

      return (
        condition.type === "equals" &&
        arg0 === "{{Client Name}}" &&
        arg1 === SERVER_TRIGGER_CLIENT_NAME
      );
    })
  );
}

async function ensureClientNameBuiltInVariable(
  token: string,
  ids: Ids
) {
  try {
    await gtmRequest(
      token,
      `${parent(ids)}/built_in_variables?type=clientName`,
      { method: "POST" }
    );
  } catch {
    // Already enabled, or not toggleable here.
  }
}

export async function getOrCreateServerEventTrigger(
  token: string,
  ids: Ids,
  _eventName?: string
) {
  void _eventName;
  const triggers = await listTriggers(token, ids);

  const reference = triggers.find(
    (item) =>
      !item.name?.startsWith("Automation - ") &&
      item.type !== "customEvent" &&
      item.filter?.some((condition) =>
        condition.parameter?.some(
          (param) =>
            param.key === "arg0" &&
            /\{\{\s*(event|client) name\s*\}\}/i.test(param.value || "")
        )
      )
  );

  const customType = reference?.type || "always";
  await ensureClientNameBuiltInVariable(token, ids);

  const existing = triggers.find(
    (item) => item.name === SERVER_TRIGGER_NAME
  );

  if (existing?.triggerId) {
    if (triggerMatchesClientCondition(existing, customType)) {
      return {
        action: "reused" as const,
        triggerId: existing.triggerId,
        name: SERVER_TRIGGER_NAME,
        triggerType: customType,
        condition: `{{Client Name}} equals ${SERVER_TRIGGER_CLIENT_NAME}`,
      };
    }

    try {
      await gtmRequest<GTMTrigger>(
        token,
        `${parent(ids)}/triggers/${existing.triggerId}`,
        {
          method: "PUT",
          body: {
            ...existing,
            ...serverClientTriggerBody(customType),
            customEventFilter: undefined,
            triggerId: existing.triggerId,
          },
        }
      );

      return {
        action: "updated" as const,
        triggerId: existing.triggerId,
        name: SERVER_TRIGGER_NAME,
        triggerType: customType,
        condition: `{{Client Name}} equals ${SERVER_TRIGGER_CLIENT_NAME}`,
      };
    } catch (error) {
      throw new Error(
        `Trigger "${SERVER_TRIGGER_NAME}" could not be updated. ` +
        `Delete it in GTM and run again. ${errorMessage(error)}`
      );
    }
  }

  try {
    const created = await gtmRequest<GTMTrigger>(
      token,
      `${parent(ids)}/triggers`,
      {
        method: "POST",
        body: serverClientTriggerBody(customType),
      }
    );

    if (!created.triggerId) {
      throw new Error("GTM did not return a trigger ID.");
    }

    return {
      action: "created" as const,
      triggerId: created.triggerId,
      name: created.name || SERVER_TRIGGER_NAME,
      triggerType: customType,
      condition: `{{Client Name}} equals ${SERVER_TRIGGER_CLIENT_NAME}`,
    };
  } catch (error) {
    throw new Error(
      `Could not create Server GTM trigger "${SERVER_TRIGGER_NAME}". ` +
      errorMessage(error)
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Measurement ID handling                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Tries a literal Measurement ID first for standard GA4 IDs. For other input,
 * it tries a Constant variable reference first. The GTM tag template can still
 * reject either representation; no ID is silently replaced or omitted.
 */
async function saveTagWithMeasurementId(
  token: string,
  ids: Ids,
  existing: GTMTag | undefined,
  measurementId: string,
  variableName: string,
  build: (measurementRef: string) => GTMTag
) {
  const isStandard = /^G-[A-Z0-9]{6,12}$/i.test(measurementId);
  const modes: Array<"direct" | "variable"> = isStandard
    ? ["direct", "variable"]
    : ["variable", "direct"];

  const errors: string[] = [];

  for (const mode of modes) {
    try {
      let measurementRef = measurementId;

      if (mode === "variable") {
        const variable = await upsertConstantVariable(
          token,
          ids,
          variableName,
          measurementId
        );
        measurementRef = `{{${variable.name}}}`;
      }

      const saved = await saveTag(
        token,
        ids,
        existing,
        build(measurementRef)
      );

      return { saved, mode };
    } catch (error) {
      const message = errorMessage(error);
      errors.push(`${mode}: ${message}`);

      // Do not retry unrelated API errors. Retry only a 400 response.
      if (!message.includes("(400)") || /duplicate name/i.test(message)) {
        throw error;
      }
    }
  }

  throw new Error(errors.join(" | "));
}

/* -------------------------------------------------------------------------- */
/* Web container: Google Tag                                                  */
/* -------------------------------------------------------------------------- */

export async function configureWebGtag(
  token: string,
  ids: Ids,
  measurementId: string,
  serverUrl: string,
  platforms: string[] = []
) {
  const cleanMeasurementId = validateWebMeasurementId(measurementId);

  if (!cleanMeasurementId) {
    throw new Error("Web Measurement ID is required.");
  }

  let cleanServerUrl: string;

  try {
    const parsedUrl = new URL(serverUrl);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("The Server Container URL must use HTTPS.");
    }
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error("The Server Container URL must not contain credentials.");
    }

    cleanServerUrl = parsedUrl.origin;
  } catch (error) {
    throw new Error(`Invalid Server Container URL: ${errorMessage(error)}`);
  }

  const variable = await getOrCreateServerUrlVariable(
    token,
    ids,
    cleanServerUrl,
    platforms
  );

  const tags = await listTags(token, ids);
  const existing = tags.find(
    (tag) =>
      tag.name === "Automation - Google Tag" &&
      tag.type === "googtag"
  );

  const triggerId = await getOrCreatePageViewTrigger(token, ids);

  const { saved, mode } = await saveTagWithMeasurementId(
    token,
    ids,
    existing,
    cleanMeasurementId,
    "Automation - Web GA4 Measurement ID",
    (measurementRef) => ({
      name: "Automation - Google Tag",
      type: "googtag",
      parameter: [
        template("tagId", measurementRef),
        template(
          "configSettingsVariable",
          `{{${variable.name}}}`
        ),
      ],
      firingTriggerId: existing?.firingTriggerId?.length
        ? existing.firingTriggerId
        : [triggerId],
    })
  );

  return {
    action: existing ? ("updated" as const) : ("created" as const),
    tagId: saved.tagId,
    name: saved.name,
    type: saved.type,
    serverUrl: cleanServerUrl,
    configVariable: variable.name,
    trackingPlatforms: platformsParameterValue(platforms),
    measurementIdMode: mode,
  };
}

/* -------------------------------------------------------------------------- */
/* Server container: GA4 event tag                                             */
/* -------------------------------------------------------------------------- */

export async function configureServerGa4EventTag(
  token: string,
  ids: Ids,
  eventName: string,
  triggerId: string | undefined,
  measurementId: string
) {
  const cleanMeasurementId = validateServerMeasurementId(measurementId);
  const tags = await listTags(token, ids);
  const name = `Automation - GA4 - ${eventName}`;
  const existing = tags.find((item) => item.name === name);

  try {
    const { saved, mode } = await saveTagWithMeasurementId(
      token,
      ids,
      existing,
      cleanMeasurementId,
      "Automation - Server GA4 Measurement ID",
      (measurementRef) => ({
        name,
        type: "sgtmgaaw",
        parameter: [
          template("measurementId", measurementRef),
          template("eventName", "{{Event Name}}"),
          template("epToIncludeDropdown", "all"),
          template("upToIncludeDropdown", "all"),
          bool("redactVisitorIp", true),
        ],
        ...(triggerId ? { firingTriggerId: [triggerId] } : {}),
        tagFiringOption: "oncePerEvent",
      })
    );

    return {
      action: existing ? ("updated" as const) : ("created" as const),
      tagId: saved.tagId,
      name: saved.name,
      type: saved.type,
      measurementIdMode: mode,
    };
  } catch (error) {
    throw new Error(
      `Server GA4 tag "${name}" could not be saved. ` +
      `Measurement ID supplied: "${cleanMeasurementId}". ` +
      errorMessage(error)
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Server container: Meta, TikTok and LinkedIn platform tags                   */
/* -------------------------------------------------------------------------- */

export type ServerPlatform = "meta" | "tiktok" | "linkedin";

const PLATFORM_TEMPLATES: Record<
  ServerPlatform,
  {
    label: string;
    owner: string;
    repository: string;
    nameMatch: RegExp;
  }
> = {
  meta: {
    label: "Meta",
    owner: "stape-io",
    repository: "facebook-tag",
    nameMatch: /facebook.*conversion|meta.*conversion/i,
  },
  tiktok: {
    label: "TikTok",
    owner: "tiktok",
    repository: "gtm-template-eapi",
    nameMatch: /tiktok.*events api/i,
  },
  linkedin: {
    label: "LinkedIn",
    owner: "stape-io",
    repository: "linkedin-tag",
    nameMatch: /linkedin.*(conversion|capi)/i,
  },
};

function findPlatformTemplate(
  templates: GTMTemplate[],
  platform: ServerPlatform
) {
  const config = PLATFORM_TEMPLATES[platform];

  return templates.find((item) => {
    const ref = item.galleryReference;

    if (
      ref?.owner?.toLowerCase() === config.owner &&
      ref?.repository?.toLowerCase() === config.repository
    ) {
      return true;
    }

    return config.nameMatch.test(item.name || "");
  });
}

export async function ensureServerPlatformTemplate(
  token: string,
  ids: Ids,
  platform: ServerPlatform
) {
  const config = PLATFORM_TEMPLATES[platform];
  const templates = await listTemplates(token, ids);
  const existing = findPlatformTemplate(templates, platform);

  if (existing?.templateId) {
    return {
      action: "reused" as const,
      platform,
      templateId: existing.templateId,
      name: existing.name,
      message: "This template is already add to the workspace ",
    };
  }

  const query =
    `galleryOwner=${encodeURIComponent(config.owner)}` +
    `&galleryRepository=${encodeURIComponent(config.repository)}` +
    `&acknowledgePermissions=true`;

  try {
    const imported = await gtmRequest<GTMTemplate>(
      token,
      `${parent(ids)}/templates:import_from_gallery?${query}`,
      { method: "POST" }
    );

    if (!imported.templateId) {
      throw new Error("GTM did not return a template ID.");
    }

    const afterImport = await listTemplates(token, ids);
    if (!findPlatformTemplate(afterImport, platform)) {
      throw new Error(
        "Import call succeeded, but the template was not found afterwards."
      );
    }

    return {
      action: "imported" as const,
      platform,
      templateId: imported.templateId,
      name: imported.name,
      message:
        `${config.label} template was imported from the Community Template Gallery ` +
        `(${config.owner}/${config.repository}).`,
    };
  } catch (error) {
    throw new Error(
      `Could not import the ${config.label} template ` +
      `(${config.owner}/${config.repository}). ` +
      `Add it manually in Templates > Tag Templates > Search Gallery and run again. ` +
      errorMessage(error)
    );
  }
}

async function configureServerPlatformTag(
  token: string,
  ids: Ids,
  platform: ServerPlatform,
  eventName: string,
  triggerId: string | undefined,
  parameters: GTMParameter[]
) {
  const config = PLATFORM_TEMPLATES[platform];
  const [templates, tags] = await Promise.all([
    listTemplates(token, ids),
    listTags(token, ids),
  ]);

  const platformTemplate = findPlatformTemplate(templates, platform);
  if (!platformTemplate?.templateId) {
    throw new Error(
      `The ${config.label} tag template is not installed in the Server GTM container.`
    );
  }

  const name = `Automation - ${config.label} - ${eventName}`;

  let fullTemplate: GTMTemplate | undefined;
  try {
    fullTemplate = await gtmRequest<GTMTemplate>(
      token,
      `${parent(ids)}/templates/${platformTemplate.templateId}`
    );
  } catch {
    // Fall back to the list response.
  }

  const galleryRef =
    fullTemplate?.galleryReference || platformTemplate.galleryReference;

  const publicIdInTemplate = fullTemplate?.templateData?.match(
    /"id"\s*:\s*"(cvt_[A-Za-z0-9_]+)"/
  )?.[1];

  const candidateTypes = [
    galleryRef?.templateDeveloperId && galleryRef?.galleryTemplateId
      ? `cvt_${galleryRef.templateDeveloperId}_${galleryRef.galleryTemplateId}`
      : undefined,
    galleryRef?.galleryTemplateId
      ? `cvt_${galleryRef.galleryTemplateId}`
      : undefined,
    publicIdInTemplate && publicIdInTemplate !== "cvt_temp_public_id"
      ? publicIdInTemplate
      : undefined,
    `cvt_${ids.containerId}_${platformTemplate.templateId}`,
  ].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index
  );

  // First reuse the exact automation tag. This is the normal path on every
  // subsequent Connect click and prevents duplicate tags for the same event.
  let existing = tags.find((item) => item.name === name);

  // Also recognise tags previously created by older versions of the app or
  // named manually, e.g. "Meta - page_view" / "LinkedIn - page_view".
  // Only match tags belonging to this platform's template type.
  if (!existing) {
    const platformEventPattern = new RegExp(
      `${config.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*${eventName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i"
    );
    existing = tags.find(
      (item) =>
        Boolean(item.tagId) &&
        Boolean(item.type && candidateTypes.includes(item.type)) &&
        platformEventPattern.test(item.name || "")
    );
  }

  // If this workspace already has a tag using the installed template, reuse
  // that tag as the initial reference instead of creating another one. Once
  // renamed to the automation name, future runs find it through the exact-name
  // match above. Do not use an unrelated tag with a different custom type.
  const reference = tags.find(
    (item) =>
      item.name !== name &&
      Boolean(item.tagId) &&
      Boolean(
        item.type &&
        (
          candidateTypes.includes(item.type) ||
          (item.type.startsWith("cvt_") &&
            (item.type.endsWith(`_${platformTemplate.templateId}`) ||
              item.type.endsWith(`_${galleryRef?.galleryTemplateId}`)))
        )
      ) &&
      !item.name?.startsWith("Automation - ")
  );

  if (!existing && reference) {
    existing = reference;
  }

  // Prefer parameters from the tag being updated. Otherwise, preserve the
  // installed reference tag's template parameters and override only the keys
  // supplied by this automation.
  const baseParameters = existing?.parameter || reference?.parameter || [];
  const attemptErrors: string[] = [];

  for (const tagType of [
    existing?.type,
    ...candidateTypes,
  ].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index
  )) {
    const desired: GTMTag = {
      name,
      type: tagType,
      parameter: mergeParameters(baseParameters, parameters),
      ...(triggerId ? { firingTriggerId: [triggerId] } : {}),
      tagFiringOption: "oncePerEvent",
    };

    try {
      const saved = await saveTag(token, ids, existing, desired);
      return {
        action: existing ? ("updated" as const) : ("created" as const),
        tagId: saved.tagId,
        name: saved.name,
        type: saved.type,
        reusedExistingTag: Boolean(existing),
        usedReferenceTag: Boolean(reference && existing === reference),
      };
    } catch (error) {
      const message = errorMessage(error);
      attemptErrors.push(`type "${tagType}": ${message}`);

      // If updating an existing tag failed because GTM does not recognise its
      // type, do not silently create a second tag. Report the failure instead.
      if (existing?.tagId || !/unknown entity type|vendorTemplate\.key/i.test(message)) {
        throw new Error(
          `Server ${config.label} tag "${name}" could not be saved ` +
          `(template type "${tagType}"). ${message}`
        );
      }
    }
  }

  throw new Error(
    `Server ${config.label} tag "${name}" could not be saved because GTM did not ` +
    `recognise the template tag type. Template reference: ` +
    `${JSON.stringify(galleryRef ?? null)}. Attempts: ${attemptErrors.join(" | ")}`
  );
}

export type MetaConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
};

export async function configureServerMetaEventTag(
  token: string,
  ids: Ids,
  eventName: string,
  triggerId: string | undefined,
  config: MetaConfig
) {
  const pixelId = config.pixelId?.trim();
  const accessToken = config.accessToken?.trim();
  const testEventCode = config.testEventCode?.trim();

  // Credentials are optional at creation time. Add them later in GTM or
  // reconnect with values; the tag shell can still be created now.

  return configureServerPlatformTag(
    token,
    ids,
    "meta",
    eventName,
    triggerId,
    [
      template("inheritEventName", "inherit"),
      template("actionSource", "website"),
      ...(pixelId ? [template("pixelId", pixelId)] : []),
      ...(accessToken ? [template("accessToken", accessToken)] : []),
      ...(testEventCode ? [template("testId", testEventCode)] : []),
    ]
  );
}

export type TikTokConfig = {
  pixelId: string;
  accessToken?: string;
  testEventCode?: string;
};

export async function configureServerTikTokEventTag(
  token: string,
  ids: Ids,
  eventName: string,
  triggerId: string | undefined,
  config: TikTokConfig
) {
  const pixelId = config.pixelId?.trim();
  const accessToken = config.accessToken?.trim();
  const testEventCode = config.testEventCode?.trim();

  // Pixel ID and token may be supplied later; keep initial tag creation possible.

  return configureServerPlatformTag(
    token,
    ids,
    "tiktok",
    eventName,
    triggerId,
    [
      ...(pixelId ? [template("pixel_code", pixelId)] : []),
      template("event", "{{Event Name}}"),
      ...(accessToken ? [template("access_token", accessToken)] : []),
      ...(testEventCode
        ? [template("test_event_code", testEventCode)]
        : []),
    ]
  );
}

export type LinkedInConfig = {
  accessToken: string;
  partnerId?: string;
  conversionRuleId: string;
};

export async function configureServerLinkedInEventTag(
  token: string,
  ids: Ids,
  eventName: string,
  triggerId: string | undefined,
  config: LinkedInConfig
) {
  const accessToken = config.accessToken?.trim();
  const conversionRuleId = config.conversionRuleId?.trim();

  // LinkedIn credentials can be completed after the template tag is created.

  return configureServerPlatformTag(
    token,
    ids,
    "linkedin",
    eventName,
    triggerId,
    [
      template("type", "conversion"),
      ...(accessToken ? [template("accessToken", accessToken)] : []),
      ...(conversionRuleId ? [template("conversionRuleUrn", conversionRuleId)] : []),
    ]
  );
}

/* -------------------------------------------------------------------------- */
/* Server GA4 Client verification                                              */
/* -------------------------------------------------------------------------- */

export async function verifyServerGa4Client(
  token: string,
  ids: Ids
) {
  const clients = await listAll<{
    clientId?: string;
    name?: string;
    type?: string;
  }>(token, `${parent(ids)}/clients`, "client");

  const client = clients.find(
    (item) =>
      item.type === "gaaw_client" ||
      /google analytics|ga4/i.test(`${item.name || ""} ${item.type || ""}`)
  );

  if (!client) {
    throw new Error(
      "A GA4-compatible Server GTM Client is missing. " +
      "Add a supported Google Analytics Client to this workspace, then run automation again."
    );
  }

  return {
    clientId: client.clientId,
    name: client.name,
    type: client.type,
  };
}
