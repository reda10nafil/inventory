import * as Font from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Urbanist_400Regular } from '@expo-google-fonts/urbanist/400Regular';
import { Urbanist_500Medium } from '@expo-google-fonts/urbanist/500Medium';
import { Urbanist_600SemiBold } from '@expo-google-fonts/urbanist/600SemiBold';
import { Urbanist_700Bold } from '@expo-google-fonts/urbanist/700Bold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import type { AppTheme } from './types';

// Sul web si caricano solo i file del carattere dello stile attivo (gli stessi 14 file che Android ha negli asset).
export const FONT_SOURCES: Record<string, Font.FontSource> = {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
  Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
};

export async function loadThemeFonts(theme: AppTheme): Promise<void> {
  const files = [...new Set(Object.values(theme.font.files))].filter((f): f is string => !!f && f in FONT_SOURCES);
  if (files.length) await Font.loadAsync(Object.fromEntries(files.map((f) => [f, FONT_SOURCES[f]])));
}
