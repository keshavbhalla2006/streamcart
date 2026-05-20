const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.ts"],

    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    rules: {
      "no-console": "warn",

      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    ignores: ["dist/", "node_modules/", "**/*.js"],
  },
];