const { defineConfig } = require('eslint/config');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  {
    ignores: ['dist/*', 'node_modules/*', 'android/*', 'ios/*', '.expo/*', 'syncro_flow_flutter/*'],
  },
  {
    // Controllo G1 del restyling: il codice vivo legge il tema attivo (useTheme / makeStyles),
    // non il tema statico. Restano fuori i temi stessi e il codice morto.
    files: ['**/*.{ts,tsx}'],
    ignores: ['constants/themes/**', 'app/**', 'components/DynamicFieldRenderer.tsx', '__tests__/theme.test.ts'],
    languageOptions: { parser: tsParser },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    // Solo per riconoscere i commenti eslint-disable già presenti nel codice; nessuna sua regola è attiva.
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ regex: 'constants/theme$', message: 'Usa useTheme() o makeStyles() da contexts/ThemeContext.' }],
      }],
    },
  },
]);
