import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Logo } from './components/Logo';
import { 
  Home, 
  Search, 
  Calendar, 
  BookOpen, 
  User, 
  Plus, 
  Edit2,
  MapPin, 
  Star, 
  CheckCircle2, 
  MessageCircle,
  Instagram,
  Facebook,
  Link,
  Award, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Globe,
  ArrowLeft,
  Filter,
  Languages,
  ArrowRight,
  Clock,
  Euro,
  Heart,
  Bell,
  Lock,
  CreditCard,
  Gift,
  Shield,
  ShieldCheck,
  UserPlus,
  HelpCircle,
  Info,
  LogOut,
  ShoppingBag,
  Tag,
  Camera,
  RotateCcw,
  Loader2,
  Zap,
  Sparkles,
  Smile,
  GraduationCap,
  Settings,
  X,
  Upload,
  Mail,
  Phone,
  Rocket,
  AlertCircle,
  FileText,
  Trash2,
  Users,
  HeartPulse,
  Briefcase,
  Lightbulb,
  Trophy,
  Palmtree,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Send,
  Car,
  Smartphone,
  Shirt,
  Gamepad,
  Coffee,
  Building2,
  Fuel,
  Umbrella,
  Monitor,
  Armchair,
  Bike,
  MessageSquare,
  Check,
  MoreHorizontal,
  Eye,
  EyeOff,
  XCircle,
  Flag,
  Ban,
  ShieldAlert,
  Copy,
  AlertTriangle,
  Dog,
  Navigation,
  Megaphone,
  Database,
  Wrench,
  UserCheck,
  ThumbsUp
} from 'lucide-react';
import { storageService } from './lib/storage';
import { marketplaceService, Ad } from './services/marketplaceService';
import { compressImage } from './services/imageService';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { APIProvider, Map, AdvancedMarker, Pin, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { useProfessionals } from './hooks/useProfessionals';
import { proService } from './services/proService';
import { eventService } from './services/eventService';
import { authService, Profile } from './services/authService';
import { chatService, Conversation, Message } from './services/chatService';
import { ForgotPasswordOTP } from './components/ForgotPasswordOTP';

// Custom Tooth Icon matching screenshot
const ToothIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8 2 6 4 6 8c0 3.5 1.5 6 2.5 9 .8 2.4 1.5 5 3.5 5 1.2 0 1.8-.8 2-2 .2 1.2.8 2 2 2 2 0 2.7-2.6 3.5-5 1-3 2.5-5.5 2.5-9 0-4-2-6-6-6z" />
    <path d="M9 9c1.5 1 4.5 1 6 0" />
  </svg>
);

// Custom Cleaner Icon (Broom / Balai)
const CleanerIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 3L11.5 9.5" />
    <path d="M10 8l6 6" />
    <path d="M11.5 9.5L4 17l-1 4 4-1 7.5-7.5" />
    <path d="M6 18l3.5-3.5" />
    <path d="M8 20l3.5-3.5" />
  </svg>
);

const NOTIFICATION_ICONS = [
  { 
    id: 'dentist', 
    label: 'Dentist & Medical', 
    category: 'Trades & Health',
    icon: ToothIcon, 
    bgColor: 'bg-[#EBF3FF]', 
    textColor: 'text-[#2563EB]',
    borderColor: 'border-[#BFDBFE]'
  },
  { 
    id: 'cleaner', 
    label: 'Cleaner & Housekeeping', 
    category: 'Trades & Services',
    icon: CleanerIcon, 
    bgColor: 'bg-[#E6F7F0]', 
    textColor: 'text-[#059669]',
    borderColor: 'border-[#A7F3D0]'
  },
  { 
    id: 'wrench', 
    label: 'Plumbing & Handyman', 
    category: 'Trades & Home',
    icon: Wrench, 
    bgColor: 'bg-[#FFEDD5]', 
    textColor: 'text-[#EA580C]',
    borderColor: 'border-[#FED7AA]'
  },
  { 
    id: 'electrician', 
    label: 'Electrical & Solar', 
    category: 'Trades & Power',
    icon: Zap, 
    bgColor: 'bg-[#FEF9C3]', 
    textColor: 'text-[#CA8A04]',
    borderColor: 'border-[#FEF08A]'
  },
  { 
    id: 'construction', 
    label: 'Builder & Renovation', 
    category: 'Trades & Building',
    icon: Building2, 
    bgColor: 'bg-[#F1F5F9]', 
    textColor: 'text-[#475569]',
    borderColor: 'border-[#CBD5E1]'
  },
  { 
    id: 'pro_service', 
    label: 'Professional Service', 
    category: 'Trades & Business',
    icon: Briefcase, 
    bgColor: 'bg-[#E0F2FE]', 
    textColor: 'text-[#0284C7]',
    borderColor: 'border-[#BAE6FD]'
  },
  { 
    id: 'event', 
    label: 'Events & Calendar', 
    category: 'Events',
    icon: Calendar, 
    bgColor: 'bg-[#FEF3C7]', 
    textColor: 'text-[#D97706]',
    borderColor: 'border-[#FDE68A]'
  },
  { 
    id: 'guide', 
    label: 'Guides & Legal', 
    category: 'Guides',
    icon: BookOpen, 
    bgColor: 'bg-[#F3E8FF]', 
    textColor: 'text-[#9333EA]',
    borderColor: 'border-[#DDD6FE]'
  },
  { 
    id: 'recommendation', 
    label: 'Member Recommendation', 
    category: 'Recommendations',
    icon: ThumbsUp, 
    bgColor: 'bg-[#FFE4E6]', 
    textColor: 'text-[#E11D48]',
    borderColor: 'border-[#FECDD3]'
  },
  { 
    id: 'megaphone', 
    label: 'Announcements', 
    category: 'General',
    icon: Megaphone, 
    bgColor: 'bg-[#E0F2FE]', 
    textColor: 'text-[#0284C7]',
    borderColor: 'border-[#BAE6FD]'
  },
  { 
    id: 'star', 
    label: 'Top Pro & Featured', 
    category: 'Recommendations',
    icon: Star, 
    bgColor: 'bg-[#FEF9C3]', 
    textColor: 'text-[#CA8A04]',
    borderColor: 'border-[#FEF08A]'
  },
  { 
    id: 'gift', 
    label: 'Offers & Perks', 
    category: 'Promotions',
    icon: Gift, 
    bgColor: 'bg-[#FCE7F3]', 
    textColor: 'text-[#DB2777]',
    borderColor: 'border-[#FBCFE8]'
  },
  { 
    id: 'shield', 
    label: 'Verified & Security', 
    category: 'Trust',
    icon: ShieldCheck, 
    bgColor: 'bg-[#ECFDF5]', 
    textColor: 'text-[#047857]',
    borderColor: 'border-[#A7F3D0]'
  },
  { 
    id: 'sparkles', 
    label: 'New Updates', 
    category: 'Updates',
    icon: Sparkles, 
    bgColor: 'bg-[#EFF6FF]', 
    textColor: 'text-[#2563EB]',
    borderColor: 'border-[#BFDBFE]'
  }
];

const getNotificationIconData = (iconId?: string, type?: string) => {
  if (iconId) {
    const found = NOTIFICATION_ICONS.find(item => item.id === iconId);
    if (found) return found;
  }
  if (type === 'recommendation' || type === 'recommendation_request') {
    return NOTIFICATION_ICONS.find(i => i.id === 'recommendation')!;
  }
  if (type === 'event') {
    return NOTIFICATION_ICONS.find(i => i.id === 'event')!;
  }
  if (type === 'guide') {
    return NOTIFICATION_ICONS.find(i => i.id === 'guide')!;
  }
  return NOTIFICATION_ICONS.find(i => i.id === 'megaphone')!;
};

const getNotificationIcon = (iconId?: string, type?: string) => {
  return getNotificationIconData(iconId, type).icon;
};

const ShareIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    <path d="M9 15c1-3.5 4-6 9-6" />
    <polyline points="14 5 19 9 14 13" />
  </svg>
);

const QUALITY_CONFIGS = [
  { name: "Reliable", icon: ShieldCheck, color: "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 hover:bg-emerald-500/20", iconColor: "text-emerald-500", rawTheme: "emerald" },
  { name: "Responsive", icon: Zap, color: "bg-sky-500/10 text-sky-800 border-sky-500/25 hover:bg-sky-500/20", iconColor: "text-sky-500", rawTheme: "sky" },
  { name: "Professional", icon: Briefcase, color: "bg-purple-500/10 text-purple-800 border-purple-500/25 hover:bg-purple-500/20", iconColor: "text-purple-500", rawTheme: "purple" },
  { name: "Punctual", icon: Clock, color: "bg-amber-500/10 text-amber-800 border-amber-500/25 hover:bg-amber-500/20", iconColor: "text-amber-500", rawTheme: "amber" },
  { name: "Friendly", icon: Smile, color: "bg-pink-500/10 text-pink-800 border-pink-500/25 hover:bg-pink-500/20", iconColor: "text-pink-500", rawTheme: "pink" },
  { name: "Trustworthy", icon: Shield, color: "bg-teal-500/10 text-teal-800 border-teal-500/25 hover:bg-teal-500/20", iconColor: "text-teal-500", rawTheme: "teal" },
  { name: "Knowledgeable", icon: GraduationCap, color: "bg-indigo-500/10 text-indigo-800 border-indigo-500/25 hover:bg-indigo-500/20", iconColor: "text-indigo-500", rawTheme: "indigo" },
  { name: "English-speaking", icon: Globe, color: "bg-blue-500/10 text-blue-800 border-blue-500/25 hover:bg-blue-500/20", iconColor: "text-blue-500", rawTheme: "blue" },
  { name: "Caring", icon: Heart, color: "bg-rose-500/10 text-rose-800 border-rose-500/25 hover:bg-rose-500/20", iconColor: "text-rose-500", rawTheme: "rose" },
  { name: "Honest pricing", icon: Tag, color: "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 hover:bg-emerald-500/20", iconColor: "text-emerald-500", rawTheme: "emerald" },
  { name: "Patient", icon: User, color: "bg-orange-500/10 text-orange-800 border-orange-500/25 hover:bg-orange-500/20", iconColor: "text-orange-500", rawTheme: "orange" },
  { name: "Efficient", icon: Settings, color: "bg-teal-500/10 text-teal-800 border-teal-500/25 hover:bg-teal-500/20", iconColor: "text-teal-500", rawTheme: "teal" },
  { name: "Detail-oriented", icon: Search, color: "bg-violet-500/10 text-violet-800 border-violet-500/25 hover:bg-violet-500/20", iconColor: "text-violet-500", rawTheme: "violet" },
  { name: "Clear communication", icon: MessageSquare, color: "bg-amber-500/10 text-amber-800 border-amber-500/25 hover:bg-amber-500/20", iconColor: "text-amber-500", rawTheme: "amber" },
];

const getQualityConfig = (name: string) => {
  const cfg = QUALITY_CONFIGS.find(q => q.name.toLowerCase() === name.toLowerCase()) || {
    name,
    icon: Award,
    color: "bg-slate-500/10 text-slate-800 border-slate-500/25 hover:bg-slate-500/20",
    iconColor: "text-slate-500",
    rawTheme: "slate"
  };
  return cfg;
};

function SimpleMarkdown({ children }: { children?: string }) {
  if (!children) return null;
  
  // Normalize newline sequences
  const cleanText = children.replace(/\r\n/g, '\n');
  const lines = cleanText.split('\n');
  
  return (
    <div className="space-y-2 whitespace-pre-wrap text-[13px] text-slate-600 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }
        
        // Headers
        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2];
            const sizeClass = level === 1 ? 'text-xl font-bold' : level === 2 ? 'text-lg font-bold' : 'text-sm font-bold';
            return (
              <div key={idx} className={`${sizeClass} text-slate-800 pt-2 pb-1`}>
                {parseInlineMarkdown(text)}
              </div>
            );
          }
        }
        
        // List items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 pl-3 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              <div className="flex-1">{parseInlineMarkdown(trimmed.substring(2))}</div>
            </div>
          );
        }
        
        return <p key={idx}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  function parseBold(rawText: string): React.ReactNode[] {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const boldParts = [];
    let lastBoldIndex = 0;
    let boldMatch;
    
    while ((boldMatch = boldRegex.exec(rawText)) !== null) {
      if (boldMatch.index > lastBoldIndex) {
        boldParts.push(rawText.substring(lastBoldIndex, boldMatch.index));
      }
      boldParts.push(<strong key={`bold-${boldMatch.index}`} className="font-semibold text-slate-900">{boldMatch[1]}</strong>);
      lastBoldIndex = boldRegex.lastIndex;
    }
    
    if (lastBoldIndex < rawText.length) {
      boldParts.push(rawText.substring(lastBoldIndex));
    }
    return boldParts;
  }

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseBold(text.substring(lastIndex, match.index)));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a 
        key={`link-${match.index}`} 
        href={linkUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-emerald-500 hover:text-emerald-600 underline font-medium transition-colors inline-flex items-center gap-0.5"
      >
        {linkText}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(...parseBold(text.substring(lastIndex)));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
import { documentService } from './services/documentService';
import { guideService, MOCK_GUIDE_CATEGORIES_DATA } from './services/guide_service';
import { feedbackService } from './services/feedbackService';
import { emailService } from './services/emailService';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

import { supabase, isSupabaseConfigured } from './lib/supabase';

const parseAnnouncement = (ann: any) => {
  if (!ann) return ann;
  let rawContent = ann.content || '';
  let icon = ann.icon || 'megaphone';
  let title = '';
  let content = rawContent;

  if (rawContent.startsWith('[icon:')) {
    const endIconIndex = rawContent.indexOf(']');
    if (endIconIndex !== -1) {
      icon = rawContent.slice(6, endIconIndex).trim();
      rawContent = rawContent.slice(endIconIndex + 1).trim();
      content = rawContent;
    }
  }

  if (rawContent.startsWith('[') && rawContent.includes(']')) {
    const closingBracketIndex = rawContent.indexOf(']');
    title = rawContent.slice(1, closingBracketIndex).trim();
    content = rawContent.slice(closingBracketIndex + 1).trim();
  }

  return {
    ...ann,
    icon,
    title,
    content,
    created_at: ann.updated_at || ann.created_at || new Date().toISOString()
  };
};

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

const LANGUAGES_LIST = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Russian', 'Chinese', 'Japanese', 'Arabic'];

function AddressAutocomplete({ 
  value, 
  onChange, 
  onSelect 
}: { 
  value: string; 
  onChange: (val: string) => void;
  onSelect: (location: string, lat: number, lng: number) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib) return;
    setAutocompleteService(new placesLib.AutocompleteService());
    setPlacesService(new placesLib.PlacesService(document.createElement('div')));
  }, [placesLib]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (val.length > 2 && autocompleteService) {
      autocompleteService.getPlacePredictions({
        input: val,
        locationBias: { radius: 10000, center: { lat: 39.4699, lng: -0.3763 } }, // Better bias syntax
      }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          setPredictions(results || []);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      });
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    onChange(prediction.description);
    setShowPredictions(false);
    if (placesService) {
      placesService.getDetails({
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry']
      }, (place) => {
        if (place && place.geometry && place.geometry.location) {
          onSelect(
            place.formatted_address || prediction.description,
            place.geometry.location.lat(),
            place.geometry.location.lng()
          );
        }
      });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input 
        value={value}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
        placeholder="Type address..."
        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
      />
      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-[24px] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {predictions.map(p => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelectPrediction(p)}
              className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-300 mt-0.5 group-hover:text-rose-500 transition-colors" />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 text-sm">{p.structured_formatting.main_text}</div>
                  <div className="text-[10px] text-slate-400 tracking-tight">{p.structured_formatting.secondary_text}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageSelector({ 
  selected, 
  onToggle 
}: { 
  selected: string[]; 
  onToggle: (lang: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-3xl border border-slate-100 max-h-60 overflow-y-auto">
      {LANGUAGES_LIST.map(lang => {
        const isSelected = selected.includes(lang);
        return (
          <button
            key={lang}
            type="button"
            onClick={() => onToggle(lang)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left",
              isSelected 
                ? "bg-white text-brand-blue shadow-sm border border-brand-blue/20" 
                : "text-slate-500 hover:bg-white/50 border border-transparent"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
              isSelected 
                ? "bg-brand-blue border-brand-blue shadow-sm shadow-brand-blue/20" 
                : "bg-white border-slate-200"
            )}>
              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
            </div>
            <span className={cn(
              "text-[11px] font-semibold tracking-tight",
              isSelected ? "text-brand-blue" : "text-slate-600"
            )}>{lang}</span>
          </button>
        );
      })}
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getAuthorDisplayName(author: string | null | undefined): string {
  if (!author) return 'Anonymous';
  return author.includes('|') ? author.split('|')[0] : author;
}

function formatName(name: string | null | undefined): string {
  if (!name) return '';
  const cleanName = name.includes('|') ? name.split('|')[0] : name;
  const rawName = cleanName.trim();
  const parts = rawName.split(/\s+/);
  if (parts.length > 1) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1);
    const formattedLastInitial = last.charAt(0).toUpperCase() + '.';
    return `${formattedFirst} ${formattedLastInitial}`;
  }
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

function formatRelativeTime(dateString: string | undefined) {
  if (!dateString) return '';
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) return 'just now';
    if (diffInSeconds < 60) return 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
}

// --- Types ---

type View = 'home' | 'explore' | 'events' | 'guides' | 'profile' | 'community' | 'marketplace' | 'community-thread' | 'messages' | 'admin' | 'login' | 'complete-profile' | 'update-password' | 'privacy-policy' | 'user-terms' | 'provider-terms' | 'community-guidelines' | 'cookie-policy' | 'feedback';

interface Professional {
  id: string;
  name: string;
  company_name?: string;
  category: string;
  rating: number;
  review_count?: number;
  languages: string[];
  image: string;
  bio: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  is_highlighted?: boolean;
  top_qualities?: string[];
  has_filled_form?: boolean;
  categories?: string[];
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  category: string;
  image: string;
  description?: string;
  coordinates?: { lat: number, lng: number };
  is_highlighted?: boolean;
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  pros: string[]; // Professional IDs
}

interface Classified {
  id: string;
  title: string;
  price: string;
  category: string;
  image: string;
  condition?: string;
  location?: string;
}

// --- Mock Data ---

const MOCK_PROS: Professional[] = [];

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Beach Cleanup & Meetup',
    date: 'MAY 20',
    time: '10:00 AM',
    location: 'Playa de la Malvarrosa, Valencia',
    category: 'Community',
    image: 'https://images.unsplash.com/photo-1595113330231-5098c99ee602?auto=format&fit=crop&q=80&w=800',
    description: 'Join us for our monthly beach cleanup at Malvarrosa! We\'ll meet near the main promenade to pick up plastic and trash, then head to a nearby chiringuito for drinks and networking. It\'s a great way to give back to the city and meet fellow expats.',
    coordinates: { lat: 39.4795, lng: -0.3235 }
  },
  {
    id: '2',
    title: 'Tech Expat Networking',
    date: 'JUN 05',
    time: '07:00 PM',
    location: 'Lanzadera, Marina de Valencia',
    category: 'Networking',
    image: 'https://images.unsplash.com/photo-1540575861501-7ad058133a31?auto=format&fit=crop&q=80&w=800',
    description: 'Connect with Valencia\'s booming tech scene at Lanzadera. This networking event is specifically for tech professionals, entrepreneurs, and digital nomads who have recently moved to the city. Complementary drinks and appetizers provided.',
    coordinates: { lat: 39.4628, lng: -0.3262 }
  },
  {
    id: '3',
    title: 'Spanish Tapas Workshop',
    date: 'JUN 12',
    time: '06:30 PM',
    location: 'Mercado Central, Valencia',
    category: 'Culture',
    image: 'https://images.unsplash.com/photo-1515442261904-6c301f1b008a?auto=format&fit=crop&q=80&w=800',
    description: 'Master the art of Spanish tapas in this hands-on workshop right in the heart of Valencia\'s historic Central Market. You\'ll learn to prepare five classic dishes and pair them with local wines. Small group setting for personal attention.',
    coordinates: { lat: 39.4735, lng: -0.3788 }
  }
];

const MOCK_FEED: any[] = [];

const MOCK_CLASSIFIEDS: Classified[] = [];

interface GuideArticle {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  businessName?: string;
  isOnline?: boolean;
  author?: {
    name: string;
    role?: string;
    businessName?: string;
    website?: string;
    email?: string;
    phone?: string;
  };
}

interface GuideCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  articles: GuideArticle[];
}

// --- Custom Multi-color Icons for Guides ---

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" fill="#EF4444" stroke="#EF4444" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="#FBBF24" stroke="#F59E0B" />
    <circle cx="15" cy="9" r="1" fill="white" />
  </svg>
);

const PaperworkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M4 4h16v16H4z" fill="#3B82F6" stroke="#2563EB" />
    <path d="M8 8h8" stroke="white" />
    <path d="M8 12h8" stroke="white" />
    <path d="M8 16h5" stroke="white" />
    <path d="M18 4v4h-4" fill="#60A5FA" stroke="#2563EB" />
  </svg>
);

const FamilyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <circle cx="9" cy="7" r="4" fill="#EC4899" stroke="#DB2777" />
    <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" fill="#EC4899" stroke="#DB2777" />
    <circle cx="17" cy="8" r="3" fill="#8B5CF6" stroke="#7C3AED" />
    <path d="M13 21v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" fill="#8B5CF6" stroke="#7C3AED" />
  </svg>
);

const HealthIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="#F472B6" stroke="#E11D48" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" stroke="#E11D48" strokeWidth="1.5" />
  </svg>
);

const WorkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" fill="#6366F1" stroke="#4F46E5" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="#F59E0B" />
    <path d="M2 12h20" stroke="#4F46E5" />
    <circle cx="12" cy="14" r="1" fill="#FBBF24" />
  </svg>
);

const TipsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M9 18h6" stroke="#F59E0B" />
    <path d="M10 22h4" stroke="#F59E0B" />
    <path d="M15.09 14c.18-.98.37-1.74.37-2.5a3.5 3.5 0 0 0-7 0c0 .76.19 1.52.37 2.5H15.09Z" fill="#FDE047" stroke="#F59E0B" />
    <path d="M12 2v1" stroke="#F59E0B" />
    <path d="M5 5l1 1" stroke="#F59E0B" />
    <path d="M2 12h1" stroke="#F59E0B" />
    <path d="M19 5l-1 1" stroke="#F59E0B" />
    <path d="M22 12h-1" stroke="#F59E0B" />
  </svg>
);

const CityFunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M6 3h12l-6 9Z" fill="#F97316" stroke="#EA580C" />
    <path d="M12 12v8" stroke="#94A3B8" />
    <path d="M9 21h6" stroke="#94A3B8" />
    <circle cx="18" cy="5" r="3" fill="#FBBF24" stroke="#F59E0B" />
    <path d="M18 13v6" stroke="#EC4899" />
    <circle cx="16" cy="19" r="2" fill="#EC4899" stroke="#DB2777" />
    <path d="M18 13l3-1" stroke="#EC4899" />
  </svg>
);

const MOCK_GUIDE: GuideStep[] = [
  { id: '1', title: 'Get your NIE', description: 'The essential ID number for living in Spain.', pros: [] },
  { id: '2', title: 'Open a Bank Account', description: 'Necessary for utilities and rent.', pros: [] },
  { id: '3', title: 'Empadronamiento', description: 'Registering at the town hall.', pros: [] },
  { id: '4', title: 'Health Insurance', description: 'Private or public health coverage.', pros: [] }
];

// --- Components ---

function OrientationLock() {
  return (
    <div className="orientation-lock-overlay">
      <div className="bg-slate-50 p-6 rounded-3xl mb-6 shadow-sm border border-slate-100 flex items-center justify-center">
        <Smartphone className="w-12 h-12 text-brand-blue animate-bounce" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Please rotate your device</h3>
      <p className="text-slate-500 text-sm max-w-[240px] leading-relaxed">
        Unlocked is optimized for portrait mode. Please rotate your phone to continue.
      </p>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if ('orientation' in screen && 'lock' in (screen.orientation as any)) {
          await (screen.orientation as any).lock('portrait');
        }
      } catch (err) {
        console.warn('Orientation lock failed:', err);
      }
    };
    lockOrientation();
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  const { professionals: allPros, loading: prosLoading, refetch: refetchPros } = useProfessionals([]);
  const initialViewRef = useRef<View | null>(null);
  const [activeView, setActiveView] = useState<View>(() => {
    const isColdStart = typeof window !== 'undefined' && !sessionStorage.getItem('unlocked_app_session');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('unlocked_app_session', 'true');
    }

    let initial: View = 'home';
    const hash = window.location.hash;
    const cleanHash = hash.replace('#', '').split('?')[0]; // Remove hash symbol and query params
    const pathname = window.location.pathname.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
    const searchParams = new URLSearchParams(window.location.search);
    const hasDeepLinkQuery = searchParams.has('eventId') || searchParams.has('proId') || searchParams.has('guideId');

    const validViews: View[] = [
      'home', 'explore', 'events', 'guides', 'profile', 'community', 'marketplace', 
      'community-thread', 'messages', 'admin', 'login', 'complete-profile', 
      'update-password', 'privacy-policy', 'user-terms', 'provider-terms', 
      'community-guidelines', 'cookie-policy', 'feedback'
    ];

    const isSupabaseHash = hash.includes('access_token=') || 
                           hash.includes('refresh_token=') || 
                           hash.includes('error=') ||
                           hash.includes('error_description=');

    if (isSupabaseHash) {
      const saved = localStorage.getItem('unlocked_active_view');
      initial = (saved && !['login', 'complete-profile', 'update-password'].includes(saved)) ? (saved as View) : 'home';
    } else if (window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')) {
      initial = 'update-password';
    } else if (hasDeepLinkQuery) {
      if (searchParams.has('eventId')) initial = 'events';
      else if (searchParams.has('proId')) initial = 'explore';
      else if (searchParams.has('guideId')) initial = 'guides';
    } else if (cleanHash && validViews.includes(cleanHash as View)) {
      initial = cleanHash as View;
    } else if (pathname && validViews.includes(pathname as View)) {
      initial = pathname as View;
    } else if (isColdStart) {
      // On fresh app launch (cold start) without a specific target view, open on 'home'
      initial = 'home';
      if (window.location.hash) {
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch (_) {}
      }
    } else {
      initial = 'home';
    }
    
    if (initial !== 'login' && initial !== 'complete-profile' && initial !== 'update-password') {
      initialViewRef.current = initial;
    }
    return initial;
  });
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | any>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const activeViewRef = useRef<View>(activeView);
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);
  const [previousView, setPreviousView] = useState<View>('home');
  const [authLoading, setAuthLoading] = useState(true);
  const [initialEventId, setInitialEventId] = useState<string | null>(() => localStorage.getItem('unlocked_initial_event_id'));
  const [initialProId, setInitialProId] = useState<string | null>(() => localStorage.getItem('unlocked_initial_pro_id'));
  const [initialGuideId, setInitialGuideId] = useState<string | null>(() => localStorage.getItem('unlocked_initial_guide_id'));
  const [initialChat, setInitialChat] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('unlocked_initial_chat');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [initialSearch, setInitialSearch] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<{ query: string; location: string; category: string; filters?: any }>({ query: '', location: '', category: 'All' });
  const [unreadConversations, setUnreadConversations] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = useState<string[]>([]);
  const [globalAlert, setGlobalAlert] = useState<{type: 'error' | 'info' | 'success', text: string} | null>(null);

  const [highlightedProId, setHighlightedProId] = useState<string | null>(() => localStorage.getItem('highlighted_pro_id'));
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(() => localStorage.getItem('highlighted_event_id'));
  const [highlightedArticleId, setHighlightedArticleId] = useState<string | null>(() => localStorage.getItem('highlighted_article_id') || 'gs-1');
  const [highlightedTestimonyId, setHighlightedTestimonyId] = useState<string | null>(() => localStorage.getItem('highlighted_testimony_id'));

  const [highlightedProIds, setHighlightedProIds] = useState<string[]>(() => {
    const list = localStorage.getItem('highlighted_pro_ids');
    if (list) return list.split(',').filter(Boolean);
    const legacy = localStorage.getItem('highlighted_pro_id');
    return legacy ? [legacy] : [];
  });

  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>(() => {
    const list = localStorage.getItem('highlighted_event_ids');
    if (list) return list.split(',').filter(Boolean);
    const legacy = localStorage.getItem('highlighted_event_id');
    return legacy ? [legacy] : [];
  });

  const [highlightedArticleIds, setHighlightedArticleIds] = useState<string[]>(() => {
    const list = localStorage.getItem('highlighted_article_ids');
    if (list) return list.split(',').filter(Boolean);
    const legacy = localStorage.getItem('highlighted_article_id') || 'gs-1';
    return legacy ? [legacy] : ['gs-1'];
  });

  const [highlightedTestimoniesIds, setHighlightedTestimoniesIds] = useState<string[]>(() => {
    const list = localStorage.getItem('highlighted_testimony_ids');
    if (list) return list.split(',').filter(Boolean);
    const legacy = localStorage.getItem('highlighted_testimony_id');
    return legacy ? [legacy] : [];
  });


  useEffect(() => {
    if (globalAlert) {
      const timer = setTimeout(() => setGlobalAlert(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [globalAlert]);

  useEffect(() => {
    if (initialEventId) {
      localStorage.setItem('unlocked_initial_event_id', initialEventId);
    } else {
      localStorage.removeItem('unlocked_initial_event_id');
    }
  }, [initialEventId]);

  useEffect(() => {
    if (initialProId) {
      localStorage.setItem('unlocked_initial_pro_id', initialProId);
    } else {
      localStorage.removeItem('unlocked_initial_pro_id');
    }
  }, [initialProId]);

  useEffect(() => {
    if (initialGuideId) {
      localStorage.setItem('unlocked_initial_guide_id', initialGuideId);
    } else {
      localStorage.removeItem('unlocked_initial_guide_id');
    }
  }, [initialGuideId]);

  useEffect(() => {
    if (initialChat) {
      localStorage.setItem('unlocked_initial_chat', JSON.stringify(initialChat));
    } else {
      localStorage.removeItem('unlocked_initial_chat');
    }
  }, [initialChat]);

  // Extract sharing parameters (?eventId, ?proId, ?guideId) on initial mount for deep-linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Support query parameters appended inside/after the hash segment
    let hashSearch = '';
    if (window.location.hash.includes('?')) {
      hashSearch = window.location.hash.substring(window.location.hash.indexOf('?'));
    }
    const hashParams = new URLSearchParams(hashSearch);

    const eventId = params.get('eventId') || hashParams.get('eventId');
    const proId = params.get('proId') || hashParams.get('proId');
    const guideId = params.get('guideId') || hashParams.get('guideId');

    if (eventId) {
      setInitialEventId(eventId);
      setActiveView('events');
    } else if (proId) {
      setInitialProId(proId);
      setActiveView('explore');
    } else if (guideId) {
      setInitialGuideId(guideId);
      setActiveView('guides');
    }
  }, []);

  const handleMarkChatAsRead = React.useCallback((chatId: string) => {
    setUnreadConversations(prev => {
      if (!prev.includes(chatId)) return prev;
      return prev.filter(id => id !== chatId);
    });
  }, []);

  const fetchAndCheckUnread = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const [convs, blocks, blockedMe] = await Promise.all([
        chatService.getUserConversations(currentUser.id),
        chatService.getBlockedUsers(currentUser.id),
        chatService.getUsersWhoBlockedMe(currentUser.id)
      ]);

      setConversations(convs);
      setBlockedUsers(blocks);
      setUsersWhoBlockedMe(blockedMe);
      
      if (convs.length === 0) {
        setUnreadConversations([]);
        return;
      }
      
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('is_read', false)
        .or(`receiver_id.eq.${currentUser.id},and(receiver_id.is.null,sender_id.neq.${currentUser.id})`)
        .in('conversation_id', convs.map(c => c.id));

      if (!unreadError && unreadMessages) {
        const unreadIds = Array.from(new Set(unreadMessages.map(m => m.conversation_id)));
        setUnreadConversations(unreadIds);
      } else {
        const unreadIds = convs.filter(conv => {
          const lastRead = localStorage.getItem(`chat_last_read_${conv.id}`);
          if (!lastRead) return true;
          return new Date(conv.last_message_at).getTime() > new Date(lastRead).getTime();
        }).map(c => c.id);
        setUnreadConversations(unreadIds);
      }
    } catch (err) {
      console.warn('Error fetching unread count:', err);
    }
  }, [currentUser, userProfile]);

  // Handle auth enforcement for protected views
  useEffect(() => {
    const protectedViews: View[] = ['profile', 'messages', 'complete-profile'];
    if (!authLoading) {
      if (!currentUser && protectedViews.includes(activeView)) {
        setActiveView('login');
      } else if (currentUser && activeView === 'login') {
        setActiveView('home');
      }
    }
  }, [authLoading, currentUser, activeView]);

  // Real-time unread count logic
  useEffect(() => {
    if (!currentUser) {
      setUnreadConversations([]);
      setConversations([]);
      return;
    }

    fetchAndCheckUnread();
    
    // 2. Real-time subscription to conversations and blocks
    const channel = supabase
      .channel('app_realtime_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blocks'
        },
        (payload) => {
          console.log('[Realtime-Unread] User blocks updated:', payload);
          fetchAndCheckUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('[Realtime-Unread] Conversation (participant_1) changed:', payload);
          fetchAndCheckUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_2=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('[Realtime-Unread] Conversation (participant_2) changed:', payload);
          fetchAndCheckUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('[Realtime-Unread] Message received for user:', payload);
          fetchAndCheckUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('[Realtime-Unread] Message sent by user:', payload);
          fetchAndCheckUnread();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime-Unread] Subscription join status:', status);
      });

    // 3. Poll occasionally as fallback (30 seconds)
    const interval = setInterval(fetchAndCheckUnread, 30000); 

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchAndCheckUnread]);

  const [showAddPro, setShowAddPro] = useState(false);
  const [showAddAd, setShowAddAd] = useState(false);

  useEffect(() => {
    if (activeView) {
      localStorage.setItem('unlocked_active_view', activeView);
      
      const isAuthView = ['login', 'complete-profile', 'update-password'].includes(activeView);
      const mainTabs = ['home', 'explore', 'events', 'guides', 'marketplace', 'profile'];
      const currentHash = window.location.hash;
      const targetHash = activeView === 'home' ? '' : `#${activeView}`;
      const targetUrl = activeView === 'home' ? (window.location.pathname + window.location.search) : `#${activeView}`;

      const isSupabaseHash = currentHash.includes('access_token=') || 
                             currentHash.includes('refresh_token=') || 
                             currentHash.includes('error=') ||
                             currentHash.includes('error_description=');

      // Replace Supabase hash once the user is logged in
      const shouldReplaceSupabaseHash = isSupabaseHash && currentUser && !authLoading;

      if ((currentHash !== targetHash && !isSupabaseHash) || shouldReplaceSupabaseHash) {
        if (isAuthView || mainTabs.includes(activeView)) {
          // Don't push auth views or main tabs to history so back navigation/lateral swipe skips them/does not cycle tabs
          window.history.replaceState({ view: activeView }, '', targetUrl);
        } else {
          // Push normal views to history
          window.history.pushState({ view: activeView }, '', targetUrl);
        }
      }
    }
  }, [activeView, currentUser, authLoading]);

  // Handle browser back button (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Check if we are in a sub-view (detail page)
      const hasSubView = initialProId || initialEventId || initialGuideId || selectedPost || selectedAd || showMessagesModal;

      if (hasSubView) {
        // If in a sub-view, close it and stay on the current activeView (tab)
        setInitialProId(null);
        setInitialEventId(null);
        setInitialGuideId(null);
        setSelectedPost(null);
        setSelectedAd(null);
        setShowMessagesModal(false);
        
        // Push the state back to prevent the browser from actually going back a page
        const subViewTargetUrl = activeView === 'home' ? (window.location.pathname + window.location.search) : `#${activeView}`;
        window.history.pushState({ view: activeView }, '', subViewTargetUrl);
        return;
      }

      // Check if user is logged in and trying to go back to an auth/login screen
      const currentHash = window.location.hash.replace('#', '').split('?')[0];
      const targetView = event.state?.view as View;
      const isGoingToLogin = targetView === 'login' || currentHash === 'login';

      if (currentUser && isGoingToLogin) {
        // Replace current state with 'home' to wipe out 'login' from history
        const homeUrl = window.location.pathname + window.location.search;
        window.history.replaceState({ view: 'home' }, '', homeUrl);
        setActiveView('home');
        return;
      }

      // If we are on home or auth view, let the default behavior happen or handle accordingly
      // If the state from history has a view, we can sync it
      if (event.state && event.state.view) {
        const targetView = event.state.view as View;
        if (!['login', 'complete-profile', 'update-password'].includes(targetView)) {
          setActiveView(targetView);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, initialProId, initialEventId, initialGuideId, selectedPost, selectedAd, showMessagesModal, currentUser]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('unlocked_read_announcements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchAnnouncementsFromDb = async () => {
    if (!isSupabaseConfigured) return;
    try {
      let list: any[] = [];
      const { data: annData, error: annError } = await supabase
        .from('announcements')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!annError && annData && annData.length > 0) {
        list = annData
          .filter(ann => ann.is_active !== false)
          .map(ann => parseAnnouncement(ann));
      }

      const { data: recData, error: recError } = await supabase
        .from('pro_recommendations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!recError && recData && recData.length > 0) {
        const mappedRecs = recData.map(r => ({
          id: `rec-${r.id}`,
          title: `Demande de recommandation: ${r.pro_category || 'Professionnel'}`,
          content: r.notes || `Nouvelle recommandation soumise pour ${r.company_name || r.pro_name || r.pro_category}.`,
          created_at: r.created_at || new Date().toISOString(),
          type: 'recommendation_request',
          is_read: r.status === 'processed' || r.status === 'refused' || false,
          user_email: r.user_email,
          pro_category: r.pro_category,
          pro_name: r.pro_name || r.company_name
        }));
        list = [...list, ...mappedRecs];
      }

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAnnouncementsList(list);
    } catch (err) {
      console.warn('Error fetching announcements from Supabase:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncementsFromDb();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:announcements_and_recs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncementsFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_recommendations' }, () => {
        fetchAnnouncementsFromDb();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured]);

  const hasUnreadAnnouncements = useMemo(() => {
    if (announcementsList.length === 0) return false;
    return announcementsList.some(item => {
      // If it is a real active announcement, the red dot stays visible as long as it is active
      if (item.type !== 'recommendation_request') {
        return true;
      }
      const isLocallyRead = readAnnouncementIds.includes(String(item.id));
      const isDbRead = item.is_read === true || item.status === 'processed' || item.status === 'refused';
      return !isLocallyRead && !isDbRead;
    });
  }, [announcementsList, readAnnouncementIds]);

  const unreadCount = useMemo(() => {
    if (announcementsList.length === 0) return 0;
    return announcementsList.filter(item => {
      if (item.type !== 'recommendation_request') {
        return true;
      }
      const isLocallyRead = readAnnouncementIds.includes(String(item.id));
      const isDbRead = item.is_read === true || item.status === 'processed' || item.status === 'refused';
      return !isLocallyRead && !isDbRead;
    }).length;
  }, [announcementsList, readAnnouncementIds]);

  const handleMarkAnnouncementAsRead = (id: string) => {
    const updated = Array.from(new Set([...readAnnouncementIds, String(id)]));
    setReadAnnouncementIds(updated);
    try {
      localStorage.setItem('unlocked_read_announcements', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleMarkAllAnnouncementsAsRead = () => {
    const allIds = announcementsList.map(a => String(a.id));
    const updated = Array.from(new Set([...readAnnouncementIds, ...allIds]));
    setReadAnnouncementIds(updated);
    try {
      localStorage.setItem('unlocked_read_announcements', JSON.stringify(updated));
    } catch (_) {}
  };
  const [events, setEvents] = useState<Event[]>(isSupabaseConfigured ? [] : MOCK_EVENTS);
  const [guideCategories, setGuideCategories] = useState<any[]>([]);
  const allArticles = useMemo(() => {
    const map = new globalThis.Map<string, any>();
    const mockArticles = (MOCK_GUIDE_CATEGORIES_DATA.flatMap(cat => 
      (cat.articles || []).map((art: any) => ({
        ...art,
        categoryId: cat.id,
        category_id: cat.id,
        categoryTitle: cat.title,
        categoryColor: cat.color
      }))
    ) as any[]);
    mockArticles.forEach(art => {
      map.set(String(art.id), {
        ...art,
        imageUrl: art.imageUrl || art.image_url
      });
    });
    const dbArticles = guideCategories.flatMap(cat => 
      (cat.articles || []).map((art: any) => ({
        ...art,
        categoryId: cat.id,
        category_id: cat.id,
        categoryTitle: cat.title,
        categoryColor: cat.color
      }))
    );
    dbArticles.forEach(art => {
      map.set(String(art.id), {
        ...art,
        imageUrl: art.imageUrl || art.image_url
      });
    });
    return Array.from(map.values()) as any[];
  }, [guideCategories]);

  useEffect(() => {
    let active = true;
    const loadGuides = async () => {
      try {
        const raw = await guideService.getGuideCategories();
        if (active) {
          setGuideCategories(raw || []);
        }
      } catch (err) {
        console.error('Failed to load guides at root:', err);
      }
    };
    loadGuides();
    return () => { active = false; };
  }, []);

  // Synchronize highlights for all users whenever they load lists from the database
  useEffect(() => {
    if (allPros && allPros.length > 0) {
      const dbHighlightedIds = allPros
        .filter((p: any) => p.is_highlighted === true || p.is_highlighted === 'true' || p.is_highlighted === 1)
        .map(p => String(p.id));
      if (dbHighlightedIds.length > 0) {
        setHighlightedProIds(dbHighlightedIds);
        setHighlightedProId(dbHighlightedIds[dbHighlightedIds.length - 1]);
      }
    }
  }, [allPros]);

  useEffect(() => {
    if (events && events.length > 0) {
      const dbHighlightedIds = events
        .filter((e: any) => e.is_highlighted === true || e.is_highlighted === 'true' || e.is_highlighted === 1)
        .map(e => String(e.id));
      if (dbHighlightedIds.length > 0) {
        setHighlightedEventIds(dbHighlightedIds);
        setHighlightedEventId(dbHighlightedIds[dbHighlightedIds.length - 1]);
      }
    }
  }, [events]);

  useEffect(() => {
    if (allArticles && allArticles.length > 0) {
      const dbHighlightedIds = allArticles
        .filter((art: any) => art.is_highlighted === true || (art.is_highlighted as any) === 'true' || (art.is_highlighted as any) === 1)
        .map(art => String(art.id));
      if (dbHighlightedIds.length > 0) {
        setHighlightedArticleIds(dbHighlightedIds);
        setHighlightedArticleId(dbHighlightedIds[dbHighlightedIds.length - 1]);
      }
    }
  }, [allArticles]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [city, setCity] = useState('Valencia');
  const [showCitySelector, setShowCitySelector] = useState(false);



  const [isLocating, setIsLocating] = useState(false);

  const getNearestMajorCity = async (city: string, region: string, country: string) => {
    try {
      if (!city) return 'Valencia';
      
      const cacheKey = `city_norm_${city}_${region}_${country}`.toLowerCase().replace(/\s+/g, '_');
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;

      // Try calling server-side API first
      try {
        const response = await fetch("/api/city-normalization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, region, country }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const result = data.result?.trim();
          if (result) {
            localStorage.setItem(cacheKey, result);
            return result;
          }
        }
      } catch (srvErr) {
        console.warn("[City Normalization] Server endpoint failed, attempting fallback:", srvErr);
      }

      // If server failed (e.g. Vercel 404), attempt client-side fallback if an API key is available
      const localKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
      if (localKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: localKey });
          const locationContext = `${city}, ${region || ''}, ${country || ''}`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: `Target: Identify the nearest major metropolitan city for "${locationContext}". 
            Rules: 
            1. Return ONLY the name of the major city.
            2. No punctuation, no sentences.
            3. If the location is already a major city, return its name.
            4. Example: "La Eliana, Valencian Community, Spain" -> "Valencia".`,
          });
          
          const result = response.text?.trim();
          if (result) {
            localStorage.setItem(cacheKey, result);
            return result;
          }
        } catch (clientErr) {
          console.error("[City Normalization] Client-side fallback failed:", clientErr);
        }
      }

      // Default return
      return city || 'Valencia';
    } catch (error) {
      console.error('Error normalizing city:', error);
      return city || 'Valencia';
    }
  };

  const refreshLocation = () => {
    if (!("geolocation" in navigator)) {
      setCity('Valencia');
      return;
    }

    setIsLocating(true);
    const geoOptions = {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await response.json();
          
          const rawCity = data.city || data.locality || '';
          const region = data.principalSubdivision || '';
          const country = data.countryName || '';
          
          const majorCity = await getNearestMajorCity(rawCity, region, country);
          setCity(majorCity);
        } catch (error) {
          console.error('Error fetching city:', error);
          setCity('Valencia');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setCity('Valencia');
        setIsLocating(false);
      },
      geoOptions
    );
  };

  useEffect(() => {
    // City is hardcoded to Valencia for now
    setCity('Valencia');
  }, []);

  // Form states for Pro
  const [proName, setProName] = useState('');
  const [proCompany, setProCompany] = useState('');
  const [proCategory, setProCategory] = useState('');
  const [proEmail, setProEmail] = useState('');
  const [proPhone, setProPhone] = useState('');
  const [proQualities, setProQualities] = useState<string[]>([]);
  const [proRecommendation, setProRecommendation] = useState('');
  const [recommendationSent, setRecommendationSent] = useState(false);
  const [isSubmittingPro, setIsSubmittingPro] = useState(false);
  const [proError, setProError] = useState<string | null>(null);

  // Form states for Ad
  const [adTitle, setAdTitle] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adCategory, setAdCategory] = useState('Vehicles');
  const [adCondition, setAdCondition] = useState('Good');
  const [adLocation, setAdLocation] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adHousingType, setAdHousingType] = useState<'Rent' | 'Sale'>('Rent');
  const [adFuelType, setAdFuelType] = useState('Petrol');
  const [adPropertyType, setAdPropertyType] = useState('Apartment');
  const [adContractType, setAdContractType] = useState('Full-time');
  const [adSize, setAdSize] = useState('M');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refetchEvents = React.useCallback(async () => {
    try {
      const data = await eventService.getEvents();
      if (data && data.length > 0) {
        setEvents(data);
      } else if (!isSupabaseConfigured) {
        setEvents(MOCK_EVENTS);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      if (!isSupabaseConfigured) setEvents(MOCK_EVENTS);
    }
  }, []);

  useEffect(() => {
    fetchAds();
    refetchEvents();

    if (!isSupabaseConfigured) return;

    // Real-time updates for events and marketplace ads
    const channel = supabase
      .channel('realtime_events_ads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          console.log('[Realtime] Events table updated - refetching...');
          refetchEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace'
        },
        () => {
          console.log('[Realtime] Marketplace table updated - refetching...');
          fetchAds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchEvents]);

  const fetchAds = async () => {
    try {
      const data = await marketplaceService.getAds();
      setAds(data);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const handlePostPro = async () => {
    if ((!proName && !proCompany) || !proCategory || (!proEmail.trim() && !proPhone.trim())) return;
    
    if (proQualities.length === 0) {
      setProError('Please select at least one top quality (up to 3).');
      return;
    }
    
    if (proQualities.length > 3) {
      setProError('Please select a maximum of 3 top qualities.');
      return;
    }
    
    setIsSubmittingPro(true);
    setProError(null);
    
    try {
      await proService.submitRecommendation({
        user_email: currentUser?.email || "anonymous@community.unlocked",
        pro_name: proName,
        company_name: proCompany,
        pro_category: proCategory,
        pro_email: proEmail,
        pro_phone: proPhone,
        notes: proRecommendation,
        top_qualities: proQualities
      });
      
      // Reset form
      setProName('');
      setProCompany('');
      setProCategory('');
      setProEmail('');
      setProPhone('');
      setProQualities([]);
      setProRecommendation('');
      setRecommendationSent(true);
      
      // Auto close after 5 seconds
      setTimeout(() => {
        if (showAddPro) {
          setShowAddPro(false);
          setRecommendationSent(false);
        }
      }, 5000);
    } catch (error) {
      console.error('Error submitting pro recommendation:', error);
      setProError('Failed to send recommendation. Please try again.');
    } finally {
      setIsSubmittingPro(false);
    }
  };

  const handlePostAd = async () => {
    const isPriceRequired = adCategory !== 'Jobs' && adCategory !== 'Services';
    if (!adTitle || (isPriceRequired && !adPrice)) return;
    
    setIsUploading(true);
    try {
      await marketplaceService.createAd({
        title: adTitle,
        price: adPrice,
        category: adCategory,
        condition: adCondition,
        location: adLocation,
        description: adDescription,
        type: adCategory === 'Real Estate' ? adHousingType : undefined,
        fuel_type: adCategory === 'Vehicles' ? adFuelType : undefined,
        property_type: adCategory === 'Real Estate' ? adPropertyType : undefined,
        contract_type: adCategory === 'Jobs' ? adContractType : undefined,
        size: adCategory === 'Clothing' ? adSize : undefined,
        image_url: uploadedImageUrls[0] || '',
        images: uploadedImageUrls
      });
      
      // Reset form
      setAdTitle('');
      setAdPrice('');
      setAdCategory('Vehicles');
      setAdCondition('Good');
      setAdLocation('');
      setAdDescription('');
      setAdHousingType('Rent');
      setAdFuelType('Petrol');
      setAdPropertyType('Apartment');
      setAdContractType('Full-time');
      setAdSize('M');
      setUploadedImageUrls([]);
      setShowAddAd(false);
      
      // Refresh list
      fetchAds();
    } catch (error) {
      console.error('Error posting ad:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 3 - uploadedImageUrls.length;
    if (remainingSlots <= 0) {
      alert('Maximum 3 photos allowed');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    
    try {
      const uploadPromises = (filesToUpload as File[]).map(async (file: File) => {
        // Sanitize filename
        const sanitizedName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.]/g, '_')
          .replace(/_{2,}/g, '_');

        const fileName = `${Date.now()}-${sanitizedName}`;
        const path = `ads/${fileName}`;
        return await storageService.uploadFile('images', path, file);
      });

      const newUrls = await Promise.all(uploadPromises);
      setUploadedImageUrls(prev => [...prev, ...newUrls]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload one or more images.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isAdmin = proService.isAdmin(currentUser?.email || "") || userProfile?.is_admin;

  const handleContactAdmin = async () => {
    if (!currentUser) {
      // Direct mailto fallback with beautiful context pre-filled
      window.location.href = "mailto:vincentdurroux@gmail.com?subject=Unlocked%20Valencia%20-%2520Contact%20Communautaire&body=Bonjour%20Vincent,%0A%0AJe%20souhaiterais%20partager%2520un%20retour%20ou%20recommander%2520un%20professionnel%20manquant...";
      return;
    }
    setInitialChat({ targetName: "vincentdurroux@gmail.com" });
    setShowMessagesModal(true);
  };

  const handleNavigate = async (view: View | 'back', params?: { eventId?: string, proId?: string, guideId?: string, searchQuery?: string, chat?: any }) => {
    if (view === 'back') {
      navigateTo(previousView);
      return;
    }
    const finalView = view as View;
    // Auth guard for specific views
    if ((finalView === 'profile' || finalView === 'messages') && !currentUser) {
      navigateTo('login');
      return;
    }

    // Admin guard
    if (finalView === 'admin' && !isAdmin) {
      navigateTo('home');
      return;
    }

    // Pre-navigation chat guard
    if (finalView === 'messages') {
      if (userProfile?.chat_enabled === false) {
        setGlobalAlert({ type: 'error', text: 'You have disabled chat participation.' });
        return;
      }

      if (params?.chat) {
        const targetId = params.chat.userId || params.chat.otherUser?.id;
        const targetName = params.chat.name || params.chat.otherUser?.full_name;
        
        let targetProfile = null;
        try {
          if (targetId) {
            targetProfile = await authService.getProfile(targetId);
          } else if (targetName) {
            targetProfile = await chatService.getProfileByName(targetName);
          }
          
          if (targetProfile && targetProfile.chat_enabled === false) {
            setGlobalAlert({ type: 'error', text: 'This member has disabled chat participation.' });
            return;
          }
        } catch (e) {
          console.warn('Silent chat pre-flight check failed:', e);
        }
      }
    }

    if (params?.eventId) setInitialEventId(params.eventId);
    if (params?.proId) setInitialProId(params.proId);
    if (params?.guideId) setInitialGuideId(params.guideId);
    if (params?.searchQuery) setInitialSearch(params.searchQuery);
    if (params?.chat) setInitialChat(params.chat);
    navigateTo(finalView);
  };

  // Bottom Nav Items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Find Pro', icon: Search },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'marketplace', label: 'Market', icon: ShoppingBag },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const [direction, setDirection] = useState(0);

  const mainNavIds = navItems.map(item => item.id);

  const handleSearch = (query: string, location: string, category: string, filters?: any) => {
    setSearchParams({ query, location, category, filters });
    // No longer navigating to searchResults view, MarketplaceView will handle it internally
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  };

  const navigateTo = (view: View) => {
    if (view === 'messages') {
      setShowMessagesModal(true);
      return;
    }
    if (view !== activeView) {
      setPreviousView(activeView);
    }
    const currentIndex = mainNavIds.indexOf(activeView);
    const newIndex = mainNavIds.indexOf(view);

    if (currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    } else if ((view as string) === 'messages' || view === 'community-thread' || view === 'community') {
      setDirection(1); // Forward to sub-view
    } else if ((activeView as string) === 'messages' || activeView === 'community-thread' || activeView === 'community') {
      setDirection(-1); // Back from sub-view
    } else {
      setDirection(0);
    }
    setActiveView(view);
    scrollToTop();
  };

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (session?.user) {
        if (!session.user.email_confirmed_at) {
          authService.signOut().catch(() => {});
          setCurrentUser(null);
          setUserProfile(null);
          setAuthLoading(false);
          setActiveView('login');
          setGlobalAlert({ 
            type: 'error', 
            text: 'Email is not verified yet. Please check your inbox and click the activation link.' 
          });
          return;
        }
        setCurrentUser(session.user);
        loadProfile(session.user.id, event);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setAuthLoading(false);
        if (event === 'SIGNED_OUT') {
          // Do not delete view or session states on benign background SIGNED_OUT events.
          // These are only cleared on explicit manual log out in ProfileView or AdminView.
        }
      }
    });

    // Check current session
    authService.getCurrentUser().then(user => {
      if (user) {
        if (!user.email_confirmed_at) {
          authService.signOut().catch(() => {});
          setCurrentUser(null);
          setAuthLoading(false);
          setActiveView('login');
          setGlobalAlert({ 
            type: 'error', 
            text: 'Email is not verified yet. Please check your inbox and click the activation link.' 
          });
          return;
        }
        
        // Ensure they requested to remember the login
        const keepSignedIn = localStorage.getItem('keep_me_signed_in') !== 'false';
        if (keepSignedIn) {
          setCurrentUser(user);
          loadProfile(user.id);
        } else {
          authService.signOut().catch(() => {});
          setCurrentUser(null);
          setUserProfile(null);
          setAuthLoading(false);
          const protectedViews: View[] = ['profile', 'messages', 'complete-profile', 'admin'];
          if (protectedViews.includes(activeViewRef.current)) {
            setActiveView('login');
          }
        }
      } else {
        setAuthLoading(false);
        const protectedViews: View[] = ['profile', 'messages', 'complete-profile', 'admin'];
        if (protectedViews.includes(activeViewRef.current)) {
          setActiveView('login');
        }
      }
    }).catch(() => {
      setAuthLoading(false);
      const protectedViews: View[] = ['profile', 'messages', 'complete-profile', 'admin'];
      if (protectedViews.includes(activeViewRef.current)) {
        setActiveView('login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- Inactivity Timeout ---
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const lastActivityKey = 'last_activity_timestamp';

    const updateLastActivity = () => {
      localStorage.setItem(lastActivityKey, Date.now().toString());
    };

    const checkInactivity = () => {
      const lastActivity = parseInt(localStorage.getItem(lastActivityKey) || '0');
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        if (activeViewRef.current !== 'home' && activeViewRef.current !== 'login') {
          console.log('[Inactivity] Timeout reached, returning to home');
          setActiveView('home');
          scrollToTop();
        }
      }
    };

    // Events that count as activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    // Check inactivity on start
    checkInactivity();
    updateLastActivity();

    // Check periodically
    const interval = setInterval(checkInactivity, 60000); // Check every minute

    // Also check when the page becomes visible again (e.g. user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const loadProfile = async (userId: string, event?: string) => {
    try {
      const profile = await authService.getProfile(userId);
      setUserProfile(profile);
      
      console.log(`[Onboarding Check] Profile for User ${userId}:`, { 
        exists: !!profile, 
        name: profile?.full_name,
        created: profile?.created_at,
        updated: profile?.updated_at,
        event 
      });

      const isRecovery = (event === 'PASSWORD_RECOVERY' || 
                        window.location.hash.includes('type=recovery') || 
                        window.location.href.includes('type=recovery')) &&
                        localStorage.getItem('password_reset_completed') !== 'true';

      if (isRecovery) {
        console.log('[Auth] Password recovery flow detected, forcing update-password view.');
        setActiveView('update-password');
        setAuthLoading(false);
        return;
      }

      if (!profile) {
        console.log('[Onboarding] Profile missing, forcing flow.');
        setActiveView('complete-profile');
        return;
      }

      const createdDate = profile.created_at ? new Date(profile.created_at).getTime() : 0;
      const updatedDate = profile.updated_at ? new Date(profile.updated_at).getTime() : 0;
      const isVeryNew = (new Date().getTime() - createdDate) < 1800000; // 30 minutes
      const isUntouched = Math.abs(updatedDate - createdDate) < 5000; // 5 seconds margin
      
      if (!profile.full_name || event === 'SIGNED_UP' || (isVeryNew && isUntouched)) {
        console.log('[Onboarding] Fresh untouched profile detected, showing setup.');
        setActiveView('complete-profile');
      } else {
        if (initialViewRef.current && initialViewRef.current !== 'login' && initialViewRef.current !== 'complete-profile') {
          console.log(`[Auth] Restoring preferred view from saved state: ${initialViewRef.current}`);
          setActiveView(initialViewRef.current);
          initialViewRef.current = null; // Reset to prevent double-restores later
        } else if (activeViewRef.current === 'login' || activeViewRef.current === 'complete-profile') {
          setActiveView('home');
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    // Special cases for sub-views
    if (activeView === 'messages' && direction === 'right') {
      navigateTo('explore');
      return;
    }
    if (activeView === 'community-thread' && direction === 'right') {
      navigateTo('community');
      return;
    }

    const currentIndex = mainNavIds.indexOf(activeView);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < mainNavIds.length - 1) {
      navigateTo(mainNavIds[currentIndex + 1] as View);
    } else if (direction === 'right' && currentIndex > 0) {
      navigateTo(mainNavIds[currentIndex - 1] as View);
    }
  };

  useEffect(() => {
    if (mainRef.current) {
      // Scroll to top immediately when switching activeView
      mainRef.current.scrollTo(0, 0);
    }
  }, [activeView]);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
      <div className="flex flex-col h-screen h-[100dvh] bg-white w-full mx-auto shadow-2xl overflow-hidden relative">
        <OrientationLock />
      
        <AnimatePresence>
          {globalAlert && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-[90%] max-w-sm">
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl shadow-xl border",
                  globalAlert.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-600" :
                  globalAlert.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                  "bg-blue-50 border-blue-100 text-blue-600"
                )}
              >
                {globalAlert.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                <p className="text-xs font-bold leading-tight">{globalAlert.text}</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {authLoading ? (
        <div className="flex-1 bg-white">
           <div />
        </div>
      ) : (
        <>
      {/* Header */}
      {activeView !== 'login' && (
        <header 
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          className="bg-white px-4 md:px-6 pb-2 md:pt-3 md:pb-3 flex justify-between items-center border-b border-slate-100 flex-shrink-0 z-30 relative"
        >
          <div className="flex items-center lg:flex-1">
            <div 
              onClick={() => navigateTo('home')}
              className="hover:opacity-80 transition-opacity cursor-pointer flex flex-col items-center md:items-start"
            >
              <Logo className="items-center md:items-start" />
            </div>
          </div>

          {/* Desktop Navigation Links - Centered */}
          <nav className="hidden xl:flex items-center justify-center gap-6 xl:gap-8 xl:flex-1">
            {navItems.filter(item => item.id !== 'profile').map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as View)}
                className={cn(
                  "flex flex-col items-center gap-1.5 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.1em] transition-all hover:text-brand-blue relative py-2",
                  activeView === item.id ? "text-brand-blue" : "text-slate-500"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-all text-current",
                  activeView === item.id ? "stroke-[2.5px]" : "stroke-[1.5px]"
                )} />
                {item.label}
                {activeView === item.id && (
                  <motion.div 
                    layoutId="headerNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full"
                  />
                )}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center justify-end gap-2 md:gap-6 lg:flex-1">
            {/* Desktop Profile Link */}
            <div className="hidden lg:flex items-center gap-4 border-r border-slate-100 pr-4 mr-2">
               <button 
                 onClick={() => handleNavigate('profile')}
                 className={cn(
                   "flex items-center gap-2 group transition-all",
                   activeView === 'profile' ? "text-brand-blue" : "text-slate-500"
                 )}
               >
                 <div className={cn(
                   "w-8 h-8 rounded-full flex items-center justify-center transition-all relative p-0.5 border-2",
                   activeView === 'profile' ? "border-brand-blue bg-brand-blue/5" : "border-slate-100 bg-white group-hover:border-slate-200"
                 )}>
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-50">
                      {userProfile?.avatar_url ? (
                        <img 
                          src={userProfile.avatar_url} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    {unreadConversations.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 bg-rose-600 rounded-full border-2 border-white shadow-sm" />
                    )}
                 </div>
                 <span className="text-[11px] font-extrabold uppercase tracking-widest hidden lg:block">My Account</span>
               </button>
            </div>
            {/* Notification Bell Button */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsModal(!showNotificationsModal)}
                aria-label="Notifications"
                className="relative w-12 h-12 bg-transparent active:scale-95 transition-all flex items-center justify-center shrink-0 ml-2 group cursor-pointer border-0 p-0 outline-none overflow-visible"
              >
                {/* Custom-designed golden bell with hardware-accelerated animation */}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  className={cn(
                    "w-9 h-9 transition-all duration-300 group-hover:rotate-12 group-hover:scale-105 relative z-0",
                    unreadCount > 0 ? "animate-scintillate" : "filter drop-shadow-[0_2px_4px_rgba(217,119,6,0.25)]"
                  )}
                >
                  <defs>
                    <linearGradient id="premiumBellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFE066" />
                      <stop offset="40%" stopColor="#FFB300" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                    <linearGradient id="premiumClapperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                  </defs>
                  {/* Bell Body */}
                  <path 
                    d="M12 2.25c-1.1 0-2 .9-2 2v.45c-2.82.57-5 3.06-5 6.05v4.5c0 .65-.28 1.25-.78 1.68l-.47.41c-.6.53-.22 1.54.59 1.54h15.32c.81 0 1.19-1.01.59-1.54l-.47-.41a2.24 2.24 0 0 1-.78-1.68v-4.5c0-2.99-2.18-5.48-5-6.05v-.45c0-1.1-.9-2-2-2z" 
                    fill="url(#premiumBellGrad)" 
                  />
                  {/* Bell Clapper */}
                  <path 
                    d="M9.5 19.38c.4 1.5 1.76 2.62 3.5 2.62s3.1-1.12 3.5-2.62h-7z" 
                    fill="url(#premiumClapperGrad)" 
                  />
                </svg>
                
                {/* Red badge containing the unread count */}
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 z-20 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[8.5px] sm:text-[9px] font-extrabold shadow-md shadow-rose-600/30 ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsModal && (
                  <NotificationsDropdownBanner 
                    isOpen={showNotificationsModal}
                    onClose={() => setShowNotificationsModal(false)}
                    announcements={announcementsList}
                    readIds={readAnnouncementIds}
                    onMarkAsRead={handleMarkAnnouncementAsRead}
                    onMarkAllAsRead={handleMarkAllAnnouncementsAsRead}
                    onNavigate={handleNavigate}
                    onAddPro={() => {
                      if (!currentUser) {
                        handleNavigate('login');
                      } else {
                        setShowAddPro(true);
                      }
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main 
        ref={mainRef} 
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative",
          activeView === 'login' ? "pb-0" : "pb-24 xl:pb-0"
        )}
      >
              <motion.div 
                animate={activeView === 'home' ? { opacity: 1 } : { opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={activeView === 'home' ? 'block w-full' : 'hidden w-full'}
              >
                <HomeView 
                  allPros={allPros}
                  events={events}
                  onNavigate={handleNavigate}
                  userProfile={userProfile}
                  currentUser={currentUser}
                  onAddPro={() => {
                    if (!currentUser) {
                      handleNavigate('login');
                    } else {
                      setShowAddPro(true);
                    }
                  }} 
                  ads={ads} 
                  onSelectAd={setSelectedAd} 
                  onSelectPost={(post) => { setSelectedPost(post); navigateTo('community-thread'); }}
                  scrollToTop={scrollToTop}
                  onProUpdate={refetchPros}
                  unreadConversations={unreadConversations}
                  blockedUsers={blockedUsers}
                  usersWhoBlockedMe={usersWhoBlockedMe}
                  highlightedProIds={highlightedProIds}
                  highlightedEventIds={highlightedEventIds}
                  highlightedArticleIds={highlightedArticleIds}
                  highlightedTestimoniesIds={highlightedTestimoniesIds}
                  allArticles={allArticles}
                  onContactAdmin={handleContactAdmin}
                />
              </motion.div>
              <motion.div 
                animate={activeView === 'explore' ? { opacity: 1 } : { opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={activeView === 'explore' ? 'block w-full' : 'hidden w-full'}
              >
                {activeView === 'explore' && (
                  <ExploreView 
                    allPros={allPros}
                    onNavigate={handleNavigate} 
                    initialProId={initialProId}
                    initialSearch={initialSearch}
                    onModalClose={() => {
                      setInitialProId(null);
                      setInitialSearch(null);
                    }}
                    scrollToTop={scrollToTop}
                    onProUpdate={refetchPros}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    isActive={activeView === 'explore'}
                  />
                )}
              </motion.div>
              {activeView === 'events' && (
                <EventsView 
                  initialEventId={initialEventId}
                  onModalClose={() => setInitialEventId(null)}
                  scrollToTop={scrollToTop}
                  events={events}
                />
              )}
              {activeView === 'guides' && (
                <GuidesView 
                  initialGuideId={initialGuideId}
                  onModalClose={() => setInitialGuideId(null)}
                  scrollToTop={scrollToTop}
                />
              )}
              {activeView === 'profile' && (
                <ProfileView 
                  scrollToTop={scrollToTop}
                  onNavigate={handleNavigate}
                  currentUser={currentUser}
                  userProfile={userProfile}
                  onProfileUpdate={() => currentUser && loadProfile(currentUser.id)}
                  onAddPro={() => setShowAddPro(true)}
                  allPros={allPros}
                  refetchPros={refetchPros}
                  unreadConversations={unreadConversations}
                />
              )}
              {['privacy-policy', 'user-terms', 'provider-terms', 'community-guidelines', 'cookie-policy'].includes(activeView) && (
                <LegalPageView 
                   docKey={
                     activeView === 'privacy-policy' ? 'privacy_policy' : 
                     activeView === 'provider-terms' ? 'terms_of_service' : 
                     activeView.replace(/-/g, '_')
                   } 
                   onBack={() => navigateTo('home')} 
                />
              )}
              {activeView === 'login' && (
                <LoginView 
                  onBack={() => navigateTo('home')}
                  onLoginSuccess={() => navigateTo('home')}
                  onSetUser={setCurrentUser}
                  currentUser={currentUser}
                />
              )}

              {activeView === 'update-password' && (
                <div className="flex-1 flex flex-col min-h-full bg-slate-50/40 relative" id="legacy-recovery-redirect-wrapper">
                  <div className="relative flex-1 flex flex-col items-center justify-center pt-16 px-5 pb-8 min-h-screen">
                    <div className="w-full max-w-sm space-y-8">
                      <div className="flex flex-col items-center text-center">
                        <Logo className="scale-115" />
                      </div>
                      <div className="w-full bg-white p-7 sm:p-9 rounded-[32px] sm:rounded-[40px] border border-slate-100/80 shadow-[0_15px_45px_rgba(51,65,85,0.05)] relative z-10">
                        <div className="text-center space-y-3 mb-8">
                          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Reset Password</h2>
                          <p className="text-slate-400 font-normal text-xs sm:text-[13px] leading-relaxed max-w-xs mx-auto">
                            Enter your email to receive a 6-digit verification code.
                          </p>
                        </div>
                        <ForgotPasswordOTP 
                          onBackToLogin={() => navigateTo('login')}
                          onSuccess={() => {
                            supabase.auth.getUser().then(({ data: { user } }) => {
                              if (user) setCurrentUser(user);
                              navigateTo('home');
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'complete-profile' && (
                <ProfileSetupView
                  currentUser={currentUser}
                  onComplete={(profile) => {
                    setUserProfile(profile);
                    navigateTo('home');
                  }}
                />
              )}
              {activeView === 'feedback' && (
                <div className="flex-1 bg-slate-50/50 py-20 px-4">
                  <div className="max-w-4xl mx-auto">
                    <FeedbackSubPage 
                      currentUser={currentUser} 
                      onBack={() => navigateTo('home')} 
                    />
                  </div>
                </div>
              )}
              {activeView === 'admin' && (
                <AdminView 
                  onRefetchPros={refetchPros}
                  scrollToTop={scrollToTop}
                  currentUser={currentUser}
                  events={events}
                  onRefetchEvents={refetchEvents}
                  allPros={allPros}
                  highlightedProId={highlightedProId}
                  setHighlightedProId={setHighlightedProId}
                  highlightedEventId={highlightedEventId}
                  setHighlightedEventId={setHighlightedEventId}
                  highlightedArticleId={highlightedArticleId}
                  setHighlightedArticleId={setHighlightedArticleId}
                  highlightedTestimonyId={highlightedTestimonyId}
                  setHighlightedTestimonyId={setHighlightedTestimonyId}
                  highlightedProIds={highlightedProIds}
                  setHighlightedProIds={setHighlightedProIds}
                  highlightedEventIds={highlightedEventIds}
                  setHighlightedEventIds={setHighlightedEventIds}
                  highlightedArticleIds={highlightedArticleIds}
                  setHighlightedArticleIds={setHighlightedArticleIds}
                  highlightedTestimoniesIds={highlightedTestimoniesIds}
                  setHighlightedTestimoniesIds={setHighlightedTestimoniesIds}
                  guideCategories={guideCategories}
                  setGuideCategories={setGuideCategories}
                  allArticles={allArticles}
                  setGlobalAlert={setGlobalAlert}
                  onRefetchAnnouncements={fetchAnnouncementsFromDb}
                />
              )}
              {activeView === 'marketplace' && (
                <MarketplaceView 
                  onAddAd={() => setShowAddAd(true)} 
                  ads={ads} 
                  onSelectAd={setSelectedAd} 
                  scrollToTop={scrollToTop}
                />
              )}
              {/* MessagesView moved to modal */}

        {/* Modals contained in this area */}
        <AnimatePresence>
          {showMessagesModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
              onClick={() => setShowMessagesModal(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full md:max-w-4xl h-[70vh] md:h-[75vh] bg-white rounded-[32px] overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <MessagesView 
                   scrollToTop={scrollToTop} 
                   initialChat={initialChat}
                   onClearInitial={() => setInitialChat(null)}
                   onNavigate={(view, params) => {
                     handleNavigate(view, params);
                     setShowMessagesModal(false);
                   }}
                   onClose={() => setShowMessagesModal(false)}
                   currentUser={currentUser}
                   userProfile={userProfile}
                   unreadConversations={unreadConversations}
                   blockedUsers={blockedUsers}
                   usersWhoBlockedMe={usersWhoBlockedMe}
                   onBlockedUsersUpdate={fetchAndCheckUnread}
                   onMarkChatAsRead={handleMarkChatAsRead}
                 />
              </motion.div>
            </motion.div>
          )}



          {showAddPro && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 bottom-[80px] md:inset-0 bg-slate-950/60 backdrop-blur-md z-[100] overflow-y-auto overscroll-contain" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))' }}
              onClick={() => setShowAddPro(false)}
            >
              <div className="min-h-full flex items-center justify-center p-4 sm:p-6 my-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="bg-white w-full max-w-lg rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-950/20 flex flex-col my-auto border border-slate-100"
                  onClick={e => e.stopPropagation()}
                >
                {/* Modal Header */}
                <div className="px-6 pt-8 pb-4 sm:px-8 sm:pt-9 flex flex-col items-center text-center relative border-b border-slate-100/80 bg-gradient-to-b from-amber-50/30 to-transparent">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center rounded-2xl mb-3.5 shadow-sm text-brand-yellow">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  
                  <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                    Recommend a Pro
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">Share a great service with the community</p>
                  
                  <button 
                    onClick={() => setShowAddPro(false)}
                    className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-full transition-all active:scale-95 border border-transparent hover:border-slate-200/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Trust Banner */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-start gap-3 shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Unlocked is built on <span className="font-bold underline decoration-brand-yellow decoration-2 underline-offset-2">trusted member recommendations</span>. 
                      Please only recommend professionals you have <span className="font-bold text-slate-900">personally used</span> and genuinely endorse. 
                      Self-promotion or recommending your own business is not permitted, as this undermines the integrity of our community.
                    </p>
                  </div>

                  {proError && (
                    <div className="p-3.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-200/80 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{proError}</span>
                    </div>
                  )}

                  {recommendationSent ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-6">
                      <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-slate-900 font-display">Thank You!</h3>
                        <p className="text-slate-500 leading-relaxed font-medium text-sm max-w-sm">
                          Your recommendation has been received. 
                          Our team will review it shortly to help grow our curated community.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setShowAddPro(false);
                          setRecommendationSent(false);
                        }}
                        className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-brand-navy transition-all shadow-lg shadow-brand-blue/20 active:scale-[0.99] cursor-pointer text-sm"
                      >
                        Great, thanks!
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {/* Basic Info Section */}
                        <div className="space-y-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Professional Identity</p>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-0.5">Full Name</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Maria Gonzalez" 
                                value={proName}
                                onChange={(e) => setProName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-0.5">Company Name</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Legal Experts SL" 
                                value={proCompany}
                                onChange={(e) => setProCompany(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-0.5">Category</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Attorney, Plumber, Doctor" 
                                value={proCategory}
                                onChange={(e) => setProCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contact Info Section */}
                        <div className="space-y-3.5 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Details — Select at least one</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input 
                              type="email" 
                              placeholder="Email" 
                              value={proEmail}
                              onChange={(e) => setProEmail(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400" 
                            />
                            <input 
                              type="tel" 
                              placeholder="Phone" 
                              value={proPhone}
                              onChange={(e) => setProPhone(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400" 
                            />
                          </div>
                        </div>

                        {/* Top Qualities Section */}
                        <div className="space-y-3.5 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                <Sparkles className="w-3.5 h-3.5 fill-amber-500/20" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Top Qualities
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {proQualities.length}/3
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 font-medium">
                            Select up to 3 top qualities for this professional
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {QUALITY_CONFIGS.map(({ name, icon: Icon, iconColor }) => {
                              const isSelected = proQualities.includes(name);
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setProQualities(proQualities.filter(q => q !== name));
                                    } else {
                                      if (proQualities.length < 3) {
                                        setProQualities([...proQualities, name]);
                                      }
                                    }
                                  }}
                                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all select-none cursor-pointer text-left active:scale-95 ${
                                    isSelected 
                                      ? 'border-slate-800 shadow-sm bg-slate-900 text-white' 
                                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                                  }`}
                                  style={{ touchAction: 'manipulation' }}
                                >
                                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : iconColor}`} />
                                  <span className={`font-sans text-xs font-semibold tracking-tight whitespace-nowrap ${
                                    isSelected ? 'text-white' : 'text-slate-700'
                                  }`}>
                                    {name}
                                  </span>
                                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                    isSelected 
                                      ? 'bg-white text-slate-900 border-white' 
                                      : 'border-slate-200 bg-slate-50'
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 px-0.5 pt-0.5">
                            <Info className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>You can select up to 3 qualities</span>
                          </div>
                        </div>

                        {/* Recommendation Section */}
                        <div className="space-y-3.5 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow" />
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Recommendation</p>
                          </div>
                          <textarea 
                            placeholder="Why do you recommend them?" 
                            value={proRecommendation}
                            onChange={(e) => setProRecommendation(e.target.value)}
                            className="w-full p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 focus:border-brand-yellow/60 focus:bg-white focus:ring-4 focus:ring-brand-yellow/10 outline-none h-28 text-sm font-medium text-slate-800 resize-none transition-all leading-relaxed placeholder:text-slate-400" 
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                        <button 
                          className="w-full py-4 bg-brand-yellow text-slate-950 text-sm font-bold rounded-2xl shadow-lg shadow-brand-yellow/25 hover:shadow-brand-yellow/35 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:shadow-none uppercase tracking-widest cursor-pointer disabled:cursor-not-allowed" 
                          onClick={handlePostPro}
                          disabled={isSubmittingPro || (!proName && !proCompany) || !proCategory || (!proEmail.trim() && !proPhone.trim()) || proQualities.length === 0}
                        >
                          {isSubmittingPro ? 'Sending...' : 'Submit Recommendation'}
                        </button>
                        <button 
                          onClick={() => setShowAddPro(false)}
                          className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        <AnimatePresence>
          {showAddAd && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 bottom-[80px] md:inset-0 bg-slate-900/80 backdrop-blur-md z-[100] overflow-y-auto overscroll-contain touch-pan-y" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))' }}
              onClick={() => setShowAddAd(false)}
            >
              <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white w-full max-w-lg rounded-[32px] p-6 sm:p-8 space-y-6 relative shadow-2xl my-auto"
                  onClick={e => e.stopPropagation()}
                >
                <button 
                  onClick={() => setShowAddAd(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold font-display text-brand-navy">Post a New Ad</h2>
                    <span className="text-xs font-medium text-slate-400">{uploadedImageUrls.length}/3 photos</span>
                  </div>
                  <p className="text-slate-500 text-sm">Share what you're selling or looking for.</p>
                </div>
                <div className="space-y-6">
                  {/* Photo Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Photos</label>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {uploadedImageUrls.length}/3
                      </span>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageUpload}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      {uploadedImageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm group">
                          <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setUploadedImageUrls(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {uploadedImageUrls.length < 3 && (
                        <button 
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={cn(
                            "aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1.5 cursor-pointer hover:bg-slate-100 hover:border-brand-blue/20 hover:text-brand-blue transition-all active:scale-95",
                            isUploading && "opacity-50 cursor-wait"
                          )}
                        >
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6" />
                              <span className="text-[10px] font-bold">Add Photo</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basic Information</label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="What are you listing?" 
                          value={adTitle}
                          onChange={(e) => setAdTitle(e.target.value)}
                          className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium" 
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder={adCategory === 'Jobs' || adCategory === 'Services' ? "Price (Optional)" : "Price"} 
                            value={adPrice}
                            onChange={(e) => setAdPrice(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium" 
                          />
                        </div>
                        <div className="relative">
                          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={adCategory}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdCategory(val);
                              if (val === 'Jobs' || val === 'Services') {
                                setAdCondition('N/A');
                              } else if (val === 'Real Estate') {
                                setAdCondition('N/A');
                              } else {
                                setAdCondition('Good');
                              }
                            }}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                          >
                            <option value="Vehicles">Vehicles</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Home">Home</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Leisure">Leisure</option>
                            <option value="Services">Services</option>
                            <option value="Jobs">Jobs</option>
                          </select>
                        </div>
                      </div>

                      {adCategory === 'Real Estate' && (
                        <div className="space-y-3">
                          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                            {(['Rent', 'Sale'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setAdHousingType(type)}
                                className={cn(
                                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                                  adHousingType === type 
                                    ? "bg-white text-brand-blue shadow-sm" 
                                    : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                For {type}
                              </button>
                            ))}
                          </div>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                              value={adPropertyType}
                              onChange={(e) => setAdPropertyType(e.target.value)}
                              className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                            >
                              <option value="Apartment">Apartment</option>
                              <option value="House">House</option>
                              <option value="Studio">Studio</option>
                              <option value="Office">Office</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {adCategory === 'Vehicles' && (
                        <div className="relative">
                          <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={adFuelType}
                            onChange={(e) => setAdFuelType(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                          >
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                        </div>
                      )}

                      {adCategory === 'Jobs' && (
                        <div className="relative">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={adContractType}
                            onChange={(e) => setAdContractType(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </div>
                      )}

                      {adCategory === 'Clothing' && (
                        <div className="relative">
                          <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={adSize}
                            onChange={(e) => setAdSize(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                          >
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</label>
                    <div className={cn(
                      "grid gap-3",
                      (adCategory === 'Jobs' || adCategory === 'Services') ? "grid-cols-1" : "grid-cols-2"
                    )}>
                      {(adCategory !== 'Jobs' && adCategory !== 'Services') && (
                        <div className="relative">
                          <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <select 
                            value={adCondition}
                            onChange={(e) => setAdCondition(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium appearance-none"
                          >
                            <option value="New">New</option>
                            <option value="Like New">Like New</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      )}
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Location" 
                          value={adLocation}
                          onChange={(e) => setAdLocation(e.target.value)}
                          className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                    <textarea 
                      placeholder="Tell us more about it..." 
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-blue outline-none h-32 text-sm font-medium resize-none" 
                    />
                  </div>

                  <button 
                    className="w-full btn-primary py-4 text-lg font-bold rounded-2xl shadow-xl shadow-brand-blue/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none" 
                    onClick={handlePostAd}
                    disabled={isUploading || !adTitle || !adPrice}
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Posting...</span>
                      </div>
                    ) : (
                      'Post Listing'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        <AnimatePresence>
          {selectedAd && (
            <AdDetailModal 
              ad={selectedAd} 
              onClose={() => setSelectedAd(null)} 
            />
          )}
        </AnimatePresence>
      {activeView !== 'login' && <SEOFooter onNavigate={handleNavigate} />}
      </main>

      {/* Bottom Navigation */}
      {activeView !== 'login' && (
        <nav 
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)' }}
          className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] xl:hidden"
        >
          <div className="flex items-center justify-between px-2 py-2 max-w-xl mx-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as View)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95 min-w-0",
                  (activeView === item.id) ? "text-brand-blue" : "text-slate-400"
                )}
              >
                {(activeView === item.id) && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-x-1 inset-y-0.5 bg-brand-blue/5 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative">
                  {item.id === 'profile' ? (
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 p-0.5",
                      (activeView === item.id) ? "border-brand-blue bg-brand-blue/5" : "border-slate-100"
                    )}>
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-50">
                        {userProfile?.avatar_url ? (
                          <img 
                            src={userProfile.avatar_url} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className={cn(
                            "w-3.5 h-3.5 transition-all",
                            (activeView === item.id) ? "text-brand-blue" : "text-slate-400"
                          )} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <item.icon className={cn(
                      "w-7 h-7 transition-all", 
                      (activeView === item.id) ? "stroke-[2.5px] text-brand-blue" : "stroke-[1.5px] text-slate-400"
                    )} />
                  )}
                  {item.id === 'messages' && unreadConversations.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 bg-rose-600 rounded-full border-2 border-white shadow-sm" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold text-center truncate w-full px-1 transition-all",
                  (activeView === item.id) ? "text-brand-blue" : "text-slate-400 font-medium"
                )}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}
      </>
      )}
      </div>
    </APIProvider>
  );
}

// --- Components ---

function AdDetailModal({ ad, onClose }: { ad: Ad | any, onClose: () => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const price = ad.price.includes('€') ? ad.price : `${ad.price}€`;
  const images = ad.images && ad.images.length > 0 ? ad.images : [ad.image_url || ad.image];
  const createdAt = 'created_at' in ad ? ad.created_at : new Date().toISOString();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [ad.id]);

  const nextImage = (e?: any) => {
    e?.stopPropagation();
    setDirection(1);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: any) => {
    e?.stopPropagation();
    setDirection(-1);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const onDragEnd = (event: any, info: any) => {
    if (images.length <= 1) return;
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      nextImage();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      prevImage();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={scrollContainerRef}
      className="fixed inset-x-0 bottom-[80px] md:inset-0 z-50 overflow-y-auto overscroll-contain touch-pan-y" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))' }}
    >
      <div 
        className="min-h-full flex items-start justify-center p-4 py-12"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md -z-10"
        />
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col my-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={onClose}
              className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg text-slate-900 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div 
              className="h-56 sm:h-80 overflow-hidden relative group cursor-zoom-in touch-pan-y no-swipe"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: direction * 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 100 }}
                transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                drag={images.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                onClick={() => setIsFullScreen(true)}
              >
                <img 
                  src={images[currentImageIndex]} 
                  alt={ad.title} 
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </motion.div>
              
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_: any, i: number) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all",
                          i === currentImageIndex ? "bg-white w-4" : "bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1">
                    {ad.category}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 font-display">{ad.title}</h3>
                </div>
                <div className="text-2xl font-semibold text-brand-blue">
                  {price}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {ad.location && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {ad.location}
                  </div>
                )}
                {ad.condition && ad.condition !== 'N/A' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <Tag className="w-3.5 h-3.5" />
                    {ad.condition}
                  </div>
                )}
                {ad.type && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue/10 rounded-full text-xs font-bold text-brand-blue">
                    For {ad.type}
                  </div>
                )}
                {ad.fuel_type && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <Fuel className="w-3.5 h-3.5" />
                    {ad.fuel_type}
                  </div>
                )}
                {ad.property_type && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <Building2 className="w-3.5 h-3.5" />
                    {ad.property_type}
                  </div>
                )}
                {ad.contract_type && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <Briefcase className="w-3.5 h-3.5" />
                    {ad.contract_type}
                  </div>
                )}
                {ad.size && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                    <Shirt className="w-3.5 h-3.5" />
                    Size: {ad.size}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRelativeTime(createdAt)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900">Description</h4>
              <div className="markdown-body">
                <SimpleMarkdown>{ad.description || "No description provided for this item."}</SimpleMarkdown>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button 
                className="flex-1 bg-brand-blue text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 active:scale-[0.98] transition-transform"
                onClick={() => {
                  window.location.href = `mailto:seller@example.com?subject=Inquiry about ${ad.title}`;
                }}
              >
                Send Email to Seller
              </button>
              <button className="p-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-[0.98] transition-transform">
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
            </div>
          </div>
        </motion.div>

        {/* Full Screen Image Portal */}
        <AnimatePresence>
          {isFullScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
              onClick={() => setIsFullScreen(false)}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-[110]"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative w-full h-full flex items-center justify-center p-4 no-swipe">
                <motion.img
                  key={currentImageIndex}
                  initial={{ scale: 0.9, opacity: 0, x: direction * 200 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.9, opacity: 0, x: -direction * 200 }}
                  transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                  drag={images.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={onDragEnd}
                  src={images[currentImageIndex]}
                  alt={ad.title}
                  className="max-w-full max-h-full object-contain shadow-2xl cursor-grab active:cursor-grabbing select-none"
                  onClick={(e) => e.stopPropagation()}
                />

                {images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white transition-all"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white transition-all"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
);
}

function RecommendationItem({ rec, onUpdate, onStartAdding }: { rec: any, onUpdate: () => void, onStartAdding: (rec: any) => void, key?: any }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [refuseReason, setRefuseReason] = useState(rec.admin_notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleUpdateStatus = async (status: 'validated' | 'refused' | 'pending') => {
    console.log('Attempting to update status:', { id: rec.id, status, refuseReason });
    setIsUpdating(true);
    setError(null);
    try {
      const result = await proService.updateRecommendationStatus(rec.id, status, status === 'refused' ? refuseReason : null);
      console.log('Update successful:', result);
      if (status === 'pending') setRefuseReason('');
      onUpdate();
      setShowRefuseForm(false);
    } catch (err: any) {
      console.error('Update failed:', err);
      setError(err?.message || "Failed to update status. Make sure columns 'status' and 'admin_notes' exist in your Supabase table.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'refused': return 'text-red-500 bg-red-50 border-red-100';
      default: return 'text-amber-500 bg-amber-50 border-amber-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'refused': return <X className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-[28px] md:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex gap-4 w-full sm:w-auto">
          {rec.pro_image_url && (
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
              <img src={rec.pro_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h3 className="font-bold text-base md:text-lg text-slate-900 truncate max-w-[200px]">{rec.pro_name || rec.company_name}</h3>
              {rec.pro_name && rec.company_name && (
                <span className="text-slate-400 font-medium text-xs md:text-sm">at {rec.company_name}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-slate-100 text-[9px] md:text-[10px] font-bold uppercase text-slate-500 rounded-full tracking-wider">{rec.pro_category}</span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1",
                getStatusColor(rec.status)
              )}>
                {getStatusIcon(rec.status)}
                {rec.status || 'pending'}
              </div>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase sm:ml-auto whitespace-nowrap">{rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'Recently'}</span>
      </div>
      
      {rec.status !== 'refused' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-slate-50/50 p-4 rounded-2xl">
          {rec.pro_email && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="font-medium text-slate-700 truncate">{rec.pro_email}</p>
            </div>
          )}
          {rec.pro_phone && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="font-medium text-slate-700">{rec.pro_phone}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Suggested by</p>
            <p className="font-medium text-brand-blue truncate">{rec.user_email}</p>
          </div>
        </div>
      )}

      {rec.status !== 'refused' && rec.notes && (
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">Member Notes</p>
          <p className="text-slate-600 text-sm leading-relaxed italic">"{rec.notes}"</p>
        </div>
      )}

      {rec.status === 'refused' && (
        <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
          <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3 h-3" /> Recommended Pro Refused
          </p>
          <p className="text-xs text-slate-500 font-medium">This recommendation is currently hidden from the live app. You can reset it to move it back to the moderation queue.</p>
        </div>
      )}

      {rec.admin_notes && (
        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
          <p className="text-[10px] uppercase font-semibold text-red-500 tracking-wider mb-2">Admin Explanation</p>
          <p className="text-red-700 text-sm leading-relaxed">{rec.admin_notes}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs text-red-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="pt-4 border-t border-slate-50 flex flex-wrap items-center gap-3">
        {!showRefuseForm ? (
          <>
            {rec.status === 'validated' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" /> Validated
              </div>
            ) : rec.status !== 'refused' && (
              <button 
                disabled={isUpdating}
                onClick={() => onStartAdding(rec)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Start adding pro
              </button>
            )}
            {rec.status === 'pending' && (
              <button 
                disabled={isUpdating}
                onClick={() => setShowRefuseForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Refuse
              </button>
            )}
            {rec.status !== 'pending' && (
              <button 
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('pending')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-50 hover:text-amber-500 transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset pending
              </button>
            )}
          </>
        ) : (
          <div className="w-full space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Refusal Reason / Explanation</label>
              <textarea 
                value={refuseReason}
                onChange={e => setRefuseReason(e.target.value)}
                placeholder="Explain why this professional was refused..."
                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-red-100 text-sm h-24"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={isUpdating || !refuseReason.trim()}
                onClick={() => handleUpdateStatus('refused')}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
              >
                Confirm refusal
              </button>
              <button 
                onClick={() => setShowRefuseForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CategorySelectorProps {
  categories: string[];
  onChange: (cats: string[]) => void;
  primaryColorClass: string;
  ringColorClass: string;
  borderColorClass: string;
  tagBgClass: string;
}

function CategorySelector({ 
  categories = [], 
  onChange, 
  ringColorClass,
  tagBgClass
}: CategorySelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const popular = [
    "Dance School",
    "Yoga Studio",
    "Gym & Fitness",
    "Hairdresser",
    "Nursery School",
    "Coworking Space",
    "Real Estate Agent",
    "Tax Advisor / Gestor",
    "Dentist",
    "Physiotherapist",
    "General Practitioner",
    "Therapist / Psychologist",
    "Web Developer",
    "Electrician",
    "Plumber",
    "Locksmith"
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onChange([...categories, trimmed]);
    }
    setInputValue('');
  };

  const removeCategory = (catToRemove: string) => {
    onChange(categories.filter(c => c !== catToRemove));
  };

  const filteredSuggestions = popular.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !categories.includes(s)
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(true)}
        className={`min-h-12 w-full bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-wrap items-center gap-2 cursor-pointer focus-within:outline-none focus-within:ring-2 ${ringColorClass} transition-all`}
      >
        {categories.map(cat => (
          <span 
            key={cat} 
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-display cursor-default select-none ${tagBgClass}`}
          >
            {cat}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCategory(cat);
              }}
              className="text-slate-400 hover:text-slate-600 font-bold ml-1 flex items-center justify-center p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (inputValue.trim()) {
                addCategory(inputValue);
              }
            }
          }}
          placeholder={categories.length === 0 ? "e.g. Dance School, Yoga Gym" : "Add more..."}
          className="flex-1 bg-transparent min-w-[120px] outline-none text-slate-900 border-none px-2 py-1 font-medium text-sm focus:ring-0"
        />
        <div className="text-slate-400 px-2 flex items-center self-stretch justify-center h-full pointer-events-none">
          <ChevronDown className="w-4 h-4 ml-auto" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-50 font-display">
          {filteredSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => {
                addCategory(suggestion);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-slate-200" />
              {suggestion}
            </button>
          ))}
          {inputValue.trim() && !categories.includes(inputValue.trim()) && (
            <button
              type="button"
              onClick={() => {
                addCategory(inputValue);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-xs md:text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-slate-200" />
              Add "{inputValue.trim()}"
            </button>
          )}
          {filteredSuggestions.length === 0 && !inputValue.trim() && (
            <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
              No recommendations left. Type to add custom category.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminView({ 
  scrollToTop, 
  onRefetchPros, 
  currentUser, 
  events = [], 
  onRefetchEvents, 
  allPros = [],
  highlightedProId,
  setHighlightedProId,
  highlightedEventId,
  setHighlightedEventId,
  highlightedArticleId,
  setHighlightedArticleId,
  highlightedTestimonyId,
  setHighlightedTestimonyId,
  highlightedProIds,
  setHighlightedProIds,
  highlightedEventIds,
  setHighlightedEventIds,
  highlightedArticleIds,
  setHighlightedArticleIds,
  highlightedTestimoniesIds,
  setHighlightedTestimoniesIds,
  guideCategories = [],
  setGuideCategories,
  allArticles = [],
  setGlobalAlert,
  onRefetchAnnouncements
}: { 
  scrollToTop?: () => void, 
  onRefetchPros?: () => Promise<void>, 
  currentUser?: any, 
  events?: Event[], 
  onRefetchEvents?: () => Promise<void>, 
  allPros?: Professional[],
  highlightedProId: string | null,
  setHighlightedProId: React.Dispatch<React.SetStateAction<string | null>>,
  highlightedEventId: string | null,
  setHighlightedEventId: React.Dispatch<React.SetStateAction<string | null>>,
  highlightedArticleId: string | null,
  setHighlightedArticleId: React.Dispatch<React.SetStateAction<string | null>>,
  highlightedTestimonyId: string | null,
  setHighlightedTestimonyId: React.Dispatch<React.SetStateAction<string | null>>,
  highlightedProIds: string[],
  setHighlightedProIds: React.Dispatch<React.SetStateAction<string[]>>,
  highlightedEventIds: string[],
  setHighlightedEventIds: React.Dispatch<React.SetStateAction<string[]>>,
  highlightedArticleIds: string[],
  setHighlightedArticleIds: React.Dispatch<React.SetStateAction<string[]>>,
  highlightedTestimoniesIds: string[],
  setHighlightedTestimoniesIds: React.Dispatch<React.SetStateAction<string[]>>,
  guideCategories?: any[],
  setGuideCategories: React.Dispatch<React.SetStateAction<any[]>>,
  allArticles?: any[],
  adminAnnContent?: string,
  setAdminAnnContent?: React.Dispatch<React.SetStateAction<string>>,
  adminAnnActive?: boolean,
  setAdminAnnActive?: React.Dispatch<React.SetStateAction<boolean>>,
  adminAnnCtaText?: string,
  setAdminAnnCtaText?: React.Dispatch<React.SetStateAction<string>>,
  adminAnnCtaType?: string,
  setAdminAnnCtaType?: React.Dispatch<React.SetStateAction<string>>,
  savingAnnouncement?: boolean,
  setSavingAnnouncement?: React.Dispatch<React.SetStateAction<boolean>>,
  setAnnouncement?: React.Dispatch<React.SetStateAction<any>>,
  setGlobalAlert: React.Dispatch<React.SetStateAction<any>>,
  onRefetchAnnouncements?: () => void
}) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardCategory, setDashboardCategory] = useState<'pros' | 'events' | 'testimonies' | 'reported_users' | 'highlights' | 'guides' | 'announcements'>('pros');
  const [activeTab, setActiveTab ] = useState<'recommendations' | 'add_pro' | 'edit_pro' | 'add_event' | 'edit_event' | 'all_events' | 'completed' | 'refused'>('recommendations');
  const [activeRecId, setActiveRecId] = useState<string | null>(null);
  const [editingProId, setEditingProId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [completedPros, setCompletedPros] = useState<Professional[]>([]);
  const [activeProSort, setActiveProSort] = useState<'alphabet' | 'created_at'>('created_at');
  const [allTestimonies, setAllTestimonies] = useState<any[]>([]);
  const [testimoniesFilter, setTestimoniesFilter] = useState<'pending' | 'processed'>('pending');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const [loadingGuides, setLoadingGuides] = useState(false);
  const [editingArticle, setEditingArticle] = useState<GuideArticle | null>(null);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [guideFormCategory, setGuideFormCategory] = useState('getting-started');

  const [articleFormTitle, setArticleFormTitle] = useState('');
  const [articleFormExcerpt, setArticleFormExcerpt] = useState('');
  const [articleFormContent, setArticleFormContent] = useState('');
  const [articleFormImageUrl, setArticleFormImageUrl] = useState('');
  const [articleFormBusinessName, setArticleFormBusinessName] = useState('');
  const [articleFormIsOnline, setArticleFormIsOnline] = useState(true);

  const [articleFormAuthorName, setArticleFormAuthorName] = useState('');
  const [articleFormAuthorRole, setArticleFormAuthorRole] = useState('');
  const [articleFormAuthorBusiness, setArticleFormAuthorBusiness] = useState('');
  const [articleFormAuthorWebsite, setArticleFormAuthorWebsite] = useState('');
  const [articleFormAuthorEmail, setArticleFormAuthorEmail] = useState('');
  const [articleFormAuthorPhone, setArticleFormAuthorPhone] = useState('');

  const [savingArticle, setSavingArticle] = useState(false);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [uploadingArticleImg, setUploadingArticleImg] = useState(false);

  const handleArticleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingArticleImg(true);
    try {
      const path = `articles/${Date.now()}_${file.name}`;
      const publicUrl = await storageService.uploadFile('images', path, file);
      setArticleFormImageUrl(publicUrl);
      setMsg({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (err: any) {
      console.error('Error uploading article image:', err);
      setMsg({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setUploadingArticleImg(false);
    }
  };

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<any>(null);

  // Announcements states inside AdminView
  const [adminAnnouncements, setAdminAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annFormTitle, setAnnFormTitle] = useState('');
  const [annFormContent, setAnnFormContent] = useState('');
  const [annFormIsActive, setAnnFormIsActive] = useState(true);
  const [annFormCtaType, setAnnFormCtaType] = useState('');
  const [annFormIcon, setAnnFormIcon] = useState('megaphone');
  const [savingAnn, setSavingAnn] = useState(false);
  const [deletingAnnId, setDeletingAnnId] = useState<string | null>(null);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);

  const fetchAdminAnnouncements = async () => {
    if (!isSupabaseConfigured) return;
    setLoadingAnnouncements(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const parsed = (data || []).map(ann => parseAnnouncement(ann));
      setAdminAnnouncements(parsed);
    } catch (err: any) {
      console.error('Error fetching admin announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annFormContent.trim()) {
      setMsg({ type: 'error', text: 'Please fill in the message.' });
      return;
    }
    setSavingAnn(true);
    try {
      const iconTag = `[icon:${annFormIcon || 'megaphone'}]`;
      const titleTag = annFormTitle.trim() ? `[${annFormTitle.trim()}] ` : '';
      const formattedContent = `${iconTag}${titleTag}${annFormContent.trim()}`;

      if (editingAnnId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            content: formattedContent,
            is_active: annFormIsActive,
            cta_type: annFormCtaType || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAnnId);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Announcement updated successfully.' });
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([
            {
              content: formattedContent,
              is_active: annFormIsActive,
              cta_type: annFormCtaType || null,
              updated_at: new Date().toISOString()
            }
          ]);
        if (error) throw error;
        setMsg({ type: 'success', text: 'Announcement published successfully!' });
      }
      
      // Reset form
      setAnnFormTitle('');
      setAnnFormContent('');
      setAnnFormIsActive(true);
      setAnnFormCtaType('');
      setAnnFormIcon('megaphone');
      setEditingAnnId(null);
      setShowAnnForm(false);
      
      // Refresh
      fetchAdminAnnouncements();
      if (onRefetchAnnouncements) {
        onRefetchAnnouncements();
      }
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setMsg({ type: 'error', text: 'Error saving announcement: ' + err.message });
    } finally {
      setSavingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setDeletingAnnId(id);
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Announcement deleted successfully.' });
      
      fetchAdminAnnouncements();
      if (onRefetchAnnouncements) {
        onRefetchAnnouncements();
      }
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setMsg({ type: 'error', text: 'Error deleting announcement: ' + err.message });
    } finally {
      setDeletingAnnId(null);
    }
  };

  const handleEditAnnouncementClick = (ann: any) => {
    setAnnFormTitle(ann.title || '');
    setAnnFormContent(ann.content || '');
    setAnnFormIsActive(ann.is_active !== false);
    setAnnFormCtaType(ann.cta_type || '');
    setAnnFormIcon(ann.icon || ann.type || 'megaphone');
    setEditingAnnId(ann.id);
    setShowAnnForm(true);
  };

  const handlePreviewArticle = () => {
    const categoryTitle = guideCategories.find(c => c.id === guideFormCategory)?.title || 'Guide';
    const hasAnyAuthorField = !!(
      articleFormAuthorName.trim() ||
      articleFormAuthorRole.trim() ||
      articleFormAuthorBusiness.trim() ||
      articleFormAuthorWebsite.trim() ||
      articleFormAuthorEmail.trim() ||
      articleFormAuthorPhone.trim()
    );
    const previewArt = {
      id: editingArticle ? editingArticle.id : 'preview-id',
      title: articleFormTitle || 'Untitled Preview Article',
      excerpt: articleFormExcerpt || 'No excerpt provided yet.',
      content: articleFormContent || 'No content written yet.',
      imageUrl: articleFormImageUrl || undefined,
      businessName: articleFormBusinessName || undefined,
      categoryTitle: categoryTitle,
      author: hasAnyAuthorField ? {
        name: articleFormAuthorName.trim() || undefined,
        role: articleFormAuthorRole.trim() || undefined,
        businessName: articleFormAuthorBusiness.trim() || undefined,
        website: articleFormAuthorWebsite.trim() || undefined,
        email: articleFormAuthorEmail.trim() || undefined,
        phone: articleFormAuthorPhone.trim() || undefined
      } : undefined
    };

    setPreviewArticle(previewArt);
    setShowPreviewModal(true);
  };

  const fetchGuides = async () => {
    setLoadingGuides(true);
    try {
      const raw = await guideService.getGuideCategories();
      setGuideCategories(raw || []);
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoadingGuides(false);
    }
  };

  const handleEditArticleClick = (art: any, categoryId: string) => {
    setEditingArticle(art);
    setGuideFormCategory(categoryId);
    setArticleFormTitle(art.title || '');
    setArticleFormExcerpt(art.excerpt || '');
    setArticleFormContent(art.content || '');
    setArticleFormImageUrl(art.imageUrl || art.image_url || '');
    setArticleFormBusinessName(art.businessName || art.business_name || '');
    setArticleFormIsOnline(art.isOnline !== false);
    
    if (art.author) {
      setArticleFormAuthorName(art.author.name || '');
      setArticleFormAuthorRole(art.author.role || '');
      setArticleFormAuthorBusiness(art.author.businessName || art.author.business_name || '');
      setArticleFormAuthorWebsite(art.author.website || '');
      setArticleFormAuthorEmail(art.author.email || '');
      setArticleFormAuthorPhone(art.author.phone || '');
    } else {
      setArticleFormAuthorName('');
      setArticleFormAuthorRole('');
      setArticleFormAuthorBusiness('');
      setArticleFormAuthorWebsite('');
      setArticleFormAuthorEmail('');
      setArticleFormAuthorPhone('');
    }
    
    setShowArticleForm(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleFormTitle.trim() || !articleFormExcerpt.trim()) {
      setMsg({ type: 'error', text: 'Please fill in Title and Excerpt.' });
      return;
    }

    setSavingArticle(true);
    try {
      const hasAnyAuthorField = !!(
        articleFormAuthorName.trim() ||
        articleFormAuthorRole.trim() ||
        articleFormAuthorBusiness.trim() ||
        articleFormAuthorWebsite.trim() ||
        articleFormAuthorEmail.trim() ||
        articleFormAuthorPhone.trim()
      );
      const authorObj = hasAnyAuthorField ? {
        name: articleFormAuthorName.trim() || undefined,
        role: articleFormAuthorRole.trim() || undefined,
        businessName: articleFormAuthorBusiness.trim() || undefined,
        website: articleFormAuthorWebsite.trim() || undefined,
        email: articleFormAuthorEmail.trim() || undefined,
        phone: articleFormAuthorPhone.trim() || undefined
      } : undefined;

      const artId = editingArticle ? editingArticle.id : 'art-' + Date.now();
      const articlePayload: GuideArticle = {
        id: artId,
        title: articleFormTitle,
        excerpt: articleFormExcerpt,
        content: articleFormContent || undefined,
        imageUrl: articleFormImageUrl || undefined,
        businessName: articleFormBusinessName || undefined,
        isOnline: articleFormIsOnline,
        author: authorObj || undefined
      };

      if (editingArticle) {
        await guideService.updateArticle(articlePayload, guideFormCategory);
        setMsg({ type: 'success', text: 'Article updated successfully!' });
      } else {
        await guideService.createArticle(articlePayload, guideFormCategory);
        setMsg({ type: 'success', text: 'Article created successfully!' });
      }

      setShowArticleForm(false);
      setEditingArticle(null);
      await fetchGuides();
    } catch (err: any) {
      console.error('Failed to save article:', err);
      setMsg({ type: 'error', text: 'Failed to save article: ' + err.message });
    } finally {
      setSavingArticle(false);
    }
  };

  const handleDeleteArticle = async (artId: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    
    setDeletingArticleId(artId);
    try {
      await guideService.deleteArticle(artId);
      setMsg({ type: 'success', text: 'Article deleted successfully!' });
      await fetchGuides();
    } catch (err: any) {
      console.error('Failed to delete article:', err);
      setMsg({ type: 'error', text: 'Failed to delete article: ' + err.message });
    } finally {
      setDeletingArticleId(null);
    }
  };

  const [proSearch, setProSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [testimonySearch, setTestimonySearch] = useState('');
  const [articleSearch, setArticleSearch] = useState('');

  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [refusalReason, setRefusalReason] = useState<{ [key: string]: string }>({});
  const [showConfirmAction, setShowConfirmAction] = useState<{ [key: string]: 'approve' | 'delete' | null }>({});

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const data = await chatService.getAllReports();
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleResolveReport = async (reportId: string | number) => {
    // Optimistic UI update for instant feedback
    setReports(prev => prev.map(r => String(r.id) === String(reportId) ? { ...r, resolved: true } : r));

    try {
      const result = await chatService.resolveReport(reportId);
      if (result && result.localOnly) {
        setMsg({ 
          type: 'success', 
          text: 'Report resolved locally! To save permanently on Supabase, execute this SQL: ALTER TABLE user_reports ADD COLUMN resolved BOOLEAN DEFAULT false;' 
        });
      } else {
        setMsg({ type: 'success', text: 'Report resolved successfully!' });
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      setMsg({ 
        type: 'error', 
        text: "Report resolved locally, but failed to sync online. Please check if the 'resolved' (BOOLEAN, default FALSE) column exists in your Supabase 'user_reports' table." 
      });
    }
  };

  const [highlightingId, setHighlightingId] = useState<string | null>(null);

  const handleToggleHighlight = async (type: 'pro' | 'event' | 'article' | 'testimony', id: string | number) => {
    setHighlightingId(String(id));
    const targetId = String(id);
    try {
      if (type === 'pro') {
        const isNowHighlighted = !highlightedProIds.includes(targetId);
        const newIds = isNowHighlighted ? [targetId] : [];
        
        setHighlightedProIds(newIds);
        setHighlightedProId(isNowHighlighted ? targetId : null);
        localStorage.setItem('highlighted_pro_ids', newIds.join(','));
        localStorage.setItem('highlighted_pro_id', isNowHighlighted ? targetId : '');

        if (isSupabaseConfigured) {
          // Reset all others if highlighting a new one
          if (isNowHighlighted) {
            await supabase.from('professionals').update({ is_highlighted: false }).neq('id', targetId);
          }
          
          const { error: setError } = await supabase
            .from('professionals')
            .update({ is_highlighted: isNowHighlighted })
            .eq('id', targetId);

          if (setError) {
            console.warn('Could not set pro highlighted state in database:', setError);
            if (setError.message?.includes('policy') || setError.message?.includes('security') || setError.message?.includes('permission') || String(setError.code) === '42501') {
              setMsg({ 
                type: 'success', 
                text: 'Highlight updated locally! However, the database update was restricted by RLS policy. To allow admin profiles to manage highlights, run the SQL script under the Landing Page Highlights header.'
              });
            } else {
              setMsg({ type: 'error', text: 'Database error: ' + setError.message });
            }
          } else {
            setMsg({ type: 'success', text: isNowHighlighted ? 'Professional updated as the unique highlight!' : 'Highlight removed!' });
          }
        } else {
          setMsg({ type: 'success', text: isNowHighlighted ? 'Professional updated as unique highlight locally!' : 'Highlight removed locally!' });
        }
        if (onRefetchPros) await onRefetchPros();
        await fetchCompletedPros();

      } else if (type === 'event') {
        const isNowHighlighted = !highlightedEventIds.includes(targetId);
        const newIds = isNowHighlighted ? [targetId] : [];
        
        setHighlightedEventIds(newIds);
        setHighlightedEventId(isNowHighlighted ? targetId : null);
        localStorage.setItem('highlighted_event_ids', newIds.join(','));
        localStorage.setItem('highlighted_event_id', isNowHighlighted ? targetId : '');

        if (isSupabaseConfigured) {
          // Reset all others if highlighting a new one
          if (isNowHighlighted) {
            await supabase.from('events').update({ is_highlighted: false }).neq('id', targetId);
          }

          const { error: setError } = await supabase
            .from('events')
            .update({ is_highlighted: isNowHighlighted })
            .eq('id', targetId);

          if (setError) {
            console.warn('Could not set event highlighted state in database:', setError);
            if (setError.message?.includes('policy') || setError.message?.includes('security') || setError.message?.includes('permission') || String(setError.code) === '42501') {
              setMsg({ 
                type: 'success', 
                text: 'Highlight updated locally! However, the database update was restricted by RLS policy. To allow admin profiles to manage highlights, run the SQL script under the Landing Page Highlights header.'
              });
            } else {
              setMsg({ type: 'error', text: 'Database error: ' + setError.message });
            }
          } else {
            setMsg({ type: 'success', text: isNowHighlighted ? 'Event updated as the unique highlight!' : 'Highlight removed!' });
          }
        } else {
          setMsg({ type: 'success', text: isNowHighlighted ? 'Event updated as unique highlight locally!' : 'Highlight removed locally!' });
        }
        if (onRefetchEvents) await onRefetchEvents();

      } else if (type === 'article') {
        const isNowHighlighted = !highlightedArticleIds.includes(targetId);
        let newIds = isNowHighlighted ? [targetId] : [];
        if (newIds.length === 0) {
          newIds = ['gs-1']; // maintain at least default article
        }
        
        const finalId = newIds[0];
        setHighlightedArticleIds(newIds);
        setHighlightedArticleId(finalId);
        localStorage.setItem('highlighted_article_ids', newIds.join(','));
        localStorage.setItem('highlighted_article_id', finalId);

        if (isSupabaseConfigured) {
          // Reset all others if highlighting a new one
          if (isNowHighlighted) {
            await supabase.from('guide_articles').update({ is_highlighted: false }).neq('id', targetId);
          }

          const { error: setError } = await supabase
            .from('guide_articles')
            .update({ is_highlighted: isNowHighlighted })
            .eq('id', targetId);

          if (setError) {
            console.warn('Could not set article highlighted state in database:', setError);
            if (setError.message?.includes('column "is_highlighted" of relation "guide_articles" does not exist') || String(setError.code) === '42703') {
              setMsg({ 
                type: 'success', 
                text: 'Article updated locally! Run this SQL in Supabase to sync for everyone: ALTER TABLE guide_articles ADD COLUMN is_highlighted BOOLEAN DEFAULT false;' 
              });
            } else if (setError.message?.includes('policy') || setError.message?.includes('security') || setError.message?.includes('permission') || String(setError.code) === '42501') {
              setMsg({ 
                type: 'success', 
                text: 'Highlight updated locally! However, the database update was restricted by RLS policy. To allow admin profiles to manage highlights, run the SQL script under the Landing Page Highlights header.'
              });
            } else {
              setMsg({ type: 'error', text: 'Failed to update: ' + setError.message });
            }
          } else {
            setMsg({ type: 'success', text: isNowHighlighted ? 'Article updated as the unique highlight!' : 'Highlight reset to default!' });
          }

          // Refetch guides
          try {
            const raw = await guideService.getGuideCategories();
            setGuideCategories(raw || []);
          } catch (e) {
            console.error('Failed to reload guides after highlight:', e);
          }
        } else {
          setMsg({ type: 'success', text: isNowHighlighted ? 'Article updated as unique highlight locally!' : 'Highlight reset to default locally!' });
        }

      } else if (type === 'testimony') {
        const isNowHighlighted = !highlightedTestimoniesIds.includes(targetId);
        const newIds = isNowHighlighted ? [targetId] : [];
        
        setHighlightedTestimoniesIds(newIds);
        setHighlightedTestimonyId(isNowHighlighted ? targetId : null);
        localStorage.setItem('highlighted_testimony_ids', newIds.join(','));
        localStorage.setItem('highlighted_testimony_id', isNowHighlighted ? targetId : '');

        if (isSupabaseConfigured) {
          // Reset all others if highlighting a new one
          if (isNowHighlighted) {
            await supabase.from('testimonies').update({ is_highlighted: false }).neq('id', targetId);
          }

          const { error: setError } = await supabase
            .from('testimonies')
            .update({ is_highlighted: isNowHighlighted })
            .eq('id', targetId);

          if (setError) {
            console.warn('Could not set testimony highlighted state in database:', setError);
            if (setError.message?.includes('policy') || setError.message?.includes('security') || setError.message?.includes('permission') || String(setError.code) === '42501') {
              setMsg({ 
                type: 'success', 
                text: 'Highlight updated locally! However, the database update was restricted by RLS policy. To allow admin profiles to manage highlights, run the SQL script under the Landing Page Highlights header.'
              });
            } else {
              setMsg({ type: 'error', text: 'Database error: ' + setError.message });
            }
          } else {
            setMsg({ type: 'success', text: isNowHighlighted ? 'Testimony updated as the unique highlight!' : 'Highlight removed!' });
          }
        } else {
          setMsg({ type: 'success', text: isNowHighlighted ? 'Testimony updated as unique highlight locally!' : 'Highlight removed locally!' });
        }
        await fetchAllTestimonies();
      }
    } catch (err) {
      console.error('Error highlighting item:', err);
      setMsg({ type: 'error', text: 'Failed to update highlight: ' + (err instanceof Error ? err.message : String(err)) });
    } finally {
      setHighlightingId(null);
    }
  };

  const fetchCompletedPros = async () => {
    try {
      const data = await proService.getProfessionals();
      setCompletedPros(data);
      if (data && data.length > 0) {
        const dbHighlight = data.find((p: any) => p.is_highlighted);
        if (dbHighlight) {
          setHighlightedProId(dbHighlight.id);
          localStorage.setItem('highlighted_pro_id', dbHighlight.id);
        }
      }
    } catch (error) {
      console.error('Error fetching completed pros:', error);
    }
  };

  const fetchAllTestimonies = async () => {
    try {
      const data = await proService.getAllTestimonies();
      setAllTestimonies(data);
      if (data && data.length > 0) {
        const dbHighlight = data.find((t: any) => t.is_highlighted);
        if (dbHighlight) {
          setHighlightedTestimonyId(String(dbHighlight.id));
          localStorage.setItem('highlighted_testimony_id', String(dbHighlight.id));
        }
      }
    } catch (error) {
      console.error('Error fetching all testimonies:', error);
    }
  };

  const handleDeleteTestimony = async (id: string | number) => {
    try {
      await proService.deleteTestimony(id);
      await fetchAllTestimonies(); // Refresh
      setMsg({ type: 'success', text: 'Testimony deleted successfully.' });
    } catch (error) {
      console.error('Error deleting testimony:', error);
      setMsg({ type: 'error', text: 'Failed to delete testimony: ' + (error as any).message });
    }
  };

  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompletedPros();
    }
  }, [activeTab]);

  useEffect(() => {
    if (dashboardCategory === 'testimonies') {
      fetchAllTestimonies();
    } else if (dashboardCategory === 'reported_users') {
      fetchReports();
    } else if (dashboardCategory === 'highlights') {
      fetchCompletedPros();
      fetchAllTestimonies();
      fetchGuides();
    } else if (dashboardCategory === 'guides') {
      fetchGuides();
    } else if (dashboardCategory === 'announcements') {
      fetchAdminAnnouncements();
    }
  }, [dashboardCategory]);

  // Synchronize dynamic DB values into multi-state arrays on Admin Page
  // Now strictly enforcing single selection
  useEffect(() => {
    if (completedPros && completedPros.length > 0) {
      const dbHighlightedIds = completedPros.filter((p: any) => p.is_highlighted === true || p.is_highlighted === 'true' || p.is_highlighted === 1).map(p => String(p.id));
      if (dbHighlightedIds.length > 0) {
        const singleId = dbHighlightedIds[dbHighlightedIds.length - 1];
        setHighlightedProIds([singleId]);
        setHighlightedProId(singleId);
        localStorage.setItem('highlighted_pro_ids', singleId);
        localStorage.setItem('highlighted_pro_id', singleId);
      }
    }
  }, [completedPros]);

  useEffect(() => {
    if (events && events.length > 0) {
      const dbHighlightedIds = events.filter((e: any) => e.is_highlighted === true || e.is_highlighted === 'true' || e.is_highlighted === 1).map(e => String(e.id));
      if (dbHighlightedIds.length > 0) {
        const singleId = dbHighlightedIds[dbHighlightedIds.length - 1];
        setHighlightedEventIds([singleId]);
        setHighlightedEventId(singleId);
        localStorage.setItem('highlighted_event_ids', singleId);
        localStorage.setItem('highlighted_event_id', singleId);
      }
    }
  }, [events]);

  useEffect(() => {
    if (allTestimonies && allTestimonies.length > 0) {
      const dbHighlightedIds = allTestimonies.filter((t: any) => t.is_highlighted === true || t.is_highlighted === 'true' || t.is_highlighted === 1).map(t => String(t.id));
      if (dbHighlightedIds.length > 0) {
        const singleId = dbHighlightedIds[dbHighlightedIds.length - 1];
        setHighlightedTestimoniesIds([singleId]);
        setHighlightedTestimonyId(singleId);
        localStorage.setItem('highlighted_testimony_ids', singleId);
        localStorage.setItem('highlighted_testimony_id', singleId);
      }
    }
  }, [allTestimonies]);

  // Form state for adding pro
  const [newPro, setNewPro] = useState({
    name: '',
    company_name: '',
    category: '',
    categories: [] as string[],
    rating: 0,
    review_count: 0,
    languages: [] as string[],
    image: '',
    bio: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    instagram: '',
    facebook: '',
    location: '',
    lat: 0,
    lng: 0,
    top_qualities: [] as string[],
    has_filled_form: false
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    category: '',
    description: '',
    image: '',
    lat: 0,
    lng: 0
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToTop?.();
    fetchRecommendations();
    fetchCompletedPros();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await proService.getRecommendations();
      setRecommendations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

   const handleStartAdding = (rec: any) => {
    setActiveRecId(rec.id);
    setEditingProId(null);
    setSelectedFile(null);
    const initialCategories = rec.pro_category ? rec.pro_category.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setNewPro({
      ...newPro,
      name: rec.pro_name || '',
      company_name: rec.company_name || '',
      category: rec.pro_category || '',
      categories: initialCategories,
      phone: rec.pro_phone || '',
      whatsapp: rec.whatsapp || '',
      email: rec.pro_email || '',
      image: rec.pro_image_url || '',
      languages: rec.pro_languages || [],
      top_qualities: rec.top_qualities || [],
      has_filled_form: false
    });
    if (rec.pro_image_url) {
      setPreviewUrl(rec.pro_image_url);
    }
    setActiveTab('add_pro');
    scrollToTop?.();
  };

  const handleStartEditing = (pro: Professional) => {
    console.log('[handleStartEditing] Editing pro:', pro);
    setEditingProId(pro.id);
    setActiveRecId(null);
    setSelectedFile(null);
    
    // Mapping from Professional interface (which is already normalized by proService)
    const bioValue = pro.bio || '';
    const imageValue = pro.image || '';
    const categoryValue = pro.category || '';
    const categoriesValue = pro.categories || (pro.category ? pro.category.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const latValue = pro.coordinates?.lat ?? 0;
    const lngValue = pro.coordinates?.lng ?? 0;

    setNewPro({
      name: pro.name || '',
      company_name: pro.company_name || '',
      category: categoryValue,
      categories: categoriesValue,
      rating: pro.rating ?? 0,
      review_count: pro.review_count || 0,
      languages: Array.isArray(pro.languages) ? pro.languages : [],
      image: imageValue,
      bio: bioValue,
      phone: pro.phone || '',
      whatsapp: pro.whatsapp || '',
      email: pro.email || '',
      website: pro.website || '',
      instagram: pro.instagram || '',
      facebook: pro.facebook || '',
      location: pro.location || '',
      lat: Number(latValue),
      lng: Number(lngValue),
      top_qualities: pro.top_qualities || [],
      has_filled_form: pro.has_filled_form || false
    });
    setPreviewUrl(imageValue || null);
    setActiveTab('edit_pro');
    scrollToTop?.();
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      let imageUrl = newEvent.image;
      if (selectedFile) {
        let fileToUpload = await compressImage(selectedFile);
        const path = `events/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        imageUrl = await storageService.uploadFile('images', path, fileToUpload);
      }

      // Geocoding for event
      let finalLat = newEvent.lat;
      let finalLng = newEvent.lng;
      if ((finalLat === 0 || finalLng === 0) && newEvent.location) {
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: newEvent.location }, (results, status) => {
              if (status === 'OK' && results && results.length > 0) resolve(results);
              else reject(status);
            });
          });
          finalLat = result[0].geometry.location.lat();
          finalLng = result[0].geometry.location.lng();
        } catch (e) {
          console.error('Event geocoding failed', e);
        }
      }

      if (editingEventId) {
        await eventService.updateEvent(editingEventId, {
          ...newEvent,
          start_date: newEvent.start_date,
          end_date: newEvent.end_date,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          image_url: imageUrl,
          coordinates: { lat: finalLat, lng: finalLng }
        });
        setMsg({ type: 'success', text: 'Event updated successfully!' });
      } else {
        await eventService.createEvent({
          ...newEvent,
          user_id: currentUser?.id,
          start_date: newEvent.start_date,
          end_date: newEvent.end_date,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          date: newEvent.start_date, // for legacy use
          time: newEvent.start_time, // for legacy use
          image_url: imageUrl,
          coordinates: { lat: finalLat, lng: finalLng }
        });
        setMsg({ type: 'success', text: 'Event created successfully!' });
      }

      if (onRefetchEvents) {
        await onRefetchEvents();
      }

      setEditingEventId(null);
      setNewEvent({
        title: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        category: '',
        description: '',
        image: '',
        lat: 0,
        lng: 0
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setActiveTab('all_events');
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: editingEventId ? 'Failed to update event.' : 'Failed to create event.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPro.top_qualities && newPro.top_qualities.length > 3) {
      setMsg({ type: 'error', text: 'Please select a maximum of 3 top qualities.' });
      return;
    }

    // Use a simpler confirmation or just proceed if the user is an admin
    // For now, let's just proceed to verify the update works
    setIsSubmitting(true);
    setMsg(null);

    try {
      let imageUrl = newPro.image;
      let oldImageUrlToDelete = null;

      if (selectedFile) {
        console.log('[handleAddPro] Compressing and uploading selected file:', selectedFile.name);
        
        // 1. Compress image
        let fileToUpload = selectedFile;
        fileToUpload = await compressImage(selectedFile);

        // 2. Prepare path and sanity check
        const sanitizedName = selectedFile.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_{2,}/g, '_');
          
        const path = `images_pro/${Date.now()}_${sanitizedName}`;
        
        // 3. Keep track of old image for deletion later
        if (editingProId && newPro.image && newPro.image.includes('supabase.co')) {
          oldImageUrlToDelete = newPro.image;
        }

        // 4. Upload
        imageUrl = await storageService.uploadFile('images', path, fileToUpload);
        
        // CRITICAL: Successfully uploaded, so update state to prevent re-uploading if DB update fails
        setNewPro(prev => ({ ...prev, image: imageUrl }));
        setSelectedFile(null);
        console.log('[handleAddPro] File uploaded successfully:', imageUrl);
      }

      // Geocoding fallback
      let finalLat = newPro.lat;
      let finalLng = newPro.lng;

      console.log('[handleAddPro] Initial coordinates:', finalLat, finalLng, 'Location:', newPro.location);

      if ((finalLat === 0 || finalLng === 0) && newPro.location) {
        console.log('[handleAddPro] Attempting geocoding fallback for:', newPro.location);
        try {
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: newPro.location }, (results, status) => {
              if (status === 'OK' && results && results.length > 0) resolve(results);
              else reject(status);
            });
          });
          finalLat = result[0].geometry.location.lat();
          finalLng = result[0].geometry.location.lng();
          console.log('[handleAddPro] Geocoding success. New coordinates:', finalLat, finalLng);
        } catch (e) {
          console.error('[handleAddPro] Geocoding fallback failed for address:', newPro.location, 'Error:', e);
        }
      }

      const formattedPro = {
        name: newPro.name,
        company_name: newPro.company_name,
        profession: (newPro.categories || []).join(', ') || newPro.category,
        categories: newPro.categories,
        rating: newPro.rating || 0,
        review_count: newPro.review_count || 0,
        languages: newPro.languages,
        image_url: imageUrl,
        image: imageUrl, // Add both for safety
        description: newPro.bio,
        bio: newPro.bio, // Add both for safety
        phone: newPro.phone,
        whatsapp: newPro.whatsapp,
        email: newPro.email,
        website: newPro.website,
        instagram: newPro.instagram,
        facebook: newPro.facebook,
        location: newPro.location,
        lat: finalLat,
        lng: finalLng,
        top_qualities: newPro.top_qualities || [],
        has_filled_form: newPro.has_filled_form || false
      };

      console.log('[handleAddPro] Final payload to service:', {
        ...formattedPro,
        description: typeof formattedPro.description === 'string' ? formattedPro.description.substring(0, 30) + '...' : ''
      });

      if (editingProId) {
        console.log('[handleAddPro] Calling updateProfessional for ID:', editingProId, 'Image:', imageUrl);
        const result = await proService.updateProfessional(editingProId, formattedPro);
        console.log('[handleAddPro] Update result:', result);
        
        if (result && result.success === false) {
           setMsg({ type: 'error', text: result.message || 'Failed to update professional. Record not found.' });
           setIsSubmitting(false); // Stop here so they can fix and retry
           return;
        }
        
        setMsg({ type: 'success', text: 'Professional updated successfully!' });
      } else {
        console.log('[handleAddPro] Creating new professional');
        await proService.createProfessional(formattedPro);
        
        // Update recommendation status if this came from a recommendation
        if (activeRecId) {
          await proService.updateRecommendationStatus(activeRecId, 'validated');
          await fetchRecommendations(); // Refresh the list
        }
        setMsg({ type: 'success', text: 'Professional added successfully!' });
      }

      // Cleanup old image if everything succeeded and we had a new upload
      if (oldImageUrlToDelete) {
        try {
          // Robust path extraction from public URL
          // Supabase public URLs are typically: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
          let pathToDelete = null;
          
          if (oldImageUrlToDelete.includes('/public/images/')) {
            pathToDelete = oldImageUrlToDelete.split('/public/images/')[1];
          } else if (oldImageUrlToDelete.includes('/images/')) {
            // Fallback for different URL patterns
            const parts = oldImageUrlToDelete.split('/images/');
            pathToDelete = parts[parts.length - 1];
          }

          if (pathToDelete) {
            // Remove any query parameters if present
            pathToDelete = pathToDelete.split('?')[0];
            
            console.log('[handleAddPro] Clean up: Deleting old image from storage:', pathToDelete);
            await storageService.deleteFile('images', pathToDelete);
          } else {
            console.warn('[handleAddPro] Could not parse path for deletion from URL:', oldImageUrlToDelete);
          }
        } catch (cleanupError) {
          console.warn('[handleAddPro] Failed to delete old image:', cleanupError);
        }
      }

      if (onRefetchPros) {
        await onRefetchPros(); // Refresh the main search results
      }
      await fetchCompletedPros(); // Refresh the admin list
      setActiveRecId(null);
      setEditingProId(null);
      setActiveTab('completed');
      setNewPro({
        name: '',
        company_name: '',
        category: '',
        rating: 0,
        review_count: 0,
        languages: [],
        image: '',
        bio: '',
        phone: '',
        email: '',
        website: '',
        instagram: '',
        facebook: '',
        location: '',
        lat: 0,
        lng: 0
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      const action = editingProId ? 'update' : 'add';
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMsg({ type: 'error', text: `Failed to ${action} professional: ${errorMessage}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePro = async () => {
    if (!editingProId) return;
    
    setIsSubmitting(true);
    setMsg(null);
    setShowConfirmModal(false);
    
    try {
      await proService.deleteProfessional(editingProId);
      
      // Cleanup image if it was on Supabase
      if (newPro.image && newPro.image.includes('supabase.co')) {
        try {
          let pathToDelete = null;
          if (newPro.image.includes('/public/images/')) {
            pathToDelete = newPro.image.split('/public/images/')[1];
          } else if (newPro.image.includes('/images/')) {
            const parts = newPro.image.split('/images/');
            pathToDelete = parts[parts.length - 1];
          }
          if (pathToDelete) {
             pathToDelete = pathToDelete.split('?')[0];
             await storageService.deleteFile('images', pathToDelete);
          }
        } catch (e) {
          console.warn('Failed to delete storage image during pro deletion:', e);
        }
      }

      setMsg({ type: 'success', text: 'Professional successfully deleted and archived!' });
      
      if (onRefetchPros) {
        await onRefetchPros();
      }
      await fetchCompletedPros();
      
      setTimeout(() => {
        setActiveTab('completed');
        setEditingProId(null);
        setNewPro({
          name: '',
          company_name: '',
          category: '',
          rating: 0,
          review_count: 0,
          languages: [],
          image: '',
          bio: '',
          phone: '',
          email: '',
          website: '',
          instagram: '',
          facebook: '',
          location: '',
          lat: 0,
          lng: 0
        });
        setPreviewUrl(null);
        setMsg(null);
      }, 1500);
    } catch (error: any) {
      console.error("Error deleting professional:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during deletion.';
      setMsg({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 text-left w-full overflow-x-hidden">
      <div className="flex flex-col mb-8 gap-6">
        <div className="space-y-1">
           <h2 className="text-xl md:text-2xl font-medium font-display text-brand-navy flex items-center gap-2">
             <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-brand-blue" />
             Admin Dashboard
           </h2>
           <h3 className="text-sm md:text-base text-slate-500 font-medium tracking-tight">
             {dashboardCategory === 'pros' ? 'Review recommendations and manage professionals.' : 
              dashboardCategory === 'events' ? 'Manage community events and meetups.' :
              dashboardCategory === 'reported_users' ? 'Moderate reported users, content, and harassment reports.' :
              dashboardCategory === 'highlights' ? 'Select which pro, event, article, and testimonial are highlighted on the Landing Page.' :
              dashboardCategory === 'guides' ? 'Manage articles, educational tips, and local expat guides.' :
              dashboardCategory === 'announcements' ? 'Publish and manage community announcements & IT updates.' :
              'Moderate client reviews and testimonies.'}
           </h3>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 bg-slate-100/80 p-1.5 rounded-[22px] w-full border border-slate-200/50 gap-1.5">
          <button 
            onClick={() => {
              setDashboardCategory('pros');
              setActiveTab('recommendations');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'pros' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Pros</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('events');
              setActiveTab('all_events');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'events' ? "bg-white text-emerald-500 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Events</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('guides');
              setShowArticleForm(false);
              setEditingArticle(null);
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'guides' ? "bg-white text-orange-500 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Guides</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('testimonies');
              setActiveTab('recommendations');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'testimonies' ? "bg-white text-indigo-500 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Reviews</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('highlights');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'highlights' ? "bg-white text-amber-500 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Highlights</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('reported_users');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'reported_users' ? "bg-white text-rose-500 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Safety</span>
          </button>
          <button 
            onClick={() => {
              setDashboardCategory('announcements');
            }}
            className={cn(
              "px-1 py-3 rounded-[18px] text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
              dashboardCategory === 'announcements' ? "bg-white text-yellow-600 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="truncate">Announcements</span>
          </button>
        </div>
      </div>

      <div className="mb-8">
        {dashboardCategory === 'pros' ? (
          <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="flex shrink-0 w-full min-w-max lg:w-auto gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => {
                  setActiveTab('completed');
                  setActiveRecId(null);
                  setEditingProId(null);
                  setSelectedFile(null);
                }}
                className={cn(
                  "flex-1 lg:flex-none px-3 lg:px-5 py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'completed' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Active
              </button>
              <button 
                onClick={() => setActiveTab('recommendations')}
                className={cn(
                  "flex-1 lg:flex-none px-3 lg:px-5 py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'recommendations' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Recs
              </button>
              <button 
                onClick={() => {
                  setActiveTab('add_pro');
                  setActiveRecId(null);
                  setEditingProId(null);
                  setSelectedFile(null);
                  setNewPro({
                    name: '',
                    company_name: '',
                    category: '',
                    rating: 0,
                    review_count: 0,
                    languages: [],
                    image: '',
                    bio: '',
                    phone: '',
                    email: '',
                    website: '',
                    instagram: '',
                    facebook: '',
                    location: '',
                    lat: 0,
                    lng: 0
                  });
                  setPreviewUrl(null);
                }}
                className={cn(
                  "flex-1 lg:flex-none px-3 lg:px-5 py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'add_pro' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Add Pro
              </button>
              {activeTab === 'edit_pro' && (
                <button 
                  className={cn(
                    "flex-1 lg:flex-none px-3 lg:px-5 py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap bg-white text-amber-500 shadow-sm border border-amber-100"
                  )}
                >
                  Edit Profile
                </button>
              )}
              <button 
                onClick={() => {
                  setActiveTab('refused');
                  setActiveRecId(null);
                  setEditingProId(null);
                  setSelectedFile(null);
                }}
                className={cn(
                  "flex-1 lg:flex-none px-3 lg:px-5 py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'refused' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Refused
              </button>
            </div>
          </div>
        ) : dashboardCategory === 'events' ? (
          <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="flex shrink-0 w-full min-w-max lg:w-auto gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => {
                  setActiveTab('all_events');
                  setEditingEventId(null);
                }}
                className={cn(
                  "flex-1 lg:flex-none px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'all_events' || activeTab === 'edit_event' ? "bg-white text-emerald-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                All Events
              </button>
              <button 
                onClick={() => {
                  setActiveTab('add_event');
                  setEditingEventId(null);
                  setNewEvent({
                    title: '',
                    start_date: '',
                    end_date: '',
                    start_time: '',
                    end_time: '',
                    location: '',
                    category: '',
                    description: '',
                    image: '',
                    lat: 0,
                    lng: 0
                  });
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className={cn(
                  "flex-1 lg:flex-none px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === 'add_event' && !editingEventId ? "bg-white text-emerald-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Add New Event
              </button>
            </div>
          </div>
        ) : dashboardCategory === 'testimonies' ? (
          <div className="flex items-center gap-1 pb-1">
            <div className="flex w-full sm:w-auto gap-1 bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setTestimoniesFilter('pending')}
                className={cn(
                  "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  testimoniesFilter === 'pending' ? "bg-white text-indigo-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span className="hidden sm:inline">Awaiting Moderation</span>
                <span className="sm:hidden">Awaiting</span> ({allTestimonies.filter(t => t.status === 'pending' || !t.status).length})
              </button>
              <button 
                onClick={() => setTestimoniesFilter('processed')}
                className={cn(
                  "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  testimoniesFilter === 'processed' ? "bg-white text-indigo-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span className="hidden sm:inline">Processed & Archived</span>
                <span className="sm:hidden">Processed</span> ({allTestimonies.filter(t => t.status === 'approved' || t.status === 'refused' || t.status === 'rejected').length})
              </button>
            </div>
          </div>
        ) : dashboardCategory === 'reported_users' ? (
          <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="flex shrink-0 w-full min-w-max lg:w-auto gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                className={cn(
                  "w-full lg:w-auto px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap bg-white text-rose-500 shadow-sm"
                )}
              >
                User Reports
              </button>
            </div>
          </div>
        ) : dashboardCategory === 'guides' ? (
          <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="flex shrink-0 w-full min-w-max lg:w-auto gap-1 bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => {
                  setShowArticleForm(false);
                  setEditingArticle(null);
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  !showArticleForm ? "bg-white text-orange-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                All Articles
              </button>
              <button 
                onClick={() => {
                  setEditingArticle(null);
                  setGuideFormCategory('getting-started');
                  setArticleFormTitle('');
                  setArticleFormExcerpt('');
                  setArticleFormContent('');
                  setArticleFormImageUrl('');
                  setArticleFormBusinessName('');
                  setArticleFormAuthorName('');
                  setArticleFormAuthorRole('');
                  setArticleFormAuthorBusiness('');
                  setArticleFormAuthorWebsite('');
                  setArticleFormAuthorEmail('');
                  setArticleFormAuthorPhone('');
                  setArticleFormIsOnline(true);
                  
                  setShowArticleForm(true);
                }}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  showArticleForm && !editingArticle ? "bg-white text-orange-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Add New Article
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {msg && (
        <div className={cn(
          "mb-6 p-4 rounded-2xl flex items-center gap-3",
          msg.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
        )}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold tracking-tight">{msg.text}</p>
        </div>
      )}

      {dashboardCategory === 'pros' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 font-display">
              {activeTab === 'completed' ? 'Active Professionals' :
               activeTab === 'add_pro' ? 'Add New Professional' :
               activeTab === 'edit_pro' ? 'Edit Professional' :
               activeTab === 'refused' ? 'Refused Recommendations' :
               'Review Recommendations'}
            </h3>
          </div>

          <div className="space-y-4">
          {activeTab === 'recommendations' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-8">
                  {recommendations.filter(r => r.status === 'pending' || !r.status).length === 0 ? (
                    <div className="bg-slate-50 rounded-[32px] p-12 text-center border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium">No pending recommendations.</p>
                    </div>
                  ) : (
                    recommendations
                      .filter(r => r.status === 'pending' || !r.status)
                      .map((rec) => (
                        <RecommendationItem 
                          key={rec.id} 
                          rec={rec} 
                          onUpdate={fetchRecommendations} 
                          onStartAdding={handleStartAdding}
                        />
                      ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'refused' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recommendations.filter(r => r.status === 'refused').length === 0 ? (
                <div className="bg-slate-50 rounded-[32px] p-12 text-center border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No refused recommendations.</p>
                </div>
              ) : (
                recommendations
                  .filter(r => r.status === 'refused')
                  .map((rec) => (
                    <RecommendationItem 
                      key={rec.id} 
                      rec={rec} 
                      onUpdate={fetchRecommendations} 
                      onStartAdding={handleStartAdding}
                    />
                  ))
              )}
            </div>
          )}

          {activeTab === 'edit_pro' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => {
                    setActiveTab('completed');
                    setEditingProId(null);
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Editing Mode</span>
                </div>
              </div>

              <form onSubmit={handleAddPro} className="bg-white p-5 md:p-8 rounded-[32px] md:rounded-[40px] border-2 border-amber-100 shadow-2xl space-y-6 md:space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-400" />
                
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <Camera className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-3 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-all active:scale-95"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold font-display text-slate-900 text-sm">Update Professional Image</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Leave blank to keep current photo</p>
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                    <input 
                      required
                      value={newPro.name}
                      onChange={e => setNewPro({...newPro, name: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Company Name</label>
                    <input 
                      value={newPro.company_name}
                      onChange={e => setNewPro({...newPro, company_name: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Category (indicate one or more)</label>
                    <CategorySelector 
                      categories={newPro.categories || []}
                      onChange={cats => setNewPro({ ...newPro, categories: cats })}
                      primaryColorClass="amber-500"
                      ringColorClass="focus-within:ring-amber-500/20"
                      borderColorClass="border-amber-500"
                      tagBgClass="bg-amber-500/10 text-amber-800 border border-amber-500/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Languages (comma separated)</label>
                    <input 
                      value={newPro.languages.join(', ')}
                      onChange={e => setNewPro({...newPro, languages: e.target.value.split(',').map(s => s.trim())})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Email</label>
                    <input 
                      type="email"
                      value={newPro.email}
                      onChange={e => setNewPro({...newPro, email: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Phone</label>
                    <input 
                      type="tel"
                      value={newPro.phone}
                      onChange={e => setNewPro({...newPro, phone: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">WhatsApp</label>
                    <input 
                      type="tel"
                      value={newPro.whatsapp || ''}
                      onChange={e => setNewPro({...newPro, whatsapp: e.target.value})}
                      placeholder="e.g. +34600000000"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Location Address</label>
                    <AddressAutocomplete 
                      value={newPro.location}
                      onChange={val => setNewPro({...newPro, location: val, lat: 0, lng: 0})}
                      onSelect={(location, lat, lng) => {
                        setNewPro({...newPro, location, lat, lng});
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Website</label>
                    <input 
                      value={newPro.website}
                      onChange={e => setNewPro({...newPro, website: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Instagram (@handle)</label>
                    <input 
                      value={newPro.instagram}
                      onChange={e => setNewPro({...newPro, instagram: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 font-display text-sm">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Facebook (URL or username)</label>
                    <input 
                      value={newPro.facebook || ''}
                      onChange={e => setNewPro({...newPro, facebook: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-center justify-between gap-4 font-display text-sm">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Form Filled</label>
                      <p className="text-[11px] text-slate-500 font-medium">Check this box if this professional has completed the onboarding/registration form.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newPro.has_filled_form} 
                        onChange={e => setNewPro({...newPro, has_filled_form: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 fill-amber-500/20" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                        Top Qualities
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Select up to 3 top qualities for this professional
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUALITY_CONFIGS.map(({ name, icon: Icon, iconColor }) => {
                      const isSelected = (newPro.top_qualities || []).includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            const current = newPro.top_qualities || [];
                            if (isSelected) {
                              setNewPro({ ...newPro, top_qualities: current.filter(q => q !== name) });
                            } else {
                              if (current.length < 3) {
                                setNewPro({ ...newPro, top_qualities: [...current, name] });
                              }
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all select-none bg-white cursor-pointer ${
                            isSelected 
                              ? 'border-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] bg-slate-50' 
                              : 'border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/20'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                          <span className={`font-[system-ui] text-[11px] md:text-xs font-semibold tracking-tight whitespace-nowrap ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-700'
                          }`}>
                            {name}
                          </span>
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white' 
                              : 'border-slate-200 bg-white'
                          }`}>
                            {isSelected && <Check className="w-2 h-2 stroke-[5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1 pt-1">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>You can select up to 3 qualities</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400 px-1">About (Bio)</label>
                  <textarea 
                    value={newPro.bio}
                    onChange={e => setNewPro({...newPro, bio: e.target.value})}
                    className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none font-display text-sm leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="h-14 bg-amber-500 text-white rounded-2xl font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setActiveTab('completed');
                        setEditingProId(null);
                      }}
                      className="h-14 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-wider hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={initiateDelete}
                    className="w-full h-14 bg-rose-50 text-rose-600 rounded-2xl font-bold uppercase tracking-wider hover:bg-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] text-xs mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Professional Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'add_pro' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <form onSubmit={handleAddPro} className="bg-white p-5 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl space-y-6 md:space-y-8">
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 gap-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <Camera className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest">No Image</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-3 bg-brand-blue text-white rounded-full shadow-lg hover:bg-brand-navy transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold font-display text-brand-navy text-sm uppercase tracking-widest">Profile Photo</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Click the button to upload a file</p>
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                    <input 
                      required
                      value={newPro.name}
                      onChange={e => setNewPro({...newPro, name: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Company Name</label>
                    <input 
                      value={newPro.company_name}
                      onChange={e => setNewPro({...newPro, company_name: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Category (indicate one or more)</label>
                    <CategorySelector 
                      categories={newPro.categories || []}
                      onChange={cats => setNewPro({ ...newPro, categories: cats })}
                      primaryColorClass="brand-blue"
                      ringColorClass="focus-within:ring-brand-blue/20"
                      borderColorClass="border-brand-blue"
                      tagBgClass="bg-brand-blue/10 text-brand-blue border border-brand-blue/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Languages (comma separated)</label>
                    <input 
                      value={newPro.languages.join(', ')}
                      onChange={e => setNewPro({...newPro, languages: e.target.value.split(',').map(s => s.trim())})}
                      placeholder="e.g. English, French, Spanish"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Email</label>
                    <input 
                      type="email"
                      value={newPro.email}
                      onChange={e => setNewPro({...newPro, email: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Phone</label>
                    <input 
                      type="tel"
                      value={newPro.phone}
                      onChange={e => setNewPro({...newPro, phone: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">WhatsApp</label>
                    <input 
                      type="tel"
                      value={newPro.whatsapp || ''}
                      onChange={e => setNewPro({...newPro, whatsapp: e.target.value})}
                      placeholder="e.g. +34600000000"
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Location Address</label>
                    <AddressAutocomplete 
                      value={newPro.location}
                      onChange={val => setNewPro({...newPro, location: val, lat: 0, lng: 0})}
                      onSelect={(location, lat, lng) => {
                        setNewPro({...newPro, location, lat, lng});
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Website</label>
                    <input 
                      value={newPro.website}
                      onChange={e => setNewPro({...newPro, website: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Instagram (@handle)</label>
                    <input 
                      value={newPro.instagram}
                      onChange={e => setNewPro({...newPro, instagram: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 font-display text-sm">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Facebook (URL or username)</label>
                    <input 
                      value={newPro.facebook || ''}
                      onChange={e => setNewPro({...newPro, facebook: e.target.value})}
                      placeholder=""
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="md:col-span-2 p-5 bg-brand-blue/5 rounded-2xl border border-brand-blue/10 flex items-center justify-between gap-4 font-display text-sm">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">Form Filled</label>
                      <p className="text-[11px] text-slate-500 font-medium">Check this box if this professional has completed the onboarding/registration form.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newPro.has_filled_form} 
                        onChange={e => setNewPro({...newPro, has_filled_form: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 fill-amber-500/20" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                        Top Qualities
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Select up to 3 top qualities for this professional
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUALITY_CONFIGS.map(({ name, icon: Icon, iconColor }) => {
                      const isSelected = (newPro.top_qualities || []).includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            const current = newPro.top_qualities || [];
                            if (isSelected) {
                              setNewPro({ ...newPro, top_qualities: current.filter(q => q !== name) });
                            } else {
                              if (current.length < 3) {
                                setNewPro({ ...newPro, top_qualities: [...current, name] });
                              }
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all select-none bg-white cursor-pointer ${
                            isSelected 
                              ? 'border-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] bg-slate-50' 
                              : 'border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/20'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                          <span className={`font-[system-ui] text-[11px] md:text-xs font-semibold tracking-tight whitespace-nowrap ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-700'
                          }`}>
                            {name}
                          </span>
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white' 
                              : 'border-slate-200 bg-white'
                          }`}>
                            {isSelected && <Check className="w-2 h-2 stroke-[5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1 pt-1">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>You can select up to 3 qualities</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400 px-1">About (Bio)</label>
                  <textarea 
                    value={newPro.bio}
                    onChange={e => setNewPro({...newPro, bio: e.target.value})}
                    placeholder="Short professional biography..."
                    className="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all resize-none font-display text-sm leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-brand-navy text-white rounded-2xl font-semibold uppercase tracking-wider shadow-lg shadow-brand-navy/10 hover:bg-brand-blue transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Professional to App
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'completed' && (() => {
            const sortedCompletedPros = [...completedPros].sort((a, b) => {
              if (activeProSort === 'alphabet') {
                return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
              } else {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA; // newest first
              }
            });

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                      {completedPros.length} Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="active-pro-sort" className="text-xs text-slate-500 font-medium">Sort by:</label>
                    <select
                      id="active-pro-sort"
                      value={activeProSort}
                      onChange={(e) => setActiveProSort(e.target.value as 'alphabet' | 'created_at')}
                      className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 outline-none focus:border-brand-blue transition-colors cursor-pointer shadow-sm"
                    >
                      <option value="created_at">Creation Date (Newest)</option>
                      <option value="alphabet">Alphabetical (A-Z)</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4">
                  {sortedCompletedPros.length > 0 ? (
                    sortedCompletedPros.map((pro) => (
                      <div key={pro.id} className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img src={pro.image} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-100" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 truncate">{pro.name}</h4>
                              {pro.has_filled_form ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0 select-none">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-50/50" />
                                  Form Filled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0 select-none">
                                  <AlertCircle className="w-3 h-3 text-slate-400" />
                                  Form Pending
                                </span>
                              )}
                            </div>
                            {pro.company_name && (
                              <p className="text-xs font-semibold text-slate-600 truncate">{pro.company_name}</p>
                            )}
                            <p className="text-xs text-slate-500 truncate">{pro.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-2xl sm:rounded-none">
                           <button 
                             onClick={() => handleStartEditing(pro)}
                             className="p-2.5 bg-white sm:bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all shadow-sm sm:shadow-none"
                           >
                             <Edit2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm font-medium">No professionals added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </div>
        </div>
      ) : dashboardCategory === 'events' ? (
        <div className="space-y-4">
          {activeTab === 'all_events' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-2">
                <p className="text-xs text-slate-500 font-medium">Manage and edit your community events & meetups.</p>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shrink-0 self-start sm:self-auto">
                  {events.length} Events
                </span>
              </div>
              <div className="grid gap-4">
                {events.length > 0 ? (
                  events.map((event) => {
                    const isProcessing = deletingId === event.id;
                    return (
                      <div key={event.id} className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <img src={event.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 shrink-0" referrerPolicy="no-referrer" />
                          <div className="min-w-0 text-left">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                              {event.category || 'Event'}
                            </span>
                            <h4 className="font-bold text-slate-900 leading-snug break-words">{event.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 whitespace-normal break-words">{event.start_date} {event.start_time ? `• ${event.start_time}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingEventId(event.id);
                              setNewEvent({
                                title: event.title || '',
                                start_date: event.start_date || '',
                                end_date: event.end_date || '',
                                start_time: event.start_time || '',
                                end_time: event.end_time || '',
                                location: event.location || '',
                                category: event.category || '',
                                description: event.description || '',
                                image: event.image || '',
                                lat: event.coordinates?.lat || 0,
                                lng: event.coordinates?.lng || 0
                              });
                              setPreviewUrl(event.image || null);
                              setActiveTab('edit_event');
                              scrollToTop?.();
                            }}
                            className="p-2.5 bg-slate-50 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
                                setDeletingId(event.id);
                                try {
                                  await eventService.deleteEvent(event.id);
                                  setMsg({ type: 'success', text: 'Event deleted successfully!' });
                                  if (onRefetchEvents) {
                                    await onRefetchEvents();
                                  }
                                } catch (err) {
                                  console.error('Failed to delete event:', err);
                                  setMsg({ type: 'error', text: 'Failed to delete event.' });
                                } finally {
                                  setDeletingId(null);
                                }
                              }
                            }}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm font-medium">No events found.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'add_event' || activeTab === 'edit_event') && (
            <form onSubmit={handleAddEvent} className="bg-white p-5 md:p-8 rounded-[32px] md:rounded-[40px] border border-emerald-100 shadow-xl space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('all_events');
                    setEditingEventId(null);
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {editingEventId ? 'Edit Event Mode' : 'New Event Mode'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/30 rounded-[32px] border border-dashed border-emerald-100 gap-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Camera className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-center">
                  <h4 className="font-semibold font-display text-emerald-600 text-sm uppercase tracking-widest">Event Poster</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Image for the event card</p>
                </div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Event Title</label>
                  <input 
                    required
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Ex: Beach Cleanup Valencia"
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Start Date</label>
                    <input 
                      required
                      type="date"
                      value={newEvent.start_date}
                      onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">End Date (Optional)</label>
                      {newEvent.end_date && (
                        <button 
                          type="button" 
                          onClick={() => setNewEvent({...newEvent, end_date: ''})}
                          className="text-[10px] text-brand-blue font-bold uppercase hover:text-brand-blue/80 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input 
                      type="date"
                      value={newEvent.end_date}
                      onChange={e => setNewEvent({...newEvent, end_date: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Start Time (Optional)</label>
                      {newEvent.start_time && (
                        <button 
                          type="button" 
                          onClick={() => setNewEvent({...newEvent, start_time: ''})}
                          className="text-[10px] text-brand-blue font-bold uppercase hover:text-brand-blue/80 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input 
                      type="time"
                      value={newEvent.start_time}
                      onChange={e => setNewEvent({...newEvent, start_time: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">End Time (Optional)</label>
                      {newEvent.end_time && (
                        <button 
                          type="button" 
                          onClick={() => setNewEvent({...newEvent, end_time: ''})}
                          className="text-[10px] text-brand-blue font-bold uppercase hover:text-brand-blue/80 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input 
                      type="time"
                      value={newEvent.end_time}
                      onChange={e => setNewEvent({...newEvent, end_time: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Category</label>
                  <input 
                    required
                    value={newEvent.category}
                    onChange={e => setNewEvent({...newEvent, category: e.target.value})}
                    placeholder="Community"
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Location Address</label>
                  <AddressAutocomplete 
                    value={newEvent.location}
                    onChange={val => setNewEvent({...newEvent, location: val})}
                    onSelect={(location, lat, lng) => setNewEvent({...newEvent, location, lat, lng})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-display text-sm resize-none"
                />
              </div>

              <button 
                disabled={isSubmitting}
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                {isSubmitting 
                  ? (editingEventId ? 'Updating Event...' : 'Creating Event...') 
                  : (editingEventId ? 'Update Event' : 'Create Event')}
              </button>
            </form>
          )}
        </div>
      ) : dashboardCategory === 'testimonies' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 font-display">
              {testimoniesFilter === 'pending' ? 'Pending Testimonies' : 'Processed Testimonies'}
            </h3>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
              {allTestimonies.filter(t => testimoniesFilter === 'pending' ? (t.status === 'pending' || !t.status) : (t.status === 'approved' || t.status === 'refused' || t.status === 'rejected')).length} of {allTestimonies.length}
            </span>
          </div>

          <div className="grid gap-4">
            {allTestimonies.filter(testimony => {
              const isPending = testimony.status === 'pending' || !testimony.status;
              return testimoniesFilter === 'pending' ? isPending : !isPending;
            }).length > 0 ? (
              allTestimonies.filter(testimony => {
                const isPending = testimony.status === 'pending' || !testimony.status;
                return testimoniesFilter === 'pending' ? isPending : !isPending;
              }).map((testimony) => {
                const isProcessing = deletingId === testimony.id;
                
                return (
                  <div key={testimony.id} className={cn(
                    "bg-white p-5 md:p-6 rounded-[32px] border transition-all",
                    testimony.status === 'pending' ? "border-amber-200 shadow-md shadow-amber-500/5 ring-1 ring-amber-100" : "border-slate-100 shadow-sm"
                  )}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                            testimony.status === 'approved' ? "bg-emerald-50 text-emerald-500" : 
                            testimony.status === 'refused' ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
                          )}>
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className="font-bold text-slate-900">{getAuthorDisplayName(testimony.author)}</span>
                              <span className="text-slate-300 mx-1">•</span>
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={cn("w-3 h-3 fill-current", i >= testimony.rating && "text-slate-200 fill-none")} />
                                ))}
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                                testimony.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                                testimony.status === 'refused' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600 animate-pulse"
                              )}>
                                {testimony.status || 'pending'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                              "{testimony.comment}"
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regarding:</span>
                              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                                {testimony.professionals?.name || 'Unknown Pro'}
                              </span>
                            </div>
                            {testimony.status === 'refused' && testimony.refusal_reason && (
                              <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Refusal Reason:</p>
                                <p className="text-xs text-rose-500 italic">{testimony.refusal_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowConfirmAction(prev => ({ ...prev, [testimony.id]: 'delete' }))}
                          disabled={isProcessing}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                          title="Delete Testimony"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {showConfirmAction[testimony.id] === 'delete' && (
                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 mb-4">
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest text-center">Delete this testimony permanently?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setDeletingId(testimony.id);
                                await handleDeleteTestimony(testimony.id);
                                setDeletingId(null);
                                setShowConfirmAction(prev => ({ ...prev, [testimony.id]: null }));
                              }}
                              disabled={isProcessing}
                              className="flex-1 h-9 bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setShowConfirmAction(prev => ({ ...prev, [testimony.id]: null }))}
                              className="flex-1 h-9 bg-white text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {testimony.status === 'pending' && (
                        <div className="flex flex-col gap-3 pt-3 border-t border-slate-50">
                          {showConfirmAction[testimony.id] === 'approve' ? (
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col gap-3 animate-in fade-in zoom-in-95">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-center">Approve this testimony?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    setDeletingId(testimony.id);
                                    try {
                                      await proService.approveTestimony(testimony.id);
                                      await fetchAllTestimonies();
                                      if (onRefetchPros) await onRefetchPros();
                                      setMsg({ type: 'success', text: 'Testimony approved!' });
                                    } catch (err) {
                                      console.error('Approve error:', err);
                                      setMsg({ type: 'error', text: 'Failed to approve: ' + (err instanceof Error ? err.message : String(err)) });
                                    } finally {
                                      setDeletingId(null);
                                      setShowConfirmAction(prev => ({ ...prev, [testimony.id]: null }));
                                    }
                                  }}
                                  disabled={isProcessing}
                                  className="flex-1 h-9 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50"
                                >
                                  Yes, Approve
                                </button>
                                <button
                                  onClick={() => setShowConfirmAction(prev => ({ ...prev, [testimony.id]: null }))}
                                  className="flex-1 h-9 bg-white text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : refusalReason[testimony.id] !== undefined ? (
                            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 flex flex-col gap-3 animate-in fade-in zoom-in-95">
                              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Reason for refusal:</p>
                              <textarea
                                value={refusalReason[testimony.id]}
                                onChange={(e) => setRefusalReason(prev => ({ ...prev, [testimony.id]: e.target.value }))}
                                placeholder="Write the reason here..."
                                className="w-full bg-white border border-rose-100 rounded-xl p-3 text-xs text-slate-700 min-h-[80px] focus:ring-2 focus:ring-rose-200 outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!refusalReason[testimony.id]?.trim()) {
                                      setMsg({ type: 'error', text: 'Please provide a reason for refusal.' });
                                      return;
                                    }
                                    setDeletingId(testimony.id);
                                    try {
                                      await proService.refuseTestimony(testimony.id, refusalReason[testimony.id]);
                                      await fetchAllTestimonies();
                                      setMsg({ type: 'success', text: 'Testimony refused.' });
                                    } catch (err) {
                                      console.error('Refuse error:', err);
                                      setMsg({ type: 'error', text: 'Failed to refuse: ' + (err instanceof Error ? err.message : String(err)) });
                                    } finally {
                                      setDeletingId(null);
                                      setRefusalReason(prev => {
                                        const next = { ...prev };
                                        delete next[testimony.id];
                                        return next;
                                      });
                                    }
                                  }}
                                  disabled={isProcessing}
                                  className="flex-1 h-9 bg-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50"
                                >
                                  Confirm Refusal
                                </button>
                                <button
                                  onClick={() => setRefusalReason(prev => {
                                    const next = { ...prev };
                                    delete next[testimony.id];
                                    return next;
                                  })}
                                  className="flex-1 h-9 bg-white text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setShowConfirmAction(prev => ({ ...prev, [testimony.id]: 'approve' }))}
                                disabled={isProcessing}
                                className="flex-1 h-10 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => setRefusalReason(prev => ({ ...prev, [testimony.id]: '' }))}
                                disabled={isProcessing}
                                className="flex-1 h-10 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Refuse
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  {testimoniesFilter === 'pending' 
                    ? 'No pending reviews awaiting moderation.' 
                    : 'No processed / moderated reviews found here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : dashboardCategory === 'reported_users' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 font-display">Reported Users Moderation</h3>
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-100">
              {reports.length} Reports Total
            </span>
          </div>

          {loadingReports ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {/* Active Reports Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2">
                  <h4 className="font-bold text-rose-600 text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Active ({reports.filter(r => r.resolved !== true && r.resolved !== 'true').length})
                  </h4>
                </div>

                <div className="space-y-4">
                  {reports.filter(r => r.resolved !== true && r.resolved !== 'true').length > 0 ? (
                    reports.filter(r => r.resolved !== true && r.resolved !== 'true').map((report) => {
                      const reportDate = report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A';
                      return (
                        <div key={report.id} className="bg-white p-5 md:p-6 rounded-[32px] border border-rose-100 shadow-sm transition-all hover:shadow-md">
                          <div className="flex flex-col gap-4">
                            {/* Header with reporter and reported profiles side-by-side */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-rose-50/50 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img 
                                    src={report.reported?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reported?.full_name || 'U')}&background=f1f5f9&color=475569`} 
                                    alt={report.reported?.full_name} 
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-50"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full">
                                    <Ban className="w-3 h-3" />
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reported User</p>
                                  <h4 className="font-bold text-slate-900 text-sm">{report.reported?.full_name || 'Unknown Profile'}</h4>
                                  <p className="text-xs text-slate-500 font-mono">{report.reported?.email || 'No email'}</p>
                                </div>
                              </div>

                              <div className="hidden sm:block text-slate-300 font-medium">➔</div>

                              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl">
                                <img 
                                  src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter?.full_name || 'U')}&background=eaeaea&color=333333`} 
                                  className="w-8 h-8 rounded-full object-cover"
                                  alt={report.reporter?.full_name}
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flagged By</p>
                                  <h5 className="font-bold text-slate-800 text-xs">{report.reporter?.full_name || 'Unknown Profile'}</h5>
                                </div>
                              </div>
                            </div>

                            {/* Details & content */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg border border-rose-100">
                                  Reason: {report.reason}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Date: {reportDate}
                                </span>
                              </div>
                              
                              {report.details && (
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed italic">
                                  "{report.details}"
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-50">
                              <button
                                onClick={() => handleResolveReport(report.id)}
                                className="px-4 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Dismiss / Resolve Flag
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Flag className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium font-display">No active user reports. The community is clean.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolved Reports Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-emerald-600 text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Archive / Resolved ({reports.filter(r => r.resolved === true || r.resolved === 'true').length})
                  </h4>
                </div>

                <div className="space-y-4">
                  {reports.filter(r => r.resolved === true || r.resolved === 'true').length > 0 ? (
                    reports.filter(r => r.resolved === true || r.resolved === 'true').map((report) => {
                      const reportDate = report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A';
                      return (
                        <div key={report.id} className="bg-slate-50/30 p-5 md:p-6 rounded-[32px] border border-slate-200/60 transition-all opacity-90 hover:opacity-100">
                          <div className="flex flex-col gap-4">
                            {/* Header with reporter and reported profiles side-by-side */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img 
                                    src={report.reported?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reported?.full_name || 'U')}&background=f1f5f9&color=475569`} 
                                    alt={report.reported?.full_name} 
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 filter grayscale-[20%]"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reported User</p>
                                  <h4 className="font-bold text-slate-700 text-sm line-through decoration-slate-300">{report.reported?.full_name || 'Unknown Profile'}</h4>
                                  <p className="text-xs text-slate-500 font-mono">{report.reported?.email || 'No email'}</p>
                                </div>
                              </div>

                              <div className="hidden sm:block text-slate-300 font-medium">➔</div>

                              <div className="flex items-center gap-3 bg-slate-100/50 p-2.5 rounded-2xl">
                                <img 
                                  src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter?.full_name || 'U')}&background=eaeaea&color=333333`} 
                                  className="w-8 h-8 rounded-full object-cover filter grayscale-[10%]"
                                  alt={report.reporter?.full_name}
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Flagged By</p>
                                  <h5 className="font-bold text-slate-600 text-xs">{report.reporter?.full_name || 'Unknown Profile'}</h5>
                                </div>
                              </div>
                            </div>

                            {/* Details & content */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                                  Reason: {report.reason}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Date: {reportDate}
                                </span>
                              </div>
                              
                              {report.details && (
                                <div className="bg-slate-100/30 p-4 rounded-2xl border border-slate-100 text-slate-500 text-sm leading-relaxed italic">
                                  "{report.details}"
                                </div>
                              )}
                            </div>

                            {/* Resolved Badge */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider">
                                <Check className="w-3.5 h-3.5" />
                                Resolved
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-100">
                        <Check className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium font-display">No resolved reports history.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : dashboardCategory === 'highlights' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
          <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-900 font-display">Landing Page Highlights (Discover Room)</h3>
            <p className="text-xs text-slate-400 font-medium">Select what cards are displayed in the Discover section on the main landing page.</p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pro Highlight Selector */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 text-amber-500 rounded-xl">
                    <Star className="w-4 h-4 fill-current" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Meet a local pro</h4>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search provider by name or category..."
                  value={proSearch}
                  onChange={(e) => setProSearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {proSearch.trim() === '' ? (
                  (() => {
                    const currentHighlights = completedPros.filter(p => highlightedProIds.includes(String(p.id)));
                    if (currentHighlights.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Highlighted ({currentHighlights.length}):</p>
                          <div className="space-y-2">
                            {currentHighlights.map(currentHighlight => (
                              <div 
                                key={currentHighlight.id}
                                onClick={() => handleToggleHighlight('pro', currentHighlight.id)}
                                className="flex items-center justify-between p-3 rounded-2xl border bg-amber-50/40 border-amber-200 cursor-pointer hover:bg-amber-100/40 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={currentHighlight.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentHighlight.name)}&background=f1f5f9&color=475569`} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-900 text-xs truncate">{currentHighlight.name}</h5>
                                    <p className="text-[10px] text-slate-400 truncate">{currentHighlight.category}</p>
                                  </div>
                                </div>
                                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">Active</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-400 text-xs text-center py-6 font-medium">No provider highlighted. Search to highlight a provider.</p>
                      );
                    }
                  })()
                ) : (
                  (() => {
                    const filtered = completedPros.filter(pro => {
                      if (!pro) return false;
                      const name = typeof pro.name === 'string' ? pro.name : '';
                      const category = typeof pro.category === 'string' ? pro.category : '';
                      const query = (proSearch || '').toLowerCase();
                      return name.toLowerCase().includes(query) || category.toLowerCase().includes(query);
                    });
                    if (filtered.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results:</p>
                          {filtered.map((pro) => {
                            const isHighlighted = highlightedProIds.includes(String(pro.id));
                            return (
                              <div 
                                key={pro.id} 
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                                  isHighlighted ? "bg-amber-50/40 border-amber-200" : "bg-slate-50/30 border-slate-100 hover:bg-slate-50"
                                )}
                                onClick={() => handleToggleHighlight('pro', pro.id)}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={pro.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&background=f1f5f9&color=475569`} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-900 text-xs truncate">{pro.name}</h5>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {pro.company_name ? `${pro.company_name} • ` : ''}{pro.category}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  disabled={highlightingId === String(pro.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    isHighlighted ? "bg-amber-500 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-150 hover:bg-slate-100"
                                  )}
                                >
                                  {highlightingId === String(pro.id) ? "..." : isHighlighted ? "Highlighted" : "Select"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return <p className="text-slate-400 text-xs text-center py-6 font-medium">No providers match your search.</p>;
                    }
                  })()
                )}
              </div>
            </div>

            {/* Event Highlight Selector */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-500 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Event of the Week</h4>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events by title or location..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {eventSearch.trim() === '' ? (
                  (() => {
                    const currentHighlights = events.filter(e => highlightedEventIds.includes(String(e.id)));
                    if (currentHighlights.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Highlighted ({currentHighlights.length}):</p>
                          <div className="space-y-2">
                            {currentHighlights.map(currentHighlight => (
                              <div 
                                key={currentHighlight.id}
                                onClick={() => handleToggleHighlight('event', currentHighlight.id)}
                                className="flex items-center justify-between p-3 rounded-2xl border bg-emerald-50/40 border-emerald-200 cursor-pointer hover:bg-emerald-100/40 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                  <img src={currentHighlight.image || `https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80`} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-900 text-xs truncate">{currentHighlight.title}</h5>
                                    <p className="text-[10px] text-slate-400 truncate">{currentHighlight.start_date || currentHighlight.date} • {currentHighlight.location}</p>
                                  </div>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">Active</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-400 text-xs text-center py-6 font-medium">No event highlighted. Search to highlight an event.</p>
                      );
                    }
                  })()
                ) : (
                  (() => {
                    const filtered = events.filter(evt =>
                      evt.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
                      (evt.location && evt.location.toLowerCase().includes(eventSearch.toLowerCase()))
                    );
                    if (filtered.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results:</p>
                          {filtered.map((evt) => {
                            const isHighlighted = highlightedEventIds.includes(String(evt.id));
                            return (
                              <div 
                                key={evt.id} 
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                                  isHighlighted ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50/30 border-slate-100 hover:bg-slate-50"
                                )}
                                onClick={() => handleToggleHighlight('event', evt.id)}
                              >
                                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                  <img src={evt.image || `https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80`} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-slate-900 text-xs truncate">{evt.title}</h5>
                                    <p className="text-[10px] text-slate-400 truncate">{evt.start_date || evt.date} • {evt.location}</p>
                                  </div>
                                </div>
                                <button 
                                  disabled={highlightingId === String(evt.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    isHighlighted ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-150 hover:bg-slate-100"
                                  )}
                                >
                                  {highlightingId === String(evt.id) ? "..." : isHighlighted ? "Highlighted" : "Select"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return <p className="text-slate-400 text-xs text-center py-6 font-medium">No events match your search.</p>;
                    }
                  })()
                )}
              </div>
            </div>

            {/* Testimony Highlight Selector */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-500 rounded-xl">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Quote / Testimonial</h4>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search testimonials by author, provider, or commentary..."
                  value={testimonySearch}
                  onChange={(e) => setTestimonySearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {testimonySearch.trim() === '' ? (
                  (() => {
                    const approvedTestimonies = allTestimonies.filter(t => t.status === 'approved');
                    const currentHighlights = approvedTestimonies.filter(t => highlightedTestimoniesIds.includes(String(t.id)));
                    if (currentHighlights.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Highlighted ({currentHighlights.length}):</p>
                          <div className="space-y-2">
                            {currentHighlights.map(currentHighlight => (
                              <div 
                                key={currentHighlight.id}
                                onClick={() => handleToggleHighlight('testimony', currentHighlight.id)}
                                className="flex items-center justify-between p-3 rounded-2xl border bg-indigo-50/40 border-indigo-200 cursor-pointer hover:bg-indigo-100/40 transition-all"
                              >
                                <div className="min-w-0 pr-4 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs truncate">{getAuthorDisplayName(currentHighlight.author)}</span>
                                    <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold uppercase truncate max-w-[120px]">
                                      {currentHighlight.professionals?.name || 'Pro'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate italic mt-1">"{currentHighlight.comment}"</p>
                                </div>
                                <span className="px-2.5 py-1 bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">Active</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-400 text-xs text-center py-6 font-medium">No testimonial highlighted. Search to highlight a testimonial.</p>
                      );
                    }
                  })()
                ) : (
                  (() => {
                    const approvedTestimonies = allTestimonies.filter(t => t.status === 'approved');
                    const filtered = approvedTestimonies.filter(t => 
                      getAuthorDisplayName(t.author).toLowerCase().includes(testimonySearch.toLowerCase()) ||
                      (t.comment && t.comment.toLowerCase().includes(testimonySearch.toLowerCase())) ||
                      (t.professionals?.name && t.professionals.name.toLowerCase().includes(testimonySearch.toLowerCase()))
                    );
                    if (filtered.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results:</p>
                          {filtered.map((testimony) => {
                            const isHighlighted = highlightedTestimoniesIds.includes(String(testimony.id));
                            return (
                              <div 
                                key={testimony.id} 
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                                  isHighlighted ? "bg-indigo-50/40 border-indigo-200" : "bg-slate-50/30 border-slate-100 hover:bg-slate-50"
                                )}
                                onClick={() => handleToggleHighlight('testimony', testimony.id)}
                              >
                                <div className="flex flex-col gap-1 min-w-0 pr-4 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs truncate">{getAuthorDisplayName(testimony.author)}</span>
                                    <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold uppercase truncate max-w-[120px]">
                                      {testimony.professionals?.name || 'Pro'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate italic">"{testimony.comment}"</p>
                                </div>
                                <button 
                                  disabled={highlightingId === String(testimony.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0",
                                    isHighlighted ? "bg-indigo-500 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-150 hover:bg-slate-100"
                                  )}
                                >
                                  {highlightingId === String(testimony.id) ? "..." : isHighlighted ? "Highlighted" : "Select"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return <p className="text-slate-400 text-xs text-center py-6 font-medium">No approved testimonials match your search.</p>;
                    }
                  })()
                )}
              </div>
            </div>

            {/* Article/Guide Highlight Selector */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#00C2A8]/10 text-[#00C2A8] rounded-xl">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Tips / Article of the Week</h4>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search articles by title or excerpt..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/20 focus:border-[#00C2A8] text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {articleSearch.trim() === '' ? (
                  (() => {
                    const currentHighlights = allArticles.filter(art => highlightedArticleIds.includes(String(art.id)));
                    if (currentHighlights.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Highlighted ({currentHighlights.length}):</p>
                          <div className="space-y-2">
                            {currentHighlights.map(currentHighlight => (
                              <div 
                                key={currentHighlight.id}
                                onClick={() => handleToggleHighlight('article', currentHighlight.id)}
                                className="flex items-center justify-between p-3 rounded-2xl border bg-[#00C2A8]/5 border-[#00C2A8]/30 cursor-pointer hover:bg-[#00C2A8]/15 transition-all"
                              >
                                <div className="flex flex-col gap-1 min-w-0 text-left">
                                  <span className="font-bold text-slate-900 text-xs truncate">{currentHighlight.title}</span>
                                  <span className="text-[10px] text-slate-400 truncate">{currentHighlight.excerpt}</span>
                                </div>
                                <span className="px-2.5 py-1 bg-[#00C2A8] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0">Active</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-400 text-xs text-center py-6 font-medium">No article highlighted. Search to highlight one or more.</p>
                      );
                    }
                  })()
                ) : (
                  (() => {
                    const filtered = allArticles.filter(art => 
                      art.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
                      (art.excerpt && art.excerpt.toLowerCase().includes(articleSearch.toLowerCase()))
                    );
                    if (filtered.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Results:</p>
                          {filtered.map((art) => {
                            const isHighlighted = highlightedArticleIds.includes(String(art.id));
                            return (
                              <div 
                                key={art.id} 
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer",
                                  isHighlighted ? "bg-[#00C2A8]/5 border-[#00C2A8]/30" : "bg-slate-50/30 border-slate-100 hover:bg-slate-50"
                                )}
                                onClick={() => handleToggleHighlight('article', art.id)}
                              >
                                <div className="flex flex-col gap-1 min-w-0 text-left">
                                  <span className="font-bold text-slate-900 text-xs truncate">{art.title}</span>
                                  <span className="text-[10px] text-slate-400 truncate">{art.excerpt}</span>
                                </div>
                                <button 
                                  disabled={highlightingId === String(art.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ml-2",
                                    isHighlighted ? "bg-[#00C2A8] text-white shadow-sm" : "bg-white text-slate-600 border border-slate-150 hover:bg-slate-100"
                                  )}
                                >
                                  {highlightingId === String(art.id) ? "..." : isHighlighted ? "Highlighted" : "Select"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return <p className="text-slate-400 text-xs text-center py-6 font-medium">No articles match your search.</p>;
                    }
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      ) : dashboardCategory === 'guides' ? (
        <div className="space-y-6">
          {loadingGuides ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm font-medium">Loading articles...</p>
            </div>
          ) : showArticleForm ? (
            <form onSubmit={handleSaveArticle} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-lg font-bold font-display text-slate-800">
                    {editingArticle ? 'Edit Article' : 'Create New Article'}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Enter details and author contact information below.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowArticleForm(false);
                    setEditingArticle(null);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Topic</label>
                  <select
                    value={guideFormCategory}
                    onChange={(e) => setGuideFormCategory(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                  >
                    <option value="housing">Housing</option>
                    <option value="paperwork">Paperwork</option>
                    <option value="transport">Transport</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="family">Family</option>
                    <option value="schools">Schools</option>
                    <option value="banking">Banking</option>
                    <option value="pets">Pets</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Online Status</label>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150 w-full sm:w-fit">
                    <button
                      type="button"
                      onClick={() => setArticleFormIsOnline(true)}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all",
                        articleFormIsOnline ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Article Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleFormIsOnline(false)}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all",
                        !articleFormIsOnline ? "bg-slate-400 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Draft / Offline
                    </button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter article title"
                    value={articleFormTitle}
                    onChange={(e) => setArticleFormTitle(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Excerpt (Short Description)</label>
                  <input
                    type="text"
                    required
                    placeholder="A quick summary showing on lists..."
                    value={articleFormExcerpt}
                    onChange={(e) => setArticleFormExcerpt(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Key Business Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Engel & Völkers Valencia"
                    value={articleFormBusinessName}
                    onChange={(e) => setArticleFormBusinessName(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Article Image</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Or enter public image URL (e.g., https://...)"
                          value={articleFormImageUrl}
                          onChange={(e) => setArticleFormImageUrl(e.target.value)}
                          className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium"
                        />
                        <label className="cursor-pointer px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl whitespace-nowrap transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/10">
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleArticleImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {uploadingArticleImg && (
                        <p className="text-[10px] text-orange-500 font-semibold mt-1 animate-pulse">Uploading image to secure storage...</p>
                      )}
                    </div>
                    <div className="flex justify-center md:justify-end">
                      {articleFormImageUrl ? (
                        <div className="relative group w-28 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                          <img
                            src={articleFormImageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setArticleFormImageUrl('')}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-95 hover:opacity-100 transition-all hover:scale-105"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-28 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 font-sans">
                          <span className="text-[9px] font-bold uppercase tracking-wider font-semibold">No Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Article Content (Markdown supported)</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Enter full article text. You can use markdown headers, bullets, and paragraphs..."
                    value={articleFormContent}
                    onChange={(e) => setArticleFormContent(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 font-medium font-sans resize-y"
                  />
                </div>
              </div>

              {/* Author Section */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Author details or Contact Information (Optional)</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">To display contact credentials and redirection links at the end of the article.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Marina Sanchis"
                      value={articleFormAuthorName}
                      onChange={(e) => setArticleFormAuthorName(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Role / Title Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Real Estate Advisor"
                      value={articleFormAuthorRole}
                      onChange={(e) => setArticleFormAuthorRole(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Engel & Völkers"
                      value={articleFormAuthorBusiness}
                      onChange={(e) => setArticleFormAuthorBusiness(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Website URL (Include http://)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.ev.com"
                      value={articleFormAuthorWebsite}
                      onChange={(e) => setArticleFormAuthorWebsite(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Contact Email</label>
                    <input
                      type="email"
                      placeholder="e.g. contact@email.com"
                      value={articleFormAuthorEmail}
                      onChange={(e) => setArticleFormAuthorEmail(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Contact Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +34 612 345 678"
                      value={articleFormAuthorPhone}
                      onChange={(e) => setArticleFormAuthorPhone(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-wrap gap-3 justify-between border-t border-slate-100 pt-6">
                <div>
                  <button
                    type="button"
                    onClick={handlePreviewArticle}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-200"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    View Article
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowArticleForm(false);
                      setEditingArticle(null);
                    }}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingArticle}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-md shadow-orange-500/10"
                  >
                    {savingArticle ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingArticle ? (
                      'Save Changes'
                    ) : (
                      'Create Article'
                    )}
                  </button>
                </div>
              </div>

              {/* Live Preview Modal */}
              <ExpertGuideModal 
                isOpen={showPreviewModal} 
                onClose={() => setShowPreviewModal(false)} 
                article={previewArticle}
              />
            </form>
          ) : (
            <div className="space-y-8 text-left">
              {guideCategories.length === 0 ? (
                <div className="bg-white p-12 rounded-[32px] border border-slate-100 shadow-sm text-center">
                  <p className="text-slate-400 text-xs py-6 font-medium">No guide articles found in cache. Click Add New Article to start.</p>
                </div>
              ) : (
                guideCategories.map((cat) => (
                  <div key={cat.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div className="flex items-center gap-2 font-sans">
                        <span className="p-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                          {cat.title}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                          {cat.articles?.length || 0} {cat.articles?.length === 1 ? 'article' : 'articles'}
                        </span>
                      </div>
                    </div>

                    {cat.articles && cat.articles.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {cat.articles.map((art) => {
                          const isOnline = art.isOnline !== false;
                          return (
                            <div 
                              key={art.id} 
                              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row gap-4 items-start md:items-center ${
                                isOnline 
                                  ? 'border-emerald-100 bg-white hover:border-emerald-200 hover:shadow-xs shadow-white/10' 
                                  : 'border-dashed border-slate-200 bg-slate-50/30 opacity-65'
                              }`}
                            >
                              {art.imageUrl && (
                                <img 
                                  src={art.imageUrl} 
                                  alt={art.title} 
                                  className={`w-20 h-16 object-cover rounded-xl bg-slate-100 shrink-0 border border-slate-100 ${!isOnline && 'grayscale-[40%]'}`} 
                                  referrerPolicy="no-referrer" 
                                />
                              )}
                              <div className="min-w-0 flex-1 text-left space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                                    {cat.title}
                                  </span>
                                  {isOnline ? (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                      </span>
                                      Online / Live
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                      Offline / Draft
                                    </span>
                                  )}
                                </div>
                                <h5 className={`font-bold text-sm sm:text-base leading-tight ${isOnline ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {art.title}
                                </h5>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2 md:line-clamp-1">{art.excerpt}</p>
                              </div>

                              <div className="flex flex-row items-center gap-2 w-full md:w-auto justify-end md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 mt-2 md:mt-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditArticleClick(art, cat.id)}
                                  className="flex-1 md:flex-none px-4 py-2.5 md:px-3.5 md:py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm sm:shadow-none"
                                >
                                  <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingArticleId === art.id}
                                  onClick={() => handleDeleteArticle(art.id)}
                                  className="flex-1 md:flex-none px-4 py-2.5 md:px-3.5 md:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-rose-100/50 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm sm:shadow-none"
                                >
                                  {deletingArticleId === art.id ? (
                                    '...'
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                      <span>Delete</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic text-left py-2">No articles in this topic.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : dashboardCategory === 'announcements' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-lg font-bold font-display text-slate-800">
                Announcements & IT Updates
              </h4>
              <p className="text-xs text-slate-400 font-medium">Publish one-line announcements for all users.</p>
            </div>
            {!showAnnForm && (
              <button
                onClick={() => {
                  setAnnFormTitle('');
                  setAnnFormContent('');
                  setAnnFormIsActive(true);
                  setAnnFormCtaType('');
                  setEditingAnnId(null);
                  setShowAnnForm(true);
                }}
                className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md shadow-yellow-500/10 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Publish announcement
              </button>
            )}
          </div>

          {showAnnForm ? (
            <form onSubmit={handleSaveAnnouncement} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {editingAnnId ? "Edit Announcement" : "New Announcement"}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Enter the announcement details below.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnForm(false);
                    setEditingAnnId(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Message (one line preferred)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. System maintenance completed. Everything is back online!"
                    value={annFormContent}
                    onChange={(e) => setAnnFormContent(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-150 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 text-slate-800 font-medium"
                  />
                </div>

                {/* Icon Selection Grid */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Notification Icon Library
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">Select the icon to display in front of this notification:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-150 max-h-64 overflow-y-auto">
                    {NOTIFICATION_ICONS.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = annFormIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAnnFormIcon(item.id)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-2xl border text-xs font-medium transition-all relative cursor-pointer text-left group",
                            isSelected 
                              ? "border-blue-600 bg-white shadow-md ring-2 ring-blue-500/20" 
                              : "border-slate-200/70 bg-white/80 hover:bg-white hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                            item.bgColor,
                            item.textColor,
                            item.borderColor
                          )}>
                            <IconComponent className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 block truncate leading-tight">{item.label}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{item.category}</span>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-xs font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <input
                    type="checkbox"
                    id="annFormIsActive"
                    checked={annFormIsActive}
                    onChange={(e) => setAnnFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div>
                    <label htmlFor="annFormIsActive" className="text-xs font-bold text-slate-700 block cursor-pointer">Activate Announcement</label>
                    <p className="text-[10px] text-slate-400 font-medium">The announcement will instantly appear in the users dropdown banner.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <input
                    type="checkbox"
                    id="annFormCtaType"
                    checked={annFormCtaType === 'recommend_pro'}
                    onChange={(e) => setAnnFormCtaType(e.target.checked ? 'recommend_pro' : '')}
                    className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div>
                    <label htmlFor="annFormCtaType" className="text-xs font-bold text-slate-700 block cursor-pointer">Option: "Recommend a pro" action</label>
                    <p className="text-[10px] text-slate-400 font-medium">Adds a clickable "Recommend a pro" icon button next to the message, which opens the recommendation modal when clicked.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnForm(false);
                    setEditingAnnId(null);
                  }}
                  className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAnn}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-250 text-slate-900 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-md shadow-yellow-500/10"
                >
                  {savingAnn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : editingAnnId ? (
                    "Update Announcement"
                  ) : (
                    "Publish Announcement"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {loadingAnnouncements ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-xs font-medium">Loading announcements...</p>
                </div>
              ) : adminAnnouncements.length === 0 ? (
                <div className="bg-white p-12 rounded-[32px] border border-slate-100 shadow-sm text-center space-y-2">
                  <Megaphone className="w-8 h-8 text-slate-350 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-750">No announcements published</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Publish your first message or IT alert. It will appear on a single line for all users.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {adminAnnouncements.map((ann) => {
                    const isActive = ann.is_active !== false;
                    const annData = getNotificationIconData(ann.icon, ann.type);
                    const AnnIconComponent = annData.icon;
                    return (
                      <div
                        key={ann.id}
                        className={cn(
                          "p-5 rounded-[24px] border transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center",
                          isActive
                            ? "bg-white border-yellow-100 hover:border-yellow-200 shadow-xs"
                            : "bg-slate-50/55 border-dashed border-slate-200 opacity-65"
                        )}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs",
                            annData.bgColor,
                            annData.textColor,
                            annData.borderColor
                          )}>
                            <AnnIconComponent className="w-5.5 h-5.5 stroke-[2.2]" />
                          </div>
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {ann.title && ann.title !== 'Announcement' && (
                                <span className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-100 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                                  {ann.title}
                                </span>
                              )}
                              {isActive ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                  Offline
                                </span>
                              )}
                            </div>

                            <h5 className="font-semibold text-slate-900 text-xs sm:text-sm leading-relaxed text-left">
                              {ann.content}
                            </h5>

                            <p className="text-[10px] text-slate-400 font-semibold text-left">
                              Published on {new Date(ann.created_at).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditAnnouncementClick(ann)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingAnnId === ann.id}
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-rose-100/50 transition-all flex items-center gap-1.5"
                          >
                            {deletingAnnId === ann.id ? (
                              "..."
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-[80px] md:inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))' }}
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ y: 100, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.9 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Delete Confirmation</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Are you sure you want to delete this professional? This action is irreversible and the profile will be archived.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3 pt-4">
                  <button
                    onClick={() => handleDeletePro()}
                    disabled={isSubmitting}
                    className="w-full h-14 bg-rose-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, delete permanently"}
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmailVerificationView({ 
  currentUser, 
  onSignOut, 
  onRefreshStatus, 
  setGlobalAlert 
}: { 
  currentUser: any; 
  onSignOut: () => void; 
  onRefreshStatus: () => void; 
  setGlobalAlert: (alert: { type: 'error' | 'info' | 'success', text: string }) => void;
}) {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentUser?.email || '',
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;

      setResendCooldown(60);
      setGlobalAlert({ type: 'success', text: 'A new confirmation email has been sent to your inbox!' });
    } catch (err: any) {
      setGlobalAlert({ type: 'error', text: err.message || 'Failed to resend the confirmation email.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/40 relative justify-center items-center px-4 w-full h-[100dvh]">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] -right-[15%] w-[50%] h-[50%] bg-brand-blue/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] -left-[15%] w-[50%] h-[50%] bg-brand-yellow/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white border border-slate-100/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center"
      >
        <div className="mx-auto w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mb-6 relative">
          <Mail className="w-8 h-8 text-brand-blue" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 bg-rose-600 rounded-full border-2 border-white shadow-sm animate-ping" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 bg-rose-600 rounded-full border-2 border-white shadow-sm" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-800 mb-2">
          Verify your email address 🔓
        </h1>
        
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          A confirmation email has been sent to:<br />
          <strong className="text-slate-800 break-all">{currentUser?.email}</strong>
        </p>

        <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-4 mb-8 text-left text-xs text-slate-600 leading-relaxed shadow-inner">
          <p className="font-bold text-slate-700 mb-1.5">How to unlock?</p>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium">
            <li>Check your inbox <span className="text-slate-400 font-normal">(including spam/promotions folders)</span>.</li>
            <li>Click the link inside the confirmation email to activate your account.</li>
            <li>Return to this page and click the <span className="text-slate-800 font-bold">"I have verified my email"</span> button below.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRefreshStatus}
            disabled={isResending}
            className="w-full h-12 bg-rose-500 hover:bg-rose-600 font-bold text-white rounded-2xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            I have verified my email
          </button>

          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="w-full h-12 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isResending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {resendCooldown > 0 
              ? `Resend email (${resendCooldown}s)` 
              : "Resend verification email"
            }
          </button>

          <button
            onClick={onSignOut}
            className="w-full h-10 text-slate-400 hover:text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out (change email address)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileSetupView({ currentUser, onComplete }: { currentUser: any, onComplete: (profile: Profile) => void }) {
  const [fullName, setFullName] = useState(currentUser?.user_metadata?.full_name || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.user_metadata?.avatar_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let avatarUrl = '';
      if (avatar) {
        avatarUrl = await authService.uploadAvatar(currentUser.id, avatar);
      }

      const profile = await authService.upsertProfile({
        id: currentUser.id,
        email: currentUser.email,
        full_name: fullName.trim(),
        avatar_url: avatarUrl || avatarPreview || undefined,
      });

      onComplete(profile);
    } catch (err: any) {
      console.error('Error setting up profile:', err);
      const isFkeyViolation = 
        err.message?.toLowerCase().includes('violates foreign key constraint') ||
        err.message?.toLowerCase().includes('23503') ||
        err.code === '23503' ||
        JSON.stringify(err).includes('profiles_id_fkey') ||
        JSON.stringify(err).includes('23503');
        
      if (isFkeyViolation) {
        setError("Your local session references a deleted user (profiles_id_fkey error). Please click the 'Reset Session / Log Out' button below to clear the cache, then register or log in with a valid account.");
      } else {
        setError(err.message || 'Failed to complete profile setup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[110] flex flex-col overflow-y-auto no-scrollbar">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] bg-brand-yellow/5 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <Logo />
            <h2 className="text-2xl font-semibold text-brand-navy tracking-tight mt-6">Complete Your Profile</h2>
            <p className="text-slate-400 text-sm font-medium">Almost there! Tell us a bit more about yourself.</p>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-10">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-3 mb-6">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group-hover:border-brand-blue group-hover:bg-brand-blue/5 transition-all">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-300 group-hover:text-brand-blue transition-colors" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Profile Photo</span>
              </div>

              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 px-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                    <User className={cn(
                      "w-5 h-5 transition-colors",
                      fullName ? "text-brand-blue" : "text-slate-300"
                    )} />
                  </div>
                  <input 
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-4 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all placeholder:text-slate-300 text-sm"
                  />
                </div>
              </div>

              <button 
                disabled={isLoading}
                type="submit"
                className="w-full h-14 bg-brand-blue text-white rounded-2xl font-semibold text-sm uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-blue/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await authService.signOut();
                  } catch (e) {
                    console.warn("Sign out failed during manual reset", e);
                  }
                  localStorage.removeItem('keep_me_signed_in');
                  // Clear all keys from localStorage related to Supabase or sessions
                  for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('sb-') || key.includes('supabase') || key.includes('auth'))) {
                      localStorage.removeItem(key);
                    }
                  }
                  // Clean any session cache
                  sessionStorage.clear();
                  // Redirect to homepage & fully refresh
                  window.location.href = '/';
                }}
                className="w-full min-h-[48px] h-auto py-3.5 px-4 bg-rose-50/50 hover:bg-rose-100/50 border border-rose-200/80 text-rose-600 rounded-2xl font-bold uppercase tracking-widest text-[9.5px] sm:text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="leading-tight text-center">
                  Reset Session / Log Out
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}



function LoginView({ onBack, onLoginSuccess, onSetUser, currentUser }: { onBack: () => void, onLoginSuccess: () => void, onSetUser: (user: any) => void, currentUser?: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password' | 'forgot_password'>('email');
  const [isNewUser, setIsNewUser] = useState(false);
  const [showSignupToggle, setShowSignupToggle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('keep_me_signed_in') !== 'false';
    }
    return true;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      onLoginSuccess();
    }
  }, [currentUser, onLoginSuccess]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const deletionMessage = window.localStorage.getItem('unlocked_account_deletion_success');
      if (deletionMessage) {
        setMessage({ type: 'success', text: deletionMessage });
        window.localStorage.removeItem('unlocked_account_deletion_success');
      }
    }
  }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStep('password');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Persist the choice to localStorage before starting authentication
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('keep_me_signed_in', rememberMe ? 'true' : 'false');
    }

    try {
      if (isNewUser) {
        const { user } = await authService.signUp(email, password);
        
        if (user) {
          if (!user.email_confirmed_at) {
            await authService.signOut().catch(() => {});
            setMessage({ 
              type: 'error', 
              text: 'Email is not verified yet. Please check your inbox and click the activation link.'
            });
          } else {
            onSetUser(user);
            onLoginSuccess();
          }
        } else {
          setMessage({ type: 'success', text: 'Account created! Please check your email to confirm.' });
        }
      } else {
        try {
          const { user } = await authService.signIn(email, password);
          if (user) {
            if (!user.email_confirmed_at) {
              await authService.signOut().catch(() => {});
              setMessage({ 
                type: 'error', 
                text: 'Email is not verified yet. Please check your inbox and click the activation link.'
              });
            } else {
              onSetUser(user);
              onLoginSuccess();
            }
          }
        } catch (error: any) {
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            setShowSignupToggle(true);
            throw new Error('Invalid email or password. If you don\'t have an account yet, please click "Sign up" below.');
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setMessage({ type: 'error', text: error.message || 'Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setMessage(null);
    
    // Persist the choice to localStorage for Google login as well
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('keep_me_signed_in', 'true');
    }

    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      console.error('Google auth error:', error);
      setMessage({ type: 'error', text: error.message || 'Google Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    setMessage(null);
    
    // Persist the choice to localStorage for Apple login as well
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('keep_me_signed_in', 'true');
    }

    try {
      await authService.signInWithApple();
    } catch (error: any) {
      console.error('Apple auth error:', error);
      setMessage({ type: 'error', text: error.message || 'Apple Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const [showEmailForm, setShowEmailForm] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-h-full bg-slate-50/40 relative">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-brand-blue/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] bg-brand-yellow/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[25%] h-[25%] bg-brand-blue/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-10s' }} />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center pt-16 px-5 pb-8 min-h-screen">
        {/* Back Button to choices when in email form */}
        {showEmailForm && (
          <button 
            onClick={() => { setShowEmailForm(false); setStep('email'); setMessage(null); }}
            className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-400 hover:text-slate-600 transition-all active:scale-95 group flex items-center gap-2 z-25 cursor-pointer"
            title="Back to choices"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs font-normal uppercase tracking-wider">Back</span>
          </button>
        )}

        <div className="w-full max-w-sm space-y-8">
          {/* Logo Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <Logo className="scale-115" />
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full bg-white p-7 sm:p-9 rounded-[32px] sm:rounded-[40px] border border-slate-100/80 shadow-[0_15px_45px_rgba(51,65,85,0.05)] relative z-10"
          >
            {/* Header section based on state */}
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                {step === 'forgot_password' ? 'Reset Password' : isNewUser ? 'Welcome!' : 'Welcome back!'}
              </h2>
              <p className="text-slate-400 font-normal text-xs sm:text-[13px] leading-relaxed max-w-xs mx-auto">
                {step === 'forgot_password' 
                  ? 'Enter your email to receive a 6-digit verification code.' 
                  : isNewUser 
                    ? "Sign up to continue discovering and connecting with trusted local pros." 
                    : "Sign in to continue discovering and connecting with trusted local pros."}
              </p>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-2xl text-sm font-normal flex items-center gap-3 mb-6",
                  message.type === 'success' 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                    : "bg-rose-50 text-rose-600 border border-rose-100"
                )}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span className="text-xs sm:text-sm">{message.text}</span>
              </motion.div>
            )}

            {!showEmailForm ? (
              /* Welcome Choices Selection State */
              <div className="space-y-6">
                
                {/* 1. Continue with Google */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full h-14 bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-slate-300 text-slate-850 rounded-[24px] font-normal text-sm sm:text-base hover:shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-3.5 overflow-hidden active:scale-[0.985] cursor-pointer"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.9 3.03C6.31 7.55 8.94 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.46h6.44c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.51z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.38 14.45a7.16 7.16 0 0 1 0-4.9l-3.9-3.03a11.96 11.96 0 0 0 0 10.96l3.9-3.03z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.06 0-5.69-2.51-6.62-5.57l-3.9 3.03C3.37 20.32 7.35 23 12 23z"
                    />
                  </svg>
                  <span className="font-semibold text-slate-700">
                    {isNewUser ? 'Sign up with Google' : 'Sign in with Google'}
                  </span>
                </button>

                {/* 1.5. Continue with Apple */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleAppleLogin}
                  className="w-full h-14 bg-[#000000] hover:bg-slate-900 border border-black text-white rounded-[24px] font-normal text-sm sm:text-base hover:shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-3.5 overflow-hidden active:scale-[0.985] cursor-pointer"
                >
                  <svg className="w-5 h-5 flex-shrink-0 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.51 12.06 1.005 1.45 2.19 3.07 3.766 3.01 1.524-.06 2.098-.98 3.937-.98 1.829 0 2.356.98 3.936.95 1.616-.027 2.65-1.465 3.64-2.91 1.142-1.666 1.61-3.277 1.637-3.36-.036-.015-3.142-1.204-3.174-4.782-.027-2.985 2.443-4.417 2.553-4.482-1.4-2.05-3.56-2.285-4.322-2.34-1.956-.157-3.374 1.04-4.321 1.04zM16.19 3.56c.806-.98 1.35-2.35 1.2-3.56-1.03.04-2.28.69-3.02 1.56-.66.76-1.24 2.15-1.08 3.35 1.15.09 2.33-.59 2.9-1.35z"/>
                  </svg>
                  <span className="font-semibold text-white">
                    {isNewUser ? 'Sign up with Apple' : 'Sign in with Apple'}
                  </span>
                </button>

                {/* 2. OR divider */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <span className="relative bg-white px-4 text-[10px] font-normal uppercase tracking-widest text-slate-300">or</span>
                </div>

                {/* 3. Continue with Email */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full h-14 bg-white hover:bg-slate-50/60 border border-slate-200/90 hover:border-slate-300 text-slate-855 rounded-[24px] font-normal text-sm sm:text-base hover:shadow-xs transition-all flex items-center justify-center gap-3.5 overflow-hidden active:scale-[0.985] cursor-pointer"
                >
                  <Mail className="w-5 h-5 text-blue-600/90 flex-shrink-0" />
                  <span className="font-semibold text-slate-700">
                    {isNewUser ? 'Sign up with Email' : 'Sign in with Email'}
                  </span>
                </button>

                {/* 4. Continue as Guest */}
                <div className="pt-2 text-center">
                  <button 
                    type="button"
                    onClick={onBack}
                    className="inline-flex flex-col items-center justify-center hover:opacity-85 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-blue-600/95 font-medium text-[13.5px]">
                      <User className="w-4 h-4 stroke-[2px]" />
                      <span>Continue as Guest</span>
                    </div>
                    <span className="text-[10.5px] text-slate-400 font-normal mt-1 leading-tight">Explore the app without an account.</span>
                  </button>
                </div>

                {/* Separator line & Bottom Toggle */}
                <div className="border-t border-slate-100/80 pt-6">
                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsNewUser(!isNewUser);
                        if (message) setMessage(null);
                      }}
                      className="text-xs sm:text-sm font-normal text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {isNewUser ? (
                        <>Already have an account? <span className="text-blue-600/90 font-medium hover:underline">Sign in</span></>
                      ) : (
                        <>Don't have an account? <span className="text-blue-600/90 font-medium hover:underline">Sign up</span></>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              ) : step === 'forgot_password' ? (
                <ForgotPasswordOTP
                  initialEmail={email}
                  onBackToLogin={() => {
                    setStep('password');
                    if (message) setMessage(null);
                  }}
                  onSuccess={() => {
                    supabase.auth.getUser().then(({ data: { user } }) => {
                      if (user) {
                        onSetUser(user);
                      }
                      onLoginSuccess();
                    });
                  }}
                />
              ) : (
                /* Email Credentials Input State */
                <form 
                  onSubmit={
                  step === 'email' 
                    ? handleContinue 
                    : handleAuth
                } 
                className="space-y-5 animate-in fade-in duration-200"
              >
                {step === 'email' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">Email Address</label>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                        <Mail className={cn(
                          "w-5 h-5 transition-colors",
                          email ? "text-brand-blue" : "text-slate-300"
                        )} />
                      </div>
                      <input 
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-4 font-normal text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 placeholder:font-normal text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">Password</label>
                      <button 
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-[10px] font-medium uppercase tracking-wider text-brand-blue hover:underline"
                      >
                        Change email
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                        <Lock className={cn(
                          "w-5 h-5 transition-colors",
                          password ? "text-brand-blue" : "text-slate-300"
                        )} />
                      </div>
                      <input 
                        required
                        autoFocus
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-14 font-normal text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 placeholder:font-normal text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'password' && (
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="peer appearance-none w-5 h-5 border border-slate-200 rounded-[6px] bg-slate-50 checked:bg-brand-blue checked:border-brand-blue transition-all cursor-pointer"
                        />
                        <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none stroke-[3]" />
                      </div>
                      <span className="text-xs font-normal text-slate-400 group-hover:text-slate-500 transition-colors select-none">Stay logged in</span>
                    </label>
                    {!isNewUser && (
                      <button 
                        type="button"
                        onClick={() => {
                          setStep('forgot_password');
                          if (message) setMessage(null);
                        }}
                        className="text-xs font-normal text-slate-400 hover:text-slate-650 hover:underline cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                )}

                <button 
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-14 bg-brand-blue border border-transparent text-white rounded-[24px] font-normal text-sm sm:text-base shadow-lg shadow-brand-blue/15 hover:brightness-110 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {step === 'email' ? 'Continue' : isNewUser ? 'Sign up' : 'Sign In'} 
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>

                {/* Switch button between Sign In and Sign Up inside credentials form */}
                <div className="text-center border-t border-slate-100/80 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewUser(!isNewUser);
                      if (message) setMessage(null);
                    }}
                    className="text-xs font-normal text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {isNewUser ? (
                      <>Already have an account? <span className="text-brand-blue font-semibold hover:underline">Sign in</span></>
                    ) : (
                      <>Don't have an account? <span className="text-brand-blue font-semibold hover:underline">Sign up</span></>
                    )}
                  </button>
                </div>

                {/* Back Link to choice selection */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowEmailForm(false); setStep('email'); }}
                    className="text-xs font-normal text-slate-400 hover:text-brand-blue/90 cursor-pointer"
                  >
                    Use another login method
                  </button>
                </div>
              </form>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}

function NotificationsDropdownBanner({
  isOpen,
  onClose,
  announcements,
  readIds,
  onMarkAsRead,
  onNavigate,
  onAddPro
}: {
  isOpen: boolean;
  onClose: () => void;
  announcements: any[];
  readIds: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNavigate?: (view: View, params?: any) => void;
  onAddPro?: () => void;
}) {
  const [showOlder, setShowOlder] = useState(false);

  if (!isOpen) return null;

  // Active notifications list
  const activeNotifications = announcements.filter(item => item);
  const displayedNotifications = showOlder ? activeNotifications : activeNotifications.slice(0, 6);

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed inset-0 z-40 bg-slate-900/15 cursor-default" 
        onClick={onClose} 
      />

      {/* Main Notification Card / Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -8 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'calc(100% - 20px) 0px' }}
        className="absolute top-full right-0 mt-2.5 w-[calc(100vw-32px)] sm:w-[460px] bg-white rounded-3xl shadow-2xl z-50 border border-slate-100/90 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Caret Arrow pointing up to the bell */}
        <div className="absolute -top-2 right-5 w-4 h-4 bg-white rotate-45 border-t border-l border-slate-100/90 z-20" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Notifications</h3>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100/70 p-2 sm:p-3 space-y-1">
          {displayedNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-xs font-semibold">No notifications</p>
            </div>
          ) : displayedNotifications.map((item) => {
            const itemData = getNotificationIconData(item.icon, item.type);
            const IconComp = itemData.icon;

            const title = item.title && item.title.toLowerCase() !== 'notification' && item.title.toLowerCase() !== 'announcement'
              ? item.title
              : (item.type === 'recommendation_request' ? 'Looking for a professional' : null);

            const description = item.content || item.notes || item.message || '';

            return (
              <div
                key={item.id}
                onClick={() => {
                  onMarkAsRead(String(item.id));
                  if (item.type === 'event' && onNavigate) {
                    onClose();
                    onNavigate('events');
                  } else if (item.type === 'guide' && onNavigate) {
                    onClose();
                    onNavigate('guides');
                  } else if ((item.type === 'recommendation_request' || item.type === 'recommendation') && onNavigate) {
                    onClose();
                    onNavigate('explore');
                  }
                }}
                className="p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3.5 relative group bg-white hover:bg-slate-50/60"
              >
                {/* Soft Squircle Icon Container */}
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border",
                  itemData.bgColor,
                  itemData.textColor,
                  itemData.borderColor
                )}>
                  <IconComp className="w-6 h-6 stroke-[2.2]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  {title && (
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
                      {title}
                    </h4>
                  )}
                  {description && (
                    <p className="text-xs text-slate-700 font-medium leading-snug break-words mt-0.5">
                      {description}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {item.cta_type === 'recommend_pro' && (
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(String(item.id));
                        onClose();
                        if (onAddPro) onAddPro();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Pro</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer View Older Notifications */}
        {activeNotifications.length > 6 && !showOlder && (
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center rounded-b-3xl">
            <button
              onClick={() => setShowOlder(true)}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <span>View older notifications</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

function HomeView({ 
  onNavigate, 
  allPros, 
  events, 
  onAddPro, 
  ads, 
  onSelectAd, 
  onSelectPost, 
  scrollToTop, 
  onProUpdate, 
  userProfile, 
  currentUser, 
  unreadConversations = [], 
  blockedUsers = [], 
  usersWhoBlockedMe = [],
  highlightedProIds = [],
  highlightedEventIds = [],
  highlightedArticleIds = [],
  highlightedTestimoniesIds = [],
  allArticles = [],
  announcement,
  onContactAdmin
}: { 
  onNavigate: (view: View, params?: { eventId?: string, proId?: string, guideId?: string, searchQuery?: string, chat?: any }) => void, 
  allPros: Professional[], 
  events: Event[],
  onAddPro: () => void, 
  ads: Ad[], 
  onSelectAd: (ad: Ad) => void, 
  onSelectPost: (post: any) => void, 
  scrollToTop?: () => void,
  onProUpdate?: () => void,
  userProfile: Profile | null,
  currentUser?: any,
  unreadConversations?: string[],
  blockedUsers?: string[],
  usersWhoBlockedMe?: string[],
  highlightedProIds?: string[],
  highlightedEventIds?: string[],
  highlightedArticleIds?: string[],
  highlightedTestimoniesIds?: string[],
  allArticles?: any[],
  announcement?: {
    content: string;
    is_active: boolean;
    cta_text?: string;
    cta_type?: string;
  },
  onContactAdmin?: () => void
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [homeSearchError, setHomeSearchError] = useState('');

  const [sec1Idx, setSec1Idx] = useState(0);
  const [sec2Idx, setSec2Idx] = useState(0);
  const [sec3Idx, setSec3Idx] = useState(0);
  const [sec4Idx, setSec4Idx] = useState(0);

  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  const [discoverTestimonies, setDiscoverTestimonies] = useState<any[]>([]);
  useEffect(() => {
    const loadTestimonies = async () => {
      try {
        const data = await proService.getAllTestimonies();
        setDiscoverTestimonies(data || []);
      } catch (err) {
        console.warn('Could not fetch testimonies in HomeView:', err);
      }
    };
    loadTestimonies();
  }, [allPros]);
  
  return (
    <div className="px-6 pt-12 md:pt-20 pb-12 md:pb-24 xl:pb-6 space-y-12 md:space-y-20 lg:space-y-28 max-w-7xl mx-auto w-full overflow-hidden">

      {/* Welcome & Search Group */}
      <div className="space-y-0">
        {/* Welcome & Illustration Section */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-10 md:gap-16 pt-4 mb-0">
          <div className="space-y-6 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left max-w-xl pb-8 md:pb-10">
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] md:text-[30px] lg:text-[38px] font-semibold font-display text-brand-navy leading-tight">
                {currentUser ? (userProfile?.full_name ? `Hello ${userProfile.full_name.split(' ')[0]}, 👋` : 'Hello, 👋') : 'Hello Guest, 👋'}
              </h2>
              {unreadConversations.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => onNavigate('messages' as any)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 shadow-sm active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">
                    {unreadConversations.length} new
                  </span>
                </motion.button>
              )}
            </div>

            <div className="space-y-4 md:space-y-6">
              <h1 className="text-xl md:text-xl lg:text-2xl font-bold text-brand-navy leading-snug">
                Looking for trusted <br className="hidden md:block" /> local recommendations?
              </h1>
              <p className="text-slate-500 text-base md:text-base lg:text-lg leading-relaxed font-medium">
                From reliable pros to local events and visitor tips, you're in the right place.
              </p>
              <p className="text-brand-blue font-bold italic text-base md:text-base lg:text-lg transition-colors hover:text-brand-navy cursor-default">
                Discover better, belong faster.
              </p>
            </div>
          </div>

          <div className="w-full md:w-[50%] flex justify-center md:justify-start md:-translate-x-12 mb-0">
            <img 
              src="/people.png" 
              alt="Community illustration" 
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              className="w-full max-w-[300px] md:max-w-[480px] h-auto object-contain block align-bottom"
            />
          </div>
        </div>

        {/* Hero Search Card */}
        <div 
          onClick={() => onNavigate('explore')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('explore');
            }
          }}
          className="relative z-10 -mt-3 md:mt-0 overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#f8fafc] p-5 md:p-8 border border-blue-200/60 hover:border-blue-300/80 transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] group/card cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-base md:text-lg font-bold text-brand-navy tracking-tight">Looking for a trusted local pro?</h3>
                <p className="text-slate-500 text-[11px] md:text-[13px] font-medium leading-relaxed">
                  Search member recommendations or let <strong className="text-brand-blue font-semibold">Jane, your AI assistant</strong>, match you instantly.
                </p>
              </div>
            </div>

            <div 
              className="w-fit self-center sm:self-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-brand-blue group-hover/card:bg-[#0958d9] text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all"
            >
              <Search className="w-3.5 h-3.5 md:w-4 h-4 text-white shrink-0" />
              <span>Start searching</span>
            </div>
          </div>
        </div>

        {/* Hero Recommend Pro Card */}
        <div 
          onClick={onAddPro}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAddPro();
            }
          }}
          className="relative z-10 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#fffdf5] p-5 md:p-8 border border-amber-200/70 hover:border-amber-300/90 transition-all duration-300 hover:scale-[1.015] active:scale-[0.99] group/rec-card cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-base md:text-lg font-bold text-brand-navy tracking-tight">Know someone great?</h3>
                <p className="text-slate-600 text-[11px] md:text-[13px] font-medium leading-relaxed">
                  Recommend a pro and help other members find the best.
                </p>
              </div>
            </div>

            <div 
              className="w-fit self-center sm:self-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 md:px-8 md:py-3 bg-brand-yellow group-hover/rec-card:bg-amber-400 text-brand-navy rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 md:w-4 h-4 text-brand-navy shrink-0" />
              <span>Recommend a pro</span>
            </div>
          </div>
        </div>
      </div>


      {/* Why people love Unlocked Section */}
      <div className="hidden md:block space-y-8 md:space-y-12 py-4">
        <h3 className="font-semibold text-2xl font-display text-brand-navy flex items-center gap-2">
          <Heart className="w-6 h-6 text-brand-blue" />
          Why people love Unlocked
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-5xl mx-auto">
          {[
            {
              title: "Community powered",
              desc: "Real recommendations from real people like you.",
              icon: <Users className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />,
              bg: "bg-emerald-50/50",
              className: ""
            },
            {
              title: "Trust-based recommendations",
              desc: "Reviewed by members.",
              icon: <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />,
              bg: "bg-blue-50/50",
              className: ""
            },
            {
              title: "Local first",
              desc: "Focused on what matters in your city and neighborhood.",
              icon: <MapPin className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />,
              bg: "bg-amber-50/50",
              className: "col-span-2 justify-self-center w-[calc(50%-0.375rem)] md:col-span-1 md:w-full md:justify-self-stretch"
            }
          ].map((item, idx) => (
            <div key={idx} className={`bg-white p-4 md:p-8 lg:p-10 rounded-3xl border border-slate-100 flex flex-col items-center text-center space-y-3 md:space-y-5 shadow-sm hover:shadow-md transition-shadow ${item.className}`}>
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${item.bg} flex items-center justify-center`}>
                {item.icon}
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-base leading-tight">{item.title}</h4>
              <p className="text-[10px] md:text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>


      <div className="space-y-6 md:space-y-10">
        <div>
          <h3 className="font-semibold text-2xl md:text-3xl font-display text-brand-navy flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-blue" />
            Discover on Unlocked
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Card 1: Top Rated Pro / Testimonial */}
          {(() => {
            const dbHighlightedPros = allPros.filter(p => p.is_highlighted === true || (p.is_highlighted as any) === 'true' || (p.is_highlighted as any) === 1);
            const highlightedPros = dbHighlightedPros.length > 0 
              ? dbHighlightedPros 
              : allPros.filter(p => highlightedProIds.includes(String(p.id)));

            const approvedTestimonies = discoverTestimonies ? discoverTestimonies.filter(t => t.status === 'approved') : [];
            const dbHighlightedTestimonies = approvedTestimonies.filter(t => t.is_highlighted === true || t.is_highlighted === 'true' || t.is_highlighted === 1);
            const highlightedTestimonies = dbHighlightedTestimonies.length > 0 
              ? dbHighlightedTestimonies 
              : approvedTestimonies.filter(t => highlightedTestimoniesIds.includes(String(t.id)));

            const section1Items: { type: 'pro' | 'testimony'; data: any }[] = [];
            highlightedPros.forEach(p => {
              section1Items.push({ type: 'pro', data: p });
            });
            highlightedTestimonies.forEach(t => {
              section1Items.push({ type: 'testimony', data: t });
            });

            if (section1Items.length === 0) return null;

            const activeIndex = sec1Idx % section1Items.length;
            const currentItem = section1Items[activeIndex];

            // Determine details for rendering
            let proToShow = null;
            let ratingToShow = 5;
            let commentToShow = "Excellent communication in English, incredibly punctual, and provided perfect local help. Absolutely recommended!";
            let authorToShow = "Community Member";

            if (currentItem.type === 'testimony') {
              proToShow = allPros && allPros.find(p => String(p.id) === String(currentItem.data.pro_id));
              ratingToShow = currentItem.data.rating || 5;
              commentToShow = currentItem.data.comment || "";
              authorToShow = currentItem.data.author || "Anonymous";
            } else {
              proToShow = currentItem.data;
              const proTestimonies = approvedTestimonies.filter(t => String(t.pro_id) === String(proToShow.id));
              if (proTestimonies && proTestimonies.length > 0) {
                const latest = proTestimonies[0];
                ratingToShow = latest.rating || 5;
                commentToShow = latest.comment || "";
                authorToShow = latest.author || "Anonymous";
              } else {
                ratingToShow = proToShow.rating || 5;
                commentToShow = "Highly recommended professional with excellent track record on Unlocked!";
                authorToShow = "Community Member";
              }
            }

            if (!proToShow) return null;

            return (
              <div 
                className="flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-100 hover:border-amber-500/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full"
                id="discover-card-pro"
                onClick={() => setSelectedPro(proToShow)}
              >
                <div className="relative flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full flex flex-col items-center justify-center text-center"
                    >
                      <div className="flex items-center justify-between gap-2 mb-4">
                        {currentItem.type !== 'testimony' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest shrink-0">
                            <Star className="w-3 h-3 fill-current" /> Meet a local Pro
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col h-full">
                        {currentItem.type === 'testimony' ? (
                          <div className="space-y-4 flex flex-col h-full items-center justify-center">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={proToShow.image || "/people.png"} 
                                alt={proToShow.name} 
                                className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-50"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors max-w-[150px] truncate leading-tight uppercase tracking-tight text-[11px]">{proToShow.name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{proToShow.category}</p>
                              </div>
                            </div>

                            <div className="relative bg-amber-50/50 p-5 rounded-3xl border border-brand-yellow/20">
                              <p className="text-[12px] text-slate-700 leading-relaxed font-medium italic">
                                "{commentToShow}"
                              </p>
                              <div className="mt-3 flex items-center justify-end gap-2">
                                <div className="h-[1px] w-4 bg-amber-200" />
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight">
                                  {formatName(authorToShow)}
                                </span>
                              </div>
                              {/* Decorative bubble tail */}
                              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-amber-50/50 border-r border-b border-brand-yellow/20 rotate-45" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-4 flex-1 items-center justify-center h-full">
                            <div className="flex items-center gap-4">
                              <img 
                                src={proToShow.image || "/people.png"} 
                                alt={proToShow.name} 
                                className="w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-3xl object-cover shadow-sm ring-4 ring-slate-50 group-hover:scale-105 transition-all duration-300"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="space-y-1 text-center">
                              <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors text-base leading-tight">{proToShow.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{proToShow.category}</p>
                              {proToShow.top_qualities && proToShow.top_qualities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1.5 justify-center">
                                  {proToShow.top_qualities.map((quality: string) => {
                                    const cfg = getQualityConfig(quality);
                                    const QualityIcon = cfg.icon;
                                    return (
                                      <span 
                                        key={quality} 
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border ${cfg.color} shrink-0`}
                                      >
                                        <QualityIcon className={`w-3 h-3 ${cfg.iconColor} shrink-0`} />
                                        {quality}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {((proToShow.review_count && proToShow.review_count > 0) || approvedTestimonies.some(t => String(t.pro_id) === String(proToShow.id))) ? (
                                <div className="flex items-center gap-1 pt-1 justify-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-3.5 h-3.5 ${i < Math.floor(ratingToShow) ? 'text-brand-yellow fill-current' : 'text-slate-200'}`} 
                                    />
                                  ))}
                                  <span className="text-[10px] text-slate-400 font-extrabold ml-1">({ratingToShow})</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>




                {section1Items.length >= 2 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec1Idx((activeIndex - 1 + section1Items.length) % section1Items.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-amber-600 hover:border-amber-100 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec1Idx((activeIndex + 1) % section1Items.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-amber-600 hover:border-amber-100 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Card 2: Event Highlight */}
          {(() => {
            const dbHighlightedEvents = events.filter(e => e.is_highlighted === true || (e.is_highlighted as any) === 'true' || (e.is_highlighted as any) === 1);
            const section2Items = dbHighlightedEvents.length > 0 
              ? dbHighlightedEvents 
              : events.filter(e => highlightedEventIds.includes(String(e.id)));
            if (section2Items.length === 0) return null;

            const activeIndex = sec2Idx % section2Items.length;
            const featuredEvent = section2Items[activeIndex];
            
            return (
              <div 
                className="flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-100 hover:border-brand-blue/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full"
                id="discover-card-event"
                onClick={() => setSelectedEvent(featuredEvent)}
              >
                <div className="relative flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-brand-blue/5 text-brand-blue border border-brand-blue/10 uppercase tracking-widest shrink-0">
                          <Calendar className="w-3 h-3" /> Event Highlights
                        </span>
                      </div>

                      <div className="space-y-3 text-left">
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 relative">
                          <img 
                            src={featuredEvent.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80"} 
                            alt={featuredEvent.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-brand-blue transition-colors text-[13px] leading-snug">{featuredEvent.title}</h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-bold">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {featuredEvent.start_date || featuredEvent.date}
                              {featuredEvent.end_date && ` to ${featuredEvent.end_date}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>




                {section2Items.length >= 2 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec2Idx((activeIndex - 1 + section2Items.length) % section2Items.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-brand-blue hover:border-brand-blue/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec2Idx((activeIndex + 1) % section2Items.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-brand-blue hover:border-brand-blue/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Card 3: Guide Highlight */}
          {(() => {
            const dbHighlightedArticles = allArticles.filter(art => (art.is_highlighted === true || (art.is_highlighted as any) === 'true' || (art.is_highlighted as any) === 1) && art.isOnline !== false);
            
            // Filter online articles and sort stably by id
            const onlineArticles = allArticles.filter(art => art.isOnline !== false).sort((a, b) => String(a.id).localeCompare(String(b.id)));
            
            let section3Items = [];
            if (dbHighlightedArticles.length > 0) {
              section3Items = dbHighlightedArticles;
            } else if (onlineArticles.length > 0) {
              const now = new Date();
              const oneJan = new Date(now.getFullYear(), 0, 1);
              const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
              const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7) + now.getFullYear() * 52;
              const weeklyIndex = weekNumber % onlineArticles.length;
              section3Items = [onlineArticles[weeklyIndex]];
            } else {
              section3Items = allArticles.filter(art => highlightedArticleIds.includes(String(art.id)) && art.isOnline !== false);
            }

            if (section3Items.length === 0) return null;

            const activeIndex = sec3Idx % section3Items.length;
            const featuredArticle = section3Items[activeIndex];

            return (
              <div 
                className="flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-100 hover:border-[#00C2A8]/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full"
                id="discover-card-guide"
                onClick={() => setSelectedArticle(featuredArticle)}
              >
                <div className="relative flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#00C2A8]/10 text-[#00C2A8] border border-[#00C2A8]/20 uppercase tracking-widest shrink-0">
                          <BookOpen className="w-3 h-3" /> Tips of the week
                        </span>
                      </div>
                      
                      <div className="space-y-3 text-left">
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 relative">
                          <img 
                            src={featuredArticle.imageUrl || "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80"} 
                            alt={featuredArticle.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-[#00C2A8] transition-colors text-[13px] leading-snug line-clamp-1">{featuredArticle.title}</h4>
                          <p className="text-[10px] text-slate-500 leading-snug font-bold line-clamp-2 mt-1">{featuredArticle.excerpt}</p>
                          {featuredArticle.author?.name && (
                            <div className="flex items-center gap-1.5 text-[10px] text-[#00C2A8] mt-2 font-bold uppercase tracking-wider">
                              <User className="w-3.5 h-3.5 text-[#00C2A8]/80 shrink-0" />
                              <span className="truncate">By {featuredArticle.author.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>




                {section3Items.length >= 2 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec3Idx((activeIndex - 1 + section3Items.length) % section3Items.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-[#00C2A8] hover:border-[#00C2A8]/20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSec3Idx((activeIndex + 1) % section3Items.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/60 backdrop-blur shadow text-slate-400 hover:text-[#00C2A8] hover:border-[#00C2A8]/20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Card 4: How to Add a Pro */}
          <div 
            onClick={onAddPro}
            className="flex flex-col justify-between p-6 rounded-3xl bg-white border border-slate-100 hover:border-brand-yellow/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            id="discover-card-addpro"
          >
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-brand-yellow text-slate-900 uppercase tracking-widest shadow-sm shadow-brand-yellow/10 select-none">
                <Plus className="w-3.5 h-3.5 text-slate-900" style={{ strokeWidth: 3 }} /> How to add a pro
              </span>
              
              <div className="space-y-3.5 text-xs text-slate-500">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/20 text-amber-700 flex items-center justify-center font-black text-[10px] mt-0.5 select-none shrink-0 border border-brand-yellow/30">1</div>
                  <div className="leading-tight flex-1" style={{ textAlign: 'left' }}>
                    <p className="text-slate-600 font-medium">Click the button <strong className="text-slate-800 font-semibold">Recommend a pro</strong> on the home page.</p>
                    <div className="mt-3 flex items-center justify-start">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-navy rounded-xl font-bold text-[10px] shadow-sm select-none">
                        <UserPlus className="w-3.5 h-3.5 text-brand-navy shrink-0" />
                        <span>Recommend a pro</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/20 text-amber-700 flex items-center justify-center font-black text-[10px] mt-0.5 select-none shrink-0 border border-brand-yellow/30">2</div>
                  <p className="leading-tight" style={{ textAlign: 'left' }}>
                    <strong className="text-slate-700">Validation</strong>: Our team validates directly with the pro to approve their profile on MyCityUnlocked.
                  </p>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/20 text-amber-700 flex items-center justify-center font-black text-[10px] mt-0.5 select-none shrink-0 border border-brand-yellow/30">3</div>
                  <p className="leading-tight" style={{ textAlign: 'left' }}><strong className="text-slate-700">Go Live</strong>: Profile instantly joins the live platform!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modals on HomeView */}
      <AnimatePresence>
        {selectedPro && (
          <ProfessionalDetailView
            pro={selectedPro}
            onClose={() => setSelectedPro(null)}
            onNavigate={onNavigate}
            onProUpdate={onProUpdate}
            currentUser={currentUser}
            userProfile={userProfile}
            blockedUsers={blockedUsers}
            usersWhoBlockedMe={usersWhoBlockedMe}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>

      <ExpertGuideModal
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
      />
    </div>
  );
}

function ExpertGuideModal({ isOpen, onClose, article: rawArticle }: { isOpen: boolean, onClose: () => void, article: any }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shared, setShared] = useState(false);

  // Reset scroll state when article changes or when closed/opened
  useEffect(() => {
    if (isOpen) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, rawArticle]);

  const article = rawArticle || {};

  const imageSrc = article.imageUrl || "/valencia.jpg";
  const categoryName = article.categoryTitle || "Valencia Guide";
  const authorName = article.author?.name;
  const businessName = article.author?.businessName || article.businessName;
  const hasAuthorDetails = !!(article.author && (
    article.author.name?.trim() ||
    article.author.role?.trim() ||
    article.author.businessName?.trim() ||
    article.author.business_name?.trim() ||
    article.author.website?.trim() ||
    article.author.email?.trim() ||
    article.author.phone?.trim()
  ));

  return (
    <AnimatePresence>
      {isOpen && rawArticle && (
        <div className="fixed inset-x-0 bottom-[80px] md:inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 lg:p-8" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))' }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[85vh] rounded-[24px] md:rounded-[40px] shadow-2xl relative flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
          {/* Header Image Section - Compact, Stable, and High Contrast */}
          <div className="relative h-[200px] flex-shrink-0 overflow-hidden bg-brand-navy group">
            <img 
              src={imageSrc} 
              alt={article.title} 
              className="w-full h-full object-cover absolute inset-0" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
            
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}${window.location.pathname}?guideId=${article.id}`;
                  const shareData = {
                    title: article.title,
                    text: article.excerpt || `Check out this practical guide on Unlocked Valencia: ${article.title}!`,
                    url: shareUrl
                  };
                  
                  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    try {
                      await navigator.share(shareData);
                    } catch (err) {
                      console.warn('Share sheets failed or cancelled:', err);
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setShared(true);
                      setTimeout(() => setShared(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy share link:', err);
                    }
                  }
                }}
                className={`p-2 backdrop-blur-md rounded-full text-white transition-all shadow-lg active:scale-95 z-20 ${
                  shared 
                    ? "bg-emerald-500 hover:bg-emerald-600 scale-105" 
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {shared ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <ShareIcon className="w-5 h-5" />
                )}
              </button>

              <button 
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg active:scale-95 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6 pointer-events-none md:bottom-8 md:left-8 md:right-8">
              <div className="flex items-center gap-2 mb-2">
                {categoryName && (
                  <span className="px-2.5 py-0.5 bg-brand-yellow text-slate-955 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-yellow/20">
                    {categoryName}
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white font-display leading-tight drop-shadow-2xl">
                {article.title}
              </h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div 
            ref={scrollContainerRef}
            className="flex-grow overflow-y-auto p-8 md:p-12 scroll-smooth"
          >
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Excerpt with our custom Unlocked attribution right below it */}
              <div className="text-left pb-4 border-b border-slate-100">
                {article.excerpt && (
                  <p className="text-slate-600 italic text-base leading-relaxed mb-2.5">
                    {article.excerpt}
                  </p>
                )}
                <p className="text-xs text-brand-blue font-bold uppercase tracking-wider">
                  by {article.author?.name || (typeof article.author === 'string' ? article.author : null) || 'MyCityUnlocked'}
                </p>
              </div>



              {/* Guide Content - Simple and highly readable text */}
              <div className="markdown-body">
                <SimpleMarkdown>{article.content}</SimpleMarkdown>
              </div>

              {/* Bottom Contact Section / Author Details */}
              {hasAuthorDetails && (
                <div className="mt-12 p-8 bg-slate-50 border border-slate-100/80 rounded-[24px] relative overflow-hidden group shadow-sm text-left">
                  <div className="relative z-10 space-y-4">
                    <div>
                      <div className="space-y-1">
                        {article.author?.name && (
                          <h4 className="text-lg font-black text-slate-900 font-display leading-snug">
                            {article.author.name}
                          </h4>
                        )}
                        {(article.author?.role || article.author?.businessName || article.author?.business_name) && (
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            {article.author?.role && <span>{article.author.role}</span>}
                            {article.author?.role && (article.author?.businessName || article.author?.business_name) && <span className="mx-2 text-slate-300">•</span>}
                            {(article.author?.businessName || article.author?.business_name) && (
                              <span className="font-extrabold text-brand-navy">
                                {article.author.businessName || article.author.business_name}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {(article.author?.phone || article.author?.email || article.author?.website) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        {article.author?.phone && (
                          <a href={`tel:${article.author.phone}`} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:bg-slate-50/50 transition-all group/call">
                            <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow group-hover/call:scale-110 transition-transform shrink-0">
                              <Phone className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">Phone</p>
                              <p className="text-xs font-bold text-slate-800 truncate">{article.author.phone}</p>
                            </div>
                          </a>
                        )}
                        
                        {article.author?.email && (
                          <a href={`mailto:${article.author.email}`} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:bg-slate-50/50 transition-all group/mail min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover/mail:scale-110 transition-transform shrink-0">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">Email</p>
                              <p className="text-xs font-bold text-slate-800 break-all">{article.author.email}</p>
                            </div>
                          </a>
                        )}

                        {article.author?.website && (
                          <a 
                            href={article.author.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:bg-slate-50/50 transition-all group/web sm:col-span-2 min-w-0"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#00C2A8]/10 flex items-center justify-center text-[#00C2A8] group-hover/web:scale-110 transition-transform shrink-0">
                              <Globe className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">Website</p>
                              <p className="text-xs font-bold text-brand-blue hover:underline break-all">{article.author.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

function ExpertGuidesPartners({ onReadFullGuide }: { onReadFullGuide: () => void }) {
  const featuredGuide = {
    title: "How to choose the best neighborhood in Valencia",
    partner: "Engel & Völkers Valencia",
    author: "Marina Sanchis",
    avatar: null,
    excerpt: "From the bohemian streets of Ruzafa to the family-friendly avenues of Algiros, every district tells a different story. Discover which one matches your lifestyle and investment goals.",
    brandImage: null,
    contact: {
      phone: "+34 963 51 02 00",
      email: "valencia@engelvoelkers.com"
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-4">
      <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all group flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row flex-1">
          {/* Visual Side */}
          <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden bg-brand-blue/5 flex items-center justify-center">
            {featuredGuide.brandImage ? (
              <img src={featuredGuide.brandImage} alt="Valencia neighborhoods" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <MapPin className="w-12 h-12 text-brand-blue/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r" />
            <div className="absolute top-4 left-4 bg-brand-yellow text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-lg">
              Featured Expert
            </div>
          </div>

          {/* Content Side */}
          <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-yellow/20 flex items-center justify-center bg-slate-50">
                  {featuredGuide.avatar ? (
                    <img src={featuredGuide.avatar} alt={featuredGuide.author} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-none">{featuredGuide.partner}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">By {featuredGuide.author}</p>
                </div>
              </div>
              
              <h2 className="text-xl md:text-2xl font-black font-display text-brand-navy mb-3 group-hover:text-brand-blue transition-colors leading-tight">
                {featuredGuide.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 md:line-clamp-none">
                {featuredGuide.excerpt}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Contact Expert</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-brand-yellow" />
                    {featuredGuide.contact.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-brand-yellow" />
                    {featuredGuide.contact.email}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={onReadFullGuide}
                  className="bg-brand-navy text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue transition-all shadow-lg active:scale-95"
                >
                  Read Full Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightCarousel({ onNavigate, allPros, events }: { onNavigate: (view: View, params?: { eventId?: string, proId?: string, guideId?: string, chat?: any }) => void, allPros: Professional[], events: Event[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const featuredPro = allPros.length > 0 ? allPros[0] : null;
  const featuredEvent = events.length > 0 ? events[0] : null;

  const slidesRaw = [
    featuredEvent ? {
      type: 'event',
      title: featuredEvent.title,
      location: featuredEvent.location,
      image: featuredEvent.image,
      tag: 'Event of the week',
      date: {
        day: featuredEvent.start_date ? featuredEvent.start_date.split('-')[1] : featuredEvent.date.split(' ')[0], // Simple heuristic
        num: featuredEvent.start_date ? featuredEvent.start_date.split('-')[2] : featuredEvent.date.split(' ')[1]
      },
      action: () => onNavigate('events', { eventId: featuredEvent.id })
    } : null,
    featuredPro ? {
      type: 'pro',
      pro: featuredPro,
      action: () => onNavigate('explore', { proId: featuredPro.id })
    } : null
  ];

  const slides = slidesRaw.filter(Boolean) as any[];
  const totalSlides = slides.length;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);

  if (totalSlides === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[32px] no-swipe flex-1 flex flex-col">
      <motion.div 
        className="flex h-full"
        animate={{ x: `-${currentIndex * 100}%` }}
        transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="min-w-full px-1 h-full">
            {slide.type === 'event' && (
              <div 
                className="card bg-white overflow-hidden cursor-pointer h-full border border-slate-100/50 shadow-sm flex flex-col"
                onClick={slide.action}
              >
                <div className="h-32 overflow-hidden relative">
                  <img src={slide.image} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-lg text-center shadow-sm">
                    <p className="text-[8px] font-bold text-brand-blue uppercase">{slide.date?.day}</p>
                    <p className="text-sm font-bold leading-none">{slide.date?.num}</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-brand-blue text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {slide.tag}
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">{slide.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {slide.location}
                  </p>
                </div>
              </div>
            )}

            {slide.type === 'pro' && slide.pro && (
              <div 
                className="card bg-gradient-to-br from-brand-blue/5 to-transparent overflow-hidden cursor-pointer h-full border border-brand-blue/10 shadow-sm relative flex flex-col justify-center items-center text-center p-5"
                onClick={slide.action}
              >
                <div className="absolute top-3 right-3 bg-brand-blue text-white p-1.5 rounded-full shadow-lg">
                  <Trophy className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2">Pro of the week</p>
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-3 flex items-center justify-center bg-white/50">
                  {slide.pro.image ? (
                    <img src={slide.pro.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-brand-blue/30" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-slate-900">{slide.pro.name}</h4>
                  {slide.pro.company_name && (
                    <p className="text-xs text-slate-500 font-medium italic">{slide.pro.company_name}</p>
                  )}
                  <p className="text-xs text-brand-blue font-medium">{slide.pro.category}</p>
                </div>
              </div>
            )}

            {slide.type === 'tip' && (
              <div 
                className="card bg-white overflow-hidden cursor-pointer h-full border border-slate-100/50 shadow-sm flex flex-col"
                onClick={slide.action}
              >
                <div className="h-24 bg-brand-blue/10 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-blue/20 rounded-full blur-2xl" />
                  <Lightbulb className="w-10 h-10 text-brand-blue relative z-10" />
                  <div className="absolute top-3 right-3 bg-brand-blue text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {slide.tag}
                  </div>
                </div>
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{slide.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{slide.excerpt}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Guides</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Navigation Arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg text-slate-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "h-1 transition-all duration-300 rounded-full",
              currentIndex === i ? "w-4 bg-brand-blue" : "w-1 bg-slate-300"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MapCenterController({ center, resetTrigger }: { center: { lat: number; lng: number }; resetTrigger?: number }) {
  const map = useMap();
  const lastCenteredRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastResetRef = useRef<number>(0);

  useEffect(() => {
    if (!map) return;
    const hasCoordsChanged = !lastCenteredRef.current || 
      Math.abs(lastCenteredRef.current.lat - center.lat) > 0.0001 || 
      Math.abs(lastCenteredRef.current.lng - center.lng) > 0.0001;
    
    const hasTriggered = resetTrigger !== undefined && resetTrigger !== lastResetRef.current;

    if (hasCoordsChanged || hasTriggered) {
      lastCenteredRef.current = center;
      if (resetTrigger !== undefined) {
        lastResetRef.current = resetTrigger;
      }
      map.panTo(center);
    }
  }, [map, center, resetTrigger]);

  return null;
}

function ProMap({ pros, onSelectPro, center, resetTrigger }: { pros: Professional[], onSelectPro: (pro: Professional) => void, center: { lat: number, lng: number }, resetTrigger?: number }) {
  const hasValidKey = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY.length > 10;

  if (!hasValidKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-8 text-center rounded-[32px] border border-slate-100">
        <div className="max-w-md space-y-6">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-brand-blue" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-brand-navy">Interactive Map Locked</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enable the professional directory map by adding your <strong>Google Maps Platform API Key</strong> as a secret.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-left space-y-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Setup</p>
            <ol className="text-[10px] text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Open <strong>Settings</strong> → <strong>Secrets</strong></li>
              <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="e8677c77d4677732"
          className="w-full h-full"
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          scrollwheel={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <MapCenterController center={center} resetTrigger={resetTrigger} />
          {pros.map((pro, index) => pro.coordinates && (
            <AdvancedMarker
              key={pro.id}
              position={pro.coordinates}
              onClick={() => {
                console.log('Marker clicked:', pro.name);
                onSelectPro(pro);
              }}
              title={pro.name}
            >
              <div 
                className="relative group/pin cursor-pointer"
                onClick={(e) => {
                  // Fallback for mobile if AdvancedMarker onClick is flaky
                  e.stopPropagation();
                  onSelectPro(pro);
                }}
              >
                <Pin 
                  background={'#0038FF'} 
                  borderColor={'#fff'} 
                  glyphColor={'#fff'}
                  glyph={(index + 1).toString()}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white rounded-lg shadow-xl border border-slate-100 whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none z-50">
                  <p className="text-[10px] font-bold text-brand-navy">{pro.name}</p>
                  {pro.company_name && (
                    <p className="text-[9px] text-slate-600 font-medium italic">{pro.company_name}</p>
                  )}
                  <p className="text-[8px] text-slate-400 font-medium whitespace-nowrap mt-0.5">Touch to see details</p>
                </div>
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

function ExploreView({ allPros, onNavigate, initialProId, initialSearch, onModalClose, scrollToTop, onProUpdate, currentUser, userProfile, blockedUsers = [], usersWhoBlockedMe = [], isActive = false }: { 
  allPros: Professional[], 
  onNavigate: (view: View, params?: { eventId?: string, proId?: string, guideId?: string, searchQuery?: string, chat?: any }) => void, 
  initialProId?: string | null, 
  initialSearch?: string | null,
  onModalClose?: () => void, 
  scrollToTop?: () => void,
  onProUpdate?: () => void,
  currentUser?: any,
  userProfile?: any,
  blockedUsers?: string[],
  usersWhoBlockedMe?: string[],
  isActive?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(initialSearch || '');
  const [deferredSearch, setDeferredSearch] = useState(initialSearch || '');
  const [isSearching, setIsSearching] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    scrollToTop?.();
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    if (isActive) {
      setTimeout(() => {
        const mc = document.querySelector('main');
        if (mc) {
          mc.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
        }
      }, 50);
    }
  }, [isActive]);

  useEffect(() => {
    scrollToTop?.();
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, []);

  // AI-powered Search states
  const [aiResults, setAiResults] = useState<{ [key: string]: { score: number; reason: string } } | null>(null);
  const [aiExactMatch, setAiExactMatch] = useState<boolean>(true);
  const [aiSummaryMessage, setAiSummaryMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('ai');

  useEffect(() => {
    // If the input gets cleared, instantly reset all AI search filters
    if (search.trim() === '') {
      setDeferredSearch('');
      setAiResults(null);
      setAiExactMatch(true);
      setAiSummaryMessage(null);
      setAiError(null);
      setAiQuery('');
    }
  }, [search]);

  useEffect(() => {
   if (searchMode === 'standard') {
     setAiResults(null);
     setAiError(null);
   } else if (searchMode === 'ai') {
     setSelectedCategory('All');
     setSelectedLanguage('All');
     setMinRating(0);
     setMaxDistance('All');
   }
  }, [searchMode]);

  // Hook up handleSearchSubmit to perform an intelligent AI matching process
  const handleSearchSubmit = async () => {
    const trimmed = search.trim();
    if (!trimmed) {
      setAiResults(null);
      setAiExactMatch(true);
      setAiSummaryMessage(null);
      setDeferredSearch('');
      setAiQuery('');
      setAiError(null);
      return;
    }

    setIsInputFocused(false);
    
    setIsSearching(true);
    setAiLoading(true);
    setAiError(null);
    setAiQuery(trimmed);
    setDeferredSearch(trimmed);

    try {
      let data = null;
      let serverFailed = false;

      try {
        const response = await fetch("/api/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, professionals: allPros }),
        });
        
        if (response.status === 404 || response.status === 405) {
          serverFailed = true;
        } else if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Jane is very busy right now! Please wait a few seconds and try again, or use the category list in filters to find the pro you need.");
          }
          try {
            const errJson = await response.json();
            if (errJson && errJson.error) {
              throw new Error(errJson.error);
            }
          } catch (e: any) {
            if (e.message && (e.message.includes("Jane is very busy") || e.message.includes("Jane est très sollicitée"))) {
              throw e;
            }
          }
          throw new Error("Sorry, an error occurred during AI search.");
        } else {
          data = await response.json();
        }
      } catch (fetchErr) {
        console.warn("[Search] Server search failed or is unavailable, attempting client fallback:", fetchErr);
        serverFailed = true;
      }

      if (serverFailed) {
        // Fallback to client-side search using the client-side API key
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
        if (!apiKey) {
          throw new Error("The server AI search service is busy or unavailable (Error 404). To use client-side AI search (e.g., on Vercel), please configure the VITE_GEMINI_API_KEY environment variable in your Vercel project settings.");
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const proListBrief = allPros.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          company_name: p.company_name || "",
          category: p.category || p.profession || "",
          categories: p.categories || [],
          bio: p.bio || p.description || "",
          top_qualities: p.top_qualities || [],
          languages: p.languages || [],
          rating: p.rating || 0,
          location: p.location || ""
        }));

        const sysInstruction = `You are an expert matching AI assistant for "Unlocked" - a premier community-curated directory of recommended local professionals.
Your purpose is to examine the user's natural language request and return the most relevant matching professionals.

Review the list of professionals provided and evaluate BOTH trade/service criteria AND location criteria:

1. QUERY PARSING & SYNONYMS (CRITICAL):
   - Trade / Profession Synonyms & Translations:
     * "hair dresser", "hairdresser", "hair stylist", "coiffeur", "peluquero", "hair salon", "barber" ALL match "Hairdresser", "Coiffeur", "Beauty & Wellness", or hair care services.
     * "doctor", "physician", "médecin", "gp" ALL match Doctor/Medical services.
     * "realtor", "real estate agent", "inmobiliaria" ALL match Real Estate / Property services.
     * "plumber", "plombier", "fontanero" ALL match Plumbing services.
     * Treat language translations (English, French, Spanish) and word variations (e.g., "hair dresser" vs "hairdresser") as EXACT trade matches!
   - Location Matching:
     * "Valencia area", "in Valencia", "around Valencia", "Valencia city" matches professionals located in Valencia or Valencia metropolitan/province towns (e.g. Valencia, La Eliana, Torrent, Paterna, etc.).

2. SCORING & MATCHING RULES:
   - DIRECT MATCH (Score 70-100): The professional matches BOTH requested trade/service (including synonyms/translations) AND requested location/area (or if no location was specified).
     * Example: "hair dresser in valencia area" + hairdresser in Valencia => DIRECT MATCH (Score 80-100).
   - ADJACENT / ALTERNATIVE MATCH (Score 15-45): The professional offers a closely related trade (e.g. general beauty salon for a hairdresser request), OR matches the trade in a neighboring distant town.
   - UNRELATED OR WRONG LOCATION (Score 0): The professional has a completely unrelated trade OR is in a totally different distant city/country when a specific city was requested.

3. "exactMatchFound" & "summaryMessage" RULES:
   - CRITICAL: If AT LEAST ONE professional is a DIRECT MATCH (score >= 60), you MUST set "exactMatchFound" to true, and set "summaryMessage" to null!
   - Set "exactMatchFound" to false ONLY if NO professional in the directory directly matches both trade and location.
   - If "exactMatchFound" is false:
     * If there ARE alternative/adjacent professionals returned with score > 0:
       - With specific trade and location (e.g. "plumber in La Eliana"): "We couldn't find a [trade] in [location] in our directory. Jane found some alternative options, but they may not meet all your criteria."
       - Without specific location: "We couldn't find an exact match for '[user request]' in our directory. Jane found some alternative options, but they may not meet all your criteria."
     * If NO professionals match at all (all professionals have score 0):
       - With specific trade and location: "We couldn't find a [trade] in [location] in our directory."
       - Without specific location: "We couldn't find an exact match for '[user request]' in our directory."

4. Under "reasonUrlExcerpt" for each professional with score > 0, write a single concise sentence in ENGLISH clarifying why they matched (mentioning their trade and location).`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `User Query: "${trimmed}"

Professionals:
${JSON.stringify(proListBrief, null, 2)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                exactMatchFound: { type: Type.BOOLEAN, description: "True if direct match found for requested trade/service, false if not." },
                summaryMessage: { type: Type.STRING, description: "Explanation message when no direct match is found, written in user's query language." },
                results: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "The professional's ID as a string" },
                      score: { type: Type.INTEGER, description: "The relevancy match score from 0 to 100" },
                      reasonUrlExcerpt: { type: Type.STRING, description: "Explanation of match or recommendation" }
                    },
                    required: ["id", "score", "reasonUrlExcerpt"]
                  }
                }
              },
              required: ["exactMatchFound", "results"]
            },
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL
            },
            temperature: 0.1
          }
        });

        const parsedContent = JSON.parse(response.text || "{}");
        data = parsedContent;
      }

      if (!data) {
        throw new Error("Could not retrieve search results.");
      }
      
      let exactMatch = true;
      let summaryMsg: string | null = null;

      if (typeof data.exactMatchFound === 'boolean') {
        exactMatch = data.exactMatchFound;
      }
      if (typeof data.summaryMessage === 'string' && data.summaryMessage.trim()) {
        summaryMsg = data.summaryMessage.trim();
      }

      const resultsDict: { [key: string]: { score: number; reason: string } } = {};
      const rawResults = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      let highestScore = 0;

      rawResults.forEach((item: any) => {
        const sc = typeof item.score === 'number' ? item.score : 0;
        if (sc > highestScore) highestScore = sc;
        resultsDict[String(item.id)] = {
          score: sc,
          reason: item.reasonUrlExcerpt || item.reason || ''
        };
      });

      if (rawResults.length === 0 || highestScore < 30) {
        exactMatch = false;
      }

      setAiResults(resultsDict);
      setAiExactMatch(exactMatch);
      setAiSummaryMessage(summaryMsg);
    } catch (err: any) {
      console.error("[Search] AI matching error:", err);
      const errMsg = err.message || "";
      const errorLower = errMsg.toLowerCase();
      if (
        errorLower.includes("quota") || 
        errorLower.includes("limit") || 
        errorLower.includes("exhausted") || 
        errorLower.includes("429") || 
        errorLower.includes("too many requests") ||
        errorLower.includes("sollicitée") ||
        errorLower.includes("busy") ||
        errorLower.includes("rate limit")
      ) {
        setAiError("Jane is very busy right now! Please wait a few seconds and try again, or use the category list in filters to find the pro you need.");
      } else {
        setAiError(err.message || "Connection error with the AI service.");
      }
      // Fallback: clear AI results
      setAiResults(null);
      setAiExactMatch(true);
      setAiSummaryMessage(null);
    } finally {
      setAiLoading(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Auto focus on mount - faster
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Secure auto-scrolling to results once Jane has finished sorting and rendering the list
  useEffect(() => {
    if (aiResults && !aiLoading) {
      scrollToResults();
    }
  }, [aiResults, aiLoading]);

  useEffect(() => {
    if (initialSearch !== null && initialSearch !== undefined) {
      setSearch(initialSearch);
      setDeferredSearch(initialSearch);
    }
  }, [initialSearch]);


  const [selectedCategory, setSelectedCategory] = useState('All');

  const scrollToResults = () => {
    setTimeout(() => {
      const mainContainer = document.querySelector('main');
      const aiBannerEl = document.getElementById('ai-search-banner');
      const resultsEl = aiBannerEl || document.getElementById('pro-cards-list') || document.getElementById('results-section');
      if (mainContainer && resultsEl) {
        const containerRect = mainContainer.getBoundingClientRect();
        const targetRect = resultsEl.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + mainContainer.scrollTop;
        mainContainer.scrollTo({
          top: Math.max(0, offset - 90),
          behavior: "smooth"
        });
      } else if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };


  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(() => {
    if (initialProId && allPros && allPros.length > 0) {
      return allPros.find(p => String(p.id) === String(initialProId)) || null;
    }
    return null;
  });

  // Sync selectedPro with freshly fetched allPros to show updated ratings/counts in modal
  useEffect(() => {
    if (selectedPro) {
      const updated = allPros.find(p => p.id === selectedPro.id);
      if (updated) {
        setSelectedPro(updated);
      }
    }
  }, [allPros]);

  const allProfessions = useMemo(() => {
    const list = new Set<string>();
    (allPros || []).forEach(p => {
      if (!p) return;
      if (p.categories && Array.isArray(p.categories)) {
        p.categories.forEach(c => {
          if (c && typeof c === 'string') list.add(c);
        });
      } else if (p.category && typeof p.category === 'string') {
        list.add(p.category);
      }
    });
    return Array.from(list).sort();
  }, [allPros]);

  const matchingCategories = useMemo(() => {
    if (!search || typeof search !== 'string' || !search.trim() || searchMode !== 'standard') return [];
    const query = search.trim().toLowerCase();
    return allProfessions.filter(cat => typeof cat === 'string' && cat.toLowerCase().includes(query));
  }, [allProfessions, search, searchMode]);

  const scrollToPro = (pro: Professional) => {
    const element = document.getElementById(`pro-card-${pro.id}`);
    const mainContainer = document.querySelector('main');
    if (element && mainContainer) {
      const containerRect = mainContainer.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + mainContainer.scrollTop;
      
      const targetScrollTop = offset - (containerRect.height / 2) + (targetRect.height / 2);
      mainContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
      window.scrollTo(0, 0);

      // Add a temporary highlight effect
      element.classList.add('ring-4', 'ring-brand-blue/40', 'scale-[1.02]', 'z-20');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-brand-blue/40', 'scale-[1.02]', 'z-20');
      }, 2000);
    }
  };

  useEffect(() => {
    if (initialProId) {
      const pro = allPros.find(p => String(p.id) === String(initialProId));
      if (pro && (!selectedPro || String(selectedPro.id) !== String(pro.id))) {
        setSelectedPro(pro);
      }
    }
  }, [initialProId, allPros, selectedPro]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('unlocked_user_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [mapCenterTrigger, setMapCenterTrigger] = useState(0);
  const [hasRealLocation, setHasRealLocation] = useState(() => {
    return localStorage.getItem('unlocked_has_real_location') === 'true';
  });
  const [showLocationBanner, setShowLocationBanner] = useState(() => {
    return localStorage.getItem('unlocked_show_location_banner') !== 'false';
  });
  const [maxDistance, setMaxDistance] = useState<number | 'All'>(() => {
    const saved = localStorage.getItem('unlocked_max_distance');
    if (saved === 'All' || !saved) return 'All';
    const num = parseFloat(saved);
    return isNaN(num) ? 'All' : num;
  });

  const distanceSteps: (number | 'All')[] = [0.5, 2, 5, 10, 20, 50, 'All'];

  useEffect(() => {
    if (!hasRealLocation) {
      setMaxDistance('All');
    }
  }, [hasRealLocation]);

  const requestGeolocation = (onSuccess?: (coords: { lat: number, lng: number }) => void) => {
    if (!hasRealLocation) {
        setShowLocationBanner(true);
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          setHasRealLocation(true);
          setShowLocationBanner(false);
          setMapCenterTrigger((prev) => prev + 1);
          try {
            localStorage.setItem('unlocked_user_location', JSON.stringify(loc));
            localStorage.setItem('unlocked_has_real_location', 'true');
            localStorage.setItem('unlocked_show_location_banner', 'false');
          } catch (e) {
            console.error(e);
          }
          onSuccess?.(loc);
        },
        () => {
          // Do not set fallback location, just mark that we do not have real location
          setHasRealLocation(false);
          // Do not hide the banner if denied, so users can try again
          try {
            localStorage.setItem('unlocked_has_real_location', 'false');
          } catch (e) {
            console.error(e);
          }
        }
      );
    } else {
      // If navigator.geolocation is not available, just set hasRealLocation to false
      setHasRealLocation(false);
    }
  };

  // Selected pro details view open
  useEffect(() => {
    if (selectedPro) {
      // Keep scroll position stable when modal is active
    }
  }, [selectedPro]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkMatches = (text: string) => {
    if (!text || typeof text !== 'string' || !text.trim()) return true;
    const searchLower = text.toLowerCase().trim();
    return (allPros || []).some(pro => {
      if (!pro) return false;
      const matchesCategory = selectedCategory === 'All' || 
                              (pro.categories && Array.isArray(pro.categories) && pro.categories.includes(selectedCategory)) ||
                              pro.category === selectedCategory;
      const matchesLanguage = selectedLanguage === 'All' || (pro.languages && Array.isArray(pro.languages) && pro.languages.includes(selectedLanguage));
      const matchesRating = (pro.rating || 0) >= minRating;
      
      const proName = typeof pro.name === 'string' ? pro.name : '';
      const proCat = typeof pro.category === 'string' ? pro.category : '';
      const proCompany = typeof pro.company_name === 'string' ? pro.company_name : '';
      const proBio = typeof pro.bio === 'string' ? pro.bio : '';

      let matchesSearch = proName.toLowerCase().includes(searchLower) || 
                          (Array.isArray(pro.categories) && pro.categories.some(c => typeof c === 'string' && c.toLowerCase().includes(searchLower))) ||
                          proCat.toLowerCase().includes(searchLower) ||
                          proCompany.toLowerCase().includes(searchLower) ||
                          proBio.toLowerCase().includes(searchLower);
                          
      let matchesDistance = true;
      if (maxDistance !== 'All' && userLocation) {
        if (pro.coordinates && typeof pro.coordinates.lat === 'number' && typeof pro.coordinates.lng === 'number') {
          const dist = getDistance(userLocation.lat, userLocation.lng, pro.coordinates.lat, pro.coordinates.lng);
          matchesDistance = dist <= (maxDistance as number);
        } else {
          matchesDistance = false;
        }
      }
      return matchesCategory && matchesLanguage && matchesSearch && matchesDistance && matchesRating;
    });
  };

  const languages = ['All', 'Spanish', 'English', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Russian', 'Arabic', 'Chinese', 'Japanese'];
  const distances = ['All', 1, 2, 5, 10, 25, 50, 100];

  const hasActiveFilter = (typeof deferredSearch === 'string' && deferredSearch.trim() !== '') || aiResults !== null || selectedCategory !== 'All' || selectedLanguage !== 'All' || maxDistance !== 'All' || minRating > 0;

  // Check if we have strong exact matches from AI search
  const hasStrongAiMatches = aiResults !== null && aiExactMatch && (Object.values(aiResults) as any[]).some(r => r.score >= 30);

  const filteredPros = hasActiveFilter 
    ? (allPros || []).filter(pro => {
        if (!pro) return false;
        const matchesCategory = selectedCategory === 'All' || 
                                (pro.categories && Array.isArray(pro.categories) && pro.categories.includes(selectedCategory)) ||
                                pro.category === selectedCategory;
        const matchesLanguage = selectedLanguage === 'All' || (pro.languages && Array.isArray(pro.languages) && pro.languages.includes(selectedLanguage));
        const matchesRating = (pro.rating || 0) >= minRating;
        
        let matchesSearch = true;
        const searchStr = typeof deferredSearch === 'string' ? deferredSearch.trim() : '';
        if (searchStr !== '') {
          if (aiResults !== null) {
            const proIdStr = String(pro.id);
            const matchInfo = aiResults[proIdStr];
            // Only keep professionals that have a positive score (> 0).
            // Any professional with score <= 0 or missing from aiResults has nothing to do with the search and is hidden.
            matchesSearch = !!matchInfo && typeof matchInfo.score === 'number' && matchInfo.score > 0;
          } else {
            const searchLower = searchStr.toLowerCase();
            const proName = typeof pro.name === 'string' ? pro.name : '';
            const proCat = typeof pro.category === 'string' ? pro.category : '';
            const proCompany = typeof pro.company_name === 'string' ? pro.company_name : '';
            const proBio = typeof pro.bio === 'string' ? pro.bio : '';

            matchesSearch = proName.toLowerCase().includes(searchLower) || 
                            (Array.isArray(pro.categories) && pro.categories.some(c => typeof c === 'string' && c.toLowerCase().includes(searchLower))) ||
                            proCat.toLowerCase().includes(searchLower) ||
                            proCompany.toLowerCase().includes(searchLower) ||
                            proBio.toLowerCase().includes(searchLower);
          }
        }
        
        let matchesDistance = true;
        if (maxDistance !== 'All' && userLocation) {
          if (pro.coordinates && typeof pro.coordinates.lat === 'number' && typeof pro.coordinates.lng === 'number') {
            const dist = getDistance(userLocation.lat, userLocation.lng, pro.coordinates.lat, pro.coordinates.lng);
            matchesDistance = dist <= (maxDistance as number);
          } else {
            matchesDistance = false;
          }
        }

        return matchesCategory && matchesLanguage && matchesSearch && matchesDistance && matchesRating;
      })
      .sort((a, b) => {
        if (aiResults) {
          const scoreA = aiResults[String(a.id)]?.score || 0;
          const scoreB = aiResults[String(b.id)]?.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
        }

        if (userLocation && a.coordinates && b.coordinates) {
          const distA = getDistance(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng);
          const distB = getDistance(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng);
          
          if (maxDistance !== 'All') {
             return distA - distB;
          }
        }

        return (b.rating || 0) - (a.rating || 0);
      })
    : [];

  return (
    <div className="p-4 md:p-12 pt-20 md:pt-24 space-y-16 pb-32 max-w-7xl mx-auto">
      {/* Search & Filters */}
      <div className="space-y-10">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Ask Jane Search Interface */}
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-left space-y-1">
              <h2 className="text-3xl md:text-4xl font-semibold font-display text-slate-900 tracking-tight leading-tight">
                <span className="text-brand-blue font-semibold">What</span> are you looking for?
              </h2>
              <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                Search for a professional or let Jane, your AI assistant, find the best match for you.
              </p>
            </div>

            <div className="space-y-4">
              {/* Blue Bordered Ask Jane Container */}
              <div className="relative bg-white rounded-[24px] border-2 border-blue-200/90 p-5 shadow-[0_4px_24px_rgba(37,99,235,0.02)] space-y-2 focus-within:border-brand-blue/50 focus-within:ring-4 focus-within:ring-brand-blue/5 transition-all">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-brand-blue mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] sm:text-[11px] font-extrabold text-brand-blue uppercase tracking-wider">
                        Tell Jane what you need...
                      </label>
                      {search && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setDeferredSearch('');
                            setAiResults(null);
                            setAiQuery('');
                            inputRef.current?.focus();
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea 
                      ref={inputRef as any}
                      rows={3}
                      placeholder="e.g. plumber, French-speaking dentist, or help sorting out my paperwork"
                      className="w-full bg-transparent outline-none text-slate-700 font-medium leading-relaxed placeholder:text-slate-300 text-xs sm:text-sm border-none p-0 focus:ring-0 resize-none"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Large Blue Recommendations Action Button */}
              <button 
                onClick={handleSearchSubmit}
                disabled={aiLoading || !search.trim()}
                className="w-full py-4.5 bg-brand-blue hover:bg-[#0958d9] active:scale-[0.98] text-white rounded-[24px] font-bold text-sm md:text-base shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 fill-white/10" />
                )}
                Find professionals
              </button>

              {/* Privacy Safeguard Note */}
              <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold text-[10px] md:text-[11px] tracking-wide pt-1 text-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>100% private. Jane is here to help.</span>
              </div>
            </div>

            {/* No Results banner */}
            <AnimatePresence>
              {hasActiveFilter && !aiLoading && filteredPros.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100/50 text-amber-900 text-xs md:text-sm font-medium flex items-center gap-3 shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <span>No matches found. Try using other keywords or clearing some filters! 🌟</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Error banner */}
            {aiError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Skeleton / Loading pulse for AI mapping */}
            {aiLoading && (
              <div className="p-8 bg-blue-50/40 rounded-3xl border border-blue-100/40 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-brand-blue/10 rounded-fulx���z�H�(��OV��T�H���$�,+3���%��Qyl��(�A��ZR��g����&�$sΉ "���]�o�*-K�'ξ��2�oY��Ӵ3��O���,��?�����g�t�%_C?e��K�w���[��l�+�/�o��E�E��E8��S/�;�,���j����qpm�W��ә7�;w��}H3�YC:e�qc�ñ:�Ȼ�[��w/�Y������ ���x������O�n���:k��mʛOC���cS�s(�I}/]a7���˼/�Y|	=���ԏ���͒��O� �AA�1�"���f~r�2h9]��}t֕�\\~x���_�=�)a�Sv
�@�����3���Y�\���O:���ע��v˾��NK9���G�VY⍾�
vn�1l�������}��kY�wc�$3��3�ô3`oә�w��-���
3� ��!u'w�u���My���o`�л���B��{��O�X,�9�I�����a ���]�#����u����|�35�%�a6���W� ��{�]{0��{��?�#*�����M�������ٽ�A�Fq���=�w3/��Y�����N�g��H���r��$ó��O�a����>������<�,�3��Yd�;ڼ��+���sD;��m(έ~|���f�]��~���Y`��G�t'A �?
�X]�ŻʝAa���D1��ʃ��8��&~O��Q N�x0�7i�Q L�U�����D'�y��IgDڬKh; �xFx����A.��?�?�]司Z����|ڝz�6"|��$d�_���{|�AB9�����^^���*?+��f�M�"��9N0�B��ŀCV�C�D�rG�w�k@6)���@C/�W�uG�uj�;l34p����S��n��_���7����������.����5��
��u��8�B���އb'8�_�@|<ǁ�c��7���Z��[�%���7m�FO�M~S4�:H3	v����[o�!�*�d�~g��q��I<e�'��٭�f����Kq�i���54��Q�s�Ik)�|}���0�0y��.D��͐ r�c���[�9�z�{�c�ڧ�?K��M�+�a}Oṽ���M�E�VA��o�_��C��N��A��1��?�2��eU�|Nm~r���l�ca<���,N Wv�`�qi��\��?�:|��V�i������>�j*.KU�8�8��~��I�j��-`,�d��W^z�{���ku�B�����v�f��k� �YF\�>~說��zs��SP��.B�wo.]=?t?���Z2KW�e�媠���?!Q��\Zq�n�H��Ί0o��^A�;�#Q�!�o�1���<�B�C֋H$O3��������Q!x��ZI'�P�+$�&^�"2���.$�����ITŠ����Ta�P��r��V��E�H$+���B�뼿��� c�9�WD$�ƂU#��.�#p_="���e�þ j���?e`m8�����e�{�������C3����k�Ld��w+�]nUǉ�S�ye�����m:e���{K�N�2o��(�)�����?!�l;6𸈳,�W����	^��'���.�67�������߉W𲴐 ���q&9�oo�/�: �-,;������9Bz�m��WA���X�(��]��G �N�֗j3_�_�6��*X�'�ˮ�c����?B�9���{¸��f4�V��hJ�J�;	)�@|-�&���J:ݡ�I|�߭��?���H�6x2`��T�r���6h�IE�u�M��=�> ���W�`�����
[�Dʒv�\�+��b�*NiQҪ�	RM���C{D|��S���D
�g?uJH�Q\����Jl`@&r�t��2��>��% �8I�V`��{��0�%�f�A0�#��afi����HW�&,�fr�;A�Feb��ᥐ�a��W��?��z��^�$<//=t{��Ct"�K-�
́������q�"˱��Y�E��+/�������~�A|#�7�j����{J*��Q釧��2�1��`�[�#!����E��{��=CyM��PC p�����-�΢6ǭ;u9��0�\�1�S�o��s#�إ7��*�l��� GŎA2A�$���ۖ�����/0�}�hBtt�"[CT���L��k�W�օ��y���Ç6PD:�Y�18t��SM���e�q�Ը4\*�>_��'r�DȀUGp��8`�>4����朡���f�?��1�i4�8q�G`P�S*�[t���$ϻ,r5t��V"������J�m't���~�k�
��|*q��|}���=�΄[�iJw�	ٽ��`��=��|E��!��P_>Biku���0�n`ŭ�FX�nMlo��_7�|]~��WЀE���}4)0(����&��3nO�f612�(#�l@X��!��IG^�w��Z��/d`s"��W"�Ek���:�����n^����;�%b�!H�5�\h��4eh	.Q��%��ֹZs^�7Gd�Y���꯵�Z�e����Hs�Ton?`uP�Y����5�M����9EڽVbF�����%�I�]�jS5��1.h?u.�d��:[K,�g�N��
�u)�4D���S��0/���RҮ��ҏ���5�[�V��|�շ���pr��Y��GQ�Z��/�e�R�'YԜz(,��j�{%^(U
���U�Py�ڛ��f�zLO-u�|�8�������m>@�I�3(�]���8�i۝��Jע�"���]XlvXo����^�	�E{�OO[.��\u�A�l���7����d�+)�WT=��Vn3�N������x�˘��t����s�1<�>X��#����p�����p�����i���$����v�`�;lm�;���^aa4�a�^wmscV���7?;
2���ތ��ŕ��^5� �5���Mvp,\��8/t�ㄗ�?�����৳���g������N}o����#gW����B��?�>�?���@8���^�&&9��*�l��^����A������q��y)�ã���
���aK���<[�:;�_8Lu�Yg�ń��xv����y����z�4K�hr��Q���G���钅̿dKpȼ���uR�/�2dK�
�ʶ��C�H���+�l6g�Wj��0~�pc��[U��Z�
��-4�B]���g���/3���ކ�El�e����N����[���Vy,{�7$�c%�giv�e1�FCq�ԡ����W+���u�'T��,ź�}�����axJ�SDΨ�����Ђ�'@~��Nz�AU�~l}�Ґ� W;N���}���0�����`��5B�>%��R�TX��6O�q0�
�
;򒤏�����4_$�I�o�Nu�����4�D�Vz��|:������p�?*�&]pР֫��x��~��?CΦ�J���x�XO}��H(���9]a�����p@w,�3`���!1&��(��ߺ��`��Z��,	����Q�F�||�Z�JO"T��Q<�Q+��c a��F�������� 	�ǯ��� � �8NZY���mZ���[b�r���SL�Ralt�P���=x�i�
*N��r�fY���8�N��!�|�Ai����C=(�����/��~��,�������S��V�[`�-������:���FT�8�[}	H��T]�$�JM{��K?��oع���� #�,q�`��LuP_�scf�U*��NI�©?Lc�f�|�\Y
�CZ�^r{=Z�jx	5�D!~ e��9`!��M��P#�A�d�Ҍ�R/|�A/UTXt�(�ϒ�3�q�	�ť��r:�f��Sg��:	O��О$!�
4p�
U�%�#CM��ئ��Ƀ@(f�y!���U�0��Gj!5~U�"x��Y����=G?e''(�+�,oi��g�jO�=��PV֥�pRH�\*D��Č���.\�֍�C%j��3q���,c�%��d��O��Z�bxrfA�6�Mk~����n:[�U(J�߻,��~e!x�raÉ���WbL�]c�*�9
��]��=��?أ��"i7��sNGq⋥�/콦�����~X�?����L�$|A��I��R�ADw,��T���CQ"N�֮�Y#�usx�Ϡ�VIju�\�n�;��;���h �o��Y�I���,���Kۄ�4��C�T�0B�K>��غs�?G�����v0Λ=��C$I���4!M�\L�d�!�j*']���z�{�X>w��~L�$8�/�j�n0L�����P��#X�������T�f��J�cj&~�X�+����u�_)-!��M���<wvk��vïz��g��Bg��ۖ�D�e�8�\� �DR�s�k[32Y�t(���'�znO;�}����@Lʝ��&�l�"�h���uP���)]�±����{�y#��:�*Tٓ��T|�2�P}��c�1�������I3�զ*L�>.'
3ġ&<�9p�	�N�Uc\&a�NI���y��h��r�
����b{�w�n��^�(��2xf.�ڀ+~����# m�[�]�k2F����w�͡L"�� :K�������N����N��yw$��9�w]vBH�Z��8�
�t^�Vq��&-�t��>�B8~*�B�h��+�����cJf��ƕ����������ʣ�	�c?�O��a]�Je@�lc��@;�Z7��կ�0��Z�$���UAb�Y�r�)ga垢8l"L��#�w8�}��y �%���[��u{��O���u�´�����c��_��=;DV��Ke(����]��0GM҆
�����7zm֔(�K�@L�mLg��[]4&EW�5� �5t����]E�	�\q��ʅ!�6�� x`��A�~�{����l�y	D�ZZ����f<(^:{�6c�ά�9��B]%Zv�;\�ݘ`�uI���Jޣ;n��Be�����[Ë,U�Z�9]h�UBE�A^�F�ՙ�r��q�]�d(L�	p�@�k��[C�>H������^��F���1�W�gTP�� ��B����P����J��8�m_yCD����yrNs�f��Ǣ�س0.=5��κ��	~J{�+
��X��e��j��X�@�lkW����~'@'77.r�U����`�	]˵b�4��a��ĺ��R�Qq�^5h��OI��ҳ:
f�7֩J�r}��=�q]@�]�2Y��2�D����)u��@���C���8����g��+l���1����y���U9��x,q�Zl� Z�0J������ o�D"�­��tG���C�O�|6W6�V��BFSAc�LD�f]di����֦r����$%`S4O3
=F���'c�\�,RMt?�i��k*SU��׬�F�4x]B���uc�,�� ��d>[a��h�b��X�b4�Q��GhN�"�ӗ� p]uia�c�{0�[~�~�	���,�,]����:�R׃+%S�y2KT� Y�x(w_0�����Mg�^�� gR�s�ؽ9�<�j�Ku1��S���e%���f��C�p"b/�6.�D��n��$��^y�S����-0�n���E��x�J.X��������� �7H�5�e@\���h�߁���"p]hPi]����i*@u��o,�:�[�vԅ�@n3?�G��|�z�� �l'RR�h�d��X�uhz�3Pb�>��rC����)�,�f�������(���mD���m5�r{�q�n��5���"��`.�������N��G�<�唔_J=_���8gPe���T8����<f0�3��fys��dX�á�tw�x!���
e�M��� !Ь����:j�(��N��yr��Á%�@mʶ�A��K�w)�=y�+�:S�A)����'�2�-�O�v��|w0~SL5H���g��5f�N[\��y	2�U]v�`���KY�|�`���w7�ǥ�\ߒZ�^�y�"�U�3/��1��	w�R8��.1|��p�f���
���,��e�x/䥭|�q�J#�a9"`�]!���5f �hj��ˮ�!���w_|0���>��������L��+?��P
�u
09��Cꂳ�z�w��*����*~şx+��.�o(�+���U�n�Py9�x&+���ֶ)��LVp�V��%?�Bq��S8+����$W:vu1���-e���<J|o|G�;��$��u�	�˔_,-G~'�^)/����z�W��3��v�9ϗ�	@��`lNn�L]K[����6�`�o��ĞI]t<��)�WHD�~O��QkW8n����(�s�8�i1ǧl����#pQ|c�`x[����Q���n�m[fYT}�����X6�?���n�"��H3.b���������O���O�hDK!�4qXj����n�$Z�k��iRK����v�R4'�m��ȣ�5#.:��Vm�~M�I��K4�7�Az�]�S{M���w��x�ٱ�������A ����$#B��c��:�ˀ�ji��|������-�=%I�a�t>��[��-��E߂�2n��"a�=�{�'d�GF�a3e���z~~W�x>�]^,�0�dз~4��)��<g�y����"��׫��sH]�m��_?�gq���+תR�TQ ��횵�N�� ?+���e�@-�(�5�ܜ��cg��8ߓ*M�+6 ���m�3�Og�Ӑ'>
$<yjoo�;�@�>u]�<�).�؀θ zH���╗�`̹$�Gzaio1�Q��Dwa<i9W��OL$�і��G_�$��7{x���o8�S?�F~w��|�_a��AvA������T��-3����۳Ŀ���o���/�`��s�:K}k�g��g������c{�@�!b94����Dh>f�)����1���fJ�����0�*		S9₂L�]1�v� �㰘C5o���o�y�]4beUC�A�T��`d �P��MC��� ��Q�\�?b{GƦ��{F�/�$�G��Ŀ����r������(�u�H�|�P�b^�e<�z�1r<ڛE���{�㢿7�9�|EP-b}��S*��0����s�K�]���`�8�m���^+��qv�R@	�ʶ]��� ���ŧ��=��W��*l\�#�S�T@J�V�ⶊ<�x���M�2+";����T�A���m�P�6u8�m��GY,D<9�θø�	k�5៣1 �6P�����#eLX.a�(���^���׶�%�N��r�l���{�b��O�a/*hX��T�G�8�)����s�A��2��<�o�ͽ�P�м� j�b|���~�ڥ��Hx�@���%�)�ִ���/�,S1X�U��n���ؒB�d6��eA�,�N*����I\�*m��(���+=�r�i��(�'�PX�</iUA���@�/�W��)�lޒ5���g�e��������0;���	�ǧ�J�K"cל㲲:0��ͼY��b���t���+[D�dif����*�k��t�ژ�����dCwϺ��t���v0���G����ޚ���''�s��p��{��8/�r	�� ��(,dwM�^�m������ۗABJpoL�cv��%JRxGZ	_���(�I�@D���㏳�۔�f%�Ө༆���Q��(!��%�_3{J�NY�4�ߨ����\%���d�nc��ג�6.~��r��0U2H < <=�
�i ���By�}*�!3I��Pr�(w��)��'$�$S<%��G��
i�O��z��+���}=5�C%�N*����<�S���
��G"�m�;LW���Ui��ю8�ϼ8�<�hD	y�X���O��g�$G����.�/�ڭ#��K_�s
�V;�i�05�b����k��(�����s�ޝ�:>ӚS�G�4I�F/D�~�<FsM��A�+d3��d�Jщ -���  3 ��U7�u����Ɣ�Y���³�\���/Y��sc�<��0�ՙSx6�Fm���#�y��¨�^�FIxV��偋Ш�M����{�y��S��ZaT�QB�SJ���y"8zQ�o(�;��~��bc4�3�<�3��l.���?�t:����ck���	�)�+��&��u�Q���X��'��{Y�E��CHӷ�޹��~w�������5���_�9 �3$�(O�0�NB�8f��.��+��ީ�%c�I1��с�f�=��-�k��{W�b4�I�@W
I��V6�~h7��dOq��6��f��.���I%��K���'��؛j"��5�d���S>O���-���a��P"lg�Xy�ڑ��GT��V�w�p�,_�3�צ>�$�YV:��s�I�����k�ڹ� ۆ�1��4��p#����w�a>;���^kX#s��X��C�Ki5��#%&2�y �2����ޱ�`�^q��	�H��_a抙�A���(�R���`g��ó�^w�]l�#��a;��JO>�Xv\'+�%��Wd����Jϓ�E��J�2_sU�R��&B��iMA,uH�2�S�4q]ʔAtT^�2.P����f���%@|��$,3��Io��Dm�#�AΝl�ܲ)�(}�ơ�{7t7B�\�@	V�V� ����8�4��5p��������(�t���n��;��@1��'����"i��0�
җK�?F���J���vަ�<��^ve����}����|N���ٔ��v\���L0����"F]���8����� �-�oL-}��o��N�4�]"c����C���q�>C�<50�Pa���,��	u��!��<s���	�����~��b.����,F[�p��\�V5����k�v�$��x���|���F��i�c�$b!ͥ�����x�p�x��-�H��;��y�_�3<]���C�51Fm,�y����ҋ{CF>�e��q�a���1_�t�],�tp��lb���9�Ō������7�DW����>NTU7��u�l��E��2+�s�AyԲ�~m8B9��>'��sG`_N��srבx3w�A��TH���N�d�,�v����x>t�+Y)U+��M�NK�f��Q��M�����r�����O/Q�C�Y6�;Y ��/�Q�*U�$ɪf�bMTs�y���b�`z�ҷ���M���M�Z}��O :rt�Qp?�q���T��� ����qQ�<3��R�!����M�RS�!J�2�>�K^�U���u���Q8Tw�"�	��u*5�?�M����t���PF�e^޴0�raiNhnxj�/��f��[o6�WM]D�ݹ���Ҫ:inn6i[��lbe���ON{]ci����>}O�@T���,�`mY2D�����BP�|>4#�chO�2,��4؀�8��=6�6e����_�4�r����?'
�Gi�ڞ�����؅QW�#�Q2�Z���b�j)1*�2���L(��W~0�0m}��ȔGŨV3*���y��16��&�׃�M5�"��hL�j��m�#�H�֠�+�gq����y�`%�y1K���N���x��(�;3!CM^�Yᝲ�|&��Z�w��0D���θ�'�\�(�k7
B}�	F��Si�(��/\�� ����	]iN{e��^��_c�@��s@���s��J>PEX�0"4W� ���p�Dޝt�]�S�2Sr�����N�v\�<��\~�a�e+~ÒMK.i���:+2S���٬N�+Z��J��h�VH���4������MY�0��1�����r9β�+0�0��Z/@��׽�/�y���A�\�a��E��0Q�����2p|�"���o�*�a(o,kP�z����D=�Z�����N�=(C�0�.<̿�T�[�#�:L���e�,HȧL5q)��[Cqx9[�U��`��̫¨���0Ʃ��?��}E�� �O��F�{Fv�`�S��gZ)��rpZ�:��K�LI���zƦ�Y��*Y���7�TC!8%�`P�?��J��w�T�AI��%�C�}�)ᛡ���΄�o2�~�U��o��<�V��L�G��s����6�s�9�
�W�[^�L-�+�\�#o.R����Dk�XU@T��#C�S6	�MjW4��!C_��`�B P��c�N(��Ӡ�C#��m�`͒"�Q���GRI6�1��7���I 6Em�rt �F����(�	��IS*�utŧ����$����:~㥋�x��cc{t���䔨�gl�EAzț�@�8����܆
le�%�l��=�wb��H�gq��xQ<��h�JY����N����I_�r���x,�i(
�� E�'���g�n���A�9㒚H�˫�	����d���G��RF��0S�vt�c]e�#W�#�<>�Ҏd�;C���~w��Vc�2�,
�����3p[�Q��/i�{��s�vy߿Ϯ�i�����o����:��*t��L���Qt�Mn����?OiP���Z�x�I�N�� �%���"����}z"9*T�|�������n�3�5ݸ1����k�ė���2�	L��ô�]�� o�tB�+S8ue�	������������"F��^~�s��Kp¯Ba6�R�6�t+|:�o��s�C�%��� �^$���!���˛q��Um�_bH��򹋊�n�Xa�ɲx�fiH�L#ƈ{F�'fn"m�&>0q3@���:t	�I��Dc~�;�p�S�w�"�n��r��ȓ�1��؀��k9�F��#�t$3 qXP��X��/Ꮗ�\DA��QFAE|��#���@PK��7Mx���G߆t	g
]���Eyv�g�'�ƭ�=��<
y�Zȝt"�W[�{�C:��==�@?J
,���P�k���zR��q^>�U��2��s;x"���^�Q�"Y�,af�^��.�Hì��	_���{�p��V������"���p�.=
�5k�U�z�B�2�ü�2%V���bɄާ"��M�|���OE*缜�^kn�n;T�a���Qm�۪\�zY�MM��GϜ*
����ŷ��_Ew�u�H�N����H0��y�)�y^,�b�o֟(WV������f�ݿ艬�n����ږ�ܞ�*O�rV��t�N�_�:8a���K)���,�=��t�zy�G%żڴ�&>/>�'�b+�^4c�K�$��-R�k��L���a�, �+��Y���ZaZ"䅫i�w���n���V�Qy�3�aK���E(ik�]�<�E�PX?�顕���v��}m!��H��:.f�"��vQ��(8����!�YY��$9JN��\˖�iA�u1�rJ�dЖ��b�F�#u�\�IgT�@)mZ]�,�#g���^��\��+hoC�p�-x��(�ЎGC��&�!��d ��8
0�e���)�[�t��jK6+e�v�eQ�>��x�px
6�s'�ȕ��ޖ������=���J��w����; ;����O:���-�*jD搳�/xO�-�vK��KЉ���dʨ,��qkTN.o��>u�����	6��>P��Hçq���P���������j�����AGw�x��h���9A�4�_@��'G��?���%��xt��<	q0_��l�΃���<7]�f��K��ZJxO��q����-?��$dBXi!<.,���GxuG��k44`�M�U��c4I6�X�U���.����&������*'�.F&CK���zۻ%����h�VK"�l��)�>�"k��1��#[�d�h9��#�P�&�����������A�XSw����[/�9e� ��zEn`�Fdݕ��̏�)9�}����j�§�i��8�]��W�<"����ٳ�H����VV�j�K(JW���<I�#
D��`�Bx'WS��V��HHF�^��j!�(�@�)�ֲ2���,؊nY�SY˞�]+tة��L',MF{�
z`^��--��X�����<���9�[b��5I�KX��h�9�\����B�cv�_�*Vj���ի1jC�"mE9�W�Y��kU]�(@f-?�.>fg�EUY���dbS�`wN}�jh�Ü�b�V
�	G�3����Mp� ��	7����k\������9��mwCGa31B D����9%��繩��>"����v2Xv���8�0߻�_�|�'����r�垬�Hd�-^Yy�U�,�8��;�U���]���-�J{���鸁�����.6YQɰ��2��Zs/BeqO�s�{}ʂ
LhT�}.틡-0�'��Vx}��Y|,�s�Ϥb�3+jD��
5Z�{j4T�U���v�)~y]A�P�����Ȋ���p�d�����	ϒ�02ma�H��훕����y�����oMe���9c��av@i�e��o����׵�ʩX����:�\3�+��^UePU4�l���F���N_t\0]����ʹR��*kX��m5��q9��b���Vf�UQ/k�6 �䒾Q!�Z"Z�[7��ԙ���~E�Y2��%�!:��8z�_f��F�h���2�.��^VE;. ���Mh�2��O��֪`{p�]�Z��� �C����z󺻻.��	ժad���Z�'�s��	�!��P8־��&s�pB��B�����#��m'�.͛p%�k�3��zϟ�aUO�����sh�".ȌX��>kZ��i�0�q},�R%ˍ��?��jхpo��;oؔ�R���X�J��(j9��u��z�l�FhP��:wdS�eAB�b�T��!E|'�/q��~L��D�t��
��|�Z69��:�ГSu��e=�J����Md%+�=ų�z,��(7�ǀ�J���F�5��S��6?V=4~����E��ŅXd�"W�i�-����J ��}��X�ǩ��)�&�><-�$i�%-��D;���ϣ�� ��_�f��\r Tv�� ���Si:�ɏ6J
m4$/PO�WZ2�Q�QF=�+�������] ��9�%��ּd̛xbG��r��V9��[K�(͂P7�l�>Ò�*���}�rBR�����e�7�[9J�G����R��L��G��8 ��g�rűy�P�V]�.����A )���J2����Q���}tڏ2Jm |�D��G�~��ʗ�d�I�|a����1k�,�>S�}ΎY��po{`ذ�)�(�l&�rzU�������d7F;=)��d0�5W5`I]�sq��9&�� t tK�)�ę8T�U���*��M ^��ߦeOģhBɇ"����3@ᰮA`��y�O�#1�'^B��rxy��["��V=d	8Q�}���|�t�9 ~MӺ�R���(�ul9M)%�KQdZHw����%[��s!����ͻ)�	OJi�CjXUh�pv����OH��Ϝ)�*�V���Q�Za13lAY҉��w���C���V���7��ڂ
�_$���s�`���*�;7�7[ڿW��Cr(�Q*�vTD;�4#cJ�!��V���1H9-��A)�4z!Qv�Tc�M�&��}��ς�f|�|�3&ZߧA��r��i����V��A������2K�GUc;y⇲���=�f������/��I��(sLfq�� ����EgX�����@\��1�u.���Rܔ�}TF��<I�Zkw)�K���Ef�R��#�Y&�z�L֛�a���N}
,M�3<m6�2.���l�b	���W��§J�.����P�1ٹ�E�=rsj�k���� V[M�A!}�4g�E\P�)��~#�ɀM/�n;�H���� �o��p��<��Vo*3S�u[�vl����x��;%�RJ��ԭ���I��6nK�BzB�Z���n*E�Q#�t`:�	՞bU�8��	ߥ;9�O��	7�.uh@@b�O���hI+tfMQ����q҂�����t��c��o������1I���Ԣ<@�Qؘ�~4/v�n�����<�|�NGIqm؊���_��m�}= Ҳ���w84�##w�]|cEsNOיx�?�?9Ce{��ɋqy��?��բ���%T1��L���E[@�Z~JP�My@ruw����VT���@V��(\���\{ ���	s�'N'5�����$����lS��s��Y��+�9?�[:��qE����n�NJ$s�w�确��6a	aA-�z�s:)������B7�O�:T3�ga��E��e�^LGG1�����m�vA"�[�3��W�p�S��f�k���S�U
7�9��o��s̝�j�(�$.l��.6 B~M��3¯�#�"+���F"r�hb��5�=H���t[9�I{(��� �*�8C�R�K�tn���X��7A��2��a蓌�o0����Ǚ~��º��xk��⛲'�8D�A2
����,���bUs��P>w��J&8knȿ"���B4w��ի���	TtJ�FX����KQ�v#�D��#e����&��T��Kp�O����a��Z*	�H�����`\P2�<�>�?9co�޾::a��޼���}���M��R��%�R������S�RM�'��H.u D�UtzZ0���z��3<	�`��~�S�Y��"�k�u � ��n�S������FY�#���2�։�nZ#��k��	�S	�u�#�5_:�.��.�����+�غp�['���@)kΟ�,Y&ݶбFIw*|]��l��>�i�ҋ��i��:(�e�9�Gq�t.�?��02N	���țf�)�+�ʻ��FL��Fe�zb��_�p"0���3��� %�w�}�2	����w��JxEw�Ա_����x�%0�)��X9+�oN-��ـ�,��7��ꇥ5,�2Vԡ�H3ᦍ�m�
 �`�%w���]��\k^����
yTM���+�	�'ʋ%���AA�FjS�$X�a4�U�nU�a�U�rA�H���T����/�w������E~������.�¿l�}Ĥ�{�h;��X�|�&������	�.��(G4J��Q�[��F�Ez�I%������ ��vW9�/d��g:�"�0ks�e/\�>�؍+�蔋�]��)�9�i��j�{�C�mM=�ڗu=�Jf��E�t1��o�^��S]U�U������!\��*�R�m��]%U�\K�&I0f��p)L���Jgc�eJh®ۦoU9BUQ��w�N�k�k8� ��7M��,rP���ԍ�UQ�kK�U�!L�w����yB��M�v�b��p!}��"�C��M������2`�w/h�����7L�������x�����K��4Ƃ����h/V^���+/\"��"^T<�����Vt\�b��2:an*����7��R�^*�S�e;�{�f H@3���v�zɾ�ʋh!5x�`>��x`����}R��˿*��\�]ز�����vhp�bhi�'�	
�B�2�3��b�ф$'>^�ɸO�]���OП�YL�2�I�*�9L4���Y.����̊ �%���}X�ܤ+��;8m.�1�e���^b�L���E{�	l�ژ��|/���ī�W�������=��G<@�b��:,\�'͒�
%�*⻬� ~B�4�V"���0�.;�c�V�3���y����(v�a�c�餯c�$��o�5���ZA�ao���F�k�����G+؇�{2ƾvE�<�\E{�K*���q��4H5.��6�J\5V,�رn��g<$U�)�����'+�/����}�:�>
}T��Z��x�Û`�3 �V�J�3^+7�5F ˔Ȃ���GW������hN�v����JW�+GѸ�����8˻�۰�'�7ʺt����ɼ��Xz���X��V�KM"5��O]^�/Tk�>����7�Gum`oJ�lm���,�[��w� �zh��N�<z��i�.ZY�dq���co���_ئ��'��B�V��57�O-�~��"[��*S��d��qW��!�$�1^8�|���M�~hQi��S[vb���_Ϋ����1�N�A�(D9Jl���w���u��t�N4a�6WxI9��'~O�����D4�w����Wj^�2�S���=�SE� l��t���â��x��|R���z��M�P�b�'�.��F�������~��Sy!�M]ql�{�W^zb
�;��?�/]��
����8�.5�	* �L�~k��i������	��WG��BQ!��*�ۯK�����w��?�Z��!�U����Z�Rn�.�fŊ�P�h��&�@h�w�ĳ��Y��+x*}�����2��G����j	:���+M�2h@+��l��#��'>5����FAc��.�r�`-{���x،�p�$
����,`l����ô�J&�*�䋢��@8E�U��`��4���/!���|��M!���OXKG�Uu�kI��Հ�˲�=H��Oi{��n�|��dK���iL`:G�wp�1J&_Tܠ��bw���p���"��E��)/n,S��,=F�V<�|��f��]�۲�m)S�BI}D�Dgu�%O(�c��Z.�t�i0�/NT��+f�;M�;��Wmzy:�)_z�/��l��`4��)}�#s���ms�GVײ.���:C�I�+�J B�":���5� �d�kc��Ԡ�P܎��4�	8,eV��낌 ?��qtL@��T��e��i��{�m�t3����N� ��<�-9��r��(�-�$s��
�%.�ʘ���m��NK<���1������i �c�L!^�,$NM�aV�����yC���5	`pf��8펽�s0�O�S�ە?W����̶*ִ�*K��|sdzu^!����	ִ�"��3=I჊����@*ȡ��ɉ��S���K
ZV�K�O�����#@x�|HŎD%�u��m�}0�m	+�h0+�/uf�}�3��B5ǁO0ᢴ�?��AT����`ʃ-5��h\�0@@.`g�%�C���W��8e	���TWgn��1�I��'�(�H��]��E�f"���s���14����%e��薓�Q�����GkW�q?ȩ�k��9=j�^��T/J�Z�"����x��HM[�����Q{��,;x���ܢ �����S�'��lv��1�P���	/��T�O�II���J�ɦ�JO�!۶c^�aL# :;hhM�1P`�����
�x��|O�6?��$l>��v�'7f?�9u�4	�(��>�p&���6H��!��PΆ)���.z�_�HȁHTlղNi5`�l���^J�d h�I3q�E�:�R�Q�ʣ"�^y)v%UO0&�1�R@��<*�p �5�@_/i�i�� �񜥑�/�.����3��+�+�Y�U���?myFb삉�B]�`�|6'�S�ぐE5j�Y��E>��TUX0�w�_P��=|VZ�-}~qϷ��ź�bvo��4� �����V�NT�"��k�����h�����"Fڽ�#��2 �>�P�þ�(����n1�d�W�yp%����:?K��)�>��cZw\�����~�:;h���M��=��Sr.�%�4��<�wb�Q@U�'qEE#B姥��R�\�'�^�Y�}Y�wY�U��Vz!����~����Kn�oQ\�t����f����x�l�U����Y�B�s���5jo�(��]�1ꬃ!>"xj�����LL�w�>#L�|��#��x��"Ű��^���"�X-9��	��;t����u��R�����_Q<F��� ����2xT�솗`x}	�v6V��^w�~�[����Ŕ>C�C�0D]���
O��E�98|3oBcT3e*^ҫ���Ŏ���_=��Ij��,'��p��:�������s���Zu�Y���S���El*eD��\qV������* �oV�p���'���Wd�z˂��+-R��_^��
x]����0� z(ߘy��a/��d��?���AO6=�z�!.�j�G@��O� 092����1@� �	.@�Z�X쏑��'8T�( 
̇N�y����<	w�u*��fZ��jP�) �K#/:u_m�kgUh�T��ÙX�o�=����c�]��Ǟ^�~:��$K�4XN�����Mt���K�]���g :m����"�}��	<���ڊw,��Y�6��zO^ؒ7�gw
YD_\R�JE0��Q�����E#���U��<Mn�9`rgN�'^8V��)��<I�աS��:,�����7��?�RBd1k�8���+r�Q#�:Ɯ.�Z13��5D��z��*�U�kc��S_T�RM��_�,�mUWU�徔J�V0���<^������m0h�C艠D��N��@�qV0Z��B��{�0�f�^����-5 ���>�LM���ܝp�j�TE�������Қ�z�r�ez/�K�qF�?���z�TY4uT��|e)˙/�`�KB��h���D�WJm���ݴ&/vgR.[sr)�``o�&	�3՘�V�`� ymLE���Y"�������1�5=Y���U�g�>(Ù(K�~���P��W誺W����]R��cr�1nQ�J��^�I�������R�2�c��?G�SL{��������K՝�8�rѳ�ȳ�]���%%f�qWq6�����Wve'w$���9�|�l�Kjڦ��Q�N=j�&w<7�RK\�ǈ����<��H��!}c�Ȯb/ձ�.ю�0�7� ����<�}ُ�0f�Ž����/,O?,����|�E��<�Q�I;\"��8�Z�<͋�sEp1����^;哏Y��a�95��f�#�my܃��t;f�
��	�?�O�W��ۅ��x�8�=l��	�oT�X����:KbH�<F����6	(|q�S��j��6I��zzZ��~����?kL'~\yw`U�V''���p���$���TAF��K�ڍ�
9v��q>��l��I�	d��p�S�\�ܣ��m��#���E,�u�����Y��<��JC���qt�W��5������R���\_J%f�+���<ۑƢ���kH�J���M�Uu8A�6��ߒ��ʹ���ή�Wgы�|��эE�QZ�@}U��� )�7{�A��Xmz슌T_2?�yQL���C���+ԼՕn�d�(����(ѭ���|�]��i�܅�����͕���l��Zz�.�|�o���k�V�[$Cʊ�C��U|����`0��W�҉��xo�m ��6����`���g��zwsc���[�}���n��g��`{��������fk���0�������� .l���ۛ[p���p���7|���c�Q㳵I߷������7����ӵ�������G�n��Y�n���zo����ov�׷;�Ao����;���Z�l�j����>�Os���>|��m���&L}{m���c��u�wk��ۄY�៵��n�߶�apg��o�j�����m��Bs�����`x��߆1�\6����w��w�8��`�;��nn�	a�[ݭ��
,po���ۀ�`��Zp\�/��=9�� c��s�Lnm×~n�no��oúA����@w�
mllnw��������6�Yws��nmy0
�N�s�^�������p��pk���6����vp<[0X	��&^\[�n�A�0��`������d`��p���Z�f`���+�9nt�� ��?�F�c���pjֺp@d�6�<<���C������6l��qz��`�����~�3���K�w�Kױ6�u
��FCC� ����6W{"������a}67��ks����� 
�E�X�q�I?��03hw��	6�`�7�l����n�_�O1�)�COt�;j+�.U��U�hM(�U��ҝ���;�W_h�����O����׫��#�����-}����r4{KQ��Pn����d鿃6ɱ����*w�}y��
���[쩊�P�1
SA�r8�,�M��2��*���V�v�w��|�܅��~�7ٽ7�����xZx�*X���d�:�x�)+��;,G/�7*z2�AţnTQ��o�UST�X��U|��9v�?i�_��m�o�훛��u�_�rt[����" �I�M�Sq�wWu4fxֿ��ȧ�>Ū(��xoO�Y)����՜h����ƚ?�����M���?��_�|�Su	�p�_�C��쭒Y	��ϙ�v�|I���U(y�_�G9=��<���K]I����m���"��N改�A�xw� ��m���4��Wj�5b\�HU'��0��V���]�	k`@��*�F�#���#�
���lC�|�	߯���>����?˕�ㄑ�ȕN�"�n��X��V���Pg!���t'q<��@����)L&Y}�͂��X� �h4{/��h���'Ǉ�tG�H�"ǻ\E�J��1���t4r�Y��6�Y�?�:շ��CU�E��I���c����o��=��B>:I����y%�@;S������"SdG�ow��K��jT��4X��ڣ[�ۭ5>�mmo�(`�3Ӛ� ����1�6��U��'����E�4���4��ǹu��&��J�ˡ���u����(ʞ9ת�����t﾿^���|��ڃ߻o�u�Qr^�g&y�;�x�w���uo����������~\�z��U�?��_�����|Š�X˘+]�Z� ��S��ho�ߎ���í%6	�fWd������K��WG�����@]����U���G\+JT������fh����]��s�J�Jr�eB�b��#��־P]�ż|oڻ���u�Ҽ:�L���:4=�������j��v�%4��XJ���@_��.Օ�u6I��=4r�+s��aj��UF�&�z�c����9�����U���S��f;<E��{�+�hX��k%�;�0�,�^&>��O�k̶F�D<c�L2�檵�����r�����������d��VO���u;�Gw�_gE����QKz���T��.��6#S�d֤+C����N�I��/^�c��Ɋ��vxuy�WS�'�~du�E�`K	j�v��._ҫ�B.�%�r�,�\��lw�j�PE-
h5@^Թ����"���t�oŃ���b୍;�ƀ��F��q�J-g�S��ǵ
�@?Tӥ�6m7r��ߏ�D3q�b�����
���X�zϪ�og����!���B	�A�#gE]��<@��Sby�����qd��C�e�gm�n��e��1U�����Q�X]�+��� �����+x��#��|�O���y�pL���tq�sި���|�'&~)raK���\�����-������
s�``k�"�=�\��$@"�'��]���eG_�*!�Ē�-�����W󤭔zl�D��[U����5�U7����ϒ���#�B�@�����F��oR��.*;=\S�3DUZ���N޴���iN*��c2���[ɞv��s!N��W�^���I�v��<�a_����Z:�>2�x��\�T"* ���ה��`�<k^8�#�D�=Jru�g�����ai�KI���)�G0��̙��2u��ŜN(y��e����yrQ���ï���f��Klۮ�q�n��Eǆ')�6��8B-�zZ���>��j����(�i5}�Z�6��
��L�^XN���sv�R�K�%2.��v��x����0�ʎH9���z4aˮk��ڇ����׼V�l��4_cE��f�3召ti0۵��GQ2&3��E��Ӟ[���f�%�����g��cd5�������S4��Q��1���T96i�<T�������s̸�( 8P̌���?������
�e���ա}K�Y�u���1��Zj��L��s�6���y�VP����O\�Ike,�M2M�`�2)���
KٮLS.�����4(�^Y26�X4۔*�1���n�U��j�M��j�"'��b�07f��!ڍF��X��c���$G#�"?,9m��q {Nў� ��*�֦B�u�ɮݚ��c/���%�V��UU�k��Ќ �Ma����8�Qhx~qv�6�K�-j -C�+��w�^���Ϻ�UU�c�P5;�d��U�N@�E7�W�Է��r����,[�FDn$ff|�ڥ��ZK�Ra>�����1���՚SW�
e�m:6L�߫z]��fe��.��UUO/V.7<X/����^ގ��`�5�ch]ņ��4Q�(RD�+�i��(�ЭO��ٻ��(��H��+�:��7X;��\��ܶH񄃴���uC�$ r��i:���ds4#)��jgW�����a���9�Qk|��I�v�����?��:�oR��_G�{�wJMק�:H���W�˸n-?XI}o�o�/��WjM�r�/���1�t��:��'�M�ϓ�_�{����������S�c��R��-�Ot��CoU�ѳ�o��Y��}�s�f��9�J�z �e�v����jM��?}y����e��˱Y���D��<�EYv #�����_Vx���ۥȧ_�p�'*�̅(Y�Z�d�K�#bz�1���P�K���������< �z�
l9O*j�R�TG�yݼKm��*��P9�S]\��W��	�WK¾��![V�����Jѥ&OW�_T�U����6��~�Zf�~�(��|=I� �oY0��]��W��p���<Q\[�F��2���lr�=�@L}.�:5怳+/����9�+"��aW�3�@��bd�hS1rb�n�=}Fu�H�#��f��y�U��1ȝ0�TL�R��XMsv�-2�%ϛ�����,�T�TZ�Pq"�c��軪,��^�T�G��K�8v��%��;t�laʨN�-h�Ǜ��Bw���B��ZZ�|�%w@�䛠|���m���u��rvh./*���zf�����K��w�E[�a΢��D�����H`�G u��pЮ	�s!+�&η*|bA��q�8ʒ �>�{����Ͽ"o�I�韓@�&Z�G���*�ӹ�,R��8�"��#Ї^������o���2�;��W%r7P�uGZ��F8N���BS�o�K��&�Yԡ!n8ˉfў��#�VF:������R�e�W�95V��%K�byL�c��	�\�8c���TE�+��� ����	p�e�+뚳�8B����֢��Q�V��  �d^Ow��">W��0��j
���@��E=��5�TJC��d6����Y0��P��/lmj`��[^�m�|��TT��$p�]l���
�ث�~��ʛ�meLT��O=�Z.�������u�����7h-/7�$��K��)QxW�)��6�����r�Ey?��~'^H�����>�U����F~��W����U�_�����W�m^����+U?�G����W��5���5�FwT�~<� �
K��	,X�2�rZ��9���p�}����*]���=Ug�ߥZ�+6�N��K�7ؘ)�{���
!O�\+kY7	N9�G�HJ�]��E�}�L:3<+�J���<�n=�^�3@L�<�Y����v4�8)&]M�{��8|4Z-�}��@\����\��u*�#�����K�!*|�K�ߔG�|+p����f��߶^/�/�%����'������`W�����F��
"	��t:��e����������7e�O�`���������){�N/��޽f-�Z���՛��g�߳/س�G�oN�8��y>9:|���g��~>~Gz�7��)h�������1*����5�>��O�r���?���9���x<-`�Ͽ���M�x�
��L�'�2{��������~<;b-Z=�r��'�q|zv�ZH?�>�3�3��(k'YW�&ї�tœ|:�ٮ���DÇ����~l��#�@����ۋ?>{�0���?���ǻ�~�^}��;8;z�~�����xz�󻃳�'G���ৣ7}F/���I�.u�Ţ̟�%�,X��<'U��|��ğ�m��=�hD ���(w^�7.��� _�+姪$���GVS:�_��_��_����Q�!c����O�m'Ȉ5B&�?�x����>o5j�6?V��@����ۋ�Ֆ��)�D������B�D���_�~�p��Xo�؀h��SX>W+�V����56+�bD9�:S�#$+�QY������Z�b���[��=�i$s��/�����Ck���ü'��z�)m�*�ڪ/��ߚ�Zh$Uo-p/��⦳���#�z�W꒓J��-�k6�"F���6�g�ɫ�x�2�:~j�|M�@�d�k�QB��+u@�ٰ:��|/~\���~��i/�+>3Fyׯ`(p���|���T����n�[�S����"$��Y8�W^4�3��#{�_l�]��K֜^�TJ��ە��2���,?P(N���ј��cr_��X�f?~	"DQMV�z��bԅ'�vV���m"-(�X,��[��YʝlH܎`kީa��E�����Y팪ۚt�����-��������+FX��1)oXɑ�#�F\Xp�'9�.N0
7�6�)Az�7j6Yy� �=p��Yf����Q�� ��������=���)��W�z�Mga�Qi���'���M1XD�լw^�m��	�ڰ�� d��a��O�7A���Y�/�E�4 �x���,�k�����ݘO��: ����2��]���� �%ӄ9��I7ʻE`�#�6yC@���R���
_{���gK@�������ˏ��L�{͞�D�U/"?�����X�O`o��n��!�ǡ���з~�u��9��
��N�$INP�"�RW���3Ψ'�輎�(b�Bn��3\b��C�s�y/��M� ;lr�LT�l#�q����Z&��ЪQ���^���LB���?�d�^�j�=�o�t���u�3�i��Dg6{J#Ö��ݲeHZ7�}�g����~���ٳ�y���Qj�?!���>>t�ޡ&`�܆�I�g�Y<z�ƌ��v����'$�!3�7	w9/r�Q�7����"5{��=p����97�c�����T������KW�h��*+���ы�Qr~�/%si�"yb6�)@"㶏���:� ��)[���w�L������]y�gh��kC��}��{�i��`� �|
v �"�K��e0�'����޾?���G:zwv��'��M���W�~�t3-�I�-r7�&qw�+�t5`ۗ��3J�xty	0�m��*{����� D1�Q� ���u���R�:��ٕ�J|`,f������(_����|��r�Q,�AV���B��w@���l��S��^����HHIVr��N�h8G|E���н�q��T�b������HTc�6�\,>���X >%�ϋ��T0v��V��t�䃋#9�Y�g��;�1w1Q�����Ͳ#�+ǟ6��۽��nk����2s��y�wF\����������3t�!�!���W��Z'}t��#���3��N��y���r��]�s/p]�i����}��]�:���g�Eh����q�A!f� � ����\���*��}�K�N�?���4�D�R6�b�c���R���N�;��'��5ҥm�z*� D2��k��cC��8��Q�����-�,e���)cyɸ�\Q
C�{��e����J�,b;�*�g���w{T*e�L��L��OF�$� U=0/���@�`���j\���;��(��|��iBa���l�[���>�����:����;0�fϊ-͌�w�Z���\߯@�̩��i_�I���S6�#&�"H�� ���hHG^�_�\����'Z�1o�U��q���V��O���I�0�>EһO�x��,vW+��KjYW�
G�}�����qѥ���h2���Sm��ĳp�	�1{Vf΋;�1Am�������֍�}(ߘy��0_��u���O~���5�.�B8;L�>v� n}���I��O��ăm��K�j�`<" �A̋N�W��ė]*�*�.gč��6��%�$�}�%Q���^��K�y��6�;P�S�������&ms��;�T���a[Bi�g�ԏ��/5Ar�
�z.��b+_�sF�f�a,���X��5�Q�_�b���&���
'iT���%�za��&�s,��n	����������rT8,�<��E�ZUs��+����fO5wEy�-��"�?g4q�=�X2{Ĭ-׆;\�7�K�<�Q��$Цy�F[��ۓ�Լ1"�-y>4�Q�Yi3[�)��j\z6�|�L�I��9�J�ٌF)j�y��.?��=to�0,����v�
��łË�l(Oa�� �_X��0�ێdò~M�Z_�~�y��f�l���l�:�<O찬@�qD0�Ҿ$� X*��J��V��π��%= 2ycI`�^��ǥtɸP��隌ܯ�L�U�z��#L��k�����S)�=�	C!���J
��f���֥��ʪX�/��ʤL�}�g�"gÍGtMXy�[�)H7�p�щ�M �e����o^�G����b�1A�"h�	�4����v�����7ou�Mk��
�jb%A��^˱��	p!;��`��/x?k�}q�V_�+�/>!9=̶��*�R�N@�(!�-�3�<�"�8��\��"��}*�Vw\����;����b늿�ꆡ�ɽ�u��K������k�6jo�(��]�S���f��(C{&�^^n)������]jo�-	�P�q%�&4��-����%B�@��hϥT�i�s�%@�Ώg���H0�s ����]����,�=ŪXJ�"���Le�����{_�dh��H�Q(�]V�nٕ��ԥ�f�SS_�����A`:�*�SS}S#m�o�kj�ij�gj�e��1Y4L��[��V�<F��D��J�?   ����vG�.��O�By��E-�MQ��SԥI�.�FNI"� $�	��9\�_c֚�3�zc�M�If���{&H�v�U�j�Hd�#v�뷝��F��@�M�\Bȫϯ>��D@q����Gi�R㉥.R�E��D�z�]M�Gi*�M?��а�Pq�3�0lŐkQ�n�* � bf���d`}�r^3HS���^ƥ�!$������42�Z��z�1�����MYS&Tr��W�/��R<�[�Ir�IȵΥ��q�B���A��[���Ё�t�6[�ճ�4�Ҧjg)05��Z*1_ԫC5`j�,yޖ�k(K�/��Q�a�w=���^�p�̓�XΜT��ci˰���ߚ�PKOv-c����w��:��;+��$���KςO����+@��q���`aR��t<%/�+����e���P��e�<���u��9��9�+����
�����,�1<}���M��h�d�r�J&�3[�>%.���Y1&y��ż!���gGP�,���Ma{U��  ��p#`�Ph�	� �U��dVCrƛ���	�(I����\o��&,
ݚ,����Y6޻�n�^�J��<O^���{���Q��X�o����)���_j��8|B�e���6�P{�c�x��AW��4���y�y�Ӽ��F������s��c�4�|�iOx��wѥ�E�gP�z㘮��-$��'�Y]5~%a�V�5��b�f�Y��}1�L�@��{�4�
y�I������H.���&-T�x�[�U�]���f8�M�������6�S̮�9'��'�C������囓���p��}{�(�w|����u���<�+���p�P6M&+�_kQ���(�|�'" ɚ ��X);=�L��z�i?�yoJ8��+$� �8R��B��\L����Ķ����W^�ٍN�>7���-<�	�^�����-�7\�w�ٜf(�6�M��u����t��^$�h6�~R�;O���]Ɵ�'�������<��}|�B����#��d˘��HN9S��)isF�$�4_dc⛻����ZY?��x�
��#�bժ�R�dTr�m!�rV�!$���Ds��(�I��2��*~�f٨0���ǃ9��xZ���@6`�̉ȁK��cw�EIffO�eWE9�Sy�e_a���L�?�}Dأg��=-8���E��P<�i��x��Eъ'�G{�^5�rI?����UgRs+��P������cJ�!b���<�<�P~ך䷳������e��"�� �+Yc���3�U��_Ug>��m }?��E�ޞ]�
ikq˻�Pk��xOD荄��#�9��^�����r���<��qqW�%.��T�U�&����j������v�r�����,���Z4*���f	������������-�vͷ/�0++�W����vZ�� �N�`o/b�F���ͬ��D�-z`�΄B�x@��@�oE��sf�×��:��O�=���߻]-i8��d�8�M�"EcA5�/f B�A�b�m+P`(_�y�́���W��6$⩁��ؗ�	uD�U�/���Ϧ*�0U�=+�3uC3=��;9-���Kd�y�����e�&|�Dj
���r��&<����5~��mPN�.�����Xp�k�]���2l��I�I`l{uuS��B�S�vK�)0�/v{�Lƙ6�������Ѻ�|��4�R�� �M�[��/��ī�~+'�d��Q��?��zIt�����9f�?P��
��.#�)^M���Z�#T���e�(�T�^��U�Lhġz�7ʁ{��&�)�νP�������?�*�P<��s?ɧ3�6���>�]#z���q�F���F�Z��Z��/���:�e����m��$�QE��68fv�p����|1\W{��k���n��i������f��j�uТWW�e�:�t�e��_+�6�b��u����!�f��Ը]�\�yt�#�\�6J#��!C!�`n0͡c�_"��l~њ"�	�Ԏ�e���*���N.es��ٖ�<0S���nhI+��=�B�fgSը&�m4��)`f$�Ű�^�=�J1RU�P���{�����{p�\��(X]�Vgl�
��x��~�Jav�m��vV��fŹ]��ҡ"v2����M��`�Ǻ;<KV����q�{,�������k��Y�g�_;Oaw�	��ʰ�WMc?7=�<��ROLu���,��P�D�h�psCXdՎ>!� ��;��OE� �p_��#њb��d?���ְ�ɉ�6�#?��M}"�������1yy&˃�]��hȣd�U9@L�a�H%��jb|��v
�eSU�����F�)���
�Zq����#��G+��ۺ��w��\=�2@�lu�=
P�� ��J�w��D�e�k=F��`���ῄ��T�U���%0�I�&�ݻ@��xTxƲ#���(0"��N4�+ ����d3o�8"�s(0F�LC=�X�J��:���èH��t*�[E�xV'9�!PW�6�ʮ:;	:vʳ�#:Uɔ�Ƅ����cno��I��M��/�l]��V����~�8��a2�!�5��7�z�l�2���Oq:��S(J�C��kE�d���h`bS�~��T��nW�x� �ȑ/Q�ά��3�D�Iqɒ!�r)XF ��<��p.��7(��HPI�Ώ���~a�S�p���lF�
/�߾�=�֞y�b�{�6����:K9��ИE� �n؍a2�b��e���(����_�Z<|�f�T�X��WN�G�noI~���K�A�*��e%��j�:�(C�hu֚�=����a{���hN�[ѵN7�8p��8�L�.�wӈ�nz-�
����y�E��"��D)�/@�d)���^`(xCM6f�/9S�WӤhiQ�Ө�Ϛ韦 ��se��@�Y�kH�-e�@ Z��t�E�l	��4W�y��1��s��O)Z~��8�f�&�1� LR��#�@����X=me<*5�z�Q5�@]�i���w�a�K5̐�n�Auc��N�	+�Cڨ�����8��� 7"t�*�7��a�X��N��`>����"�u�}ˍkY�ǟ�Cl��K���0&��8&QR0�4K=I��p���G2(�+.����QZ7�dm���;k�D���fsLX�\q�M��Ѣ��?�	�aw��c���xc�Mγb�3�=\�i܆���Tq}�
´|J)�tqϵ�R�v�7��T�d*��!���'�Q��dP�Ǵ��!ɓ��:Ȍ'�./S����1	������[L�ptoPcL�y>%Ɛ��Јf�?�1��h���r,o(�g$�Bo�y�������,O�讨��S�?����S�q�(�?�l.�	�g���}0>�X ��f����"�v(��L�}���x�#K`t]>tt�g�D�.H�b�lu=��
���]dص��ΧϏ�1�CJDސG�SSu�2P�C���+�'t����Q|�����6���;}#�+�m�,�d˹�.n��@nۼ�U�w�v����	�ty��""xڙ���dXJhĴ�o�(F�D�.�^��2|�X�h+\��2�va)����z䣦�P�CT Qs1�_���x,�̠-�Y�j�[6��8a�n~ŷ��J<���*�P������8v$�&P��{
�-tm�����L�3�8KyQ�3���X$���?���O`����B�d4U������(*֋�<��G��\��ݛ�j�
ҷu�7�M�.Q�n;�)3T�"eǮ��E�GY;���-ʳ&&ׇd�WƶO΋�p�\���ꖹ�é����$Z :!����۵h˟e/�tMC�Ç�R���O���Äsf\�]`��(�ĉ�e�y�a�1�NU�e=5y���^�e[�cv:6c�՚��c	��r���h�~3RB|�)u�PJ'b�P5�~��K�#ꖡ�\w_�� C�t�>q��J����}�nc	���y�Y7Q�'����.��]X��Hl��-7'�b��wY�\��Y��e��8��=\깶,/�.�̲�K%Y���[q��<U�.*���,��Q�����<�>'��G�`�,��'r���<d��ğ�ߥ��K���.�-]TPZ��Ux���̗w`�f�����:�T�3�pcYW<Yl�]O�2�^��,ϙ�;�k\c��[7��4�sw����?�횮�2�ƫ��,���g��sq�u�`��0�|4�41�n2@��tcH���0�>�@kG���1R<�V؊k�m�&w�5�$����Yí�����O���&�kg�Dr�=Fj7l��U��^�	�;���&�̏P6�GڅJ��p�p�t�26�����l��;N̜�� ʔr�W%ӊ��#"[Y|m)�<>"�%b���i�@"{7&����f��D����%z�.P~܉{lFB,W�d���� cf"�0�`��'���#Pl7:�{��W�>^��.���2n�١��ʀ�i i����V T����2v�GXp� "p�����^߰�P� g��z\�3ۀ�?�8�<1���Z�mw���4s��z`��^h��w�k�L�)`�V��^3˓i�z���%Ɨ/̞�|�����|f����8
H"0�:���eR��&�k����p ON�p#=���t�#�^<��?����p��$L�jy��yH�G����(�G�����6�x^�rq7׬����al�T	-�+��/X����3���Nm��X��zS�aOAG����jO��=�0�V��d�,;٘[
*$��О�׬7�n��|�����d=����L�'牞�Ƴl�a��X���mD�$ꐧaGl%��a�����p�p6����Il���l�'q���gq�z71���	��ҩ��s���|*�	0���Z���z:�3,�g̵�\.D���g�/�nK��g�6�'����P�1�}�Y��3H�{���4�����#�X$�y��E�<����D7;%��<�t�`3&��/pF���������(:~]��uL34��V�>T&������E�n�}�0�s_�k�"_�w��i�Īm{S+Ղ�(W%D��.̯��%���]D��>�1EI;��N�b�/TSϬɶ^�K	j��=ka�z8c���	� ģ���<�ʓ�к���J�V� �<I�R}6���!�x*;��D�@H\S~ ���5 )4�*ʣ���J��_!�7��U�H8�+`�����qJά�P~uCڈ����(��,}�I6���W���<�Q�7
� ܋�W6������(�HF����
�wfN��$��9��>��R�% �k�"�m���[S��l�L}�=��b>�0�,]�M�E4ʾ;Z�]3��Y�VՇ�ճ)p	�=�5:K�h��-����I��4��g��HFS猖���S�xc�-P6�3Kx�d��*?��1��TTI{�',1'��
����L�y	e����R2-��/`o]F�X��d�1���<���T֭��[^��:^'C�ԋ�t�s+h��T	�&g�%���&�d�#�%zF�x�M�l^4�b�Oؔ�F���J�#���ӢBrC��`�`B��E%���a�Br0�6��3$�ӓ�G���O�@�X�$�E�W� 8&]z6������cꉘ�sUC�4�[/~-Q�,W*�4�9���Xq�K�J6P9�v��@�Tz���4�Fu?+�Qug+Q	�O�LM����*��o;b�ؤ���g咷y�mdi�#-��0x���}W3�i�P%�����+�R�zW�`�dh��pi ��Máw��ݭP0LW̼�O��ɛ9O>��`8Xd;��iԪ6f}.�b�+-ۺ�d�}?c[)p�p@�1-*�7�� v>Ŷ�-X�
�/�02������	jx�b�f�e�D�ylaG~��Y}iD�r�z�掵hm�R��^~Y�^�r�ٹ�J�:�0��t������2%�4�f��t�Ut�G{Qa�a�n=�ZD��G�/Z�	3�elF�7��y܅�w�StٲS	��|���Hoh"��KF��~�cVK�W»�t:����a)C5�qU]\�k<a	L���cyG~(��+sBqg �i6yg_1K#�?{�p��p�br�����{�@�5�IU�Ћ>9�6����%���,�s�3bGY/M����!KehB*+���}�;ʤ��C7;�kD.�x������*�ťS�$���d8�s�tRr`g�v�Y��������2
\�}�!�����g�LN\�2�'HJ:6�,�H��>N�by<�֡������u%���G�:%��x2��%O��C�2�,�5���Ito�q�ǚ	P.�V��X��@�B�t`������<u����ۧ?^�5vEлĭ��*��z�������Ƿ1����s��ʳ}��~����bԓ�ݔ����a��U��t^�)"���2����
F٥�>^��� ����6W�W0��#xT�iotG\�D�*��~��/_]~�8A��*���� ����+��ym3@���B,4BD�r�Ovy�HE��``����%ApDE�j?M�yW<Ѷ�i\�+��z�I�-y4/R���� j��f�C���p�}t�hN5iY�����̕��i���h]!zN07�t��<.��x�[�>;n{���b��� ��x��t�X� V�HN���[���ͭ!l�'@
��e��MF�G+����n�L�����n���%��h2�HW%}��yQ)Dj����ij [T�b�X�<��n�����&�el4����Y�BI�����������Q��
�VM��Ԛ6H*j�եU�V�Q�4Da��CL�;2��*0?L�0�'*��(�z̤�	��[�����x�h�l���^g˫m+!:�q�i�,M�0��-;��pF�4�c���L�!cd�d������vp�c��z�ɭt��0	�b]6?+��>Wc�ڀغ�Vf*I1U΀�T��h]��X8n��sH���[8�����1a��B�/Tq��z�Xe�yr����h���ˣ�_��Ns�o�ө��t��D��}Q򂁘3G�d�ǈq���x�i�-\1��Y��W$v��8�C��;�+����!��t�4��r����t@���?<[�<�_G�Lf�!�2� k38�&0܂��E��3'�׿���tx7�n�E�8���>'���
��2����,UKK�<�ǳO�Y�y��PM��KF�x��Rr�j�c�M���kC%�4^uL�N��Ε�:��r��O��ZJ�W>��^���`�Ҙ^!��4�do��_��<��"k��6N�Y��<��F�|;-���#�"��t!�J�+b|Gq�x�)�_���m�Z���"��>}g1��sD��=�L^Y��y�����yh٣e�'�ǿ#�z�<�*���-�[� ��|aT�3���_���cQ���(�<��SY>p��7�����j�2j�:*�@�Q�>��
%�nφ�dJ�j/e��3e6u�SK��,mj�N�%�9A��)��	O����3�����K%�O����2g��A*}h4��?M�GΣ|,2jꫢ�~|7^����"��K�I�<�f-'��png�8������z�;������:Nc�Pyd?׺��Vr��s9~Ъ1I��<d!�R�ϗ?�
]֝�8W_p��r�(o�{�������z����O�їi>f��k[{��}���,���~7jw�$Mh�I��?	Q����ͭ��`����2jEї�=�M�*#r����������U�{�*Oj��C�����aO--RbN-{>�l6y�䕋�>lx΍1Tނ�%K�<�f�	�ʄ��B)@h�uH�	g���I0��M��,еIr��|U~��a�m��j���c�qx]���#��F}�O$�:c�^��?[�e$����J�O�l�rp���K9��f?�ut_�N^����0�pf?����utF���_Z��ێA��	{}�18�����I��������(:?xzr?�^�>���v|v~�-���
Ds��7��/N��z����D$bT٫�''����36��1f�e���u:���7�?;z~��䜞����|�o�va-�d��}-��ZW���0GJ�s�]G' Ȏ�3~��w^:89?:������|������ǣ����������eC=9��$�FI� @�p��k ���d1ϓHx�Ҋ�@|fED>^q�g�#fa!78�X+P�{��"zv��Mt��������s\d���y�O`��������+�<x�L��[O�������psD+ʯ�����ӣW�Gg81�6��X�_^��?9�Myxpvx�쨪75X$�z���胓�-=���>��oN���o_����olG}Ȯ'��ܺ�G�oO_��(�����o��ӣ�_�т�u�v2s�a��~:~uvt
�������*���Zyrה�JU��x�#��t6�积_��D��O/`������J����1TO���5��ǯ~��Fc|��Z����Vȋ��y ��v��P�
���Ə^=��|�mtr�ꇷ?�&M��Kڀd����iI#6$�h0EM� ./���_���Y�]D�������$�)F�4i����mV���|6X�'oa3�4y���Y�I"7�U=�%A�}��	Ue��z��'����RG(H'��k��g�t6xr�ai����00��{�X�.�$�SI�:�KI��|%��̋W�8F�<Fo�`ޣ��h�5�-h4S1��8��fLv�'x����_D�/���l��i�߾yF̅�`pp��m�;��/ם�Q�,R�\��vKf�M��呱T����!���B]���&����UdNSJ\�ZA&碡KUDEs�l�xi�(��dm�p"��݁Eڴ+*�s�o�0�tͳ�~����b:Jg+�m��뼧 ���%}+�tj��S�W�"l��o���欭�^۹�Z�ʺꮤڼ{�j$̀�"�^.".�)�v�(��]�r��1�[�T����B���T_��AU#x�l���@�r"5����v5�}#��ߵ�S�����+n��DfX�`2^8��{2O��� ����J���Ƙ3@�Wن҄��~m[C��K8�d�؁Y��t3s"s5�&W˴��q��5�<SG*�3HaҤS�\��:�'�Pdՙ�"d�JД��>��Z>z�H0� ����r��Μ��펋�_.-�PC|�P��	|�<
;���wg��ժh�_�a�k����+�|��^�m��,kE��}5@�QZ��<��*zL"҇�o$�?��
Ai�I����b)�d6ur�"�^ݔ��`�M�9!�UG^���~ �k��->�|�"�iJ"�~��3a����5���z�;��9< k|��f���1�F�O��9����$���(��2��рՏ����~��#�M��j	5���7�g���{��W�&V���(ԡWX9�-��U��v�]�41���֌�>L�y!FN��wy#�J՚�(��a&?O�pZ�ߞ:����x)7�+������߶��y��Mj�F�7d'eڌ�w�{�����?:�G���WkQ�Cs���p�zm��H����o�+4Y�HB{��~�S��k&Ӳ]���0����:	����5��U��^�����ka@Zh��&�-�,�l�tC��kT��������m���ԔG�Y$��/�D�+Q*�0�P)��@�T���VG�Â-1j�hN���;���e��z@��� eP�/�%�\0�}�#!��;�|�v��������'_�9��߳t��,hXt���#�Oa�LɝqJ��4������hu4A֔q���bI�շ�S�!�+M�
Pl��3���(�z;��������1Gk���*�a�����:�k�~+��2ܽO���x�:�.
e�k@>�<T��]��0ώ|������&�Gg\�'c��c�����$�~''����e�3�6��;v�b������.e�8ܱ$��ޱ,�����X,u���o�����3�U@Ν�2�8Y�_UX���|:�SL�=�G4�#w����
<�P"�v<�	�h%B�X�j�Ȫcglv���u������� �ѝ��GW}D�EZvz�L�a�9<�����$�����u?0���w��B7�K�-��b(ܲ�gxs�yyѢ/jU�L���)VK:����_b���v�[����k�۬%a@%� �U������Û��0�%|"M���d���|�]0j�g�(-`��������o��ԞNu��*s+��QU�Xg�a�"�lgHw38N����,�L�&�q�A	�K�x��+��E��#DlQU\��ҕ�Ui% s�����z"�n)�,yA#	7oZ�����	B*����%
���|qτv�;�����b��bim�O�ܠ���$��I4$�J�p�iR�Q�Dr����l4����t:]vh�=�}f2C�� U�����D�:�J��\Ƥ���n�:M��'��)tnҔJУR=�9�Ϲw��[�"e�$����;�*jv�:,m5H�{0ae}�N�,�$Aj+!����4��%�q��[V�(
�Yx�A�*��75�D�m��+"j?zW��=��!��ȹ�4���.����K*��)�ܷ�]�د����Q�R}�0Œ9Z\`�㵣MA׆�f2&WT�!��Ȩ�]�4��~b8m^����7��xd�9�@Q���0�-�VA�?�\fv���*�w�fFr8��!K�B��E���j�� �SL6B�&n����X �.�e��h.dz��Vo5e�!d��V���� ��l�p%c��j���l5|㓤̨vJ�JQո���-�?m4z��T3�jĥ:Oա�f�hw��9��ި�ڪ6�ؑ2�\ɬUC�$z�q��@'���&BDR���o�WW�d'
��n�
� �3Y�a����j���sM�R�W��䩩2�
�����:]�Ȑ�e���<���&S.)��F,�SS|Vf���E67���.;�6�kV˴����M�5%�#���ì#^ ���n��Q!J��8kd�)b
��R(���ގ20>��wR�W�����H�i�����<�~�8��;���� y5�UT�{���y����a���nѓǇ����m�W�W�&�2Q|�˻.S������s<jum�:
C޻�����ޒ	��-�"L}qi	Ek�瀙�,h`M��Tp��͇>�!r9�h=s&�	x9j��"9Bbd"�rc/�&�*�S�u��d{�'Mp]�~��aU'r��U��%�^8/crs���w�íƓ ��پ������Q��M�fv�z[�`ík�"x+��!�9����m����C�.��[ 7&��$��PQ̤8s$�~�������5�W�9�ʬxH*�22/A��N�a�/ޘ��"$��H���D�!�|&2���$��A�}�W�9��f�,B��
��&:u�A>�^A�O�M���m3��Q�L�r ��$�N�$3O+��U���o�� ��>P����i��cC���yj�3�e(�'�n�{�� �a>q�u@�Zt�=n��=@�V]��up�xC�
>����+�)7�o��$�S�MN	���_"*.7W&��IxK`K�`p#/�[:2@�vT�F�7C�;c�94�ETf!OX"{�j��NMȭW��e��'`4
)vzL(�Ԫ5��Tebyr�7yR`��Ԇ#*�[�1���Hh�l�-��mpN�QV�����e�����6LV���N��||���s��u;(7~&����U"�!�׳�3~��m\��K�����gҲ�l[������WCɇ��Gp'^��s5�uw7��H�l�'�������c64S?�5w^'�nIp�nR4�ϒ��e��0B���P#_%�����j�K���5�I������d
�h1�����$ϚYd�k-���l�'�6��,�E���`�{�&,uX˦
���Te�l��
G��:�[ߋq��{�����0� �a���&%Kɮ��g����8�����q6���e+ F�Np��K�/}�[��N��gP��N�����Z�\��o�
��/�Km|s��u=���n�J�#9o�������폍�izNX�,�T�M�c����q!��"E�ԡ�F�Hq�ro�[��%��'UN`�5��Kl;��aHT.�H���y����&�"�9+�Q��Z���7Z3�x�~}�ǝ�6�p�s�n�gQ��S����E>�iɸ�Csi��8�`��Ө��ܓ����7�r)��ضUir�d�4���~ef+ �V�ɥRWnyq�+����}�Z����g'�>���8�����B��yʺQ�٧y�q9��/�|�[ß�y���5��$����$�4s�P�?�f�}� �Փ�|�'�wUHs��=�G���/&�\h+��<z�DN:g�~n��Da�h�Ђ�KDZZq��UnV��F&�K��/�sSS^�!�V>�)S���2�qp�)�:�Lh4ֈ%���3>�X^g�t1�.����a��rC[&٩[c�
3m~Ȣ����u�]� �E��Sd������ 1�++S�⌰FW�2C��V��|���~j�0�5U��s���k�."��*+a��U�yH�>�.d��M�V+xŧ1U��4~!ӵ`�����P��ټ`��)Z0B�cL*�6��${���U�'��"�ʹ�W�[�y�n��#nٶXo�n���>1S�t�I�}�&T)h�n��]E��ޘ'y���TD׸��D��Q3�c�󾯟Bg����P��x���Uz�˰��d\��E|�<�ur���ew,�H�7��8�=X԰�T�@#�å�UĹǚ�ʾ�@"}s� ���������E(:Ae�l�c����������}Meԗ2�h$�ٻd���;���m	�?Iv����^�➭13�c����ɴ�O����ǙcE��M��#���&�ow�J$��u�Ā�*��V?�����T��1�㳪�6�|*lKbzpқ-�P�*Oq�SDM����Cq�k�<�q��;W��D�"ߵ�ok�;y<0U�Hrk�u}��~�y��-���u���g�\z?���u�H.�5N�� =���9"�GȸiT ᩪ"�������g�Ǻ����2G�Ƙ�z���4��'�K4?��b�k�nsu��z���lͧ*?7V�!�>0>T��J����!���}m oyݜ~˲1z9�a/<JK�ou�J�%�4����3�������8��K��~Л�y	6k�K���T�hɭ���6P���pc����H�d-����52ڙ֓�s�G��4���J���P�5h�3?u���O�c�B�R�jw��"j��(Gt��c������{���89��ͯo5��@�rm�z���8�鄻K]����VRvS���d�j�+H�o?c~H��kiN��"~/!Bl�?h�X"��yo�����a�p��O�MsO���m�d�+��A��-U��>#�y�١�d!�����fs��v���x�,���S��K.��z�X�wݵ�������{f,���@_�+%�Cְ��gi~l�R���~T/MP�ruf?�+�C����ZTD��!��?*j9;�F*�-�rWL��o�/5R*T_%|��pLq��՛B��5���=�9[�X�)��f��/�XA7rUI:���e�;n-?��M�g���M�j$�[��i�����Z}������ȵ2tt۝je�b1�3^�w��;� y����g5�%�3�V�ؿ�"����%L/|��MX���k*E~���Nӈ�WPZ�BT����@�97�{���豹��'�۵K�N�F�_C<���<1ې���̼���q��$ʽ�	��^�������p*-V��,��_���/��߼��<��x������kQZ��g<l���0-j��w0�R�Y�+0���H��߃��դ?fL��`ҫ��zܴm��\�,��������^��Y�j�jX7*~�	y?}��\m|�>�Q���1�~���p�R4{���VՒG� �(�K�U%T��
�(�,�i��9����xr��S�>��\��3u�;��2�u�������r�O0�	�蝻��WV����y+P>X����zb_���V؊7��M�~2��gl�q�q/��x� Sz����v��q�X���U7Ԗ}C9��0�L�>O��͆
!34�Kp=\��@�5(��!v���Hq�S�!d9���yQ04r�ƅ#R��D�ޓ�l�(D􍞔ۧ-w�l�=��Q��_-o/B���y����MU����	8�(�����T3��]���7��ʸc��+�l�d�;*.��@e�~D�%\gL1�7o<`Y3�6F|
a��-v��|c��Ӝɳ�x�c�yp	W\7�RH���L���Q�'�@�������51]Vd���/)&c;���@$�DO�������E�����Qu�F� ���Jg-�Xe�%�\#d�h3O��E���Ѱ{���~�$���uqL�d�+g���!۬2��8Z��;=��/��lZ쮯��ώ���z<M��q{��$������2���kE����w�~������l���������$w+F�����W��j���uI����E7D�ؕS��1�A՝q1IG<4h��Y�$����W ��̒"���e��$H.�NH��
��LX�!w��gT����x&�Bp������l�`��o�Y�� v]���h$���fecnQ���m��*���f��� ��>�zc�����Yv�Y�|� �{G���-��`F�A��o�9�:i�y��п+5KՊ�:��:<ٖ�x{�.��]���,��Rn�
5��&`V�`?�*�$��^��n�7�Z��(�$��k�l�m�[ʃ��G��mt۫@�h���EbY���eϐ��iP�Sͷ�gI� :��8�˹�a�ձ�p,�0n��x]G�-S��\�2��R��/%�g��/�=k#�
1w�"��C�N�Ff��Pس�a��AU�������븻�R�EĲ�F��X�I���[d�ɓ~Rf�+XX2�KN�YM2a^�zb\,��������ˋeuQ�fB|t��q&p�DW&=���}�帰�@`0Y��"~�+�+a��F�T�hr�P����7��W("������t��s�8ۈSuWW{C�.����콖��k9.�M�Z�&��PU���˔�t���>>�/NjM��i��4��'J�#�т�ʐ���
0^!=�d��,լH�x/�m�r�.�|P˂�Хb��+��غ�z%���[-ZE�����(����\�T8�ލC^���`����PyV5$BQ��~�b?ƙ�~�����^�p��˘l����q7:�<�v娨���8��4�v�ܺȓ��f�K��/y����~(L�B��Y����Șꡛ����N�P�x�CA�����W�T� ���sໂ��ksv���Y4th��BX���D��E������������C���\y� ��uv
�vr9�f��{]a�zѺ.�Ӫ���䄤���m�;y��<��9���m�W��?���Γ��.[�UY�v;~�=3č����qf�{'��cw������؞)��u�ˏʓ��o�'��a�L��ʁ��#���ȕ���{[/��i��/L�9W_�������Ȓ�Dt��n�-owmo0�G�1�����~�v��|��i��|�p��&��:��ĉ���E{�
���Q1ޥ����z��ak}W�?�$�
'e!�2e��2��jY8���7oJ%���p�љ3��-P���a*~�^��tJi/0��<OFw�8��~��X�ި�l��X�d��F�u�:�k?�ut<)�V��~���>��J�4>�n%Q/��%�Z�MM߄ISİ!����|j|\���g��@yz��[q��:�=�M��-���%�Y�4KZ=�vσ̋�rqw���(��a7�m�1��/����=�U}MۨKh
���$�=��J��M��v�_L}��er���\�w�j�/sqI��Շ3¬��!͸-F�a+��)ǀe�q��-*�,�^8�+�����r��/�%L�O�rQ�d��ƨ7��7���qS�y.��4΢�ܕpFi%���ݎ�g����g��\}=LFc��y<��;+g�"���c�i��I4�(��/���3�f��js����Ŵ?���0�0�
�d�D��ŗb �CJ�B�\���d2؏^ ��p�h�^Q���S�Q�j��x4���5���:j� �%�0��8���)t$�J�����2IFd�G��q�_wA܂̝�wÏ�� ���O�i��O��}N�G<J�p1X����� j~��:.&��f@�PJ����Og�+A�PL�,�u���+�Ǔ$�^ K�',s ~B�����$�>_|7�Tdr�N�L��P�pH����3���4���S�7I6�����BN�墸�H�֬@�_�#���X?�gj�w���Ec:�U�Q�� ~�_�����
��p���l�П�)�������{v�Y��_'p6c�妴�G�����#�PH�p�.��2���� 9�k$�n�LWOU��I3Y:��!
�5F��fB�g r����؂0ɠ��/�a�讻bO#w	�1P�P��N1z��5+��6���]�U�)]+* 28/S�:�}��x�a�rB��)�2B�2��Q:��I�ч��dVP��XOp�א�P�e\�w��xo�K+*28@�������{�]�5�K������Ƅ�*Z�A
�f��,2U�%��.Tyy��3����OxGiB�sJ�A&t��\�nVhs
'"Zb.�x�Mc`
D�Z�ښ�܅[H2l��¼�"|;���ܤyW~��~
g�^2��T^!��H�^�7�^�C�p8ϟ�b��}46 񶸯Y���Č{�ĭM�IH�"~W[�%%��&��4�bX�����2��0�iL��|1 9`�^·�Ha��y6�X�O4=�d0�����2���%��,En	v�EΖ�*�D��@@���$�"��u�N	^Y�tD[b�������]�RB"�&dOR���#}�D.?�;��w|!ٕ�@���I�¥XE|��ʼ������9�|�l�v.qǇ�s�~o.�>a��Fq��H�����H�2���VM�D�]C�A�=f*�"Z$����k<8E��U�rg-��F�mZ���y|�9�}x�؇P@VN����Wa:�����U��LUv��3�m���kV�\��?~k����I��[���V�	o�4���-�7��_��W���Ԙ�O�h>N���t���=�Ki���]���Go3�`2����)���Vr_�f���R��[�֍�e��>�<v�̇0e����QX3̐6����!�ݔ�|3�+�P�Y�^�[��]���PB/�Q�������̽~I�e7�I���x�ѷ�kA1�7��	�~�$s؏���W�3�ڹ���Cs1� z��sA�Ǩ?8e��a�U7����a�Tˉ̊-cA7�����j��κ��==�~9G�\�@�͠�秄���)b������K��\� ��t��X�ϯ|�CQO��x��v�E����}���.H���v����J�AN�W���ڴ��$����n���
��6�JoP���jYl=Q�" �p����M6J���.?<�����qt�
*k)�w~@E�B�%�Ƈ��Ǫ��Γ|\D���: �QV�Q�f�{eUo��,T��!����m5F�}Ls�����5����!�� z�#����Y��k����P�ǝԕ��]��ފh'� Sް?��1�����&��j�1����K���2�^F���|>��� ��n�K^J^�僻��Ң-߂$@���ۚ7����NI�ٸ�EL� 뷾5j���O��|�!X~�#�q�1���a�2�y�I%���Ǩ/-1C��t
/n�����.�0-p�� ^��Ϊ�p⒠рX�(��mmp�b�;%��*��u���	�����8u/�P"��t�a�T��+�iKL��h%�%diQ�����D��$�}�ɧr:_���lnN��~���;��TI���#�	�b�E@II����'HyP1�p�׍�?2\�C����Uf��+��ߕXU�+�	M,M��'D�d�w��\�;���l:�[w�I����.��:�o(�w�W+�������8 0Rc�x�ws��ݨc��sڧ�ֵ_K>c��J��y�"	(ww��8c�N�u��`Ά5=��K`����џ�����/Y����lR-���m�)˸������E�J�.�se��x���d+.�r�k��7dl�ɑPbZo��&7e��}��\�ؘ^��7BJm3?G=u�n�12p����(�g�yO����;�c�g��꼫q���[8�s{�l^�`�v�*p�[��=!ѫ��I�/��~i-iņ������n�k}�S|X$��h�(��:�̔�FV:V��ޏh:I?%�u�8��R ݏ.3�%B�6#{�ݹ���99��:�k�����e���O��d ���	㹪p-�5�M�,m��-
���%�W� 5wa�(�Q�� �����ϸ��,�,B��șy�O��h��z��)\�܎������<A#&f�D��F��� g뢣��@����,NG��^��Yƭ�؁	���D_���O��0[eԘ_��o����.�G�q�����˙�f؁�{1M<��zP"<�c52�dOώN�Ώ|�p�2� D�J!r�s����g��pKA0a`��nA��`s�� 4$
�Y6;�v�����d�����٥�[���Ḳ�W�R:A�ߔ���j��������T˓���a��L���OC�MIz�.⣗}�%�0��7�<q�b�x��F�������F��f�2m�u%̝����R^���`?���$���nCw���g�iL��f������7����Tτ�%V�����!�І�dr�rW���3lm�Dt�يb��r8��N%R�M��謟��Y;O�|�����uX���'�`*8��<	NME^�,��#A�Y����E��u�be������AH8�4����J������J	�#�`��5��;�����.m�p�X�7�+��i���4y�'=;��L�a$< k���O�f싙@ǈO BF�r8L����P%դp̮N#�>l]T�����Լ5ǖM������}��U鎃�?~�|�I�<��׶��IRǠS�U�!�8T����ڞ��xS��E��.G�I�A-xpW+ƨ�8�R��:��e$������.rW�%hV��vl�M��Z�y�����[��r�$_��&��3t�d���c5q��S�����{��17����"�T�����y`���Ar^ہ�[q	�@��Ҥi�-PA~	����#P�� �\;�0�����bp��J+�n���=�x���7yR����#_�Ż�����4�����f��N�Ik����j"n���I1C��
����j�~s9�0Al^$gX͟+̧f�'����f	c�,fټ?�H���XF�����N��#������f���*r4,��lA�`w׹�\IvaZ��l��#�U�:o��#�ГDq�8yr4J�+�{��+<�2W������Z\m���,�4g,���LglYY�$=D��IR��9���5:+��1G*�F�.�(�|������E2G,�%�@���F�6������WѢ���g��>B���&�as5�JL�z~lO��P�%8*���Nms8X��[o��y�%{d�n�UrW-6m��x�y�������7�-��R
����r�;~�u����}_��qC8���X�����Z�at=<�A8��]�Ǡ�*�Ҹ��G�}Ǯ�؞��R�� ��D�g��r��{���Jџ�E.�*e���g)��q�lw�G�������,���KW�o	;��<�*A���Ih׏�C�@� Xc����h �_��2�,Oè��\U69O��~�]�2���E�^Z���'?�F�u�[���	����lT���W�_��1��Ԯue�����5Ϲ�4�k��*�\��c�
��_�s����h _+���v���/(դx_�"ʲ��п��A�T�_V�1Y�oѭʄ�n��Nvݛ�˪:��(�(|��ϻQ����Y�����g͡D8�8ʔ�'�0����l����0=�����Q�����x�粱=���c��M��՚Ɠ֢���L+��g5�����~F�ƅ���%ń�Z�hڦ� պ���:�Q%�|Z)�ˤ�<C�f�M�"`�W��u��8�%_�xسm#ÆB;l<�!	Þ��|{��J���;��/Z�h$�y2�o��\d�Ό�p@���J����{t�tJ!�mt#�EEub��agͰ����N&v��I0zoNCR
ym��ӟ��R-�y��:���-w42����n[�3�A�n�-d�x�:E%_R$�?��5�9�

Ɉ'{��:|W�%���/���q�U�D��e�sF�YI�R��������Z��5,C�ᇣ�KVT&��k��8�֠�+���vB7r�9o���,9�G���W4�h�-��#!�#���ڜ���>�[S�(�K�%R��IMb�ii�����q:b�N8r�JU���
o+F���.m�t�ѭ"�ȉ&�d����{ץ��vV]cL�=l!�;H��Qo���(��ï!��hm��a�4)������F�4}A��5�" ĬQȞ �%���P"�P�/"��Ƙj=C�]��S1�ZC����x�]s��r'R��=�<P77�|�=�b�P�^ڶ�뚢-#�Y���3����uK���'P�b��m��볣ɨ�)@R��w�E�b{��������G��8�	�@H,מ./�ò�u�* X�W�'���6����n/���TU�Q�N��N�՜6�݀(h=�ۣPN�ݲ�?TZmᬮo��>e�͎�s���1�l�N'p��p�g��y���:k�E2�?�Yr^1β�d�p����#��:�^2��G*�_�����/�5o.s�#*�g�QD��pv��9L\�ìf�W��d��;�%�غ�$aI:gvI�i��E�|�2[����r�����s>����9�<��'���0�X�N����N�=�eJ���*l�U}�p�
�oFW���M����e8(�h��g�(������6a��q�.�I �f�*�p�,��a(��0A� f�g��!e�(L!e ��ɭiX��_�M��b� �1��	��4=���� F���ٴ�]_���n����c���f��83�5> �3�h���טd�4���O2h�$�h|�#�3Y~��vk`�I3wY�g�6�'�r�i��j�~��W]��x�d�՚"��ۡ�U���\��a��f�q�'>1��z:�~����������%��O�u����=Vʘl�8.Tg�bY���_y��cn3�T�Ţ��OW�/� �3O���+��q�et��R�>����fZ���S��P6!G"�r�I����I����^�D	����Z�OWg�eWٳ*���]	�K.��:���U��s������_�z�׸�G�)�$K�T��0J׮{�H'`�P��3��Kށ��Yz�}�kt�N���m��&�LG#'��lφ�`��r���~����~��kml���v{���ن�;����N��i��ۏZ���n�!�𰵹��nml��Z=x��f{#�u�ǝ����uZ�P�׃���k�����tᯝG�^�?`�m�H�Q{:��{�����6��-�Y��:���+]��6��V_ǚ�_=x�m���H�E=�|�QA���m�V��|��C�Z[�`.ே��nKl����.e���n���������ko��[�4���f	j��~�ً�8%�Q'�fzcKlЀ[P�������AQ��.>{�o���6M<t�7O�0��Hh���q����������Ha��AhRw)5�T0�MKˎhh�v��IU��e]���T�T\�HQ�WYv��D��\�����`��nev�/u+�9h�|Ը8:��ϣׯ��\����y'�/}'*��|)��No��D�!p+�չ���fog�9�D�d{�7O{��y���am �pm�w:��͍Op�t7�����c/u�=^p��=jw����׍��	����	����ÍQK��[Í��qc�`gk�����W��݇����M�bC�F�o�����p��kom����nl������\��u�>:������a�.�m����C��z8��[;���S�ۉ�t�5��)���N����O;z�������~{g��7�0އȇ`g��>���h���?�j"L>���ߥ���FJ��E.V����D<1н՟bM_����+iO�pM�	��x>r)�D�=�Q3���(5�ӥ�t���'5uev;�`�m��ր�� �؛2 j�f{Β��&�U�ˍ��{�A��&��������-�ܣ%(�{�-�Ɍ���܃}Yv�~#ظ��
���X��G�)�W"��f�e�:��jm9*z��{�n+|�%�thwc�ֶ��Dqo)(��p���wx�ŀ����@��wD��I����D ��?1��T�|9��uȾ7�������F�կ�Oy��ҙE�j��|�'���ٵD�N�y��q)��Uk��?�X��^<�C�=�7q>�$y1L�ΑT�V�/�Y�c
�fA��N��k����v��<����y�� �T�?��o����������$���!A]EW������$�W��������緯N^���Y;:89�N�xq~����5#O�G�����{���e���F��-o��Jwf��wE��XR:e;L���:s�*=��   �� �y�