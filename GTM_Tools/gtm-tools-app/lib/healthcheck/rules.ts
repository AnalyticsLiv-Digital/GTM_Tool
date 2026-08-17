import {
  GTMHealthData,
  HealthCheckResult,
  AffectedItem,
} from "./types";

// =====================================================
// BASIC HELPERS
// =====================================================

const getString = (
  obj: Record<string, unknown>,
  key: string
): string => {
  const value = obj[key];

  return typeof value === "string" ? value : "";
};

const getArray = (
  obj: Record<string, unknown>,
  key: string
): unknown[] => {
  const value = obj[key];

  return Array.isArray(value) ? value : [];
};

const getParamValue = (
  obj: Record<string, unknown>,
  key: string
): string => {
  const params = getArray(obj, "parameter");

  const found = params.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      getString(
        item as Record<string, unknown>,
        "key"
      ) === key
  );

  return found
    ? getString(
        found as Record<string, unknown>,
        "value"
      )
    : "";
};

const getType = (
  obj: Record<string, unknown>
): string => {
  return getString(obj, "type").toLowerCase();
};

export const getTagId = (
  tag: Record<string, unknown>
): string => {
  return getString(tag, "tagId");
};

const getTriggerId = (
  trigger: Record<string, unknown>
): string => {
  return getString(trigger, "triggerId");
};

export const getVariableId = (
  variable: Record<string, unknown>
): string => {
  return getString(variable, "variableId");
};

const getFiringTriggerIds = (
  tag: Record<string, unknown>
): string[] => {
  return getArray(tag, "firingTriggerId").filter(
    (id): id is string => typeof id === "string"
  );
};

const getBlockingTriggerIds = (
  tag: Record<string, unknown>
): string[] => {
  return getArray(tag, "blockingTriggerId").filter(
    (id): id is string => typeof id === "string"
  );
};

// =====================================================
// GTM URL HELPERS
// =====================================================

const buildGTMListUrl = (
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
): string => {
  return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}`;
};

const buildGTMEditUrl = (
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string,
  id: string
): string => {
  return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}/${id}/edit`;
};

// =====================================================
// AFFECTED ITEM HELPERS
// =====================================================

const mapToAffectedItem = (
  item: Record<string, unknown>,
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
): AffectedItem => {
  const name =
    typeof item.name === "string"
      ? item.name
      : "Unnamed";

  const id =
    typeof item.tagId === "string"
      ? item.tagId
      : typeof item.triggerId === "string"
        ? item.triggerId
        : typeof item.variableId === "string"
          ? item.variableId
          : "";

  return {
    name,
    id,
    editUrl: id
      ? buildGTMEditUrl(
          type,
          accountId,
          containerId,
          workspaceId,
          id
        )
      : undefined,
  };
};

const mapTags = (
  items: Record<string, unknown>[],
  data: GTMHealthData
): AffectedItem[] => {
  return items.map((item) =>
    mapToAffectedItem(
      item,
      "tags",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

const mapTriggers = (
  items: Record<string, unknown>[],
  data: GTMHealthData
): AffectedItem[] => {
  return items.map((item) =>
    mapToAffectedItem(
      item,
      "triggers",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

const mapVariables = (
  items: Record<string, unknown>[],
  data: GTMHealthData
): AffectedItem[] => {
  return items.map((item) =>
    mapToAffectedItem(
      item,
      "variables",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

// =====================================================
// BUILT-IN TRIGGERS
// =====================================================

const BUILT_IN_TRIGGER_IDS = new Set([
  "2147479553",
  "2147479572",
  "2147479573",
]);

const isBuiltInTriggerId = (
  id: string
): boolean => {
  return BUILT_IN_TRIGGER_IDS.has(id);
};

const firesOnBuiltInAllPages = (
  triggerIds: string[]
): boolean => {
  return triggerIds.some((id) =>
    BUILT_IN_TRIGGER_IDS.has(id)
  );
};

// =====================================================
// TAG CLASSIFICATION
// =====================================================

const NON_GA4_GOOGTAG_PREFIXES = [
  "aw-",
  "dc-",
];

const isGA4ConfigTag = (
  tag: Record<string, unknown>
): boolean => {
  const type = getType(tag);

  if (type === "gaawc") {
    return true;
  }

  if (type === "googtag") {
    const tagId =
      getParamValue(tag, "tagId")
        .trim()
        .toLowerCase();

    return !NON_GA4_GOOGTAG_PREFIXES.some(
      (prefix) =>
        tagId.startsWith(prefix)
    );
  }

  return false;
};

const isGA4EventTag = (
  tag: Record<string, unknown>
): boolean => {
  return getType(tag) === "gaawe";
};

const isGoogleAdsTag = (
  tag: Record<string, unknown>
): boolean => {
  const type = getType(tag);

  if (
    type === "awct" ||
    type === "sp"
  ) {
    return true;
  }

  if (type === "googtag") {
    return getParamValue(
      tag,
      "tagId"
    )
      .trim()
      .toLowerCase()
      .startsWith("aw-");
  }

  return false;
};

const isConversionLinkerTag = (
  tag: Record<string, unknown>
): boolean => {
  return getType(tag) === "gclidw";
};

const isCustomHTMLTag = (
  tag: Record<string, unknown>
): boolean => {
  return getType(tag) === "html";
};

const isPurchaseTag = (
  tag: Record<string, unknown>
): boolean => {
  const name =
    getString(tag, "name")
      .toLowerCase();

  const eventName =
    getParamValue(
      tag,
      "eventName"
    ).toLowerCase();

  return (
    name.includes("purchase") ||
    eventName.includes("purchase")
  );
};

// =====================================================
// VARIABLE USAGE
// =====================================================

const buildUsageHaystack = (
  data: GTMHealthData
): string => {
  return (
    JSON.stringify(data.tags) +
    JSON.stringify(data.triggers) +
    JSON.stringify(data.variables)
  );
};

// =====================================================
// VARIABLE REFERENCE DETECTION
// =====================================================

const extractVariableReferences = (
  value: string
): string[] => {
  const matches =
    value.match(/\{\{([^}]+)\}\}/g);

  if (!matches) return [];

  return matches.map(
    (match) =>
      match
        .replace("{{", "")
        .replace("}}", "")
        .trim()
  );
};

const getMissingVariableReferences = (
  data: GTMHealthData
): Set<string> => {
  const existing = new Set(
    data.variables
      .map((variable) =>
        getString(variable, "name")
      )
      .filter(Boolean)
  );

  const references = new Set<string>();

  const scan = (
    value: unknown
  ): void => {
    if (typeof value === "string") {
      extractVariableReferences(
        value
      ).forEach((name) => {
        if (!existing.has(name)) {
          references.add(name);
        }
      });

      return;
    }

    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      Object.values(
        value as Record<string, unknown>
      ).forEach(scan);
    }
  };

  scan(data.tags);
  scan(data.triggers);
  scan(data.variables);

  return references;
};

const objectContainsMissingVariable = (
  object: Record<string, unknown>,
  missing: Set<string>
): boolean => {
  const json =
    JSON.stringify(object);

  return Array.from(missing).some(
    (name) =>
      json.includes(`{{${name}}}`)
  );
};

// =====================================================
// PLACEHOLDER NAME RULE
// =====================================================

const PLACEHOLDER_NAME_PATTERN =
  /^(test|testing|untitled|new tag|new trigger|new variable|copy|copy of.*|\d+)$/i;

// =====================================================
// HIGH RISK RULES
// =====================================================

export const healthCheckRules = [

  // ===================================================
  // HC_HR_001
  // ===================================================

  {
    id: "HC_HR_001",
    title: "Multiple GA4 Config Tags Found",
    description:
      "Only one primary GA4 configuration tag should exist.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const configs =
        data.tags.filter(
          isGA4ConfigTag
        );

      const passed =
        configs.length <= 1;

      return {
        id: "HC_HR_001",
        title:
          "Multiple GA4 Config Tags Found",
        description:
          "Only one primary GA4 configuration tag should exist.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                configs,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${configs.length} GA4 configuration tags. Keep one primary GA4 configuration.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_002
  // ===================================================

  {
    id: "HC_HR_002",
    title:
      "Google Ads Tag Without Conversion Linker",
    description:
      "Google Ads tags should have a Conversion Linker tag.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const adsTags =
        data.tags.filter(
          isGoogleAdsTag
        );

      const linker =
        data.tags.find(
          isConversionLinkerTag
        );

      const passed =
        adsTags.length === 0 ||
        Boolean(linker);

      return {
        id: "HC_HR_002",
        title:
          "Google Ads Tag Without Conversion Linker",
        description:
          "Google Ads tags should have a Conversion Linker tag.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                adsTags,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Add a Conversion Linker tag for Google Ads attribution.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_003
  // ===================================================

  {
    id: "HC_HR_003",
    title:
      "Purchase Trigger Firing Multiple Same Platform Tags",
    description:
      "A purchase trigger should not fire multiple same-platform purchase tags.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const purchaseTags =
        data.tags.filter(
          isPurchaseTag
        );

      const triggerMap =
        new Map<
          string,
          Record<string, unknown>[]
        >();

      purchaseTags.forEach(
        (tag) => {
          getFiringTriggerIds(
            tag
          ).forEach(
            (triggerId) => {
              if (
                !triggerMap.has(
                  triggerId
                )
              ) {
                triggerMap.set(
                  triggerId,
                  []
                );
              }

              triggerMap
                .get(triggerId)!
                .push(tag);
            }
          );
        }
      );

      const duplicateGroups =
        Array.from(
          triggerMap.values()
        ).filter(
          (tags) =>
            tags.filter(
              (tag) =>
                isGA4EventTag(tag) ||
                isGA4ConfigTag(tag)
            ).length > 1
        );

      const affected =
        duplicateGroups.flat();

      const passed =
        affected.length === 0;

      return {
        id: "HC_HR_003",
        title:
          "Purchase Trigger Firing Multiple Same Platform Tags",
        description:
          "A purchase trigger should not fire multiple same-platform purchase tags.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                affected,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review purchase triggers and remove duplicate same-platform purchase tags.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_004
  // ===================================================

  {
    id: "HC_HR_004",
    title:
      "Purchase Tag Has Multiple Triggers",
    description:
      "Purchase tags should ideally use a single clean purchase trigger.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) =>
            isPurchaseTag(tag) &&
            getFiringTriggerIds(tag)
              .length > 1
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_HR_004",
        title:
          "Purchase Tag Has Multiple Triggers",
        description:
          "Purchase tags should ideally use a single clean purchase trigger.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Purchase tags have multiple triggers. Consolidate the firing logic to avoid duplicate purchases.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_005
  // ===================================================

  {
    id: "HC_HR_005",
    title:
      "Custom HTML Missing Try Catch",
    description:
      "Custom HTML tags should use appropriate error handling.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const htmlTags =
        data.tags.filter(
          isCustomHTMLTag
        );

      const invalid =
        htmlTags.filter(
          (tag) => {
            const html =
              getParamValue(
                tag,
                "html"
              );

            if (!html.trim()) {
              return false;
            }

            return !/try\s*\{/i.test(
              html
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_HR_005",
        title:
          "Custom HTML Missing Try Catch",
        description:
          "Custom HTML tags should use appropriate error handling.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review Custom HTML scripts and add appropriate try-catch handling where runtime failures are possible.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_006
  // ===================================================

  {
    id: "HC_HR_006",
    title:
      "GA4 Event Without GA4 Configuration",
    description:
      "GA4 Event tags should have a valid GA4 Google tag configuration.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const events =
        data.tags.filter(
          isGA4EventTag
        );

      const configs =
        data.tags.filter(
          isGA4ConfigTag
        );

      const invalid =
        configs.length === 0
          ? events
          : [];

      const passed =
        invalid.length === 0;

      return {
        id: "HC_HR_006",
        title:
          "GA4 Event Without GA4 Configuration",
        description:
          "GA4 Event tags should have a valid GA4 Google tag configuration.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Create a valid GA4 Google tag configuration before firing GA4 Event tags.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_007
  // ===================================================

  {
    id: "HC_HR_007",
    title:
      "Missing Trigger Dependency",
    description:
      "Tags reference trigger IDs that do not exist in the workspace.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const triggerIds =
        new Set(
          data.triggers
            .map(getTriggerId)
            .filter(Boolean)
        );

      const invalid =
        data.tags.filter(
          (tag) =>
            getFiringTriggerIds(
              tag
            ).some(
              (id) =>
                !triggerIds.has(id) &&
                !isBuiltInTriggerId(id)
            )
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_HR_007",
        title:
          "Missing Trigger Dependency",
        description:
          "Tags reference trigger IDs that do not exist in the workspace.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Create the missing trigger or remove the broken trigger reference.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HC_HR_008
  // ===================================================

  {
    id: "HC_HR_008",
    title:
      "Missing Variable Dependency",
    description:
      "Tags or triggers reference variables that do not exist.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const missing =
        getMissingVariableReferences(
          data
        );

      const invalidTags =
        data.tags.filter(
          (tag) =>
            objectContainsMissingVariable(
              tag,
              missing
            )
        );

      const invalidTriggers =
        data.triggers.filter(
          (trigger) =>
            objectContainsMissingVariable(
              trigger,
              missing
            )
        );

      const passed =
        invalidTags.length === 0 &&
        invalidTriggers.length === 0;

      return {
        id: "HC_HR_008",
        title:
          "Missing Variable Dependency",
        description:
          "Tags or triggers reference variables that do not exist.",
        severity: "HIGH",
        passed,

        affectedTags:
          mapTags(
            invalidTags,
            data
          ),

        affectedTriggers:
          mapTriggers(
            invalidTriggers,
            data
          ),

        recommendation:
          passed
            ? ""
            : `Create or correct the missing variable references: ${Array.from(
                missing
              ).join(", ")}.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW HIGH-RISK RULE
  // ===================================================

  {
    id: "HC_HR_009",
    title:
      "Tag Fires and Blocks on the Same Trigger",
    description:
      "A tag cannot fire when the same trigger is also configured as a blocking trigger.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) => {
            const firing =
              new Set(
                getFiringTriggerIds(
                  tag
                )
              );

            const blocking =
              getBlockingTriggerIds(
                tag
              );

            return blocking.some(
              (id) =>
                firing.has(id)
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_HR_009",
        title:
          "Tag Fires and Blocks on the Same Trigger",
        description:
          "A tag cannot fire when the same trigger is also configured as a blocking trigger.",
        severity: "HIGH",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Remove the conflicting trigger from either firingTriggerId or blockingTriggerId.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // =====================================================
  // MEDIUM RISK RULES
  // =====================================================

  {
    id: "HC_MR_001",
    title:
      "Purchase Event Missing Ecommerce Parameters",
    description:
      "Purchase tags should contain transaction_id, value, currency and items.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const purchaseTags =
        data.tags.filter(
          isPurchaseTag
        );

      const invalid =
        purchaseTags.filter(
          (tag) => {
            const json =
              JSON.stringify(
                tag
              ).toLowerCase();

            return !(
              json.includes(
                "transaction_id"
              ) &&
              json.includes(
                "value"
              ) &&
              json.includes(
                "currency"
              ) &&
              json.includes(
                "items"
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_001",
        title:
          "Purchase Event Missing Ecommerce Parameters",
        description:
          "Purchase tags should contain transaction_id, value, currency and items.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Add transaction_id, value, currency and items to the purchase implementation.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_002",
    title:
      "GA4 Config Not Firing on All Pages",
    description:
      "GA4 configuration should fire on All Pages or Initialization.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const configs =
        data.tags.filter(
          isGA4ConfigTag
        );

      const invalid =
        configs.filter(
          (tag) => {
            const triggerIds =
              getFiringTriggerIds(
                tag
              );

            if (
              firesOnBuiltInAllPages(
                triggerIds
              )
            ) {
              return false;
            }

            const names =
              data.triggers
                .filter(
                  (trigger) =>
                    triggerIds.includes(
                      getTriggerId(
                        trigger
                      )
                    )
                )
                .map(
                  (trigger) =>
                    getString(
                      trigger,
                      "name"
                    ).toLowerCase()
                );

            return !names.some(
              (name) =>
                name.includes(
                  "all pages"
                ) ||
                name.includes(
                  "initialization"
                )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_002",
        title:
          "GA4 Config Not Firing on All Pages",
        description:
          "GA4 configuration should fire on All Pages or Initialization.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Fire the GA4 configuration on All Pages or Initialization.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_003",
    title:
      "Large Number of Custom JS Variables",
    description:
      "More than 25 Custom JavaScript variables detected.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const variables =
        data.variables.filter(
          (variable) =>
            getType(variable) ===
            "jsm"
        );

      const passed =
        variables.length <= 25;

      return {
        id: "HC_MR_003",
        title:
          "Large Number of Custom JS Variables",
        description:
          "More than 25 Custom JavaScript variables detected.",
        severity: "MEDIUM",
        passed,

        affectedVariables:
          passed
            ? []
            : mapVariables(
                variables,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${variables.length} Custom JavaScript variables. Reduce and consolidate JavaScript usage.`,

        gtmLinks: {
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_004",
    title:
      "Trigger Attached to Multiple Same Platform Tags",
    description:
      "A single trigger should not fire multiple same-platform GA4 tags.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const triggerMap =
        new Map<
          string,
          Record<string, unknown>[]
        >();

      data.tags.forEach(
        (tag) => {
          getFiringTriggerIds(
            tag
          ).forEach(
            (triggerId) => {
              if (
                !triggerMap.has(
                  triggerId
                )
              ) {
                triggerMap.set(
                  triggerId,
                  []
                );
              }

              triggerMap
                .get(triggerId)!
                .push(tag);
            }
          );
        }
      );

      const invalidIds =
        Array.from(
          triggerMap.entries()
        )
          .filter(
            ([, tags]) =>
              tags.filter(
                (tag) =>
                  isGA4EventTag(tag) ||
                  isGA4ConfigTag(tag)
              ).length > 1
          )
          .map(
            ([id]) => id
          );

      const invalid =
        data.triggers.filter(
          (trigger) =>
            invalidIds.includes(
              getTriggerId(
                trigger
              )
            )
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_004",
        title:
          "Trigger Attached to Multiple Same Platform Tags",
        description:
          "A single trigger should not fire multiple same-platform GA4 tags.",
        severity: "MEDIUM",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review duplicate GA4 tags attached to the same trigger.",

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_005",
    title:
      "Too Many All Pages Triggers",
    description:
      "More than three All Pages-like triggers may indicate unnecessary trigger duplication.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const allPages =
        data.triggers.filter(
          (trigger) => {
            const name =
              getString(
                trigger,
                "name"
              ).toLowerCase();

            return (
              name.includes(
                "all pages"
              ) ||
              name.includes(
                "all page"
              )
            );
          }
        );

      const passed =
        allPages.length <= 3;

      return {
        id: "HC_MR_005",
        title:
          "Too Many All Pages Triggers",
        description:
          "More than three All Pages-like triggers may indicate unnecessary trigger duplication.",
        severity: "MEDIUM",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                allPages,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${allPages.length} All Pages-like triggers. Consolidate duplicate page-view triggers where possible.`,

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_006",
    title:
      "Duplicate Trigger Names",
    description:
      "Triggers with duplicate names can make GTM maintenance difficult.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const groups =
        new Map<
          string,
          Record<string, unknown>[]
        >();

      data.triggers.forEach(
        (trigger) => {
          const name =
            getString(
              trigger,
              "name"
            )
              .trim()
              .toLowerCase();

          if (!name) return;

          if (!groups.has(name)) {
            groups.set(
              name,
              []
            );
          }

          groups
            .get(name)!
            .push(trigger);
        }
      );

      const invalid =
        Array.from(
          groups.values()
        )
          .filter(
            (group) =>
              group.length > 1
          )
          .flat();

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_006",
        title:
          "Duplicate Trigger Names",
        description:
          "Triggers with duplicate names can make GTM maintenance difficult.",
        severity: "MEDIUM",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Rename or consolidate duplicate triggers.",

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_MR_007",
    title:
      "Too Many Custom HTML Tags",
    description:
      "Large numbers of Custom HTML tags increase maintenance and execution risk.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const htmlTags =
        data.tags.filter(
          isCustomHTMLTag
        );

      const passed =
        htmlTags.length <= 5;

      return {
        id: "HC_MR_007",
        title:
          "Too Many Custom HTML Tags",
        description:
          "Large numbers of Custom HTML tags increase maintenance and execution risk.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                htmlTags,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${htmlTags.length} Custom HTML tags. Prefer native GTM templates where possible.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW: DUPLICATE/SIMILAR GA4 EVENT NAMES
  // ===================================================

  {
    id: "HC_MR_008",
    title:
      "Duplicate or Similar GA4 Event Names",
    description:
      "Multiple GA4 Event tags use the same or very similar event names.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const events =
        data.tags.filter(
          isGA4EventTag
        );

      const normalize =
        (value: string) =>
          value
            .trim()
            .toLowerCase()
            .replace(
              /[\s_-]+/g,
              ""
            );

      const groups =
        new Map<
          string,
          Record<string, unknown>[]
        >();

      events.forEach(
        (tag) => {
          const eventName =
            getParamValue(
              tag,
              "eventName"
            );

          if (!eventName) return;

          const key =
            normalize(
              eventName
            );

          if (!groups.has(key)) {
            groups.set(
              key,
              []
            );
          }

          groups
            .get(key)!
            .push(tag);
        }
      );

      const invalid =
        Array.from(
          groups.values()
        )
          .filter(
            (group) =>
              group.length > 1
          )
          .flat();

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_008",
        title:
          "Duplicate or Similar GA4 Event Names",
        description:
          "Multiple GA4 Event tags use the same or very similar event names.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review GA4 Event tags with duplicate or similar event names to prevent duplicate event collection.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW: GA4 EVENT MULTIPLE TRIGGERS
  // ===================================================

  {
    id: "HC_MR_009",
    title:
      "GA4 Event Tag Has Multiple Firing Triggers",
    description:
      "A GA4 Event tag with multiple firing triggers can cause unnecessary or duplicate executions.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) =>
            isGA4EventTag(tag) &&
            getFiringTriggerIds(
              tag
            ).length > 1
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_009",
        title:
          "GA4 Event Tag Has Multiple Firing Triggers",
        description:
          "A GA4 Event tag with multiple firing triggers can cause unnecessary or duplicate executions.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review multiple firing triggers attached to GA4 Event tags and consolidate them where possible.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW: TAGS ATTACHED TO PAUSED TRIGGERS
  // ===================================================

  {
    id: "HC_MR_010",
    title:
      "Tags Attached to Paused Triggers",
    description:
      "Active tags should not depend on paused triggers.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const pausedTriggerIds =
        new Set(
          data.triggers
            .filter(
              (trigger) =>
                Boolean(
                  trigger.paused
                )
            )
            .map(
              getTriggerId
            )
            .filter(Boolean)
        );

      const invalid =
        data.tags.filter(
          (tag) => {
            if (
              Boolean(
                tag.paused
              )
            ) {
              return false;
            }

            return getFiringTriggerIds(
              tag
            ).some(
              (id) =>
                pausedTriggerIds.has(
                  id
                )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_010",
        title:
          "Tags Attached to Paused Triggers",
        description:
          "Active tags should not depend on paused triggers.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review active tags attached to paused triggers and either activate the trigger or update the tag firing logic.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NON-ESSENTIAL ALL PAGES TAGS
  // ===================================================

  {
    id: "HC_MR_011",
    title:
      "Non-Essential Tags Firing on All Pages",
    description:
      "Non-core tags firing globally should be reviewed.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) => {
            if (
              Boolean(
                tag.paused
              )
            ) {
              return false;
            }

            if (
              isGA4ConfigTag(tag) ||
              isGA4EventTag(tag) ||
              isGoogleAdsTag(tag) ||
              isConversionLinkerTag(tag)
            ) {
              return false;
            }

            const ids =
              getFiringTriggerIds(
                tag
              );

            if (
              firesOnBuiltInAllPages(
                ids
              )
            ) {
              return true;
            }

            const names =
              data.triggers
                .filter(
                  (trigger) =>
                    ids.includes(
                      getTriggerId(
                        trigger
                      )
                    )
                )
                .map(
                  (trigger) =>
                    getString(
                      trigger,
                      "name"
                    ).toLowerCase()
                );

            return names.some(
              (name) =>
                name.includes(
                  "all pages"
                )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_011",
        title:
          "Non-Essential Tags Firing on All Pages",
        description:
          "Non-core tags firing globally should be reviewed.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review non-core tags firing on All Pages and narrow their triggers where possible.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // HARDCODED GA4 MEASUREMENT ID
  // ===================================================

  {
    id: "HC_MR_012",
    title:
      "Hardcoded Measurement ID Detected",
    description:
      "GA4 measurement IDs should be centralized where reuse is beneficial.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const pattern =
        /^G-[A-Z0-9]{6,}$/i;

      const invalid =
        data.tags.filter(
          (tag) => {
            if (
              !isGA4ConfigTag(tag)
            ) {
              return false;
            }

            const id =
              getParamValue(
                tag,
                "tagId"
              ).trim();

            return (
              pattern.test(id) &&
              !id.includes(
                "{{"
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_012",
        title:
          "Hardcoded Measurement ID Detected",
        description:
          "GA4 measurement IDs should be centralized where reuse is beneficial.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Consider storing reusable GA4 measurement IDs in a GTM variable.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // SUSPICIOUS CUSTOM HTML
  // ===================================================

  {
    id: "HC_MR_013",
    title:
      "Suspicious Custom HTML Detected",
    description:
      "Custom HTML contains potentially risky JavaScript patterns.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) => {
            if (
              !isCustomHTMLTag(
                tag
              )
            ) {
              return false;
            }

            const html =
              getParamValue(
                tag,
                "html"
              ).toLowerCase();

            return (
              html.includes(
                "document.write"
              ) ||
              html.includes(
                "eval("
              ) ||
              html.includes(
                "innerhtml"
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_013",
        title:
          "Suspicious Custom HTML Detected",
        description:
          "Custom HTML contains potentially risky JavaScript patterns.",
        severity: "MEDIUM",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review Custom HTML for document.write, eval(), innerHTML, or other risky JavaScript patterns.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // BROAD REGEX TRIGGERS
  // ===================================================

  {
    id: "HC_MR_014",
    title:
      "Broad Regex Trigger Detected",
    description:
      "Overly broad regular expressions can cause unintended tag firing.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.triggers.filter(
          (trigger) => {
            const json =
              JSON.stringify(
                trigger
              ).toLowerCase();

            return (
              json.includes(
                ".*"
              ) ||
              json.includes(
                ".+"
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_014",
        title:
          "Broad Regex Trigger Detected",
        description:
          "Overly broad regular expressions can cause unintended tag firing.",
        severity: "MEDIUM",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Review broad regex conditions and replace unrestricted patterns with narrower matching rules.",

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // CUSTOM EVENT WITHOUT EVENT NAME
  // ===================================================

  {
    id: "HC_MR_015",
    title:
      "Custom Event Trigger Missing Event Name",
    description:
      "Custom Event triggers should define the event they listen for.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.triggers.filter(
          (trigger) => {
            if (
              getType(
                trigger
              ) !==
              "customevent"
            ) {
              return false;
            }

            return !getParamValue(
              trigger,
              "eventName"
            ).trim();
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_MR_015",
        title:
          "Custom Event Trigger Missing Event Name",
        description:
          "Custom Event triggers should define the event they listen for.",
        severity: "MEDIUM",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : "Define the custom event name for each Custom Event trigger.",

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // =====================================================
  // LOW RISK RULES
  // =====================================================

  {
    id: "HC_LR_001",
    title:
      "Unused Tags Found",
    description:
      "Tags without firing triggers should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) =>
            getFiringTriggerIds(
              tag
            ).length === 0 &&
            !Boolean(
              tag.paused
            )
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_001",
        title:
          "Unused Tags Found",
        description:
          "Tags without firing triggers should be reviewed.",
        severity: "LOW",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} unused tags.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_LR_002",
    title:
      "Paused Tags Found",
    description:
      "Paused tags should be reviewed before publishing.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) =>
            Boolean(
              tag.paused
            )
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_002",
        title:
          "Paused Tags Found",
        description:
          "Paused tags should be reviewed before publishing.",
        severity: "LOW",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} paused tags.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  {
    id: "HC_LR_003",
    title:
      "Unused Variables Found",
    description:
      "Variables not used inside tags, triggers, or variables should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const haystack =
        buildUsageHaystack(
          data
        );

      const invalid =
        data.variables.filter(
          (variable) => {
            const name =
              getString(
                variable,
                "name"
              );

            if (!name) {
              return false;
            }

            return !haystack.includes(
              `{{${name}}}`
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_003",
        title:
          "Unused Variables Found",
        description:
          "Variables not used inside tags, triggers, or variables should be reviewed.",
        severity: "LOW",
        passed,

        affectedVariables:
          passed
            ? []
            : mapVariables(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} unused variables. Cleanup recommended.`,

        gtmLinks: {
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // UNATTACHED TAGS + VARIABLES
  // ===================================================

  {
    id: "HC_LR_003A",
    title:
      "Unattached Tags and Variables",
    description:
      "Tags without triggers and variables not used anywhere should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const unattachedTags =
        data.tags.filter(
          (tag) =>
            getFiringTriggerIds(
              tag
            ).length === 0
        );

      const haystack =
        buildUsageHaystack(
          data
        );

      const unusedVariables =
        data.variables.filter(
          (variable) => {
            const name =
              getString(
                variable,
                "name"
              );

            return (
              Boolean(name) &&
              !haystack.includes(
                `{{${name}}}`
              )
            );
          }
        );

      const passed =
        unattachedTags.length === 0 &&
        unusedVariables.length === 0;

      return {
        id: "HC_LR_003A",
        title:
          "Unattached Tags and Variables",
        description:
          "Tags without triggers and variables not used anywhere should be reviewed.",
        severity: "LOW",
        passed,

        affectedTags:
          mapTags(
            unattachedTags,
            data
          ),

        affectedVariables:
          mapVariables(
            unusedVariables,
            data
          ),

        recommendation:
          passed
            ? ""
            : `Found ${unattachedTags.length} unattached tags and ${unusedVariables.length} unused variables.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // DUPLICATE ASSET NAMES
  // ===================================================

  {
    id: "HC_LR_003B",
    title:
      "Duplicate Tag, Trigger and Variable Names",
    description:
      "Duplicate asset names are difficult to maintain.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const normalize =
        (name: string) =>
          name
            .toLowerCase()
            .replace(
              /[_\-\s]/g,
              ""
            );

      const duplicates = (
        items: Record<string, unknown>[]
      ): Record<string, unknown>[] => {
        const groups =
          new Map<
            string,
            Record<string, unknown>[]
          >();

        items.forEach(
          (item) => {
            const name =
              getString(
                item,
                "name"
              );

            if (!name) return;

            const key =
              normalize(name);

            if (
              !groups.has(key)
            ) {
              groups.set(
                key,
                []
              );
            }

            groups
              .get(key)!
              .push(item);
          }
        );

        return Array.from(
          groups.values()
        )
          .filter(
            (group) =>
              group.length > 1
          )
          .flat();
      };

      const tags =
        duplicates(
          data.tags
        );

      const triggers =
        duplicates(
          data.triggers
        );

      const variables =
        duplicates(
          data.variables
        );

      const passed =
        tags.length === 0 &&
        triggers.length === 0 &&
        variables.length === 0;

      return {
        id: "HC_LR_003B",
        title:
          "Duplicate Tag, Trigger and Variable Names",
        description:
          "Duplicate asset names are difficult to maintain.",
        severity: "LOW",
        passed,

        affectedTags:
          mapTags(
            tags,
            data
          ),

        affectedTriggers:
          mapTriggers(
            triggers,
            data
          ),

        affectedVariables:
          mapVariables(
            variables,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Rename or consolidate duplicate assets using a consistent naming convention.",

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // LARGE NUMBER OF TAGS
  // ===================================================

  {
    id: "HC_LR_004",
    title:
      "Large Number of Tags",
    description:
      "Large containers require optimization and cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const count =
        data.tags.length;

      const passed =
        count < 300;

      return {
        id: "HC_LR_004",
        title:
          "Large Number of Tags",
        description:
          "Large containers require optimization and cleanup.",
        severity: "LOW",
        passed,

        recommendation:
          passed
            ? ""
            : `Container contains ${count} tags. Review and optimize tag structure.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // LARGE NUMBER OF TRIGGERS
  // ===================================================

  {
    id: "HC_LR_005",
    title:
      "Large Number of Triggers",
    description:
      "Large trigger setups require optimization and cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const count =
        data.triggers.length;

      const passed =
        count < 200;

      return {
        id: "HC_LR_005",
        title:
          "Large Number of Triggers",
        description:
          "Large trigger setups require optimization and cleanup.",
        severity: "LOW",
        passed,

        recommendation:
          passed
            ? ""
            : `Container contains ${count} triggers. Review and consolidate trigger structure.`,

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // UNUSED TRIGGERS
  // ===================================================

  {
    id: "HC_LR_006",
    title:
      "Unused Triggers Found",
    description:
      "Triggers not attached to any tag should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const used =
        new Set<string>();

      data.tags.forEach(
        (tag) => {
          [
            ...getFiringTriggerIds(
              tag
            ),
            ...getBlockingTriggerIds(
              tag
            ),
          ].forEach(
            (id) =>
              used.add(id)
          );
        }
      );

      const invalid =
        data.triggers.filter(
          (trigger) => {
            const id =
              getTriggerId(
                trigger
              );

            return (
              Boolean(id) &&
              !used.has(id)
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_006",
        title:
          "Unused Triggers Found",
        description:
          "Triggers not attached to any tag should be reviewed.",
        severity: "LOW",
        passed,

        affectedTriggers:
          passed
            ? []
            : mapTriggers(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} unused triggers.`,

        gtmLinks: {
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // LARGE NUMBER OF VARIABLES
  // ===================================================

  {
    id: "HC_LR_007",
    title:
      "Large Number of Variables",
    description:
      "Large variable counts require optimization and cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const count =
        data.variables.length;

      const passed =
        count < 150;

      return {
        id: "HC_LR_007",
        title:
          "Large Number of Variables",
        description:
          "Large variable counts require optimization and cleanup.",
        severity: "LOW",
        passed,

        recommendation:
          passed
            ? ""
            : `Container contains ${count} variables. Review and consolidate where possible.`,

        gtmLinks: {
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // PLACEHOLDER TAG NAMES
  // ===================================================

  {
    id: "HC_LR_008",
    title:
      "Placeholder or Generic Tag Names",
    description:
      "Generic names such as test, untitled, copy, or numeric names reduce maintainability.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) => {
            const name =
              getString(
                tag,
                "name"
              ).trim();

            return (
              name !== "" &&
              PLACEHOLDER_NAME_PATTERN.test(
                name
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_008",
        title:
          "Placeholder or Generic Tag Names",
        description:
          "Generic names such as test, untitled, copy, or numeric names reduce maintainability.",
        severity: "LOW",
        passed,

        affectedTags:
          passed
            ? []
            : mapTags(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} tag(s) with placeholder-style names. Rename them using a consistent naming convention.`,

        gtmLinks: {
          tags:
            buildGTMListUrl(
              "tags",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW: VARIABLES USED ONLY BY PAUSED TAGS
  // ===================================================

  {
    id: "HC_LR_009",
    title:
      "Variables Used Only by Paused Tags",
    description:
      "Variables referenced only by paused tags may be candidates for cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const pausedTags =
        data.tags.filter(
          (tag) =>
            Boolean(
              tag.paused
            )
        );

      const activeTags =
        data.tags.filter(
          (tag) =>
            !Boolean(
              tag.paused
            )
        );

      const activeHaystack =
        JSON.stringify(
          activeTags
        ) +
        JSON.stringify(
          data.triggers
        ) +
        JSON.stringify(
          data.variables
        );

      const invalid =
        data.variables.filter(
          (variable) => {
            const name =
              getString(
                variable,
                "name"
              );

            if (!name) {
              return false;
            }

            const reference =
              `{{${name}}}`;

            const pausedUsage =
              pausedTags.some(
                (tag) =>
                  JSON.stringify(
                    tag
                  ).includes(
                    reference
                  )
              );

            const activeUsage =
              activeHaystack.includes(
                reference
              );

            return (
              pausedUsage &&
              !activeUsage
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_009",
        title:
          "Variables Used Only by Paused Tags",
        description:
          "Variables referenced only by paused tags may be candidates for cleanup.",
        severity: "LOW",
        passed,

        affectedVariables:
          passed
            ? []
            : mapVariables(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} variable(s) used only by paused tags. Review whether they are still required.`,

        gtmLinks: {
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },

  // ===================================================
  // NEW: VARIABLES USED BY UNUSED TRIGGERS
  // ===================================================

  {
    id: "HC_LR_010",
    title:
      "Variables Used by Unused Triggers",
    description:
      "Variables referenced by unused triggers may be candidates for cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const usedTriggerIds =
        new Set<string>();

      data.tags.forEach(
        (tag) => {
          getFiringTriggerIds(
            tag
          ).forEach(
            (id) =>
              usedTriggerIds.add(
                id
              )
          );

          getBlockingTriggerIds(
            tag
          ).forEach(
            (id) =>
              usedTriggerIds.add(
                id
              )
          );
        }
      );

      const unusedTriggers =
        data.triggers.filter(
          (trigger) => {
            const id =
              getTriggerId(
                trigger
              );

            return (
              Boolean(id) &&
              !usedTriggerIds.has(
                id
              )
            );
          }
        );

      const haystack =
        JSON.stringify(
          unusedTriggers
        );

      const invalid =
        data.variables.filter(
          (variable) => {
            const name =
              getString(
                variable,
                "name"
              );

            return (
              Boolean(name) &&
              haystack.includes(
                `{{${name}}}`
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        id: "HC_LR_010",
        title:
          "Variables Used by Unused Triggers",
        description:
          "Variables referenced by unused triggers may be candidates for cleanup.",
        severity: "LOW",
        passed,

        affectedVariables:
          passed
            ? []
            : mapVariables(
                invalid,
                data
              ),

        recommendation:
          passed
            ? ""
            : `Found ${invalid.length} variable(s) referenced by unused triggers. Review and remove unnecessary dependencies.`,

        gtmLinks: {
          variables:
            buildGTMListUrl(
              "variables",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
          triggers:
            buildGTMListUrl(
              "triggers",
              data.accountId,
              data.containerId,
              data.workspaceId
            ),
        },
      };
    },
  },
];