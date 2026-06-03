import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".netlify/**",
    "node_modules/**",
    "supabase/.temp/**",
    // Bun test files import "bun:test", which the Next/TS eslint resolver and
    // tsc don't know about. They run via `bun test`, not the Next build.
    "**/*.test.ts",
    "**/*.test.tsx",
  ]),
]);

export default eslintConfig;
