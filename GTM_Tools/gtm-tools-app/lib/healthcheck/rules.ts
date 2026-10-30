import { GTMHealthData, HealthCheckResult, AffectedItem } from "./types";

// =====================================================
// TYPES
// =====================================================

type GTMItem = Record<string, unknown>;
type AssetType = "tags" | "triggers" | "variables";
type Severity = "HIGH" | "MEDIUM" | "LOW";

// =====================================================
// BASIC HELPERS
// =====================================================

const getString = (obj: GTMItem, key: string): string => {
  const value = obj[key];
  return typeof value === "string" ? value : "";
};

const getArray = (obj: GTMItem, key: string): unknown[] => {
  const value = obj[key];
  return Array.isArray(value) ? value : [];
};

const getObject = (obj: GTMItem, key: string): GTMItem | null => {
  const value = obj[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as GTMItem) : null;
};

/** GTM normally returns paused as a boolean, but tolerate "true" strings too. */
const isPaused = (item: GTMItem): boolean => item.paused === true || item.paused === "true";

const isItem = (v: unknown): v is GTMItem => typeof v === "object" && v !== null && !Array.isArray(v);

const getType = (obj: GTMItem): string => getString(obj, "type").trim().toLowerCase();
const getName = (obj: GTMItem): string => getString(obj, "name").trim();
const getTagId = (tag: GTMItem): string => getString(tag, "tagId");
const getTriggerId = (trigger: GTMItem): string => getString(trigger, "triggerId");
const getVariableId = (variable: GTMItem): string => getString(variable, "variableId");

// =====================================================
// PARAMETER HELPERS
// =====================================================

const getParameters = (obj: GTMItem): GTMItem[] => getArray(obj, "parameter").filter(isItem);
const getParameter = (obj: GTMItem, key: string): GTMItem | undefined =>
  getParameters(obj).find((parameter) => getString(parameter, "key") === key);
const getParamValue = (obj: GTMItem, key: string): string => {
  const parameter = getParameter(obj, key);
  return parameter ? getString(parameter, "value") : "";
};

/** Every string found anywhere in a value (keys, values, nested lists/maps). */
const collectStrings = (value: unknown, out: Set<string> = new Set<string>()): Set<string> => {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((v) => collectStrings(v, out));
  return out;
};

// =====================================================
// ID HELPERS
// =====================================================

const getFiringTriggerIds = (tag: GTMItem): string[] =>
  getArray(tag, "firingTriggerId").filter((id): id is string => typeof id === "string" && Boolean(id.trim()));

const getBlockingTriggerIds = (tag: GTMItem): string[] =>
  getArray(tag, "blockingTriggerId").filter((id): id is string => typeof id === "string" && Boolean(id.trim()));

// =====================================================
// GTM URL HELPERS
// =====================================================

const gtmBase = (accountId: string, containerId: string, workspaceId: string) =>
  `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

const buildGTMListUrl = (type: AssetType, accountId: string, containerId: string, workspaceId: string): string =>
  `${gtmBase(accountId, containerId, workspaceId)}/${type}`;

const buildGTMEditUrl = (type: AssetType, accountId: string, containerId: string, workspaceId: string, id: string): string =>
  `${gtmBase(accountId, containerId, workspaceId)}/${type}/${id}/edit`;

// =====================================================
// AFFECTED ITEM HELPERS
// =====================================================

const getAssetId = (item: GTMItem): string => getTagId(item) || getTriggerId(item) || getVariableId(item);

const mapToAffectedItem = (item: GTMItem, type: AssetType, data: GTMHealthData): AffectedItem => {
  const id = getAssetId(item);
  return {
    name: getName(item) || "Unnamed",
    id,
    editUrl: id ? buildGTMEditUrl(type, data.accountId, data.containerId, data.workspaceId, id) : undefined,
  };
};

const mapTags = (tags: GTMItem[], data: GTMHealthData): AffectedItem[] => tags.map((t) => mapToAffectedItem(t, "tags", data));
const mapTriggers = (triggers: GTMItem[], data: GTMHealthData): AffectedItem[] => triggers.map((t) => mapToAffectedItem(t, "triggers", data));
const mapVariables = (variables: GTMItem[], data: GTMHealthData): AffectedItem[] => variables.map((v) => mapToAffectedItem(v, "variables", data));

// =====================================================
// BUILT-IN GTM TRIGGERS
// =====================================================

const BUILT_IN_TRIGGER_IDS = new Set<string>(["2147479553", "2147479572", "2147479573"]);
const BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS = new Set<string>(["2147479553", "2147479572"]);
const CONSENT_INITIALIZATION_TRIGGER_ID = "2147479573";

const isBuiltInTriggerId = (id: string): boolean => BUILT_IN_TRIGGER_IDS.has(id);
const isBuiltInAllPagesTriggerId = (id: string): boolean => BUILT_IN_ALL_PAGES_LIKE_TRIGGER_IDS.has(id);

// =====================================================
// TRIGGER HELPERS
// =====================================================

const getTriggerById = (data: GTMHealthData, triggerId: string): GTMItem | undefined =>
  data.triggers.find((trigger) => getTriggerId(trigger) === triggerId);

const getTriggerNamesForTag = (tag: GTMItem, data: GTMHealthData): string[] =>
  getFiringTriggerIds(tag)
    .map((id) => getTriggerById(data, id))
    .filter((trigger): trigger is GTMItem => Boolean(trigger))
    .map((trigger) => getName(trigger).toLowerCase());

const triggerNameLooksLikeAllPages = (name: string): boolean => {
  const n = name.trim().toLowerCase();
  return n === "all pages" || n.includes("all pages") || n.includes("initialization");
};

const firesOnAllPagesOrInitialization = (tag: GTMItem, data: GTMHealthData): boolean => {
  if (getFiringTriggerIds(tag).some(isBuiltInAllPagesTriggerId)) return true;
  return getTriggerNamesForTag(tag, data).some(triggerNameLooksLikeAllPages);
};

// =====================================================
// CLASSIFICATION HELPERS
// =====================================================

const NON_GA4_GOOGTAG_PREFIXES = ["aw-", "dc-", "gtag-", "gtm-", "ua-"];

const isGA4ConfigTag = (tag: GTMItem): boolean => {
  const type = getType(tag);
  if (type === "gaawc") return true;
  if (type === "googtag") {
    const tagId = getParamValue(tag, "tagId").trim().toLowerCase();
    return Boolean(tagId) && !NON_GA4_GOOGTAG_PREFIXES.some((prefix) => tagId.startsWith(prefix));
  }
  return false;
};

const isGA4EventTag = (tag: GTMItem): boolean => getType(tag) === "gaawe";

const isGoogleAdsTag = (tag: GTMItem): boolean => {
  const type = getType(tag);
  if (type === "awct" || type === "sp") return true;
  if (type !== "googtag") return false;
  return getParamValue(tag, "tagId").trim().toLowerCase().startsWith("aw-");
};

const isConversionLinkerTag = (tag: GTMItem): boolean => getType(tag) === "gclidw";

const isPurchaseTag = (tag: GTMItem): boolean => {
  const name = getName(tag).toLowerCase();
  const eventName = getParamValue(tag, "eventName").trim().toLowerCase();
  return name.includes("purchase") || eventName === "purchase";
};

const isAnalyticsTag = (tag: GTMItem): boolean => isGA4ConfigTag(tag) || isGA4EventTag(tag);

const MARKETING_TYPES = ["fls", "flc", "baut", "floodlight", "marketing", "adwords", "adroll", "facebook", "linkedin", "twitter", "pinterest", "tiktok"];
const MARKETING_NAME_HINTS = ["meta pixel", "facebook", "linkedin", "tiktok", "pinterest", "twitter", "bing", "floodlight"];

const isMarketingTag = (tag: GTMItem): boolean => {
  const type = getType(tag);
  const name = getName(tag).toLowerCase();
  return (
    isGoogleAdsTag(tag) ||
    MARKETING_TYPES.some((t) => type === t || (t.length > 3 && type.includes(t))) ||
    (type === "html" && MARKETING_NAME_HINTS.some((hint) => name.includes(hint)))
  );
};

const isCustomHTMLTag = (tag: GTMItem): boolean => getType(tag) === "html";
const isCustomJavaScriptVariable = (variable: GTMItem): boolean => getType(variable) === "jsm";

/** GA4 config measurement ID can live in "tagId", "measurementId" or "measurementIdOverride". */
const getMeasurementId = (tag: GTMItem): string =>
  (getParamValue(tag, "tagId") || getParamValue(tag, "measurementId") || getParamValue(tag, "measurementIdOverride")).trim();

// =====================================================
// VARIABLE REFERENCE HELPERS
// =====================================================

const extractVariableReferences = (value: unknown): string[] => {
  if (typeof value !== "string") return [];
  const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const references: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const name = match[1].trim();
    if (name) references.push(name);
  }
  return references;
};

const extractReferencesFromObject = (value: unknown): string[] => {
  const references: string[] = [];
  const visit = (current: unknown): void => {
    if (typeof current === "string") references.push(...extractVariableReferences(current));
    else if (Array.isArray(current)) current.forEach(visit);
    else if (typeof current === "object" && current !== null) Object.values(current as Record<string, unknown>).forEach(visit);
  };
  visit(value);
  return references;
};

// =====================================================
// BUILT-IN VARIABLE NAMES
// =====================================================

const BUILT_IN_VARIABLE_NAMES = new Set(
  [
    "_event", "Event", "Page Hostname", "Page Path", "Page URL", "Referrer",
    "Click Classes", "Click Element", "Click ID", "Click Target", "Click Text", "Click URL",
    "Form Classes", "Form Element", "Form ID", "Form Target", "Form Text", "Form URL",
    "History Source", "History New URL Fragment", "History New State", "History Old URL Fragment", "History Old State",
    "Random Number", "Container ID", "Container Version", "Debug Mode", "Environment Name", "HTML ID",
    "Error Message", "Error URL", "Error Line",
    "Video Current Time", "Video Duration", "Video Percent", "Video Provider", "Video Status", "Video Title", "Video URL", "Video Visible",
    "Scroll Depth Threshold", "Scroll Depth Units", "Scroll Direction",
    "Percent Visible", "On-Screen Duration",
  ].map((name) => name.toLowerCase())
);

const isBuiltInVariableName = (name: string): boolean => BUILT_IN_VARIABLE_NAMES.has(name.trim().toLowerCase());

// =====================================================
// USAGE HELPERS
// =====================================================

const getAllVariableReferences = (data: GTMHealthData): Set<string> => {
  const references = new Set<string>();
  [...data.tags, ...data.triggers, ...data.variables].forEach((item) =>
    extractReferencesFromObject(item).forEach((reference) => references.add(reference))
  );
  return references;
};

const getMissingVariableReferences = (data: GTMHealthData): Set<string> => {
  const defined = new Set(data.variables.map(getName).filter(Boolean).map((n) => n.toLowerCase()));
  const missing = new Set<string>();
  getAllVariableReferences(data).forEach((reference) => {
    if (isBuiltInVariableName(reference)) return;
    if (!defined.has(reference.toLowerCase())) missing.add(reference);
  });
  return missing;
};

const objectContainsMissingVariable = (item: GTMItem, missing: Set<string>): boolean => {
  const lower = new Set(Array.from(missing).map((m) => m.toLowerCase()));
  return extractReferencesFromObject(item).some((reference) => lower.has(reference.toLowerCase()));
};

/** Names of tags that are used as setup/teardown tags (they legitimately have no trigger). */
const getSequencedTagNames = (data: GTMHealthData): Set<string> => {
  const names = new Set<string>();
  data.tags.forEach((tag) => {
    ["setupTag", "teardownTag"].forEach((key) =>
      getArray(tag, key).forEach((entry) => {
        if (isItem(entry)) {
          const n = getString(entry, "tagName").trim().toLowerCase();
          if (n) names.add(n);
        }
      })
    );
  });
  return names;
};

// =====================================================
// CONSENT HELPERS
// =====================================================

/** "notSet" means nothing is configured, so it must NOT count as configured. */
const hasConfiguredConsentSettings = (tag: GTMItem): boolean => {
  const settings = getObject(tag, "consentSettings");
  if (!settings) return false;
  const status = getString(settings, "consentStatus").trim().toLowerCase().replace(/[_\s]/g, "");
  return Boolean(status) && status !== "notset";
};

const isConsentRelatedTag = (tag: GTMItem): boolean => {
  const type = getType(tag);
  const name = getName(tag).toLowerCase();
  return type.includes("consent") || name.includes("consent") || name.includes("cmp");
};

const hasConsentInitializationTrigger = (tag: GTMItem, data: GTMHealthData): boolean => {
  if (getFiringTriggerIds(tag).includes(CONSENT_INITIALIZATION_TRIGGER_ID)) return true;
  return getTriggerNamesForTag(tag, data).some((name) => name.includes("consent initialization"));
};

// =====================================================
// REGEX / TRIGGER FILTER HELPERS
// =====================================================

const isBroadRegex = (value: string): boolean => {
  const n = value.trim().replace(/^\/|\/$/g, "").toLowerCase();
  return n === ".*" || n === "^.*$" || n === ".+" || n === "^.+$";
};

/** Trigger conditions are stored in filter / customEventFilter / autoEventFilter, each with parameter[] (arg0, arg1). */
const getTriggerConditions = (trigger: GTMItem): GTMItem[] =>
  ["filter", "customEventFilter", "autoEventFilter"].flatMap((key) => getArray(trigger, key).filter(isItem));

const conditionValues = (condition: GTMItem): string[] =>
  getParameters(condition).map((p) => getString(p, "value")).filter(Boolean);

// =====================================================
// NAME HELPERS
// =====================================================

const findDuplicateGroups = (items: GTMItem[]): GTMItem[][] => {
  const groups = new Map<string, GTMItem[]>();
  items.forEach((item) => {
    const name = getName(item);
    if (!name) return;
    const existing = groups.get(name) || [];
    existing.push(item);
    groups.set(name, existing);
  });
  return Array.from(groups.values()).filter((group) => group.length > 1);
};

// =====================================================
// PURCHASE PARAMETER HELPERS
// =====================================================

/**
 * GA4 event parameters are stored inside nested lists/maps (eventSettingsTable),
 * so look through the whole parameter tree. If "Send Ecommerce data" is on,
 * the values come from the dataLayer and nothing is missing.
 */
const getMissingPurchaseParameters = (tag: GTMItem): string[] => {
  if (getParamValue(tag, "sendEcommerceData").toLowerCase() === "true") return [];
  const strings = collectStrings(tag["parameter"]);
  return ["transaction_id", "value", "currency", "items"].filter((key) => !strings.has(key));
};

// =====================================================
// RULE FACTORY
// =====================================================

type RuleOutcome = {
  passed: boolean;
  tags?: GTMItem[];
  triggers?: GTMItem[];
  variables?: GTMItem[];
  recommendation?: string;
};

const defineRule = (
  id: string,
  title: string,
  description: string,
  severity: Severity,
  links: AssetType[],
  run: (data: GTMHealthData) => RuleOutcome
) => ({
  id,
  title,
  description,
  severity,
  check: (data: GTMHealthData): HealthCheckResult => {
    const outcome = run(data);
    const gtmLinks: Record<string, string> = {};
    links.forEach((type) => {
      gtmLinks[type] = buildGTMListUrl(type, data.accountId, data.containerId, data.workspaceId);
    });
    return {
      id,
      title,
      description,
      severity,
      passed: outcome.passed,
      ...(outcome.tags ? { affectedTags: mapTags(outcome.tags, data) } : {}),
      ...(outcome.triggers ? { affectedTriggers: mapTriggers(outcome.triggers, data) } : {}),
      ...(outcome.variables ? { affectedVariables: mapVariables(outcome.variables, data) } : {}),
      recommendation: outcome.passed ? "" : outcome.recommendation ?? "",
      gtmLinks,
    } as HealthCheckResult;
  },
});

// =====================================================
// HEALTHCHECK RULES
// =====================================================

export const healthCheckRules = [
  // ---------------------- HIGH RISK ----------------------

  defineRule("HC_HR_001", "Multiple GA4 Config Tags Found", "Only one primary GA4 configuration tag should exist.", "HIGH", ["tags"], (data) => {
    const configs = data.tags.filter(isGA4ConfigTag);
    const passed = configs.length <= 1;
    return {
      passed,
      tags: passed ? [] : configs,
      recommendation: `Found ${configs.length} GA4 configuration tags. Keep one primary Google tag configuration.`,
    };
  }),

  defineRule("HC_HR_002", "Google Ads Tag Without Conversion Linker", "Google Ads tags detected but Conversion Linker tag is missing.", "HIGH", ["tags"], (data) => {
    const adsTags = data.tags.filter(isGoogleAdsTag);
    const passed = adsTags.length === 0 || data.tags.some(isConversionLinkerTag);
    return {
      passed,
      tags: passed ? [] : adsTags,
      recommendation: `Found ${adsTags.length} Google Ads tags without a Conversion Linker. Add a Conversion Linker tag for proper attribution.`,
    };
  }),

  defineRule("HC_HR_003", "Purchase Trigger Firing Multiple Same Platform Tags", "A purchase trigger should not fire multiple GA4 purchase tags for the same conversion event.", "HIGH", ["tags", "triggers"], (data) => {
    const triggerMap = new Map<string, GTMItem[]>();
    data.tags.filter(isPurchaseTag).forEach((tag) =>
      getFiringTriggerIds(tag).forEach((triggerId) => {
        const group = triggerMap.get(triggerId) || [];
        group.push(tag);
        triggerMap.set(triggerId, group);
      })
    );
    const duplicateGroups = Array.from(triggerMap.values()).filter(
      (tags) => tags.filter((tag) => isGA4EventTag(tag) && getParamValue(tag, "eventName").trim().toLowerCase() === "purchase").length > 1
    );
    return {
      passed: duplicateGroups.length === 0,
      tags: Array.from(new Set(duplicateGroups.flat())),
      recommendation: "Review purchase tags sharing the same trigger and consolidate duplicate purchase tracking.",
    };
  }),

  defineRule("HC_HR_004", "Purchase Tag Has Multiple Triggers", "Purchase tags should avoid unnecessary multiple firing triggers.", "HIGH", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => isPurchaseTag(tag) && getFiringTriggerIds(tag).length > 1);
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Review purchase trigger logic and use one controlled purchase trigger where possible." };
  }),

  defineRule("HC_HR_005", "Custom HTML Missing Try Catch", "Custom HTML tags should contain safe error handling where the script performs operations that may fail.", "HIGH", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => {
      if (!isCustomHTMLTag(tag)) return false;
      const html = getParamValue(tag, "html");
      return Boolean(html.trim()) && !/try\s*\{/i.test(html);
    });
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Review Custom HTML scripts and add appropriate try-catch handling where runtime failures are possible." };
  }),

  defineRule("HC_HR_006", "GA4 Event Without GA4 Configuration", "GA4 Event tags should have a valid GA4 Google tag configuration available.", "HIGH", ["tags"], (data) => {
    const invalid = data.tags.filter(isGA4ConfigTag).length === 0 ? data.tags.filter(isGA4EventTag) : [];
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Create a valid GA4 Google tag configuration before firing GA4 Event tags." };
  }),

  defineRule("HC_HR_007", "Missing Trigger Dependency", "Tags reference trigger IDs that do not exist in the workspace.", "HIGH", ["tags", "triggers"], (data) => {
    const triggerIds = new Set(data.triggers.map(getTriggerId).filter(Boolean));
    const invalid = data.tags.filter((tag) =>
      [...getFiringTriggerIds(tag), ...getBlockingTriggerIds(tag)].some((id) => !triggerIds.has(id) && !isBuiltInTriggerId(id))
    );
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Create the missing trigger or remove the broken trigger reference." };
  }),

  defineRule("HC_HR_008", "Missing Variable Dependency", "Tags or triggers reference variables that do not exist.", "HIGH", ["tags", "triggers", "variables"], (data) => {
    const missing = getMissingVariableReferences(data);
    const tags = data.tags.filter((tag) => objectContainsMissingVariable(tag, missing));
    const triggers = data.triggers.filter((trigger) => objectContainsMissingVariable(trigger, missing));
    return {
      passed: tags.length === 0 && triggers.length === 0,
      tags,
      triggers,
      recommendation: `Create or correct the missing variable references: ${Array.from(missing).join(", ")}.`,
    };
  }),

  defineRule("HC_HR_009", "Legacy Universal Analytics Tag Found", "Universal Analytics tags are deprecated and should be removed or migrated.", "HIGH", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => {
      const type = getType(tag);
      return type === "ua" || type === "analytics" || type.includes("universal") || getName(tag).toLowerCase().includes("universal analytics");
    });
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Remove legacy Universal Analytics tags and migrate tracking to GA4." };
  }),

  // ---------------------- MEDIUM RISK ----------------------

  defineRule("HC_MR_001", "Purchase Event Missing Ecommerce Parameters", "Purchase tags should contain transaction_id, value, currency and items.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => isGA4EventTag(tag) && isPurchaseTag(tag) && getMissingPurchaseParameters(tag).length > 0);
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Add transaction_id, value, currency and items to purchase events (or enable Send Ecommerce data)." };
  }),

  defineRule("HC_MR_002", "GA4 Config Not Firing on All Pages", "The primary GA4 Google tag should normally fire on All Pages or Initialization.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter(isGA4ConfigTag).filter((tag) => !firesOnAllPagesOrInitialization(tag, data));
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Fire the primary GA4 Google tag on All Pages or Initialization, depending on your implementation." };
  }),

  defineRule("HC_MR_003", "Large Number of Custom JS Variables", "More than 25 Custom JavaScript variables were detected.", "MEDIUM", ["variables"], (data) => {
    const variables = data.variables.filter(isCustomJavaScriptVariable);
    const passed = variables.length <= 25;
    return {
      passed,
      variables: passed ? [] : variables,
      recommendation: `Found ${variables.length} Custom JavaScript variables. Reduce and consolidate JavaScript usage where possible.`,
    };
  }),

  defineRule("HC_MR_004", "Trigger Attached to Multiple Same Platform Tags", "A single trigger should not fire multiple GA4 tags that produce the same event.", "MEDIUM", ["triggers"], (data) => {
    const triggerMap = new Map<string, GTMItem[]>();
    data.tags.forEach((tag) =>
      getFiringTriggerIds(tag).forEach((triggerId) => {
        const group = triggerMap.get(triggerId) || [];
        group.push(tag);
        triggerMap.set(triggerId, group);
      })
    );
    const invalidIds = Array.from(triggerMap.entries())
      .filter(([, tags]) => {
        const ga4Events = tags.filter(isGA4EventTag);
        const eventNames = new Set(ga4Events.map((tag) => getParamValue(tag, "eventName").trim().toLowerCase()).filter(Boolean));
        return eventNames.size > 0 && eventNames.size < ga4Events.length;
      })
      .map(([id]) => id);
    const triggers = invalidIds.map((id) => getTriggerById(data, id)).filter((t): t is GTMItem => Boolean(t));
    return {
      passed: invalidIds.length === 0,
      triggers,
      recommendation: "Review triggers that fire duplicate GA4 events and differentiate or consolidate their firing conditions.",
    };
  }),

  defineRule("HC_MR_005", "GA4 Event Name Missing", "GA4 Event tags should define a valid event name.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => isGA4EventTag(tag) && !getParamValue(tag, "eventName").trim());
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Add a valid eventName parameter to every GA4 Event tag." };
  }),

  defineRule("HC_MR_006", "Duplicate GA4 Event Names", "Multiple GA4 Event tags use the same event name.", "MEDIUM", ["tags"], (data) => {
    const groups = new Map<string, GTMItem[]>();
    data.tags.filter(isGA4EventTag).forEach((tag) => {
      const eventName = getParamValue(tag, "eventName").trim();
      if (!eventName) return;
      const group = groups.get(eventName) || [];
      group.push(tag);
      groups.set(eventName, group);
    });
    const duplicates = Array.from(groups.values()).filter((g) => g.length > 1).flat();
    return {
      passed: duplicates.length === 0,
      tags: duplicates,
      recommendation: "Review duplicate GA4 event tags and consolidate them or differentiate their firing conditions.",
    };
  }),

  defineRule("HC_MR_007", "Analytics Tags Missing Consent Settings", "Analytics tags should be reviewed for appropriate consent behavior.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter(isAnalyticsTag).filter((tag) => !isConsentRelatedTag(tag) && !hasConfiguredConsentSettings(tag));
    return {
      passed: invalid.length === 0,
      tags: invalid,
      recommendation: "Review consent behavior for analytics tags and configure additional consent requirements where required by your implementation.",
    };
  }),

  defineRule("HC_MR_008", "Marketing Tags Missing Consent Settings", "Marketing and advertising tags should respect user consent.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter(isMarketingTag).filter((tag) => !isConsentRelatedTag(tag) && !hasConfiguredConsentSettings(tag));
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Configure appropriate consent requirements for marketing and advertising tags." };
  }),

  defineRule("HC_MR_009", "Consent Initialization Not Detected", "Consent configuration should be initialized before other tracking tags.", "MEDIUM", ["tags"], (data) => {
    const consentTags = data.tags.filter(isConsentRelatedTag);
    const passed = consentTags.length === 0 || consentTags.some((tag) => hasConsentInitializationTrigger(tag, data));
    return {
      passed,
      tags: passed ? [] : consentTags,
      recommendation: "Configure consent defaults or consent-management logic on the Consent Initialization trigger.",
    };
  }),

  defineRule("HC_MR_010", "Broad Regex Trigger Detected", "Overly broad regular expressions can cause unintended tag firing.", "MEDIUM", ["triggers"], (data) => {
    const invalid = data.triggers.filter((trigger) =>
      getTriggerConditions(trigger).some(
        (condition) =>
          getString(condition, "type").toLowerCase().includes("regex") && conditionValues(condition).some(isBroadRegex)
      )
    );
    return {
      passed: invalid.length === 0,
      triggers: invalid,
      recommendation: "Review broad regex conditions and replace .* or similarly unrestricted patterns with narrower matching rules.",
    };
  }),

  defineRule("HC_MR_011", "Custom Event Trigger Missing Event Name", "Custom Event triggers should define the event they listen for.", "MEDIUM", ["triggers"], (data) => {
    const invalid = data.triggers.filter((trigger) => {
      if (getType(trigger) !== "customevent") return false;
      // The event name is stored in customEventFilter -> parameter arg1.
      const hasName = getArray(trigger, "customEventFilter")
        .filter(isItem)
        .some((condition) => getParameters(condition).some((p) => getString(p, "key") === "arg1" && getString(p, "value").trim()));
      return !hasName && !getParamValue(trigger, "eventName").trim();
    });
    return { passed: invalid.length === 0, triggers: invalid, recommendation: "Define the custom event name for each Custom Event trigger." };
  }),

  defineRule("HC_MR_012", "Hardcoded Measurement ID Detected", "Repeated hardcoded GA4 measurement IDs should be centralized where reuse is beneficial.", "MEDIUM", ["tags"], (data) => {
    const pattern = /^G-[A-Z0-9]{6,}$/i;
    const invalid = data.tags.filter((tag) => {
      if (!isGA4ConfigTag(tag)) return false;
      const id = getMeasurementId(tag);
      return pattern.test(id) && !id.includes("{{");
    });
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Consider storing reusable GA4 measurement IDs in a GTM variable." };
  }),

  defineRule("HC_MR_013", "Suspicious Custom HTML Detected", "Custom HTML contains potentially unsafe or unnecessary JavaScript patterns.", "MEDIUM", ["tags"], (data) => {
    const patterns = [/\beval\s*\(/i, /\bnew\s+Function\s*\(/i, /document\.write\s*\(/i, /javascript\s*:/i];
    const invalid = data.tags.filter((tag) => isCustomHTMLTag(tag) && patterns.some((p) => p.test(getParamValue(tag, "html"))));
    return {
      passed: invalid.length === 0,
      tags: invalid,
      recommendation: "Review Custom HTML for unsafe or unnecessary JavaScript patterns and replace them with safer implementations where possible.",
    };
  }),

  defineRule("HC_MR_014", "Large Custom HTML Tag", "Very large Custom HTML tags can reduce maintainability and performance.", "MEDIUM", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => isCustomHTMLTag(tag) && getParamValue(tag, "html").length > 10000);
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Move large custom scripts to a Custom Template or external implementation where appropriate." };
  }),

  // ---------------------- LOW RISK ----------------------

  defineRule("HC_LR_001", "Unused Tags Found", "Tags without firing triggers should be reviewed.", "LOW", ["tags"], (data) => {
    const sequenced = getSequencedTagNames(data);
    const invalid = data.tags.filter(
      (tag) => getFiringTriggerIds(tag).length === 0 && !isPaused(tag) && !sequenced.has(getName(tag).toLowerCase())
    );
    return { passed: invalid.length === 0, tags: invalid, recommendation: `Found ${invalid.length} tags without firing triggers.` };
  }),

  defineRule("HC_LR_002", "Paused Tags Found", "Paused tags should be reviewed before publishing.", "LOW", ["tags"], (data) => {
    const invalid = data.tags.filter(isPaused);
    return { passed: invalid.length === 0, tags: invalid, recommendation: `Found ${invalid.length} paused tags.` };
  }),

  defineRule("HC_LR_003", "Unused Variables Found", "Variables not used inside tags, triggers or other variables should be reviewed.", "LOW", ["variables"], (data) => {
    const references = new Set<string>();
    [...data.tags, ...data.triggers].forEach((item) =>
      extractReferencesFromObject(item).forEach((r) => references.add(r.toLowerCase()))
    );
    // Variables can also be used by other variables (lookup tables, JS macros, etc.).
    data.variables.forEach((variable) => {
      const self = getName(variable).toLowerCase();
      extractReferencesFromObject(variable).forEach((r) => {
        if (r.toLowerCase() !== self) references.add(r.toLowerCase());
      });
    });
    const invalid = data.variables.filter((variable) => {
      const name = getName(variable);
      return Boolean(name) && !references.has(name.toLowerCase());
    });
    return { passed: invalid.length === 0, variables: invalid, recommendation: `Found ${invalid.length} unused variables.` };
  }),

  defineRule("HC_LR_004", "Large Number of Tags", "Large containers require optimization and cleanup.", "LOW", ["tags"], (data) => ({
    passed: data.tags.length < 300,
    recommendation: `Container contains ${data.tags.length} tags. Review and optimize tag structure.`,
  })),

  defineRule("HC_LR_005", "Large Number of Triggers", "Large trigger setups require optimization and cleanup.", "LOW", ["triggers"], (data) => ({
    passed: data.triggers.length < 200,
    recommendation: `Container contains ${data.triggers.length} triggers. Review and optimize trigger structure.`,
  })),

  defineRule("HC_LR_006", "Unused Triggers Found", "Triggers that are not referenced by any tag should be reviewed.", "LOW", ["triggers"], (data) => {
    const used = new Set<string>();
    data.tags.forEach((tag) => {
      getFiringTriggerIds(tag).forEach((id) => used.add(id));
      getBlockingTriggerIds(tag).forEach((id) => used.add(id));
    });
    // Trigger groups reference other triggers by ID inside their parameters.
    data.triggers.filter((t) => getType(t).includes("group")).forEach((group) =>
      collectStrings(group["parameter"]).forEach((value) => {
        if (/^\d+$/.test(value)) used.add(value);
      })
    );
    const invalid = data.triggers.filter((trigger) => {
      const id = getTriggerId(trigger);
      return Boolean(id) && !used.has(id);
    });
    return { passed: invalid.length === 0, triggers: invalid, recommendation: `Found ${invalid.length} unused triggers. Review and remove triggers that are no longer required.` };
  }),

  defineRule("HC_LR_007", "Paused Triggers Found", "Paused triggers should be reviewed before publishing.", "LOW", ["triggers"], (data) => {
    const invalid = data.triggers.filter(isPaused);
    return { passed: invalid.length === 0, triggers: invalid, recommendation: `Found ${invalid.length} paused triggers.` };
  }),

  defineRule("HC_LR_008", "Test or Debug Tags Found", "Tags with test, debug, temporary or development naming should be reviewed.", "LOW", ["tags"], (data) => {
    const pattern = /\b(test|testing|debug|temporary|temp|dev)\b/i;
    const invalid = data.tags.filter((tag) => pattern.test(getName(tag)));
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Review test/debug tags and remove them before production publishing." };
  }),

  defineRule("HC_LR_009", "Generic Tag Names Found", "Generic names make GTM containers difficult to maintain.", "LOW", ["tags"], (data) => {
    const generic = new Set(["tag", "tag 1", "tag 2", "new tag", "html", "test tag", "copy"]);
    const invalid = data.tags.filter((tag) => generic.has(getName(tag).toLowerCase()));
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Rename generic tags using descriptive names that explain their purpose." };
  }),

  defineRule("HC_LR_010", "Duplicate Tag, Trigger and Variable Names", "Duplicate asset names can make containers difficult to maintain.", "LOW", ["tags", "triggers", "variables"], (data) => {
    const tags = findDuplicateGroups(data.tags).flat();
    const triggers = findDuplicateGroups(data.triggers).flat();
    const variables = findDuplicateGroups(data.variables).flat();
    return {
      passed: tags.length === 0 && triggers.length === 0 && variables.length === 0,
      tags,
      triggers,
      variables,
      recommendation: "Rename duplicate assets using a consistent naming convention.",
    };
  }),

  defineRule("HC_LR_011", "Recommended GA4 Events Missing", "Common ecommerce GA4 events should be reviewed when ecommerce tracking is implemented.", "LOW", ["tags"], (data) => {
    const eventNames = new Set(data.tags.filter(isGA4EventTag).map((tag) => getParamValue(tag, "eventName").trim().toLowerCase()).filter(Boolean));
    const hasEcommerce = ["purchase", "add_to_cart", "begin_checkout", "view_item"].some((e) => eventNames.has(e));
    if (!hasEcommerce) return { passed: true };
    const missing = ["view_item", "add_to_cart", "begin_checkout", "purchase"].filter((e) => !eventNames.has(e));
    return { passed: missing.length === 0, recommendation: `Recommended GA4 ecommerce events not detected: ${missing.join(", ")}.` };
  }),

  defineRule("HC_LR_012", "Large Number of Variables", "A very large variable collection may indicate container clutter.", "LOW", ["variables"], (data) => ({
    passed: data.variables.length < 300,
    recommendation: `Container contains ${data.variables.length} variables. Review unused and duplicated variables.`,
  })),

  defineRule("HC_LR_013", "Inconsistent GA4 Event Naming", "GA4 event names should follow consistent lowercase snake_case naming.", "LOW", ["tags"], (data) => {
    const invalid = data.tags.filter((tag) => {
      if (!isGA4EventTag(tag)) return false;
      const eventName = getParamValue(tag, "eventName").trim();
      return Boolean(eventName) && !/^[a-z][a-z0-9_]*$/.test(eventName);
    });
    return { passed: invalid.length === 0, tags: invalid, recommendation: "Use lowercase GA4 event names with letters, numbers and underscores." };
  }),
];

export default healthCheckRules;