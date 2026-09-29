// frontend/.eslintrc.js

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    // ESLint 基础推荐规则
    "eslint:recommended",

    // TypeScript 规则
    "plugin:@typescript-eslint/recommended",

    // Vue 3 规则
    "plugin:vue/vue3-recommended",

    // Vuetify 规则
    "plugin:vuetify/recommended",

    // Prettier 集成
    "eslint-config-prettier",
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "vuetify"],
  rules: {
    "vue/multi-word-component-names": "off",
  },
};
