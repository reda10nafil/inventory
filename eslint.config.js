const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['dist/*', 'node_modules/*', 'android/*', 'ios/*', '.expo/*', 'syncro_flow_flutter/*'],
  },
]);
