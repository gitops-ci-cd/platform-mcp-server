import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintJs from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "coverage/",
      "*.js"
    ]
  },
  eslintJs.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        // Add globals to fix 'not defined' errors
        "console": "readonly",
        "process": "readonly",
        "URL": "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      // ESLint rules
      "indent": ["error", 2, { "SwitchCase": 1 }],
      "linebreak-style": ["error", "unix"],
      "quotes": ["error", "double", { "avoidEscape": true }],
      "semi": ["error", "always"],
      "no-unused-vars": "off", // Turn off ESLint's rule in favor of TypeScript's

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off", // Turn off any warnings since we're using it in many places
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
        }
      ]
    }
  }
];
