import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  MessageSquare,
  RefreshCw,
  Download,
  Search,
  ShieldCheck,
  Clock,
  Mail,
  Heart,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';
import { searchService } from '../services/searchService';

export interface UserProfileItem {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin?: boolean;
  chat_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  inserted_at?: string;
  joined_at?: string;
  favorite_event_ids?: string[];
  favorite_pro_ids?: string[];
}

/**
 * Robustly extract best available date from a profile record
 * regardless of whether created_at, inserted_at, or updated_at exists.
 */
export const getProfileTimestamp = (u: any): string | undefined => {
  if (!u) return undefined;
  return u.created_at || u.inserted_at || u.creation_date || u.joined_at || u.updated_at || undefined;
};

type TimeframeOption = '7d' | '14d' | '30d' | '90d' | 'all';

interface MetricTotals {
  totalUsers: number;
  newUsersPeriod: number;
  newUsersToday: number;
  totalPros: number;
  totalEvents: number;
  totalTestimonies: number;
  totalRecommendations: number;
  activeProfilesCount: number;
  usersWithFavoritesCount: number;
}

export const AdminAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasCreatedAtColumn, setHasCreatedAtColumn] = useState<boolean>(true);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [searches, setSearches] = useState<any[]>([]);
  const [copiedSearchSql, setCopiedSearchSql] = useState<boolean>(false);

  // Raw data from Supabase
  const [profiles, setProfiles] = useState<UserProfileItem[]>([]);
  const [totals, setTotals] = useState<MetricTotals>({
    totalUsers: 0,
    newUsersPeriod: 0,
    newUsersToday: 0,
    totalPros: 0,
    totalEvents: 0,
    totalTestimonies: 0,
    totalRecommendations: 0,
    activeProfilesCount: 0,
    usersWithFavoritesCount: 0,
  });

  // Table filters & pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'favorites' | 'admins'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Main data fetcher
  const fetchAnalyticsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not yet configured with environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).");
      }

      // 1. Fetch user profiles without server-side ordering on created_at (which throws error 42703 if column is absent)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.warn('[AdminAnalytics] Error querying profiles:', profilesError);
        throw new Error(profilesError.message || 'Unable to fetch profiles table.');
      }

      const rawProfiles: UserProfileItem[] = profilesData || [];

      // Detect if created_at column is defined in the returned rows
      const hasCreated = rawProfiles.length === 0 || rawProfiles.some((p: any) => p.created_at !== undefined);
      setHasCreatedAtColumn(hasCreated);

      // Sort client-side descending by best timestamp, then by name/email
      const userProfiles = rawProfiles.slice().sort((a: any, b: any) => {
        const timeA = getProfileTimestamp(a) ? new Date(getProfileTimestamp(a)!).getTime() : 0;
        const timeB = getProfileTimestamp(b) ? new Date(getProfileTimestamp(b)!).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
      });

      setProfiles(userProfiles);

      // 2. Fetch parallel counts for other community assets
      const [prosRes, eventsRes, testimoniesRes, recsRes] = await Promise.allSettled([
        supabase.from('professionals').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }),
        supabase.from('recommendations').select('id', { count: 'exact', head: true }),
      ]);

      const prosCount = prosRes.status === 'fulfilled' && prosRes.value.count ? prosRes.value.count : 0;
      const eventsCount = eventsRes.status === 'fulfilled' && eventsRes.value.count ? eventsRes.value.count : 0;
      const testimoniesCount = testimoniesRes.status === 'fulfilled' && testimoniesRes.value.count ? testimoniesRes.value.count : 0;
      const recsCount = recsRes.status === 'fulfilled' && recsRes.value.count ? recsRes.value.count : 0;

      // 3. Compute timeframe-based metrics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      let periodDays = 30;
      if (timeframe === '7d') periodDays = 7;
      if (timeframe === '14d') periodDays = 14;
      if (timeframe === '90d') periodDays = 90;
      if (timeframe === 'all') periodDays = 3650;

      const periodStartTime = now.getTime() - periodDays * 24 * 60 * 60 * 1000;

      let newUsersPeriod = 0;
      let newUsersToday = 0;
      let activeProfilesCount = 0;
      let usersWithFavoritesCount = 0;

      userProfiles.forEach((u) => {
        const userDate = getProfileTimestamp(u);
        const createdAtTime = userDate ? new Date(userDate).getTime() : 0;
        if (createdAtTime >= periodStartTime) {
          newUsersPeriod++;
        }
        if (createdAtTime >= todayStart) {
          newUsersToday++;
        }
        if (u.full_name && u.full_name.trim().length > 0) {
          activeProfilesCount++;
        }
        const hasFavs = (u.favorite_pro_ids?.length || 0) > 0 || (u.favorite_event_ids?.length || 0) > 0;
        if (hasFavs) {
          usersWithFavoritesCount++;
        }
      });

      setTotals({
        totalUsers: userProfiles.length,
        newUsersPeriod,
        newUsersToday,
        totalPros: prosCount,
        totalEvents: eventsCount,
        totalTestimonies: testimoniesCount,
        totalRecommendations: recsCount,
        activeProfilesCount,
        usersWithFavoritesCount,
      });

      // 4. Fetch Jane search logs (hybrid: Supabase + LocalStorage fallback)
      try {
        const recentSearches = await searchService.getAllRecentSearches();
        setSearches(recentSearches);
      } catch (searchErr) {
        console.warn('[AdminAnalytics] Failed to query searches:', searchErr);
      }

      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('[AdminAnalytics] Fetch failed:', err);
      setErrorMsg(err.message || 'An error occurred while fetching Supabase data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Generate chart data based on selected timeframe
  const registrationChartData = useMemo(() => {
    const daysCount = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 30;
    const now = new Date();
    const result: Array<{ date: string; displayDate: string; count: number; cumulative: number }> = [];

    // Map each day
    const dayMap = new Map<string, number>();

    // Count user registrations per day
    profiles.forEach((p) => {
      const dateStr = getProfileTimestamp(p);
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });

    let cumulativeTotal = 0;
    // Calculate total prior to timeframe for correct cumulative line
    const oldestTimestamp = now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000;
    const oldestDayStart = new Date(oldestTimestamp);
    oldestDayStart.setHours(0, 0, 0, 0);

    profiles.forEach((p) => {
      const dateStr = getProfileTimestamp(p);
      if (!dateStr) return;
      const t = new Date(dateStr).getTime();
      if (!isNaN(t) && t < oldestDayStart.getTime()) {
        cumulativeTotal++;
      }
    });

    for (let i = daysCount - 1; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      const count = dayMap.get(dateKey) || 0;
      cumulativeTotal += count;

      const displayDate = targetDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: daysCount > 14 ? 'short' : 'short',
      });

      result.push({
        date: dateKey,
        displayDate,
        count,
        cumulative: cumulativeTotal,
      });
    }

    return result;
  }, [profiles, timeframe]);

  // Email domains breakdown (top 5 providers)
  const emailDomainStats = useMemo(() => {
    const counts = new Map<string, number>();
    profiles.forEach((p) => {
      if (!p.email) return;
      const domain = p.email.split('@')[1]?.toLowerCase() || 'other';
      let label = domain;
      if (domain.includes('gmail')) label = 'Google Gmail';
      else if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('apple')) label = 'Apple iCloud';
      else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) label = 'Microsoft Outlook';
      else if (domain.includes('yahoo')) label = 'Yahoo Mail';
      else label = 'Custom Domains & Other';

      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const list = Array.from(counts.entries()).map(([label, count]) => ({
      label,
      count,
      percent: profiles.length > 0 ? Math.round((count / profiles.length) * 100) : 0,
    }));

    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [profiles]);

  // Top popular queries made to Jane
  const topQueries = useMemo(() => {
    const counts: Record<string, number> = {};
    searches.forEach(s => {
      const q = (s.query || '').trim().toLowerCase();
      if (!q) return;
      counts[q] = (counts[q] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [searches]);

  // Filtered & searched users table
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date().getTime();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return profiles.filter((u) => {
      // Search
      const matchSearch =
        !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Filter
      if (filterType === 'recent') {
        const userDate = getProfileTimestamp(u);
        const created = userDate ? new Date(userDate).getTime() : 0;
        return created >= sevenDaysAgo;
      }
      if (filterType === 'favorites') {
        return (u.favorite_pro_ids?.length || 0) > 0 || (u.favorite_event_ids?.length || 0) > 0;
      }
      if (filterType === 'admins') {
        return !!u.is_admin;
      }
      return true;
    });
  }, [profiles, searchQuery, filterType]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (profiles.length === 0) return;

    const headers = ['ID', 'Full Name', 'Email', 'Registration Date', 'Admin', 'Chat Active', 'Favorite Pros', 'Favorite Events'];
    const rows = profiles.map((p) => [
      p.id,
      p.full_name || '',
      p.email,
      getProfileTimestamp(p) || '',
      p.is_admin ? 'Yes' : 'No',
      p.chat_enabled ? 'Yes' : 'No',
      p.favorite_pro_ids?.length || 0,
      p.favorite_event_ids?.length || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supabase_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Unknown date';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-navy p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-brand-blue border border-white/10">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Supabase Analytics
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white tracking-tight">
            Sign-ups & Community Metrics
          </h2>
          <p className="text-slate-300 text-sm max-w-xl">
            Real-time tracking of registered members in your Supabase database <code className="text-emerald-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">profiles</code> table.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {/* Timeframe pill selector */}
          <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/15 flex items-center gap-1">
            {(['7d', '14d', '30d', '90d', 'all'] as TimeframeOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setTimeframe(opt);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  timeframe === opt
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                {opt === '7d' ? '7 days' : opt === '14d' ? '14d' : opt === '30d' ? '30 days' : opt === '90d' ? '90d' : 'All time'}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchAnalyticsData(false)}
            disabled={refreshing}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl border border-white/15 transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Refresh Supabase data"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin text-emerald-400')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={profiles.length === 0}
            className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-2xl transition-all flex items-center gap-2 text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            title="Export registered members list to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Error Notice if Supabase has an issue */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Notice: Supabase Connection Issue</p>
            <p className="text-rose-700 text-xs">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Info notice if created_at column is not present in profiles table */}
      {!hasCreatedAtColumn && !errorMsg && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Supabase Optimization: Column <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">created_at</code> is optional
              </p>
              <p className="text-amber-800 mt-0.5">
                Your registered users are loaded successfully (using <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">updated_at</code> as fallback timestamp). To record exact initial sign-up timestamps, you can optionally run this SQL in your Supabase SQL Editor.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();');
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2500);
            }}
            className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-950 font-bold rounded-xl shrink-0 flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">SQL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-700" />
                <span>Copy SQL</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-brand-blue/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Members</span>
            <div className="p-2 bg-blue-50 text-brand-blue rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {loading ? '...' : totals.totalUsers.toLocaleString('en-US')}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              +{totals.newUsersPeriod} ({timeframe === '7d' ? '7d' : timeframe === '30d' ? '30d' : timeframe})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Profiles synced in Supabase
          </p>
        </div>

        {/* Card 2: New users today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Sign-ups</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {loading ? '...' : totals.newUsersToday}
            </span>
            <span className="text-xs font-semibold text-slate-400">last 24 hours</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Last refreshed at {lastRefreshedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Card 3: Users with favorites / active */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Member Engagement</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {loading ? '...' : totals.usersWithFavoritesCount}
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              {totals.totalUsers > 0 ? Math.round((totals.usersWithFavoritesCount / totals.totalUsers) * 100) : 0}% engaged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            Saved pros or community events
          </p>
        </div>

        {/* Card 4: Total Community Content */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Content</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {loading ? '...' : (totals.totalPros + totals.totalEvents + totals.totalTestimonies).toLocaleString('en-US')}
            </span>
            <span className="text-xs text-slate-400">database entries</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
            <span>{totals.totalPros} pros</span>
            <span>•</span>
            <span>{totals.totalEvents} events</span>
            <span>•</span>
            <span>{totals.totalTestimonies} reviews</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline Area Chart of Registrations */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                Sign-up Growth Curve ({timeframe === '7d' ? 'Last 7 days' : timeframe === '14d' ? 'Last 14 days' : timeframe === '30d' ? 'Last 30 days' : timeframe === '90d' ? 'Last 90 days' : 'All time'})
              </h3>
              <p className="text-xs text-slate-400">
                Daily new accounts created and cumulative member total
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-brand-blue" />
                <span>New / day</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-emerald-400 rounded-full" />
                <span>Cumulative</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading chart...
              </div>
            ) : registrationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No sign-up data found for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-800">
                            <p className="font-bold text-slate-200 mb-1">{data.date}</p>
                            <p className="text-emerald-400 font-semibold">
                              +{data.count} new registration{data.count > 1 ? 's' : ''}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              Cumulative total: {data.cumulative} members
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    activeDot={{ r: 5, stroke: '#1d4ed8', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Email Providers Breakdown & Supabase Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                Email Providers
              </h3>
              <p className="text-xs text-slate-400">
                Top domains used during registration
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {emailDomainStats.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 truncate max-w-[180px]">{item.label}</span>
                    <span className="text-slate-400">
                      {item.count} <span className="text-[10px] text-slate-400 font-normal">({item.percent}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        idx === 0
                          ? 'bg-brand-blue'
                          : idx === 1
                          ? 'bg-emerald-500'
                          : idx === 2
                          ? 'bg-purple-500'
                          : idx === 3
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      )}
                      style={{ width: `${Math.max(item.percent, 4)}%` }}
                    />
                  </div>
                </div>
              ))}

              {emailDomainStats.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No profiles recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* Supabase Technical Connection Box */}
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
                Supabase Connection
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px]', isSupabaseConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                {isSupabaseConfigured ? 'Connected (RLS Active)' : 'Not Configured'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Target table: <code className="font-mono text-slate-700 font-bold bg-white px-1 py-0.5 rounded border border-slate-200">public.profiles</code>. Registrations synchronize automatically when users sign in via Google, Apple, or Magic Link.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Users Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-blue" />
                Registered Users List
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {filteredUsers.length} found
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                View profile details, registration timestamps, and member activity status
              </p>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'recent', label: 'New (7d)' },
                { id: 'favorites', label: 'With Favorites' },
                { id: 'admins', label: 'Admins' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterType(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    filterType === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or Supabase UUID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded-md hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">User</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-6 text-right">Supabase ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-blue" />
                    Loading Supabase profiles...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No users found</p>
                    <p className="text-xs mt-1">
                      {searchQuery
                        ? `No results matching "${searchQuery}". Try another search.`
                        : 'No members found in this filtered view.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const initial = (u.full_name || u.email || 'U').charAt(0).toUpperCase();
                  const userDate = getProfileTimestamp(u);
                  const isRecent = userDate ? new Date().getTime() - new Date(userDate).getTime() < 48 * 3600 * 1000 : false;
                  const favProsCount = u.favorite_pro_ids?.length || 0;
                  const favEventsCount = u.favorite_event_ids?.length || 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* User Column */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || u.email}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                              {initial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {u.full_name || <span className="text-slate-400 italic">No name provided</span>}
                            </p>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Registration Date Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 text-xs">
                          {userDate
                            ? new Date(userDate).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date not provided'}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(userDate)}
                        </p>
                      </td>

                      {/* Status Badges Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.is_admin && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          {isRecent && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                              New
                            </span>
                          )}
                          {u.chat_enabled && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-medium">
                              Chat Active
                            </span>
                          )}
                          {!u.is_admin && !isRecent && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium">
                              Member
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Activity Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                        {favProsCount > 0 || favEventsCount > 0 ? (
                          <div className="flex items-center gap-2">
                            {favProsCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-semibold">
                                <Award className="w-3 h-3" /> {favProsCount} pro{favProsCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {favEventsCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-semibold">
                                <Calendar className="w-3 h-3" /> {favEventsCount} event{favEventsCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No favorites</span>
                        )}
                      </td>

                      {/* UUID Copy Column */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleCopyId(u.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-[11px] font-mono font-medium transition-all inline-flex items-center gap-1.5"
                          title="Copy Supabase UUID"
                        >
                          {copiedId === u.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>{u.id.slice(0, 8)}...</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Jane AI Assistant Search History Dashboard Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-blue animate-pulse" />
              Jane AI Assistant Searches
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full">
                {searches.length} logged
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyze the queries and intents of your users interacting with Assistant Jane
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const sqlText = `create table user_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  search_type text not null, -- 'jane_pro', 'jane_event'
  results_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_searches enable row level security;

create policy "Allow anyone to insert searches" on user_searches for insert with check (true);
create policy "Allow users to read their own searches" on user_searches for select using (
  auth.uid() = user_id or (select is_admin from public.profiles where id = auth.uid()) = true
);`;
                navigator.clipboard.writeText(sqlText);
                setCopiedSearchSql(true);
                setTimeout(() => setCopiedSearchSql(false), 2000);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {copiedSearchSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  SQL Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Supabase Table SQL
                </>
              )}
            </button>
          </div>
        </div>

        {searches.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-sm font-bold text-slate-800">No searches recorded yet</h4>
              <p className="text-xs text-slate-400">
                To enable search logging, please make sure the <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">user_searches</code> table is created in your Supabase database using the SQL button above.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Top Queries Summary */}
            {topQueries.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Top Popular Requests to Jane</h4>
                <div className="flex flex-wrap gap-2">
                  {topQueries.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-700">
                      <span className="font-bold text-brand-blue">#{idx + 1}</span>
                      <span className="italic">"{item.query}"</span>
                      <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                        {item.count} {item.count === 1 ? 'time' : 'times'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Searches Log Table */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Search Query</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-center">Results Found</th>
                      <th className="py-3 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {searches.slice(0, 25).map((record) => {
                      const userProfile = profiles.find(p => p.id === record.user_id);
                      const userDisplay = userProfile
                        ? `${userProfile.full_name || userProfile.email}`
                        : record.user_id
                        ? 'Authenticated User'
                        : 'Guest / Anonymous';

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {userDisplay}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs italic text-slate-800">
                            "{record.query}"
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                              record.search_type === 'jane_event'
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            )}>
                              {record.search_type === 'jane_event' ? 'Jane Event' : 'Jane Pro'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            {record.results_count ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[10px]">
                            {new Date(record.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
