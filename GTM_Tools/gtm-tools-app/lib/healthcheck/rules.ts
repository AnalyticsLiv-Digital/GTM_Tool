import { GTMHealthData, HealthCheckResult, AffectedItem } from "./types";

const getString = (obj: Record<string, unknown>, key: string): string => {
  const val = obj[key];
  return typeof val === "string" ? val : "";
};

const getArray = (obj: Record<string, unknown>, key: string): unknown[] => {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
};

const getNumber = (obj: Record<string, unknown>, key: string): number => {
  const val = obj[key];
  return typeof val === "number" ? val : 0;
};

const isOlderThanYears = (timestamp: number, years: number): boolean => {
  if (!timestamp) return false;
  const diff = Date.now() - timestamp;
  const yearsMs = years * 365 * 24 * 60 * 60 * 1000;
  return diff > yearsMs;
};

const buildGTMListUrl = (
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
) => {
  return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}`;
};

// ✅ Direct Edit URL Builder
const buildGTMEditUrl = (
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string,
  id: string
) => {
  return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}/${id}/edit`;
};

const mapToAffectedItem = (
  item: Record<string, unknown>,
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
): AffectedItem => {
  const name = typeof item?.name === "string" ? item.name : "Unnamed";

  const id =
    typeof item?.tagId === "string"
      ? item.tagId
      : typeof item?.triggerId === "string"
      ? item.triggerId
      : typeof item?.variableId === "string"
      ? item.variableId
      : "";

  return {
    name,
    id,
    editUrl: id
      ? buildGTMEditUrl(type, accountId, containerId, workspaceId, id)
      : undefined,
  };
};

export const healthCheckRules = [
  // =========================
  // HIGH RISK RULES
  // =========================

  {
    id: "HC_HR_001",
    title: "Similar / Duplicate Configuration Tags",
    description: "Only one GA4 configuration tag should exist.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const configTags = data.tags.filter(
        (t) => getString(t, "type") === "googtag"
      );

      const passed = configTags.length <= 1;

      return {
        id: "HC_HR_001",
        title: "Similar / Duplicate Configuration Tags",
        description: "Only one GA4 configuration tag should exist.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : configTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : `Multiple GA4 configuration tags found (${configTags.length}). Keep only one to avoid duplicate tracking.`,
      };
    },
  },

  {
    id: "HC_HR_002",
    title: "UA Tag Found (Deprecated)",
    description: "Universal Analytics tags should not exist in the container.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const uaTags = data.tags.filter((t) =>
        getString(t, "type").toLowerCase().includes("ua")
      );

      const passed = uaTags.length === 0;

      return {
        id: "HC_HR_002",
        title: "UA Tag Found (Deprecated)",
        description: "Universal Analytics tags should not exist in the container.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : uaTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : "Remove UA tags and migrate tracking fully to GA4.",
      };
    },
  },

  {
    id: "HC_HR_003",
    title: "Purchase Trigger with Multiple Same Tags",
    description: "Purchase trigger should not fire multiple duplicate tags.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const purchaseTags = data.tags.filter((t) => {
        const json = JSON.stringify(t).toLowerCase();
        return json.includes("purchase");
      });

      const purchaseTriggerMap: Record<string, Record<string, unknown>[]> = {};

      purchaseTags.forEach((tag) => {
        const firingTriggerIds = getArray(tag, "firingTriggerId");

        firingTriggerIds.forEach((id) => {
          if (typeof id === "string") {
            if (!purchaseTriggerMap[id]) purchaseTriggerMap[id] = [];
            purchaseTriggerMap[id].push(tag);
          }
        });
      });

      const duplicates = Object.entries(purchaseTriggerMap).filter(
        ([, tags]) => tags.length > 1
      );

      const passed = duplicates.length === 0;

      return {
        id: "HC_HR_003",
        title: "Purchase Trigger with Multiple Same Tags",
        description: "Purchase trigger should not fire multiple duplicate tags.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : duplicates.flatMap(([, tags]) =>
              tags.map((t) =>
                mapToAffectedItem(
                  t,
                  "tags",
                  data.accountId,
                  data.containerId,
                  data.workspaceId
                )
              )
            ),
        affectedTriggers: passed
          ? []
          : duplicates.map(([triggerId]) => ({
              name: `Trigger ID: ${triggerId}`,
              id: triggerId,
              editUrl: buildGTMEditUrl(
                "triggers",
                data.accountId,
                data.containerId,
                data.workspaceId,
                triggerId
              ),
            })),
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
        recommendation: passed
          ? ""
          : "Purchase trigger is firing multiple tags. Remove duplicate conversion tags to avoid double counting.",
      };
    },
  },

  {
    id: "HC_HR_004",
    title: "FB / Google Ads in Custom HTML Instead of Template",
    description:
      "Meta Pixel and Google Ads tags should be implemented via GTM templates, not Custom HTML.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const customHtmlTags = data.tags.filter(
        (t) => getString(t, "type") === "html"
      );

      const riskyTags = customHtmlTags.filter((t) => {
        const htmlCode = JSON.stringify(t).toLowerCase();
        return (
          htmlCode.includes("fbq(") ||
          htmlCode.includes("connect.facebook.net") ||
          htmlCode.includes("googleads") ||
          htmlCode.includes("conversion")
        );
      });

      const passed = riskyTags.length === 0;

      return {
        id: "HC_HR_004",
        title: "FB / Google Ads in Custom HTML Instead of Template",
        description:
          "Meta Pixel and Google Ads tags should be implemented via GTM templates, not Custom HTML.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : riskyTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : "Move Meta Pixel / Google Ads scripts into GTM built-in tag templates for better debugging and consent compliance.",
      };
    },
  },

  {
    id: "HC_HR_005",
    title: "gtag Code Warning Detected",
    description: "Direct gtag.js implementation may conflict with GTM tracking.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const htmlTags = data.tags.filter((t) => getString(t, "type") === "html");

      const gtagTags = htmlTags.filter((t) => {
        const code = JSON.stringify(t).toLowerCase();
        return code.includes("gtag(") || code.includes("gtag/js");
      });

      const passed = gtagTags.length === 0;

      return {
        id: "HC_HR_005",
        title: "gtag Code Warning Detected",
        description: "Direct gtag.js implementation may conflict with GTM tracking.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : gtagTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : "Avoid direct gtag.js scripts inside GTM. Use GA4/Google Ads tag templates to prevent duplicate events.",
      };
    },
  },

  {
    id: "HC_HR_006",
    title: "Custom HTML jQuery Dependency",
    description: "Custom HTML tags should not depend on jQuery availability.",
    severity: "HIGH",
    check: (data: GTMHealthData): HealthCheckResult => {
      const htmlTags = data.tags.filter((t) => getString(t, "type") === "html");

      const jqueryTags = htmlTags.filter((t) => {
        const code = JSON.stringify(t).toLowerCase();
        return (
          code.includes("jquery") ||
          code.includes("$(") ||
          code.includes("jquery(") ||
          code.includes("jQuery(")
        );
      });

      const passed = jqueryTags.length === 0;

      return {
        id: "HC_HR_006",
        title: "Custom HTML jQuery Dependency",
        description: "Custom HTML tags should not depend on jQuery availability.",
        severity: "HIGH",
        passed,
        affectedTags: passed
          ? []
          : jqueryTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : "Replace jQuery-based tracking scripts with pure JavaScript or GTM templates to prevent tag failure.",
      };
    },
  },

  // =========================
  // MEDIUM RISK RULES
  // =========================

  {
    id: "HC_MR_001",
    title: "Unused Triggers / Variables Older Than 3 Years",
    description: "Unused assets older than 3 years should be reviewed and removed.",
    severity: "MEDIUM",
    check: (data: GTMHealthData): HealthCheckResult => {
      const usedTriggerIds = new Set<string>();

      data.tags.forEach((tag) => {
        const ids = getArray(tag, "firingTriggerId");
        ids.forEach((id) => {
          if (typeof id === "string") usedTriggerIds.add(id);
        });
      });

      const unusedTriggers = data.triggers.filter((tr) => {
        const triggerId = getString(tr, "triggerId");
        const updatedAt = getNumber(tr, "updateTime");

        return (
          triggerId &&
          !usedTriggerIds.has(triggerId) &&
          isOlderThanYears(updatedAt, 3)
        );
      });

      const unusedVariables = data.variables.filter((v) => {
        const updatedAt = getNumber(v, "updateTime");
        const name = getString(v, "name");
        if (!name) return false;

        const used = JSON.stringify(data.tags).includes(`{{${name}}}`);
        return !used && isOlderThanYears(updatedAt, 3);
      });

      const passed =
        unusedTriggers.length === 0 && unusedVariables.length === 0;

      return {
        id: "HC_MR_001",
        title: "Unused Triggers / Variables Older Than 3 Years",
        description: "Unused assets older than 3 years should be reviewed and removed.",
        severity: "MEDIUM",
        passed,
        affectedTriggers: passed
          ? []
          : unusedTriggers.map((t) =>
              mapToAffectedItem(
                t,
                "triggers",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        affectedVariables: passed
          ? []
          : unusedVariables.map((v) => {
              const variableName =
                getString(v, "name") || "Unnamed Variable";
              const variableId = getString(v, "variableId");

              return {
                name: variableName,
                id: variableId,
                editUrl: variableId
                  ? buildGTMEditUrl(
                      "variables",
                      data.accountId,
                      data.containerId,
                      data.workspaceId,
                      variableId
                    )
                  : undefined,
              };
            }),
        gtmLinks: {
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
        recommendation: passed
          ? ""
          : `Unused triggers (${unusedTriggers.length}) and variables (${unusedVariables.length}) older than 3 years found. Remove after confirmation.`,
      };
    },
  },

  {
    id: "HC_MR_002",
    title: "Tag Older Than 5 Years Requires Review",
    description: "Very old tags may use outdated implementation methods.",
    severity: "MEDIUM",
    check: (data: GTMHealthData): HealthCheckResult => {
      const oldTags = data.tags.filter((t) => {
        const updatedAt = getNumber(t, "updateTime");
        return isOlderThanYears(updatedAt, 5);
      });

      const passed = oldTags.length === 0;

      return {
        id: "HC_MR_002",
        title: "Tag Older Than 5 Years Requires Review",
        description: "Very old tags may use outdated implementation methods.",
        severity: "MEDIUM",
        passed,
        affectedTags: passed
          ? []
          : oldTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : `${oldTags.length} tags are older than 5 years. Review and update tracking setup.`,
      };
    },
  },

  {
    id: "HC_MR_003",
    title: "Too Many Tags Requires Optimization",
    description:
      "If tags are more than 500/1000 then optimization and review is required.",
    severity: "MEDIUM",
    check: (data: GTMHealthData): HealthCheckResult => {
      const tagCount = data.tags.length;

      const passed = tagCount < 500;

      return {
        id: "HC_MR_003",
        title: "Too Many Tags Requires Optimization",
        description:
          "If tags are more than 500/1000 then optimization and review is required.",
        severity: "MEDIUM",
        passed,
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : tagCount >= 1000
          ? `This container has ${tagCount} tags which is extremely high. Optimization and cleanup is mandatory. Remove unused tags and merge duplicate tags.`
          : `This container has ${tagCount} tags. Review and optimize by removing unused tags and merging similar tags.`,
      };
    },
  },

  {
    id: "HC_MR_004",
    title: "Too Many Triggers Requires Optimization",
    description:
      "If triggers are more than 500/1000 then optimization and review is required.",
    severity: "MEDIUM",
    check: (data: GTMHealthData): HealthCheckResult => {
      const triggerCount = data.triggers.length;

      const passed = triggerCount < 500;

      return {
        id: "HC_MR_004",
        title: "Too Many Triggers Requires Optimization",
        description:
          "If triggers are more than 500/1000 then optimization and review is required.",
        severity: "MEDIUM",
        passed,
        gtmLinks: {
          triggers: buildGTMListUrl(
            "triggers",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : triggerCount >= 1000
          ? `This container has ${triggerCount} triggers which is extremely high. Optimization and cleanup is mandatory. Remove unused triggers and merge duplicate triggers.`
          : `This container has ${triggerCount} triggers. Review and optimize by removing unused triggers and merging similar triggers.`,
      };
    },
  },

  // =========================
  // LOW RISK RULES
  // =========================

  {
    id: "HC_LR_001",
    title: "console.log() Found in Custom HTML Tags",
    description: "console.log statements should not exist in production GTM tags.",
    severity: "LOW",
    check: (data: GTMHealthData): HealthCheckResult => {
      const htmlTags = data.tags.filter((t) => getString(t, "type") === "html");

      const consoleTags = htmlTags.filter((t) => {
        const code = JSON.stringify(t).toLowerCase();
        return code.includes("console.log");
      });

      const passed = consoleTags.length === 0;

      return {
        id: "HC_LR_001",
        title: "console.log() Found in Custom HTML Tags",
        description: "console.log statements should not exist in production GTM tags.",
        severity: "LOW",
        passed,
        affectedTags: passed
          ? []
          : consoleTags.map((t) =>
              mapToAffectedItem(
                t,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),
        gtmLinks: {
          tags: buildGTMListUrl(
            "tags",
            data.accountId,
            data.containerId,
            data.workspaceId
          ),
        },
        recommendation: passed
          ? ""
          : "Remove console.log statements from Custom HTML tags before publishing.",
      };
    },
  },
];

// import { GTMHealthData, HealthCheckResult } from "./types";

// const getString = (obj: Record<string, unknown>, key: string): string => {
//     const val = obj[key];
//     return typeof val === "string" ? val : "";
// };

// const getArray = (obj: Record<string, unknown>, key: string): unknown[] => {
//     const val = obj[key];
//     return Array.isArray(val) ? val : [];
// };

// const getParams = (tag: Record<string, unknown>) => {
//     const params = tag["parameter"];
//     return Array.isArray(params) ? (params as Record<string, unknown>[]) : [];
// };

// const getParamValue = (tag: Record<string, unknown>, key: string): string => {
//     const params = getParams(tag);
//     const found = params.find((p) => p["key"] === key);
//     return found && typeof found["value"] === "string" ? found["value"] : "";
// };

// export const healthCheckRules = [
//     // =========================
//     // CRITICAL RULES
//     // =========================

//     {
//         id: "HC_CR_001",
//         title: "GA4 Configuration Tag Missing",
//         description: "GA4 Configuration tag should exist in the container.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const found = data.tags.some((t) => getString(t, "type") === "googtag");

//             return {
//                 id: "HC_CR_001",
//                 title: "GA4 Configuration Tag Missing",
//                 description: "GA4 Configuration tag should exist in the container.",
//                 severity: "HIGH",
//                 passed: found,
//                 recommendation: found
//                     ? ""
//                     : "Create GA4 Config tag and fire it on All Pages.",
//             };
//         },
//     },

//     {
//         id: "HC_CR_002",
//         title: "GA4 Config Not Firing on All Pages",
//         description: "GA4 Config should fire on All Pages trigger.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const ga4Config = data.tags.find((t) => getString(t, "type") === "googtag");
//             if (!ga4Config) {
//                 return {
//                     id: "HC_CR_002",
//                     title: "GA4 Config Not Firing on All Pages",
//                     description: "GA4 Config should fire on All Pages trigger.",
//                     severity: "HIGH",
//                     passed: true,
//                     recommendation: "",
//                 };
//             }

//             const firingTriggerIds = getArray(ga4Config, "firingTriggerId");
//             const passed = firingTriggerIds.length > 0;

//             return {
//                 id: "HC_CR_002",
//                 title: "GA4 Config Not Firing on All Pages",
//                 description: "GA4 Config should fire on All Pages trigger.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed ? "" : "Attach All Pages trigger to GA4 Config.",
//             };
//         },
//     },

//     {
//         id: "HC_CR_003",
//         title: "Multiple GA4 Config Tags",
//         description: "Only one GA4 Config tag should exist.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const count = data.tags.filter((t) => getString(t, "type") === "googtag")
//                 .length;

//             const passed = count <= 1;

//             return {
//                 id: "HC_CR_003",
//                 title: "Multiple GA4 Config Tags",
//                 description: "Only one GA4 Config tag should exist.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `Multiple GA4 Config tags found (${count}). Keep only one.`,
//             };
//         },
//     },

//     {
//         id: "HC_CR_004",
//         title: "No GA4 Event Tags Found",
//         description: "GA4 event tags should exist for event tracking.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const events = data.tags.filter((t) => getString(t, "type") === "gaawe");

//             const passed = events.length > 0;

//             return {
//                 id: "HC_CR_004",
//                 title: "No GA4 Event Tags Found",
//                 description: "GA4 event tags should exist for event tracking.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed ? "" : "Create GA4 event tags for key actions.",
//             };
//         },
//     },

//     {
//         id: "HC_CR_005",
//         title: "Duplicate GA4 Event Names",
//         description: "GA4 event names should be unique.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const eventTags = data.tags.filter(
//                 (t) => getString(t, "type") === "gaawe"
//             );

//             const countMap: Record<string, number> = {};

//             eventTags.forEach((tag) => {
//                 const eventName = getParamValue(tag, "eventName");
//                 if (eventName) {
//                     countMap[eventName] = (countMap[eventName] || 0) + 1;
//                 }
//             });

//             const duplicates = Object.entries(countMap)
//                 .filter(([, count]) => count > 1)
//                 .map(([name]) => name);

//             const passed = duplicates.length === 0;

//             return {
//                 id: "HC_CR_005",
//                 title: "Duplicate GA4 Event Names",
//                 description: "GA4 event names should be unique.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `Duplicate GA4 events found: ${duplicates.join(", ")}. Ensure unique event names.`,
//             };
//         },
//     },

//     {
//         id: "HC_CR_006",
//         title: "Tags Without Triggers",
//         description: "All tags should have at least one firing trigger.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const badTags = data.tags.filter(
//                 (t) => Array.isArray(t.firingTriggerId) && t.firingTriggerId.length === 0
//             );

//             const badTagNames = badTags.map((t) => String(t.name || "Unnamed Tag"));

//             const passed = badTags.length === 0;

//             return {
//                 id: "HC_CR_006",
//                 title: "Tags Without Triggers",
//                 description: "All tags should have at least one firing trigger.",
//                 severity: "HIGH",
//                 passed,
//                 affectedTags: passed ? [] : badTagNames,
//                 recommendation: passed ? "" : "Assign triggers to these tags.",
//             };
//         },
//     },

//     {
//   id: "HC_CR_007",
//   title: "Unused Triggers Found",
//   description: "Triggers should be used by at least one tag.",
//   severity: "HIGH",
//   check: (data: GTMHealthData): HealthCheckResult => {
//     const usedTriggerIds = new Set<string>();

//     data.tags.forEach((tag) => {
//       const firingIds = Array.isArray(tag.firingTriggerId)
//         ? tag.firingTriggerId
//         : [];

//       firingIds.forEach((id: unknown) => {
//         if (typeof id === "string") usedTriggerIds.add(id);
//       });
//     });

//     const unusedTriggers = data.triggers.filter((tr) => {
//       const triggerId = typeof tr.triggerId === "string" ? tr.triggerId : "";
//       return triggerId && !usedTriggerIds.has(triggerId);
//     });

//     const unusedTriggerNames = unusedTriggers.map((tr) =>
//       typeof tr.name === "string" ? tr.name : "Unnamed Trigger"
//     );

//     const passed = unusedTriggers.length === 0;

//     return {
//       id: "HC_CR_007",
//       title: "Unused Triggers Found",
//       description: "Triggers should be used by at least one tag.",
//       severity: "HIGH",
//       passed,
//       affectedTriggers: passed ? [] : unusedTriggerNames,
//       recommendation: passed ? "" : "Remove unused triggers to reduce clutter.",
//     };
//   },
// },

//     {
//         id: "HC_CR_008",
//         title: "Consent Settings Missing",
//         description: "Tags should be configured with consent settings.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const risky = data.tags.filter((t) => !("consentSettings" in t));

//             const passed = risky.length === 0;

//             return {
//                 id: "HC_CR_008",
//                 title: "Consent Settings Missing",
//                 description: "Tags should be configured with consent settings.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `${risky.length} tags may fire before consent. Configure consent settings.`,
//             };
//         },
//     },

//     {
//         id: "HC_CR_009",
//         title: "Consent Mode Not Implemented",
//         description: "Consent mode should be implemented for compliance.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const consentExists = data.tags.some((t) =>
//                 getString(t, "type").toLowerCase().includes("consent")
//             );

//             return {
//                 id: "HC_CR_009",
//                 title: "Consent Mode Not Implemented",
//                 description: "Consent mode should be implemented for compliance.",
//                 severity: "HIGH",
//                 passed: consentExists,
//                 recommendation: consentExists ? "" : "Implement Consent Mode in GTM.",
//             };
//         },
//     },

//     {
//         id: "HC_CR_010",
//         title: "Possible Missing event Key in DataLayer",
//         description:
//             "DataLayer pushes should include event key for triggers to work.",
//         severity: "HIGH",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const json = JSON.stringify(data.variables);
//             const passed = json.toLowerCase().includes("event");

//             return {
//                 id: "HC_CR_010",
//                 title: "Possible Missing event Key in DataLayer",
//                 description:
//                     "DataLayer pushes should include event key for triggers to work.",
//                 severity: "HIGH",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : "Ensure all dataLayer pushes include an 'event' key.",
//             };
//         },
//     },

//     // =========================
//     // WARNING RULES
//     // =========================

//     {
//         id: "HC_WR_001",
//         title: "Too Many All Pages Triggers",
//         description: "More than 3 All Pages triggers can cause overfiring.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const count = data.triggers.filter(
//                 (t) => getString(t, "type") === "PAGEVIEW"
//             ).length;

//             const passed = count <= 3;

//             return {
//                 id: "HC_WR_001",
//                 title: "Too Many All Pages Triggers",
//                 description: "More than 3 All Pages triggers can cause overfiring.",
//                 severity: "MEDIUM",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `${count} All Pages triggers found. Reduce duplicates.`,
//             };
//         },
//     },

//     {
//         id: "HC_WR_002",
//         title: "Duplicate Triggers Config",
//         description: "Trigger names should be unique.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const nameMap: Record<string, number> = {};

//             data.triggers.forEach((t) => {
//                 const name = getString(t, "name");
//                 if (name) nameMap[name] = (nameMap[name] || 0) + 1;
//             });

//             const duplicateNames = Object.entries(nameMap)
//                 .filter(([, count]) => count > 1)
//                 .map(([name]) => name);

//             const passed = duplicateNames.length === 0;

//             return {
//                 id: "HC_WR_002",
//                 title: "Duplicate Trigger Names",
//                 description: "Trigger names should be unique.",
//                 severity: "MEDIUM",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `Duplicate trigger names found: ${duplicateNames.join(", ")}. Merge duplicates.`,
//             };
//         },
//     },

//     {
//         id: "HC_WR_003",
//         title: "Too Many Custom HTML Tags",
//         description: "Too many Custom HTML tags can reduce maintainability.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const count = data.tags.filter((t) => getString(t, "type") === "html")
//                 .length;

//             const passed = count <= 5;

//             return {
//                 id: "HC_WR_003",
//                 title: "Too Many Custom HTML Tags",
//                 description: "Too many Custom HTML tags can reduce maintainability.",
//                 severity: "MEDIUM",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `${count} Custom HTML tags found. Use templates where possible.`,
//             };
//         },
//     },

//     {
//         id: "HC_WR_004",
//         title: "Unused Variables",
//         description: "Unused variables increase clutter.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const used = new Set<string>();

//             const refs = JSON.stringify(data.tags).match(/{{(.*?)}}/g) || [];
//             refs.forEach((r) => used.add(r));

//             const unused = data.variables.filter((v) => {
//                 const name = String(v.name || "");
//                 return name && !used.has(`{{${name}}}`);
//             });

//             const unusedNames = unused.map((v) => String(v.name || "Unnamed Variable"));

//             const passed = unused.length === 0;

//             return {
//                 id: "HC_WR_004",
//                 title: "Unused Variables",
//                 description: "Unused variables increase clutter.",
//                 severity: "MEDIUM",
//                 passed,
//                 affectedVariables: passed ? [] : unusedNames,
//                 recommendation: passed ? "" : "Remove unused variables.",
//             };
//         },
//     },

//     {
//         id: "HC_WR_005",
//         title: "Undefined Variable References",
//         description: "Tags reference variables that do not exist.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const allVars = new Set<string>(
//                 data.variables.map((v) => getString(v, "name")).filter(Boolean)
//             );

//             const refs = JSON.stringify(data.tags).match(/{{(.*?)}}/g) || [];

//             const bad = refs.filter((r) => {
//                 const clean = r.replace(/[{}]/g, "").trim();
//                 return clean && !allVars.has(clean);
//             });

//             const passed = bad.length === 0;

//             return {
//                 id: "HC_WR_005",
//                 title: "Undefined Variable References",
//                 description: "Tags reference variables that do not exist.",
//                 severity: "MEDIUM",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `Undefined variables referenced: ${Array.from(new Set(bad)).join(
//                         ", "
//                     )}`,
//             };
//         },
//     },

//     {
//         id: "HC_WR_006",
//         title: "Missing Ecommerce Parameters",
//         description: "GA4 ecommerce events should include items/value/currency.",
//         severity: "MEDIUM",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const bad = data.tags.filter((t) => {
//                 const type = getString(t, "type");
//                 if (type !== "gaawe") return false;

//                 const json = JSON.stringify(t);
//                 return !json.includes("items");
//             });

//             const passed = bad.length === 0;

//             return {
//                 id: "HC_WR_006",
//                 title: "Missing Ecommerce Parameters",
//                 description: "GA4 ecommerce events should include items/value/currency.",
//                 severity: "MEDIUM",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : "Some GA4 event tags are missing ecommerce parameters like items/value/currency.",
//             };
//         },
//     },

//     // =========================
//     // INFO RULES
//     // =========================

//     {
//         id: "HC_IN_001",
//         title: "Naming Convention Not Detected",
//         description: "No naming convention detected for GTM assets.",
//         severity: "LOW",
//         check: (): HealthCheckResult => {
//             return {
//                 id: "HC_IN_001",
//                 title: "Naming Convention Not Detected",
//                 description: "No naming convention detected for GTM assets.",
//                 severity: "LOW",
//                 passed: false,
//                 recommendation: "Adopt naming standards like GA4 - Event - Click - CTA.",
//             };
//         },
//     },

//     {
//         id: "HC_IN_002",
//         title: "Missing Recommended GA4 Events",
//         description: "Recommended GA4 ecommerce events should be implemented.",
//         severity: "LOW",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const needed = ["view_item", "add_to_cart", "purchase"];
//             const existing = JSON.stringify(data.tags);

//             const missing = needed.filter((e) => !existing.includes(e));
//             const passed = missing.length === 0;

//             return {
//                 id: "HC_IN_002",
//                 title: "Missing Recommended GA4 Events",
//                 description: "Recommended GA4 ecommerce events should be implemented.",
//                 severity: "LOW",
//                 passed,
//                 recommendation: passed
//                     ? ""
//                     : `Missing recommended events: ${missing.join(", ")}`,
//             };
//         },
//     },

//     {
//         id: "HC_IN_003",
//         title: "User ID Not Implemented",
//         description: "User ID improves cross-device tracking.",
//         severity: "LOW",
//         check: (data: GTMHealthData): HealthCheckResult => {
//             const passed = JSON.stringify(data.tags).includes("user_id");

//             return {
//                 id: "HC_IN_003",
//                 title: "User ID Not Implemented",
//                 description: "User ID improves cross-device tracking.",
//                 severity: "LOW",
//                 passed,
//                 recommendation: passed ? "" : "Send user_id parameter in GA4 tracking.",
//             };
//         },
//     },

//     {
//         id: "HC_IN_004",
//         title: "Cross Domain Tracking Not Detected",
//         description: "Cross-domain tracking helps prevent session breaks.",
//         severity: "LOW",
//         check: (): HealthCheckResult => {
//             return {
//                 id: "HC_IN_004",
//                 title: "Cross Domain Tracking Not Detected",
//                 description: "Cross-domain tracking helps prevent session breaks.",
//                 severity: "LOW",
//                 passed: false,
//                 recommendation: "Configure GA4 linker settings for cross-domain tracking.",
//             };
//         },
//     },

//     {
//         id: "HC_IN_005",
//         title: "Error Tracking Not Found",
//         description: "Error tracking improves debugging and monitoring.",
//         severity: "LOW",
//         check: (): HealthCheckResult => {
//             return {
//                 id: "HC_IN_005",
//                 title: "Error Tracking Not Found",
//                 description: "Error tracking improves debugging and monitoring.",
//                 severity: "LOW",
//                 passed: false,
//                 recommendation: "Integrate error tracking tool (Sentry / GA4 exceptions).",
//             };
//         },
//     },
// ];