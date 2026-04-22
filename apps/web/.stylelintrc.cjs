module.exports = {
  extends: ["stylelint-config-standard", "stylelint-config-tailwindcss/base"],
  plugins: ["stylelint-order"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "variants",
          "responsive",
          "screen",
        ],
      },
    ],
    "order/properties-order": [],
  },
};
