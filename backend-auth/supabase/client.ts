import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import type { Database } from './types';

const extra = Constants.expoConfig?.extra ?? {};
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
