import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use placeholder values if missing to avoid crashing on load
// The app will log warnings and fail gracefully when trying to use it
const finalUrl = supabaseUrl || 'https://placeholder-url.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    const localVal = window.localStorage.getItem(key);
    if (localVal) return localVal;
    return window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    const keepSignedIn = window.localStorage.getItem('keep_me_signed_in') !== 'false';
    if (keepSignedIn) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true
  }
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder-url.supabase.co';
