export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type AffectedItem = {
  name: string;
  id?: string;
  editUrl?: string;

  // Attached trigger names (for paused tags)
  triggerNames?: string[];
};

// NEW
export type SummaryRow = {
  category: string;
  total: number;
  items: string[];
};

export type HealthCheckResult = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  passed: boolean;

  recommendation?: string;

  affectedTags?: AffectedItem[];
  affectedTriggers?: AffectedItem[];
  affectedVariables?: AffectedItem[];

  // Existing
  unusedTags?: AffectedItem[];
  pausedTags?: AffectedItem[];
  unusedTriggers?: AffectedItem[];
  unusedVariables?: AffectedItem[];

  // NEW - Summary Table
  summaryTable?: SummaryRow[];

  gtmLinks?: {
    tags?: string;
    triggers?: string;
    variables?: string;
  };
};

export type GTMHealthData = {
  accountId: string;
  containerId: string;
  workspaceId: string;

  tags: Record<string, unknown>[];
  triggers: Record<string, unknown>[];
  variables: Record<string, unknown>[];
};


// export type Severity = "HIGH" | "MEDIUM" | "LOW";

// export type AffectedItem = {
//   name: string;
//   id?: string;
//   editUrl?: string;
// };

// export type HealthCheckResult = {
//   id: string;
//   title: string;
//   description: string;
//   severity: Severity;
//   passed: boolean;

//   recommendation?: string;

//   affectedTags?: AffectedItem[];
//   affectedTriggers?: AffectedItem[];
//   affectedVariables?: AffectedItem[];

//   gtmLinks?: {
//     tags?: string;
//     triggers?: string;
//     variables?: string;
//   };
// };

// export type GTMHealthData = {
//   accountId: string;
//   containerId: string;
//   workspaceId: string;

//   tags: Record<string, unknown>[];
//   triggers: Record<string, unknown>[];
//   variables: Record<string, unknown>[];
// };