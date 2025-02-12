module.exports = {
  parser: "@babel/eslint-parser",
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "no-console": "warn",
    "no-unused-vars": "warn",
    "prettier/prettier": "error",
  },
};
