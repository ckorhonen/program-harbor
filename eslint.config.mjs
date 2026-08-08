import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: ["artifacts/**", "test-results/**", "playwright-report/**", ".next/**", ".open-next/**", "coverage/**", "worker-configuration.d.ts"],
  },
  ...nextVitals,
  {
    rules: {
      // The demo is a path-preserving client shell; full anchors intentionally
      // exercise the same route boundaries a judge will use after a reload.
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

/** @type {import('eslint').Linter.Config[]} */
export default config;
