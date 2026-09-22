import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SearchRecord {
  id: string;
  user_id?: string | null;
  query: string;
  search_type: string; // 'jane_pro', 'jane_event', 'standard_pro', 'admin_event_search'
  results_count: number;
  created_at: string;
}

export const searchService = {
  /**
   * SQL TO CREATE THE TABLE IN SUPABASE:
   * 
   * create table user_searches (
   *   id uuid default gen_random_uuid() primary key,
   *   user_id uuid references auth.users(id) on delete set null,
   *   query text not null,
   *   search_type text not null, -- 'jane_pro', 'jane_event', 'standard_pro'
   *   results_count integer default 0,
   *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
   * );
   * 
   * -- Add RLS policies
   * alter table user_searches enable row level security;
   * 
   * -- Allow users to insert their own searches (authenticated or anonymous)
   * create policy "Allow anyone to insert searches" on user_searches for insert with check (
   *   true
   * );
   * 
   * -- Allow users to read their own searches
   * create policy "Allow users to read their own searches" on user_searches for select using (
   *   auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true
   * );
   */

  async saveSearch(query: string, searchType: string, resultsCount: number = 0, userId?: string | null) {
    if (!query || !query.trim()) return null;

    // 1. ALWAYS save to localStorage first as a robust local trace/fallback
    const localRecord: SearchRecord = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: userId || null,
      query: query.trim(),
      search_type: searchType,
      results_count: resultsCount,
      created_at: new Date().toISOString()
    };

    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('local_user_searches');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(localRecord);
        // Limit to 100 searches in local storage to keep it lightweight
        localStorage.setItem('local_user_searches', JSON.stringify(list.slice(0, 100)));
      }
    } catch (lsErr) {
      console.warn('Could not write search record to localStorage fallback:', lsErr);
    }

    // 2. Try to save to Supabase if configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, saved to local cache fallback only');
      return [localRecord];
    }

    try {
      const payload = {
        query: query.trim(),
        search_type: searchType,
        results_count: resultsCount,
        user_id: userId || null
      };

      const { data, error } = await supabase
        .from('user_searches')
        .insert([payload])
        .select();

      if (error) {
        console.warn('Error saving search in Supabase database, falling back to local cache:', error.message);
        return [localRecord];
      }

      return data;
    } catch (err) {
      console.error('Failed to save search record in Supabase, falling back to local cache:', err);
      return [localRecord];
    }
  },

  async getAllRecentSearches() {
    let dbSearches: SearchRecord[] = [];
    
    // 1. Fetch from Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_searches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          dbSearches = data as SearchRecord[];
        } else if (error) {
          console.warn('[searchService] Supabase query failed, falling back to local storage cache:', error.message);
        }
      } catch (err) {
        console.warn('[searchService] Failed to fetch from Supabase table:', err);
      }
    }

    // 2. Load from localStorage
    let localSearches: SearchRecord[] = [];
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('local_user_searches');
        if (stored) {
          localSearches = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('[searchService] Error reading local searches cache:', e);
    }

    // 3. Merge and de-duplicate searches (prioritize database, match by query and similar timestamps)
    const mergedMap = new Map<string, SearchRecord>();

    // Add local searches first
    localSearches.forEach(s => {
      // Create a unique key using query and timestamp rounded to 10 seconds to merge duplicated triggers
      const timeKey = Math.round(new Date(s.created_at).getTime() / 10000);
      const key = `${s.query.trim().toLowerCase()}-${timeKey}`;
      mergedMap.set(key, s);
    });

    // Add database searches (overwriting matches with cleaner DB record)
    dbSearches.forEach(s => {
      const timeKey = Math.round(new Date(s.created_at).getTime() / 10000);
      const key = `${s.query.trim().toLowerCase()}-${timeKey}`;
      mergedMap.set(key, s);
    });

    // Sort by date descending
    return Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getSearchHistory(userId: string) {
    if (!isSupabaseConfigured || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching search history:', error);
        return [];
      }

      return data as SearchRecord[];
    } catch (err) {
      console.error('Failed to get search history:', err);
      return [];
    }
  },

  async deleteSearchRecord(id: string) {
    if (!isSupabaseConfigured || !id) return false;

    try {
      const { error } = await supabase
        .from('user_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete search record:', err);
      return false;
    }
  },

  async clearSearchHistory(userId: string) {
    if (!isSupabaseConfigured || !userId) return false;

    try {
      const { error } = await supabase
        .from('user_searches')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to clear search history:', err);
      return false;
    }
  }
};
