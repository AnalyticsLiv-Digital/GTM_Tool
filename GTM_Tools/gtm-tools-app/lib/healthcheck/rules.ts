import { GTMHealthData, HealthCheckResult, AffectedItem, } from "./types";

// =====================================================
// TYPES
// =====================================================

type GTMItem = Record<string, unknown>;

type AssetType = | "tags" | "triggers" | "variables";

type Severity = | "HIGH" | "MEDIUM" | "LOW";

// =====================================================
// BASIC HELPERS
// =====================================================

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

const getObject = (
  obj: GTMItem,
  key: string
): GTMItem | null => {
  const value = obj[key];

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as GTMItem;
  }

  return null;
};

const getType = (obj: GTMItem): string => {
  return getString(obj, "type").trim().toLowerCase();
};

const getName = (obj: GTMItem): string => {
  return getString(obj, "name").trim();
};

const getTagId = (tag: GTMItem): string => {
  return getString(tag, "tagId");
};

const getTriggerId = (trigger: GTMItem): string => {
  return getString(trigger, "triggerId");
};

const getVariableId = (variable: GTMItem): string => {
  return getString(variable, "variableId");
};

// =====================================================
// PARAMETER HELPERS
// =====================================================

const getParameters = (obj: GTMItem): GTMItem[] => {
  return getArray(obj, "parameter").filter(
    (item): item is GTMItem => typeof item === "object" && item !== null && !Array.isArray(item));
};

const getParameter = (obj: GTMItem, key: string): GTMItem | undefined => {
  return getParameters(obj).find((parameter) => getString(parameter, "key") === key);
};

const getParamValue = (obj: GTMItem, key: string): string => {
  const parameter = getParameter(obj, key);

  return parameter ? getString(parameter, "value") : "";
};

const hasParameter = (obj: GTMItem, key: string): boolean => {
  return Boolean(getParameter(obj, key));
};

const getParameterKeys = (obj: GTMItem): string[] => {
  return getParameters(obj).map((parameter) => getString(parameter, "key").trim()).filter(Boolean);
};

// =====================================================
// ID HELPERS
// =====================================================

const getFiringTriggerIds = (tag: GTMItem): string[] => {
  return getArray(tag, "firingTriggerId").filter((id): id is string => typeof id === "string" && Boolean(id.trim()));
};

const getBlockingTriggerIds = (tag: GTMItem): string[] => {
  return getArray(tag, "blockingTriggerId").filter((id): id is string => typeof id === "string" && Boolean(id.trim()));
};

// =====================================================
// GTM URL HELPERS
// =====================================================

const buildGTMListUrl = (type: AssetType, accountId: string, containerId: string, workspaceId: string): string => {
  return (`https://tagmanager.google.com/#/container/accounts/` + `${accountId}/containers/${containerId}/workspaces/` + `${workspaceId}/${type}`);
};

const buildGTMEditUrl = (type: AssetType, accountId: string, containerId: string, workspaceId: string, id: string): string => {
  return (`https://tagmanager.google.com/#/container/accounts/` + `${accountId}/containers/${containerId}/workspaces/` + `${workspaceId}/${type}/${id}/edit`);
};

// =====================================================
// AFFECTED ITEM HELPERS
// =====================================================

const getAssetId = (item: GTMItem): string => {
  return (getTagId(item) || getTriggerId(item) || getVariableId(item));
};

const mapToAffectedItem = (item: GTMItem, type: AssetType, accountId: string, containerId: string, workspaceId: string): AffectedItem => {
  const name = getName(item) || "Unnamed";

  const id = getAssetId(item);

  return { name, id, editUrl: id ? buildGTMEditUrl(type, accountId, containerId, workspaceId, id) : undefined, };
};

const mapTags = (tags: GTMItem[], data: GTMHealthData): AffectedItem[] => {
  return tags.map((tag) => mapToAffectedItem(tag, "tags", data.accountId, data.containerId, data.workspaceId));
};

const mapTriggers = (triggers: GTMItem[], data: GTMHealthData): AffectedItem[] => {
  return triggers.map((trigger) => mapToAffectedItem(trigger, "triggers", data.accountId, data.containerId, data.workspaceId));
};

const mapVariables = (variables: GTMItem[], data: GTMHealthData): AffectedItem[] => {
  return variables.map((variable) =>
    mapToAffectedItem(variable, "variables", data.accountId, data.containerId, data.workspaceId));
};

// =====================================================
// BUILT-IN GTM TRIGGERS
// =====================================================

const BUILT_IN_TRIGGER_IDS = new Set<string>(["2147479553", "2147479572", "2147479573",]);
const BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS = new Set<string>(["2147479553", "2147479572",]);
const CONSENT_INITIALIZATION_TRIGGER_ID = "2147479573";
const isBuiltInTriggerId = (id: string): boolean => {
  return BUILT_IN_TRIGGER_IDS.has(id);
};

const isBuiltInAllPagesTriggerId = (id: string): boolean => {
  return BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS.has(id);
};

// =====================================================
// TRIGGER HELPERS
// =====================================================

const getTriggerById = (data: GTMHealthData, triggerId: string): GTMItem | undefined => {
  return data.triggers.find((trigger) => getTriggerId(trigger) === triggerId);
};

const getTriggerNamesForTag = (tag: GTMItem, data: GTMHealthData): string[] => {
  return getFiringTriggerIds(tag).map((id) => getTriggerById(data, id)).filter(
    (trigger): trigger is GTMItem => Boolean(trigger)).map((trigger) => getName(trigger).toLowerCase());
};

const triggerNameLooksLikeAllPages = (name: string): boolean => {
  const normalized = name.trim().toLowerCase();

  return (normalized === "all pages" || normalized.includes("all pages") || normalized.includes("initialization"));
};

const firesOnBuiltInAllPages = (triggerIds: string[]): boolean => {
  return triggerIds.some((id) => isBuiltInAllPagesTriggerId(id));
};

const firesOnAllPagesOrInitialization = (tag: GTMItem, data: GTMHealthData): boolean => {
  const triggerIds = getFiringTriggerIds(tag);
  if (firesOnBuiltInAllPages(triggerIds)) {
    return true;
  }
  const triggerNames = getTriggerNamesForTag(tag, data);
  return triggerNames.some(triggerNameLooksLikeAllPages);
};

// =====================================================
// CLASSIFICATION HELPERS
// =====================================================

const NON_GA4_GOOGTAG_PREFIXES = ["aw-", "dc-", "gtag-", "gtm-", "ua-"];
const isGA4ConfigTag = (tag: GTMItem): boolean => {
  const type = getType(tag);

  if (type === "gaawc" || type === "gaawe") {
    return true;
  }

  if (type !== "googtag") {
    return false;
  }

  const tagId = getParamValue(tag, "tagId").trim().toLowerCase();

  if (!tagId) {
    return false;
  }

  return !NON_GA4_GOOGTAG_PREFIXES.some((prefix) => tagId.startsWith(prefix));
};

const isGA4EventTag = (tag: GTMItem): boolean => {
  return (getType(tag) === "gaawe");
};

const isGoogleAdsTag = (tag: GTMItem): boolean => {
  const type = getType(tag);

  if (type === "awct" || type === "sp") {
    return true;
  }

  if (type !== "googtag") {
    return false;
  }

  const tagId = getParamValue(tag, "tagId").trim().toLowerCase();

  return tagId.startsWith("aw-");
};

const isConversionLinkerTag = (tag: GTMItem): boolean => {
  return (getType(tag) === "gclidw");
};

const isPurchaseTag = (tag: GTMItem): boolean => {
  const name = getName(tag).toLowerCase();
  const eventName = getParamValue(tag, "eventName").trim().toLowerCase();
  return (name.includes("purchase") || eventName === "purchase");
};

const isAnalyticsTag = (tag: GTMItem): boolean => {
  return (isGA4ConfigTag(tag) || isGA4EventTag(tag));
};

const isMarketingTag = (tag: GTMItem): boolean => {
  const type = getType(tag);

  return (isGoogleAdsTag(tag) || type.includes("floodlight") || type.includes("marketing") || type.includes("adwords") || type.includes("adroll") || type.includes("facebook") || type.includes("linkedin") || type.includes("twitter") || type.includes("pinterest"));
};

const isCustomHTMLTag = (tag: GTMItem): boolean => {
  return (getType(tag) === "html");
};

const isCustomJavaScriptVariable = (variable: GTMItem): boolean => {
  return (getType(variable) === "jsm");
};

// =====================================================
// VARIABLE REFERENCE HELPERS
// =====================================================

const VARIABLE_REFERENCE_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

const extractVariableReferences = (value: unknown): string[] => {
  if (typeof value !== "string") {
    return [];
  }

  const references: string[] = [];

  let match: | RegExpExecArray | null;

  while ((match = VARIABLE_REFERENCE_REGEX.exec(value)) !== null
  ) {
    const name = match[1].trim();

    if (name) {
      references.push(name);
    }
  }

  VARIABLE_REFERENCE_REGEX.lastIndex = 0;
  return references;
};

const extractReferencesFromObject = (value: unknown): string[] => {
  const references: string[] = [];

  const visit = (current: unknown): void => {
    if (typeof current === "string") {
      references.push(...extractVariableReferences(current));
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }

    if (typeof current === "object" && current !== null) {
      Object.values(current as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return references;
};

// =====================================================
// BUILT-IN VARIABLE NAMES
// =====================================================

const BUILT_IN_VARIABLE_NAMES =
  new Set(
    [
      "Event",
      "Page Hostname",
      "Page Path",
      "Page URL",
      "Referrer",
      "Click Classes",
      "Click Element",
      "Click ID",
      "Click Target",
      "Click Text",
      "Click URL",
      "Form Classes",
      "Form Element",
      "Form ID",
      "Form Target",
      "Form Text",
      "Form URL",
      "History Source",
      "History New URL Fragment",
      "History New State",
      "History Old URL Fragment",
      "History Old State",
      "Random Number",
      "Container ID",
      "Debug Mode",
      "Environment Name",
      "HTML ID",
      "Error Message",
      "Error URL",
      "Error Line",
      "Video Current Time",
      "Video Duration",
      "Video Percent",
      "Video Provider",
      "Video Status",
      "Video Title",
      "Video URL",
      "Scroll Depth Threshold",
      "Scroll Depth Units",
      "Scroll Direction",
    ].map(
      (name) => name.toLowerCase()));

const isBuiltInVariableName = (name: string): boolean => {
  return BUILT_IN_VARIABLE_NAMES.has(name.trim().toLowerCase());
};

// =====================================================
// USAGE HELPERS
// =====================================================

const getAllVariableReferences = (data: GTMHealthData): Set<string> => {
  const references = new Set<string>();
  [...data.tags, ...data.triggers, ...data.variables].forEach((item) => {
    extractReferencesFromObject(item).forEach((reference) => references.add(reference));
  });
  return references;
};

const getMissingVariableReferences = (data: GTMHealthData): Set<string> => {
  const definedVariables = new Set(data.variables.map((variable) => getName(variable)).filter(Boolean).map((name) => name.toLowerCase()));
  const references = getAllVariableReferences(data);
  const missing = new Set<string>();

  references.forEach((reference) => {
    if (isBuiltInVariableName(reference)) {
      return;
    }
    if (!definedVariables.has(reference.toLowerCase())) {
      missing.add(reference);
    }
  }
  );
  return missing;
};

const objectContainsMissingVariable = (item: GTMItem, missingVariables: Set<string>): boolean => {
  const references = extractReferencesFromObject(item);
  return references.some((reference) => Array.from(missingVariables).some((missing) => missing.toLowerCase() === reference.toLowerCase())
  );
};

// =====================================================
// CONSENT HELPERS
// =====================================================

const hasConfiguredConsentSettings = (tag: GTMItem): boolean => {
  const settings = getObject(tag, "consentSettings");
  if (!settings) {
    return false;
  }
  const status = getString(settings, "consentStatus").trim().toLowerCase();
  const consentType = getObject(settings, "consentType");
  return Boolean(status || consentType);
};

const isConsentRelatedTag = (tag: GTMItem): boolean => {
  const type = getType(tag);
  const name = getName(tag).toLowerCase();
  return (type.includes("consent") || name.includes("consent") || name.includes("cmp"));
};

const hasConsentInitializationTrigger = (tag: GTMItem, data: GTMHealthData): boolean => {
  const triggerIds = getFiringTriggerIds(tag);
  if (triggerIds.includes(CONSENT_INITIALIZATION_TRIGGER_ID)) {
    return true;
  }
  const triggerNames = getTriggerNamesForTag(tag, data);
  return triggerNames.some((name) => name.includes("consent initialization"));
};

// =====================================================
// REGEX HELPERS
// =====================================================

const isBroadRegex = (value: string): boolean => {
  const normalized = value.trim().replace(/^\/|\/$/g, "").toLowerCase();

  return (normalized === ".*" || normalized === "^.*$" || normalized === ".+" || normalized === "^.+$");
};

// =====================================================
// NAME HELPERS
// =====================================================

const normalizeName = (name: string): string => {
  return name.trim().toLowerCase().replace(/[_\-\s]+/g, "");
};

const findDuplicateGroups = (items: GTMItem[]): GTMItem[][] => {
  const groups = new Map<string, GTMItem[]>();
  items.forEach((item) => {
    const name = getName(item);
    if (!name) {
      return;
    }
    const key = normalizeName(name);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  );

  return Array.from(groups.values()).filter((group) => group.length > 1);
};

// =====================================================
// PURCHASE PARAMETER HELPERS
// =====================================================

const hasPurchaseParameter = (tag: GTMItem, key: string): boolean => {
  return hasParameter(tag, key);
};

const getMissingPurchaseParameters = (tag: GTMItem): string[] => {
  const required = ["transaction_id", "value", "currency", "items",];

  return required.filter((key) => !hasPurchaseParameter(tag, key));
};

// =====================================================
// HEALTH RESULT HELPERS
// =====================================================

const getBaseResult = (
  id: string,
  title: string,
  description: string,
  severity: Severity,
  passed: boolean): HealthCheckResult => {
  return {
    id,
    title,
    description,
    severity,
    passed,
  };
};

// =====================================================
// HEALTHCHECK RULES
// =====================================================

export const healthCheckRules = [

  // =====================================================
  // HIGH RISK
  // =====================================================

  {
    id: "HC_HR_001",
    title: "Multiple GA4 Config Tags Found",
    description: "Only one primary GA4 configuration tag should exist.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const configs = data.tags.filter(isGA4ConfigTag);

      const passed = configs.length <= 1;

      return {
        ...getBaseResult(
          "HC_HR_001",
          "Multiple GA4 Config Tags Found",
          "Only one primary GA4 configuration tag should exist.",
          "HIGH",
          passed
        ),

        affectedTags: passed ? [] : mapTags(configs, data),
        recommendation: passed ? "" : `Found ${configs.length} GA4 configuration tags. Keep one primary Google tag configuration.`,

        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_HR_002",
    title: "Google Ads Tag Without Conversion Linker",
    description: "Google Ads tags detected but Conversion Linker tag is missing.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const adsTags = data.tags.filter(isGoogleAdsTag);
      const hasLinker = data.tags.some(isConversionLinkerTag);
      const passed = adsTags.length === 0 || hasLinker;

      return {
        ...getBaseResult(
          "HC_HR_002",
          "Google Ads Tag Without Conversion Linker",
          "Google Ads tags detected but Conversion Linker tag is missing.",
          "HIGH",
          passed
        ),

        affectedTags: passed ? [] : mapTags(adsTags, data),
        recommendation: passed ? "" : `Found ${adsTags.length} Google Ads tags without a Conversion Linker. Add a Conversion Linker tag for proper attribution.`,

        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_HR_003",
    title: "Purchase Trigger Firing Multiple Same Platform Tags",
    description: "A purchase trigger should not fire multiple GA4 purchase tags for the same conversion event.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const purchaseTags = data.tags.filter(isPurchaseTag);
      const triggerMap = new Map<string, GTMItem[]>();
      purchaseTags.forEach((tag) => {
        getFiringTriggerIds(tag).forEach((triggerId) => {
          const group = triggerMap.get(triggerId) || []; group.push(tag); triggerMap.set(triggerId, group);
        });
      });
      const duplicateGroups = Array.from(triggerMap.entries()).filter(([, tags]) => {
        const ga4PurchaseTags = tags.filter((tag) => isGA4EventTag(tag) && getParamValue(tag, "eventName").trim().toLowerCase() === "purchase");

        return (ga4PurchaseTags.length > 1);
      });

      const affected = duplicateGroups.flatMap(([, tags]) => tags);

      const passed = duplicateGroups.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_003",
          "Purchase Trigger Firing Multiple Same Platform Tags",
          "A purchase trigger should not fire multiple GA4 purchase tags for the same conversion event.",
          "HIGH",
          passed
        ),

        affectedTags: passed ? [] : mapTags(affected, data),
        recommendation: passed ? "" : "Review purchase tags sharing the same trigger and consolidate duplicate purchase tracking.",
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
          triggers: buildGTMListUrl("triggers", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_HR_004",
    title: "Purchase Tag Has Multiple Triggers",
    description: "Purchase tags should avoid unnecessary multiple firing triggers.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.tags.filter((tag) => isPurchaseTag(tag) && getFiringTriggerIds(tag).length > 1);
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_004",
          "Purchase Tag Has Multiple Triggers",
          "Purchase tags should avoid unnecessary multiple firing triggers.",
          "HIGH",
          passed
        ),

        affectedTags: passed ? [] : mapTags(invalid, data),
        recommendation: passed ? "" : "Review purchase trigger logic and use one controlled purchase trigger where possible.",

        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_HR_005",
    title: "Custom HTML Missing Try Catch",
    description: "Custom HTML tags should contain safe error handling where the script performs operations that may fail.",
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

            if (
              !html.trim()
            ) {
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
        ...getBaseResult(
          "HC_HR_005",
          "Custom HTML Missing Try Catch",
          "Custom HTML tags should contain safe error handling where the script performs operations that may fail.",
          "HIGH",
          passed
        ),

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

  {
    id: "HC_HR_006",
    title:
      "GA4 Event Without GA4 Configuration",
    description:
      "GA4 Event tags should have a valid GA4 Google tag configuration available.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const eventTags =
        data.tags.filter(
          isGA4EventTag
        );

      const configTags =
        data.tags.filter(
          isGA4ConfigTag
        );

      const invalid =
        configTags.length === 0
          ? eventTags
          : [];

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_006",
          "GA4 Event Without GA4 Configuration",
          "GA4 Event tags should have a valid GA4 Google tag configuration available.",
          "HIGH",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Create a valid GA4 Google tag configuration before firing GA4 Event tags.",

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
            .map(
              getTriggerId
            )
            .filter(Boolean)
        );

      const invalid =
        data.tags.filter(
          (tag) => {
            const ids =
              getFiringTriggerIds(
                tag
              );

            return ids.some(
              (id) =>
                !triggerIds.has(
                  id
                ) &&
                !isBuiltInTriggerId(
                  id
                )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_007",
          "Missing Trigger Dependency",
          "Tags reference trigger IDs that do not exist in the workspace.",
          "HIGH",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Create the missing trigger or remove the broken trigger reference.",

        gtmLinks: {
          tags: buildGTMListUrl(
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

  {
    id: "HC_HR_008",
    title: "Missing Variable Dependency",
    description: "Tags or triggers reference variables that do not exist.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const missing = getMissingVariableReferences(data);

      const invalidTags = data.tags.filter((tag) => objectContainsMissingVariable(tag, missing));
      const invalidTriggers = data.triggers.filter((trigger) => objectContainsMissingVariable(trigger, missing));

      const passed = invalidTags.length === 0 && invalidTriggers.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_008",
          "Missing Variable Dependency",
          "Tags or triggers reference variables that do not exist.",
          "HIGH",
          passed
        ),
        affectedTags: mapTags(invalidTags, data),

        affectedTriggers: mapTriggers(invalidTriggers, data),

        recommendation:
          passed
            ? ""
            : `Create or correct the missing variable references: ${Array.from(
              missing
            ).join(", ")}.`,

        gtmLinks: {
          tags: buildGTMListUrl(
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

  {
    id: "HC_HR_009",
    title:
      "Legacy Universal Analytics Tag Found",
    description:
      "Universal Analytics tags are deprecated and should be removed or migrated.",
    severity: "HIGH",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) => {
            const type =
              getType(tag);

            const name =
              getName(tag)
                .toLowerCase();

            return (
              type === "ua" ||
              type ===
              "analytics" ||
              type.includes(
                "universal"
              ) ||
              name.includes(
                "universal analytics"
              )
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_HR_009",
          "Legacy Universal Analytics Tag Found",
          "Universal Analytics tags are deprecated and should be removed or migrated.",
          "HIGH",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Remove legacy Universal Analytics tags and migrate tracking to GA4.",

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
  // MEDIUM RISK
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
          (tag) =>
            getMissingPurchaseParameters(
              tag
            ).length > 0
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_001",
          "Purchase Event Missing Ecommerce Parameters",
          "Purchase tags should contain transaction_id, value, currency and items.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Add transaction_id, value, currency and items to purchase events.",

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

  {
    id: "HC_MR_002",
    title:
      "GA4 Config Not Firing on All Pages",
    description:
      "The primary GA4 Google tag should normally fire on All Pages or Initialization.",
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
          (tag) =>
            !firesOnAllPagesOrInitialization(
              tag,
              data
            )
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_002",
          "GA4 Config Not Firing on All Pages",
          "The primary GA4 Google tag should normally fire on All Pages or Initialization.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Fire the primary GA4 Google tag on All Pages or Initialization, depending on your implementation.",

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

  {
    id: "HC_MR_003",
    title:
      "Large Number of Custom JS Variables",
    description:
      "More than 25 Custom JavaScript variables were detected.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const variables =
        data.variables.filter(
          isCustomJavaScriptVariable
        );

      const passed =
        variables.length <= 25;

      return {
        ...getBaseResult(
          "HC_MR_003",
          "Large Number of Custom JS Variables",
          "More than 25 Custom JavaScript variables were detected.",
          "MEDIUM",
          passed
        ),

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
            : `Found ${variables.length} Custom JavaScript variables. Reduce and consolidate JavaScript usage where possible.`,

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
      "A single trigger should not fire multiple GA4 tags that produce the same event.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const triggerMap =
        new Map<
          string,
          GTMItem[]
        >();

      data.tags.forEach(
        (tag) => {
          getFiringTriggerIds(
            tag
          ).forEach(
            (triggerId) => {
              const group =
                triggerMap.get(
                  triggerId
                ) || [];

              group.push(
                tag
              );

              triggerMap.set(
                triggerId,
                group
              );
            }
          );
        }
      );

      const invalidTriggerIds =
        Array.from(
          triggerMap.entries()
        )
          .filter(
            ([, tags]) => {
              const ga4Events =
                tags.filter(
                  isGA4EventTag
                );

              const eventNames =
                new Set(
                  ga4Events
                    .map(
                      (tag) =>
                        getParamValue(
                          tag,
                          "eventName"
                        )
                          .trim()
                          .toLowerCase()
                    )
                    .filter(Boolean)
                );

              return (
                eventNames.size >
                0 &&
                eventNames.size <
                ga4Events.length
              );
            }
          )
          .map(
            ([triggerId]) =>
              triggerId
          );

      const affectedTriggers =
        invalidTriggerIds
          .map(
            (triggerId) =>
              getTriggerById(
                data,
                triggerId
              )
          )
          .filter(
            (
              trigger
            ): trigger is GTMItem =>
              Boolean(trigger)
          );

      const passed =
        invalidTriggerIds.length ===
        0;

      return {
        ...getBaseResult(
          "HC_MR_004",
          "Trigger Attached to Multiple Same Platform Tags",
          "A single trigger should not fire multiple GA4 tags that produce the same event.",
          "MEDIUM",
          passed
        ),

        affectedTriggers:
          mapTriggers(
            affectedTriggers,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Review triggers that fire duplicate GA4 events and differentiate or consolidate their firing conditions.",

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
      "GA4 Event Name Missing",
    description:
      "GA4 Event tags should define a valid event name.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const invalid =
        data.tags.filter(
          (tag) =>
            isGA4EventTag(tag) &&
            !getParamValue(
              tag,
              "eventName"
            ).trim()
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_005",
          "GA4 Event Name Missing",
          "GA4 Event tags should define a valid event name.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Add a valid eventName parameter to every GA4 Event tag.",

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

  {
    id: "HC_MR_006",
    title:
      "Duplicate GA4 Event Names",
    description:
      "Multiple GA4 Event tags use the same event name.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const groups =
        new Map<
          string,
          GTMItem[]
        >();

      data.tags
        .filter(
          isGA4EventTag
        )
        .forEach(
          (tag) => {
            const eventName =
              getParamValue(
                tag,
                "eventName"
              )
                .trim()
                .toLowerCase();

            if (!eventName) {
              return;
            }

            const group =
              groups.get(
                eventName
              ) || [];

            group.push(
              tag
            );

            groups.set(
              eventName,
              group
            );
          }
        );

      const duplicates =
        Array.from(
          groups.values()
        )
          .filter(
            (group) =>
              group.length > 1
          )
          .flat();

      const passed =
        duplicates.length ===
        0;

      return {
        ...getBaseResult(
          "HC_MR_006",
          "Duplicate GA4 Event Names",
          "Multiple GA4 Event tags use the same event name.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            duplicates,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Review duplicate GA4 event tags and consolidate them or differentiate their firing conditions.",

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

  {
    id: "HC_MR_007",
    title:
      "Analytics Tags Missing Consent Settings",
    description:
      "Analytics tags should be reviewed for appropriate consent behavior.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const analyticsTags =
        data.tags.filter(
          isAnalyticsTag
        );

      const invalid =
        analyticsTags.filter(
          (tag) => {
            if (
              isConsentRelatedTag(
                tag
              )
            ) {
              return false;
            }

            return !hasConfiguredConsentSettings(
              tag
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_007",
          "Analytics Tags Missing Consent Settings",
          "Analytics tags should be reviewed for appropriate consent behavior.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Review consent behavior for analytics tags and configure additional consent requirements where required by your implementation.",

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

  {
    id: "HC_MR_008",
    title:
      "Marketing Tags Missing Consent Settings",
    description:
      "Marketing and advertising tags should respect user consent.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const marketingTags =
        data.tags.filter(
          isMarketingTag
        );

      const invalid =
        marketingTags.filter(
          (tag) =>
            !isConsentRelatedTag(
              tag
            ) &&
            !hasConfiguredConsentSettings(
              tag
            )
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_008",
          "Marketing Tags Missing Consent Settings",
          "Marketing and advertising tags should respect user consent.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          mapTags(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Configure appropriate consent requirements for marketing and advertising tags.",

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

  {
    id: "HC_MR_009",
    title:
      "Consent Initialization Not Detected",
    description:
      "Consent configuration should be initialized before other tracking tags.",
    severity: "MEDIUM",

    check: (
      data: GTMHealthData
    ): HealthCheckResult => {
      const consentTags =
        data.tags.filter(
          isConsentRelatedTag
        );

      const initializationTags =
        consentTags.filter(
          (tag) =>
            hasConsentInitializationTrigger(
              tag,
              data
            )
        );

      const passed =
        consentTags.length ===
        0 ||
        initializationTags.length >
        0;

      return {
        ...getBaseResult(
          "HC_MR_009",
          "Consent Initialization Not Detected",
          "Consent configuration should be initialized before other tracking tags.",
          "MEDIUM",
          passed
        ),

        affectedTags:
          passed
            ? []
            : mapTags(
              consentTags,
              data
            ),

        recommendation:
          passed
            ? ""
            : "Configure consent defaults or consent-management logic on the Consent Initialization trigger.",

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

  {
    id: "HC_MR_010",
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
            const filters =
              getArray(
                trigger,
                "filter"
              ).filter(
                (
                  item
                ): item is GTMItem =>
                  typeof item ===
                  "object" &&
                  item !== null &&
                  !Array.isArray(
                    item
                  )
              );

            return filters.some(
              (filter) => {
                const operator =
                  getString(
                    filter,
                    "type"
                  )
                    .trim()
                    .toLowerCase();

                const value =
                  getString(
                    filter,
                    "value"
                  );

                return (
                  operator.includes(
                    "regex"
                  ) &&
                  isBroadRegex(
                    value
                  )
                );
              }
            );
          }
        );

      const passed =
        invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_010",
          "Broad Regex Trigger Detected",
          "Overly broad regular expressions can cause unintended tag firing.",
          "MEDIUM",
          passed
        ),

        affectedTriggers:
          mapTriggers(
            invalid,
            data
          ),

        recommendation:
          passed
            ? ""
            : "Review broad regex conditions and replace .* or similarly unrestricted patterns with narrower matching rules.",

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
    id: "HC_MR_011",
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
        ...getBaseResult(
          "HC_MR_011",
          "Custom Event Trigger Missing Event Name",
          "Custom Event triggers should define the event they listen for.",
          "MEDIUM",
          passed
        ),

        affectedTriggers:
          mapTriggers(
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

  {
    id: "HC_MR_012",
    title:"Hardcoded Measurement ID Detected",
    description:"Repeated hardcoded GA4 measurement IDs should be centralized where reuse is beneficial.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const measurementPattern = /^G-[A-Z0-9]{6,}$/i;
      const invalid = data.tags.filter((tag) => {
            if (!isGA4ConfigTag(tag)) {
              return false;
            }
            const tagId = getParamValue(tag,"tagId").trim();
            return (measurementPattern.test(tagId) &&!tagId.includes("{{"));
          }
        );

      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_012",
          "Hardcoded Measurement ID Detected",
          "Repeated hardcoded GA4 measurement IDs should be centralized where reuse is beneficial.",
          "MEDIUM",
          passed
        ),

        affectedTags:mapTags(invalid, data),
        recommendation:passed ? "": "Consider storing reusable GA4 measurement IDs in a GTM variable.",
        gtmLinks: {tags: buildGTMListUrl("tags",data.accountId,data.containerId,data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_MR_013",
    title:"Suspicious Custom HTML Detected",
    description:"Custom HTML contains potentially unsafe or unnecessary JavaScript patterns.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const patterns = [/\beval\s*\(/i,/\bnew\s+Function\s*\(/i,/document\.write\s*\(/i,/javascript\s*:/i,];
      const invalid = data.tags.filter((tag) => {
            if (!isCustomHTMLTag(tag)) {
              return false;
            }
            const html = getParamValue(tag,"html");
            return patterns.some((pattern) =>pattern.test(html));
          }
        );

      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_013",
          "Suspicious Custom HTML Detected",
          "Custom HTML contains potentially unsafe or unnecessary JavaScript patterns.",
          "MEDIUM",
          passed
        ),

        affectedTags:mapTags(invalid,data),
        recommendation:passed? "":"Review Custom HTML for unsafe or unnecessary JavaScript patterns and replace them with safer implementations where possible.",
        gtmLinks: {tags: buildGTMListUrl("tags",data.accountId,data.containerId,data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_MR_014",
    title: "Large Custom HTML Tag",
    description: "Very large Custom HTML tags can reduce maintainability and performance.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.tags.filter((tag) => {
        if (!isCustomHTMLTag(tag)) {
          return false;
        }
        const html = getParamValue(tag, "html");
        return (html.length > 10000);
      }
      );

      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_MR_014",
          "Large Custom HTML Tag",
          "Very large Custom HTML tags can reduce maintainability and performance.",
          "MEDIUM",
          passed
        ),
        affectedTags: mapTags(invalid, data),
        recommendation: passed ? "" : "Move large custom scripts to a Custom Template or external implementation where appropriate.",
        gtmLinks: {
        tags: buildGTMListUrl("tags",data.accountId,data.containerId,data.workspaceId),
        },
      };
    },
  },

  // =====================================================
  // LOW RISK
  // =====================================================

  {
    id: "HC_LR_001",
    title: "Unused Tags Found",
    description: "Tags without firing triggers should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.tags.filter((tag) => getFiringTriggerIds(tag).length === 0 && !Boolean(tag.paused));
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_001",
          "Unused Tags Found",
          "Tags without firing triggers should be reviewed.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(invalid, data),
        recommendation: passed ? "" : `Found ${invalid.length} tags without firing triggers.`,
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_002",
    title: "Paused Tags Found",
    description: "Paused tags should be reviewed before publishing.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.tags.filter((tag) => Boolean(tag.paused));
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_002",
          "Paused Tags Found",
          "Paused tags should be reviewed before publishing.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(invalid, data),

        recommendation: passed ? "" : `Found ${invalid.length} paused tags.`,
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_003",
    title: "Unused Variables Found",
    description: "Variables not used inside tags or triggers should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const references = getAllVariableReferences(data);
      const invalid = data.variables.filter((variable) => {
        const name = getName(variable);
        if (!name) {
          return false;
        }
        return !Array.from(references).some((reference) => reference.toLowerCase() === name.toLowerCase());
      }
      );

      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_003",
          "Unused Variables Found",
          "Variables not used inside tags or triggers should be reviewed.",
          "LOW",
          passed
        ),
        affectedVariables: mapVariables(invalid, data),
        recommendation: passed ? "" : `Found ${invalid.length} unused variables.`,
        gtmLinks: {
          variables: buildGTMListUrl("variables", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_004",
    title: "Large Number of Tags",
    description: "Large containers require optimization and cleanup.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const count = data.tags.length;
      const passed = count < 300;

      return {
        ...getBaseResult(
          "HC_LR_004",
          "Large Number of Tags",
          "Large containers require optimization and cleanup.",
          "LOW",
          passed
        ),
        recommendation: passed ? "" : `Container contains ${count} tags. Review and optimize tag structure.`,

        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_005",
    title: "Large Number of Triggers",
    description: "Large trigger setups require optimization and cleanup.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const count = data.triggers.length;
      const passed = count < 200;

      return {
        ...getBaseResult(
          "HC_LR_005",
          "Large Number of Triggers",
          "Large trigger setups require optimization and cleanup.",
          "LOW",
          passed
        ),
        recommendation: passed ? "" : `Container contains ${count} triggers. Review and optimize trigger structure.`,
        gtmLinks: {
          triggers: buildGTMListUrl("triggers", data.accountId, data.containerId, data.workspaceId
          ),
        },
      };
    },
  },

  {
    id: "HC_LR_006",
    title: "Unused Triggers Found",
    description: "Triggers that are not referenced by any tag should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const usedTriggerIds = new Set<string>(); data.tags.forEach((tag) => {
        getFiringTriggerIds(tag).forEach((id) => usedTriggerIds.add(id));
        getBlockingTriggerIds(tag).forEach((id) => usedTriggerIds.add(id));
      }
      );

      const invalid = data.triggers.filter((trigger) => {
        const id = getTriggerId(trigger); return (Boolean(id) && !usedTriggerIds.has(id));
      });
      const passed = invalid.length === 0;
      return {
        ...getBaseResult(
          "HC_LR_006",
          "Unused Triggers Found",
          "Triggers that are not referenced by any tag should be reviewed.",
          "LOW",
          passed
        ),

        affectedTriggers: mapTriggers(invalid, data),
        recommendation: passed ? "" : `Found ${invalid.length} unused triggers. Review and remove triggers that are no longer required.`,
        gtmLinks: { triggers: buildGTMListUrl("triggers", data.accountId, data.containerId, data.workspaceId), },
      };
    },
  },

  {
    id: "HC_LR_007",
    title: "Paused Triggers Found",
    description: "Paused triggers should be reviewed before publishing.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.triggers.filter((trigger) => Boolean(trigger.paused));
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_007",
          "Paused Triggers Found",
          "Paused triggers should be reviewed before publishing.",
          "LOW",
          passed
        ),

        affectedTriggers: mapTriggers(invalid, data),
        recommendation: passed ? "" : `Found ${invalid.length} paused triggers.`,
        gtmLinks: {
          triggers: buildGTMListUrl("triggers", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_008",
    title: "Test or Debug Tags Found",
    description: "Tags with test, debug, temporary or development naming should be reviewed.",
    severity: "LOW",

    check: (
      data: GTMHealthData): HealthCheckResult => {
      const pattern = /\b(test|testing|debug|temporary|temp|dev)\b/i;
      const invalid = data.tags.filter((tag) => pattern.test(getName(tag)));
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_008",
          "Test or Debug Tags Found",
          "Tags with test, debug, temporary or development naming should be reviewed.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(invalid, data),
        recommendation: passed ? "" : "Review test/debug tags and remove them before production publishing.",
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_009",
    title: "Generic Tag Names Found",
    description: "Generic names make GTM containers difficult to maintain.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const genericNames = new Set(["tag", "tag 1", "tag 2", "new tag", "html", "test tag", "copy"]);
      const invalid = data.tags.filter((tag) => genericNames.has(getName(tag).toLowerCase()));
      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_009",
          "Generic Tag Names Found",
          "Generic names make GTM containers difficult to maintain.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(invalid, data),
        recommendation: passed ? "" : "Rename generic tags using descriptive names that explain their purpose.",
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_010",
    title: "Duplicate Tag, Trigger and Variable Names",
    description: "Duplicate asset names can make containers difficult to maintain.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const duplicateTags = findDuplicateGroups(data.tags).flat();
      const duplicateTriggers = findDuplicateGroups(data.triggers).flat();
      const duplicateVariables = findDuplicateGroups(data.variables).flat();
      const passed = duplicateTags.length === 0 && duplicateTriggers.length === 0 && duplicateVariables.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_010",
          "Duplicate Tag, Trigger and Variable Names",
          "Duplicate asset names can make containers difficult to maintain.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(duplicateTags, data),
        affectedTriggers: mapTriggers(duplicateTriggers, data),
        affectedVariables: mapVariables(duplicateVariables, data),
        recommendation: passed ? "" : "Rename duplicate assets using a consistent naming convention.",
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
          triggers: buildGTMListUrl("triggers", data.accountId, data.containerId, data.workspaceId), variables: buildGTMListUrl("variables", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_011",
    title: "Recommended GA4 Events Missing",
    description: "Common ecommerce GA4 events should be reviewed when ecommerce tracking is implemented.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const eventNames = new Set(data.tags.filter(isGA4EventTag).map((tag) => getParamValue(tag, "eventName").trim().toLowerCase()).filter(Boolean));
      const ecommerceSignals = ["purchase", "add_to_cart", "begin_checkout", "view_item",];
      const hasEcommerce = ecommerceSignals.some((event) => eventNames.has(event));

      if (!hasEcommerce) {
        return {
          ...getBaseResult(
            "HC_LR_011",
            "Recommended GA4 Events Missing",
            "Common ecommerce GA4 events should be reviewed when ecommerce tracking is implemented.",
            "LOW",
            true
          ),
          recommendation: "",
          gtmLinks: { tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId), },
        };
      }

      const recommended = ["view_item", "add_to_cart", "begin_checkout", "purchase",];
      const missing = recommended.filter((event) => !eventNames.has(event));
      const passed = missing.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_011",
          "Recommended GA4 Events Missing",
          "Common ecommerce GA4 events should be reviewed when ecommerce tracking is implemented.",
          "LOW",
          passed
        ),

        recommendation: passed ? "" : `Recommended GA4 ecommerce events not detected: ${missing.join(", ")}.`,
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_012",
    title: "Large Number of Variables",
    description: "A very large variable collection may indicate container clutter.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const count = data.variables.length;
      const passed = count < 300;

      return {
        ...getBaseResult(
          "HC_LR_012",
          "Large Number of Variables",
          "A very large variable collection may indicate container clutter.",
          "LOW",
          passed
        ),

        recommendation: passed ? "" : `Container contains ${count} variables. Review unused and duplicated variables.`,
        gtmLinks: {
          variables: buildGTMListUrl("variables", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },

  {
    id: "HC_LR_013",
    title: "Inconsistent GA4 Event Naming",
    description: "GA4 event names should follow consistent lowercase snake_case naming.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalid = data.tags.filter((tag) => {
        if (!isGA4EventTag(tag)) {
          return false;
        }
        const eventName = getParamValue(tag, "eventName").trim();

        if (!eventName) {
          return false;
        }
        return !/^[a-z][a-z0-9_]*$/.test(eventName);
      }
      );

      const passed = invalid.length === 0;

      return {
        ...getBaseResult(
          "HC_LR_013",
          "Inconsistent GA4 Event Naming",
          "GA4 event names should follow consistent lowercase snake_case naming.",
          "LOW",
          passed
        ),

        affectedTags: mapTags(invalid, data),
        recommendation: passed ? "" : "Use lowercase GA4 event names with letters, numbers and underscores.",
        gtmLinks: {
          tags: buildGTMListUrl("tags", data.accountId, data.containerId, data.workspaceId),
        },
      };
    },
  },
];