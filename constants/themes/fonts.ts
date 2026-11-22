import type { AppTheme } from './types';

// Sul telefono i caratteri sono già dentro l'app (Android: `android/app/src/main/assets/fonts/`, un file per
// peso, con lo stesso nome dei valori di `font.files`): non c'è nulla da caricare. Sul web vale `fonts.web.ts`.
export async function loadThemeFonts(_theme: AppTheme): Promise<void> {}
