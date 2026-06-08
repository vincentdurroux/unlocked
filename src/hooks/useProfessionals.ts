import { useState, useEffect } from 'react';
import { proService } from '../services/proService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// We import MOCK_PROS directly or define it here
// To avoid circular dependency if MOCK_PROS is in App.tsx, we'll pass it as fallback or define it in a constants file
// For simplicity, let's assume we want a clean way to handle this.

export function useProfessionals(fallbackData: any[] = []) {
  const [professionals, setProfessionals] = useState<any[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadPros() {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setProfessionals([]);
        setLoading(false);
        return;
      }

      const data = await proService.getProfessionals();
      setProfessionals(data || []);
    } catch (err) {
      console.error('Failed to load professionals from Supabase:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPros();

    if (!isSupabaseConfigured) return;

    // Real-time updates for professionals directory
    const channel = supabase
      .channel('realtime_professionals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'professionals'
        },
        () => {
          console.log('[Realtime] Professionals table updated - refetching...');
          loadPros();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { professionals, loading, error, refetch: loadPros };
}
