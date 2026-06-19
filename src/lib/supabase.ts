import { createClient } from '@supabase/supabase-js';

// Normalize password recovery/redirect URLs (e.g. #type=recovery#access_token=... or #type=recovery&access_token=...)
if (typeof window !== 'undefined') {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const href = window.location.href || '';

  const isRecoveryFlow = 
    hash.includes('type=recovery') || 
    hash.includes('recovery') || 
    search.includes('type=recovery') ||
    href.includes('type=recovery') ||
    (hash.includes('access_token=') && (hash.includes('recovery') || hash.includes('type=')));

  if (isRecoveryFlow) {
    console.log('[Supabase Setup] Password recovery flow detected in URL. Preserving session.');
    window.sessionStorage.setItem('unlocked_is_recovery_session', 'true');
    window.localStorage.setItem('keep_me_signed_in', 'true');
  }

  // Normalize password recovery/redirect URLs with double-hashes
  if (hash && (hash.match(/#/g) || []).length > 1) {
    console.log('[Supabase Setup] Double hash detected in URL:', hash);
    const parts = hash.split('#');
    // Filter out empty parts, then join them with '&' and prefix with '#'
    const cleanParts = parts.filter(Boolean);
    const normalizedHash = '#' + cleanParts.join('&');
    console.log('[Supabase Setup] Normalized hash:', normalizedHash);
    
    // Rewrite window.location.hash so that the Supabase client can parse the access_token successfully
    window.location.hash = normalizedHash;
  }
}

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
