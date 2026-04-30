export type HealthCheckSeverity = "HIGH" | "MEDIUM" | "LOW";

export type HealthCheckResult = {
  id: string;
  title: string;
  description: string;
  severity: HealthCheckSeverity;
  passed: boolean;
  recommendation?: string;
  affectedTags?: string[];
  affectedTriggers?: string[];
  affectedVariables?: string[];
};

export type GTMTag = Record<string, unknown>;
export type GTMTrigger = Record<string, unknown>;
export type GTMVariable = Record<string, unknown>;

export type GTMHealthData = {
  tags: GTMTag[];
  triggers: GTMTrigger[];
  variables: GTMVariable[];
};