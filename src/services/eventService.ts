import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
   * 
   * -- Add RLS policies (adjust according to your needs)
   * alter table events enable row level security;
   * 
   * create policy "Allow public read access" on events for select using (true);
   * 
   * create policy "Allow authenticated users to insert events" on events for insert with check (
   *   auth.uid() is not null
   * );
   * 
   * create policy "Allow users to update/delete their own events" on events for all using (
   *   auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true
   * );
   */

  async getEvents() {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return (data || []).map((item: any) => {
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
      user_id: event.user_id
    };

    const { data, error } = await supabase
      .from('events')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
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
    return data;
  },

  async deleteEvent(id?: string, title?: string) {
    if (!isSupabaseConfigured) return true;

    try {
      if (id) {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id);
        if (error) {
          console.warn('Error deleting event by id from Supabase:', error.message);
        }
      }

      if (title && title.trim()) {
        const { error } = await supabase
          .from('events')
          .delete()
          .ilike('title', title.trim());
        if (error) {
          console.warn('Error deleting event by title from Supabase:', error.message);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
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

  async deleteDiscoveredEvent(id: string) {
    if (!isSupabaseConfigured) return false;

    try {
      const { error } = await supabase
        .from('ai_discovered_events')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Error deleting from ai_discovered_events:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error deleting from ai_discovered_events:', err);
      return false;
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

      return await response.json();
    } catch (err: any) {
      console.error('Error during Jane event matching:', err);
      throw err;
    }
  }
};
