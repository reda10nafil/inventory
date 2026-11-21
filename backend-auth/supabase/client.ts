import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import type { Database } from './types';
import appConfig from '../../app.json';

// Sul web expo-constants non riceve il manifest (Babel usa il preset React Native, non quello Expo),
// quindi si ricade sui valori pubblici di app.json → expo.extra.
const extra: Record<string, any> = Constants.expoConfig?.extra ?? appConfig.expo?.extra ?? {};
const supabaseUrl = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = extra.supabasePublishableKey || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configura SUPABASE_URL e la chiave publishable nell’app prima di avviare Supabase.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export default supabase;
