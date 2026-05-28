import { GTMHealthData, HealthCheckResult, AffectedItem } from "./types";

const getString = (obj: Record<string, unknown>, key: string): string => {
  const val = obj[key];
  return typeof val === "string" ? val : "";
};

const getArray = (obj: Record<string, unknown>, key: string): unknown[] => {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
};

const buildGTMListUrl = (
  type: "tags" | "triggers" | "variables",
  accountId: string,
  containerId: string,
  workspaceId: string
) => {
  return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}`;
};

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
  // =====================================================
  // HIGH RISK RULES
  // =====================================================

  {
    id: "HC_HR_001",
    title: "Multiple GA4 Config Tags Found",
    description: "Only one GA4 configuration tag should exist.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const ga4Tags = data.tags.filter((t) => {
        const type = getString(t, "type").toLowerCase();

        return (
          type.includes("googtag") ||
          type.includes("ga4") ||
          type.includes("gaawc")
        );
      });

      const passed = ga4Tags.length <= 1;

      return {
        id: "HC_HR_001",
        title: "Multiple GA4 Config Tags Found",
        description: "Only one GA4 configuration tag should exist.",
        severity: "HIGH",
        passed,

        affectedTags: passed
          ? []
          : ga4Tags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : `Found ${ga4Tags.length} GA4 Config Tags. Keep only one primary GA4 Config tag.`,

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
    id: "HC_HR_002",
    title: "Google Ads Tag Without Conversion Linker",
    description:
      "Google Ads tags detected but Conversion Linker tag is missing.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const adsTags = data.tags.filter((t) => {
        const json = JSON.stringify(t).toLowerCase();

        return (
          json.includes("google ads") ||
          json.includes("aw-") ||
          json.includes("ads")
        );
      });

      const conversionLinker = data.tags.find((t) => {
        const json = JSON.stringify(t).toLowerCase();

        return (
          json.includes("conversion linker") ||
          json.includes("conversionlinker")
        );
      });

      const passed = adsTags.length === 0 || Boolean(conversionLinker);

      return {
        id: "HC_HR_002",
        title: "Google Ads Tag Without Conversion Linker",
        description:
          "Google Ads tags detected but Conversion Linker tag is missing.",
        severity: "HIGH",
        passed,

        affectedTags: passed
          ? []
          : adsTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : "Add a Conversion Linker tag for proper attribution and cookie handling.",

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
    id: "HC_HR_003",
    title: "Purchase Trigger Firing Multiple Same Platform Tags",
    description:
      "Purchase trigger should not fire multiple GA4/Google Ads purchase tags together.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const purchaseTags = data.tags.filter((tag) => {
        const json = JSON.stringify(tag).toLowerCase();
        return json.includes("purchase");
      });

      const triggerMap: Record<string, Record<string, unknown>[]> = {};

      purchaseTags.forEach((tag) => {
        const triggerIds = getArray(tag, "firingTriggerId");

        triggerIds.forEach((id) => {
          if (typeof id === "string") {
            if (!triggerMap[id]) triggerMap[id] = [];
            triggerMap[id].push(tag);
          }
        });
      });

      const duplicates = Object.entries(triggerMap).filter(([, tags]) => {
        const ga4Tags = tags.filter((t) =>
          JSON.stringify(t).toLowerCase().includes("ga4")
        );

        return ga4Tags.length > 1;
      });

      const passed = duplicates.length === 0;

      return {
        id: "HC_HR_003",
        title: "Purchase Trigger Firing Multiple Same Platform Tags",
        description:
          "Purchase trigger should not fire multiple GA4/Google Ads purchase tags together.",
        severity: "HIGH",
        passed,

        affectedTags: passed
          ? []
          : duplicates.flatMap(([, tags]) =>
              tags.map((tag) =>
                mapToAffectedItem(
                  tag,
                  "tags",
                  data.accountId,
                  data.containerId,
                  data.workspaceId
                )
              )
            ),

        recommendation: passed
          ? ""
          : "Purchase trigger is firing multiple same-platform purchase tags causing duplicate conversions.",

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

  {
    id: "HC_HR_004",
    title: "Purchase Tag Has Multiple Triggers",
    description:
      "Purchase tags should ideally use a single clean purchase trigger.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const invalidTags = data.tags.filter((tag) => {
        const json = JSON.stringify(tag).toLowerCase();

        if (!json.includes("purchase")) return false;

        const triggers = getArray(tag, "firingTriggerId");

        return triggers.length > 1;
      });

      const passed = invalidTags.length === 0;

      return {
        id: "HC_HR_004",
        title: "Purchase Tag Has Multiple Triggers",
        description:
          "Purchase tags should ideally use a single clean purchase trigger.",
        severity: "HIGH",
        passed,

        affectedTags: passed
          ? []
          : invalidTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : "Purchase tags have multiple attached triggers. Review trigger logic to avoid duplicate purchases.",

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
    id: "HC_HR_005",
    title: "Custom HTML Missing Try Catch",
    description:
      "Custom HTML tags should contain try-catch blocks for safe execution.",
    severity: "HIGH",

    check: (data: GTMHealthData): HealthCheckResult => {
      const htmlTags = data.tags.filter(
        (t) => getString(t, "type") === "html"
      );

      const invalidTags = htmlTags.filter((tag) => {
        const json = JSON.stringify(tag).toLowerCase();

        return !json.includes("try{") && !json.includes("try {");
      });

      const passed = invalidTags.length === 0;

      return {
        id: "HC_HR_005",
        title: "Custom HTML Missing Try Catch",
        description:
          "Custom HTML tags should contain try-catch blocks for safe execution.",
        severity: "HIGH",
        passed,

        affectedTags: passed
          ? []
          : invalidTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : "Add try-catch blocks in Custom HTML tags to prevent script crashes.",

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

  {
    id: "HC_MR_001",
    title: "Purchase Event Missing Ecommerce Parameters",
    description:
      "Purchase tags should contain transaction_id, value, currency and items array.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const purchaseTags = data.tags.filter((tag) =>
        JSON.stringify(tag).toLowerCase().includes("purchase")
      );

      const invalidTags = purchaseTags.filter((tag) => {
        const json = JSON.stringify(tag).toLowerCase();

        const hasTid =
          json.includes("transaction_id") || json.includes("tid");

        const hasValue = json.includes("value");

        const hasCurrency = json.includes("currency");

        const hasItems = json.includes("items");

        return !(hasTid && hasValue && hasCurrency && hasItems);
      });

      const passed = invalidTags.length === 0;

      return {
        id: "HC_MR_001",
        title: "Purchase Event Missing Ecommerce Parameters",
        description:
          "Purchase tags should contain transaction_id, value, currency and items array.",
        severity: "MEDIUM",
        passed,

        affectedTags: passed
          ? []
          : invalidTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : "Add transaction_id, value, currency and items array in purchase event tags.",

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
    title: "GA4 Config Not Firing on All Pages",
    description:
      "GA4 Config tags should fire on All Pages or Initialization.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const ga4Tags = data.tags.filter((t) => {
        const type = getString(t, "type").toLowerCase();
        return type.includes("googtag") || type.includes("ga4");
      });

      const invalidTags = ga4Tags.filter((tag) => {
        const triggerIds = getArray(tag, "firingTriggerId");

        const triggerNames = data.triggers
          .filter((tr) =>
            triggerIds.includes(getString(tr, "triggerId"))
          )
          .map((tr) => getString(tr, "name").toLowerCase());

        return !triggerNames.some(
          (name) =>
            name.includes("all pages") ||
            name.includes("initialization")
        );
      });

      const passed = invalidTags.length === 0;

      return {
        id: "HC_MR_002",
        title: "GA4 Config Not Firing on All Pages",
        description:
          "GA4 Config tags should fire on All Pages or Initialization.",
        severity: "MEDIUM",
        passed,

        affectedTags: passed
          ? []
          : invalidTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : "Fire GA4 Config tags on All Pages or Initialization trigger.",

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
    title: "Large Number of Custom JS Files",
    description:
      "More than 25 Custom JavaScript files detected.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const cjsTags = data.tags.filter((tag) => {
        const json = JSON.stringify(tag).toLowerCase();

        return (
          json.includes("custom javascript") ||
          json.includes("custom js")
        );
      });

      const passed = cjsTags.length <= 25;

      return {
        id: "HC_MR_003",
        title: "Large Number of Custom JS Files",
        description:
          "More than 25 Custom JavaScript files detected.",
        severity: "MEDIUM",
        passed,

        affectedTags: passed
          ? []
          : cjsTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : `Found ${cjsTags.length} Custom JS files. Reduce and optimize JavaScript usage in GTM.`,

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
    id: "HC_MR_004",
    title: "Trigger Attached to Multiple Same Platform Tags",
    description:
      "A single trigger should not fire multiple same-platform tags.",
    severity: "MEDIUM",

    check: (data: GTMHealthData): HealthCheckResult => {
      const triggerMap: Record<string, Record<string, unknown>[]> = {};

      data.tags.forEach((tag) => {
        const triggerIds = getArray(tag, "firingTriggerId");

        triggerIds.forEach((id) => {
          if (typeof id === "string") {
            if (!triggerMap[id]) triggerMap[id] = [];
            triggerMap[id].push(tag);
          }
        });
      });

      const invalidTriggers = Object.entries(triggerMap).filter(([, tags]) => {
        const ga4Tags = tags.filter((t) =>
          JSON.stringify(t).toLowerCase().includes("ga4")
        );

        return ga4Tags.length > 1;
      });

      const passed = invalidTriggers.length === 0;

      return {
        id: "HC_MR_004",
        title: "Trigger Attached to Multiple Same Platform Tags",
        description:
          "A single trigger should not fire multiple same-platform tags.",
        severity: "MEDIUM",
        passed,

        affectedTriggers: passed
          ? []
          : invalidTriggers.map(([triggerId]) => ({
              name: `Trigger ${triggerId}`,
              id: triggerId,
              editUrl: buildGTMEditUrl(
                "triggers",
                data.accountId,
                data.containerId,
                data.workspaceId,
                triggerId
              ),
            })),

        recommendation: passed
          ? ""
          : "One trigger is attached to multiple same-platform tags. Review duplicate tracking setup.",

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

  // =====================================================
  // LOW RISK RULES
  // =====================================================

  {
    id: "HC_LR_001",
    title: "Unused Tags Found",
    description:
      "Tags without triggers or paused tags should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const unusedTags = data.tags.filter((tag) => {
        const triggers = getArray(tag, "firingTriggerId");
        const paused = Boolean(tag.paused);

        return triggers.length === 0 || paused;
      });

      const passed = unusedTags.length === 0;

      return {
        id: "HC_LR_001",
        title: "Unused Tags Found",
        description:
          "Tags without triggers or paused tags should be reviewed.",
        severity: "LOW",
        passed,

        affectedTags: passed
          ? []
          : unusedTags.map((tag) =>
              mapToAffectedItem(
                tag,
                "tags",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : `Found ${unusedTags.length} unused or paused tags. Review and cleanup recommended.`,

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
    id: "HC_LR_002",
    title: "Unused Triggers Found",
    description:
      "Triggers not attached to any tags should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const usedTriggerIds = new Set<string>();

      data.tags.forEach((tag) => {
        const triggerIds = getArray(tag, "firingTriggerId");

        triggerIds.forEach((id) => {
          if (typeof id === "string") {
            usedTriggerIds.add(id);
          }
        });
      });

      const unusedTriggers = data.triggers.filter((trigger) => {
        const id = getString(trigger, "triggerId");
        return !usedTriggerIds.has(id);
      });

      const passed = unusedTriggers.length === 0;

      return {
        id: "HC_LR_002",
        title: "Unused Triggers Found",
        description:
          "Triggers not attached to any tags should be reviewed.",
        severity: "LOW",
        passed,

        affectedTriggers: passed
          ? []
          : unusedTriggers.map((trigger) =>
              mapToAffectedItem(
                trigger,
                "triggers",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : `Found ${unusedTriggers.length} unused triggers. Cleanup recommended.`,

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

  {
    id: "HC_LR_003",
    title: "Unused Variables Found",
    description:
      "Variables not used inside tags should be reviewed.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const unusedVariables = data.variables.filter((variable) => {
        const name = getString(variable, "name");

        if (!name) return false;

        const used = JSON.stringify(data.tags).includes(`{{${name}}}`);

        return !used;
      });

      const passed = unusedVariables.length === 0;

      return {
        id: "HC_LR_003",
        title: "Unused Variables Found",
        description:
          "Variables not used inside tags should be reviewed.",
        severity: "LOW",
        passed,

        affectedVariables: passed
          ? []
          : unusedVariables.map((variable) =>
              mapToAffectedItem(
                variable,
                "variables",
                data.accountId,
                data.containerId,
                data.workspaceId
              )
            ),

        recommendation: passed
          ? ""
          : `Found ${unusedVariables.length} unused variables. Cleanup recommended.`,

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

  {
    id: "HC_LR_004",
    title: "Large Number of Tags",
    description:
      "Large containers require optimization and cleanup.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const tagCount = data.tags.length;

      const passed = tagCount < 200;

      return {
        id: "HC_LR_004",
        title: "Large Number of Tags",
        description:
          "Large containers require optimization and cleanup.",
        severity: "LOW",
        passed,

        recommendation: passed
          ? ""
          : `Container contains ${tagCount} tags. Review and optimize tag structure.`,

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
    id: "HC_LR_005",
    title: "Large Number of Triggers",
    description:
      "Large trigger setup requires optimization and cleanup.",
    severity: "LOW",

    check: (data: GTMHealthData): HealthCheckResult => {
      const triggerCount = data.triggers.length;

      const passed = triggerCount < 200;

      return {
        id: "HC_LR_005",
        title: "Large Number of Triggers",
        description:
          "Large trigger setup requires optimization and cleanup.",
        severity: "LOW",
        passed,

        recommendation: passed
          ? ""
          : `Container contains ${triggerCount} triggers. Review and optimize trigger structure.`,

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


// import { GTMHealthData, HealthCheckResult, AffectedItem } from "./types";

// const getString = (obj: Record<string, unknown>, key: string): string => {
//   const val = obj[key];
//   return typeof val === "string" ? val : "";
// };

// const getArray = (obj: Record<string, unknown>, key: string): unknown[] => {
//   const val = obj[key];
//   return Array.isArray(val) ? val : [];
// };

// const getNumber = (obj: Record<string, unknown>, key: string): number => {
//   const val = obj[key];
//   return typeof val === "number" ? val : 0;
// };

// const isOlderThanYears = (timestamp: number, years: number): boolean => {
//   if (!timestamp) return false;

//   const diff = Date.now() - timestamp;
//   const yearsMs = years * 365 * 24 * 60 * 60 * 1000;

//   return diff > yearsMs;
// };

// const buildGTMListUrl = (
//   type: "tags" | "triggers" | "variables",
//   accountId: string,
//   containerId: string,
//   workspaceId: string
// ) => {
//   return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}`;
// };

// const buildGTMEditUrl = (
//   type: "tags" | "triggers" | "variables",
//   accountId: string,
//   containerId: string,
//   workspaceId: string,
//   id: string
// ) => {
//   return `https://tagmanager.google.com/#/container/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${type}/${id}/edit`;
// };

// const mapToAffectedItem = (
//   item: Record<string, unknown>,
//   type: "tags" | "triggers" | "variables",
//   accountId: string,
//   containerId: string,
//   workspaceId: string
// ): AffectedItem => {
//   const name =
//     typeof item?.name === "string" ? item.name : "Unnamed";

//   const id =
//     typeof item?.tagId === "string"
//       ? item.tagId
//       : typeof item?.triggerId === "string"
//       ? item.triggerId
//       : typeof item?.variableId === "string"
//       ? item.variableId
//       : "";

//   return {
//     name,
//     id,
//     editUrl: id
//       ? buildGTMEditUrl(
//           type,
//           accountId,
//           containerId,
//           workspaceId,
//           id
//         )
//       : undefined,
//   };
// };

// export const healthCheckRules = [
//   // =====================================================
//   // HIGH RISK RULES
//   // =====================================================

//   {
//     id: "HC_HR_001",
//     title: "Multiple GA4 Config Tags Found",
//     description:
//       "More than one GA4 configuration tag detected.",
//     severity: "HIGH",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const ga4ConfigTags = data.tags.filter((t) => {
//         const type = getString(t, "type").toLowerCase();

//         return (
//           type.includes("googtag") ||
//           type.includes("ga4") ||
//           type.includes("gaawc")
//         );
//       });

//       const passed = ga4ConfigTags.length <= 1;

//       return {
//         id: "HC_HR_001",
//         title: "Multiple GA4 Config Tags Found",
//         description:
//           "More than one GA4 configuration tag detected.",
//         severity: "HIGH",
//         passed,

//         affectedTags: passed
//           ? []
//           : ga4ConfigTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : `Found ${ga4ConfigTags.length} GA4 Config tags. Keep only one primary configuration tag.`,

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_HR_002",
//     title: "UA Tag Found (Deprecated)",
//     description:
//       "Universal Analytics tags should not exist.",
//     severity: "HIGH",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const uaTags = data.tags.filter((t) =>
//         getString(t, "type").toLowerCase().includes("ua")
//       );

//       const passed = uaTags.length === 0;

//       return {
//         id: "HC_HR_002",
//         title: "UA Tag Found (Deprecated)",
//         description:
//           "Universal Analytics tags should not exist.",
//         severity: "HIGH",
//         passed,

//         affectedTags: passed
//           ? []
//           : uaTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Remove UA tags and migrate fully to GA4.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_HR_003",
//     title: "Purchase Trigger Firing Multiple GA4 Tags",
//     description:
//       "Purchase event should not fire multiple GA4 purchase tags.",
//     severity: "HIGH",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const purchaseTags = data.tags.filter((tag) => {
//         const json = JSON.stringify(tag).toLowerCase();

//         return (
//           json.includes("purchase") &&
//           (
//             json.includes("ga4") ||
//             json.includes("gtag") ||
//             json.includes("googtag")
//           )
//         );
//       });

//       const triggerMap: Record<
//         string,
//         Record<string, unknown>[]
//       > = {};

//       purchaseTags.forEach((tag) => {
//         const triggerIds = getArray(
//           tag,
//           "firingTriggerId"
//         );

//         triggerIds.forEach((id) => {
//           if (typeof id === "string") {
//             if (!triggerMap[id]) {
//               triggerMap[id] = [];
//             }

//             triggerMap[id].push(tag);
//           }
//         });
//       });

//       const duplicates = Object.entries(triggerMap).filter(
//         ([, tags]) => tags.length > 1
//       );

//       const passed = duplicates.length === 0;

//       return {
//         id: "HC_HR_003",
//         title:
//           "Purchase Trigger Firing Multiple GA4 Tags",
//         description:
//           "Purchase event should not fire multiple GA4 purchase tags.",
//         severity: "HIGH",
//         passed,

//         affectedTags: passed
//           ? []
//           : duplicates.flatMap(([, tags]) =>
//               tags.map((tag) =>
//                 mapToAffectedItem(
//                   tag,
//                   "tags",
//                   data.accountId,
//                   data.containerId,
//                   data.workspaceId
//                 )
//               )
//             ),

//         affectedTriggers: passed
//           ? []
//           : duplicates.map(([triggerId]) => ({
//               name: `Trigger ${triggerId}`,
//               id: triggerId,
//               editUrl: buildGTMEditUrl(
//                 "triggers",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId,
//                 triggerId
//               ),
//             })),

//         recommendation: passed
//           ? ""
//           : "Purchase trigger is firing multiple GA4 purchase tags. Remove duplicate purchase tracking.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),

//           triggers: buildGTMListUrl(
//             "triggers",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_HR_004",
//     title: "Google Ads Tag Without Conversion Linker",
//     description:
//       "Google Ads tags detected but Conversion Linker tag missing.",
//     severity: "HIGH",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const adsTags = data.tags.filter((t) => {
//         const json = JSON.stringify(t).toLowerCase();

//         return (
//           json.includes("google ads") ||
//           json.includes("conversion") ||
//           json.includes("aw-")
//         );
//       });

//       const conversionLinker = data.tags.find((t) => {
//         const type = getString(t, "type").toLowerCase();

//         return (
//           type.includes("conversionlinker") ||
//           type.includes("conversion linker")
//         );
//       });

//       const passed =
//         adsTags.length === 0 ||
//         Boolean(conversionLinker);

//       return {
//         id: "HC_HR_004",
//         title:
//           "Google Ads Tag Without Conversion Linker",
//         description:
//           "Google Ads tags detected but Conversion Linker tag missing.",
//         severity: "HIGH",
//         passed,

//         affectedTags: passed
//           ? []
//           : adsTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Add Conversion Linker tag for proper Google Ads attribution.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_HR_005",
//     title: "Custom HTML Contains gtag()",
//     description:
//       "Direct gtag.js implementation can create duplicate tracking.",
//     severity: "HIGH",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const htmlTags = data.tags.filter(
//         (t) => getString(t, "type") === "html"
//       );

//       const riskyTags = htmlTags.filter((tag) => {
//         const json = JSON.stringify(tag).toLowerCase();

//         return (
//           json.includes("gtag(") ||
//           json.includes("gtag/js")
//         );
//       });

//       const passed = riskyTags.length === 0;

//       return {
//         id: "HC_HR_005",
//         title: "Custom HTML Contains gtag()",
//         description:
//           "Direct gtag.js implementation can create duplicate tracking.",
//         severity: "HIGH",
//         passed,

//         affectedTags: passed
//           ? []
//           : riskyTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Use native GA4 templates instead of gtag.js inside Custom HTML.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   // =====================================================
//   // MEDIUM RISK RULES
//   // =====================================================

//   {
//     id: "HC_MR_001",
//     title: "Purchase Missing Ecommerce Parameters",
//     description:
//       "Purchase events should contain transaction_id, value, currency and items.",
//     severity: "MEDIUM",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const purchaseTags = data.tags.filter((tag) =>
//         JSON.stringify(tag)
//           .toLowerCase()
//           .includes("purchase")
//       );

//       const invalidTags = purchaseTags.filter(
//         (tag) => {
//           const json = JSON.stringify(tag).toLowerCase();

//           const hasTid =
//             json.includes("transaction_id") ||
//             json.includes("tid");

//           const hasValue =
//             json.includes("value");

//           const hasCurrency =
//             json.includes("currency");

//           const hasItems =
//             json.includes("items") ||
//             json.includes("item");

//           return !(
//             hasTid &&
//             hasValue &&
//             hasCurrency &&
//             hasItems
//           );
//         }
//       );

//       const passed = invalidTags.length === 0;

//       return {
//         id: "HC_MR_001",
//         title:
//           "Purchase Missing Ecommerce Parameters",
//         description:
//           "Purchase events should contain transaction_id, value, currency and items.",
//         severity: "MEDIUM",
//         passed,

//         affectedTags: passed
//           ? []
//           : invalidTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Ensure purchase events contain transaction_id, value, currency and items array.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_MR_002",
//     title: "GA4 Config Tag Not Firing on All Pages",
//     description:
//       "GA4 Config tags should fire on All Pages or Initialization.",
//     severity: "MEDIUM",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const ga4Tags = data.tags.filter((t) =>
//         getString(t, "type")
//           .toLowerCase()
//           .includes("googtag")
//       );

//       const invalidTags = ga4Tags.filter((tag) => {
//         const triggerIds = getArray(
//           tag,
//           "firingTriggerId"
//         );

//         const triggerNames = data.triggers
//           .filter((tr) =>
//             triggerIds.includes(
//               getString(tr, "triggerId")
//             )
//           )
//           .map((tr) =>
//             getString(tr, "name").toLowerCase()
//           );

//         return !triggerNames.some(
//           (name) =>
//             name.includes("all pages") ||
//             name.includes("initialization")
//         );
//       });

//       const passed = invalidTags.length === 0;

//       return {
//         id: "HC_MR_002",
//         title:
//           "GA4 Config Tag Not Firing on All Pages",
//         description:
//           "GA4 Config tags should fire on All Pages or Initialization.",
//         severity: "MEDIUM",
//         passed,

//         affectedTags: passed
//           ? []
//           : invalidTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Fire GA4 Config tags on All Pages or Initialization trigger.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_MR_003",
//     title: "Unused Triggers Older Than 3 Years",
//     description:
//       "Unused triggers should be cleaned up.",
//     severity: "MEDIUM",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const usedTriggerIds = new Set<string>();

//       data.tags.forEach((tag) => {
//         const ids = getArray(
//           tag,
//           "firingTriggerId"
//         );

//         ids.forEach((id) => {
//           if (typeof id === "string") {
//             usedTriggerIds.add(id);
//           }
//         });
//       });

//       const unusedTriggers = data.triggers.filter(
//         (tr) => {
//           const triggerId = getString(
//             tr,
//             "triggerId"
//           );

//           const updatedAt = getNumber(
//             tr,
//             "updateTime"
//           );

//           return (
//             triggerId &&
//             !usedTriggerIds.has(triggerId) &&
//             isOlderThanYears(updatedAt, 3)
//           );
//         }
//       );

//       const passed =
//         unusedTriggers.length === 0;

//       return {
//         id: "HC_MR_003",
//         title:
//           "Unused Triggers Older Than 3 Years",
//         description:
//           "Unused triggers should be cleaned up.",
//         severity: "MEDIUM",
//         passed,

//         affectedTriggers: passed
//           ? []
//           : unusedTriggers.map((trigger) =>
//               mapToAffectedItem(
//                 trigger,
//                 "triggers",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : `Found ${unusedTriggers.length} unused triggers older than 3 years.`,

//         gtmLinks: {
//           triggers: buildGTMListUrl(
//             "triggers",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_MR_004",
//     title: "Too Many Tags Requires Optimization",
//     description:
//       "Containers with too many tags should be optimized.",
//     severity: "MEDIUM",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const tagCount = data.tags.length;

//       const passed = tagCount < 500;

//       return {
//         id: "HC_MR_004",
//         title:
//           "Too Many Tags Requires Optimization",
//         description:
//           "Containers with too many tags should be optimized.",
//         severity: "MEDIUM",
//         passed,

//         recommendation: passed
//           ? ""
//           : tagCount >= 1000
//           ? `Container has ${tagCount} tags which is extremely high. Cleanup and optimization required.`
//           : `Container has ${tagCount} tags. Review duplicate and unused tags.`,

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_MR_005",
//     title: "Too Many Triggers Requires Optimization",
//     description:
//       "Containers with too many triggers should be optimized.",
//     severity: "MEDIUM",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const triggerCount =
//         data.triggers.length;

//       const passed = triggerCount < 500;

//       return {
//         id: "HC_MR_005",
//         title:
//           "Too Many Triggers Requires Optimization",
//         description:
//           "Containers with too many triggers should be optimized.",
//         severity: "MEDIUM",
//         passed,

//         recommendation: passed
//           ? ""
//           : triggerCount >= 1000
//           ? `Container has ${triggerCount} triggers which is extremely high. Cleanup and optimization required.`
//           : `Container has ${triggerCount} triggers. Review duplicate and unused triggers.`,

//         gtmLinks: {
//           triggers: buildGTMListUrl(
//             "triggers",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   // =====================================================
//   // LOW RISK RULES
//   // =====================================================

//   {
//     id: "HC_LR_001",
//     title: "console.log() Found in Custom HTML",
//     description:
//       "console.log should not exist in production.",
//     severity: "LOW",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const htmlTags = data.tags.filter(
//         (t) => getString(t, "type") === "html"
//       );

//       const consoleTags = htmlTags.filter(
//         (tag) => {
//           const json = JSON.stringify(tag);

//           return json.includes("console.log");
//         }
//       );

//       const passed =
//         consoleTags.length === 0;

//       return {
//         id: "HC_LR_001",
//         title:
//           "console.log() Found in Custom HTML",
//         description:
//           "console.log should not exist in production.",
//         severity: "LOW",
//         passed,

//         affectedTags: passed
//           ? []
//           : consoleTags.map((tag) =>
//               mapToAffectedItem(
//                 tag,
//                 "tags",
//                 data.accountId,
//                 data.containerId,
//                 data.workspaceId
//               )
//             ),

//         recommendation: passed
//           ? ""
//           : "Remove console.log statements before production deployment.",

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_LR_002",
//     title: "Large Number of Tags",
//     description:
//       "Containers with more than 200 tags should be reviewed.",
//     severity: "LOW",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const tagCount = data.tags.length;

//       const passed = tagCount < 200;

//       return {
//         id: "HC_LR_002",
//         title: "Large Number of Tags",
//         description:
//           "Containers with more than 200 tags should be reviewed.",
//         severity: "LOW",
//         passed,

//         recommendation: passed
//           ? ""
//           : `Container has ${tagCount} tags. Review and optimize unused tags.`,

//         gtmLinks: {
//           tags: buildGTMListUrl(
//             "tags",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },

//   {
//     id: "HC_LR_003",
//     title: "Large Number of Triggers",
//     description:
//       "Containers with more than 200 triggers should be reviewed.",
//     severity: "LOW",

//     check: (data: GTMHealthData): HealthCheckResult => {
//       const triggerCount =
//         data.triggers.length;

//       const passed = triggerCount < 200;

//       return {
//         id: "HC_LR_003",
//         title: "Large Number of Triggers",
//         description:
//           "Containers with more than 200 triggers should be reviewed.",
//         severity: "LOW",
//         passed,

//         recommendation: passed
//           ? ""
//           : `Container has ${triggerCount} triggers. Review and optimize unused triggers.`,

//         gtmLinks: {
//           triggers: buildGTMListUrl(
//             "triggers",
//             data.accountId,
//             data.containerId,
//             data.workspaceId
//           ),
//         },
//       };
//     },
//   },
// ];