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
  Ticket,
  Archive,
  FolderPlus,
  CheckSquare,
  Square,
  Cpu,
  AlertTriangle,
  Zap,
  Bell,
  Copy,
  BadgeCheck,
  ShieldAlert,
  Link2,
  CheckCheck,
  Radio
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { eventService, isSameDay } from '../services/eventService';
import { isEventExpired, isEventMatchingDateFilter } from '../utils/eventFormatter';
import { cn } from '../lib/utils';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

function safeExternalHref(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export interface VerificationChecks {
  grounded_in_search: boolean;
  source_url_live: boolean;
  future_date_verified: boolean;
  specific_venue: boolean;
  complete_details: boolean;
}

export interface AgentRunAudit {
  missions_run: number;
  missions_succeeded: number;
  raw_candidates_count: number;
  filtered_duplicates_count: number;
  rejected_past_or_invalid_count: number;
  rejected_unverified_count: number;
  live_urls_checked: number;
  live_urls_reachable: number;
  high_confidence_count: number;
  date_window: { start: string; end: string; label: string };
  grounding_sources_count: number;
}

export interface LiveVerifyVerdict {
  status: 'confirmed' | 'needs_update' | 'cancelled' | 'unverified';
  confidence_score: number;
  summary: string;
  corrections: Record<string, string | null>;
  verified_sources: { title: string; url: string; live?: boolean }[];
  ticket_url_live: boolean | null;
}

export interface WeekendPushDraft {
  options: { label: string; title: string; body: string }[];
  community_post: string;
}

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
  ticket_url?: string | null;
  price?: string | null;
  is_free?: boolean;
  sources?: { title: string; url: string; live?: boolean; status?: number | null }[];
  published_to_events?: boolean;
  created_at?: string;
  confidence_score?: number;
  verification_level?: 'high' | 'medium';
  verification_checks?: VerificationChecks;
  mission_label?: string;
}

interface AdminAiEventSearchProps {
  onRefetchEvents?: () => Promise<void>;
  setMsg?: (msg: { type: 'success' | 'error'; text: string }) => void;
  onEditEvent?: (event: GroundedEvent) => void;
  setDiscoveredEventTitle?: (title: string | null) => void;
}

const MONTH_OPTIONS = (() => {
  const now = new Date();
  const options: string[] = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  }
  options.push("All Months / Flexible");
  return options;
})();

const SEARCH_CATEGORIES = [
  { id: "All Categories", name: "✨ All", icon: "✨", query: "Top popular events, concerts, exhibitions, and shows in Valencia" },
  { id: "Art", name: "🎨 Art", icon: "🎨", query: "Major art museum exhibitions at Bombas Gens, IVAM, CAIXAFORUM, and MuVIM in Valencia" },
  { id: "Theater", name: "🎭 Theater", icon: "🎭", query: "Theater plays, opera, dance performances, and musicals at Palau de les Arts, Teatro Principal, and Teatro Olympia in Valencia" },
  { id: "Music", name: "🎵 Music", icon: "🎵", query: "High-profile live music concerts, classical symphonies, jazz shows, and music festivals in Valencia" },
  { id: "Gastronomy", name: "🍷 Gastronomy", icon: "🍷", query: "Food festivals, wine tastings, culinary markets, and gastronomy fairs in Valencia" },
  { id: "Sports", name: "⚽ Sports", icon: "⚽", query: "Marathons, running races, outdoor fitness events, sports tournaments, and Turia garden activities in Valencia" }
];

const CATEGORY_OPTIONS = [
  "Art",
  "Museums",
  "Music",
  "Nightlife",
  "Gastronomy",
  "Theatre",
  "Outdoor",
  "Sports",
  "Tech",
  "Community",
  "Expat",
  "Family",
  "Festival",
  "Workshops",
  "Culture"
];

const PRESET_PROMPTS = [
  { label: '🎭 Arts, Opera & Theater', query: 'Major art exhibitions, theater plays, and opera performances at Palau de les Arts, IVAM, and Teatro Principal in Valencia' },
  { label: '🎻 Concerts & Live Shows', query: 'High-profile live music concerts, classical shows, and music festivals in Valencia' },
  { label: '🚀 Tech Summits & Expats', query: 'Tech summits, business innovation conferences, and expat networking meetups in Valencia' },
  { label: '🍷 Gastronomy & Wine Fairs', query: 'Food festivals, wine tastings, and culinary workshops in Valencia' },
  { label: '🏛️ Museums & Cultural Expos', query: 'Must-see art museum exhibitions at Bombas Gens, MuVIM, and CAIXAFORUM Valencia' },
  { label: '🌳 Outdoor, Sports & Turia', query: 'Outdoor festivals, running events, and open-air activities in Turia Gardens Valencia' }
];

const EMOJI_REGEX = /[\p{Extended_Pictographic}\u2600-\u27BF]/u;

export function enrichSectionTextWithEmojis(text: string, sectionType: 'fullDescription' | 'description' | 'expect' | 'perfectFor' | 'goodToKnow' | 'moreInfo'): string {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Check if line already has any emoji anywhere in the first 30 characters
    if (EMOJI_REGEX.test(trimmed.slice(0, 30))) {
      return cleanDuplicateEmojis(line);
    }

    const bulletMatch = line.match(/^(\s*[-*•]\s*)(.*)$/);
    const prefix = bulletMatch ? bulletMatch[1] : '';
    const body = bulletMatch ? bulletMatch[2] : line;
    const lower = body.toLowerCase();

    if (EMOJI_REGEX.test(body.slice(0, 30))) {
      return cleanDuplicateEmojis(line);
    }

    let emoji = '✨';

    if (sectionType === 'fullDescription' || sectionType === 'description') {
      emoji = '📝';
    } else if (sectionType === 'expect') {
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

export function cleanDuplicateEmojis(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove repeated consecutive emojis (supporting variation selectors \uFE0F, skin tones, ZWJ, and spaces)
  cleaned = cleaned.replace(/([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]*\1)+/gu, '$1');

  // 2. Remove duplicate emojis at bullet point starts (e.g. "- 🎟️ 🎟️", "• 🎶 🎶", "* 🎨 🎨")
  cleaned = cleaned.replace(/^([ \t]*[-*•]\s*)([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]+\2)+/gmu, '$1$2');

  // 3. Remove duplicate emojis at line starts (e.g. "🎶 🎶 Jazz night")
  cleaned = cleaned.replace(/^([ \t]*)([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]+\2)+/gmu, '$1$2');

  // 4. Clean decorative sparkle + emoji at start of bullets (e.g. "• ✨ 🎶" -> "• 🎶", "- ✨ 🎟️" -> "- 🎟️")
  cleaned = cleaned.replace(/^([ \t]*[-*•]\s*)✨\s+([\p{Extended_Pictographic}\u2600-\u27BF])/gmu, '$1$2');

  // 5. Clean header duplicate sparkles (e.g. "### ✨ ✨ What to expect" -> "### ✨ What to expect")
  cleaned = cleaned.replace(/^(#{1,6}\s*)✨\s+✨/gmu, '$1✨');

  // 6. Remove unwanted trailing sparkles & double colons
  cleaned = cleaned.replace(/\s+✨(?=[.:,\n\s]|$)/g, "");
  cleaned = cleaned.replace(/:\s*:/g, ':');

  // 7. Consolidate excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

function cleanExtractedSectionContent(content: string): string {
  if (!content) return '';
  let cleaned = content.trim();
  // Remove any internal duplicate header lines that might have been captured
  cleaned = cleaned.replace(/^[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[\p{Extended_Pictographic}\uFE0F\s]*)(?:Full Description|Description complète|Description générale|Description|Présentation|About (?:the )?event|Overview|À propos|What (?:can you |to |you can )?expect\??|Event details|Perfect for|Target audience|Who should attend|Ideal for|Who is (?:this|it) for|Good to know(?:\s*\(tips\))?|Practical (?:info|information)|Need to know|Important info(?:rmation)?|Tickets & Timing|More info(?:rmation)?|Useful links|Tickets & (?:Info|Links)|Official links|Plus d'infos|A quoi s'attendre\??|Infos pratiques|Public cible|Para quién|Qué esperar\??)(?:\*\*?|__|:|\s)*\n?/gimu, '');
  return cleanDuplicateEmojis(cleaned);
}

export function parseDescriptionSections(description: string) {
  let fullDescription = '';
  let expect = '';
  let perfectFor = '';
  let goodToKnow = '';
  let moreInfo = '';

  if (!description) return { fullDescription, expect, perfectFor, goodToKnow, moreInfo, hasRealSections: false };

  // Flexible regexes matching common variations of canonical section titles (Markdown headers ###, bold **, or standard headers)
  const headerMatchers = [
    {
      key: 'fullDescription',
      regex: /(?:^|\n)[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[📝📄ℹ️\s]*)?(?:Full Description|Description complète|Description générale|Description|Présentation|About (?:the )?event|Overview|À propos)(?:\*\*?|__|:|\s)*(?:\n|$)/i
    },
    {
      key: 'expect',
      regex: /(?:^|\n)[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[✨\s]*)?(?:What (?:can you |to |you can )?expect\??|Event details|A quoi s'attendre\??|Ce à quoi vous attendre\??|Qué esperar\??)(?:\*\*?|__|:|\s)*(?:\n|$)/i
    },
    {
      key: 'perfectFor',
      regex: /(?:^|\n)[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[🎯\s]*)?(?:Perfect for|Ideal for|Who is (?:this|it) for|Target audience|Who should attend|Public cible|Idéal pour|Para quién)(?:\*\*?|__|:|\s)*(?:\n|$)/i
    },
    {
      key: 'goodToKnow',
      regex: /(?:^|\n)[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[💡\s]*)?(?:Good to know(?:\s*\(tips\))?|Practical (?:info|information)|Need to know|Important info(?:rmation)?|Tickets & Timing|Infos pratiques|Bon à savoir|Información práctica)(?:\*\*?|__|:|\s)*(?:\n|$)/i
    },
    {
      key: 'moreInfo',
      regex: /(?:^|\n)[ \t]*(?:#{1,6}\s*|\*\*?|__)?(?:\d+[\.\)]\s+)?(?:[🔗\s]*)?(?:More info(?:rmation)?|Useful links|Tickets & (?:Info|Links)|Official links|Plus d'infos|En savoir plus|Más información)(?:\*\*?|__|:|\s)*(?:\n|$)/i
    }
  ];

  const sections: { key: string; start: number; end: number }[] = [];

  for (const item of headerMatchers) {
    const match = description.match(item.regex);
    if (match && match.index !== undefined) {
      sections.push({
        key: item.key,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  const hasRealSections = sections.length > 0;

  // Sort sections by their start position in the description
  sections.sort((a, b) => a.start - b.start);

  // If we found at least one real section header, extract the content for each
  if (hasRealSections) {
    if (sections[0].start > 0) {
      const preamble = cleanExtractedSectionContent(description.substring(0, sections[0].start));
      if (preamble) fullDescription = preamble;
    }

    for (let i = 0; i < sections.length; i++) {
      const current = sections[i];
      const next = sections[i + 1];
      const contentStart = current.end;
      const contentEnd = next ? next.start : description.length;
      const content = cleanExtractedSectionContent(description.substring(contentStart, contentEnd));

      if (current.key === 'fullDescription') {
        fullDescription = fullDescription ? `${fullDescription}\n\n${content}` : content;
      }
      else if (current.key === 'expect') {
        expect = expect ? `${expect}\n\n${content}` : content;
      }
      else if (current.key === 'perfectFor') perfectFor = content;
      else if (current.key === 'goodToKnow') goodToKnow = content;
      else if (current.key === 'moreInfo') moreInfo = content;
    }
  }

  // Fallback if no sections matched at all:
  if (!fullDescription && !expect && !perfectFor && !goodToKnow && !moreInfo) {
    fullDescription = cleanDuplicateEmojis(description.trim());
  }

  return { fullDescription, expect, perfectFor, goodToKnow, moreInfo, hasRealSections };
}

export function getCategoryWithEmoji(cat: string) {
  if (!cat) return "✨ Culture";
  const trimmed = cat.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("art")) return "🎨 " + trimmed;
  if (lower.includes("museum") || lower.includes("museo")) return "🏛️ " + trimmed;
  if (lower.includes("theater") || lower.includes("theatre")) return "🎭 " + trimmed;
  if (lower.includes("music") || lower.includes("concert")) return "🎵 " + trimmed;
  if (lower.includes("night") || lower.includes("party")) return "🌙 " + trimmed;
  if (lower.includes("tech") || lower.includes("digital")) return "💻 " + trimmed;
  if (lower.includes("gastro") || lower.includes("food") || lower.includes("wine")) return "🍷 " + trimmed;
  if (lower.includes("community") || lower.includes("social")) return "👥 " + trimmed;
  if (lower.includes("sport") || lower.includes("run")) return "⚽ " + trimmed;
  if (lower.includes("workshop") || lower.includes("masterclass")) return "🛠️ " + trimmed;
  if (lower.includes("out") || lower.includes("nature") || lower.includes("turia") || lower.includes("park")) return "🌳 " + trimmed;
  if (lower.includes("fam") || lower.includes("kid")) return "👨‍👩‍👧 " + trimmed;
  if (lower.includes("fest") || lower.includes("fair")) return "🌟 " + trimmed;
  if (lower.includes("cultur")) return "🏛️ " + trimmed;
  return "🏷️ " + trimmed;
}

export function renderFormattedContent(
  text: string, 
  defaultBoldClass = "font-extrabold text-slate-950",
  bulletDotClass = "text-emerald-600"
) {
  if (!text) return null;

  const normalizedText = text.replace(/\r\n/g, '\n').replace(/<iframe[\s\S]*?<\/iframe>/gi, (match) => {
    return match.replace(/\n\s*/g, ' ');
  });
  const lines = normalizedText.split('\n');
  return lines.map((line, lineIdx) => {
    let cleanLine = line.trim();
    if (!cleanLine) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    // Handle <iframe> embeds (Google Maps, videos, etc.)
    if (cleanLine.toLowerCase().includes('<iframe')) {
      const srcMatch = cleanLine.match(/src=["']([^"']+)["']/i);
      const heightMatch = cleanLine.match(/height=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        return (
          <div key={lineIdx} className="my-4 w-full overflow-hidden rounded-2xl shadow-sm border border-slate-200 bg-slate-50">
            <iframe
              src={srcMatch[1]}
              width="100%"
              height={heightMatch ? heightMatch[1] : "350"}
              style={{ border: 0, borderRadius: '16px' }}
              allowFullScreen
              loading="lazy"
              className="w-full rounded-2xl border-0 min-h-[300px]"
              title="Embedded Map & Content"
            />
          </div>
        );
      }
    }

    // Handle header lines (### Title, ## Title, # Title)
    let isHeader = false;
    if (cleanLine.startsWith('#')) {
      isHeader = true;
      cleanLine = cleanLine.replace(/^#{1,6}\s*/, '');
    }

    // Handle bullet points: any dash '-', bullet '•', asterisk '*'
    let isBullet = false;
    if (/^[-*•]\s+/.test(cleanLine) || (/^[-*•]\s*(?=[A-Za-z0-9\p{Extended_Pictographic}])/u.test(cleanLine) && !/^-\d+([.,]\d+)?\s*(€|\$|EUR|USD|%)/i.test(cleanLine))) {
      isBullet = true;
      cleanLine = cleanLine.replace(/^[-*•]\s*/, '');
    }

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    function parseBoldParts(raw: string): React.ReactNode[] {
      const boldParts: React.ReactNode[] = [];
      const formattingRegex = /(\*{3}|_{3})(.*?)\1|(\*{2}|_{2})(.*?)\3|(\*|_)(?!\s)(.*?)(?<!\s)\5|(`)(.*?)\7/g;
      let bMatch;
      let lastBIndex = 0;

      while ((bMatch = formattingRegex.exec(raw)) !== null) {
        if (bMatch.index > lastBIndex) {
          boldParts.push(raw.substring(lastBIndex, bMatch.index));
        }

        if (bMatch[1] && bMatch[2]) {
          boldParts.push(
            <strong key={`bi-${lineIdx}-${bMatch.index}`} className={defaultBoldClass}>
              <em className="italic">{bMatch[2]}</em>
            </strong>
          );
        } else if (bMatch[3] && bMatch[4]) {
          boldParts.push(
            <strong key={`b-${lineIdx}-${bMatch.index}`} className={defaultBoldClass}>
              {bMatch[4]}
            </strong>
          );
        } else if (bMatch[5] && bMatch[6]) {
          boldParts.push(
            <em key={`i-${lineIdx}-${bMatch.index}`} className="italic font-medium text-slate-900">
              {bMatch[6]}
            </em>
          );
        } else if (bMatch[7] && bMatch[8]) {
          boldParts.push(
            <code key={`c-${lineIdx}-${bMatch.index}`} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">
              {bMatch[8]}
            </code>
          );
        }

        lastBIndex = formattingRegex.lastIndex;
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
        const safeUrl = safeExternalHref(match[2]);
        if (safeUrl) {
          parts.push(
            <a
              key={`link-${lineIdx}-${match.index}`}
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:underline font-bold inline-flex items-center gap-1 mx-0.5 bg-brand-blue/10 px-2 py-0.5 rounded text-xs transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{title}</span>
              <ExternalLink className="w-3 h-3 shrink-0 inline" />
            </a>
          );
        } else {
          parts.push(title);
        }
      } else if (match[3]) {
        const safeRawUrl = safeExternalHref(match[3]);
        if (safeRawUrl) {
          parts.push(
            <a
              key={`rawlink-${lineIdx}-${match.index}`}
              href={safeRawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:underline font-bold inline-flex items-center gap-1 mx-0.5 break-all transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{safeRawUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0 inline" />
            </a>
          );
        }
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < cleanLine.length) {
      parts.push(...parseBoldParts(cleanLine.substring(lastIndex)));
    }

    if (isHeader) {
      return (
        <div key={lineIdx} className="text-base sm:text-lg font-bold text-slate-950 pt-2 pb-1">
          {parts}
        </div>
      );
    }

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-1 leading-relaxed">
          <span className={cn(bulletDotClass, "font-extrabold mt-0.5 select-none leading-none shrink-0")}>•</span>
          <span className="flex-1">{parts}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} className="leading-relaxed">
        {parts}
      </div>
    );
  });
}

export function SimpleMarkdown({ children }: { children: string }) {
  if (!children) return null;
  const cleaned = cleanDuplicateEmojis(children);
  const parsed = parseDescriptionSections(cleaned);

  // If there is any content in fullDescription, expect, perfectFor, goodToKnow or moreInfo, render with canonical structured cards
  if (parsed.fullDescription || parsed.expect || parsed.perfectFor || parsed.goodToKnow || parsed.moreInfo) {
    return (
      <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 not-italic">
        {parsed.fullDescription && (
          <div className="space-y-1.5 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-indigo-950 text-xs uppercase tracking-wider">
              <span>📝 DESCRIPTION</span>
            </div>
            <div className="space-y-1 leading-relaxed text-slate-800 font-normal">
              {renderFormattedContent(parsed.fullDescription, "font-extrabold text-slate-950", "text-indigo-600")}
            </div>
          </div>
        )}

        {parsed.expect && (
          <div className="space-y-1.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-brand-blue text-xs uppercase tracking-wider">
              <span>✨ WHAT TO EXPECT</span>
            </div>
            <div className="space-y-1 leading-relaxed text-slate-700 font-normal">
              {renderFormattedContent(parsed.expect, "font-extrabold text-slate-950", "text-brand-blue")}
            </div>
          </div>
        )}

        {parsed.perfectFor && (
          <div className="space-y-1.5 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs uppercase tracking-wider">
              <span>🎯 PERFECT FOR</span>
            </div>
            <div className="space-y-1.5 leading-relaxed text-emerald-950 font-normal">
              {parsed.perfectFor.split('\n').map(line => line.trim()).filter(Boolean).map((line, idx) => {
                const cleanItem = line.replace(/^[\s\-*•\d\.]+\s*/, '');
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-extrabold mt-0.5">•</span>
                    <span className="flex-1">{renderFormattedContent(cleanItem, "font-extrabold text-emerald-950", "text-emerald-600")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {parsed.goodToKnow && (
          <div className="space-y-1.5 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs uppercase tracking-wider">
              <span>💡 GOOD TO KNOW</span>
            </div>
            <div className="space-y-1.5 leading-relaxed text-amber-950 font-normal">
              {parsed.goodToKnow.split('\n').map(line => line.trim()).filter(Boolean).map((line, idx) => {
                const cleanItem = line.replace(/^[\s\-*•\d\.]+\s*/, '');
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-extrabold mt-0.5">•</span>
                    <span className="flex-1">{renderFormattedContent(cleanItem, "font-extrabold text-amber-950", "text-amber-600")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {parsed.moreInfo && (
          <div className="space-y-1.5 bg-sky-50/60 p-4 rounded-2xl border border-sky-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 font-black text-sky-900 text-xs uppercase tracking-wider">
              <span>🔗 MORE INFO</span>
            </div>
            <div className="space-y-1 leading-relaxed text-sky-950 font-normal">
              {renderFormattedContent(parsed.moreInfo, "font-extrabold text-sky-950", "text-sky-600")}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-slate-700 leading-relaxed text-xs sm:text-sm">
      {renderFormattedContent(cleaned, "font-bold text-slate-900", "text-brand-blue")}
    </div>
  );
}

export const AdminAiEventSearch: React.FC<AdminAiEventSearchProps> = ({ onRefetchEvents, setMsg, onEditEvent, setDiscoveredEventTitle }) => {
  const [activeSubTab, setActiveSubTab] = useState<'live_search' | 'db_repository' | 'published_events'>('live_search');

  // Autonomous Events Agent console state
  const [agentMode, setAgentMode] = useState<'weekly_hunt' | 'custom_search'>('weekly_hunt');
  const [huntTimeframe, setHuntTimeframe] = useState<'this_weekend' | 'next_14_days' | 'next_30_days' | 'custom_month'>('next_14_days');
  const [aiQuery, setAiQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isExpatFocus, setIsExpatFocus] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState('');
  const [discoveredEvents, setDiscoveredEvents] = useState<GroundedEvent[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [agentAudit, setAgentAudit] = useState<AgentRunAudit | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  // Live Google Search Grounding model selection
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>('auto');
  const [modelUsedInResults, setModelUsedInResults] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  // Single-event live fact-checker state
  const [verifyingEventId, setVerifyingEventId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, LiveVerifyVerdict>>({});

  // Daily Ops: Expired Cleanup & Weekend Push Composer
  const [isCleaningExpired, setIsCleaningExpired] = useState(false);
  const [showWeekendPushModal, setShowWeekendPushModal] = useState(false);
  const [isGeneratingPush, setIsGeneratingPush] = useState(false);
  const [weekendPushDraft, setWeekendPushDraft] = useState<WeekendPushDraft | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Selective repository placement states
  const [repoStoredIds, setRepoStoredIds] = useState<Record<string, boolean>>({});
  const [selectedEventIds, setSelectedEventIds] = useState<Record<string, boolean>>({});
  const [addingToRepoId, setAddingToRepoId] = useState<string | null>(null);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'high_confidence' | 'unadded' | 'in_repo'>('all');

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
    fetch('/api/search-config')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.gemini_configured === 'boolean') {
          setGeminiConfigured(data.gemini_configured);
        }
      })
      .catch(err => console.warn('Could not check search config:', err));
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
  const [editDescription, setEditDescription] = useState('');
  const [editDescMode, setEditDescMode] = useState<'sections' | 'raw'>('sections');
  const [editFullDescription, setEditFullDescription] = useState('');
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
    
    const rawDesc = ev.description || '';
    const parsed = parseDescriptionSections(rawDesc);
    setEditFullDescription(parsed.fullDescription || '');
    setEditExpect(parsed.expect || '');
    setEditPerfectFor(parsed.perfectFor || '');
    setEditGoodToKnow(parsed.goodToKnow || '');
    setEditMoreInfo(parsed.moreInfo || '');
    setEditDescription(rawDesc);
    setEditDescMode('sections');
  };

  const closeEditModal = () => {
    setEditingEvent(null);
  };

  const getCompiledDescription = () => {
    if (editDescMode === 'sections') {
      const parts: string[] = [];
      if (editFullDescription.trim()) {
        parts.push(`### 📝 Description\n${editFullDescription.trim()}`);
      }
      if (editExpect.trim()) {
        parts.push(`### ✨ What to expect\n${editExpect.trim()}`);
      }
      if (editPerfectFor.trim()) {
        parts.push(`### 🎯 Perfect for\n${editPerfectFor.trim()}`);
      }
      if (editGoodToKnow.trim()) {
        parts.push(`### 💡 Good to know\n${editGoodToKnow.trim()}`);
      }
      if (editMoreInfo.trim()) {
        parts.push(`### 🔗 More info\n${editMoreInfo.trim()}`);
      }
      return cleanDuplicateEmojis(parts.join('\n\n'));
    }
    return cleanDuplicateEmojis(editDescription.trim());
  };

  const handleSaveEditInMemory = () => {
    if (!editingEvent) return;
    const newDescription = getCompiledDescription();
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
    if (activeSubTab === 'db_repository') {
      eventService.updateDiscoveredEventByTitle(editingEvent.title, updatedEv).catch(err => console.error("Failed to update repository event in Supabase:", err));
    }
    if (activeSubTab === 'published_events') {
      setPublishedEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEv : e));
      eventService.updateEvent(editingEvent.id, updatedEv).catch(err => console.error("Failed to update published event in Supabase:", err));
      if (onRefetchEvents) onRefetchEvents();
    }
    setEditingEvent(null);
    setMsg?.({ type: 'success', text: 'Event updated successfully with your customized sections.' });
  };

  const handleSaveAndPublish = async () => {
    if (!editingEvent) return;
    const newDescription = getCompiledDescription();
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

  const runAgentMission = async (options: {
    mode: 'weekly_hunt' | 'custom_search';
    queryOverride?: string;
    monthOverride?: string;
    categoryOverride?: string;
    modelOverride?: string;
    expatOverride?: boolean;
    timeframeOverride?: 'this_weekend' | 'next_14_days' | 'next_30_days' | 'custom_month';
  }) => {
    const q = (options.queryOverride !== undefined ? options.queryOverride : aiQuery).trim();
    const m = options.monthOverride || selectedMonth;
    const cat = options.categoryOverride !== undefined ? options.categoryOverride : selectedCategory;
    const targetModel = options.modelOverride || selectedGeminiModel;
    const targetExpatFocus = options.expatOverride !== undefined ? options.expatOverride : isExpatFocus;
    const targetTimeframe = options.timeframeOverride || huntTimeframe;

    if (options.mode === 'custom_search' && !q) return;

    if (options.queryOverride !== undefined) setAiQuery(options.queryOverride);
    if (options.monthOverride) setSelectedMonth(options.monthOverride);
    if (options.categoryOverride !== undefined) setSelectedCategory(options.categoryOverride);
    if (options.modelOverride) setSelectedGeminiModel(options.modelOverride);
    if (options.expatOverride !== undefined) setIsExpatFocus(options.expatOverride);
    if (options.timeframeOverride) setHuntTimeframe(options.timeframeOverride);

    setIsSearching(true);
    setErrorMsg(null);
    setSummary(null);
    setFallbackNotice(null);
    setAgentAudit(null);
    setVerificationResults({});

    if (options.mode === 'weekly_hunt') {
      setSearchStep('Layer 1/4 — Harvesting live official Valencia portals (VisitValència, Meetup, IVAM, La Rambleta, local agendas)...');
    } else {
      setSearchStep(`Layer 1/4 — Fetching live Valencia event portals & news for "${q.slice(0, 60)}"...`);
    }

    const timer1 = setTimeout(() => {
      setSearchStep('Layer 2/4 — Extracting structured events strictly bound to live sources & future dates (Europe/Madrid)...');
    }, 2400);

    const timer2 = setTimeout(() => {
      setSearchStep('Layer 3/4 — Cross-checking existing Supabase events for semantic duplicates...');
    }, 5200);

    const timer3 = setTimeout(() => {
      setSearchStep('Layer 4/4 — Verifying official URLs & images live and computing confidence scores...');
    }, 8200);

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

      const existingEventsPayload = [...dbEvents, ...aiDiscoveredDbEvents]
        .filter((e) => e && e.title)
        .map((e) => ({
          title: String(e.title),
          start_date: e.start_date || e.date || null
        }));

      const existingTitles = existingEventsPayload.map((e) => e.title);

      const endpoint = options.mode === 'weekly_hunt' ? '/api/events-agent/weekly-hunt' : '/api/search-events';
      const payload =
        options.mode === 'weekly_hunt'
          ? {
              mode: 'weekly_hunt',
              timeframe: targetTimeframe === 'custom_month' ? undefined : targetTimeframe,
              month: targetTimeframe === 'custom_month' ? m : undefined,
              expatFocus: targetExpatFocus,
              existingEvents: existingEventsPayload,
              existingTitles,
              preferredModel: targetModel
            }
          : {
              mode: 'custom_search',
              query: q,
              month: m,
              category: cat,
              expatFocus: targetExpatFocus,
              existingEvents: existingEventsPayload,
              existingTitles,
              preferredModel: targetModel
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error occurred during live grounded event verification.');
      }

      const data = await res.json();
      const rawEvents: GroundedEvent[] = data.events || [];

      if (data.model_used) setModelUsedInResults(data.model_used);
      if (data.audit) setAgentAudit(data.audit);
      if (data.fallback_triggered && data.fallback_reason) {
        setFallbackNotice(data.fallback_reason);
      } else {
        setFallbackNotice(null);
      }

      const repoNormMap: Record<string, boolean> = {};
      aiDiscoveredDbEvents.forEach(e => {
        if (e.title) repoNormMap[e.title.toLowerCase().replace(/[^\w]/g, '')] = true;
      });

      const pubNormMap: Record<string, boolean> = {};
      dbEvents.forEach(e => {
        if (e.title) pubNormMap[e.title.toLowerCase().replace(/[^\w]/g, '')] = true;
      });

      const initialRepoState: Record<string, boolean> = {};
      const initialSavedState: Record<string, boolean> = {};

      rawEvents.forEach(ev => {
        const norm = ev.title.toLowerCase().replace(/[^\w]/g, '');
        if (repoNormMap[norm]) initialRepoState[ev.id] = true;
        if (pubNormMap[norm]) initialSavedState[ev.id] = true;
      });

      setRepoStoredIds(initialRepoState);
      setSavedEventIds(initialSavedState);
      setSelectedEventIds({});
      setResultsFilter('all');
      setDiscoveredEvents(rawEvents);
      setSummary(data.summary || null);

      if (!rawEvents || rawEvents.length === 0) {
        setMsg?.({
          type: 'error',
          text: data.summary || 'No new verified upcoming events passed strict anti-hallucination checks.'
        });
      } else {
        const highCount = rawEvents.filter(ev => ev.verification_level === 'high').length;
        setMsg?.({
          type: 'success',
          text: `Verified ${rawEvents.length} real upcoming events (${highCount} high-confidence 80%+).`
        });
      }
    } catch (err: any) {
      console.error('Admin Events Agent Error:', err);
      setErrorMsg(err.message || 'Unable to run the Events Agent right now.');
      setMsg?.({ type: 'error', text: err.message || 'Error executing Events Agent.' });
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsSearching(false);
      setSearchStep('');
    }
  };

  const handleSearch = async (queryOverride?: string, monthOverride?: string, categoryOverride?: string, modelOverride?: string, expatOverride?: boolean) => {
    return runAgentMission({
      mode: 'custom_search',
      queryOverride,
      monthOverride,
      categoryOverride,
      modelOverride,
      expatOverride
    });
  };

  const handleVerifyEventLive = async (ev: GroundedEvent) => {
    setVerifyingEventId(ev.id);
    try {
      const res = await fetch('/api/events-agent/verify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ev.title,
          start_date: ev.start_date || ev.date || null,
          end_date: ev.end_date || null,
          start_time: ev.start_time || ev.time || null,
          location: ev.location || null,
          price: ev.price || null,
          ticket_url: ev.ticket_url || ev.sources?.[0]?.url || null
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Live fact-check failed.');
      }
      const verdict: LiveVerifyVerdict = await res.json();
      setVerificationResults(prev => ({ ...prev, [ev.id]: verdict }));
      setMsg?.({
        type: verdict.status === 'cancelled' || verdict.status === 'unverified' ? 'error' : 'success',
        text: `Live check for "${ev.title}": ${verdict.status.replace('_', ' ').toUpperCase()} (${verdict.confidence_score}%).`
      });
    } catch (err: any) {
      setMsg?.({ type: 'error', text: err.message || 'Could not re-verify this event live.' });
    } finally {
      setVerifyingEventId(null);
    }
  };

  const handleApplyVerificationCorrections = async (ev: GroundedEvent, verdict: LiveVerifyVerdict) => {
    const corr = verdict.corrections || {};
    const updated: GroundedEvent = {
      ...ev,
      start_date: corr.start_date || ev.start_date,
      date: corr.start_date || ev.date,
      start_time: corr.start_time || ev.start_time,
      time: corr.start_time || ev.time,
      location: corr.location || ev.location,
      price: corr.price || ev.price,
      ticket_url: corr.ticket_url || ev.ticket_url,
      confidence_score: Math.max(ev.confidence_score || 0, verdict.confidence_score),
      verification_level: verdict.confidence_score >= 80 ? 'high' : ev.verification_level,
      sources: verdict.verified_sources?.length ? verdict.verified_sources : ev.sources
    };

    setDiscoveredEvents(prev => prev.map(item => item.id === ev.id ? updated : item));
    setDbDiscoveredEvents(prev => prev.map(item => item.id === ev.id ? updated : item));
    setPublishedEvents(prev => prev.map(item => item.id === ev.id ? updated : item));

    try {
      if (activeSubTab === 'db_repository') {
        await eventService.updateDiscoveredEventByTitle(ev.title, updated);
      } else if (activeSubTab === 'published_events') {
        await eventService.updateEvent(ev.id, updated);
        if (onRefetchEvents) await onRefetchEvents();
      }
      setVerificationResults(prev => ({
        ...prev,
        [ev.id]: { ...verdict, status: 'confirmed', corrections: {} }
      }));
      setMsg?.({ type: 'success', text: `Applied verified corrections to "${ev.title}".` });
    } catch (err: any) {
      setMsg?.({ type: 'error', text: 'Updated locally, but failed to persist corrections: ' + (err?.message || '') });
    }
  };

  const expiredPublishedEvents = publishedEvents.filter(ev => isEventExpired(ev));
  const upcomingWeekendEvents = publishedEvents.filter(ev => !isEventExpired(ev) && isEventMatchingDateFilter(ev, 'weekend'));

  const handleCleanupAllExpired = async () => {
    if (expiredPublishedEvents.length === 0) return;
    if (!window.confirm(`Unpublish and archive ${expiredPublishedEvents.length} expired event(s) from the live catalog?`)) {
      return;
    }
    setIsCleaningExpired(true);
    let cleaned = 0;
    try {
      for (const ev of expiredPublishedEvents) {
        await eventService.deleteEvent(ev.id, ev.title);
        await eventService.unmarkDiscoveredAsPublished(ev.title, ev);
        cleaned++;
      }
      await fetchPublishedEvents();
      await fetchDbRepository();
      if (onRefetchEvents) await onRefetchEvents();
      setMsg?.({ type: 'success', text: `Cleaned up ${cleaned} expired event(s) from the live app.` });
    } catch (err: any) {
      setMsg?.({ type: 'error', text: `Cleaned ${cleaned} event(s), then encountered an error: ${err?.message || ''}` });
    } finally {
      setIsCleaningExpired(false);
    }
  };

  const handleGenerateWeekendPush = async () => {
    const sourceEvents = upcomingWeekendEvents.length > 0
      ? upcomingWeekendEvents
      : publishedEvents.filter(ev => !isEventExpired(ev)).slice(0, 6);

    if (sourceEvents.length === 0) {
      setMsg?.({ type: 'error', text: 'Publish at least one upcoming event first to generate a weekend push draft.' });
      return;
    }

    setShowWeekendPushModal(true);
    setIsGeneratingPush(true);
    setWeekendPushDraft(null);
    try {
      const res = await fetch('/api/events-agent/weekend-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: sourceEvents.slice(0, 8).map(ev => ({
            title: ev.title,
            start_date: ev.start_date || ev.date,
            category: ev.category,
            location: ev.location,
            is_free: ev.is_free
          }))
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not generate weekend push draft.');
      }
      const data: WeekendPushDraft = await res.json();
      setWeekendPushDraft(data);
    } catch (err: any) {
      setMsg?.({ type: 'error', text: err.message || 'Failed to draft weekend push.' });
      setShowWeekendPushModal(false);
    } finally {
      setIsGeneratingPush(false);
    }
  };

  const handleCopyText = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(prev => (prev === fieldId ? null : prev)), 2000);
    }).catch(() => {});
  };

  const handleAddToRepository = async (ev: GroundedEvent) => {
    setAddingToRepoId(ev.id);
    try {
      await eventService.saveDiscoveredEvents([ev], aiQuery, selectedMonth);
      setRepoStoredIds(prev => ({ ...prev, [ev.id]: true }));
      setSelectedEventIds(prev => {
        const next = { ...prev };
        delete next[ev.id];
        return next;
      });
      await fetchDbRepository();
      setMsg?.({
        type: 'success',
        text: `"${ev.title}" has been placed into the repository!`
      });
    } catch (err: any) {
      console.error('Error adding event to repository:', err);
      setMsg?.({
        type: 'error',
        text: `Failed to add "${ev.title}" to repository.`
      });
    } finally {
      setAddingToRepoId(null);
    }
  };

  const handleAddSelectedToRepository = async () => {
    const selectedList = discoveredEvents.filter(ev => selectedEventIds[ev.id] && !repoStoredIds[ev.id]);
    if (selectedList.length === 0) return;

    setIsBatchAdding(true);
    try {
      await eventService.saveDiscoveredEvents(selectedList, aiQuery, selectedMonth);
      const newRepoState = { ...repoStoredIds };
      selectedList.forEach(ev => {
        newRepoState[ev.id] = true;
      });
      setRepoStoredIds(newRepoState);
      setSelectedEventIds({});
      await fetchDbRepository();
      setMsg?.({
        type: 'success',
        text: `${selectedList.length} events added to the repository!`
      });
    } catch (err: any) {
      console.error('Error adding selected events to repository:', err);
      setMsg?.({
        type: 'error',
        text: 'Failed to add selected events to repository.'
      });
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleAddAllToRepository = async () => {
    const unstoredList = discoveredEvents.filter(ev => !repoStoredIds[ev.id]);
    if (unstoredList.length === 0) return;

    setIsBatchAdding(true);
    try {
      await eventService.saveDiscoveredEvents(unstoredList, aiQuery, selectedMonth);
      const newRepoState = { ...repoStoredIds };
      unstoredList.forEach(ev => {
        newRepoState[ev.id] = true;
      });
      setRepoStoredIds(newRepoState);
      setSelectedEventIds({});
      await fetchDbRepository();
      setMsg?.({
        type: 'success',
        text: `All ${unstoredList.length} events added to the repository!`
      });
    } catch (err: any) {
      console.error('Error adding all events to repository:', err);
      setMsg?.({
        type: 'error',
        text: 'Failed to add all events to repository.'
      });
    } finally {
      setIsBatchAdding(false);
    }
  };

  const toggleSelectEvent = (id: string) => {
    setSelectedEventIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    discoveredEvents.forEach(ev => {
      if (!repoStoredIds[ev.id]) {
        next[ev.id] = true;
      }
    });
    setSelectedEventIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedEventIds({});
  };

  const handleDismissDiscoveredEvent = (id: string) => {
    setDiscoveredEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEventIds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
    if (!window.confirm(`Are you sure you want to delete "${title}" from the AI Discovered repository?`)) {
      return;
    }
    
    // Optimistic update
    setDbDiscoveredEvents(prev => prev.filter(item => String(item.id) !== String(id) && item.title !== title));
    setMsg?.({ type: 'success', text: `Event "${title}" removed from repository.` });

    try {
      await eventService.deleteDiscoveredEvent(String(id), title);
    } catch (err: any) {
      console.error("Deletion error:", err);
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

      {/* SUB-TAB 1: AUTONOMOUS EVENTS AGENT COCKPIT */}
      {activeSubTab === 'live_search' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-slate-900 via-brand-navy to-slate-900 text-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/20 border border-brand-blue/30 text-sky-300 text-xs font-bold">
                  <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
                  <span>Autonomous Events Agent • Live Valencia Web Grounding</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-3.5 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4-Layer Anti-Hallucination Pipeline • Zero Fabricated Fallbacks</span>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
                    Zero-Hallucination Valencia Events Agent
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                    Harvests live official Valencia portals (VisitValència, Meetup, IVAM, La Rambleta, Valencia Secreta & Bonita), binds every card to an exact live page, rejects past dates, and deduplicates against your database.
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex bg-white/10 p-1 rounded-2xl border border-white/15 shrink-0 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => setAgentMode('weekly_hunt')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      agentMode === 'weekly_hunt'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Autonomous Hunt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentMode('custom_search')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      agentMode === 'custom_search'
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Targeted Search</span>
                  </button>
                </div>
              </div>

              {/* MODE A: 1-CLICK AUTONOMOUS WEEKLY HUNT */}
              {agentMode === 'weekly_hunt' ? (
                <div className="bg-white/[0.06] border border-white/15 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                        Live Official Sources: VisitValència • Meetup Valencia • IVAM • La Rambleta • Valencia Secreta & Bonita
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { id: 'this_weekend' as const, label: 'This Weekend' },
                          { id: 'next_14_days' as const, label: 'Next 14 Days' },
                          { id: 'next_30_days' as const, label: 'Next 30 Days' },
                          { id: 'custom_month' as const, label: 'Specific Month' }
                        ].map((tf) => (
                          <button
                            key={tf.id}
                            type="button"
                            onClick={() => setHuntTimeframe(tf.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              huntTimeframe === tf.id
                                ? 'bg-white text-slate-900 border-white shadow-sm'
                                : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                            }`}
                          >
                            {tf.label}
                          </button>
                        ))}

                        {huntTimeframe === 'custom_month' && (
                          <div className="relative">
                            <select
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(e.target.value)}
                              className="pl-3 pr-8 py-2 bg-slate-800 text-white rounded-xl border border-white/20 text-xs font-bold appearance-none cursor-pointer"
                            >
                              {MONTH_OPTIONS.map((m) => (
                                <option key={m} value={m} className="bg-slate-900 text-white">
                                  {m}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={() => runAgentMission({ mode: 'weekly_hunt' })}
                      className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Harvesting & Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Run Weekly Hunt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* MODE B: TARGETED CUSTOM SEARCH */
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="relative md:col-span-5">
                      <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="E.g. Jazz concerts, IVAM exhibitions, expat meetups in Valencia..."
                        className="w-full pl-12 pr-4 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-slate-400 rounded-2xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-sm font-medium"
                      />
                    </div>

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

                    <div className="relative md:col-span-2">
                      <Calendar className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full pl-10 pr-8 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white rounded-2xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-xs sm:text-sm font-bold appearance-none cursor-pointer"
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m} value={m} className="bg-slate-900 text-white font-medium">
                            {m}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching || !aiQuery.trim()}
                      className="md:col-span-2 px-6 py-3.5 bg-brand-blue hover:bg-sky-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-brand-blue/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-sky-200" />
                          <span>Search & Verify</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Category quick buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SEARCH_CATEGORIES.map((c) => {
                      const isSelected = selectedCategory === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c.id);
                            setAiQuery(c.query);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 text-white border-sky-300 shadow-md shadow-sky-500/30'
                              : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200 hover:text-white'
                          }`}
                        >
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </form>
              )}

              {/* Shared Agent Settings Row (Model + Expat Focus + Live Grounding Status) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                      Engine:
                    </span>
                    <div className="relative">
                      <select
                        value={selectedGeminiModel}
                        onChange={(e) => setSelectedGeminiModel(e.target.value)}
                        className="pl-3 pr-7 py-1.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white rounded-xl border border-white/15 focus:border-brand-blue focus:outline-none transition-all text-xs font-bold appearance-none cursor-pointer"
                      >
                        <option value="auto" className="bg-slate-900 text-white font-medium">
                          Auto (Gemini 4 Flash + Live Official Valencia Portals)
                        </option>
                        <option value="gemini-4-hydrogen" className="bg-slate-900 text-white font-medium">
                          Gemini 4 Flash + Live Web Grounding (Max Precision)
                        </option>
                        <option value="gemini-3.1-flash-lite" className="bg-slate-900 text-white font-medium">
                          Gemini 3.1 Flash-Lite + Live Web Grounding (Fast)
                        </option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Expat Focus Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsExpatFocus(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isExpatFocus
                        ? 'bg-teal-500/25 text-teal-200 border-teal-400/40'
                        : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Expat & International Focus: {isExpatFocus ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className={`w-2 h-2 rounded-full ${geminiConfigured === false ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span>
                    {geminiConfigured === false
                      ? 'Gemini API key missing on server'
                      : 'Live Valencia Web Grounding Ready'}
                  </span>
                </div>
              </div>

              {fallbackNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{fallbackNotice}</span>
                </div>
              )}

              {isSearching && (
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-100">{searchStep}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transparent Agent Verification Audit Strip */}
          {agentAudit && (
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Anti-Hallucination Audit Report • {agentAudit.date_window.label}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {agentAudit.missions_succeeded}/{agentAudit.missions_run} grounded missions • {agentAudit.grounding_sources_count} live web citations
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3">
                  <p className="text-lg font-extrabold text-emerald-900">{discoveredEvents.length}</p>
                  <p className="text-[11px] font-bold text-emerald-700">
                    Verified Events ({agentAudit.high_confidence_count} at 80%+)
                  </p>
                </div>
                <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3">
                  <p className="text-lg font-extrabold text-sky-900">{agentAudit.filtered_duplicates_count}</p>
                  <p className="text-[11px] font-bold text-sky-700">Duplicates Skipped</p>
                </div>
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3">
                  <p className="text-lg font-extrabold text-amber-900">
                    {agentAudit.rejected_past_or_invalid_count + agentAudit.rejected_unverified_count}
                  </p>
                  <p className="text-[11px] font-bold text-amber-700">Past or Unverified Blocked</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <p className="text-lg font-extrabold text-slate-900">
                    {agentAudit.live_urls_reachable}/{agentAudit.live_urls_checked}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600">Live Official Links Verified</p>
                </div>
              </div>
            </div>
          )}

          {/* Discovered Events Grid */}
          {discoveredEvents.length > 0 && (() => {
            const repoStoredCount = discoveredEvents.filter(ev => repoStoredIds[ev.id]).length;
            const unstoredCount = discoveredEvents.filter(ev => !repoStoredIds[ev.id]).length;
            const highConfCount = discoveredEvents.filter(ev => (ev.confidence_score || 0) >= 80).length;
            const selectedCount = Object.keys(selectedEventIds).filter(id => selectedEventIds[id] && !repoStoredIds[id]).length;
            const isAllSelected = unstoredCount > 0 && selectedCount === unstoredCount;

            const visibleEvents = discoveredEvents.filter(ev => {
              if (resultsFilter === 'high_confidence') return (ev.confidence_score || 0) >= 80;
              if (resultsFilter === 'unadded') return !repoStoredIds[ev.id];
              if (resultsFilter === 'in_repo') return repoStoredIds[ev.id];
              return true;
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900 flex flex-wrap items-center gap-2.5">
                      <BadgeCheck className="w-6 h-6 text-emerald-600" />
                      <span>Verified Upcoming Events ({discoveredEvents.length})</span>
                      {isExpatFocus && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-teal-600" />
                          <span>Expat Focus</span>
                        </span>
                      )}
                      {modelUsedInResults && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-brand-blue" />
                          <span>{modelUsedInResults}</span>
                        </span>
                      )}
                    </h3>
                    {summary && <p className="text-xs sm:text-sm text-slate-500 font-medium">{summary}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-0.5">
                      <button
                        type="button"
                        onClick={() => setResultsFilter('all')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          resultsFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({discoveredEvents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultsFilter('high_confidence')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          resultsFilter === 'high_confidence' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        80%+ Verified ({highConfCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultsFilter('unadded')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          resultsFilter === 'unadded' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pending ({unstoredCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultsFilter('in_repo')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          resultsFilter === 'in_repo' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        In Repo ({repoStoredCount})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setDiscoveredEvents([]); setSummary(null); setAgentAudit(null); }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 underline uppercase tracking-wider ml-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Selective Placement Control Banner */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white">Choose verified events for the Repository</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          {repoStoredCount} in Repository
                        </span>
                        {unstoredCount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            {unstoredCount} Pending Choice
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Review confidence scores & official links, then place your favorites into the repository or edit directly.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {unstoredCount > 0 && (
                      <button
                        type="button"
                        onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isAllSelected ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Deselect All</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span>Select All Pending ({unstoredCount})</span>
                          </>
                        )}
                      </button>
                    )}

                    {selectedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleAddSelectedToRepository}
                        disabled={isBatchAdding}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                      >
                        {isBatchAdding ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Place Selected ({selectedCount})</span>
                          </>
                        )}
                      </button>
                    )}

                    {unstoredCount > 0 && selectedCount === 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllToRepository}
                        disabled={isBatchAdding}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Add All ({unstoredCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {visibleEvents.length === 0 && (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      {resultsFilter === 'unadded' ? 'All events are already placed in your repository!' : 'No events match this filter.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setResultsFilter('all')}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Show All {discoveredEvents.length} Events
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {visibleEvents.map((event) => {
                    const isSaved = savedEventIds[event.id];
                    const isInRepo = repoStoredIds[event.id];
                    const isSelected = !!selectedEventIds[event.id];
                    const isAddingThis = addingToRepoId === event.id;
                    const isMapExpanded = expandedMapId === event.id;
                    const score = event.confidence_score ?? 80;
                    const isHighConf = event.verification_level === 'high' || score >= 80;
                    const verdict = verificationResults[event.id];
                    const isVerifyingThis = verifyingEventId === event.id;
                    const safeTicketUrl = safeExternalHref(event.ticket_url || event.sources?.[0]?.url);

                    return (
                      <div
                        key={event.id}
                        className={`bg-white rounded-[32px] border-2 transition-all shadow-sm hover:shadow-xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden relative group ${
                          isInRepo
                            ? 'border-emerald-300 bg-emerald-50/10 ring-1 ring-emerald-400/20'
                            : isSelected
                            ? 'border-sky-400 bg-sky-50/10 ring-2 ring-sky-400/30'
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Card Selection & Action Header */}
                          <div className="flex items-center justify-between gap-2 pb-1">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none group/chk">
                              <input
                                type="checkbox"
                                checked={isSelected || isInRepo}
                                disabled={isInRepo}
                                onChange={() => toggleSelectEvent(event.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-75"
                              />
                              <span className={`text-xs font-bold transition-colors ${
                                isInRepo ? 'text-emerald-700' : isSelected ? 'text-brand-blue font-extrabold' : 'text-slate-700 group-hover/chk:text-slate-900'
                              }`}>
                                {isInRepo ? '✓ In Repository' : isSelected ? 'Selected' : 'Select for Repository'}
                              </span>
                            </label>

                            {!isInRepo && (
                              <button
                                type="button"
                                onClick={() => handleDismissDiscoveredEvent(event.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Dismiss this event"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="relative h-52 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 group-hover:scale-[1.01] transition-transform duration-500">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />

                            <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-center min-w-[55px] flex flex-col justify-center items-center shadow-md">
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

                            <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1 justify-end max-w-[60%]">
                              {(event.category || 'Culture').split(/[,;/]/).map(s => s.trim()).filter(Boolean).map((cat, idx) => (
                                <span key={idx} className="bg-brand-blue/90 backdrop-blur text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md">
                                  {getCategoryWithEmoji(cat)}
                                </span>
                              ))}
                            </div>

                            {/* Verification Confidence Badge */}
                            <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between gap-1.5 flex-wrap">
                              <div className={`backdrop-blur border px-2.5 py-1 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 shadow-lg ${
                                isHighConf
                                  ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200'
                                  : 'bg-amber-950/90 border-amber-400/50 text-amber-200'
                              }`}>
                                {isHighConf ? (
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                <span>{isHighConf ? `Verified ${score}%` : `Check Details ${score}%`}</span>
                              </div>

                              {event.mission_label && (
                                <span className="bg-slate-900/85 backdrop-blur border border-white/15 text-slate-200 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                                  {event.mission_label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Compact Verification Proof Checklist */}
                          {event.verification_checks && (
                            <div className="flex flex-wrap gap-1.5">
                              {event.verification_checks.grounded_in_search && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> Search Grounded
                                </span>
                              )}
                              {event.verification_checks.source_url_live && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-bold">
                                  <Link2 className="w-3 h-3" /> Link Live
                                </span>
                              )}
                              {event.verification_checks.future_date_verified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold">
                                  <Calendar className="w-3 h-3" /> Future Date
                                </span>
                              )}
                              {event.verification_checks.specific_venue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                  <MapPin className="w-3 h-3" /> Exact Venue
                                </span>
                              )}
                            </div>
                          )}

                          {/* Live Fact-Check Verdict Box (if admin ran Re-verify Live) */}
                          {verdict && (
                            <div className={`p-3 rounded-2xl border text-xs space-y-2 ${
                              verdict.status === 'confirmed'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : verdict.status === 'needs_update'
                                ? 'bg-amber-50 border-amber-200 text-amber-950'
                                : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold uppercase tracking-wider text-[10px]">
                                  Live Check: {verdict.status.replace('_', ' ')} ({verdict.confidence_score}%)
                                </span>
                                {verdict.ticket_url_live !== null && (
                                  <span className="text-[10px] font-bold">
                                    Ticket URL: {verdict.ticket_url_live ? 'Alive' : 'Unreachable'}
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed text-[11px] font-medium">{verdict.summary}</p>
                              {Object.keys(verdict.corrections || {}).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyVerificationCorrections(event, verdict)}
                                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Apply Official Corrections
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                Valencia Event
                              </span>
                              {isSaved && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Published
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
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                {event.coordinates && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedMapId(isMapExpanded ? null : event.id)}
                                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <MapIcon className="w-3 h-3" />
                                    <span>{isMapExpanded ? 'Hide' : 'Pin'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {(event.price || safeTicketUrl || event.is_free !== undefined) && (
                            <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-orange-50/90 to-amber-50/80 border border-orange-200/90 rounded-2xl shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-200 flex items-center justify-center shrink-0">
                                  <Ticket className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="text-xs min-w-0">
                                  <span className="font-extrabold uppercase tracking-wide text-orange-950 mr-1.5">
                                    {event.is_free ? 'Free' : 'Tickets'}
                                  </span>
                                  <span className="font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-orange-200 text-[11px]">
                                    {event.price || (event.is_free ? 'Free' : 'Check Official Site')}
                                  </span>
                                </div>
                              </div>
                              {safeTicketUrl && (
                                <a
                                  href={safeTicketUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all shrink-0 active:scale-95"
                                >
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>{event.is_free ? 'RSVP' : 'Tickets'}</span>
                                  <ExternalLink className="w-3 h-3" />
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
                                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                Verified Official Web Citations
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {event.sources.map((src, sIdx) => {
                                  const safeSrcUrl = safeExternalHref(src.url);
                                  if (!safeSrcUrl) return null;
                                  return (
                                    <a
                                      key={sIdx}
                                      href={safeSrcUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200/80"
                                    >
                                      {src.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                      <span className="truncate max-w-[180px]">{src.title || 'Official Source'}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {isMapExpanded && event.coordinates && (
                            <div className="space-y-2 pt-3 border-t border-slate-100">
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

                        <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col gap-2">
                          {!isInRepo ? (
                            <button
                              type="button"
                              onClick={() => handleAddToRepository(event)}
                              disabled={isAddingThis}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
                            >
                              {isAddingThis ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Adding to Repository...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  <span>Add to Repository</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Saved in Repository</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!repoStoredIds[event.id]) {
                                  eventService.saveDiscoveredEvents([event], aiQuery || 'Weekly Autonomous Hunt', selectedMonth).then(() => {
                                    setRepoStoredIds(prev => ({ ...prev, [event.id]: true }));
                                    fetchDbRepository();
                                  });
                                }
                                if (onEditEvent) {
                                  onEditEvent(event as any);
                                } else {
                                  openEditModal(event);
                                }
                              }}
                              className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={isVerifyingThis}
                              onClick={() => handleVerifyEventLive(event)}
                              className="py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              title="Double-check official dates, venue & ticket link live via Google Search"
                            >
                              {isVerifyingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                              )}
                              <span>{isVerifyingThis ? 'Checking...' : 'Re-verify Live'}</span>
                            </button>
                          </div>
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

                        <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[65%]">
                          {(event.category || 'Culture').split(/[,;/]/).map(s => s.trim()).filter(Boolean).map((cat, idx) => (
                            <span key={idx} className="bg-slate-900/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                              {getCategoryWithEmoji(cat)}
                            </span>
                          ))}
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
                      {verificationResults[event.id] && (() => {
                        const verdict = verificationResults[event.id];
                        return (
                          <div className={`mt-3 p-3 rounded-2xl border text-xs space-y-2 ${
                            verdict.status === 'confirmed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : verdict.status === 'needs_update'
                              ? 'bg-amber-50 border-amber-200 text-amber-950'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <div className="font-extrabold uppercase tracking-wider text-[10px]">
                              Live Check: {verdict.status.replace('_', ' ')} ({verdict.confidence_score}%)
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed">{verdict.summary}</p>
                            {Object.keys(verdict.corrections || {}).length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApplyVerificationCorrections(event, verdict)}
                                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Apply Official Corrections
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditEvent ? onEditEvent(event) : openEditModal(event)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={verifyingEventId === event.id}
                        onClick={() => handleVerifyEventLive(event)}
                        className="flex-1 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="Fact-check live against Google Search"
                      >
                        {verifyingEventId === event.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        <span>{verifyingEventId === event.id ? 'Checking' : 'Verify'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDiscovered(event.id, event.title)}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer"
                        title="Delete from repository"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateWeekendPush}
                  disabled={isGeneratingPush}
                  className="px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 rounded-2xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>Draft Weekend Push ({upcomingWeekendEvents.length})</span>
                </button>

                <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-2xl border border-white/10 text-center">
                  <p className="text-2xl font-extrabold text-white">{publishedEvents.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Total Published</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expired Events Auto-Detector Banner */}
          {expiredPublishedEvents.length > 0 && (
            <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-amber-950">
                    {expiredPublishedEvents.length} Expired Published Event{expiredPublishedEvents.length > 1 ? 's' : ''} Detected
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Their end dates have already passed. Clean them up in one click to keep the Valencia calendar fresh.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCleaningExpired}
                onClick={handleCleanupAllExpired}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isCleaningExpired ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clean Up All Expired ({expiredPublishedEvents.length})</span>
                  </>
                )}
              </button>
            </div>
          )}

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
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border border-emerald-200/60 cursor-pointer"
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
                Events published from the Autonomous Events Agent or Repository will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublishedEvents.map(event => {
                const isExpired = isEventExpired(event);
                const verdict = verificationResults[event.id];
                return (
                  <div
                    key={event.id}
                    className={`bg-white rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                      isExpired ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Image Cover Header */}
                      <div className="h-44 relative bg-slate-100 overflow-hidden">
                        <img src={event.image || event.image_url} alt={event.title} className="w-full h-full object-cover" />

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

                        {isExpired ? (
                          <div className="absolute top-3 right-3 bg-amber-600 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-white" />
                            <span>Expired</span>
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Published</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold font-display text-slate-900 text-base leading-snug">
                            {event.title}
                          </h4>
                          <div className="flex flex-wrap gap-1 shrink-0 max-w-[50%] justify-end">
                            {(event.category || 'Culture').split(/[,;/]/).map((s: string) => s.trim()).filter(Boolean).map((cat: string, idx: number) => (
                              <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {getCategoryWithEmoji(cat)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {verdict && (
                          <div className={`p-3 rounded-2xl border text-xs space-y-2 ${
                            verdict.status === 'confirmed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : verdict.status === 'needs_update'
                              ? 'bg-amber-50 border-amber-200 text-amber-950'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <div className="font-extrabold uppercase tracking-wider text-[10px]">
                              Live Check: {verdict.status.replace('_', ' ')} ({verdict.confidence_score}%)
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed">{verdict.summary}</p>
                            {Object.keys(verdict.corrections || {}).length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApplyVerificationCorrections(event, verdict)}
                                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Apply Official Corrections
                              </button>
                            )}
                          </div>
                        )}

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
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

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
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={verifyingEventId === event.id}
                        onClick={() => handleVerifyEventLive(event)}
                        className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Check live whether date, venue, or status changed"
                      >
                        {verifyingEventId === event.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        <span>{verifyingEventId === event.id ? 'Checking' : 'Verify'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={unpublishingId === event.id || unpublishingId === event.title}
                        onClick={() => handleDeletePublished(event)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
                );
              })}
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

                {/* Event Description Section / 5 Boxes Editor */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                      Sections de l'événement (5 Cases)
                    </label>

                    {/* Mode Selector Toggle */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          if (editDescMode === 'raw') {
                            const p = parseDescriptionSections(editDescription);
                            setEditFullDescription(p.fullDescription);
                            setEditExpect(p.expect);
                            setEditPerfectFor(p.perfectFor);
                            setEditGoodToKnow(p.goodToKnow);
                            setEditMoreInfo(p.moreInfo);
                          }
                          setEditDescMode('sections');
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          editDescMode === 'sections' ? "bg-white text-brand-blue shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        5 Cases
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editDescMode === 'sections') {
                            setEditDescription(getCompiledDescription());
                          }
                          setEditDescMode('raw');
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          editDescMode === 'raw' ? "bg-white text-brand-blue shadow-xs" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Markdown brut
                      </button>
                    </div>
                  </div>

                  {editDescMode === 'sections' ? (
                    <div className="space-y-4">
                      {/* Box 0: Full Description */}
                      <div className="bg-indigo-50/40 p-3.5 rounded-2xl border border-indigo-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>📝 FULL DESCRIPTION</span>
                          </label>
                          <span className="text-[10px] text-indigo-600/70 font-medium">Présentation générale de l'événement</span>
                        </div>
                        <textarea
                          rows={3}
                          value={editFullDescription}
                          onChange={(e) => setEditFullDescription(e.target.value)}
                          placeholder="Description complète ou présentation générale de l'événement..."
                          className="w-full p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                        />
                      </div>

                      {/* Box 1: What to expect */}
                      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-brand-blue flex items-center gap-1.5 uppercase tracking-wider">
                            <span>✨ WHAT TO EXPECT</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Atmosphere, program, artists, experience</span>
                        </div>
                        <textarea
                          rows={3}
                          value={editExpect}
                          onChange={(e) => setEditExpect(e.target.value)}
                          placeholder="Description of atmosphere, guest artists, program highlights, activities..."
                          className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-brand-blue/20 resize-y"
                        />
                      </div>

                      {/* Box 2: Perfect for */}
                      <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>🎯 PERFECT FOR</span>
                          </label>
                          <span className="text-[10px] text-emerald-600/70 font-medium">Target audience (one per line with - or •)</span>
                        </div>
                        <textarea
                          rows={2}
                          value={editPerfectFor}
                          onChange={(e) => setEditPerfectFor(e.target.value)}
                          placeholder="- 🌍 Expats & newcomers in Valencia&#10;- 🎨 Art and live music lovers&#10;- 👥 Outings with friends or family"
                          className="w-full p-3 bg-white rounded-xl border border-emerald-200 text-xs text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                        />
                      </div>

                      {/* Box 3: Good to know */}
                      <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>💡 GOOD TO KNOW</span>
                          </label>
                          <span className="text-[10px] text-amber-600/70 font-medium">Tickets, timing, address, transport, parking</span>
                        </div>
                        <textarea
                          rows={3}
                          value={editGoodToKnow}
                          onChange={(e) => setEditGoodToKnow(e.target.value)}
                          placeholder="- 🎟️ **Tickets & Pricing**: 6€ / Free&#10;- 📍 **Venue & Location**: Address and hall&#10;- ⏰ **Schedule & Timing**: Doors open at 19:30&#10;- 🚇 **Access**: Metro line 3 / 5"
                          className="w-full p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-amber-500/20 resize-y"
                        />
                      </div>

                      {/* Box 4: More info */}
                      <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-sky-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>🔗 MORE INFO</span>
                          </label>
                          <span className="text-[10px] text-sky-600/70 font-medium">Official links, ticketing and contact</span>
                        </div>
                        <textarea
                          rows={2}
                          value={editMoreInfo}
                          onChange={(e) => setEditMoreInfo(e.target.value)}
                          placeholder="- 🌐 **Official Website**: [Venue Website](https://...)&#10;- 🎟️ **Tickets**: [Buy Tickets](https://...)"
                          className="w-full p-3 bg-white rounded-xl border border-sky-200 text-xs text-slate-900 leading-relaxed outline-none focus:ring-2 focus:ring-sky-500/20 resize-y"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Emoji Quick Picker */}
                      <div className="flex flex-wrap items-center gap-1 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1">Émoticônes :</span>
                        {['✨', '🎶', '🎭', '🎨', '🎟️', '🍷', '🥘', '🌟', '📍', '👥', '💡', '⏰', '🚇', '🅿️', '🌐', '🏃', '🤝'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditDescription(prev => prev ? `${prev} ${emoji} ` : `${emoji} `)}
                            className="px-1.5 py-0.5 hover:bg-white rounded text-sm transition-transform active:scale-125 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={8}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Write or paste the full event description here..."
                        className="w-full p-4 bg-white rounded-2xl border border-slate-200 text-xs font-medium leading-relaxed outline-none focus:border-brand-blue resize-y shadow-xs"
                      />
                    </div>
                  )}

                  {/* Live Article Preview in Edit Modal */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                        Article Preview (Same organization as Repository & Published)
                      </span>
                      <span className="text-[10px] text-brand-blue font-bold">Live Preview</span>
                    </div>
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <SimpleMarkdown>{getCompiledDescription() || 'No description yet.'}</SimpleMarkdown>
                    </div>
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

      {/* WEEKEND PUSH NOTIFICATION COMPOSER MODAL */}
      <AnimatePresence>
        {showWeekendPushModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[28px] max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowWeekendPushModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-slate-900">
                    Weekend Push & Recap Drafts
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated strictly from your real published upcoming events — zero invented titles.
                  </p>
                </div>
              </div>

              {isGeneratingPush ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-600">Drafting grounded push options from your published calendar...</p>
                </div>
              ) : weekendPushDraft ? (
                <div className="space-y-4">
                  {weekendPushDraft.options.map((opt, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                          Push Option {idx + 1} • {opt.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(`${opt.title}\n${opt.body}`, `opt-${idx}`)}
                          className="px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === `opt-${idx}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === `opt-${idx}` ? 'Copied!' : 'Copy Push'}</span>
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-900">{opt.title}</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{opt.body}</p>
                      </div>
                    </div>
                  ))}

                  {weekendPushDraft.community_post && (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                          Community / Social Weekend Recap
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(weekendPushDraft.community_post, 'community')}
                          className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'community' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'community' ? 'Copied!' : 'Copy Recap'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed">
                        {weekendPushDraft.community_post}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWeekendPushModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
