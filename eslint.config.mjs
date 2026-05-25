import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// ESLint 9 Flat-Config. `eslint-config-next` ist (Stand 15.5) noch
// eslintrc-Style — via FlatCompat eingebunden. Ersetzt das veraltete
// `next lint`.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Test-Files dürfen any/ts-ignore — FakeDate-Boilerplate braucht das.
  {
    files: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
];

export default eslintConfig;
