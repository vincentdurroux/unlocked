import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { storageService } from '../lib/storage';

// Helper to get the correct redirect URL for OAuth depending on the environment
function getOAuthRedirectTo(): string {
  if (typeof window === 'undefined') return '';

  const origin = window.location.origin;

  // Check if we are running in a native/hybrid platform (Capacitor, Cordova, WebView) inside iOS/Xcode
  const isCapacitor = origin.startsWith('capacitor://') || origin.startsWith('ionic://');
  const isFile = origin.startsWith('file://');
  
  // Detect iOS environment specifically
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  // Detect local servers inside webview (like live reload http://localhost or http://192.168.x.x)
  const isLocalhostOrIP = origin.includes('localhost') || /http:\/\/\d+\.\d+\.\d+\.\d+/.test(origin);

  if (isCapacitor || isFile || (isIOS && isLocalhostOrIP)) {
    // Return standard iOS deep link redirect for native scheme wrappers
    return 'mycityunlocked://home';
  }

  // Dedicated callback route (SPA also handles root '/' if Supabase falls back to Site URL)
  return `${origin}/auth/callback`;
}

export interface OAuthCallbackResult {
  handled: boolean;
  session: any | null;
  error: string | null;
  isRecovery?: boolean;
}

let inFlightOAuthKey: string | null = null;
let inFlightOAuthPromise: Promise<OAuthCallbackResult> | null = null;
const processedOAuthCodes = new Set<string>();

function cleanAuthCallbackUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const paramsToStrip = ['code', 'state', 'error', 'error_code', 'error_description', 'type'];
    paramsToStrip.forEach((p) => url.searchParams.delete(p));
    const cleanPath = url.pathname === '/auth/callback' ? '/' : url.pathname;
    const cleanSearch = url.searchParams.toString() ? `?${url.searchParams.toString()}` : '';
    const rawHash = url.hash || '';
    const isAuthHash =
      rawHash.includes('access_token=') ||
      rawHash.includes('refresh_token=') ||
      rawHash.includes('error=') ||
      rawHash.includes('error_description=') ||
      rawHash.includes('provider_token=');
    const cleanHash = isAuthHash ? '' : rawHash;
    window.history.replaceState(null, '', `${cleanPath}${cleanSearch}${cleanHash}`);
  } catch (_) {}
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin?: boolean;
  chat_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  favorite_event_ids?: string[];
  favorite_pro_ids?: string[];
  favorite_ad_ids?: string[];
  read_announcement_ids?: string[];
  dismissed_announcement_ids?: string[];
  referral_source?: string;
  referral_source_detail?: string;
  referral_survey_completed_at?: string;
}

export const authService = {
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signInWithEmail(email: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    
    // Using magic link by default which is safer and easier
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getOAuthRedirectTo(),
      },
    });

    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

    const nativeOAuthHandler =
      typeof window !== 'undefined' ? (window as any).webkit?.messageHandlers?.oauth : null;

    if (nativeOAuthHandler && typeof nativeOAuthHandler.postMessage === 'function') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'mycityunlocked://auth/callback',
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
      if (data?.url) {
        nativeOAuthHandler.postMessage({
          url: data.url,
          callbackScheme: 'mycityunlocked',
        });
      }
      return data;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectTo(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signInWithApple() {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

    const nativeOAuthHandler =
      typeof window !== 'undefined' ? (window as any).webkit?.messageHandlers?.oauth : null;

    if (nativeOAuthHandler && typeof nativeOAuthHandler.postMessage === 'function') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'mycityunlocked://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        nativeOAuthHandler.postMessage({
          url: data.url,
          callbackScheme: 'mycityunlocked',
        });
      }
      return data;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: getOAuthRedirectTo(),
      },
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async deleteOwnAccount() {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    
    // Call the database function that handles archiving and final deletion of auth.users
    const { error } = await supabase.rpc('delete_own_user');
    if (error) {
      console.error('Error in delete_own_user RPC:', error);
      throw error;
    }
  },

  hasPendingOAuthCallback(): boolean {
    if (typeof window === 'undefined') return false;
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    const searchParams = new URLSearchParams(search);
    return Boolean(
      searchParams.has('code') ||
      searchParams.has('error') ||
      searchParams.has('error_description') ||
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      hash.includes('error=') ||
      hash.includes('error_description=') ||
      pathname === '/auth/callback'
    );
  },

  async handleOAuthCallback(overrideUrl?: string): Promise<OAuthCallbackResult> {
    if (!isSupabaseConfigured || typeof window === 'undefined') {
      return { handled: false, session: null, error: null };
    }

    let searchStr = window.location.search || '';
    let hashStr = window.location.hash || '';
    let pathnameStr = window.location.pathname || '';

    if (overrideUrl && typeof overrideUrl === 'string') {
      try {
        const parsed = new URL(overrideUrl);
        searchStr = parsed.search || '';
        hashStr = parsed.hash || '';
        pathnameStr = parsed.pathname || '';
      } catch (_) {
        return { handled: false, session: null, error: null };
      }
    }

    const searchParams = new URLSearchParams(searchStr);
    const rawHash = hashStr ? hashStr.replace(/^#/, '') : '';
    const hashParams = new URLSearchParams(rawHash.includes('=') ? rawHash : '');

    const code = searchParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const urlError =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error');
    const isRecovery =
      searchParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery';
    const isCallbackPath = pathnameStr === '/auth/callback';

    if (!code && !accessToken && !urlError && !isCallbackPath) {
      return { handled: false, session: null, error: null };
    }

    const callbackKey = code
      ? `code:${code}`
      : accessToken
      ? `token:${accessToken.slice(0, 24)}`
      : urlError
      ? `err:${urlError}`
      : 'path:callback';

    if (inFlightOAuthPromise && inFlightOAuthKey === callbackKey) {
      return inFlightOAuthPromise;
    }

    if (code && processedOAuthCodes.has(code)) {
      const { data: { session } } = await supabase.auth.getSession();
      cleanAuthCallbackUrl();
      return { handled: true, session, error: null, isRecovery };
    }

    const run = (async (): Promise<OAuthCallbackResult> => {
      try {
        // 1. Handle explicit provider/Supabase error parameters
        if (urlError) {
          const decodedErr = decodeURIComponent(urlError.replace(/\+/g, ' '));
          console.warn('[OAuth Callback] Provider/Supabase returned error:', decodedErr);
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          cleanAuthCallbackUrl();
          if (existingSession?.user) {
            return { handled: true, session: existingSession, error: null, isRecovery };
          }
          return {
            handled: true,
            session: null,
            error: decodedErr || 'Google sign-in could not be completed. Please try again.',
            isRecovery
          };
        }

        // 2. Handle PKCE authorization code exchange (?code=...)
        if (code) {
          processedOAuthCodes.add(code);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            cleanAuthCallbackUrl();
            return { handled: true, session: data.session, error: null, isRecovery };
          }

          console.warn('[OAuth Callback] exchangeCodeForSession failed:', error?.message || error);

          // Recovery check: session may already be active (e.g. concurrent tab/resume)
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          cleanAuthCallbackUrl();
          if (existingSession?.user) {
            return { handled: true, session: existingSession, error: null, isRecovery };
          }

          const errMsg = String(error?.message || '').toLowerCase();
          const isPkceVerifierIssue =
            errMsg.includes('code verifier') ||
            errMsg.includes('pkce') ||
            errMsg.includes('invalid_grant') ||
            errMsg.includes('both auth code');

          return {
            handled: true,
            session: null,
            error: isPkceVerifierIssue
              ? 'Your Google verification completed after switching apps. Please tap "Continue with Google" once more to finish signing in.'
              : (error?.message || 'Sign-in could not be completed. Please try again.'),
            isRecovery
          };
        }

        // 3. Handle implicit / recovery hash tokens (#access_token=...&refresh_token=...)
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          cleanAuthCallbackUrl();
          if (!error && data?.session) {
            return { handled: true, session: data.session, error: null, isRecovery };
          }
          return {
            handled: true,
            session: null,
            error: error?.message || 'Unable to restore session. Please sign in again.',
            isRecovery
          };
        }

        // 4. Clean bare /auth/callback path
        const { data: { session } } = await supabase.auth.getSession();
        cleanAuthCallbackUrl();
        return { handled: true, session, error: null, isRecovery };
      } catch (err: any) {
        console.error('[OAuth Callback] Unexpected error:', err);
        cleanAuthCallbackUrl();
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user) {
          return { handled: true, session, error: null, isRecovery };
        }
        return {
          handled: true,
          session: null,
          error: err?.message || 'Sign-in was interrupted. Please tap "Continue with Google" to try again.',
          isRecovery
        };
      } finally {
        if (inFlightOAuthKey === callbackKey) {
          inFlightOAuthKey = null;
          inFlightOAuthPromise = null;
        }
      }
    })();

    inFlightOAuthKey = callbackKey;
    inFlightOAuthPromise = run;
    return run;
  },

  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;
      return session.user;
    } catch {
      return null;
    }
  },

  async getProfile(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  },

  async updateProfile(profile: Partial<Profile>) {
    if (!profile.id) throw new Error('User ID is required');

    // 1. If modifying full_name, find the previous name so we can update testimonies
    let oldName: string | undefined = undefined;
    if (profile.full_name !== undefined) {
      const oldProfile = await this.getProfile(profile.id);
      if (oldProfile?.full_name) {
        oldName = oldProfile.full_name;
      } else {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            oldName = session.user.email.split('@')[0];
          }
        } catch (_) {}
      }
    }

    // 2. Perform the update with resilient schema column fallback (PGRST204 / 42703)
    let currentPayload: Record<string, any> = {
      ...profile,
      updated_at: new Date().toISOString(),
    };

    let data: any = null;
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await supabase
          .from('profiles')
          .update(currentPayload)
          .eq('id', profile.id)
          .select()
          .single();

        if (res.error) throw res.error;
        data = res.data;
        break;
      } catch (err: any) {
        const errMsg = err?.message || JSON.stringify(err);
        const match = errMsg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && match[1] in currentPayload) {
          const colToRemove = match[1];
          console.warn(`[Profile Update] Column '${colToRemove}' does not exist in 'profiles' table. Retrying update without it...`);
          delete currentPayload[colToRemove];
          continue;
        }
        if (err?.code === '42703' || err?.code === 'PGRST204') {
          console.warn('[Profile Update] Schema column mismatch in profiles, skipping non-fatal update error:', err);
          return profile;
        }
        throw err;
      }
    }

    // 3. Propagate the new name to testimonies if they are modified
    if (profile.full_name !== undefined && oldName && oldName !== profile.full_name) {
      try {
        console.log(`[Profile Update] Propagating name change from "${oldName}" to "${profile.full_name}" in testimonies...`);
        
        // Get user email for precise matching
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email?.toLowerCase();
        
        let targetAuthorSelector = oldName;
        let newAuthorValue = profile.full_name;
        
        if (email) {
          // Precise match: name|email
          targetAuthorSelector = `${oldName}|${email}`;
          newAuthorValue = `${profile.full_name}|${email}`;
        }

        const { error: testimoniesError } = await supabase
          .from('testimonies')
          .update({ author: newAuthorValue })
          .eq('author', targetAuthorSelector);
          
        if (testimoniesError) {
          console.warn('[Profile Update] Failed to update testimonies authors:', testimoniesError);
        }
      } catch (err) {
        console.warn('[Profile Update] Error propagating name to testimonies:', err);
      }
    }

    return data;
  },

  async upsertProfile(profile: Partial<Profile>) {
    if (!profile.id) throw new Error('User ID is required');

    // Atomic upsert on primary key 'id' avoids SELECT -> INSERT duplicate-key races
    // with the Postgres handle_new_user trigger on first Google Sign-Up.
    let currentPayload: Record<string, any> = {
      ...profile,
      updated_at: new Date().toISOString(),
    };

    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await supabase
          .from('profiles')
          .upsert(currentPayload, { onConflict: 'id' })
          .select()
          .single();

        if (res.error) throw res.error;
        return res.data;
      } catch (err: any) {
        const errMsg = err?.message || JSON.stringify(err);
        const match = errMsg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && match[1] in currentPayload) {
          delete currentPayload[match[1]];
          continue;
        }
        if (err?.code === '42703' || err?.code === 'PGRST204') {
          console.warn('[upsertProfile] Schema column mismatch, falling back to existing profile:', err);
          const existing = await this.getProfile(profile.id);
          return existing || profile;
        }
        // Handle unique conflict gracefully (e.g. concurrent insert or email constraint)
        if (err?.code === '23505' || errMsg.includes('duplicate key')) {
          console.warn('[upsertProfile] Duplicate key conflict, retrying as targeted update:', errMsg);
          const updatePayload = { ...currentPayload };
          delete updatePayload.id;
          // If the conflict is specifically on profiles_email_key, omit email from the update
          if (errMsg.toLowerCase().includes('email')) {
            delete updatePayload.email;
          }
          const { data: updated } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', profile.id)
            .select()
            .maybeSingle();
          if (updated) return updated;
          const existing = await this.getProfile(profile.id);
          if (existing) return existing;
        }
        throw err;
      }
    }
    const fallback = await this.getProfile(profile.id);
    return fallback || profile;
  },

  async ensureProfileForUser(user: any): Promise<Profile | null> {
    if (!isSupabaseConfigured || !user?.id) return null;

    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    // First-time OAuth signup safeguard: if the Postgres trigger hasn't created the row yet
    // (or skipped on an edge case), create it idempotently from OAuth metadata.
    const meta = user.user_metadata || {};
    const inferredName = (meta.full_name || meta.name || meta.given_name || '').trim() || undefined;
    const inferredAvatar = meta.avatar_url || meta.picture || undefined;

    try {
      const created = await this.upsertProfile({
        id: user.id,
        email: user.email || '',
        full_name: inferredName,
        avatar_url: inferredAvatar,
      });
      return created as Profile;
    } catch (err) {
      console.warn('[ensureProfileForUser] Non-fatal profile bootstrap error:', err);
      return await this.getProfile(user.id);
    }
  },

  async uploadAvatar(userId: string, file: File) {
    // 1. Cleanup old avatar if it exists
    try {
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
      if (profile?.avatar_url) {
        const pathToDelete = storageService.getAvatarPathFromUrl(profile.avatar_url);
        if (pathToDelete) {
          console.log('Cleaning up previous avatar from storage (authService):', pathToDelete);
          await storageService.deleteFile('avatars', pathToDelete);
        }
      }
    } catch (err) {
      console.warn('Non-blocking error cleaning up old avatar in authService:', err);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`avatars/${filePath}`, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(`avatars/${filePath}`);

    return publicUrl;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async updatePassword(password: string, oldPassword?: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    
    if (oldPassword) {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !user.email) {
        throw new Error("User credentials not found. Please log in again.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword
      });

      if (signInError) {
        throw new Error("Your current password is incorrect. Please try again.");
      }
    }
    
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) throw error;
    return data;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    if (error) throw error;
    return data;
  },

  async saveReferralSource(userId: string, source: string, detail?: string) {
    if (!isSupabaseConfigured || !userId) return;

    // 1. Try to record in a dedicated table `user_referrals` if it exists in Supabase
    try {
      await supabase
        .from('user_referrals')
        .insert({
          user_id: userId,
          source: source,
          detail: detail || null,
          created_at: new Date().toISOString()
        });
    } catch (err) {
      console.warn('[Referral Survey] Note on user_referrals table:', err);
    }

    // 2. Update user profile
    try {
      await this.updateProfile({
        id: userId,
        referral_source: source,
        referral_source_detail: detail || null,
        referral_survey_completed_at: new Date().toISOString()
      } as any);
    } catch (err) {
      console.warn('[Referral Survey] Note on updating profile referral columns:', err);
    }
  }
};

/**
 * SQL to create the profiles table in Supabase:
 * 
 * create table profiles (
 *   id uuid references auth.users on delete cascade not null primary key,
 *   email text unique not null,
 *   full_name text,
 *   avatar_url text,
 *   is_admin boolean default false,
 *   chat_enabled boolean default true,
 *   favorite_event_ids text[] default '{}'::text[] not null,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- SQL to add favorite_event_ids to an existing profiles table:
 * -- alter table public.profiles add column if not exists favorite_event_ids text[] default '{}'::text[] not null;
 * 
 * -- Set up Row Level Security
 * alter table profiles enable row level security;
 * 
 * create policy "Public profiles are viewable by everyone."
 *   on profiles for select
 *   using ( true );
 * 
 * create policy "Users can insert their own profile."
 *   on profiles for insert
 *   with check ( auth.uid() = id );
 * 
 * create policy "Users can update own profile."
 *   on profiles for update
 *   using ( auth.uid() = id );
 * 
 * -- Hardened trigger to handle new OAuth/email signups safely without ever blocking auth.users creation
 * create or replace function public.handle_new_user()
 * returns trigger
 * language plpgsql
 * security definer
 * set search_path = public
 * as $$
 * begin
 *   insert into public.profiles (id, email, full_name, avatar_url)
 *   values (
 *     new.id,
 *     coalesce(new.email, ''),
 *     coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
 *     coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
 *   )
 *   on conflict (id) do update set
 *     email = coalesce(excluded.email, public.profiles.email),
 *     full_name = coalesce(public.profiles.full_name, excluded.full_name),
 *     avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
 *     updated_at = timezone('utc'::text, now());
 *   return new;
 * exception when others then
 *   raise warning 'handle_new_user non-fatal error for %: %', new.id, sqlerrm;
 *   return new;
 * end;
 * $$;
 * 
 * drop trigger if exists on_auth_user_created on auth.users;
 * create trigger on_auth_user_created
 *   after insert on auth.users
 *   for each row execute procedure public.handle_new_user();
 * 
 * -- =========================================================
 * -- UNLOCKD UN-REGISTRATION & PROFILE ARCHIVING SETUP
 * -- =========================================================
 * 
 * -- 1. Create the archive table to store un-registered users
 * create table if not exists public.archive_profiles (
 *   id uuid primary key,
 *   email text not null,
 *   full_name text,
 *   deleted_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- Enable row level security, but restrict access to admins or none (completely offline history)
 * alter table public.archive_profiles enable row level security;
 * 
 * -- 2. Create the security definer function to handle self-deletion
 * create or replace function public.delete_own_user()
 * returns void as $$
 * begin
 *   -- Archive user profile info first
 *   insert into public.archive_profiles (id, email, full_name, deleted_at)
 *   select id, email, full_name, now()
 *   from public.profiles
 *   where id = auth.uid()
 *   on conflict (id) do nothing;
 * 
 *   -- Clean up user's events first to prevent foreign key constraint violations
 *   delete from public.events
 *   where user_id = auth.uid();
 * 
 *   -- Clean up user's feedback (or let cascade handle it)
 *   delete from public.feedbacks
 *   where user_id = auth.uid();
 * 
 *   -- Clean up user's messages and conversations to prevent chat foreign key violations
 *   delete from public.messages
 *   where sender_id = auth.uid() or receiver_id = auth.uid();
 * 
 *   -- Clean up user's conversations
 *   delete from public.conversations
 *   where participant_1 = auth.uid() or participant_2 = auth.uid();
 * 
 *   -- Clean up blocks and reports
 *   delete from public.user_blocks
 *   where blocker_id = auth.uid() or blocked_id = auth.uid();
 * 
 *   delete from public.user_reports
 *   where reporter_id = auth.uid() or reported_id = auth.uid();
 * 
 *   -- Delete the user from auth.users (on delete cascade deletes from public.profiles automatically!)
 *   delete from auth.users
 *   where id = auth.uid();
 * end;
 * $$ language plpgsql security definer;
 */
