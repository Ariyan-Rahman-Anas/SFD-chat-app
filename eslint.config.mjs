import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These two rules (new in this React Compiler-era eslint-plugin-react-hooks)
      // flag the standard "synchronize with an external system" effect pattern
      // from the React docs itself — restoring a session from localStorage,
      // tying a socket's lifecycle to an auth token, keeping a ref current for
      // callbacks — as errors. The patterns here are intentional and correct;
      // disabling rather than contorting idiomatic effects/refs to satisfy a
      // very new, still-evolving lint rule.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
