import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  Search,
  Loader2,
  Check,
  Plus,
  ExternalLink,
  Globe,
  MapPin,
  Clock,
  Calendar,
  X,
  ArrowRight,
  Filter,
  ChevronDown,
  Layers,
  Map as MapIcon,
  Building2,
  Compass,
  Edit3,
  Save,
  HelpCircle,
  FileText,
  Tag,
  Info,
  Database,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  Ticket
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { eventService, isSameDay } from '../services/eventService';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export interface GroundedEvent {
  id: string;
  title: string;
  date?: string;
  start_date?: string;
  end_date?: string | null;
  time?: string;
  start_time?: string;
  end_time?: string | null;
  location: string;
  category: string;
  image: string;
  description: string;
  coordinates?: { lat: number; lng: number };
  verified_real?: boolean;
  ticket_url?: string;
  price?: string;
  is_free?: boolean;
  sources?: { title: string; url: string }[];
  published_to_events?: boolean;
  created_at?: string;
}

interface AdminAiEventSearchProps {
  onRefetchEvents?: () => Promise<void>;
  setMsg?: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const MONTH_OPTIONS = [
  "October 2026",
  "September 2026",
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
  "March 2027",
  "All Months / Flexible"
];

const SEARCH_CATEGORIES = [
  { id: "All Categories", name: "✨ All Categories", icon: "✨", query: "Top popular events, concerts, exhibitions, and shows in Valencia" },
  { id: "Art", name: "🎨 Art & Museums", icon: "🎨", query: "Major art museum exhibitions at Bombas Gens, IVAM, CAIXAFORUM, and MuVIM in Valencia" },
  { id: "Theater", name: "🎭 Theater & Performing Arts", icon: "🎭", query: "Theater plays, opera, dance performances, and musicals at Palau de les Arts, Teatro Principal, and Teatro Olympia in Valencia" },
  { id: "Music", name: "🎵 Concerts & Live Music", icon: "🎵", query: "High-profile live music concerts, classical symphonies, jazz shows, and music festivals in Valencia" },
  { id: "Gastronomy", name: "🍷 Gastronomy & Wine Fairs", icon: "🍷", query: "Food festivals, wine tastings, culinary markets, and gastronomy fairs in Valencia" },
  { id: "Tech", name: "💻 Tech, Business & Innovation", icon: "💻", query: "Tech summits, startup conferences, AI forums, and innovation summits in Valencia" },
  { id: "Community", name: "👥 Expat & Community Meetups", icon: "👥", query: "Expat networking meetups, community gatherings, cultural exchanges, and social events in Valencia" },
  { id: "Sports", name: "⚽ Sports & Outdoor", icon: "⚽", query: "Marathons, running races, outdoor fitness events, sports tournaments, and Turia garden activities in Valencia" },
  { id: "Workshops", name: "🛠️ Workshops & Masterclasses", icon: "🛠️", query: "Creative art workshops, cooking masterclasses, language exchanges, and educational seminars in Valencia" }
];

const CATEGORY_OPTIONS = [
  "Art",
  "Theater",
  "Music",
  "Culture",
  "Tech",
  "Gastronomy",
  "Community",
  "Sports",
  "Workshops"
];

const PRESET_PROMPTS = [
  { label: '🎭 Arts, Opera & Theater', query: 'Major art exhibitions, theater plays, and opera performances at Palau de les Arts, IVAM, and Teatro Principal in Valencia' },
  { label: '🎻 Concerts & Live Shows', query: 'High-profile live music concerts, classical shows, and music festivals in Valencia' },
  { label: '🚀 Tech Summits & Expats', query: 'Tech summits, business innovation conferences, and expat networking meetups in Valencia' },
  { label: '🍷 Gastronomy & Wine Fairs', query: 'Food festivals, wine tastings, and culinary workshops in Valencia' },
  { label: '🏛️ Museums & Cultural Expos', query: 'Must-see art museum exhibitions at Bombas Gens, MuVIM, and CAIXAFORUM Valencia' },
  { label: '🌳 Outdoor, Sports & Turia', query: 'Outdoor festivals, running events, and open-air activities in Turia Gardens Valencia' }
];

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function enrichSectionTextWithEmojis(text: string, sectionType: 'expect' | 'perfectFor' | 'goodToKnow' | 'moreInfo'): string {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (EMOJI_REGEX.test(trimmed)) {
      return line;
    }

    const bulletMatch = line.match(/^(\s*[-*•]\s*)(.*)$/);
    const prefix = bulletMatch ? bulletMatch[1] : '';
    const body = bulletMatch ? bulletMatch[2] : line;
    const lower = body.toLowerCase();

    let emoji = '✨';

    if (sectionType === 'expect') {
      if (/music|concert|jazz|song|band|singer|orchestra|dj|acoustic/i.test(lower)) emoji = '🎶';
      else if (/art|paint|sculpture|exhibit|gallery|visual|museum|photo/i.test(lower)) emoji = '🎨';
      else if (/theat|drama|stage|actor|play|comedy|performance/i.test(lower)) emoji = '🎭';
      else if (/food|wine|tapas|gastro|tasting|beer|dinner|lunch|chef|culinary/i.test(lower)) emoji = '🍷';
      else if (/dance|flamenco|ballet/i.test(lower)) emoji = '💃';
      else if (/tech|digital|code|innovation|startup|ai|screen/i.test(lower)) emoji = '💻';
      else if (/sport|run|match|race|fitness|yoga|marathon/i.test(lower)) emoji = '🏃';
      else if (/workshop|class|learn|craft|talk|conference/i.test(lower)) emoji = '🛠️';
      else if (/garden|outdoor|park|beach|terrace|sunset/i.test(lower)) emoji = '🌅';
      else emoji = '✨';
    } else if (sectionType === 'perfectFor') {
      if (/family|child|kid|parent|baby/i.test(lower)) emoji = '👨‍👩‍👧';
      else if (/expat|international|newcomer|english|nomad|tourist/i.test(lower)) emoji = '🌍';
      else if (/music|concert|live music/i.test(lower)) emoji = '🎶';
      else if (/art|design|creative/i.test(lower)) emoji = '🎨';
      else if (/food|wine|tasting|foodie/i.test(lower)) emoji = '🍷';
      else if (/couple|date|romantic/i.test(lower)) emoji = '💑';
      else if (/student|youth|teen/i.test(lower)) emoji = '🎓';
      else if (/sport|runner|active|athletic/i.test(lower)) emoji = '👟';
      else emoji = '👥';
    } else if (sectionType === 'goodToKnow') {
      if (/ticket|price|fee|cost|admission|free|gratis|entry|€|euro/i.test(lower)) emoji = '🎟️';
      else if (/metro|bus|transport|train|tram|station|bike|valenbisi/i.test(lower)) emoji = '🚇';
      else if (/time|hour|door|schedule|start|duration|arrive|early/i.test(lower)) emoji = '⏰';
      else if (/park|car|garage|vehicle/i.test(lower)) emoji = '🅿️';
      else if (/wheelchair|access|reduced mobility|disabilit/i.test(lower)) emoji = '♿';
      else if (/dress|wear|clothes|jacket/i.test(lower)) emoji = '👔';
      else if (/language|english|spanish|valencian|audio/i.test(lower)) emoji = '🗣️';
      else if (/weather|rain|sun|outdoor|indoor/i.test(lower)) emoji = '☀️';
      else emoji = '💡';
    } else if (sectionType === 'moreInfo') {
      if (/ticket|book|buy|reserve|entry/i.test(lower)) emoji = '🎟️';
      else if (/site|web|http|url|official|link|page/i.test(lower)) emoji = '🌐';
      else if (/phone|call|contact|email|whatsapp/i.test(lower)) emoji = '📱';
      else if (/location|address|venue|map|google/i.test(lower)) emoji = '📍';
      else emoji = '🔗';
    }

    if (bulletMatch) {
      return `${prefix}${emoji} ${body}`;
    } else {
      return `${emoji} ${line}`;
    }
  }).join('\n');
}

export function parseDescriptionSections(description: string) {
  let expect = '';
  let perfectFor = '';
  let goodToKnow = '';
  let moreInfo = '';

  if (!description) return { expect, perfectFor, goodToKnow, moreInfo };

  const expectMatch = description.match(/\*\*(?:[✨\s]*)?What can you expect\?\*\*\s*([\s\S]*?)(?=\*\*(?:[🎯\s]*)?Perfect for\*\*|\*\*(?:[💡\s]*)?Good to know \(tips\)\*\*|\*\*(?:[🔗\s]*)?More information\*\*|$)/i);
  const perfectMatch = description.match(/\*\*(?:[🎯\s]*)?Perfect for\*\*\s*([\s\S]*?)(?=\*\*(?:[💡\s]*)?Good to know \(tips\)\*\*|\*\*(?:[🔗\s]*)?More information\*\*|$)/i);
  const goodMatch = description.match(/\*\*(?:[💡\s]*)?Good to know \(tips\)\*\*\s*([\s\S]*?)(?=\*\*(?:[🔗\s]*)?More information\*\*|$)/i);
  const infoMatch = description.match(/\*\*(?:[🔗\s]*)?More information\*\*\s*([\s\S]*?)$/i);

  if (expectMatch) expect = enrichSectionTextWithEmojis(expectMatch[1].trim(), 'expect');
  if (perfectMatch) perfectFor = enrichSectionTextWithEmojis(perfectMatch[1].trim(), 'perfectFor');
  if (goodMatch) goodToKnow = enrichSectionTextWithEmojis(goodMatch[1].trim(), 'goodToKnow');
  if (infoMatch) moreInfo = enrichSectionTextWithEmojis(infoMatch[1].trim(), 'moreInfo');

  if (!expect && !perfectFor && !goodToKnow && !moreInfo) {
    expect = enrichSectionTextWithEmojis(description.trim(), 'expect');
  }

  return { expect, perfectFor, goodToKnow, moreInfo };
}

export function getCategoryWithEmoji(cat: string) {
  if (!cat) return "✨ Culture";
  const lower = cat.toLowerCase();
  if (lower.includes("art")) return "🎨 " + cat;
  if (lower.includes("theater") || lower.includes("theatre")) return "🎭 " + cat;
  if (lower.includes("music") || lower.includes("concert")) return "🎵 " + cat;
  if (lower.includes("tech") || lower.includes("digital")) return "💻 " + cat;
  if (lower.includes("gastro") || lower.includes("food") || lower.includes("wine")) return "🍷 " + cat;
  if (lower.includes("community") || lower.includes("social")) return "👥 " + cat;
  if (lower.includes("sport") || lower.includes("run")) return "⚽ " + cat;
  if (lower.includes("workshop") || lower.includes("masterclass")) return "🛠️ " + cat;
  if (lower.includes("out") || lower.includes("nature") || lower.includes("turia") || lower.includes("park")) return "🌳 " + cat;
  if (lower.includes("fam") || lower.includes("kid")) return "👨‍👩‍👧 " + cat;
  if (lower.includes("fest") || lower.includes("fair")) return "🌟 " + cat;
  return "🏛️ " + cat;
}

export function renderFormattedContent(text: string, defaultBoldClass = "font-extrabold text-slate-950") {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();
    if (!cleanLine) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    // Handle header lines (### Title, ## Title, # Title)
    let isHeader = false;
    if (cleanLine.startsWith('#')) {
      isHeader = true;
      cleanLine = cleanLine.replace(/^#{1,6}\s*/, '');
    }

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    function parseBoldParts(raw: string): React.ReactNode[] {
      const boldParts: React.ReactNode[] = [];
      const boldRegex = /(\*\*|__)(.*?)\1/g;
      let bMatch;
      let lastBIndex = 0;

      while ((bMatch = boldRegex.exec(raw)) !== null) {
        if (bMatch.index > lastBIndex) {
          boldParts.push(raw.substring(lastBIndex, bMatch.index));
        }
        boldParts.push(
          <strong key={`b-${lineIdx}-${bMatch.index}`} className={defaultBoldClass}>
            {bMatch[2]}
          </strong>
        );
        lastBIndex = boldRegex.lastIndex;
      }
      if (lastBIndex < raw.length) {
        boldParts.push(raw.substring(lastBIndex));
      }
      return boldParts;
    }

    while ((match = linkRegex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...parseBoldParts(cleanLine.substring(lastIndex, match.index)));
      }

      if (match[1] && match[2]) {
        const title = match[1];
        const url = match[2];
        parts.push(
          <a
            key={`link-${lineIdx}-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline font-bold inline-flex items-center gap-1 mx-0.5 bg-brand-blue/10 px-2 py-0.5 rounded text-xs transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{title}</span>
            <ExternalLink className="w-3 h-3 shrink-0 inline" />
          </a>
        );
      } else if (match[3]) {
        const rawUrl = match[3];
        parts.push(
          <a
            key={`rawlink-${lineIdx}-${match.index}`}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline font-bold inline-flex items-center gap-1 mx-0.5 break-all transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{rawUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0 inline" />
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(...parseBoldParts(line.substring(lastIndex)));
    }

    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
}

export function SimpleMarkdown({ children }: { children: string }) {
  if (!children) return null;

  const parsed = parseDescriptionSections(children);
  const hasStructuredSections = parsed.expect || parsed.perfectFor || parsed.goodToKnow || parsed.moreInfo;

  if (hasStructuredSections) {
    return (
      <div className="space-y-3.5 text-xs sm:text-sm text-slate-700">
        {parsed.expect && (
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-brand-blue text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>✨ What can you expect?</span>
            </div>
            <div className="leading-relaxed text-slate-700 font-normal">
              {renderFormattedContent(parsed.expect, "font-bold text-slate-950 bg-slate-200/60 px-1 py-0.5 rounded")}
            </div>
          </div>
        )}

        {parsed.perfectFor && (
          <div className="space-y-1.5 bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>🎯 Perfect for</span>
            </div>
            <div className="leading-relaxed text-emerald-950 font-normal">
              {renderFormattedContent(parsed.perfectFor, "font-bold text-emerald-950 bg-emerald-200/60 px-1 py-0.5 rounded")}
            </div>
          </div>
        )}

        {parsed.goodToKnow && (
          <div className="space-y-1.5 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>💡 Good to know (tips)</span>
            </div>
            <div className="leading-relaxed text-amber-950 font-normal">
              {renderFormattedContent(parsed.goodToKnow, "font-bold text-amber-950 bg-amber-200/60 px-1 py-0.5 rounded")}
            </div>
          </div>
        )}

        {parsed.moreInfo && (
          <div className="space-y-1.5 bg-sky-50/60 p-3.5 rounded-2xl border border-sky-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-sky-900 text-xs uppercase tracking-wider">
              <ExternalLink className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>🔗 More information</span>
            </div>
            <div className="leading-relaxed text-sky-950 font-normal">
              {renderFormattedContent(parsed.moreInfo, "font-bold text-sky-950 bg-sky-200/60 px-1 py-0.5 rounded")}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-slate-700 leading-relaxed text-xs sm:text-sm">
      {renderFormattedContent(children, "font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded")}
    </div>
  );
}

export const AdminAiEventSearch: React.FC<AdminAiEventSearchProps> = ({ onRefetchEvents, setMsg }) => {
  const [activeSubTab, setActiveSubTab] = useState<'live_search' | 'db_repository' | 'published_events'>('live_search');

  // Search console state
  const [aiQuery, setAiQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState('');
  const [discoveredEvents, setDiscoveredEvents] = useState<GroundedEvent[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [hideSavedInDb, setHideSavedInDb] = useState(true);

  // Repository tab state (ai_discovered_events table)
  const [dbDiscoveredEvents, setDbDiscoveredEvents] = useState<GroundedEvent[]>([]);
  const [isLoadingRepository, setIsLoadingRepository] = useState(false);
  const [repoFilter, setRepoFilter] = useState<'all' | 'unpublished' | 'published'>('unpublished');
  const [repoCategoryFilter, setRepoCategoryFilter] = useState('All');
  const [repoSearch, setRepoSearch] = useState('');

  // Published Events tab state (events table)
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [isLoadingPublished, setIsLoadingPublished] = useState(false);
  const [publishedSearch, setPublishedSearch] = useState('');
  const [publishedCategoryFilter, setPublishedCategoryFilter] = useState('All');
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);

  const fetchPublishedEvents = async () => {
    setIsLoadingPublished(true);
    try {
      const items = await eventService.getEvents();
      setPublishedEvents(items || []);
    } catch (err) {
      console.error('Error fetching published events:', err);
    } finally {
      setIsLoadingPublished(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'published_events') {
      fetchPublishedEvents();
    }
  }, [activeSubTab]);

  useEffect(() => {
    fetchPublishedEvents();
  }, []);

  const handleDeletePublished = async (eventOrId: any, titleParam?: string) => {
    let pubEvent: any = null;
    let title = '';
    let eventId = '';

    if (typeof eventOrId === 'object' && eventOrId !== null) {
      eventId = eventOrId.id ? String(eventOrId.id) : '';
      title = eventOrId.title || '';
      pubEvent = publishedEvents.find(p => 
        (p.id && eventId && String(p.id) === eventId) || 
        (p.title && title && p.title.toLowerCase().trim() === title.toLowerCase().trim())
      ) || eventOrId;
      if (!title) title = pubEvent.title || 'Event';
    } else {
      eventId = String(eventOrId);
      pubEvent = publishedEvents.find(p => String(p.id) === eventId) || { id: eventId, title: titleParam || '' };
      title = titleParam || pubEvent.title || 'Event';
    }

    const unpublishKey = eventId || title;
    setUnpublishingId(unpublishKey);

    try {
      // Gather all possible IDs (from pubEvent and eventOrId)
      const idsToDelete = Array.from(new Set([pubEvent.id, eventId].filter(Boolean)));
      for (const id of idsToDelete) {
        await eventService.deleteEvent(id, title);
      }
      if (title) {
        await eventService.deleteEvent(undefined, title);
      }

      await eventService.unmarkDiscoveredAsPublished(title, pubEvent);

      // Instantly remove from published list
      setPublishedEvents(prev => prev.filter(item => 
        !idsToDelete.includes(item.id) && 
        item.title.toLowerCase().trim() !== title.toLowerCase().trim()
      ));

      // Reset saved state for all related IDs
      setSavedEventIds(prev => {
        const next = { ...prev };
        idsToDelete.forEach(id => { next[id] = false; });
        return next;
      });

      // Update repo event status to unpublished
      setDbDiscoveredEvents(prev => prev.map(e => 
        (idsToDelete.includes(e.id) || (e.title && title && e.title.toLowerCase().trim() === title.toLowerCase().trim()))
          ? { ...e, published_to_events: false } 
          : e
      ));

      await fetchDbRepository();
      await fetchPublishedEvents();
      if (onRefetchEvents) await onRefetchEvents();

      setMsg?.({ type: 'success', text: `Event "${title}" unpublished and moved back to repository!` });
    } catch (err: any) {
      console.error('Error unpublishing event:', err);
      setMsg?.({ type: 'error', text: 'Failed to unpublish event: ' + (err.message || 'Unknown error') });
    } finally {
      setUnpublishingId(null);
    }
  };

  const filteredPublishedEvents = publishedEvents.filter(ev => {
    if (publishedCategoryFilter !== 'All' && ev.category) {
      if (!ev.category.toLowerCase().includes(publishedCategoryFilter.toLowerCase())) return false;
    }
    if (publishedSearch.trim()) {
      const q = publishedSearch.toLowerCase();
      const matchTitle = (ev.title || '').toLowerCase().includes(q);
      const matchLoc = (ev.location || '').toLowerCase().includes(q);
      const matchCat = (ev.category || '').toLowerCase().includes(q);
      return matchTitle || matchLoc || matchCat;
    }
    return true;
  });

  // Edit Modal State
  const [editingEvent, setEditingEvent] = useState<GroundedEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editTicketUrl, setEditTicketUrl] = useState('');
  const [editIsFree, setEditIsFree] = useState(true);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editExpect, setEditExpect] = useState('');
  const [editPerfectFor, setEditPerfectFor] = useState('');
  const [editGoodToKnow, setEditGoodToKnow] = useState('');
  const [editMoreInfo, setEditMoreInfo] = useState('');

  const fetchDbRepository = async () => {
    setIsLoadingRepository(true);
    try {
      const items = await eventService.getDiscoveredEvents();
      setDbDiscoveredEvents(items || []);
    } catch (err) {
      console.error('Error fetching ai_discovered_events repository:', err);
    } finally {
      setIsLoadingRepository(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'db_repository') {
      fetchDbRepository();
    }
  }, [activeSubTab]);

  const openEditModal = (ev: GroundedEvent) => {
    setEditingEvent(ev);
    setEditTitle(ev.title || '');
    setEditCategory(ev.category || 'Culture');
    setEditStartDate(ev.start_date || ev.date || '');
    setEditEndDate(ev.end_date || '');
    setEditStartTime(ev.start_time || ev.time || '');
    setEditEndTime(ev.end_time || '');
    setEditLocation(ev.location || '');
    setEditImage(ev.image || '');
    setEditWebsiteUrl(ev.sources?.[0]?.url || '');
    setEditPrice(ev.price || '');
    setEditTicketUrl(ev.ticket_url || ev.sources?.[0]?.url || '');
    setEditIsFree(ev.is_free !== undefined ? ev.is_free : true);
    setEditLat(ev.coordinates?.lat ? String(ev.coordinates.lat) : '39.4699');
    setEditLng(ev.coordinates?.lng ? String(ev.coordinates.lng) : '-0.3763');

    const parsed = parseDescriptionSections(ev.description || '');
    setEditExpect(parsed.expect || '');
    setEditPerfectFor(parsed.perfectFor || '');
    setEditGoodToKnow(parsed.goodToKnow || '');
    setEditMoreInfo(parsed.moreInfo || '');
  };

  const closeEditModal = () => {
    setEditingEvent(null);
  };

  const buildEditedDescription = () => {
    const parts = [];
    if (editExpect.trim()) parts.push(`**✨ What can you expect?**\n${enrichSectionTextWithEmojis(editExpect.trim(), 'expect')}`);
    if (editPerfectFor.trim()) parts.push(`**🎯 Perfect for**\n${enrichSectionTextWithEmojis(editPerfectFor.trim(), 'perfectFor')}`);
    if (editGoodToKnow.trim()) parts.push(`**💡 Good to know (tips)**\n${enrichSectionTextWithEmojis(editGoodToKnow.trim(), 'goodToKnow')}`);
    if (editMoreInfo.trim()) parts.push(`**🔗 More information**\n${enrichSectionTextWithEmojis(editMoreInfo.trim(), 'moreInfo')}`);
    return parts.join('\n\n');
  };

  const handleSaveEditInMemory = () => {
    if (!editingEvent) return;
    const newDescription = buildEditedDescription();
    const pLat = parseFloat(editLat);
    const pLng = parseFloat(editLng);
    const coords = (!isNaN(pLat) && !isNaN(pLng)) ? { lat: pLat, lng: pLng } : editingEvent.coordinates;
    const sources = editWebsiteUrl.trim() 
      ? [{ title: "Official Website", url: editWebsiteUrl.trim() }] 
      : editingEvent.sources;

    const finalEndDate = (editEndDate && !isSameDay(editStartDate, editEndDate)) ? editEndDate : null;

    const updatedEv: GroundedEvent = {
      ...editingEvent,
      title: editTitle,
      category: editCategory,
      start_date: editStartDate,
      date: editStartDate,
      end_date: finalEndDate,
      start_time: editStartTime,
      time: editStartTime,
      end_time: editEndTime || null,
      location: editLocation,
      image: editImage,
      price: editPrice ? editPrice.trim() : null,
      ticket_url: editTicketUrl ? editTicketUrl.trim() : null,
      is_free: editIsFree,
      description: newDescription,
      coordinates: coords,
      sources: sources
    };

    setDiscoveredEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEv : e));
    setDbDiscoveredEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEv : e));
    setEditingEvent(null);
    setMsg?.({ type: 'success', text: 'Card preview updated with your customized information.' });
  };

  const handleSaveAndPublish = async () => {
    if (!editingEvent) return;
    const newDescription = buildEditedDescription();
    const pLat = parseFloat(editLat);
    const pLng = parseFloat(editLng);
    const coords = (!isNaN(pLat) && !isNaN(pLng)) ? { lat: pLat, lng: pLng } : editingEvent.coordinates;
    const sources = editWebsiteUrl.trim() 
      ? [{ title: "Official Website", url: editWebsiteUrl.trim() }] 
      : editingEvent.sources;

    const finalEndDate = (editEndDate && !isSameDay(editStartDate, editEndDate)) ? editEndDate : null;

    const updatedEv: GroundedEvent = {
      ...editingEvent,
      title: editTitle,
      category: editCategory,
      start_date: editStartDate,
      date: editStartDate,
      end_date: finalEndDate,
      start_time: editStartTime,
      time: editStartTime,
      end_time: editEndTime || null,
      location: editLocation,
      image: editImage,
      price: editPrice ? editPrice.trim() : null,
      ticket_url: editTicketUrl ? editTicketUrl.trim() : null,
      is_free: editIsFree,
      description: newDescription,
      coordinates: coords,
      sources: sources
    };

    setDiscoveredEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEv : e));
    setDbDiscoveredEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEv : e));

    const isAlreadyPublished = publishedEvents.some(p => p.id === editingEvent.id);
    if (isAlreadyPublished) {
      await eventService.updateEvent(editingEvent.id, updatedEv);
      await fetchPublishedEvents();
      if (onRefetchEvents) await onRefetchEvents();
      setMsg?.({ type: 'success', text: `Published event "${updatedEv.title}" updated successfully!` });
    } else {
      await handleImportToDatabase(updatedEv);
    }
    setEditingEvent(null);
  };

  const handleSearch = async (queryOverride?: string, monthOverride?: string, categoryOverride?: string) => {
    const q = (queryOverride || aiQuery).trim();
    const m = monthOverride || selectedMonth;
    const cat = categoryOverride !== undefined ? categoryOverride : selectedCategory;

    if (!q) return;

    if (queryOverride) setAiQuery(queryOverride);
    if (monthOverride) setSelectedMonth(monthOverride);
    if (categoryOverride !== undefined) setSelectedCategory(categoryOverride);

    setIsSearching(true);
    setErrorMsg(null);
    setSummary(null);
    const catLabel = cat !== 'All Categories' ? ` [Category: ${cat}]` : '';
    setSearchStep(`🔍 Deep searching live web sources for ${m}${catLabel} in Valencia...`);

    const timer1 = setTimeout(() => {
      setSearchStep("⚡ Querying Palau de les Arts, IVAM, Teatro Principal & official cultural portals...");
    }, 1600);

    const timer2 = setTimeout(() => {
      setSearchStep("✨ Verifying zero-hallucination web grounding & cross-checking database...");
    }, 3500);

    try {
      let dbEvents: any[] = [];
      let aiDiscoveredDbEvents: any[] = [];
      try {
        const [pubRes, aiRes] = await Promise.all([
          eventService.getEvents().catch(() => []),
          eventService.getDiscoveredEvents().catch(() => [])
        ]);
        dbEvents = pubRes || [];
        aiDiscoveredDbEvents = aiRes || [];
      } catch (dbErr) {
        console.warn("Could not fetch existing events from Supabase:", dbErr);
      }

      const existingTitles = [
        ...dbEvents.map(e => e.title),
        ...aiDiscoveredDbEvents.map(e => e.title)
      ].filter(Boolean);

      const existingNormalizedMap: Record<string, boolean> = {};
      existingTitles.forEach(t => {
        const norm = t.toLowerCase().replace(/[^\w]/g, '');
        existingNormalizedMap[norm] = true;
      });

      const res = await fetch("/api/search-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          month: m,
          category: cat,
          location: "Valencia, Spain and surrounding Valencian Community",
          existingTitles
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error occurred during AI web search.");
      }

      const data = await res.json();
      const rawEvents: GroundedEvent[] = data.events || [];

      // Save raw discovered events into dedicated Supabase table `ai_discovered_events`
      if (rawEvents.length > 0) {
        await eventService.saveDiscoveredEvents(rawEvents, q, m);
      }

      const updatedSavedState = { ...savedEventIds };
      rawEvents.forEach(ev => {
        const norm = ev.title.toLowerCase().replace(/[^\w]/g, '');
        if (existingNormalizedMap[norm]) {
          updatedSavedState[ev.id] = true;
        }
      });
      setSavedEventIds(updatedSavedState);

      setDiscoveredEvents(rawEvents);
      setSummary(data.summary || null);

      if (!rawEvents || rawEvents.length === 0) {
        setMsg?.({ type: 'error', text: `No new verified real events found for "${q}" in ${m}.` });
      } else {
        setMsg?.({
          type: 'success',
          text: `Found ${rawEvents.length} events (stored in ai_discovered_events table)!`
        });
      }
    } catch (err: any) {
      console.error("Admin AI Event Search Error:", err);
      setErrorMsg(err.message || "Unable to run event search at this time.");
      setMsg?.({ type: 'error', text: 'Error executing AI Web Event Search.' });
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsSearching(false);
      setSearchStep("");
    }
  };

  const handleImportToDatabase = async (ev: GroundedEvent) => {
    setSavingId(ev.id);
    try {
      const sDate = ev.start_date || ev.date || 'Upcoming';
      const finalEndDate = (ev.end_date && !isSameDay(sDate, ev.end_date)) ? ev.end_date : null;

      await eventService.createEvent({
        title: ev.title,
        date: sDate,
        start_date: sDate,
        end_date: finalEndDate,
        time: ev.start_time || ev.time,
        start_time: ev.start_time || ev.time,
        end_time: ev.end_time,
        location: ev.location,
        category: ev.category,
        image: ev.image,
        description: ev.description,
        coordinates: ev.coordinates
      });

      await eventService.markDiscoveredAsPublished(ev.title);

      setSavedEventIds(prev => ({ ...prev, [ev.id]: true }));
      setDbDiscoveredEvents(prev => prev.map(e => e.id === ev.id || e.title.toLowerCase() === ev.title.toLowerCase() ? { ...e, published_to_events: true } : e));

      await fetchPublishedEvents();

      setMsg?.({
        type: 'success',
        text: `Event "${ev.title}" published! You can view it in the "Events Published" tab.`
      });

      if (onRefetchEvents) {
        await onRefetchEvents();
      }
    } catch (err: any) {
      console.error("Failed to import AI event:", err);
      setMsg?.({
        type: 'error',
        text: 'Failed to import event to database: ' + (err.message || 'Unknown error')
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteDiscovered = async (id: string, title: string) => {
    try {
      await eventService.deleteDiscoveredEvent(id);
      setDbDiscoveredEvents(prev => prev.filter(item => item.id !== id));
      setMsg?.({ type: 'success', text: `Event "${title}" removed from repository.` });
    } catch (err: any) {
      setMsg?.({ type: 'error', text: 'Failed to delete event: ' + err.message });
    }
  };

  const filteredRepoEvents = dbDiscoveredEvents.filter(ev => {
    if (repoFilter === 'published' && !ev.published_to_events) return false;
    if (repoFilter === 'unpublished' && ev.published_to_events) return false;
    if (repoCategoryFilter !== 'All' && ev.category) {
      if (!ev.category.toLowerCase().includes(repoCategoryFilter.toLowerCase())) return false;
    }
    if (repoSearch.trim()) {
      const q = repoSearch.toLowerCase();
      const matchTitle = (ev.title || '').toLowerCase().includes(q);
      const matchLoc = (ev.location || '').toLowerCase().includes(q);
      const matchCat = (ev.category || '').toLowerCase().includes(q);
      return matchTitle || matchLoc || matchCat;
    }
    return true;
  });

  return (
    <div className="space-y-8 text-left">
      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('live_search')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'live_search'
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Search & Discover Web Events</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('db_repository')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'db_repository'
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Database className="w-4 h-4 text-sky-200" />
            <span>AI Discovered Repository</span>
            {dbDiscoveredEvents.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold">
                {dbDiscoveredEvents.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('published_events')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'published_events'
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Events Published</span>
            {publishedEvents.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold">
                {publishedEvents.length}
              </span>
            )}
          </button>
        </div>

        {(activeSubTab === 'db_repository' || activeSubTab === 'published_events') && (
          <button
            type="button"
            onClick={activeSubTab === 'db_repository' ? fetchDbRepository : fetchPublishedEvents}
            disabled={isLoadingRepository || isLoadingPublished}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingRepository || isLoadingPublished) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: LIVE AI SEARCH CONSOLE */}
      {activeSubTab === 'live_search' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-slate-900 via-brand-navy to-slate-900 text-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                  <span>AI Event Discovery Agent (Admin)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full shadow-inner">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Grounded Web Search • Auto-Saves to `ai_discovered_events`</span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                  Discover, Customize & Import Verified Real Events
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                  Query live web sources across official Valencia venues. Events found are automatically archived in the <span className="font-bold text-sky-300 font-mono">ai_discovered_events</span> Supabase table for review and publication.
                </p>
              </div>

              {/* Search Controls Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Query Input */}
                  <div className="relative md:col-span-5">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="E.g. Theater plays, opera, art expos, jazz concerts, tech summits in Valencia..."
                      className="w-full pl-12 pr-4 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-slate-400 rounded-2xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  {/* Category Selector Dropdown */}
                  <div className="relative md:col-span-3">
                    <Sparkles className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        const catVal = e.target.value;
                        setSelectedCategory(catVal);
                        const matchCat = SEARCH_CATEGORIES.find(c => c.id === catVal);
                        if (matchCat && matchCat.id !== 'All Categories') {
                          setAiQuery(matchCat.query);
                        }
                      }}
                      className="w-full pl-10 pr-8 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white rounded-2xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-xs sm:text-sm font-bold appearance-none cursor-pointer"
                    >
                      {SEARCH_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-slate-900 text-white font-medium">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Month Selector Dropdown */}
                  <div className="relative md:col-span-2">
                    <Calendar className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full pl-10 pr-8 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white rounded-2xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-xs sm:text-sm font-bold appearance-none cursor-pointer"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m} value={m} className="bg-slate-900 text-white font-medium">
                          📅 {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !aiQuery.trim()}
                    className="md:col-span-2 px-6 py-3.5 bg-brand-blue hover:bg-sky-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-brand-blue/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-sky-300" />
                        <span>Deep Search</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Specific Category Quick Search Bar */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    <span>Recherche spécifique par catégorie :</span>
                  </div>
                  {selectedCategory !== 'All Categories' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All Categories');
                        setAiQuery('Top popular events, concerts, exhibitions, and shows in Valencia');
                      }}
                      className="text-[11px] text-sky-300 hover:text-white underline font-mono cursor-pointer"
                    >
                      reinitialiser le filtre
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_CATEGORIES.map((c) => {
                    const isSelected = selectedCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(c.id);
                          setAiQuery(c.query);
                          handleSearch(c.query, selectedMonth, c.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border cursor-pointer ${
                          isSelected
                            ? "bg-sky-500 text-white border-sky-300 shadow-md shadow-sky-500/30 scale-105"
                            : "bg-white/10 hover:bg-white/20 border-white/10 text-slate-200 hover:text-white"
                        }`}
                      >
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isSearching && (
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">{searchStep}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          </div>

          {/* Discovered Events Grid */}
          {discoveredEvents.length > 0 && (() => {
            const savedCount = discoveredEvents.filter(ev => savedEventIds[ev.id]).length;
            const visibleEvents = hideSavedInDb
              ? discoveredEvents.filter(ev => !savedEventIds[ev.id])
              : discoveredEvents;

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900 flex items-center gap-2.5">
                      <Sparkles className="w-6 h-6 text-brand-blue" />
                      Verified Events Discovered for {selectedMonth} ({visibleEvents.length})
                    </h3>
                    {summary && <p className="text-xs sm:text-sm text-slate-500 font-medium">{summary}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {savedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setHideSavedInDb(!hideSavedInDb)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          hideSavedInDb
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{hideSavedInDb ? `Hiding ${savedCount} saved in Supabase` : `Showing all ${discoveredEvents.length} (${savedCount} saved)`}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { setDiscoveredEvents([]); setSummary(null); }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 underline uppercase tracking-wider"
                    >
                      Clear Results
                    </button>
                  </div>
                </div>

                {visibleEvents.length === 0 && hideSavedInDb && (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">All discovered events are already saved in your Supabase database!</p>
                    <button
                      type="button"
                      onClick={() => setHideSavedInDb(false)}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Show {savedCount} Previously Saved Events
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {visibleEvents.map((event) => {
                    const isSaved = savedEventIds[event.id];
                    const isSaving = savingId === event.id;
                    const isMapExpanded = expandedMapId === event.id;

                    return (
                      <div
                        key={event.id}
                        className={`bg-white rounded-[32px] border-2 transition-all shadow-sm hover:shadow-xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative group ${
                          isSaved
                            ? "border-emerald-300 bg-emerald-50/10 ring-1 ring-emerald-400/20"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="space-y-5">
                          <div className="relative h-52 sm:h-60 rounded-2xl overflow-hidden bg-slate-100 group-hover:scale-[1.01] transition-transform duration-500">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3.5 py-2 rounded-xl text-center min-w-[55px] flex flex-col justify-center items-center shadow-md">
                              <p className="text-xs font-extrabold text-brand-blue uppercase leading-tight">
                                {event.start_date || event.date || 'UPCOMING'}
                              </p>
                              {event.end_date && !isSameDay(event.start_date || event.date, event.end_date) && (
                                <>
                                  <p className="text-[9px] text-slate-400 font-medium lowercase leading-none my-0.5">to</p>
                                  <p className="text-xs font-extrabold text-brand-blue uppercase leading-tight">
                                    {event.end_date}
                                  </p>
                                </>
                              )}
                            </div>

                            <div className="absolute top-4 right-4 bg-brand-blue/90 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md">
                              {getCategoryWithEmoji(event.category)}
                            </div>

                            <div className="absolute bottom-4 left-4 bg-emerald-950/80 backdrop-blur border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>Stored in `ai_discovered_events`</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                Valencia & Regional Event
                              </span>
                              {isSaved && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Published to Catalog
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold font-display text-slate-900 text-xl leading-snug">
                              {event.title}
                            </h4>
                          </div>

                          <div className="space-y-2 text-xs text-slate-600 font-medium pt-3 border-t border-slate-100">
                            {(event.start_time || event.time) && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>{event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div className="flex items-start gap-2 min-w-0">
                                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                <span className="leading-tight font-semibold text-slate-800 break-words">{event.location}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, Valencia`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-orange-600 border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                  title="Open location in Google Maps"
                                >
                                  <span>📍 Google Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                {event.coordinates && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedMapId(isMapExpanded ? null : event.id)}
                                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                                  >
                                    <MapIcon className="w-3 h-3" />
                                    <span>{isMapExpanded ? "Hide Map" : "Map View"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {(event.price || event.ticket_url || event.is_free !== undefined) && (
                            <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-orange-50/90 to-amber-50/80 border border-orange-200/90 rounded-2xl shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-200 flex items-center justify-center shrink-0">
                                  <Ticket className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="text-xs">
                                  <span className="font-extrabold uppercase tracking-wide text-orange-950 mr-2">
                                    {event.is_free ? 'Free Admission' : 'Admission & Tickets'}
                                  </span>
                                  <span className="font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-orange-200 text-[11px]">
                                    {event.price || (event.is_free ? 'Free' : 'Tickets Required')}
                                  </span>
                                </div>
                              </div>
                              {(event.ticket_url || event.sources?.[0]?.url) && (
                                <a
                                  href={event.ticket_url || event.sources?.[0]?.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all shrink-0 active:scale-95"
                                >
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>{event.is_free ? 'Free RSVP' : 'Buy Tickets'}</span>
                                  <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                              )}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100">
                            <SimpleMarkdown>{event.description}</SimpleMarkdown>
                          </div>

                          {event.sources && event.sources.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-orange-500" />
                                Verified Official Web Citations
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {event.sources.map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-orange-50 hover:text-orange-700 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200/80"
                                  >
                                    <span className="truncate max-w-[200px]">{src.title || "Official Source Link"}</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {isMapExpanded && event.coordinates && (
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                                <MapIcon className="w-3.5 h-3.5 text-orange-500" />
                                Interactive Map & Coordinates
                              </p>
                              <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                                <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                                  <Map
                                    defaultCenter={event.coordinates}
                                    defaultZoom={15}
                                    gestureHandling="none"
                                    disableDefaultUI
                                    mapId={`admin_ai_map_${event.id}`}
                                    className="w-full h-full"
                                  >
                                    <AdvancedMarker position={event.coordinates}>
                                      <Pin background={'#F97316'} glyphColor={'#FFFFFF'} borderColor={'#EA580C'} />
                                    </AdvancedMarker>
                                  </Map>
                                </APIProvider>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col gap-2.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(event)}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                          >
                            <Edit3 className="w-4 h-4 text-sky-400" />
                            <span>Edit Information Before Publish</span>
                          </button>

                          <button
                            type="button"
                            disabled={isSaving || unpublishingId === event.id || unpublishingId === event.title}
                            onClick={() => isSaved ? handleDeletePublished(event) : handleImportToDatabase(event)}
                            className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                              isSaved
                                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 active:scale-[0.98]"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-[0.98]"
                            }`}
                          >
                            {isSaving || unpublishingId === event.id || unpublishingId === event.title ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isSaved ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span>Unpublish (Return to Repo)</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Publish Direct to Events</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedMapId(isMapExpanded ? null : event.id)}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <MapIcon className="w-3.5 h-3.5 text-brand-blue" />
                            <span>{isMapExpanded ? "Hide Map" : "View Map & Location"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 2: AI DISCOVERED REPOSITORY (`ai_discovered_events` TABLE) */}
      {activeSubTab === 'db_repository' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-[32px] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                <h3 className="text-xl sm:text-2xl font-bold font-display">
                  Supabase AI Discovered Events Repository
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                All raw events ever discovered by the AI agent are preserved in the <span className="font-mono text-sky-300 font-bold">ai_discovered_events</span> table.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold">
              <span>Total Stored:</span>
              <span className="text-sky-300 text-sm">{dbDiscoveredEvents.length}</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Filter Pills & Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRepoFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  repoFilter === 'all'
                    ? "bg-brand-blue text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({dbDiscoveredEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter('unpublished')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  repoFilter === 'unpublished'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Pending Publication ({dbDiscoveredEvents.filter(e => !e.published_to_events).length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter('published')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  repoFilter === 'published'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Published ({dbDiscoveredEvents.filter(e => e.published_to_events).length})
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <select
                value={repoCategoryFilter}
                onChange={(e) => setRepoCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 outline-none cursor-pointer"
              >
                <option value="All">📂 All Categories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryWithEmoji(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Filter */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Search repository..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Stored Events Cards Grid */}
          {isLoadingRepository ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Loading stored events from Supabase...</p>
            </div>
          ) : filteredRepoEvents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Database className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                {repoSearch.trim() || repoFilter !== 'all'
                  ? "No events found matching your filter criteria."
                  : "No events stored in `ai_discovered_events` table yet."}
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('live_search')}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-sky-500 shadow-sm"
              >
                Run AI Web Search Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRepoEvents.map((event) => {
                const isPublished = event.published_to_events;
                const isSaving = savingId === event.id;

                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-[32px] border-2 transition-all shadow-sm hover:shadow-xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative ${
                      isPublished
                        ? "border-emerald-200 bg-emerald-50/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-5">
                      <div className="relative h-48 rounded-2xl overflow-hidden bg-slate-100">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-center min-w-[50px] shadow-sm">
                          <p className="text-xs font-extrabold text-brand-blue uppercase">
                            {event.start_date || 'UPCOMING'}
                          </p>
                        </div>

                        <div className="absolute top-3 right-3 bg-slate-900/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {getCategoryWithEmoji(event.category)}
                        </div>

                        <div className={`absolute bottom-3 left-3 backdrop-blur px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md ${
                          isPublished
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}>
                          {isPublished ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Published in `events`</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Pending Review</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold font-display text-slate-900 text-lg leading-snug">
                          {event.title}
                        </h4>
                        <div className="space-y-2 text-xs text-slate-600 font-medium">
                          {(event.start_time || event.time) && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-brand-blue shrink-0" />
                              <span>{event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                              <span className="leading-tight font-semibold text-slate-800 break-words">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, Valencia`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-brand-blue border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                title="Open location in Google Maps"
                              >
                                <span>📍 Google Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              {event.coordinates && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedMapId(expandedMapId === event.id ? null : event.id)}
                                  className="px-2.5 py-1 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <MapIcon className="w-3 h-3" />
                                  <span>{expandedMapId === event.id ? "Hide Map" : "Map View"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <SimpleMarkdown>{event.description}</SimpleMarkdown>
                      </div>

                      {event.sources && event.sources.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-brand-blue" />
                            Official Website Citations
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {event.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-brand-blue/10 hover:text-brand-blue text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200/80"
                              >
                                <span className="truncate max-w-[180px]">{src.title || "Official Website Link"}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {expandedMapId === event.id && event.coordinates && (
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                            <MapIcon className="w-3.5 h-3.5 text-brand-blue" />
                            Interactive Map & Coordinates
                          </p>
                          <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                              <Map
                                defaultCenter={event.coordinates}
                                defaultZoom={15}
                                gestureHandling="none"
                                disableDefaultUI
                                mapId={`admin_repo_map_${event.id}`}
                                className="w-full h-full"
                              >
                                <AdvancedMarker position={event.coordinates}>
                                  <Pin background={'#0870B8'} glyphColor={'#FFFFFF'} borderColor={'#0870B8'} />
                                </AdvancedMarker>
                              </Map>
                            </APIProvider>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(event)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSaving || unpublishingId === event.id || unpublishingId === event.title}
                        onClick={() => isPublished ? handleDeletePublished(event) : handleImportToDatabase(event)}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                          isPublished
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                        }`}
                      >
                        {isSaving || unpublishingId === event.id || unpublishingId === event.title ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isPublished ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Unpublish</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDiscovered(event.id, event.title)}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                        title="Delete from repository"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: EVENTS PUBLISHED (events TABLE) */}
      {activeSubTab === 'published_events' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-[32px] p-6 sm:p-8 shadow-xl border border-emerald-800/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Live Published Events (`events` table)</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                  Events Published to the App
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
                  These are the events currently live and visible to public users on the main app view. You can edit their schedule, location, image, and content or unpublish them anytime.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 text-center">
                  <p className="text-2xl font-extrabold text-white">{publishedEvents.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Total Published</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={publishedSearch}
                onChange={(e) => setPublishedSearch(e.target.value)}
                placeholder="Filter published events by title or location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={publishedCategoryFilter}
                onChange={(e) => setPublishedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer focus:outline-none"
              >
                <option value="All">All Categories ({publishedEvents.length})</option>
                {SEARCH_CATEGORIES.filter(c => c.id !== 'All Categories').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={fetchPublishedEvents}
                disabled={isLoadingPublished}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border border-emerald-200/60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPublished ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Published Cards Grid */}
          {isLoadingPublished ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading published events...</p>
            </div>
          ) : filteredPublishedEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3 p-6">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-lg font-bold text-slate-800">No published events found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Events published from "Search & Discover Web Events" or "AI Discovered Repository" will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublishedEvents.map(event => (
                <div key={event.id} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    {/* Image Cover Header */}
                    <div className="h-44 relative bg-slate-100 overflow-hidden">
                      <img src={event.image || event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      
                      {/* Date Overlay Badge */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md border border-slate-100 z-10">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-tight whitespace-nowrap">
                          {event.start_date || event.date || 'Upcoming'}
                        </span>
                        {event.end_date && !isSameDay(event.start_date || event.date, event.end_date) && (
                          <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-tight whitespace-nowrap">
                            - {event.end_date}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span>Published</span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold font-display text-slate-900 text-base leading-snug">
                          {event.title}
                        </h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wider">
                          {event.category}
                        </span>
                      </div>

                      {/* Prominent Date & Time Row */}
                      <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100/80 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 font-bold text-emerald-950">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{event.start_date || event.date || 'Upcoming'}</span>
                          {event.end_date && !isSameDay(event.start_date || event.date, event.end_date) && (
                            <span>- {event.end_date}</span>
                          )}
                        </div>
                        {(event.start_time || event.time) && (
                          <div className="flex items-center gap-2 font-medium text-slate-700 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{event.start_time || event.time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Location Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                          <span className="leading-tight font-semibold text-slate-800 break-words">{event.location}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, Valencia`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-brand-blue border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs shrink-0"
                        >
                          <span>📍 Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Description Markdown Preview */}
                      <div className="pt-2">
                        <SimpleMarkdown>{event.description || ''}</SimpleMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Event</span>
                    </button>

                    <button
                      type="button"
                      disabled={unpublishingId === event.id || unpublishingId === event.title}
                      onClick={() => handleDeletePublished(event)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {unpublishingId === event.id || unpublishingId === event.title ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>Unpublish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-brand-blue/10 text-brand-blue">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display text-slate-900">
                      Edit Event Information
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Customize title, schedule, image, and structured information sections before publishing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Grid */}
              <div className="space-y-5 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-brand-blue" /> Event Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-brand-blue" /> Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-blue outline-none font-bold text-slate-900 appearance-none cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                    <input
                      type="text"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      placeholder="OCT 15"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Date (Optional)</label>
                    <input
                      type="text"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      placeholder="OCT 18"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                    <input
                      type="text"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      placeholder="20:00"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">End Time (Optional)</label>
                    <input
                      type="text"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      placeholder="22:30"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-blue" /> Venue & Location
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="e.g. Palau de les Arts Reina Sofía..."
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-brand-blue" /> Image URL
                    </label>
                    <input
                      type="text"
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs truncate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Globe className="w-3 h-3 text-brand-blue" /> Official Website / Ticket URL
                    </label>
                    <input
                      type="url"
                      value={editWebsiteUrl}
                      onChange={(e) => setEditWebsiteUrl(e.target.value)}
                      placeholder="https://www.official-event.com"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <MapIcon className="w-3 h-3 text-brand-blue" /> Map Latitude (Lat)
                    </label>
                    <input
                      type="text"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="39.4699"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <MapIcon className="w-3 h-3 text-brand-blue" /> Map Longitude (Lng)
                    </label>
                    <input
                      type="text"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="-0.3763"
                      className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-900 text-xs"
                    />
                  </div>
                </div>

                {/* Admission & Ticketing Section */}
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-orange-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-orange-600" />
                      Admission & Ticket Purchasing
                    </label>
                    <div className="flex bg-white p-0.5 rounded-lg border border-orange-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsFree(true);
                          if (!editPrice || editPrice === '') setEditPrice('Free');
                        }}
                        className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          editIsFree ? "bg-emerald-500 text-white shadow-2xs font-extrabold" : "text-slate-500"
                        }`}
                      >
                        Free Event
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsFree(false);
                          if (editPrice === 'Free') setEditPrice('');
                        }}
                        className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                          !editIsFree ? "bg-orange-500 text-white shadow-2xs font-extrabold" : "text-slate-500"
                        }`}
                      >
                        Paid Tickets
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Price / Entry Fee</label>
                      <input
                        type="text"
                        value={editPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPrice(val);
                          if (val.toLowerCase().includes('free') || val === '0' || val === '0€') {
                            setEditIsFree(true);
                          }
                        }}
                        placeholder="e.g. 25€ or Free admission"
                        className="w-full p-2.5 bg-white rounded-xl border border-orange-200/80 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-orange-400/30 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Ticket Purchase URL</label>
                      <input
                        type="url"
                        value={editTicketUrl}
                        onChange={(e) => {
                          setEditTicketUrl(e.target.value);
                          if (!editWebsiteUrl) setEditWebsiteUrl(e.target.value);
                        }}
                        placeholder="https://feverup.com/... or ticketing link"
                        className="w-full p-2.5 bg-white rounded-xl border border-orange-200/80 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-orange-400/30 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Four Structured Description Sections */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-blue" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Structured Description Sections
                    </h4>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-brand-blue text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                        1. What can you expect?
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditExpect(prev => enrichSectionTextWithEmojis(prev, 'expect'))}
                        className="text-[10px] font-bold text-brand-blue bg-white hover:bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 transition-colors shadow-2xs cursor-pointer"
                        title="Automatically add themed emojis to bullet points"
                      >
                        ✨ Auto-Enrich Emojis
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 my-1 py-1 px-2 bg-white/70 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 mr-1">Insert:</span>
                      {['✨', '🎨', '🎶', '🎭', '🍷', '🥘', '🌟', '📍', '💃', '💻', '🏃', '🛠️'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditExpect(prev => prev ? `${prev} ${emoji} ` : `${emoji} `)}
                          className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-xs transition-transform active:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={editExpect}
                      onChange={(e) => setEditExpect(e.target.value)}
                      placeholder="Explain what happens at the show, exhibition, concert or workshop..."
                      className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium leading-relaxed outline-none focus:border-brand-blue resize-y"
                    />
                  </div>

                  <div className="space-y-1.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        2. Perfect for
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditPerfectFor(prev => enrichSectionTextWithEmojis(prev, 'perfectFor'))}
                        className="text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        title="Automatically add audience emojis to bullet points"
                      >
                        ✨ Auto-Enrich Emojis
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 my-1 py-1 px-2 bg-white/70 rounded-lg border border-emerald-100/60">
                      <span className="text-[10px] font-semibold text-emerald-700/60 mr-1">Insert:</span>
                      {['👥', '🎯', '👨‍👩‍👧', '🌍', '🍷', '🎶', '🎨', '💑', '🎓', '🤝', '👟', '🏖️'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditPerfectFor(prev => prev ? `${prev} ${emoji} ` : `${emoji} `)}
                          className="px-1.5 py-0.5 hover:bg-emerald-100/50 rounded text-xs transition-transform active:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editPerfectFor}
                      onChange={(e) => setEditPerfectFor(e.target.value)}
                      placeholder="E.g., Art lovers, Expat families, Classical music enthusiasts..."
                      className="w-full p-3 bg-white rounded-xl border border-emerald-200 text-xs font-medium leading-relaxed outline-none focus:border-emerald-500 resize-y"
                    />
                  </div>

                  <div className="space-y-1.5 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        3. Good to know (tips)
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditGoodToKnow(prev => enrichSectionTextWithEmojis(prev, 'goodToKnow'))}
                        className="text-[10px] font-bold text-amber-900 bg-white hover:bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                        title="Automatically add tip & practical emojis to bullet points"
                      >
                        ✨ Auto-Enrich Emojis
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 my-1 py-1 px-2 bg-white/70 rounded-lg border border-amber-100">
                      <span className="text-[10px] font-semibold text-amber-800/60 mr-1">Insert:</span>
                      {['💡', '🎟️', '⏰', '🚇', '🅿️', '💶', '♿', '☀️', '👔', '🗣️', '📱', '⚠️'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditGoodToKnow(prev => prev ? `${prev} ${emoji} ` : `${emoji} `)}
                          className="px-1.5 py-0.5 hover:bg-amber-100/50 rounded text-xs transition-transform active:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editGoodToKnow}
                      onChange={(e) => setEditGoodToKnow(e.target.value)}
                      placeholder="Practical tips: ticket prices, doors open time, parking, Metro access, dress code..."
                      className="w-full p-3 bg-white rounded-xl border border-amber-200 text-xs font-medium leading-relaxed outline-none focus:border-amber-500 resize-y"
                    />
                  </div>

                  <div className="space-y-1.5 bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-sky-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                        4. More information
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditMoreInfo(prev => enrichSectionTextWithEmojis(prev, 'moreInfo'))}
                        className="text-[10px] font-bold text-sky-900 bg-white hover:bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 transition-colors shadow-2xs cursor-pointer"
                        title="Automatically add link and contact emojis"
                      >
                        ✨ Auto-Enrich Emojis
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 my-1 py-1 px-2 bg-white/70 rounded-lg border border-sky-100">
                      <span className="text-[10px] font-semibold text-sky-800/60 mr-1">Insert:</span>
                      {['🔗', '🌐', '🎟️', '📍', '📱', '📧', '📋', '⭐', '🤝'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditMoreInfo(prev => prev ? `${prev} ${emoji} ` : `${emoji} `)}
                          className="px-1.5 py-0.5 hover:bg-sky-100/50 rounded text-xs transition-transform active:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={editMoreInfo}
                      onChange={(e) => setEditMoreInfo(e.target.value)}
                      placeholder="Official website links, booking guidelines, or organizer notes..."
                      className="w-full p-3 bg-white rounded-xl border border-sky-200 text-xs font-medium leading-relaxed outline-none focus:border-sky-500 resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditInMemory}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-sky-400" />
                  <span>Update Card Preview Only</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Publish to Catalog</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
