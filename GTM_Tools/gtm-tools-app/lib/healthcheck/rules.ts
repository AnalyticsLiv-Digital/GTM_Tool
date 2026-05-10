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

