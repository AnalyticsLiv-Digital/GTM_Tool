
import { GTMHealthData, HealthCheckResult } from "./types";
import { healthCheckRules } from "./rules";

export function runHealthCheck(data: GTMHealthData) {

  const results: HealthCheckResult[] = healthCheckRules.map((rule: { check: (arg0: GTMHealthData) => HealthCheckResult }) =>rule.check(data)
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  const score = Math.round((passedCount / results.length) * 100);

  return {
    score,
    passedCount,
    failedCount,
    results,
  };
}