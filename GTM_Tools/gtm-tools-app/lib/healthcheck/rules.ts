import { GTMHealthData, HealthCheckResult } from "./types";

const getString = (obj: Record<string, unknown>, key: string): string => {
    const val = obj[key];
    return typeof val === "string" ? val : "";
};

const getArray = (obj: Record<string, unknown>, key: string): unknown[] => {
    const val = obj[key];
    return Array.isArray(val) ? val : [];
};

const getParams = (tag: Record<string, unknown>) => {
    const params = tag["parameter"];
    return Array.isArray(params) ? (params as Record<string, unknown>[]) : [];
};

const getParamValue = (tag: Record<string, unknown>, key: string): string => {
    const params = getParams(tag);
    const found = params.find((p) => p["key"] === key);
    return found && typeof found["value"] === "string" ? found["value"] : "";
};

export const healthCheckRules = [
    // =========================
    // CRITICAL RULES
    // =========================

    {
        id: "HC_CR_001",
        title: "GA4 Configuration Tag Missing",
        description: "GA4 Configuration tag should exist in the container.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const found = data.tags.some((t) => getString(t, "type") === "googtag");

            return {
                id: "HC_CR_001",
                title: "GA4 Configuration Tag Missing",
                description: "GA4 Configuration tag should exist in the container.",
                severity: "HIGH",
                passed: found,
                recommendation: found
                    ? ""
                    : "Create GA4 Config tag and fire it on All Pages.",
            };
        },
    },

    {
        id: "HC_CR_002",
        title: "GA4 Config Not Firing on All Pages",
        description: "GA4 Config should fire on All Pages trigger.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const ga4Config = data.tags.find((t) => getString(t, "type") === "googtag");
            if (!ga4Config) {
                return {
                    id: "HC_CR_002",
                    title: "GA4 Config Not Firing on All Pages",
                    description: "GA4 Config should fire on All Pages trigger.",
                    severity: "HIGH",
                    passed: true,
                    recommendation: "",
                };
            }

            const firingTriggerIds = getArray(ga4Config, "firingTriggerId");
            const passed = firingTriggerIds.length > 0;

            return {
                id: "HC_CR_002",
                title: "GA4 Config Not Firing on All Pages",
                description: "GA4 Config should fire on All Pages trigger.",
                severity: "HIGH",
                passed,
                recommendation: passed ? "" : "Attach All Pages trigger to GA4 Config.",
            };
        },
    },

    {
        id: "HC_CR_003",
        title: "Multiple GA4 Config Tags",
        description: "Only one GA4 Config tag should exist.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const count = data.tags.filter((t) => getString(t, "type") === "googtag")
                .length;

            const passed = count <= 1;

            return {
                id: "HC_CR_003",
                title: "Multiple GA4 Config Tags",
                description: "Only one GA4 Config tag should exist.",
                severity: "HIGH",
                passed,
                recommendation: passed
                    ? ""
                    : `Multiple GA4 Config tags found (${count}). Keep only one.`,
            };
        },
    },

    {
        id: "HC_CR_004",
        title: "No GA4 Event Tags Found",
        description: "GA4 event tags should exist for event tracking.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const events = data.tags.filter((t) => getString(t, "type") === "gaawe");

            const passed = events.length > 0;

            return {
                id: "HC_CR_004",
                title: "No GA4 Event Tags Found",
                description: "GA4 event tags should exist for event tracking.",
                severity: "HIGH",
                passed,
                recommendation: passed ? "" : "Create GA4 event tags for key actions.",
            };
        },
    },

    {
        id: "HC_CR_005",
        title: "Duplicate GA4 Event Names",
        description: "GA4 event names should be unique.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const eventTags = data.tags.filter(
                (t) => getString(t, "type") === "gaawe"
            );

            const countMap: Record<string, number> = {};

            eventTags.forEach((tag) => {
                const eventName = getParamValue(tag, "eventName");
                if (eventName) {
                    countMap[eventName] = (countMap[eventName] || 0) + 1;
                }
            });

            const duplicates = Object.entries(countMap)
                .filter(([, count]) => count > 1)
                .map(([name]) => name);

            const passed = duplicates.length === 0;

            return {
                id: "HC_CR_005",
                title: "Duplicate GA4 Event Names",
                description: "GA4 event names should be unique.",
                severity: "HIGH",
                passed,
                recommendation: passed
                    ? ""
                    : `Duplicate GA4 events found: ${duplicates.join(", ")}. Ensure unique event names.`,
            };
        },
    },

    {
        id: "HC_CR_006",
        title: "Tags Without Triggers",
        description: "All tags should have at least one firing trigger.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const badTags = data.tags.filter(
                (t) => Array.isArray(t.firingTriggerId) && t.firingTriggerId.length === 0
            );

            const badTagNames = badTags.map((t) => String(t.name || "Unnamed Tag"));

            const passed = badTags.length === 0;

            return {
                id: "HC_CR_006",
                title: "Tags Without Triggers",
                description: "All tags should have at least one firing trigger.",
                severity: "HIGH",
                passed,
                affectedTags: passed ? [] : badTagNames,
                recommendation: passed ? "" : "Assign triggers to these tags.",
            };
        },
    },

    {
  id: "HC_CR_007",
  title: "Unused Triggers Found",
  description: "Triggers should be used by at least one tag.",
  severity: "HIGH",
  check: (data: GTMHealthData): HealthCheckResult => {
    const usedTriggerIds = new Set<string>();

    data.tags.forEach((tag) => {
      const firingIds = Array.isArray(tag.firingTriggerId)
        ? tag.firingTriggerId
        : [];

      firingIds.forEach((id: unknown) => {
        if (typeof id === "string") usedTriggerIds.add(id);
      });
    });

    const unusedTriggers = data.triggers.filter((tr) => {
      const triggerId = typeof tr.triggerId === "string" ? tr.triggerId : "";
      return triggerId && !usedTriggerIds.has(triggerId);
    });

    const unusedTriggerNames = unusedTriggers.map((tr) =>
      typeof tr.name === "string" ? tr.name : "Unnamed Trigger"
    );

    const passed = unusedTriggers.length === 0;

    return {
      id: "HC_CR_007",
      title: "Unused Triggers Found",
      description: "Triggers should be used by at least one tag.",
      severity: "HIGH",
      passed,
      affectedTriggers: passed ? [] : unusedTriggerNames,
      recommendation: passed ? "" : "Remove unused triggers to reduce clutter.",
    };
  },
},

    {
        id: "HC_CR_008",
        title: "Consent Settings Missing",
        description: "Tags should be configured with consent settings.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const risky = data.tags.filter((t) => !("consentSettings" in t));

            const passed = risky.length === 0;

            return {
                id: "HC_CR_008",
                title: "Consent Settings Missing",
                description: "Tags should be configured with consent settings.",
                severity: "HIGH",
                passed,
                recommendation: passed
                    ? ""
                    : `${risky.length} tags may fire before consent. Configure consent settings.`,
            };
        },
    },

    {
        id: "HC_CR_009",
        title: "Consent Mode Not Implemented",
        description: "Consent mode should be implemented for compliance.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const consentExists = data.tags.some((t) =>
                getString(t, "type").toLowerCase().includes("consent")
            );

            return {
                id: "HC_CR_009",
                title: "Consent Mode Not Implemented",
                description: "Consent mode should be implemented for compliance.",
                severity: "HIGH",
                passed: consentExists,
                recommendation: consentExists ? "" : "Implement Consent Mode in GTM.",
            };
        },
    },

    {
        id: "HC_CR_010",
        title: "Possible Missing event Key in DataLayer",
        description:
            "DataLayer pushes should include event key for triggers to work.",
        severity: "HIGH",
        check: (data: GTMHealthData): HealthCheckResult => {
            const json = JSON.stringify(data.variables);
            const passed = json.toLowerCase().includes("event");

            return {
                id: "HC_CR_010",
                title: "Possible Missing event Key in DataLayer",
                description:
                    "DataLayer pushes should include event key for triggers to work.",
                severity: "HIGH",
                passed,
                recommendation: passed
                    ? ""
                    : "Ensure all dataLayer pushes include an 'event' key.",
            };
        },
    },

    // =========================
    // WARNING RULES
    // =========================

    {
        id: "HC_WR_001",
        title: "Too Many All Pages Triggers",
        description: "More than 3 All Pages triggers can cause overfiring.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const count = data.triggers.filter(
                (t) => getString(t, "type") === "PAGEVIEW"
            ).length;

            const passed = count <= 3;

            return {
                id: "HC_WR_001",
                title: "Too Many All Pages Triggers",
                description: "More than 3 All Pages triggers can cause overfiring.",
                severity: "MEDIUM",
                passed,
                recommendation: passed
                    ? ""
                    : `${count} All Pages triggers found. Reduce duplicates.`,
            };
        },
    },

    {
        id: "HC_WR_002",
        title: "Duplicate Triggers Config",
        description: "Trigger names should be unique.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const nameMap: Record<string, number> = {};

            data.triggers.forEach((t) => {
                const name = getString(t, "name");
                if (name) nameMap[name] = (nameMap[name] || 0) + 1;
            });

            const duplicateNames = Object.entries(nameMap)
                .filter(([, count]) => count > 1)
                .map(([name]) => name);

            const passed = duplicateNames.length === 0;

            return {
                id: "HC_WR_002",
                title: "Duplicate Trigger Names",
                description: "Trigger names should be unique.",
                severity: "MEDIUM",
                passed,
                recommendation: passed
                    ? ""
                    : `Duplicate trigger names found: ${duplicateNames.join(", ")}. Merge duplicates.`,
            };
        },
    },

    {
        id: "HC_WR_003",
        title: "Too Many Custom HTML Tags",
        description: "Too many Custom HTML tags can reduce maintainability.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const count = data.tags.filter((t) => getString(t, "type") === "html")
                .length;

            const passed = count <= 5;

            return {
                id: "HC_WR_003",
                title: "Too Many Custom HTML Tags",
                description: "Too many Custom HTML tags can reduce maintainability.",
                severity: "MEDIUM",
                passed,
                recommendation: passed
                    ? ""
                    : `${count} Custom HTML tags found. Use templates where possible.`,
            };
        },
    },

    {
        id: "HC_WR_004",
        title: "Unused Variables",
        description: "Unused variables increase clutter.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const used = new Set<string>();

            const refs = JSON.stringify(data.tags).match(/{{(.*?)}}/g) || [];
            refs.forEach((r) => used.add(r));

            const unused = data.variables.filter((v) => {
                const name = String(v.name || "");
                return name && !used.has(`{{${name}}}`);
            });

            const unusedNames = unused.map((v) => String(v.name || "Unnamed Variable"));

            const passed = unused.length === 0;

            return {
                id: "HC_WR_004",
                title: "Unused Variables",
                description: "Unused variables increase clutter.",
                severity: "MEDIUM",
                passed,
                affectedVariables: passed ? [] : unusedNames,
                recommendation: passed ? "" : "Remove unused variables.",
            };
        },
    },

    {
        id: "HC_WR_005",
        title: "Undefined Variable References",
        description: "Tags reference variables that do not exist.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const allVars = new Set<string>(
                data.variables.map((v) => getString(v, "name")).filter(Boolean)
            );

            const refs = JSON.stringify(data.tags).match(/{{(.*?)}}/g) || [];

            const bad = refs.filter((r) => {
                const clean = r.replace(/[{}]/g, "").trim();
                return clean && !allVars.has(clean);
            });

            const passed = bad.length === 0;

            return {
                id: "HC_WR_005",
                title: "Undefined Variable References",
                description: "Tags reference variables that do not exist.",
                severity: "MEDIUM",
                passed,
                recommendation: passed
                    ? ""
                    : `Undefined variables referenced: ${Array.from(new Set(bad)).join(
                        ", "
                    )}`,
            };
        },
    },

    {
        id: "HC_WR_006",
        title: "Missing Ecommerce Parameters",
        description: "GA4 ecommerce events should include items/value/currency.",
        severity: "MEDIUM",
        check: (data: GTMHealthData): HealthCheckResult => {
            const bad = data.tags.filter((t) => {
                const type = getString(t, "type");
                if (type !== "gaawe") return false;

                const json = JSON.stringify(t);
                return !json.includes("items");
            });

            const passed = bad.length === 0;

            return {
                id: "HC_WR_006",
                title: "Missing Ecommerce Parameters",
                description: "GA4 ecommerce events should include items/value/currency.",
                severity: "MEDIUM",
                passed,
                recommendation: passed
                    ? ""
                    : "Some GA4 event tags are missing ecommerce parameters like items/value/currency.",
            };
        },
    },

    // =========================
    // INFO RULES
    // =========================

    {
        id: "HC_IN_001",
        title: "Naming Convention Not Detected",
        description: "No naming convention detected for GTM assets.",
        severity: "LOW",
        check: (): HealthCheckResult => {
            return {
                id: "HC_IN_001",
                title: "Naming Convention Not Detected",
                description: "No naming convention detected for GTM assets.",
                severity: "LOW",
                passed: false,
                recommendation: "Adopt naming standards like GA4 - Event - Click - CTA.",
            };
        },
    },

    {
        id: "HC_IN_002",
        title: "Missing Recommended GA4 Events",
        description: "Recommended GA4 ecommerce events should be implemented.",
        severity: "LOW",
        check: (data: GTMHealthData): HealthCheckResult => {
            const needed = ["view_item", "add_to_cart", "purchase"];
            const existing = JSON.stringify(data.tags);

            const missing = needed.filter((e) => !existing.includes(e));
            const passed = missing.length === 0;

            return {
                id: "HC_IN_002",
                title: "Missing Recommended GA4 Events",
                description: "Recommended GA4 ecommerce events should be implemented.",
                severity: "LOW",
                passed,
                recommendation: passed
                    ? ""
                    : `Missing recommended events: ${missing.join(", ")}`,
            };
        },
    },

    {
        id: "HC_IN_003",
        title: "User ID Not Implemented",
        description: "User ID improves cross-device tracking.",
        severity: "LOW",
        check: (data: GTMHealthData): HealthCheckResult => {
            const passed = JSON.stringify(data.tags).includes("user_id");

            return {
                id: "HC_IN_003",
                title: "User ID Not Implemented",
                description: "User ID improves cross-device tracking.",
                severity: "LOW",
                passed,
                recommendation: passed ? "" : "Send user_id parameter in GA4 tracking.",
            };
        },
    },

    {
        id: "HC_IN_004",
        title: "Cross Domain Tracking Not Detected",
        description: "Cross-domain tracking helps prevent session breaks.",
        severity: "LOW",
        check: (): HealthCheckResult => {
            return {
                id: "HC_IN_004",
                title: "Cross Domain Tracking Not Detected",
                description: "Cross-domain tracking helps prevent session breaks.",
                severity: "LOW",
                passed: false,
                recommendation: "Configure GA4 linker settings for cross-domain tracking.",
            };
        },
    },

    {
        id: "HC_IN_005",
        title: "Error Tracking Not Found",
        description: "Error tracking improves debugging and monitoring.",
        severity: "LOW",
        check: (): HealthCheckResult => {
            return {
                id: "HC_IN_005",
                title: "Error Tracking Not Found",
                description: "Error tracking improves debugging and monitoring.",
                severity: "LOW",
                passed: false,
                recommendation: "Integrate error tracking tool (Sentry / GA4 exceptions).",
            };
        },
    },
];