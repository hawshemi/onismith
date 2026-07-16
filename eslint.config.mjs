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
    "public/generated/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/lib/save-parser/**/*.ts"],
    rules: {
      // ONI templates are runtime-defined, heterogeneous object graphs. The
      // serializer intentionally preserves values whose shapes are unknown at
      // compile time instead of narrowing or discarding them.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]);

export default eslintConfig;
