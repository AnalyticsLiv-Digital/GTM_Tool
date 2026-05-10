import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // We are progressively replacing `any` with proper GTM types (lib/gtm/types.ts).
    // Until that migration is finished, downgrade to a warning so the build
    // surfaces the count without blocking deploys. Re-tighten to "error" once
    // remaining call sites are typed.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
