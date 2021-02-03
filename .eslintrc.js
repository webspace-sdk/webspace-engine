module.exports = {
  parser: "babel-eslint",
  env: {
    browser: true,
    es6: true,
    node: true
  },
  globals: {
    SharedArrayBuffer: true,
    THREE: true,
    AFRAME: true,
    NAF: true,
    SAF: true,
    TransformStream: true,
    SYSTEMS: true
  },
  plugins: ["prettier", "react"],
  rules: {
    "prettier/prettier": "error",
    "prefer-const": "error",
    "no-use-before-define": "error",
    "no-var": "error",
    "no-throw-literal": "error",
    // Light console usage is useful but remove debug logs before merging to master.
    "no-console": "off"
  },
  extends: ["prettier", "plugin:react/recommended", "eslint:recommended", "plugin:react-hooks/recommended"]
};
