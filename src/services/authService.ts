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
    // Return standard iOS deep link redirect for Capacitor
    return 'mycityunlocked://home';
  }

  // Fallback to standard web origin
  return origin;
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        function getOAuthRedirectTo(): string {
    return 'mycityunlocked://home';
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

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          oldName = user.email.split('@')[0];
        }
      }
    }

    // 2. Perform the update
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;

    // 3. Propagate the new name to testimonies if they are modified
    if (profile.full_name !== undefined && oldName && oldName !== profile.full_name) {
      try {
        console.log(`[Profile Update] Propagating name change from "${oldName}" to "${profile.full_name}" in testimonies...`);
        
        // Get user email for precise matching
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email?.toLowerCase();
        
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

    // First check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile.id)
      .maybeSingle();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (error && error.code === '42703' && ('chat_enabled' in profile)) {
        console.warn('chat_enabled column is missing, please update the schema. Skipping error.');
        return existing;
      }
      
      if (error) throw error;
      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...profile,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error && error.code === '42703' && ('chat_enabled' in profile)) {
        console.warn('chat_enabled column is missing, please update the schema. Skipping error.');
        return profile;
      }

      if (error) throw error;
      return data;
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
      const { data: { user } } = await supabase.auth.getUser();
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
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
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
 * -- Create a trigger to handle new user signups
 * create or replace function public.handle_new_user()
 * returns trigger as $$
 * begin
 *   insert into public.profiles (id, email, full_name, avatar_url)
 *   values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
 *   return new;
 * end;
 * $$ language plpgsql security definer;
 * 
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
 *   -- Delete the user from auth.users (on delete cascade deletes from public.profiles automatically!)
 *   delete from auth.users
 *   where id = auth.uid();
 * end;
 * $$ language plpgsql security definer;
 */
