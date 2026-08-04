import {
  GTMHealthData,
  HealthCheckResult,
  AffectedItem,
} from "./types";

// =====================================================
// BASIC HELPERS
// =====================================================

type GTMItem = Record<string, unknown>;

const getString = (
  obj: GTMItem,
  key: string
): string => {
  const value = obj[key];

  return typeof value === "string" ? value : "";
};

const getArray = (
  obj: GTMItem,
  key: string
): unknown[] => {
  const value = obj[key];

  return Array.isArray(value) ? value : [];
};

const getBoolean = (
  obj: GTMItem,
  key: string
): boolean => {
  return Boolean(obj[key]);
};

const normalizeName = (
  value: string
): string => {
  return value
    .toLowerCase()
    .replace(/[_\-\s]+/g, "");
};

const getTagId = (
  tag: GTMItem
): string => {
  return getString(tag, "tagId").trim();
};

const getTagType = (
  tag: GTMItem
): string => {
  return getString(tag, "type").toLowerCase().trim();
};

const getTagName = (
  tag: GTMItem
): string => {
  return getString(tag, "name").trim();
};

const getTriggerName = (
  trigger: GTMItem
): string => {
  return getString(trigger, "name").trim();
};

// =====================================================
// PARAMETER HELPERS
// =====================================================

const getParameters = (
  item: GTMItem
): GTMItem[] => {
  const parameters = item.parameter;

  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters.filter(
    (parameter): parameter is GTMItem =>
      typeof parameter === "object" &&
      parameter !== null
  );
};

const getParameter = (
  item: GTMItem,
  key: string
): string => {
  const parameter = getParameters(item).find(
    (param) => getString(param, "key") === key
  );

  return parameter
    ? getString(parameter, "value")
    : "";
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
  item: GTMItem,
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
): AffectedItem => {
  const name =
    getString(item, "name") || "Unnamed";

  const id =
    getString(item, "tagId") ||
    getString(item, "triggerId") ||
    getString(item, "variableId");

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
  tags: GTMItem[],
  data: GTMHealthData
): AffectedItem[] => {
  return tags.map((tag) =>
    mapToAffectedItem(
      tag,
      "tags",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

const mapTriggers = (
  triggers: GTMItem[],
  data: GTMHealthData
): AffectedItem[] => {
  return triggers.map((trigger) =>
    mapToAffectedItem(
      trigger,
      "triggers",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

const mapVariables = (
  variables: GTMItem[],
  data: GTMHealthData
): AffectedItem[] => {
  return variables.map((variable) =>
    mapToAffectedItem(
      variable,
      "variables",
      data.accountId,
      data.containerId,
      data.workspaceId
    )
  );
};

// =====================================================
// RESULT HELPER
// =====================================================

const getBaseResult = (
  id: string,
  title: string,
  description: string,
  severity: "HIGH" | "MEDIUM" | "LOW",
  passed: boolean
): HealthCheckResult => {
  return {
    id,
    title,
    description,
    severity,
    passed,
    recommendation: "",
  };
};

// =====================================================
// GTM TYPE DETECTION
// =====================================================

// Google tag types are unified under "googtag".
// We must inspect tagId rather than assuming every googtag
// is a GA4 configuration tag.

const isGA4ConfigTag = (
  tag: GTMItem
): boolean => {
  const type = getTagType(tag);
  const tagId = getTagId(tag).toLowerCase();

  if (type === "gaawc") {
    return true;
  }

  if (
    type === "googtag" &&
    !tagId.startsWith("aw-") &&
    !tagId.startsWith("dc-")
  ) {
    return true;
  }

  return false;
};

const isGoogleAdsTag = (
  tag: GTMItem
): boolean => {
  const type = getTagType(tag);
  const tagId = getTagId(tag).toLowerCase();

  if (
    type === "awct" ||
    type === "sp"
  ) {
    return true;
  }

  if (
    type === "googtag" &&
    tagId.startsWith("aw-")
  ) {
    return true;
  }

  const json = JSON.stringify(tag).toLowerCase();

  return (
    json.includes("google ads") ||
    json.includes("google_ads") ||
    json.includes("conversion id")
  );
};

const isConversionLinkerTag = (
  tag: GTMItem
): boolean => {
  const type = getTagType(tag);
  const json = JSON.stringify(tag).toLowerCase();

  return (
    type === "gclidw" ||
    json.includes("conversion linker") ||
    json.includes("conversionlinker")
  );
};

const isGA4EventTag = (
  tag: GTMItem
): boolean => {
  return getTagType(tag) === "gaawe";
};

const isCustomHTMLTag = (
  tag: GTMItem
): boolean => {
  return getTagType(tag) === "html";
};

const isCustomJSVariable = (
  variable: GTMItem
): boolean => {
  return getTagType(variable) === "jsm";
};

const isPurchaseTag = (
  tag: GTMItem
): boolean => {
  const json = JSON.stringify(tag).toLowerCase();

  return (
    json.includes("purchase") ||
    getParameter(tag, "eventName")
      .toLowerCase()
      .includes("purchase")
  );
};

// =====================================================
// BUILT-IN GTM TRIGGERS
// =====================================================

const BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS = new Set([
  "2147479553",
  "2147479572",
]);

const isAllPagesLikeTrigger = (
  trigger: GTMItem
): boolean => {
  const id = getString(
    trigger,
    "triggerId"
  );

  const name = getTriggerName(
    trigger
  ).toLowerCase();

  return (
    BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS.has(id) ||
    name.includes("all pages") ||
    name.includes("initialization")
  );
};

// =====================================================
// VARIABLE / ASSET USAGE
// =====================================================

const buildUsageHaystack = (
  data: GTMHealthData
): string => {
  return JSON.stringify({
    tags: data.tags,
    triggers: data.triggers,
    variables: data.variables,
  }).toLowerCase();
};

// =====================================================
// HIGH RISK RULES
// =====================================================

export const healthCheckRules = [

  // ===================================================
  // HC_HR_001
  // ===================================================

  {
    id: "HC_HR_001",
    title: "Similar or Duplicate GA4 Configuration Tags",
    description:
      "Detects multiple GA4 configuration tags that may create duplicate Google tag initialization.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const configs =
        data.tags.filter(isGA4ConfigTag);

      const duplicateGroups: GTMItem[][] = [];

      const grouped: Record<
        string,
        GTMItem[]
      > = {};

      configs.forEach((tag) => {
        const tagId =
          getTagId(tag).toLowerCase();

        const measurementId =
          getParameter(
            tag,
            "measurementId"
          ).toLowerCase();

        const key =
          measurementId ||
          tagId ||
          normalizeName(
            getTagName(tag)
          );

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(tag);
      });

      Object.values(grouped).forEach(
        (group) => {
          if (group.length > 1) {
            duplicateGroups.push(group);
          }
        }
      );

      const passed =
        duplicateGroups.length === 0;

      const duplicateTags =
        duplicateGroups.flat();

      return {
        ...getBaseResult(
          "HC_HR_001",
          "Similar or Duplicate GA4 Configuration Tags",
          "Detects multiple GA4 configuration tags that may create duplicate Google tag initialization.",
          "HIGH",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              duplicateTags,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${duplicateTags.length} similar or duplicate GA4 configuration tags. Keep one primary GA4/Google tag configuration unless multiple configurations are intentionally required.`,

        gtmLinks: {
          tags: buildGTMListUrl(
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
    title: "Google Ads Tag Without Conversion Linker",
    description:
      "Google Ads tags should have a Conversion Linker available for attribution.",
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
        ...getBaseResult(
          "HC_HR_002",
          "Google Ads Tag Without Conversion Linker",
          "Google Ads tags should have a Conversion Linker available for attribution.",
          "HIGH",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              adsTags,
              data
            ),

        recommendation: passed
          ? ""
          : "Google Ads tags were detected without a Conversion Linker tag. Add or verify a Conversion Linker configuration.",

        gtmLinks: {
          tags: buildGTMListUrl(
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
    title: "Duplicate Purchase Tags on the Same Trigger",
    description:
      "Multiple GA4 purchase tags attached to the same trigger can create duplicate purchase events.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const purchaseTags =
        data.tags.filter(
          isPurchaseTag
        );

      const triggerMap:
        Record<string, GTMItem[]> = {};

      purchaseTags.forEach(
        (tag) => {

          const triggerIds =
            getArray(
              tag,
              "firingTriggerId"
            );

          triggerIds.forEach(
            (id) => {

              if (
                typeof id !== "string"
              ) {
                return;
              }

              if (
                !triggerMap[id]
              ) {
                triggerMap[id] = [];
              }

              triggerMap[id].push(
                tag
              );
            }
          );
        }
      );

      const duplicateEntries =
        Object.entries(
          triggerMap
        ).filter(
          ([, tags]) => {

            const ga4Purchases =
              tags.filter(
                isGA4EventTag
              );

            return (
              ga4Purchases.length > 1
            );
          }
        );

      const affected =
        duplicateEntries.flatMap(
          ([, tags]) => tags
        );

      const passed =
        duplicateEntries.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_003",
          "Duplicate Purchase Tags on the Same Trigger",
          "Multiple GA4 purchase tags attached to the same trigger can create duplicate purchase events.",
          "HIGH",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              affected,
              data
            ),

        recommendation: passed
          ? ""
          : "Review purchase tags sharing the same trigger and keep only the intended purchase event implementation.",

        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          triggers: buildGTMListUrl(
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
    title: "Purchase Tag Has Multiple Firing Triggers",
    description:
      "Purchase tags using multiple firing triggers may fire more than once for the same transaction.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const invalidTags =
        data.tags.filter(
          (tag) => {

            if (
              !isPurchaseTag(tag)
            ) {
              return false;
            }

            const triggers =
              getArray(
                tag,
                "firingTriggerId"
              );

            return (
              triggers.length > 1
            );
          }
        );

      const passed =
        invalidTags.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_004",
          "Purchase Tag Has Multiple Firing Triggers",
          "Purchase tags using multiple firing triggers may fire more than once for the same transaction.",
          "HIGH",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              invalidTags,
              data
            ),

        recommendation: passed
          ? ""
          : "Review purchase tag triggers and use one controlled purchase trigger where possible to prevent duplicate transactions.",

        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          triggers: buildGTMListUrl(
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
  // HC_HR_005
  // ===================================================

  {
    id: "HC_HR_005",
    title: "Custom HTML Missing Error Handling",
    description:
      "Custom HTML tags containing executable JavaScript should include basic error handling.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const htmlTags =
        data.tags.filter(
          isCustomHTMLTag
        );

      const invalidTags =
        htmlTags.filter(
          (tag) => {

            const html =
              getParameter(
                tag,
                "html"
              );

            if (!html) {
              return false;
            }

            const lower =
              html.toLowerCase();

            return (
              !lower.includes(
                "try {"
              ) &&
              !lower.includes(
                "try{"
              )
            );
          }
        );

      const passed =
        invalidTags.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_005",
          "Custom HTML Missing Error Handling",
          "Custom HTML tags containing executable JavaScript should include basic error handling.",
          "HIGH",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              invalidTags,
              data
            ),

        recommendation: passed
          ? ""
          : "Review Custom HTML tags and add appropriate try/catch handling where JavaScript execution can fail.",

        gtmLinks: {
          tags: buildGTMListUrl(
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

  // ===================================================
  // HC_MR_001
  // ===================================================

  {
    id: "HC_MR_001",
    title: "Purchase Event Missing Ecommerce Parameters",
    description:
      "Purchase events should contain transaction_id, value, currency and items.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const purchaseTags =
        data.tags.filter(
          isPurchaseTag
        );

      const invalidTags =
        purchaseTags.filter(
          (tag) => {

            const json =
              JSON.stringify(
                tag
              ).toLowerCase();

            const hasTransactionId =
              json.includes(
                "transaction_id"
              );

            const hasValue =
              json.includes(
                '"value"'
              ) ||
              json.includes(
                "value"
              );

            const hasCurrency =
              json.includes(
                "currency"
              );

            const hasItems =
              json.includes(
                "items"
              );

            return !(
              hasTransactionId &&
              hasValue &&
              hasCurrency &&
              hasItems
            );
          }
        );

      const passed =
        invalidTags.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_001",
          "Purchase Event Missing Ecommerce Parameters",
          "Purchase events should contain transaction_id, value, currency and items.",
          "MEDIUM",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              invalidTags,
              data
            ),

        recommendation: passed
          ? ""
          : "Verify that purchase events send transaction_id, value, currency and items.",

        gtmLinks: {
          tags: buildGTMListUrl(
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
  // HC_MR_002
  // ===================================================

  {
    id: "HC_MR_002",
    title: "GA4 Configuration Not Firing on All Pages",
    description:
      "GA4 configuration should normally fire on All Pages or Initialization.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const ga4Tags =
        data.tags.filter(
          isGA4ConfigTag
        );

      const invalidTags =
        ga4Tags.filter(
          (tag) => {

            const triggerIds =
              getArray(
                tag,
                "firingTriggerId"
              ).filter(
                (
                  id
                ): id is string =>
                  typeof id ===
                  "string"
              );

            if (
              triggerIds.length === 0
            ) {
              return true;
            }

            const matchingTriggers =
              data.triggers.filter(
                (trigger) =>
                  triggerIds.includes(
                    getString(
                      trigger,
                      "triggerId"
                    )
                  )
              );

            return !(
              triggerIds.some(
                (id) =>
                  BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS.has(
                    id
                  )
              ) ||
              matchingTriggers.some(
                isAllPagesLikeTrigger
              )
            );
          }
        );

      const passed =
        invalidTags.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_002",
          "GA4 Configuration Not Firing on All Pages",
          "GA4 configuration should normally fire on All Pages or Initialization.",
          "MEDIUM",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              invalidTags,
              data
            ),

        recommendation: passed
          ? ""
          : "Review the GA4 configuration trigger and fire the Google/GA4 configuration on All Pages or Initialization when appropriate.",

        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          triggers: buildGTMListUrl(
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
  // HC_MR_003
  // ===================================================

  {
    id: "HC_MR_003",
    title: "Large Number of Custom JavaScript Variables",
    description:
      "A large number of Custom JavaScript variables can increase maintenance and execution complexity.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const customJSVariables =
        data.variables.filter(
          isCustomJSVariable
        );

      const passed =
        customJSVariables.length <= 25;

      return {
        ...getBaseResult(
          "HC_MR_003",
          "Large Number of Custom JavaScript Variables",
          "A large number of Custom JavaScript variables can increase maintenance and execution complexity.",
          "MEDIUM",
          passed
        ),

        affectedVariables: passed
          ? []
          : mapVariables(
              customJSVariables,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${customJSVariables.length} Custom JavaScript variables. Review whether these can be simplified, consolidated, or replaced with native GTM variables.`,

        gtmLinks: {
          variables: buildGTMListUrl(
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
  // HC_MR_004
  // ===================================================

  {
    id: "HC_MR_004",
    title: "Trigger Attached to Multiple Same-Platform Tags",
    description:
      "A single trigger should not unintentionally fire multiple same-platform tracking tags.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const triggerMap:
        Record<string, GTMItem[]> = {};

      data.tags.forEach(
        (tag) => {

          const triggerIds =
            getArray(
              tag,
              "firingTriggerId"
            );

          triggerIds.forEach(
            (id) => {

              if (
                typeof id !==
                "string"
              ) {
                return;
              }

              if (
                !triggerMap[id]
              ) {
                triggerMap[id] = [];
              }

              triggerMap[id].push(
                tag
              );
            }
          );
        }
      );

      const invalidEntries =
        Object.entries(
          triggerMap
        ).filter(
          ([, tags]) => {

            const ga4Tags =
              tags.filter(
                (tag) =>
                  isGA4ConfigTag(
                    tag
                  ) ||
                  isGA4EventTag(
                    tag
                  )
              );

            return (
              ga4Tags.length > 1
            );
          }
        );

      const affectedTriggers =
        invalidEntries
          .map(
            ([triggerId]) =>
              data.triggers.find(
                (trigger) =>
                  getString(
                    trigger,
                    "triggerId"
                  ) === triggerId
              )
          )
          .filter(
            (
              trigger
            ): trigger is GTMItem =>
              Boolean(trigger)
          );

      const passed =
        invalidEntries.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_004",
          "Trigger Attached to Multiple Same-Platform Tags",
          "A single trigger should not unintentionally fire multiple same-platform tracking tags.",
          "MEDIUM",
          passed
        ),

        affectedTriggers: passed
          ? []
          : mapTriggers(
              affectedTriggers,
              data
            ),

        recommendation: passed
          ? ""
          : "Review triggers that fire multiple GA4 tags and remove unintended duplicate tracking implementations.",

        gtmLinks: {
          triggers: buildGTMListUrl(
            "triggers",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          tags: buildGTMListUrl(
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
  // LOW RISK RULES
  // =====================================================

  // ===================================================
  // HC_LR_001
  // ===================================================

  {
    id: "HC_LR_001",
    title: "Unused Tags Found",
    description:
      "Active tags without firing triggers should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const unusedTags =
        data.tags.filter(
          (tag) => {

            const triggers =
              getArray(
                tag,
                "firingTriggerId"
              );

            return (
              triggers.length === 0 &&
              !getBoolean(
                tag,
                "paused"
              )
            );
          }
        );

      const passed =
        unusedTags.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_001",
          "Unused Tags Found",
          "Active tags without firing triggers should be reviewed.",
          "LOW",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              unusedTags,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${unusedTags.length} active tags without firing triggers. Review whether they are intentionally unattached.`,

        gtmLinks: {
          tags: buildGTMListUrl(
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
  // HC_LR_002
  // ===================================================

  {
    id: "HC_LR_002",
    title: "Paused Tags Found",
    description:
      "Paused tags should be reviewed before publishing.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const pausedTags =
        data.tags.filter(
          (tag) =>
            getBoolean(
              tag,
              "paused"
            )
        );

      const passed =
        pausedTags.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_002",
          "Paused Tags Found",
          "Paused tags should be reviewed before publishing.",
          "LOW",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              pausedTags,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${pausedTags.length} paused tags. Review whether these tags are intentionally disabled or should be re-enabled.`,

        gtmLinks: {
          tags: buildGTMListUrl(
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
  // HC_LR_003
  // ===================================================

  {
    id: "HC_LR_003",
    title: "Unused Variables Found",
    description:
      "Variables not referenced by tags, triggers, or other variables should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

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

            if (!name) {
              return false;
            }

            const token =
              `{{${name}}}`.toLowerCase();

            return !haystack.includes(
              token
            );
          }
        );

      const passed =
        unusedVariables.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_003",
          "Unused Variables Found",
          "Variables not referenced by tags, triggers, or other variables should be reviewed.",
          "LOW",
          passed
        ),

        affectedVariables: passed
          ? []
          : mapVariables(
              unusedVariables,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${unusedVariables.length} unused variables. Remove obsolete variables or verify that they are intentionally unused.`,

        gtmLinks: {
          variables: buildGTMListUrl(
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
  // HC_LR_003A
  // ===================================================

  {
    id: "HC_LR_003A",
    title: "Unattached Tags and Variables",
    description:
      "Tags without triggers and variables not referenced by the container should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const unattachedTags =
        data.tags.filter(
          (tag) =>
            getArray(
              tag,
              "firingTriggerId"
            ).length === 0 &&
            !getBoolean(
              tag,
              "paused"
            )
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

            if (!name) {
              return false;
            }

            return !haystack.includes(
              `{{${name}}}`.toLowerCase()
            );
          }
        );

      const passed =
        unattachedTags.length === 0 &&
        unusedVariables.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_003A",
          "Unattached Tags and Variables",
          "Tags without triggers and variables not referenced by the container should be reviewed.",
          "LOW",
          passed
        ),

        affectedTags: passed
          ? []
          : mapTags(
              unattachedTags,
              data
            ),

        affectedVariables: passed
          ? []
          : mapVariables(
              unusedVariables,
              data
            ),

        recommendation: passed
          ? ""
          : `Found ${unattachedTags.length} unattached tags and ${unusedVariables.length} unused variables. Review and clean up obsolete assets.`,

        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          variables: buildGTMListUrl(
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
  // HC_LR_003B
  // ===================================================

  {
    id: "HC_LR_003B",
    title: "Duplicate Asset Names",
    description:
      "Detects duplicate Tag, Trigger and Variable names regardless of case, spaces, hyphens or underscores.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const findDuplicates = (
        items: GTMItem[]
      ): GTMItem[] => {

        const groups:
          Record<
            string,
            GTMItem[]
          > = {};

        items.forEach(
          (item) => {

            const name =
              getString(
                item,
                "name"
              );

            if (!name) {
              return;
            }

            const key =
              normalizeName(
                name
              );

            if (!groups[key]) {
              groups[key] = [];
            }

            groups[key].push(
              item
            );
          }
        );

        return Object.values(
          groups
        )
          .filter(
            (group) =>
              group.length > 1
          )
          .flat();
      };

      const duplicateTags =
        findDuplicates(
          data.tags
        );

      const duplicateTriggers =
        findDuplicates(
          data.triggers
        );

      const duplicateVariables =
        findDuplicates(
          data.variables
        );

      const passed =
        duplicateTags.length === 0 &&
        duplicateTriggers.length === 0 &&
        duplicateVariables.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_003B",
          "Duplicate Asset Names",
          "Detects duplicate Tag, Trigger and Variable names regardless of case, spaces, hyphens or underscores.",
          "LOW",
          passed
        ),

        affectedTags:
          duplicateTags.length === 0
            ? []
            : mapTags(
                duplicateTags,
                data
              ),

        affectedTriggers:
          duplicateTriggers.length === 0
            ? []
            : mapTriggers(
                duplicateTriggers,
                data
              ),

        affectedVariables:
          duplicateVariables.length === 0
            ? []
            : mapVariables(
                duplicateVariables,
                data
              ),

        recommendation: passed
          ? ""
          : "Duplicate asset names were detected. Rename assets using a consistent naming convention to reduce maintenance confusion.",

        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          triggers: buildGTMListUrl(
            "triggers",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),

          variables: buildGTMListUrl(
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
  // HC_LR_004
  // ===================================================

  {
    id: "HC_LR_004",
    title: "Large Number of Tags",
    description:
      "Large GTM containers may require optimization and cleanup.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const tagCount =
        data.tags.length;

      const passed =
        tagCount < 300;

      return {
        ...getBaseResult(
          "HC_LR_004",
          "Large Number of Tags",
          "Large GTM containers may require optimization and cleanup.",
          "LOW",
          passed
        ),

        recommendation: passed
          ? ""
          : `Container contains ${tagCount} tags. Review obsolete tags, duplicate implementations and unnecessary Custom HTML.`,

        gtmLinks: {
          tags: buildGTMListUrl(
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
  // HC_LR_005
  // ===================================================

  {
    id: "HC_LR_005",
    title: "Large Number of Triggers",
    description:
      "A large number of triggers can make GTM maintenance and debugging difficult.",
    severity: "LOW",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {

      const triggerCount =
        data.triggers.length;

      const passed =
        triggerCount < 200;

      return {
        ...getBaseResult(
          "HC_LR_005",
          "Large Number of Triggers",
          "A large number of triggers can make GTM maintenance and debugging difficult.",
          "LOW",
          passed
        ),

        recommendation: passed
          ? ""
          : `Container contains ${triggerCount} triggers. Review duplicate, unused and overly complex trigger configurations.`,

        gtmLinks: {
          triggers: buildGTMListUrl(
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