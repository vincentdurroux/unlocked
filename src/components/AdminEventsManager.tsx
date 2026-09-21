import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  ArrowLeft,
  Check,
  Sparkles,
  ExternalLink,
  Upload,
  X,
  Grid,
  List,
  Compass,
  Info,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Search,
  Camera,
  Layers,
  SlidersHorizontal,
  Download,
  Globe,
  Navigation,
  Loader2,
  Share2,
  Ticket
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';
import { eventService, isSameDay } from '../services/eventService';
import { storageService } from '../lib/storage';
import { compressImage } from '../services/imageService';
import { cn } from '../lib/utils';
import {
  parseDescriptionSections,
  renderFormattedContent,
  getCategoryWithEmoji,
  enrichSectionTextWithEmojis
} from './AdminAiEventSearch';
import { matchesCategoryFilter } from '../utils/eventFormatter';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export interface AdminEventItem {
  id: string;
  title: string;
  date?: string;
  time?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  category: string;
  image?: string;
  image_url?: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  is_highlighted?: boolean;
  verified_real?: boolean;
  ticket_url?: string;
  price?: string;
  is_free?: boolean;
  sources?: { title: string; url: string }[];
}

const VALENCIA_PHOTO_PRESETS = [
  {
    name: 'Arts & Sciences',
    category: 'Culture',
    url: 'https://images.unsplash.com/photo-1599395026601-38374d9e03d4?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Turia Gardens',
    category: 'Outdoor',
    url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Live Concert',
    category: 'Music',
    url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Tapas & Wine',
    category: 'Gastronomy',
    url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Modern Art',
    category: 'Art',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Theatre & Stage',
    category: 'Theatre',
    url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Malvarrosa Sunset',
    category: 'Outdoor',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Tech & Community',
    category: 'Community',
    url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200'
  }
];

const COMMON_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: '🎨 Art', value: 'Art' },
  { label: '🏛️ Museums', value: 'Museums' },
  { label: '🎶 Music', value: 'Music' },
  { label: '🌙 Nightlife', value: 'Nightlife' },
  { label: '🍷 Gastronomy', value: 'Gastronomy' },
  { label: '🎭 Theatre', value: 'Theatre' },
  { label: '🌳 Outdoor', value: 'Outdoor' },
  { label: '⚽ Sports', value: 'Sports' },
  { label: '💻 Tech', value: 'Tech' },
  { label: '👥 Community', value: 'Community' },
  { label: '👨‍👩‍👧 Family', value: 'Family' },
  { label: '🌟 Festival', value: 'Festival' },
  { label: '🛠️ Workshops', value: 'Workshops' }
];

interface AdminEventsManagerProps {
  events: AdminEventItem[];
  onRefetchEvents?: () => Promise<void>;
  setMsg: (msg: { type: 'success' | 'error'; text: string } | null) => void;
  currentUser?: any;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  editingEventId: string | null;
  setEditingEventId: (id: string | null) => void;
  newEvent: any;
  setNewEvent: React.Dispatch<React.SetStateAction<any>>;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  scrollToTop?: () => void;
  discoveredEventTitle?: string | null;
  setDiscoveredEventTitle?: (title: string | null) => void;
}

export function AdminEventsManager({
  events,
  onRefetchEvents,
  setMsg,
  currentUser,
  activeTab,
  setActiveTab,
  editingEventId,
  setEditingEventId,
  newEvent,
  setNewEvent,
  selectedFile,
  setSelectedFile,
  previewUrl,
  setPreviewUrl,
  scrollToTop,
  discoveredEventTitle,
  setDiscoveredEventTitle
}: AdminEventsManagerProps) {
  // All Events State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortOption, setSortOption] = useState<'date_asc' | 'date_desc' | 'title_asc' | 'recent'>('date_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewModalEvent, setPreviewModalEvent] = useState<AdminEventItem | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Editor State
  const [editorDescriptionMode, setEditorDescriptionMode] = useState<'structured' | 'raw'>('structured');
  const [editExpect, setEditExpect] = useState('');
  const [editPerfectFor, setEditPerfectFor] = useState('');
  const [editGoodToKnow, setEditGoodToKnow] = useState('');
  const [editMoreInfo, setEditMoreInfo] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastParsedDescription = useRef<string | null>(null);

  // When opening edit mode, parse the 4 description sections
  useEffect(() => {
    if (activeTab === 'edit_event' || activeTab === 'add_event') {
      const rawDesc = newEvent.description || '';
      // If the description has changed from what we last parsed/synced, re-parse it
      if (rawDesc !== lastParsedDescription.current) {
        const parsed = parseDescriptionSections(rawDesc);
        setEditExpect(parsed.expect || '');
        setEditPerfectFor(parsed.perfectFor || '');
        setEditGoodToKnow(parsed.goodToKnow || '');
        setEditMoreInfo(parsed.moreInfo || '');
        lastParsedDescription.current = rawDesc;
      }
    }
  }, [activeTab, editingEventId, newEvent.description, newEvent.title]);

  // Sync structured sections back to newEvent.description
  const syncStructuredToDescription = (
    expect: string,
    perfectFor: string,
    goodToKnow: string,
    moreInfo: string
  ) => {
    const parts: string[] = [];
    if (expect.trim()) {
      parts.push(`### 1. What can you expect?\n${expect.trim()}`);
    }
    if (perfectFor.trim()) {
      parts.push(`### 2. Perfect for\n${perfectFor.trim()}`);
    }
    if (goodToKnow.trim()) {
      parts.push(`### 3. Good to know (tips)\n${goodToKnow.trim()}`);
    }
    if (moreInfo.trim()) {
      parts.push(`### 4. More information\n${moreInfo.trim()}`);
    }
    const combined = parts.join('\n\n');
    lastParsedDescription.current = combined; // Mark as synced so useEffect doesn't re-parse
    setNewEvent((prev: any) => ({ ...prev, description: combined }));
  };

  // Helper to parse date strings for upcoming / past filtering
  const getEventTimestamp = (event: AdminEventItem): number => {
    const dateStr = event.start_date || event.date;
    if (!dateStr) return 0;
    if (/year[- ]round|toute l'ann|permanent/i.test(dateStr)) {
      return Date.now() + 86400000 * 365;
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;

    // Try parsing "OCT 15" or "15 OCT"
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const currentYear = new Date().getFullYear();
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      let monthIdx = -1;
      let day = 1;
      for (const p of parts) {
        const m = monthNames.findIndex(mn => p.toLowerCase().startsWith(mn));
        if (m !== -1) monthIdx = m;
        const d = parseInt(p, 10);
        if (!isNaN(d) && d > 0 && d <= 31) day = d;
      }
      if (monthIdx !== -1) {
        return new Date(currentYear, monthIdx, day).getTime();
      }
    }
    return 0;
  };

  const nowTime = new Date().setHours(0, 0, 0, 0);

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (event.title || '').toLowerCase().includes(q);
        const matchLocation = (event.location || '').toLowerCase().includes(q);
        const matchCategory = (event.category || '').toLowerCase().includes(q);
        const matchDesc = (event.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLocation && !matchCategory && !matchDesc) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (!matchesCategoryFilter(event.category, selectedCategory)) {
          return false;
        }
      }

      // Timeline filter
      if (timelineFilter !== 'all') {
        const evTime = getEventTimestamp(event);
        if (evTime > 0) {
          if (timelineFilter === 'upcoming' && evTime < nowTime) return false;
          if (timelineFilter === 'past' && evTime >= nowTime) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      const timeA = getEventTimestamp(a);
      const timeB = getEventTimestamp(b);
      if (sortOption === 'date_asc') {
        if (timeA === 0 && timeB === 0) return 0;
        if (timeA === 0) return 1;
        if (timeB === 0) return -1;
        return timeA - timeB;
      }
      if (sortOption === 'date_desc') {
        return timeB - timeA;
      }
      // 'recent'
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [events, searchQuery, selectedCategory, timelineFilter, sortOption]);

  // Metrics
  const stats = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter(e => {
      const t = getEventTimestamp(e);
      return t === 0 || t >= nowTime;
    }).length;
    const multiDay = events.filter(e => e.end_date && !isSameDay(e.start_date || e.date, e.end_date)).length;
    const uniqueCategories = new Set(events.map(e => (e.category || '').toLowerCase().trim()).filter(Boolean)).size;

    return { total, upcoming, multiDay, uniqueCategories };
  }, [events]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    COMMON_CATEGORIES.forEach(c => {
      if (c.value === 'all') return;
      counts[c.value] = events.filter(e => matchesCategoryFilter(e.category, c.value)).length;
    });
    return counts;
  }, [events]);

  // Handle Edit click
  const handleStartEdit = (event: AdminEventItem) => {
    setEditingEventId(event.id);
    const sDate = event.start_date || event.date || '';
    const eDate = event.end_date && !isSameDay(sDate, event.end_date) ? event.end_date : '';
    setNewEvent({
      title: event.title || '',
      start_date: sDate,
      end_date: eDate,
      start_time: event.start_time || event.time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      category: event.category || '',
      description: event.description || '',
      image: event.image_url || event.image || '',
      lat: event.coordinates?.lat || 0,
      lng: event.coordinates?.lng || 0,
      ticket_url: event.ticket_url || event.sources?.[0]?.url || '',
      price: event.price || '',
      is_free: event.is_free !== undefined ? event.is_free : true,
      sources: event.sources ? [...event.sources] : []
    });
    setPreviewUrl(event.image_url || event.image || null);
    setSelectedFile(null);
    setActiveTab('edit_event');
    scrollToTop?.();
  };

  // Handle Duplicate click
  const handleDuplicateEvent = (event: AdminEventItem) => {
    setEditingEventId(null);
    const sDate = event.start_date || event.date || '';
    const eDate = event.end_date && !isSameDay(sDate, event.end_date) ? event.end_date : '';
    setNewEvent({
      title: `${event.title} (Copy)`,
      start_date: sDate,
      end_date: eDate,
      start_time: event.start_time || event.time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      category: event.category || '',
      description: event.description || '',
      image: event.image_url || event.image || '',
      lat: event.coordinates?.lat || 0,
      lng: event.coordinates?.lng || 0,
      ticket_url: event.ticket_url || event.sources?.[0]?.url || '',
      price: event.price || '',
      is_free: event.is_free !== undefined ? event.is_free : true,
      sources: event.sources ? [...event.sources] : []
    });
    setPreviewUrl(event.image_url || event.image || null);
    setSelectedFile(null);
    setActiveTab('add_event');
    setMsg({ type: 'success', text: `Duplicated "${event.title}". Review and save.` });
    scrollToTop?.();
  };

  // Handle Delete
  const handleDeleteEvent = async (event: AdminEventItem) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      return;
    }
    setDeletingId(event.id);
    try {
      await eventService.deleteEvent(event.id, event.title);
      setMsg({ type: 'success', text: 'Event deleted successfully.' });
      if (onRefetchEvents) await onRefetchEvents();
      setSelectedEventIds(prev => prev.filter(id => id !== event.id));
    } catch (err) {
      console.error('Failed to delete event:', err);
      setMsg({ type: 'error', text: 'Failed to delete event.' });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedEventIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedEventIds.length} selected events?`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      for (const id of selectedEventIds) {
        await eventService.deleteEvent(id);
      }
      setMsg({ type: 'success', text: `${selectedEventIds.length} events deleted successfully.` });
      setSelectedEventIds([]);
      if (onRefetchEvents) await onRefetchEvents();
    } catch (err) {
      console.error('Failed to bulk delete events:', err);
      setMsg({ type: 'error', text: 'Error deleting some events.' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const itemsToExport = selectedEventIds.length > 0
      ? events.filter(e => selectedEventIds.includes(e.id))
      : filteredEvents;

    const headers = ['title', 'category', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'description', 'image_url', 'lat', 'lng'];
    const rows = itemsToExport.map(e => [
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.start_date || e.date || '').replace(/"/g, '""')}"`,
      `"${(e.end_date || '').replace(/"/g, '""')}"`,
      `"${(e.start_time || e.time || '').replace(/"/g, '""')}"`,
      `"${(e.end_time || '').replace(/"/g, '""')}"`,
      `"${(e.location || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.image_url || e.image || '').replace(/"/g, '""')}"`,
      e.coordinates?.lat || '',
      e.coordinates?.lng || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valencia_events_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Address Geocoding
  const handleGeocodeAddress = async () => {
    if (!newEvent.location || !newEvent.location.trim()) {
      setMsg({ type: 'error', text: 'Please enter a location or address first.' });
      return;
    }
    setIsGeocoding(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: `${newEvent.location}, Valencia, Spain` }, (res, status) => {
          if (status === 'OK' && res && res.length > 0) resolve(res);
          else reject(status);
        });
      });
      const loc = results[0].geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();
      setNewEvent((prev: any) => ({
        ...prev,
        lat,
        lng,
        location: results[0].formatted_address || prev.location
      }));
      setMsg({ type: 'success', text: `Geocoded: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    } catch (e) {
      console.error('Geocoding failed:', e);
      setMsg({ type: 'error', text: 'Could not geocode address automatically. You can enter coordinates manually.' });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle Save / Submit
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.title.trim()) {
      setMsg({ type: 'error', text: 'Please provide an event title.' });
      return;
    }
    if (!newEvent.start_date || !newEvent.start_date.trim()) {
      setMsg({ type: 'error', text: 'Please provide a start date.' });
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = newEvent.image;
      if (selectedFile) {
        const fileToUpload = await compressImage(selectedFile);
        const path = `events/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        imageUrl = await storageService.uploadFile('images', path, fileToUpload);
      }

      // Auto clean single-day dates
      const sDate = newEvent.start_date.trim();
      const eDate = newEvent.end_date && !isSameDay(sDate, newEvent.end_date) ? newEvent.end_date.trim() : null;

      // Geocode if missing
      let finalLat = Number(newEvent.lat) || 0;
      let finalLng = Number(newEvent.lng) || 0;
      if ((finalLat === 0 || finalLng === 0) && newEvent.location) {
        try {
          const geocoder = new google.maps.Geocoder();
          const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: `${newEvent.location}, Valencia, Spain` }, (res, status) => {
              if (status === 'OK' && res && res.length > 0) resolve(res);
              else reject(status);
            });
          });
          finalLat = results[0].geometry.location.lat();
          finalLng = results[0].geometry.location.lng();
        } catch (err) {
          console.warn('Geocoding fallback skipped:', err);
        }
      }

      const payload = {
        title: newEvent.title.trim(),
        start_date: sDate,
        end_date: eDate,
        date: sDate,
        start_time: newEvent.start_time || '',
        end_time: newEvent.end_time || '',
        time: newEvent.start_time || '',
        location: newEvent.location.trim(),
        category: newEvent.category.trim() || 'Community',
        description: newEvent.description || '',
        image: imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200',
        image_url: imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200',
        coordinates: { lat: finalLat, lng: finalLng },
        lat: finalLat,
        lng: finalLng,
        ticket_url: newEvent.ticket_url ? newEvent.ticket_url.trim() : null,
        price: newEvent.price ? newEvent.price.trim() : null,
        is_free: Boolean(newEvent.is_free),
        sources: newEvent.sources && newEvent.sources.length > 0 ? newEvent.sources : (newEvent.ticket_url ? [{ title: 'Official Ticketing', url: newEvent.ticket_url.trim() }] : []),
        user_id: currentUser?.id
      };

      if (editingEventId) {
        await eventService.updateEvent(editingEventId, payload);
        if (discoveredEventTitle) {
          await eventService.markDiscoveredAsPublished(discoveredEventTitle);
        }
        setMsg({ type: 'success', text: `Event "${payload.title}" updated successfully!` });
      } else {
        await eventService.createEvent(payload);
        if (discoveredEventTitle) {
          await eventService.markDiscoveredAsPublished(discoveredEventTitle);
        }
        setMsg({ type: 'success', text: `Event "${payload.title}" created successfully!` });
      }

      if (onRefetchEvents) await onRefetchEvents();

      // Reset
      setEditingEventId(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (setDiscoveredEventTitle) setDiscoveredEventTitle(null);
      setActiveTab('all_events');
      scrollToTop?.();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setMsg({ type: 'error', text: err?.message || 'Failed to save event.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick date setter
  const setQuickDate = (type: 'today' | 'tomorrow' | 'weekend' | 'next_month') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'weekend') {
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else if (type === 'next_month') {
      d.setMonth(d.getMonth() + 1);
    }
    const iso = d.toISOString().slice(0, 10);
    setNewEvent((prev: any) => ({ ...prev, start_date: iso }));
  };

  // ----------------------------------------------------
  // RENDER: EDIT / ADD EVENT MODE
  // ----------------------------------------------------
  if (activeTab === 'edit_event' || activeTab === 'add_event') {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Top bar */}
        <div className="bg-white p-4 sm:p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all_events');
                setEditingEventId(null);
              }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Back to All Events"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                  {editingEventId ? 'Event Editor' : 'New Event'}
                </span>
                {editingEventId && (
                  <span className="text-[11px] text-slate-400 font-mono">ID: {editingEventId.slice(0, 8)}...</span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 mt-0.5">
                {editingEventId ? (newEvent.title || 'Edit Event') : 'Create New Community Event'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowLivePreview(prev => !prev)}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer",
                showLivePreview
                  ? "bg-brand-blue text-white border-brand-blue shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showLivePreview ? 'Hide Live Preview' : 'Live Preview'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveEvent}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{editingEventId ? 'Update Event' : 'Publish Event'}</span>
            </button>
          </div>
        </div>

        {/* Live Preview Drawer / Box when toggled */}
        {showLivePreview && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-[32px] border border-slate-700 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Public Live Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLivePreview(false)}
                className="text-white/60 hover:text-white text-xs font-semibold p-1 cursor-pointer"
              >
                Close Preview ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Card preview */}
              <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-100 flex flex-col">
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={previewUrl || newEvent.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-md text-slate-800 font-extrabold text-[10px] uppercase tracking-widest rounded-full shadow-sm">
                      {getCategoryWithEmoji(newEvent.category || 'Event')}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow text-center">
                    <p className="text-[10px] font-extrabold text-brand-blue uppercase leading-tight">
                      {newEvent.start_date || 'Upcoming'}
                    </p>
                    {newEvent.end_date && !isSameDay(newEvent.start_date, newEvent.end_date) && (
                      <>
                        <p className="text-[8px] text-slate-400 font-medium leading-none">to</p>
                        <p className="text-[10px] font-extrabold text-brand-blue uppercase leading-tight">
                          {newEvent.end_date}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                    {newEvent.title || 'Untitled Event'}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{newEvent.location || 'Location in Valencia'}</span>
                  </div>
                  {(newEvent.start_time || newEvent.end_time) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{newEvent.start_time} {newEvent.end_time ? `- ${newEvent.end_time}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Formatted Content Preview */}
              <div className="md:col-span-2 space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10 max-h-96 overflow-y-auto">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Article Sections Rendering:
                </span>
                <div className="space-y-3 text-xs leading-relaxed text-slate-200">
                  {editExpect && (
                    <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-sky-300 mb-1">✨ What can you expect?</p>
                      {renderFormattedContent(editExpect, "font-bold text-sky-200")}
                    </div>
                  )}
                  {editPerfectFor && (
                    <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-emerald-300 mb-1">🎯 Perfect for</p>
                      {renderFormattedContent(editPerfectFor, "font-bold text-emerald-200")}
                    </div>
                  )}
                  {editGoodToKnow && (
                    <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-amber-300 mb-1">💡 Good to know (tips)</p>
                      {renderFormattedContent(editGoodToKnow, "font-bold text-amber-200")}
                    </div>
                  )}
                  {editMoreInfo && (
                    <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                      <p className="font-bold text-teal-300 mb-1">🔗 More information</p>
                      {renderFormattedContent(editMoreInfo, "font-bold text-teal-200")}
                    </div>
                  )}
                  {!editExpect && !editPerfectFor && !editGoodToKnow && !editMoreInfo && (
                    <p className="text-slate-400 italic text-xs">No section content added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Editor Form */}
        <form onSubmit={handleSaveEvent} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Core Fields */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-5 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Info className="w-4 h-4 text-emerald-500" />
                1. Basic Event Details
              </h4>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>Event Title *</span>
                  <span className="text-slate-400 font-normal text-[11px]">{newEvent.title?.length || 0} chars</span>
                </label>
                <input
                  required
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ex: Valencia Jazz & Soul Festival"
                  className="w-full h-12 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-2xl px-4 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Categories (Multi-select) *</label>
                {/* Preset quick pills */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CATEGORIES.filter(c => c.value !== 'all').map(cat => {
                    const currentCats = (newEvent.category || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
                    const isSelected = currentCats.includes(cat.value.toLowerCase());
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          const existing = (newEvent.category || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                          let updated: string[];
                          if (existing.some(e => e.toLowerCase() === cat.value.toLowerCase())) {
                            updated = existing.filter(e => e.toLowerCase() !== cat.value.toLowerCase());
                          } else {
                            updated = [...existing, cat.value];
                          }
                          setNewEvent({ ...newEvent, category: updated.join(', ') });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                          isSelected
                            ? "bg-orange-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  required
                  value={newEvent.category || ''}
                  onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                  placeholder="Or enter categories separated by comma (e.g. Art, Outdoor)..."
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Start Date *</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQuickDate('today')}
                        className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        Today
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setQuickDate('weekend')}
                        className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        Weekend
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, start_date: 'Year Round', end_date: '' })}
                        className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        Year Round
                      </button>
                    </div>
                  </div>
                  <input
                    required
                    type="text"
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    placeholder="YYYY-MM-DD or 15 OCT"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="date"
                    onChange={e => {
                      if (e.target.value) setNewEvent({ ...newEvent, start_date: e.target.value });
                    }}
                    className="w-full h-8 text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg px-2 cursor-pointer"
                    title="Select from date picker"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">End Date (Optional)</label>
                    {newEvent.end_date && (
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, end_date: '' })}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Clear (Single Day)
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newEvent.end_date || ''}
                    onChange={e => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    placeholder="Leave blank if single-day"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="date"
                    onChange={e => {
                      if (e.target.value) setNewEvent({ ...newEvent, end_date: e.target.value });
                    }}
                    className="w-full h-8 text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg px-2 cursor-pointer"
                    title="Select end date"
                  />
                  {newEvent.end_date && isSameDay(newEvent.start_date, newEvent.end_date) && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      ⚠️ Same as start date: will automatically save as a single-day event.
                    </p>
                  )}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Start Time</label>
                  <input
                    value={newEvent.start_time || ''}
                    onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    placeholder="Ex: 20:00 or 8:00 PM"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex gap-1">
                    {['10:00', '18:00', '20:00', '21:30'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, start_time: t })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-600 cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">End Time</label>
                  <input
                    value={newEvent.end_time || ''}
                    onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    placeholder="Ex: 23:00 or 11:00 PM"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex gap-1">
                    {['14:00', '22:00', '23:30', '02:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, end_time: t })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-600 cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location & GPS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Venue & Address in Valencia *
                  </label>
                  <button
                    type="button"
                    disabled={isGeocoding}
                    onClick={handleGeocodeAddress}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer disabled:opacity-50"
                  >
                    {isGeocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    <span>Geocode Lat/Lng</span>
                  </button>
                </div>
                <input
                  required
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Ex: Palau de les Arts Reina Sofía, Valencia"
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 font-medium text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={newEvent.lat || ''}
                      onChange={e => setNewEvent({ ...newEvent, lat: parseFloat(e.target.value) || 0 })}
                      placeholder="39.459..."
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      value={newEvent.lng || ''}
                      onChange={e => setNewEvent({ ...newEvent, lng: parseFloat(e.target.value) || 0 })}
                      placeholder="-0.353..."
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Mini Map preview if coordinates exist */}
                {Boolean(newEvent.lat && newEvent.lng && newEvent.lat !== 0 && newEvent.lng !== 0) && (
                  <div className="h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative">
                    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                      <Map
                        defaultCenter={{ lat: Number(newEvent.lat), lng: Number(newEvent.lng) }}
                        center={{ lat: Number(newEvent.lat), lng: Number(newEvent.lng) }}
                        defaultZoom={15}
                        zoom={15}
                        mapId="ADMIN_EVENT_EDIT_MAP"
                        disableDefaultUI
                      >
                        <AdvancedMarker position={{ lat: Number(newEvent.lat), lng: Number(newEvent.lng) }}>
                          <Pin background="#10B981" glyphColor="#ffffff" borderColor="#047857" />
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Poster & Structured Description */}
          <div className="lg:col-span-5 space-y-6">
            {/* Poster / Image */}
            <div className="bg-white p-5 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Camera className="w-4 h-4 text-emerald-500" />
                2. Event Poster & Cover
              </h4>

              <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 group flex items-center justify-center">
                {previewUrl || newEvent.image ? (
                  <img
                    src={previewUrl || newEvent.image}
                    alt="Poster preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400 font-semibold">No poster selected</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 rounded-xl font-bold text-xs shadow hover:bg-slate-50 cursor-pointer"
                  >
                    Upload File
                  </button>
                  {(previewUrl || newEvent.image) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                        setNewEvent({ ...newEvent, image: '' });
                      }}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-xl font-bold text-xs shadow hover:bg-rose-600 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="hidden"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Image Web URL</label>
                <input
                  value={newEvent.image}
                  onChange={e => {
                    setNewEvent({ ...newEvent, image: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 font-medium text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Quick Valencia presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Valencia Presets:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {VALENCIA_PHOTO_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewEvent({ ...newEvent, image: p.url });
                        setPreviewUrl(p.url);
                        setSelectedFile(null);
                      }}
                      className="group relative h-12 rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer"
                      title={p.name}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <span className="absolute inset-0 bg-slate-900/40 text-white text-[8px] font-bold flex items-center justify-center text-center p-0.5 leading-tight">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description & Structured 4 Sections */}
            <div className="bg-white p-5 sm:p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  3. Event Content & Sections
                </h4>
                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setEditorDescriptionMode('structured')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      editorDescriptionMode === 'structured' ? "bg-white text-emerald-700 shadow-2xs font-extrabold" : "text-slate-500"
                    )}
                  >
                    Structured (4 Tabs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorDescriptionMode('raw')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                      editorDescriptionMode === 'raw' ? "bg-white text-emerald-700 shadow-2xs font-extrabold" : "text-slate-500"
                    )}
                  >
                    Raw Markdown
                  </button>
                </div>
              </div>

              {editorDescriptionMode === 'structured' ? (
                <div className="space-y-4">
                  {/* Section 1 */}
                  <div className="space-y-1.5 bg-sky-50/40 p-3 rounded-2xl border border-sky-100">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-extrabold text-brand-blue uppercase">
                        1. What can you expect?
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-white/70 p-1 rounded-lg border border-sky-100/60">
                      {['✨', '🎨', '🎶', '🎭', '🍷', '🥘', '🌟', '💃', '💻', '🏃', '🛠️'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const updated = editExpect ? `${editExpect} ${emoji} ` : `${emoji} `;
                            setEditExpect(updated);
                            syncStructuredToDescription(updated, editPerfectFor, editGoodToKnow, editMoreInfo);
                          }}
                          className="px-1 hover:bg-slate-100 rounded text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={editExpect}
                      onChange={e => {
                        setEditExpect(e.target.value);
                        syncStructuredToDescription(e.target.value, editPerfectFor, editGoodToKnow, editMoreInfo);
                      }}
                      placeholder="- 🎶 Main activities and highlights&#10;- 🍷 Key features of the experience&#10;- 🌟 Unique selling points"
                      className="w-full bg-white border border-sky-200/60 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                    />
                  </div>

                  {/* Section 2 */}
                  <div className="space-y-1.5 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-extrabold text-emerald-800 uppercase">
                        2. Perfect for
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-white/70 p-1 rounded-lg border border-emerald-100/60">
                      {['👥', '🎯', '👨‍👩‍👧', '🌍', '🍷', '🎶', '🎨', '💑', '🎓', '🤝'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const updated = editPerfectFor ? `${editPerfectFor} ${emoji} ` : `${emoji} `;
                            setEditPerfectFor(updated);
                            syncStructuredToDescription(editExpect, updated, editGoodToKnow, editMoreInfo);
                          }}
                          className="px-1 hover:bg-emerald-100/50 rounded text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editPerfectFor}
                      onChange={e => {
                        setEditPerfectFor(e.target.value);
                        syncStructuredToDescription(editExpect, e.target.value, editGoodToKnow, editMoreInfo);
                      }}
                      placeholder="- 👥 Target audience and community groups&#10;- 🎯 People interested in this type of activity"
                      className="w-full bg-white border border-emerald-200/60 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                    />
                  </div>

                  {/* Section 3 */}
                  <div className="space-y-1.5 bg-amber-50/40 p-3 rounded-2xl border border-amber-100">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-extrabold text-amber-800 uppercase">
                        3. Good to know (tips)
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-white/70 p-1 rounded-lg border border-amber-100">
                      {['💡', '🎟️', '⏰', '🚇', '🅿️', '💶', '♿', '☀️', '📱'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const updated = editGoodToKnow ? `${editGoodToKnow} ${emoji} ` : `${emoji} `;
                            setEditGoodToKnow(updated);
                            syncStructuredToDescription(editExpect, editPerfectFor, updated, editMoreInfo);
                          }}
                          className="px-1 hover:bg-amber-100/50 rounded text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editGoodToKnow}
                      onChange={e => {
                        setEditGoodToKnow(e.target.value);
                        syncStructuredToDescription(editExpect, editPerfectFor, e.target.value, editMoreInfo);
                      }}
                      placeholder="- 🎟️ Early bird tickets available until Friday&#10;- 🚇 Metro Line 3 to Alameda"
                      className="w-full bg-white border border-amber-200/60 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    />
                  </div>

                  {/* Section 4 */}
                  <div className="space-y-1.5 bg-teal-50/40 p-3 rounded-2xl border border-teal-100">
                    <div className="flex items-center justify-between gap-1">
                      <label className="text-[11px] font-extrabold text-teal-800 uppercase">
                        4. More information (links & tickets)
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-white/70 p-1 rounded-lg border border-teal-100">
                      {['🔗', '🌐', '🎟️', '📍', '📱', '📧', '📋', '⭐'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const updated = editMoreInfo ? `${editMoreInfo} ${emoji} ` : `${emoji} `;
                            setEditMoreInfo(updated);
                            syncStructuredToDescription(editExpect, editPerfectFor, editGoodToKnow, updated);
                          }}
                          className="px-1 hover:bg-teal-100/50 rounded text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editMoreInfo}
                      onChange={e => {
                        setEditMoreInfo(e.target.value);
                        syncStructuredToDescription(editExpect, editPerfectFor, editGoodToKnow, e.target.value);
                      }}
                      placeholder="- 🔗 Official Website: https://...&#10;- 🎟️ Tickets: https://..."
                      className="w-full bg-white border border-teal-200/60 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    rows={12}
                    value={newEvent.description || ''}
                    onChange={e => {
                      setNewEvent({ ...newEvent, description: e.target.value });
                      const parsed = parseDescriptionSections(e.target.value);
                      setEditExpect(parsed.expect);
                      setEditPerfectFor(parsed.perfectFor);
                      setEditGoodToKnow(parsed.goodToKnow);
                      setEditMoreInfo(parsed.moreInfo);
                    }}
                    placeholder="Raw Markdown content..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: ALL EVENTS DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Events</p>
            <p className="text-xl sm:text-2xl font-extrabold font-display text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-brand-blue flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
            <p className="text-xl sm:text-2xl font-extrabold font-display text-brand-blue">{stats.upcoming}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Multi-Day</p>
            <p className="text-xl sm:text-2xl font-extrabold font-display text-amber-600">{stats.multiDay}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Categories</p>
            <p className="text-xl sm:text-2xl font-extrabold font-display text-purple-600">{stats.uniqueCategories}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Filters, Sort, View Mode */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events by title, venue, keywords..."
              className="w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-2xl pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeline filter + Sort + View */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Timeline Filter */}
            <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setTimelineFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  timelineFilter === 'all' ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('upcoming')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  timelineFilter === 'upcoming' ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('past')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  timelineFilter === 'past' ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Past
              </button>
            </div>

            {/* Sort Selector */}
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="h-10 bg-slate-50 border border-slate-200/80 rounded-2xl px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 cursor-pointer"
            >
              <option value="date_asc">📅 Date: Soonest First</option>
              <option value="date_desc">📅 Date: Latest First</option>
              <option value="title_asc">🔤 Title: A to Z</option>
              <option value="recent">⚡ Recently Added</option>
            </select>

            {/* View Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-emerald-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
                )}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-2 rounded-xl transition-all cursor-pointer",
                  viewMode === 'table' ? "bg-white text-emerald-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills with count */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
          {COMMON_CATEGORIES.map(cat => {
            const count = categoryCounts[cat.value] || 0;
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0",
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                )}
              >
                <span>{cat.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bulk Actions Banner if items selected */}
        {selectedEventIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-emerald-900">
                {selectedEventIds.length} of {filteredEvents.length} events selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200 hover:bg-emerald-100/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected</span>
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Selected</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEventIds([])}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events Presentation: Grid or Table */}
      {filteredEvents.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map(event => {
              const isSelected = selectedEventIds.includes(event.id);
              const isSingleDay = !event.end_date || isSameDay(event.start_date || event.date, event.end_date);
              const hasGps = Boolean(event.coordinates?.lat && event.coordinates?.lng);
              const isDeleting = deletingId === event.id;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "bg-white rounded-3xl border transition-all overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md",
                    isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  {/* Top Image & Badges */}
                  <div>
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img
                        src={event.image_url || event.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Select checkbox */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventIds(prev =>
                            prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                          );
                        }}
                        className="absolute top-3 left-3 p-1 rounded-lg bg-white/90 backdrop-blur-md border border-white/40 cursor-pointer transition-transform active:scale-95 shadow-sm"
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>

                      {/* Category Badge */}
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-800 font-extrabold text-[10px] uppercase tracking-widest rounded-full shadow-sm">
                          {getCategoryWithEmoji(event.category || 'Event')}
                        </span>
                      </div>

                      {/* Date Badge */}
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-sm text-center">
                        <p className="text-[11px] font-extrabold text-brand-blue uppercase leading-tight">
                          {event.start_date || event.date || 'UPCOMING'}
                        </p>
                        {!isSingleDay && event.end_date && (
                          <>
                            <p className="text-[8px] text-slate-400 font-medium leading-none my-0.5">to</p>
                            <p className="text-[11px] font-extrabold text-brand-blue uppercase leading-tight">
                              {event.end_date}
                            </p>
                          </>
                        )}
                      </div>

                      {/* GPS indicator */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-white text-[10px] font-medium">
                        <span className={cn("w-2 h-2 rounded-full", hasGps ? "bg-emerald-400" : "bg-amber-400")} />
                        <span>{hasGps ? 'GPS Pin' : 'No GPS'}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h4 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                        {event.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.location || 'Valencia, Spain'}</span>
                        </div>
                        {(event.start_time || event.time) && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                          </div>
                        )}
                        {(event.price || event.ticket_url || event.is_free !== undefined) && (
                          <div className="flex items-center gap-2">
                            <Ticket className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <span className="font-semibold text-slate-700">
                              {event.price || (event.is_free ? 'Free' : 'Tickets Required')}
                            </span>
                            {event.ticket_url && (
                              <a
                                href={event.ticket_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[10px] text-orange-600 hover:text-orange-700 underline flex items-center gap-0.5 font-bold"
                              >
                                Ticket Link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                          {event.description.replace(/###.*?\n/g, '').replace(/[#*`_]/g, '')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModalEvent(event)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Preview</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateEvent(event)}
                        className="p-2 text-slate-500 hover:text-brand-blue hover:bg-white rounded-xl transition-colors cursor-pointer"
                        title="Duplicate this event"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(event)}
                        className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteEvent(event)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete event"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.length === filteredEvents.length && filteredEvents.length > 0}
                        onChange={e => {
                          if (e.target.checked) setSelectedEventIds(filteredEvents.map(ev => ev.id));
                          else setSelectedEventIds([]);
                        }}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Event</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Venue</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredEvents.map(event => {
                    const isSelected = selectedEventIds.includes(event.id);
                    const isSingleDay = !event.end_date || isSameDay(event.start_date || event.date, event.end_date);
                    const isDeleting = deletingId === event.id;

                    return (
                      <tr key={event.id} className={cn("hover:bg-slate-50/70 transition-colors", isSelected && "bg-emerald-50/30")}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedEventIds(prev =>
                                prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                              );
                            }}
                            className="rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <img
                              src={event.image_url || event.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
                              alt=""
                              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-100 shadow-2xs"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-slate-900 leading-snug line-clamp-1">{event.title}</p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {event.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-full">
                            {getCategoryWithEmoji(event.category || 'Event')}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-bold text-brand-blue">
                              {event.start_date || event.date}
                              {!isSingleDay && event.end_date && ` - ${event.end_date}`}
                            </p>
                            {(event.start_time || event.time) && (
                              <p className="text-[11px] text-slate-400">{event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ''}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="truncate max-w-xs">{event.location || 'Valencia'}</p>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewModalEvent(event)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateEvent(event)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(event)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteEvent(event)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer disabled:opacity-50"
                              title="Delete"
                            >
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h4 className="text-base font-bold text-slate-900">No events found</h4>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search terms or category filters.'
                : 'No community events published yet. Add one manually or launch the AI Agent!'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingEventId(null);
                setNewEvent({
                  title: '',
                  start_date: '',
                  end_date: '',
                  start_time: '',
                  end_time: '',
                  location: 'Valencia, Spain',
                  category: 'Culture',
                  description: '',
                  image: '',
                  lat: 39.4699,
                  lng: -0.3763
                });
                setSelectedFile(null);
                setPreviewUrl(null);
                setActiveTab('add_event');
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai_event_search')}
              className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>AI Web Discovery</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Preview Modal for Any Event */}
      {previewModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header with Event Poster */}
            <div className="relative h-64 shrink-0 bg-slate-100 overflow-hidden">
              <img
                src={previewModalEvent.image_url || previewModalEvent.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
                alt={previewModalEvent.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <button
                type="button"
                onClick={() => setPreviewModalEvent(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/95 backdrop-blur-md text-slate-900 font-extrabold text-[10px] uppercase tracking-widest rounded-full shadow-sm">
                  {getCategoryWithEmoji(previewModalEvent.category || 'Event')}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                  {previewModalEvent.start_date || previewModalEvent.date}
                  {previewModalEvent.end_date && !isSameDay(previewModalEvent.start_date || previewModalEvent.date, previewModalEvent.end_date) && ` - ${previewModalEvent.end_date}`}
                  {(previewModalEvent.start_time || previewModalEvent.time) ? ` • ${previewModalEvent.start_time || previewModalEvent.time}` : ''}
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold font-display leading-tight drop-shadow-sm">
                  {previewModalEvent.title}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm">
              <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs">{previewModalEvent.location || 'Valencia, Spain'}</span>
              </div>

              {/* Description Sections */}
              {(() => {
                const raw = previewModalEvent.description || '';
                const { expect, perfectFor, goodToKnow, moreInfo } = parseDescriptionSections(raw);
                const hasSections = Boolean(expect || perfectFor || goodToKnow || moreInfo);

                if (!hasSections) {
                  return (
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-line">{raw || 'No description provided.'}</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {expect && (
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100 space-y-1.5">
                        <h5 className="font-bold text-brand-blue text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                          1. What can you expect?
                        </h5>
                        <div className="text-xs leading-relaxed text-slate-700">
                          {renderFormattedContent(expect, "font-bold text-slate-900 bg-white/80 px-1 rounded")}
                        </div>
                      </div>
                    )}

                    {perfectFor && (
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
                        <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          2. Perfect for
                        </h5>
                        <div className="text-xs leading-relaxed text-slate-700">
                          {renderFormattedContent(perfectFor, "font-bold text-slate-900 bg-white/80 px-1 rounded")}
                        </div>
                      </div>
                    )}

                    {goodToKnow && (
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-1.5">
                        <h5 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600" />
                          3. Good to know (tips)
                        </h5>
                        <div className="text-xs leading-relaxed text-slate-700">
                          {renderFormattedContent(goodToKnow, "font-bold text-slate-900 bg-white/80 px-1 rounded")}
                        </div>
                      </div>
                    )}

                    {moreInfo && (
                      <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-1.5">
                        <h5 className="font-bold text-teal-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                          4. More information
                        </h5>
                        <div className="text-xs leading-relaxed text-slate-700">
                          {renderFormattedContent(moreInfo, "font-bold text-slate-900 bg-white/80 px-1 rounded")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const ev = previewModalEvent;
                  setPreviewModalEvent(null);
                  handleDuplicateEvent(ev);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewModalEvent(null)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ev = previewModalEvent;
                    setPreviewModalEvent(null);
                    handleStartEdit(ev);
                  }}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit This Event</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
