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
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }
};

const isPlaceholderUrl = !supabaseUrl || supabaseUrl === 'https://placeholder-url.supabase.co';

const resilientFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url || '';

  if (isPlaceholderUrl || urlStr.includes('placeholder-url.supabase.co')) {
    return new Response(
      JSON.stringify({ message: 'Supabase not configured', error: 'Service Unavailable' }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Response(
      JSON.stringify({ message: 'Device is offline', error: 'Service Unavailable', code: 'NETWORK_OFFLINE' }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

  try {
    return await fetch(input, init);
  } catch (err: any) {
    // Retry once after a short delay for idempotent GET/HEAD requests if not explicitly aborted
    if ((method === 'GET' || method === 'HEAD') && !init?.signal?.aborted) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return await fetch(input, init);
      } catch (_) {
        // Fall through to synthetic 503 response
      }
    }

    // Return a 503 response (recognized by @supabase/auth-js NETWORK_ERROR_CODES)
    // so Supabase preserves the local session and avoids logging uncaught TypeError: Failed to fetch
    return new Response(
      JSON.stringify({
        message: err?.message || 'Network request failed',
        error: 'Service Unavailable',
        code: 'NETWORK_ERROR'
      }),
      { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true
  },
  global: {
    fetch: resilientFetch
  }
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder-url.supabase.co';

