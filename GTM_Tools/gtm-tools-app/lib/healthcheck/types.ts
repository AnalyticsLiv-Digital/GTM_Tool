export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type AffectedItem = {
  name: string;
  id?: string;
  editUrl?: string;
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

  // ✅ FIXED: removed "any" to avoid ESLint error
  tags: Record<string, unknown>[];
  triggers: Record<string, unknown>[];
  variables: Record<string, unknown>[];
};