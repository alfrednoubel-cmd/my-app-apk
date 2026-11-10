// ==============================================================================
// CLIENT SUPABASE & SYNCHRONISATION CLOUD
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Remplacez ces valeurs par vos variables d'environnement de production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mon-vtc-prod.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
