module.exports = {
  parser: "babel-eslint",
  env: {
    es6: true,
    node: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  globals: {
    atom: true,
  },
  rules: {
    "comma-dangle": [0],
    "no-this-before-super": [2],
    "constructor-super": [2],
    // prettier handles indentation, and they disagree on some of the code in
    // find-destination-spec.jw
    // indent: [2, 2],
    "linebreak-style": [2, "unix"],
    "no-var": [1],
    "prefer-const": [1],
    "no-const-assign": [2],
    "no-unused-vars": [2],
    semi: [2, "never"],
    "no-extra-semi": [0],
  },
}
