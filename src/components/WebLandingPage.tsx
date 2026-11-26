import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  Globe,
  Heart,
  HeartPulse,
  Home,
  Instagram,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Sun,
  Tag,
  Train,
  User,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { Logo } from './Logo';
import { RotatingCylinderWord } from './RotatingCylinderWord';
import { RotatingPlaceholder } from './RotatingPlaceholder';
import type { AppPartner } from '../services/partnerService';
import heroCityImg from '../assets/images/valencia_hero_editorial_1795634116923.jpg';
import socialEventsImg from '../assets/images/valencia_social_events_1795634120123.jpg';
import cityGuideImg from '../assets/images/valencia_city_guide_1795634119504.jpg';
import stuffCityBikeImg from '../assets/images/stuff_city_bike_1795643319057.jpg';
import mockProClaraImg from '../assets/images/mock_pro_clara_portrait_1795647753752.jpg';

const APP_STORE_URL = 'https://apps.apple.com/es/app/mycityunlocked/id6780855463?l=en-GB';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=app.mycityunlocked.twa';

interface WebLandingPageProps {
  allPros: any[];
  events: any[];
  allArticles: any[];
  ads: any[];
  allPartners: AppPartner[];
  highlightedProIds: string[];
  highlightedEventIds: string[];
  currentUser: any;
  userProfile: any;
  unreadConversationsCount: number;
  onNavigate: (view: any, params?: any) => void;
  onAddPro: () => void;
  onOpenAppMode: () => void;
}

type PhoneTab = 'home' | 'explore' | 'events' | 'guides' | 'marketplace';

const PHONE_NAV_ITEMS: Array<{
  id: PhoneTab | 'profile';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Find Pro', icon: Search },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'marketplace', label: 'Stuff', icon: Shirt },
  { id: 'profile', label: 'Profile', icon: User },
];

// Curated city-agnostic mockup data for the public landing page app screens
const MOCK_PRO_PROFILE = {
  id: 'mock-pro-1',
  name: 'Dr. Clara Moreau',
  company: 'Central Family Dental',
  category: 'Health & Dental',
  rating: '5.0',
  reviewsCount: 18,
  qualities: ['Responsive', 'Trustworthy'],
  phone: '+34 612 345 678',
  whatsapp: '+34 612 345 678',
  email: 'clara@centraldental.app',
  languages: ['English', 'French', 'Spanish'],
  location: 'City Center · 5 min from metro',
  about:
    'Multilingual family dentist offering gentle preventive care, check-ups, and pediatric visits in a calm studio.',
  image: mockProClaraImg,
  review: {
    author: 'Sophie M.',
    date: 'Oct 2026',
    comment: 'Warm, thorough, and explained everything clearly in English. Great with kids too!',
  },
};

const MOCK_EVENTS = [
  {
    id: 'mock-ev-1',
    title: 'International Rooftop Aperitivo',
    dateLabel: 'Fri · 19:30',
    location: 'Old Town Terrace',
    category: 'Social',
    image: socialEventsImg,
  },
  {
    id: 'mock-ev-2',
    title: 'Saturday Park Run & Coffee',
    dateLabel: 'Sat · 09:30',
    location: 'Central River Park',
    category: 'Sports',
    image: cityGuideImg,
  },
  {
    id: 'mock-ev-3',
    title: 'Sunday Local Makers Market',
    dateLabel: 'Sun · 11:00',
    location: 'Arts Courtyard',
    category: 'Culture',
    image: heroCityImg,
  },
];

const MOCK_STUFF_ITEM = {
  id: 'mock-ad-1',
  category: 'Bikes & Mobility',
  title: 'Vintage City Bike + Basket',
  price: '€120',
  condition: 'Like New',
  type: 'Sale',
  delivery: 'Pick up',
  postedAgo: '2h ago',
  sellerName: 'Marc L.',
  location: 'Midtown',
  description:
    'Lightweight mint city bicycle with front wicker basket and rear rack. Smooth 6-speed gears, barely ridden, ready to go.',
  image: stuffCityBikeImg,
};

const FALLBACK_GUIDES = [
  {
    id: 'g-1',
    title: 'First-month paperwork checklist for newcomers',
    category: 'Paperwork',
    read_time: '5 min read',
  },
  {
    id: 'g-2',
    title: 'Public & private healthcare registration guide',
    category: 'Healthcare',
    read_time: '4 min read',
  },
  {
    id: 'g-3',
    title: 'Best neighborhoods for families & remote workers',
    category: 'Finding a home',
    read_time: '6 min read',
  },
];

function StoreBadge({
  store,
  variant = 'dark',
}: {
  store: 'ios' | 'android';
  variant?: 'dark' | 'light';
}) {
  const isIos = store === 'ios';
  const href = isIos ? APP_STORE_URL : GOOGLE_PLAY_URL;
  const surfaceClasses =
    variant === 'light'
      ? 'bg-white text-brand-navy border border-white/20 hover:bg-[#E9ECFF]'
      : 'bg-brand-navy text-white border border-brand-navy hover:bg-[#16204f]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-3 px-4 py-2.5 min-h-[46px] rounded-xl transition-all duration-200 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${surfaceClasses}`}
    >
      {isIos ? (
        <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-48.7-22.9-76.9-22.4-36.6.6-70.3 21.6-89.2 54-38.5 66.7-9.8 165.2 27.5 219 18 26 39.5 54.8 67.7 53.8 27.1-1 37.5-17.5 70.3-17.5 32.7 0 42.1 17.5 70.3 17 28.7-.5 47.7-26 65.5-52 20.7-30.2 29.2-59.4 29.7-61-.7-.3-57-21.9-57.5-86.8zM286.7 82.3c15.3-18.5 25.6-44.2 22.8-69.8-22 1-48.6 14.8-64.4 33.3-13.8 16-25.9 42-23 67.2 24.3 1.9 49.3-12.2 64.6-30.7z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
          <path fill="#4285F4" d="M3.609 1.814C3.224 2.23 3 2.807 3 3.43v17.14c0 .623.224 1.2.609 1.616l.084.084 9.613-9.613v-.228L3.693 1.73l-.084.084z" />
          <path fill="#34A853" d="M16.482 15.17l-3.176-3.17-9.697 9.697c.473.475 1.22.545 1.954.133l10.919-6.66z" />
          <path fill="#EA4335" d="M16.482 8.83L5.563 2.17C4.829 1.758 4.082 1.828 3.609 2.303l9.697 9.697 3.176-3.17z" />
          <path fill="#FBBC05" d="M16.482 12l3.41-1.968c.84-.484.84-1.275 0-1.759l-3.41-1.968v5.695z" />
        </svg>
      )}
      <span className="flex flex-col items-start leading-tight text-left">
        <span className={`text-[10px] font-medium ${variant === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          {isIos ? 'Download on the' : 'Get it on'}
        </span>
        <span className="text-sm font-semibold tracking-tight">
          {isIos ? 'App Store' : 'Google Play'}
        </span>
      </span>
    </a>
  );
}

/**
 * Realistic iOS App Screen Frame mirroring the real MyCityUnlocked mobile interface.
 */
function AppScreenFrame({
  idSuffix,
  activeTab,
  onTabClick,
  disableScroll = false,
  children,
}: {
  idSuffix: string;
  activeTab: PhoneTab;
  onTabClick: (tab: PhoneTab | 'profile') => void;
  disableScroll?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[328px] mx-auto rounded-[42px] bg-[#0A0F2C] p-[9px] shadow-[0_24px_60px_rgba(10,15,44,0.22)] border border-slate-900/15">
      <div className="bg-white rounded-[34px] overflow-hidden flex flex-col h-[548px] sm:h-[564px] relative">
        {/* iOS Status Bar */}
        <div className="px-5 pt-2.5 pb-1 flex items-center justify-between bg-white shrink-0">
          <span className="text-[10px] font-bold text-brand-navy tabular-nums">9:41</span>
          <div className="w-[74px] h-[18px] rounded-full bg-[#0A0F2C]" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-2 rounded-[2px] border border-brand-navy/70 inline-flex items-center p-[1px]">
              <span className="w-full h-full bg-brand-navy rounded-[1px]" />
            </span>
          </div>
        </div>

        {/* Real Mobile App Header */}
        <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
          <img
            src="/logo.png?v=3"
            alt="MyCityUnlocked"
            className="h-6.5 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
          />

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
            <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-300/60 shrink-0" />
            <div className="flex flex-col leading-none text-left">
              <span className="text-[10.5px] font-bold font-display text-brand-navy tabular-nums">24°C</span>
              <span className="text-[8px] font-semibold text-slate-500">Your City</span>
            </div>
          </div>

          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5.5 h-5.5"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`bellGrad-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE066" />
                  <stop offset="40%" stopColor="#FFB300" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
                <linearGradient id={`clapperGrad-${idSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.25c-1.1 0-2 .9-2 2v.45c-2.82.57-5 3.06-5 6.05v4.5c0 .65-.28 1.25-.78 1.68l-.47.41c-.6.53-.22 1.54.59 1.54h15.32c.81 0 1.19-1.01.59-1.54l-.47-.41a2.24 2.24 0 0 1-.78-1.68v-4.5c0-2.99-2.18-5.48-5-6.05v-.45c0-1.1-.9-2-2-2z"
                fill={`url(#bellGrad-${idSuffix})`}
              />
              <path
                d="M9.5 19.38c.4 1.5 1.76 2.62 3.5 2.62s3.1-1.12 3.5-2.62h-7z"
                fill={`url(#clapperGrad-${idSuffix})`}
              />
            </svg>
          </div>
        </div>

        {/* Screen Content */}
        <div
          className={`flex-1 bg-white px-3.5 pt-2.5 pb-2.5 ${
            disableScroll ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'
          }`}
        >
          {children}
        </div>

        {/* Real Mobile App Bottom Tab Bar */}
        <div className="px-1.5 py-1.5 bg-white border-t border-slate-100 grid grid-cols-6 gap-0.5 shrink-0">
          {PHONE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-brand-blue bg-brand-blue/8'
                    : 'text-slate-400 hover:text-brand-navy'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[8px] font-semibold mt-0.5 leading-none whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Home Indicator */}
        <div className="py-1.5 bg-white flex justify-center shrink-0">
          <div className="w-24 h-1 rounded-full bg-brand-navy/20" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function WebLandingPage({
  allArticles,
  currentUser,
  onNavigate,
  onAddPro,
  onOpenAppMode,
}: WebLandingPageProps) {
  const [heroPhoneTab, setHeroPhoneTab] = useState<PhoneTab>('home');
  const [eventsPreviewFilter, setEventsPreviewFilter] = useState<'all' | 'today' | 'weekend'>('all');

  const displayGuides = useMemo(() => {
    const online = allArticles.filter((a) => a.isOnline !== false);
    const highlighted = online.filter((a) => a.is_highlighted === true || a.is_highlighted === 'true');
    const rest = online.filter((a) => !(a.is_highlighted === true || a.is_highlighted === 'true'));
    const combined = [...highlighted, ...rest];
    if (combined.length >= 3) return combined.slice(0, 3);
    const needed = 3 - combined.length;
    return [...combined, ...FALLBACK_GUIDES.slice(0, needed)];
  }, [allArticles]);

  const getGuideArticlePreview = (
    article: any,
    fallback: { heading: string; body: string; bullets: [string, string] }
  ) => {
    const rawContent = typeof article?.content === 'string' ? article.content : '';
    const cleanText = (str: string) =>
      str
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!rawContent.trim()) return fallback;

    const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean);
    const headingLine = lines.find((l) => /^#{1,3}\s+/.test(l));
    const bulletLines = lines
      .filter((l) => /^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l))
      .map((l) => cleanText(l.replace(/^([-*•]|\d+\.)\s+/, '')))
      .filter((l) => l.length > 6);
    const paragraphLines = lines
      .filter((l) => !/^#{1,4}\s+/.test(l) && !/^[-*•]\s+/.test(l) && !/^\d+\.\s+/.test(l) && !/^!\[/.test(l))
      .map(cleanText)
      .filter((l) => l.length > 24);

    return {
      heading: headingLine ? cleanText(headingLine) : fallback.heading,
      body: paragraphLines[0] || fallback.body,
      bullets: [
        bulletLines[0] || fallback.bullets[0],
        bulletLines[1] || fallback.bullets[1],
      ] as [string, string],
    };
  };

  const handleScreenNav = (target: PhoneTab | 'profile') => {
    if (target === 'profile') {
      onNavigate(currentUser ? 'profile' : 'login');
    } else if (target === 'home') {
      onOpenAppMode();
    } else {
      onNavigate(target);
    }
  };

  // Real ExploreView (Ask Jane search screen + filters + map) layout inside the Find Pros phone
  const renderFindProsScreenContent = () => (
    <div className="space-y-2.5 text-left pt-0.5">
      {/* Header matching ExploreView */}
      <div className="space-y-0.5">
        <p className="text-[14px] font-bold font-display text-slate-800 tracking-tight leading-tight">
          <span className="text-brand-blue font-bold">What</span> are you looking for?
        </p>
        <p className="text-[8.5px] text-slate-500 leading-snug">
          Search for a professional or let Jane, your AI assistant, find the best match for you.
        </p>
      </div>

      {/* Blue Bordered Ask Jane Search Block */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full bg-white rounded-[14px] border-2 border-blue-200/90 shadow-2xs px-2.5 py-1.5 flex items-center gap-2 text-left hover:border-brand-blue/70 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
          <div className="flex-1 min-w-0 relative h-3.5">
            <RotatingPlaceholder
              value=""
              placeholders={[
                'e.g. French-speaking dentist nearby...',
                'e.g. reliable electrician or plumber...',
                'e.g. help sorting out local paperwork...',
                'e.g. tax advisor for expats & freelancers...',
              ]}
              className="text-slate-300 text-[9px] font-medium leading-normal truncate"
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full py-2 bg-brand-blue hover:bg-[#0958d9] text-white rounded-[14px] font-bold text-[10px] shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3 h-3 fill-white/10" />
          <span>Find professionals</span>
        </button>

        <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[7.5px] tracking-wide">
          <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span>100% secure. Jane is here to help.</span>
        </div>
      </div>

      {/* Refine your search section matching ExploreView */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">
          Refine your search
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {/* Category Dropdown */}
          <div className="space-y-0.5">
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-2.5 h-2.5 text-brand-blue shrink-0" />
              <span>Category</span>
            </p>
            <div className="px-2 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-1 text-[8.5px] font-bold text-slate-700">
              <span className="truncate">Health &amp; Dental</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Language Dropdown */}
          <div className="space-y-0.5">
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-brand-blue shrink-0" />
              <span>Language</span>
            </p>
            <div className="px-2 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-1 text-[8.5px] font-bold text-slate-700">
              <span className="truncate">English</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Distance from me Slider matching ExploreView */}
          <div className="space-y-0.5">
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
              <span className="truncate">Distance from me</span>
            </p>
            <div className="px-2 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="relative flex items-center h-2">
                <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-rose-500" />
                </div>
                <span className="absolute left-[60%] -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-xs" />
              </div>
              <div className="flex justify-center">
                <span className="text-[7.5px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 leading-none">
                  5km
                </span>
              </div>
            </div>
          </div>

          {/* Rating Star Selection matching ExploreView */}
          <div className="space-y-0.5">
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-brand-yellow fill-brand-yellow shrink-0" />
              <span>Rating</span>
            </p>
            <div className="px-2 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-1">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-2.5 h-2.5 ${
                      s <= 4 ? 'text-brand-yellow fill-brand-yellow' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[7.5px] font-bold text-slate-400 leading-none">4.0+</span>
            </div>
          </div>
        </div>
      </div>

      {/* ProMap preview right below filters (matching ExploreView #results-section) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1 text-[7.5px] font-bold text-brand-blue bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-100/80 shadow-2xs">
            <Navigation className="w-2.5 h-2.5 text-brand-blue" />
            <span>Use my location</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full h-[132px] rounded-[20px] overflow-hidden border border-slate-200/80 shadow-md relative bg-[#ECEEF0] block text-left cursor-pointer group/map"
          aria-label="Open interactive professionals map"
        >
          {/* Crisp Google-Maps-style city street grid */}
          <svg
            viewBox="0 0 320 150"
            className="w-full h-full object-cover"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            {/* Base urban map ground */}
            <rect width="320" height="150" fill="#F1F3F4" />
            {/* Park / river greenbelt */}
            <path
              d="M-10 38 C 65 24, 130 56, 200 44 C 255 34, 295 18, 335 28 L 335 56 C 292 48, 252 62, 198 70 C 128 80, 62 50, -10 62 Z"
              fill="#CBEAC5"
            />
            <rect x="24" y="88" width="46" height="32" rx="6" fill="#D5EED0" />
            <rect x="228" y="86" width="54" height="34" rx="8" fill="#D5EED0" />
            {/* Subtle city blocks */}
            <rect x="86" y="76" width="38" height="22" rx="3" fill="#E6EAEF" />
            <rect x="134" y="78" width="42" height="26" rx="3" fill="#E6EAEF" />
            <rect x="184" y="76" width="34" height="22" rx="3" fill="#E6EAEF" />
            <rect x="86" y="108" width="44" height="26" rx="3" fill="#E6EAEF" />
            <rect x="140" y="112" width="48" height="24" rx="3" fill="#E6EAEF" />
            <rect x="34" y="8" width="54" height="18" rx="3" fill="#E6EAEF" />
            <rect x="102" y="10" width="48" height="20" rx="3" fill="#E6EAEF" />
            <rect x="172" y="8" width="56" height="22" rx="3" fill="#E6EAEF" />
            {/* Secondary white streets */}
            <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M0 72 L320 68" />
              <path d="M0 104 L320 108" />
              <path d="M0 134 L320 132" />
              <path d="M78 0 L74 150" />
              <path d="M128 0 L132 150" />
              <path d="M180 0 L176 150" />
              <path d="M236 0 L242 150" />
              <path d="M286 0 L282 150" />
            </g>
            {/* Primary warm-yellow arterial avenues */}
            <g stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M-5 24 Q 110 18, 220 34 T 325 20" />
              <path d="M46 0 Q 62 72, 118 150" />
              <path d="M210 0 Q 204 75, 255 150" />
            </g>
            <g stroke="#FCD34D" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.65">
              <path d="M-5 24 Q 110 18, 220 34 T 325 20" />
              <path d="M46 0 Q 62 72, 118 150" />
              <path d="M210 0 Q 204 75, 255 150" />
            </g>
            {/* Subtle neighborhood labels */}
            <text x="16" y="79" fill="#94A3B8" fontSize="6.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.8">
              OLD TOWN
            </text>
            <text x="132" y="143" fill="#94A3B8" fontSize="6.5" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.8">
              CITY CENTER
            </text>
          </svg>

          {/* Numbered ProMap Pins matching real #0038FF recommended & #94a3b8 markers */}
          {[
            { num: '1', top: '26%', left: '22%', color: '#0038FF' },
            { num: '2', top: '48%', left: '42%', color: '#0038FF' },
            { num: '3', top: '22%', left: '58%', color: '#0038FF' },
            { num: '4', top: '66%', left: '26%', color: '#0038FF' },
            { num: '5', top: '38%', left: '78%', color: '#94a3b8' },
          ].map((pin) => (
            <div
              key={pin.num}
              style={{ top: pin.top, left: pin.left }}
              className="absolute -translate-x-1/2 -translate-y-full drop-shadow-[0_3px_5px_rgba(10,15,44,0.3)]"
            >
              <div
                style={{ backgroundColor: pin.color }}
                className="w-5 h-5 rounded-full border-[1.5px] border-white flex items-center justify-center text-[8px] font-black text-white relative"
              >
                {pin.num}
                <span
                  style={{ borderTopColor: pin.color }}
                  className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent"
                />
              </div>
            </div>
          ))}

          {/* Blue user location dot */}
          <div className="absolute top-[58%] left-[14%] -translate-x-1/2 -translate-y-1/2">
            <span className="block w-4 h-4 rounded-full bg-brand-blue/20 flex items-center justify-center">
              <span className="block w-2 h-2 rounded-full bg-brand-blue border border-white shadow-2xs" />
            </span>
          </div>
        </button>
      </div>
    </div>
  );

  // Floating Pro Modal mockup faithfully replicating ProfessionalDetailView 1-to-1
  const renderProModalOverlayCard = () => (
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
      className="rounded-[24px] bg-white border-2 border-emerald-500 p-3.5 shadow-[0_26px_65px_rgba(10,15,44,0.22)] space-y-2.5 relative overflow-hidden text-left hover:-translate-y-0.5 transition-transform cursor-pointer"
    >
      {/* Top-right modal action buttons matching ProfessionalDetailView (Heart, Share, Close X) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <span className="w-5.5 h-5.5 rounded-full bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center shadow-2xs">
          <Heart className="w-2.5 h-2.5 fill-rose-500" />
        </span>
        <span className="w-5.5 h-5.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-2xs">
          <Share2 className="w-2.5 h-2.5" />
        </span>
        <span className="w-5.5 h-5.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-2xs">
          <X className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* Pro Header: Avatar + Name + Company + Badges + Top Qualities */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 pr-18">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 p-0.5 overflow-hidden border border-slate-200 shadow-xs shrink-0">
            <img
              src={MOCK_PRO_PROFILE.image}
              alt={MOCK_PRO_PROFILE.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[12px]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black text-slate-900 font-display tracking-tight leading-tight truncate">
              {MOCK_PRO_PROFILE.name}
            </p>
            <p className="text-[9.5px] font-semibold text-slate-500 truncate mt-0.5">
              {MOCK_PRO_PROFILE.company}
            </p>
          </div>
        </div>

        {/* Category, Rating & Community Recommended Badges matching ProfessionalDetailView */}
        <div className="flex flex-wrap items-center gap-1 text-[8px]">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-brand-blue/5 text-brand-blue rounded-lg font-bold border border-brand-blue/15 shadow-2xs">
            <Briefcase className="w-2.5 h-2.5 shrink-0" />
            <span>{MOCK_PRO_PROFILE.category}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-900 rounded-lg font-bold border border-amber-200 shadow-2xs tabular-nums">
            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>
              {MOCK_PRO_PROFILE.rating} ({MOCK_PRO_PROFILE.reviewsCount})
            </span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 rounded-lg font-bold border border-emerald-200/80 shadow-2xs">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
            <span className="truncate">Recommended by MyCityUnlocked community</span>
          </span>
        </div>

        {/* Top Qualities matching ProfessionalDetailView */}
        <div className="flex flex-wrap items-center gap-1 text-[7.5px]">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-bold bg-cyan-500/10 text-cyan-800 border border-cyan-500/25 shadow-2xs">
            <Zap className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
            <span>{MOCK_PRO_PROFILE.qualities[0]}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 shadow-2xs">
            <Award className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
            <span>{MOCK_PRO_PROFILE.qualities[1]}</span>
          </span>
        </div>
      </div>

      {/* Direct Contact & Info Bar (2-column grid with Phone/WhatsApp/Email/Languages + Location & Mini Map) */}
      <div className="bg-slate-50/70 rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs grid grid-cols-2 gap-2.5 text-[8px]">
        {/* Left: Phone, WhatsApp, Email, Languages */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4.5 h-4.5 rounded-md bg-cyan-50 border border-cyan-200/70 text-cyan-600 flex items-center justify-center shrink-0">
              <Phone className="w-2.5 h-2.5" />
            </span>
            <span className="text-slate-600 font-medium truncate tabular-nums">{MOCK_PRO_PROFILE.phone}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4.5 h-4.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-[#25D366] flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.284l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.768-5.764-5.768zm3.393 8.305c-.103.285-.514.508-.717.559-.204.051-.433.08-.949-.131-.458-.187-1.019-.441-1.607-.949-1.076-.933-1.637-1.745-1.89-2.072-.252-.326-.451-.626-.451-.95 0-.324.162-.515.252-.619a.78.78 0 01.56-.25c.108 0 .193.003.275.008.086.005.158-.026.242.176.103.243.348.846.381.907.031.066.012.164-.033.254-.045.089-.089.141-.166.233-.075.093-.119.16-.062.259.057.098.254.417.545.679.375.337.69.441.791.488a.386.386 0 00.274-.012c.081-.048.348-.381.442-.48.093-.099.191-.12.302-.078.113.042.712.335.836.398.125.062.203.09.231.144.03.051.03.303-.074.588zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.193L2 22l4.904-1.287A9.954 9.954 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.634 0-3.167-.433-4.493-1.192l-.322-.185-2.855.748.761-2.78-.204-.324C4.12 15.003 3.627 13.541 3.627 12c0-4.617 3.756-8.373 8.373-8.373 4.617 0 8.373 3.756 8.373 8.373 0 4.617-3.756 8.373-8.373 8.373z" />
              </svg>
            </span>
            <span className="text-slate-600 font-medium truncate tabular-nums">{MOCK_PRO_PROFILE.whatsapp}</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4.5 h-4.5 rounded-md bg-blue-50 border border-blue-200/70 text-brand-blue flex items-center justify-center shrink-0">
              <Mail className="w-2.5 h-2.5" />
            </span>
            <span className="text-slate-600 font-medium truncate">{MOCK_PRO_PROFILE.email}</span>
          </div>

          <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
            <span className="w-4.5 h-4.5 rounded-md bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center shrink-0">
              <Globe className="w-2.5 h-2.5" />
            </span>
            <div className="flex flex-wrap items-center gap-0.5 min-w-0">
              {MOCK_PRO_PROFILE.languages.map((lang) => (
                <span
                  key={lang}
                  className="text-[7px] bg-white text-slate-700 font-semibold px-1 py-0.5 rounded border border-slate-200/80 shadow-2xs leading-none"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Location + Mini Map with Rose Pin matching ProfessionalDetailView */}
        <div className="space-y-1.5 min-w-0 flex flex-col justify-between">
          <div className="flex items-start gap-1.5 min-w-0">
            <span className="w-4.5 h-4.5 rounded-md bg-rose-50 border border-rose-200/70 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-2.5 h-2.5" />
            </span>
            <span className="text-[7.5px] text-slate-600 font-medium leading-tight underline decoration-slate-300 underline-offset-2 line-clamp-2">
              {MOCK_PRO_PROFILE.location}
            </span>
          </div>

          {/* Mini Map matching ProfessionalDetailView (rose #E11D48 pin) */}
          <div className="w-full h-[58px] rounded-xl overflow-hidden border border-slate-200/80 shadow-2xs relative bg-[#EEF2F5]">
            <svg viewBox="0 0 140 65" className="w-full h-full object-cover" aria-hidden="true">
              <rect width="140" height="65" fill="#F1F3F4" />
              <rect x="8" y="8" width="32" height="18" rx="3" fill="#D5EED0" />
              <rect x="96" y="38" width="36" height="20" rx="4" fill="#E6EAEF" />
              <rect x="48" y="36" width="38" height="20" rx="3" fill="#E6EAEF" />
              <g stroke="#FFFFFF" strokeWidth="4" fill="none">
                <path d="M0 30 L140 32" />
                <path d="M44 0 L42 65" />
                <path d="M90 0 L92 65" />
              </g>
              <path d="M0 14 Q 70 10, 140 20" stroke="#FDE68A" strokeWidth="4.5" fill="none" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full drop-shadow-[0_2px_4px_rgba(190,18,61,0.35)]">
              <div className="w-4 h-4 rounded-full bg-[#E11D48] border-[1.5px] border-[#BE123D] flex items-center justify-center relative">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[4.5px] border-l-transparent border-r-transparent border-t-[#E11D48]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section matching ProfessionalDetailView */}
      <div className="bg-slate-50/60 rounded-2xl p-2.5 border border-slate-200/70 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" />
          <span className="text-[7.5px] font-bold text-slate-900 font-display uppercase tracking-wider">
            About
          </span>
        </div>
        <p className="text-[8px] text-slate-700 leading-relaxed line-clamp-2">
          {MOCK_PRO_PROFILE.about}
        </p>
      </div>

      {/* Testimonials Section matching ProfessionalDetailView */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[7.5px] font-bold text-slate-900 font-display uppercase tracking-wider">
            Testimonials
          </span>
          <span className="text-[7px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold font-mono leading-none">
            {MOCK_PRO_PROFILE.reviewsCount}
          </span>
        </div>

        <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[8.5px] font-bold text-slate-900 truncate">
                  {MOCK_PRO_PROFILE.review.author}
                </span>
                <span className="w-3.5 h-3.5 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-2 h-2" />
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <Star key={idx} className="w-2 h-2 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>
            <span className="text-[7px] font-semibold text-slate-400 font-mono tracking-tight shrink-0">
              {MOCK_PRO_PROFILE.review.date}
            </span>
          </div>
          <p className="text-[8px] text-slate-600 leading-snug italic line-clamp-2">
            &ldquo;{MOCK_PRO_PROFILE.review.comment}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );

  // Real EventsView screen layout with clean mockup events
  const renderEventsScreenContent = () => (
    <div className="space-y-2.5 text-left">
      <div className="space-y-0.5">
        <p className="text-[14px] font-bold font-display text-slate-800 tracking-tight leading-tight">
          <span className="text-orange-500">What&apos;s Up</span> in Your City
        </p>
        <p className="text-[9.5px] text-slate-500 leading-snug">
          Meetups, workshops, concerts, and weekend highlights.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('events')}
        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-left hover:border-orange-300 transition-colors cursor-pointer"
      >
        <Search className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <span className="text-[9.5px] text-slate-400 truncate">
          Search events by name, location, or vibe...
        </span>
      </button>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
        {[
          { id: 'all' as const, label: 'Any Day' },
          { id: 'today' as const, label: 'Today' },
          { id: 'weekend' as const, label: 'Weekend' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setEventsPreviewFilter(opt.id)}
            className={`flex-1 py-1 text-[9.5px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              eventsPreviewFilter === opt.id
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-brand-navy'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {MOCK_EVENTS.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => onNavigate('events')}
            className="w-full text-left rounded-2xl border border-slate-100 hover:border-orange-200 bg-white overflow-hidden transition-colors cursor-pointer p-2 space-y-1.5"
          >
            <div className="relative h-20 w-full rounded-xl overflow-hidden bg-orange-50">
              <img
                src={ev.image}
                alt={ev.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 border border-orange-100">
                <Calendar className="w-2.5 h-2.5 text-orange-600 shrink-0" />
                <span className="text-[8.5px] font-bold text-orange-600 whitespace-nowrap">
                  {ev.dateLabel}
                </span>
              </div>
            </div>
            <div className="px-0.5">
              <p className="text-[11px] font-bold text-brand-navy line-clamp-1">{ev.title}</p>
              <p className="text-[9px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{ev.location}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Real GuidesView screen layout with compact Start Here + 3 visible Latest Reads
  const renderGuidesScreenContent = () => (
    <div className="space-y-2 text-left">
      <div className="space-y-0.5">
        <p className="text-[13.5px] font-bold font-display text-slate-800 tracking-tight leading-tight">
          Ready to <span className="text-emerald-600">settle into</span> your City?
        </p>
        <p className="text-[9px] text-slate-500 leading-snug">
          Practical guides, checklists, and local advice.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('guides')}
        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-2 text-left hover:border-emerald-400 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Search className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[9px] text-slate-400 truncate">Search guides...</span>
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[8.5px] font-semibold shrink-0">
          Search
        </span>
      </button>

      <div className="space-y-1">
        <p className="text-[9.5px] font-bold text-brand-navy">Start here</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { title: 'Finding a home', icon: Home, tint: 'bg-emerald-50 text-emerald-600' },
            { title: 'Paperwork', icon: FileText, tint: 'bg-purple-50 text-purple-600' },
            { title: 'Getting around', icon: Train, tint: 'bg-blue-50 text-brand-blue' },
            { title: 'Healthcare', icon: HeartPulse, tint: 'bg-orange-50 text-orange-600' },
          ].map((topic) => {
            const TopicIcon = topic.icon;
            return (
              <button
                key={topic.title}
                type="button"
                onClick={() => onNavigate('guides')}
                className="p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-emerald-200 transition-colors text-left cursor-pointer flex items-center gap-1.5"
              >
                <div className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0 ${topic.tint}`}>
                  <TopicIcon className="w-3 h-3" />
                </div>
                <p className="text-[9.5px] font-bold text-brand-navy leading-tight truncate">{topic.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <p className="text-[9.5px] font-bold text-brand-navy">Latest reads</p>
        {displayGuides.map((guide: any) => (
          <button
            key={guide.id}
            type="button"
            onClick={() =>
              onNavigate(
                'guides',
                String(guide.id).startsWith('g-') ? undefined : { guideId: guide.id }
              )
            }
            className="w-full text-left px-2.5 py-2 rounded-xl border border-emerald-100/90 hover:border-emerald-300 bg-white transition-colors cursor-pointer"
          >
            <p className="text-[8.5px] font-semibold text-emerald-600">
              {guide.category || 'City Guide'}
            </p>
            <p className="text-[10px] font-bold text-brand-navy line-clamp-1 leading-snug mt-0.5">
              {guide.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Real AdDetailModal ("Unlocked Good Stuff" single item sheet) layout with mockup article
  const renderStuffScreenContent = () => (
    <div className="text-left">
      <div className="rounded-[22px] bg-white border border-slate-200/90 overflow-hidden shadow-2xs">
        {/* Photo Banner matching AdDetailModal */}
        <div className="relative h-32 w-full bg-purple-50 overflow-hidden">
          <img
            src={MOCK_STUFF_ITEM.image}
            alt={MOCK_STUFF_ITEM.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs text-rose-500 shadow-xs flex items-center justify-center">
              <Heart className="w-3 h-3 fill-rose-500" />
            </span>
            <span className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-xs flex items-center justify-center">
              <Share2 className="w-3 h-3" />
            </span>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950/40 backdrop-blur-xs px-2 py-0.5 rounded-full">
            <span className="w-3 h-1 rounded-full bg-white" />
            <span className="w-1 h-1 rounded-full bg-white/50" />
            <span className="w-1 h-1 rounded-full bg-white/50" />
          </div>
        </div>

        {/* Item Details matching AdDetailModal */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8.5px] font-bold text-purple-600 uppercase tracking-wider">
                {MOCK_STUFF_ITEM.category}
              </p>
              <p className="text-[13px] font-bold text-slate-900 font-display leading-tight mt-0.5">
                {MOCK_STUFF_ITEM.title}
              </p>
            </div>
            <span className="text-[15px] font-extrabold text-purple-700 tabular-nums shrink-0">
              {MOCK_STUFF_ITEM.price}
            </span>
          </div>

          {/* Item attributes row */}
          <div className="flex flex-wrap items-center gap-1 text-[8.5px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg font-medium text-slate-600">
              <Tag className="w-2.5 h-2.5" />
              {MOCK_STUFF_ITEM.condition}
            </span>
            <span className="px-2 py-0.5 bg-purple-50 rounded-lg font-bold text-purple-700">
              For {MOCK_STUFF_ITEM.type}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 rounded-lg font-medium text-slate-600">
              {MOCK_STUFF_ITEM.delivery}
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 rounded-lg font-medium text-slate-600">
              <Clock className="w-2.5 h-2.5" />
              {MOCK_STUFF_ITEM.postedAgo}
            </span>
          </div>

          {/* Seller bar matching AdDetailModal */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6.5 h-6.5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                M
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold text-slate-900 truncate">{MOCK_STUFF_ITEM.sellerName}</p>
                <p className="text-[8.5px] text-slate-500 flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                  <span>{MOCK_STUFF_ITEM.location}</span>
                </p>
              </div>
            </div>
            <span className="text-[8.5px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 shrink-0">
              Seller
            </span>
          </div>

          {/* Description */}
          <div className="space-y-0.5">
            <p className="text-[9.5px] font-bold text-slate-900">Description</p>
            <p className="text-[9px] text-slate-600 leading-snug line-clamp-2">
              {MOCK_STUFF_ITEM.description}
            </p>
          </div>

          {/* Purple Contact CTA matching AdDetailModal */}
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3 h-3" />
            <span>Message Seller</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Exact replica of the real mobile HomeView screen (fitted strictly with zero scroll)
  const renderHeroHomeScreenContent = () => (
    <div className="h-full flex flex-col justify-start pt-0.5 text-left">
      {/* Welcome & Tagline matching HomeView */}
      <div className="px-0.5 space-y-0.5 pb-1">
        <p className="text-[15.5px] font-bold font-display text-brand-navy tracking-tight leading-tight">
          Hello Alex, 👋
        </p>
        <p className="text-brand-blue font-bold italic text-[10.5px] leading-snug inline-flex flex-wrap items-center gap-x-0.5">
          <span>Discover</span>
          <RotatingCylinderWord />
          <span>better, belong faster.</span>
        </p>
      </div>

      {/* Community Illustration sitting right on top of the Jane card (exact HomeView overlap) */}
      <div className="flex justify-center -mb-2 pointer-events-none select-none">
        <img
          src="/people.png"
          alt="Community illustration"
          className="w-[168px] h-auto object-contain block align-bottom"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Hero Jane Search Assistant Widget matching HomeView 1-to-1 */}
      <div className="relative z-10 rounded-[20px] bg-gradient-to-br from-white to-[#f8fafc] p-3 border-2 border-blue-200/80 shadow-[0_4px_20px_rgba(37,99,235,0.05)] space-y-2.5 text-left">
        <div className="space-y-0.5">
          <p className="text-[11.5px] font-bold text-brand-navy tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span>
              <span className="text-brand-blue">Find</span> a recommended pro with Jane
            </span>
          </p>
          <p className="text-[9px] text-slate-500 leading-snug">
            Jane, your AI assistant, is here to help you find the right pro.
          </p>
        </div>

        <div className="space-y-2">
          {/* Blue Bordered Ask Jane Input matching HomeView */}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="w-full bg-white rounded-[14px] border-2 border-blue-200/90 shadow-2xs px-2.5 py-2 flex items-center gap-2 text-left hover:border-brand-blue/70 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <div className="flex-1 min-w-0 relative h-3.5">
              <RotatingPlaceholder
                value=""
                placeholders={[
                  'e.g. French-speaking dentist nearby...',
                  'e.g. help sorting out local paperwork...',
                  'e.g. reliable electrician or plumber...',
                  'e.g. tax advisor for expats & freelancers...',
                ]}
                className="text-slate-300 text-[9.5px] font-medium leading-normal truncate"
              />
            </div>
          </button>

          {/* Large Blue Recommendations Action Button matching HomeView */}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="w-full py-2 bg-brand-blue hover:bg-[#0958d9] text-white rounded-[14px] font-bold text-[10.5px] shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 fill-white/10" />
            <span>Find professionals</span>
          </button>

          {/* Privacy Safeguard Note matching HomeView */}
          <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[8px] tracking-wide">
            <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span>100% secure. Jane is here to help.</span>
          </div>
        </div>

        {/* Exact amber "Know someone great?" box inside the Jane card matching HomeView */}
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
          className="bg-amber-50/60 hover:bg-amber-50 rounded-xl p-2 border border-amber-200/70 space-y-2 transition-colors cursor-pointer group/rec"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-[10px] tracking-tight leading-tight flex items-center gap-1">
                <span>Know someone great?</span>
                <span className="text-amber-500">🌟</span>
              </p>
              <p className="text-slate-600 text-[8.5px] leading-tight mt-0.5 line-clamp-2">
                Recommend a local pro in your City to help the community!
              </p>
            </div>
          </div>

          <div className="w-full py-1.5 px-2.5 bg-amber-500 group-hover/rec:bg-amber-600 text-slate-950 font-bold text-[9.5px] rounded-lg flex items-center justify-center gap-1 shadow-2xs transition-colors">
            <span>Recommend a Pro</span>
            <ArrowRight className="w-2.5 h-2.5 group-hover/rec:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full w-full bg-white text-brand-navy font-sans select-text selection:bg-brand-blue/15 selection:text-brand-navy">
      {/* 1. Hero Section (No top header bar, no section tabs strip) */}
      <section
        id="web-landing-top"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 40px)' }}
        className="pb-20 sm:pb-24 lg:pb-28"
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-5">
                <h1
                  className="font-display font-bold tracking-tight text-brand-navy leading-[1.08] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.65rem)' }}
                >
                  Discover better, <span className="text-brand-blue">belong faster.</span>
                </h1>

                <div className="py-1">
                  <Logo className="items-start" imgClassName="h-12 sm:h-14 md:h-[68px]" />
                </div>

                <p className="text-base sm:text-lg text-slate-500 leading-[1.65] max-w-[42ch]">
                  Trusted local pros, curated events, practical guides, and neighbor essentials — all in one app.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3.5">
                  <StoreBadge store="ios" variant="dark" />
                  <StoreBadge store="android" variant="dark" />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenAppMode}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                  >
                    <span>Open web app</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative min-h-[590px] sm:min-h-[620px] rounded-[32px] overflow-hidden border border-blue-100 bg-[#E9ECFF]">
                <img
                  src={heroCityImg}
                  alt="Sunlit city street and outdoor terrace"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/30 to-brand-blue/15" />

                <div className="relative z-10 h-full flex flex-col items-center justify-center p-5 sm:p-8">
                  <AppScreenFrame
                    idSuffix="hero"
                    activeTab={heroPhoneTab}
                    disableScroll={heroPhoneTab === 'home'}
                    onTabClick={(tab) => {
                      if (tab === 'profile') {
                        onNavigate(currentUser ? 'profile' : 'login');
                      } else {
                        setHeroPhoneTab(tab);
                      }
                    }}
                  >
                    {heroPhoneTab === 'home' && renderHeroHomeScreenContent()}
                    {heroPhoneTab === 'explore' && renderFindProsScreenContent()}
                    {heroPhoneTab === 'events' && renderEventsScreenContent()}
                    {heroPhoneTab === 'guides' && renderGuidesScreenContent()}
                    {heroPhoneTab === 'marketplace' && renderStuffScreenContent()}
                  </AppScreenFrame>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Section 01: Find Pros (Concise Copy Left, Real App Screen w/ Mockup Data Right) */}
      <section id="section-find-pros" className="py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  <span className="text-brand-blue">Trusted pros</span>, matched in seconds.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Ask Jane in your own words to find community-recommended specialists who speak your language.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" aria-hidden="true" />
                  <span>AI matching with Jane in plain language</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" aria-hidden="true" />
                  <span>Verified resident reviews &amp; spoken languages</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0" aria-hidden="true" />
                  <span>Direct contact with zero middlemen</span>
                </li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('explore')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-blue hover:bg-[#0958d9] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                >
                  <span>Explore Find Pros</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative mx-auto max-w-[590px] py-2">
                {/* Real Jane Search phone screen with filters & map */}
                <div className="relative z-10 sm:-translate-x-16 lg:-translate-x-20">
                  <AppScreenFrame
                    idSuffix="find-pros"
                    activeTab="explore"
                    onTabClick={handleScreenNav}
                  >
                    {renderFindProsScreenContent()}
                  </AppScreenFrame>
                </div>

                {/* Slightly overlapping Pro detail modal mockup */}
                <div className="relative z-20 -mt-16 ml-auto sm:mt-0 sm:absolute sm:right-0 sm:bottom-3 w-[290px] sm:w-[322px]">
                  {renderProModalOverlayCard()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 02: Events (Real App Screen w/ Mockup Data Left, Concise Copy Right) */}
      <section id="section-events" className="py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1 flex justify-center">
              <AppScreenFrame
                idSuffix="events"
                activeTab="events"
                onTabClick={handleScreenNav}
              >
                {renderEventsScreenContent()}
              </AppScreenFrame>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-7">
              <div className="space-y-3.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Curated <span className="text-orange-500">weekly plans</span> around you.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Discover local meetups, markets, concerts, and weekend outings in one clear calendar.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
                  <span>Filter by today, tomorrow, or this weekend</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
                  <span>Schedules, venues &amp; highlights at a glance</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
                  <span>Weekly community picks &amp; alerts</span>
                </li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                >
                  <span>Explore Events</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 03: Guides (Concise Copy Left, Real App Screen Right) */}
      <section id="section-guides" className="py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  <span className="text-emerald-600">Clear playbooks</span> to settle in faster.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Step-by-step local guides written from real experience so nothing gets lost in translation.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Housing, paperwork, transport &amp; healthcare</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Practical checklists with zero fluff</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Instant keyword search</span>
                </li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('guides')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                >
                  <span>Read Guides</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              {/* Two slightly overlapping floating Guide Article Modal windows (ExpertGuideModal design) */}
              {(() => {
                const secondary = displayGuides[1];
                const featured = displayGuides[0];
                const secondaryPreview = getGuideArticlePreview(secondary, {
                  heading: 'How to register with a local clinic',
                  body: 'Once your local address is registered, visit your neighborhood health center with your ID and proof of residency to receive your public card and assigned GP.',
                  bullets: [
                    'Public card & local clinic registration steps',
                    'Private coverage & English-speaking doctors',
                  ],
                });
                const featuredPreview = getGuideArticlePreview(featured, {
                  heading: 'Your first 30 days checklist',
                  body: 'Start by booking your town hall address registration and ID appointment early—slots fill fast, and these two documents unlock banking, healthcare, and utilities.',
                  bullets: [
                    'Address registration & required original documents',
                    'Opening a local account, SIM card & transit pass',
                  ],
                });

                return (
                  <div className="relative mx-auto max-w-[600px] py-2">
                    {/* Back / Upper-Left Floating Article Modal */}
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          'guides',
                          secondary && !String(secondary.id).startsWith('g-')
                            ? { guideId: secondary.id }
                            : undefined
                        )
                      }
                      className="relative z-10 mr-auto block w-[308px] sm:w-[376px] rounded-[26px] bg-white border border-slate-200/90 shadow-[0_18px_45px_rgba(10,15,44,0.12)] overflow-hidden text-left hover:-translate-y-0.5 transition-transform cursor-pointer group"
                    >
                      <div className="relative h-32 sm:h-36 w-full bg-brand-navy overflow-hidden">
                        <img
                          src={secondary?.imageUrl || heroCityImg}
                          alt={secondary?.title || FALLBACK_GUIDES[1].title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="w-6.5 h-6.5 rounded-full bg-white/15 backdrop-blur-xs text-white flex items-center justify-center">
                            <Share2 className="w-3 h-3" />
                          </span>
                          <span className="w-6.5 h-6.5 rounded-full bg-white/15 backdrop-blur-xs text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </span>
                        </div>

                        <div className="absolute bottom-3.5 left-4 right-4">
                          <span className="inline-block px-2.5 py-0.5 bg-brand-yellow text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-full mb-1.5">
                            {secondary?.categoryTitle || secondary?.category || 'Healthcare'}
                          </span>
                          <p className="text-[14px] sm:text-[15.5px] font-black text-white font-display leading-tight line-clamp-2">
                            {secondary?.title || FALLBACK_GUIDES[1].title}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="pb-2.5 border-b border-slate-100 space-y-1">
                          <p className="text-[10.5px] text-slate-600 italic leading-snug line-clamp-2">
                            {secondary?.excerpt ||
                              'A clear overview of public health registration, private plans, and English-speaking clinics.'}
                          </p>
                          <p className="text-[8.5px] text-brand-blue font-bold uppercase tracking-wider">
                            by {secondary?.author?.name || 'MyCityUnlocked'}
                          </p>
                        </div>

                        {/* Article Content Snippet */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-brand-navy font-display leading-snug line-clamp-1">
                            {secondaryPreview.heading}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">
                            {secondaryPreview.body}
                          </p>
                        </div>

                        <div className="space-y-1.5 text-[10px] text-slate-700 font-medium">
                          {secondaryPreview.bullets.map((bullet, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{bullet}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-1 flex items-center justify-end text-[9.5px] font-semibold">
                          <span className="text-emerald-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Read guide</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Front / Lower-Right Slightly Overlapping Article Modal */}
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          'guides',
                          featured && !String(featured.id).startsWith('g-')
                            ? { guideId: featured.id }
                            : undefined
                        )
                      }
                      className="relative z-20 -mt-16 sm:-mt-28 ml-auto block w-[316px] sm:w-[392px] rounded-[26px] bg-white border border-emerald-200/90 shadow-[0_26px_65px_rgba(10,15,44,0.20)] overflow-hidden text-left hover:-translate-y-0.5 transition-transform cursor-pointer group"
                    >
                      <div className="relative h-32 sm:h-36 w-full bg-brand-navy overflow-hidden">
                        <img
                          src={featured?.imageUrl || cityGuideImg}
                          alt={featured?.title || FALLBACK_GUIDES[0].title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          <span className="w-6.5 h-6.5 rounded-full bg-white/15 backdrop-blur-xs text-white flex items-center justify-center">
                            <Share2 className="w-3 h-3" />
                          </span>
                          <span className="w-6.5 h-6.5 rounded-full bg-white/15 backdrop-blur-xs text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </span>
                        </div>

                        <div className="absolute bottom-3.5 left-4 right-4">
                          <span className="inline-block px-2.5 py-0.5 bg-brand-yellow text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-full mb-1.5">
                            {featured?.categoryTitle || featured?.category || 'Paperwork'}
                          </span>
                          <p className="text-[14px] sm:text-[15.5px] font-black text-white font-display leading-tight line-clamp-2">
                            {featured?.title || FALLBACK_GUIDES[0].title}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="pb-2.5 border-b border-slate-100 space-y-1">
                          <p className="text-[10.5px] text-slate-600 italic leading-snug line-clamp-2">
                            {featured?.excerpt ||
                              'Everything you need to register smoothly during your first 30 days in your new city.'}
                          </p>
                          <p className="text-[8.5px] text-brand-blue font-bold uppercase tracking-wider">
                            by {featured?.author?.name || 'MyCityUnlocked'}
                          </p>
                        </div>

                        {/* Article Content Snippet */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-brand-navy font-display leading-snug line-clamp-1">
                            {featuredPreview.heading}
                          </p>
                          <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">
                            {featuredPreview.body}
                          </p>
                        </div>

                        <div className="space-y-1.5 text-[10px] text-slate-700 font-medium">
                          {featuredPreview.bullets.map((bullet, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{bullet}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-1 flex items-center justify-end text-[9.5px] font-semibold">
                          <span className="text-emerald-600 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>Read guide</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 04: Stuff (Real App Screen w/ Mockup Data Left, Concise Copy Right) */}
      <section id="section-stuff" className="py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1 flex justify-center">
              <AppScreenFrame
                idSuffix="stuff"
                activeTab="marketplace"
                onTabClick={handleScreenNav}
              >
                {renderStuffScreenContent()}
              </AppScreenFrame>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-7">
              <div className="space-y-3.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  <span className="text-purple-600">Buy and Sell</span> locally within your community.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Trade bikes, furniture, kids&apos; gear, and home essentials inside a trusted local community.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" aria-hidden="true" />
                  <span>Filter by category, area &amp; budget</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" aria-hidden="true" />
                  <span>Private in-app chat with members</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" aria-hidden="true" />
                  <span>Post an item in under a minute</span>
                </li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                >
                  <span>Browse Stuff</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section 05: Smart Alerts & Notifications (Copy Left, Floating iOS Notification Stack Right) */}
      <section id="section-notifications" className="py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Stay in the loop with <span className="text-amber-500">smart alerts</span>.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Get timely, zero-spam push notifications whenever new events, fresh local guides, or newly recommended pros arrive in your city.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span>Upcoming meetups &amp; weekend plans before they fill up</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span>New practical guides &amp; local living updates</span>
                </li>
                <li className="py-3.5 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <span>Newly added pros recommended by members</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              <div className="mx-auto max-w-[540px] space-y-4">
                {[
                  {
                    id: 'notif-event',
                    category: 'Events',
                    time: 'Just now',
                    title: 'This Friday: International Rooftop Aperitivo',
                    body: 'Meet fellow internationals at 19:30 at Old Town Terrace. Tap to see the full weekend lineup.',
                    accentBorder: 'border-orange-200/80',
                    accentText: 'text-orange-600',
                    offsetClass: 'sm:mr-auto',
                    icon: Calendar,
                  },
                  {
                    id: 'notif-pro',
                    category: 'New Pro Added',
                    time: 'Yesterday',
                    title: 'Dr. Clara Moreau just joined Find Pros',
                    body: 'English & French-speaking family dentist in City Center — newly recommended by the community.',
                    accentBorder: 'border-blue-200/80',
                    accentText: 'text-brand-blue',
                    offsetClass: 'sm:ml-auto',
                    icon: UserPlus,
                  },
                ].map((notif) => {
                  const CategoryIcon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className={`w-full sm:max-w-[468px] text-left rounded-[22px] bg-white border ${notif.accentBorder} p-4 sm:p-5 shadow-[0_14px_38px_rgba(10,15,44,0.08)] ${notif.offsetClass}`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* iOS-style App Icon Squircle */}
                        <div className="w-11 h-11 rounded-[13px] bg-white border border-slate-200/90 shadow-2xs p-1.5 flex items-center justify-center shrink-0 mt-0.5">
                          <img
                            src="/logo2.png"
                            alt="MyCityUnlocked"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11px] font-bold text-brand-navy tracking-tight truncate">
                                MyCityUnlocked
                              </span>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${notif.accentText} whitespace-nowrap`}>
                                <CategoryIcon className="w-3 h-3 shrink-0" />
                                <span>{notif.category}</span>
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                              {notif.time}
                            </span>
                          </div>

                          <p className="text-[14px] sm:text-[15px] font-bold font-display text-brand-navy leading-snug">
                            {notif.title}
                          </p>

                          <p className="text-[12.5px] sm:text-[13px] text-slate-500 leading-relaxed line-clamp-2">
                            {notif.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Why Unlocked (Concise Trust Principles — No Featured Partner) */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-3.5">
              <p className="text-sm font-bold text-brand-blue">Why MyCityUnlocked</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand-navy leading-[1.15] [text-wrap:balance]">
                Built on real word-of-mouth.
              </h2>
              <div className="h-1 w-12 bg-brand-yellow rounded-full" aria-hidden="true" />
            </div>

            <div className="lg:col-span-7 divide-y divide-slate-100 border-y border-slate-100">
              {[
                {
                  index: '01.',
                  title: 'Community powered',
                  body: 'Recommendations shared by real residents.',
                  color: 'text-emerald-600',
                },
                {
                  index: '02.',
                  title: 'All in one place',
                  body: 'Pros, events, guides, and classifieds without juggling endless group chats.',
                  color: 'text-brand-blue',
                },
                {
                  index: '03.',
                  title: 'Local first',
                  body: 'Designed to help you settle in and connect faster.',
                  color: 'text-amber-500',
                },
              ].map((pillar) => (
                <div key={pillar.index} className="py-6 flex items-start gap-5">
                  <span className={`font-display text-base font-bold tabular-nums shrink-0 pt-0.5 ${pillar.color}`}>
                    {pillar.index}
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="font-display text-base sm:text-lg font-bold text-brand-navy">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. App Download Band */}
      <section id="download-app" className="pb-20 sm:pb-24">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="rounded-[32px] bg-brand-navy text-white overflow-hidden px-8 py-12 sm:px-14 sm:py-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div className="space-y-3 max-w-lg">
              <p className="text-xs sm:text-sm font-semibold text-brand-yellow">
                iOS &amp; Android <span aria-hidden="true" className="mx-2 text-white/30">·</span> Free Download
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.12] [text-wrap:balance]">
                Take your city in your pocket.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Save pros, get event alerts, and chat with neighbors on the go.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
              <div className="flex flex-wrap items-center gap-3.5">
                <StoreBadge store="ios" variant="light" />
                <StoreBadge store="android" variant="light" />
              </div>
              <button
                type="button"
                onClick={onOpenAppMode}
                className="text-xs font-semibold text-slate-300 hover:text-brand-yellow underline underline-offset-4 transition-colors cursor-pointer"
              >
                Or continue in web app
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Quiet Brand Footer (#E9ECFF) */}
      <footer
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}
        className="bg-[#E9ECFF] text-brand-navy border-t border-brand-navy/5 pt-14"
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-brand-navy/10">
            <div className="sm:col-span-2 lg:col-span-4 space-y-4">
              <Logo className="items-start" />
              <p className="text-sm text-brand-navy/70 leading-relaxed max-w-xs">
                Trusted local pros, events, guides, and community essentials for international residents.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://www.instagram.com/mycityunlocked"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MyCityUnlocked on Instagram"
                  className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy hover:bg-brand-navy/20 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="mailto:hello@mycityunlocked.app"
                  aria-label="Email MyCityUnlocked"
                  className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy hover:bg-brand-navy/20 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold text-brand-navy">Platform</h4>
              <ul className="space-y-2.5 text-sm text-brand-navy/75">
                <li>
                  <button type="button" onClick={onOpenAppMode} className="hover:text-brand-blue transition-colors cursor-pointer font-semibold text-brand-navy">
                    Open Web App
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('explore')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Find Pros
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('events')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Events
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('guides')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Guides
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('marketplace')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Stuff
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('feedback')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Feedback
                  </button>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold text-brand-navy">Legal</h4>
              <ul className="space-y-2.5 text-sm text-brand-navy/75">
                <li>
                  <button type="button" onClick={() => onNavigate('privacy-policy')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('community-guidelines')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Community Guidelines
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('user-terms')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    User Terms
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('provider-terms')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Provider Terms
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('cookie-policy')} className="hover:text-brand-blue transition-colors cursor-pointer">
                    Cookie Policy
                  </button>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-brand-navy">Get the App</h4>
              <ul className="space-y-2.5 text-sm text-brand-navy/75">
                <li>
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors">
                    App Store
                  </a>
                </li>
                <li>
                  <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-brand-blue transition-colors">
                    Google Play
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@mycityunlocked.app" className="hover:text-brand-blue transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-7 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-brand-navy/60">
            <p>&copy; {new Date().getFullYear()} MyCityUnlocked. All rights reserved.</p>
            <p>Made for international communities ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
