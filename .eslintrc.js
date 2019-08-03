module.exports = {
  // parser: "babel-eslint",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",

    "prettier",
    "prettier/@typescript-eslint",
  ],
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  globals: {
    atom: true,
  },
  rules: {
    "@typescript-eslint/explicit-function-return-type": 0,
    "no-console": [1, { allow: ["warn", "error"] }],
  },
}
