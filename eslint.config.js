// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-quality-check/*'],
    rules: {
      // React Native <Text> renders apostrophes directly; HTML entity escaping is
      // unnecessary and makes user-facing copy harder to read in source.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
