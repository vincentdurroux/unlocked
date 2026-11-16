import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { searchService } from './searchService';

export interface SupabaseEvent {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  category: string;
  image_url: string;
  description?: string;
  ticket_url?: string;
  price?: string;
  is_free?: boolean;
  lat?: number;
  lng?: number;
  user_id?: string;
  created_at?: string;
}

export function isSameDay(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  const s1 = d1.trim().toLowerCase();
  const s2 = d2.trim().toLowerCase();
  if (s1 === s2) return true;

  const clean1 = s1.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const clean2 = s2.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  if (clean1 === clean2) return true;

  const p1 = Date.parse(d1);
  const p2 = Date.parse(d2);
  if (!isNaN(p1) && !isNaN(p2)) {
    const dt1 = new Date(p1);
    const dt2 = new Date(p2);
    return (
      dt1.getFullYear() === dt2.getFullYear() &&
      dt1.getMonth() === dt2.getMonth() &&
      dt1.getDate() === dt2.getDate()
    );
  }
  return false;
}

const DELETED_EVENTS_STORAGE_KEY = 'unlocked_deleted_events_v1';
const DELETED_EVENTS_SETTINGS_KEY = 'deleted_events_registry';

interface DeletedEventsRegistry {
  ids: string[];
  titles: string[];
  updatedAt?: number;
}

function normalizeEventTitle(title?: string | null): string {
  return (title || '').trim().toLowerCase();
}

function getLocalDeletedRegistry(): DeletedEventsRegistry {
  if (typeof window === 'undefined') return { ids: [], titles: [] };
  try {
    const raw = localStorage.getItem(DELETED_EVENTS_STORAGE_KEY);
    if (!raw) return { ids: [], titles: [] };
    const parsed = JSON.parse(raw);
    return {
      ids: Array.isArray(parsed?.ids) ? parsed.ids.map(String) : [],
      titles: Array.isArray(parsed?.titles) ? parsed.titles.map(normalizeEventTitle).filter(Boolean) : [],
      updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0
    };
  } catch {
    return { ids: [], titles: [] };
  }
}

function saveLocalDeletedRegistry(registry: DeletedEventsRegistry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      DELETED_EVENTS_STORAGE_KEY,
      JSON.stringify({
        ids: Array.from(new Set(registry.ids.filter(Boolean))).slice(-500),
        titles: Array.from(new Set(registry.titles.map(normalizeEventTitle).filter(Boolean))).slice(-500),
        updatedAt: registry.updatedAt || Date.now()
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchRemoteDeletedRegistry(): Promise<DeletedEventsRegistry | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', DELETED_EVENTS_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) return null;
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    return {
      ids: Array.isArray(parsed?.ids) ? parsed.ids.map(String) : [],
      titles: Array.isArray(parsed?.titles) ? parsed.titles.map(normalizeEventTitle).filter(Boolean) : [],
      updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : Date.now()
    };
  } catch {
    return null;
  }
}

async function syncDeletedRegistryToCloud(registry: DeletedEventsRegistry): Promise<void> {
  const cleanRegistry: DeletedEventsRegistry = {
    ids: Array.from(new Set(registry.ids.map(String).filter(Boolean))).slice(-500),
    titles: Array.from(new Set(registry.titles.map(normalizeEventTitle).filter(Boolean))).slice(-500),
    updatedAt: Date.now()
  };
  saveLocalDeletedRegistry(cleanRegistry);

  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from('app_settings')
      .upsert(
        {
          key: DELETED_EVENTS_SETTINGS_KEY,
          value: JSON.stringify(cleanRegistry),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );
  } catch (err) {
    console.warn('Could not sync deleted_events_registry to app_settings:', err);
  }
}

export const eventService = {
  /**
   * SQL TO CREATE THE TABLE IN SUPABASE:
   * 
   * create table events (
   *   id uuid default gen_random_uuid() primary key,
   *   title text not null,
   *   start_date text not null,
   *   end_date text,
   *   start_time text,
   *   end_time text,
   *   location text not null,
   *   category text not null,
   *   image_url text not null,
   *   description text,
   *   lat double precision,
   *   lng double precision,
   *   user_id uuid references auth.users(id),
   *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
   * );
   */

  async getEvents() {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning empty list');
      return [];
    }

    const [eventsRes, remoteRegistry] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false }),
      fetchRemoteDeletedRegistry()
    ]);

    const { data, error } = eventsRes;

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    const localRegistry = getLocalDeletedRegistry();
    let effectiveIds: Set<string>;
    let effectiveTitles: Set<string>;

    if (remoteRegistry) {
      if ((remoteRegistry.updatedAt || 0) >= (localRegistry.updatedAt || 0)) {
        effectiveIds = new Set(remoteRegistry.ids);
        effectiveTitles = new Set(remoteRegistry.titles);
        saveLocalDeletedRegistry(remoteRegistry);
      } else {
        const mergedIds = Array.from(new Set([...remoteRegistry.ids, ...localRegistry.ids]));
        const mergedTitles = Array.from(new Set([...remoteRegistry.titles, ...localRegistry.titles]));
        effectiveIds = new Set(mergedIds);
        effectiveTitles = new Set(mergedTitles);
        saveLocalDeletedRegistry({
          ids: mergedIds,
          titles: mergedTitles,
          updatedAt: localRegistry.updatedAt
        });
      }
    } else {
      effectiveIds = new Set(localRegistry.ids);
      effectiveTitles = new Set(localRegistry.titles);
    }

    return (data || [])
      .filter((item: any) => {
        if (!item) return false;
        if (item.category === '__DELETED__') return false;
        const itemId = item.id ? String(item.id) : '';
        const itemTitle = normalizeEventTitle(item.title);
        if (itemId && effectiveIds.has(itemId)) return false;
        if (itemTitle && effectiveTitles.has(itemTitle)) return false;
        return true;
      })
      .map((item: any) => {
        const sDate = item.start_date || item.date || 'Upcoming';
        const eDate = item.end_date && !isSameDay(sDate, item.end_date) ? item.end_date : null;
        return {
          ...item,
          date: sDate,
          start_date: sDate,
          end_date: eDate,
          time: item.start_time || item.time || '',
          start_time: item.start_time || item.time || '',
          end_time: item.end_time || null,
          image: item.image_url || item.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
          description: item.description,
          ticket_url: item.ticket_url || null,
          price: item.price || null,
          is_free: typeof item.is_free === 'boolean' ? item.is_free : undefined,
          sources: item.sources || [],
          coordinates: (item.lat && item.lng) ? { lat: item.lat, lng: item.lng } : undefined
        };
      });
  },

  async createEvent(event: any) {
    if (!isSupabaseConfigured) return null;

    const sDate = event.start_date || event.date;
    const eDate = event.end_date && !isSameDay(sDate, event.end_date) ? event.end_date : null;

    let resolvedUserId = event.user_id;
    if (!resolvedUserId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        resolvedUserId = sessionData?.session?.user?.id;
      } catch {
        // Ignore session lookup errors
      }
    }

    const payload = {
      title: event.title,
      start_date: sDate,
      end_date: eDate,
      start_time: event.start_time || event.time,
      end_time: event.end_time,
      location: event.location,
      category: event.category,
      image_url: event.image_url || event.image,
      description: event.description,
      lat: event.coordinates?.lat,
      lng: event.coordinates?.lng,
      user_id: resolvedUserId
    };

    const { data, error } = await supabase
      .from('events')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    // If this event title was previously in the deleted registry, remove it so it appears across all devices
    const normTitle = normalizeEventTitle(event.title);
    if (normTitle) {
      try {
        const remote = await fetchRemoteDeletedRegistry();
        const local = getLocalDeletedRegistry();
        const currentIds = new Set([...(remote?.ids || []), ...local.ids]);
        const currentTitles = new Set([...(remote?.titles || []), ...local.titles]);
        if (currentTitles.has(normTitle)) {
          currentTitles.delete(normTitle);
          await syncDeletedRegistryToCloud({
            ids: Array.from(currentIds),
            titles: Array.from(currentTitles)
          });
        }
      } catch {
        // Non-blocking
      }
    }

    return data;
  },

  async updateEvent(id: string, event: any) {
    if (!isSupabaseConfigured) return null;

    const sDate = event.start_date || event.date;
    const eDate = event.end_date && !isSameDay(sDate, event.end_date) ? event.end_date : null;

    const payload = {
      title: event.title,
      start_date: sDate,
      end_date: eDate,
      start_time: event.start_time || event.time || "",
      end_time: event.end_time || null,
      location: event.location,
      category: event.category,
      image_url: event.image_url || event.image,
      description: event.description || "",
      lat: event.coordinates?.lat !== undefined ? event.coordinates.lat : event.lat,
      lng: event.coordinates?.lng !== undefined ? event.coordinates.lng : event.lng
    };

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    // Harmonize content with ai_discovered_events table if matching by title
    try {
      if (event.title) {
        await supabase
          .from('ai_discovered_events')
          .update({
            title: event.title,
            start_date: sDate,
            end_date: eDate,
            start_time: event.start_time || event.time || null,
            end_time: event.end_time || null,
            location: event.location,
            category: event.category,
            image_url: event.image_url || event.image,
            description: event.description || '',
            lat: payload.lat,
            lng: payload.lng,
            sources: event.sources || [],
            published_to_events: true
          })
          .ilike('title', event.title.trim());
      }
    } catch (syncErr) {
      console.warn('Could not sync update to ai_discovered_events:', syncErr);
    }

    return data;
  },

  async updateDiscoveredEventByTitle(title: string, event: any) {
    if (!isSupabaseConfigured || !title) return;
    try {
      const sDate = event.start_date || event.date || 'Upcoming';
      const eDate = event.end_date && !isSameDay(sDate, event.end_date) ? event.end_date : null;
      const payload = {
        title: event.title || title,
        start_date: sDate,
        end_date: eDate,
        start_time: event.start_time || event.time || null,
        end_time: event.end_time || null,
        location: event.location,
        category: event.category,
        image_url: event.image_url || event.image,
        description: event.description || '',
        lat: event.coordinates?.lat !== undefined ? event.coordinates.lat : event.lat,
        lng: event.coordinates?.lng !== undefined ? event.coordinates.lng : event.lng,
        sources: event.sources || [],
        published_to_events: true
      };

      await supabase
        .from('ai_discovered_events')
        .update(payload)
        .ilike('title', title.trim());
    } catch (err) {
      console.warn('Error updating discovered event by title:', err);
    }
  },

  async deleteEvent(id?: string, title?: string) {
    return this.deleteEventsBulk([{ id, title }]);
  },

  async deleteEventsBulk(items: Array<{ id?: string; title?: string }>) {
    if (!items || items.length === 0) return true;

    const idsToDelete = Array.from(
      new Set(items.map(i => (i.id ? String(i.id).trim() : '')).filter(Boolean))
    );
    const titlesToDelete = Array.from(
      new Set(items.map(i => (i.title ? i.title.trim() : '')).filter(Boolean))
    );

    // If titles are missing for some IDs, look them up before deleting so title-based sync works across devices
    if (isSupabaseConfigured && idsToDelete.length > 0 && titlesToDelete.length < idsToDelete.length) {
      try {
        const { data: existingRows } = await supabase
          .from('events')
          .select('id, title')
          .in('id', idsToDelete);
        if (Array.isArray(existingRows)) {
          existingRows.forEach((row: any) => {
            if (row?.title && !titlesToDelete.includes(row.title.trim())) {
              titlesToDelete.push(row.title.trim());
            }
          });
        }
      } catch {
        // Non-blocking
      }
    }

    // 1. Persist deletion tombstones locally and in Supabase app_settings for cross-device sync
    try {
      const remote = await fetchRemoteDeletedRegistry();
      const local = getLocalDeletedRegistry();
      const mergedIds = Array.from(new Set([...(remote?.ids || []), ...local.ids, ...idsToDelete]));
      const mergedTitles = Array.from(
        new Set([
          ...(remote?.titles || []),
          ...local.titles,
          ...titlesToDelete.map(normalizeEventTitle).filter(Boolean)
        ])
      );
      await syncDeletedRegistryToCloud({
        ids: mergedIds,
        titles: mergedTitles
      });
    } catch (regErr) {
      console.warn('Error updating deleted events registry:', regErr);
    }

    if (!isSupabaseConfigured) return true;

    // 2. Delete from Supabase events table (by ID and by title) + fallback soft-delete if RLS blocks hard DELETE
    try {
      if (idsToDelete.length > 0) {
        const { data: deletedById } = await supabase
          .from('events')
          .delete()
          .in('id', idsToDelete)
          .select('id');

        if (!deletedById || deletedById.length < idsToDelete.length) {
          await supabase
            .from('events')
            .update({ category: '__DELETED__' })
            .in('id', idsToDelete);
        }
      }

      for (const rawTitle of titlesToDelete) {
        await supabase
          .from('events')
          .delete()
          .ilike('title', rawTitle);

        await supabase
          .from('ai_discovered_events')
          .update({ published_to_events: false })
          .ilike('title', rawTitle);
      }

      return true;
    } catch (error) {
      console.error('Error deleting event(s):', error);
      return true;
    }
  },

  // =========================================
  // AI DISCOVERED EVENTS (SEPARATE SUPABASE TABLE)
  // =========================================
  async getDiscoveredEvents() {
    if (!isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('ai_discovered_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Note on ai_discovered_events table:', error.message);
        return [];
      }

      return (data || []).map((item: any) => {
        const sDate = item.start_date || item.date || 'Upcoming';
        const eDate = item.end_date && !isSameDay(sDate, item.end_date) ? item.end_date : null;
        return {
          id: item.id,
          title: item.title,
          start_date: sDate,
          date: sDate,
          end_date: eDate,
          start_time: item.start_time,
          time: item.start_time,
          end_time: item.end_time,
          location: item.location,
          category: item.category,
          image: item.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
          description: item.description,
          coordinates: (item.lat && item.lng) ? { lat: item.lat, lng: item.lng } : undefined,
          sources: item.sources || [],
          published_to_events: item.published_to_events || false,
          created_at: item.created_at
        };
      });
    } catch (err) {
      console.warn('ai_discovered_events table error:', err);
      return [];
    }
  },

  async saveDiscoveredEvents(events: any[], query: string, month: string) {
    if (!isSupabaseConfigured || !events || events.length === 0) return;

    try {
      const payload = events.map(ev => {
        const sDate = ev.start_date || ev.date || 'Upcoming';
        const eDate = ev.end_date && !isSameDay(sDate, ev.end_date) ? ev.end_date : null;
        return {
          title: ev.title,
          start_date: sDate,
          end_date: eDate,
          start_time: ev.start_time || ev.time || null,
          end_time: ev.end_time || null,
          location: ev.location,
          category: ev.category,
          image_url: ev.image || ev.image_url,
          description: ev.description,
          lat: ev.coordinates?.lat || null,
          lng: ev.coordinates?.lng || null,
          sources: ev.sources || [],
          query: query,
          month: month,
          published_to_events: false
        };
      });

      const { data, error } = await supabase
        .from('ai_discovered_events')
        .insert(payload)
        .select();

      if (error) {
        console.warn('Could not insert into ai_discovered_events table:', error.message);
      } else {
        console.log(`Successfully stored ${data?.length || 0} events into Supabase ai_discovered_events table.`);
      }
      return data;
    } catch (err) {
      console.warn('Error saving to ai_discovered_events:', err);
    }
  },

  async markDiscoveredAsPublished(title: string) {
    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from('ai_discovered_events')
        .update({ published_to_events: true })
        .ilike('title', title);

      if (error) {
        console.warn('Could not update ai_discovered_events publication status:', error.message);
      }
    } catch (err) {
      console.warn('Error updating ai_discovered_events status:', err);
    }
  },

  async unmarkDiscoveredAsPublished(title: string, eventData?: any) {
    if (!isSupabaseConfigured) return;

    try {
      if (eventData?.id) {
        await supabase
          .from('ai_discovered_events')
          .update({ published_to_events: false })
          .eq('id', eventData.id);
      }

      const { data, error } = await supabase
        .from('ai_discovered_events')
        .update({ published_to_events: false })
        .ilike('title', title)
        .select();

      if (error) {
        console.warn('Could not update ai_discovered_events publication status:', error.message);
      }

      if (!error && (!data || data.length === 0) && eventData) {
        await supabase
          .from('ai_discovered_events')
          .insert([{
            title: eventData.title,
            start_date: eventData.start_date || eventData.date || 'Upcoming',
            end_date: eventData.end_date || null,
            start_time: eventData.start_time || eventData.time || null,
            end_time: eventData.end_time || null,
            location: eventData.location,
            category: eventData.category,
            image_url: eventData.image || eventData.image_url,
            description: eventData.description,
            lat: eventData.coordinates?.lat || eventData.lat || null,
            lng: eventData.coordinates?.lng || eventData.lng || null,
            sources: eventData.sources || [],
            published_to_events: false
          }]);
      }
    } catch (err) {
      console.warn('Error unmarking ai_discovered_events status:', err);
    }
  },

  async deleteDiscoveredEvent(id: string, title?: string) {
    if (!isSupabaseConfigured) return true;

    try {
      const { error } = await supabase
        .from('ai_discovered_events')
        .delete()
        .eq('id', id);

      if (error && title) {
        await supabase
          .from('ai_discovered_events')
          .delete()
          .ilike('title', title);
      }
      return true;
    } catch (err) {
      console.warn('Error deleting from ai_discovered_events:', err);
      return true;
    }
  },

  /**
   * AI-powered event matching and personalized recommendations with Assistant Jane
   */
  async matchEventsWithJane(query: string, events: any[]): Promise<{
    exactMatchFound: boolean;
    summaryMessage: string | null;
    results: Array<{ id: string; score: number; reason: string }>;
  }> {
    if (!query || !query.trim() || !events || events.length === 0) {
      return { exactMatchFound: false, summaryMessage: null, results: [] };
    }

    try {
      const response = await fetch('/api/ai-event-matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          events
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const data = await response.json();

      // Log search in the background using Supabase
      try {
        const resultsCount = Array.isArray(data?.results) ? data.results.length : 0;
        supabase.auth.getSession().then(({ data: authData }) => {
          const userId = authData?.session?.user?.id;
          searchService.saveSearch(query, 'jane_event', resultsCount, userId);
        }).catch(() => {
          searchService.saveSearch(query, 'jane_event', resultsCount, null);
        });
      } catch (logErr) {
        console.warn("Could not background log Jane event search:", logErr);
      }

      return data;
    } catch (err: any) {
      console.error('Error during Jane event matching:', err);
      throw err;
    }
  }
};
