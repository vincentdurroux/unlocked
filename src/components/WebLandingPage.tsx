import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  HeartPulse,
  Home,
  Instagram,
  Lock,
  Mail,
  MapPin,
  Plus,
  Search,
  Shirt,
  Sparkles,
  Star,
  Sun,
  Tag,
  Train,
  User,
} from 'lucide-react';
import { Logo } from './Logo';
import { RotatingCylinderWord } from './RotatingCylinderWord';
import type { AppPartner } from '../services/partnerService';
import heroCityImg from '../assets/images/valencia_hero_editorial_1795634116923.jpg';
import socialEventsImg from '../assets/images/valencia_social_events_1795634120123.jpg';
import cityGuideImg from '../assets/images/valencia_city_guide_1795634119504.jpg';
import stuffCityBikeImg from '../assets/images/stuff_city_bike_1795643319057.jpg';
import stuffOakDeskImg from '../assets/images/stuff_oak_desk_1795643318038.jpg';

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
const MOCK_PROS = [
  {
    id: 'mock-pro-1',
    name: 'Dr. Clara Moreau',
    profession: 'Family Dentist',
    rating: 5.0,
    reviewsCount: 18,
    languages: ['English', 'French'],
    location: 'City Center',
  },
  {
    id: 'mock-pro-2',
    name: 'Studio Kine & Osteo',
    profession: 'Osteopath & Physiotherapist',
    rating: 4.9,
    reviewsCount: 14,
    languages: ['English', 'Spanish'],
    location: 'Park District',
  },
  {
    id: 'mock-pro-3',
    name: 'Harbor Legal Advisors',
    profession: 'Immigration & Tax Specialist',
    rating: 5.0,
    reviewsCount: 22,
    languages: ['English', 'French', 'German'],
    location: 'Old Town',
  },
];

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

const MOCK_STUFF_ADS = [
  {
    id: 'mock-ad-1',
    title: 'Vintage City Bike + Basket',
    price: 120,
    location: 'Midtown',
    previewImage: stuffCityBikeImg,
  },
  {
    id: 'mock-ad-2',
    title: 'Solid Oak Writing Desk',
    price: 95,
    location: 'Park District',
    previewImage: stuffOakDeskImg,
  },
  {
    id: 'mock-ad-3',
    title: 'Foldable Travel Stroller',
    price: 110,
    location: 'Old Town',
    previewImage: stuffCityBikeImg,
  },
  {
    id: 'mock-ad-4',
    title: 'Compact Espresso Machine',
    price: 75,
    location: 'Riverside',
    previewImage: stuffOakDeskImg,
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
  children,
}: {
  idSuffix: string;
  activeTab: PhoneTab;
  onTabClick: (tab: PhoneTab | 'profile') => void;
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
        <div className="flex-1 overflow-y-auto no-scrollbar bg-white px-3.5 pt-3 pb-3">
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
  userProfile,
  onNavigate,
  onOpenAppMode,
}: WebLandingPageProps) {
  const [heroPhoneTab, setHeroPhoneTab] = useState<PhoneTab>('home');
  const [eventsPreviewFilter, setEventsPreviewFilter] = useState<'all' | 'today' | 'weekend'>('all');

  const displayGuides = useMemo(() => {
    const online = allArticles.filter((a) => a.isOnline !== false);
    const highlighted = online.filter((a) => a.is_highlighted === true || a.is_highlighted === 'true');
    const pool = highlighted.length > 0 ? highlighted : online;
    if (pool.length > 0) return pool.slice(0, 2);
    return [
      {
        id: 'g-1',
        title: 'Complete first-month paperwork checklist for newcomers',
        category: 'Paperwork',
        read_time: '5 min read',
      },
      {
        id: 'g-2',
        title: 'How to register for local public & private healthcare',
        category: 'Healthcare',
        read_time: '4 min read',
      },
    ];
  }, [allArticles]);

  const handleScreenNav = (target: PhoneTab | 'profile') => {
    if (target === 'profile') {
      onNavigate(currentUser ? 'profile' : 'login');
    } else if (target === 'home') {
      onOpenAppMode();
    } else {
      onNavigate(target);
    }
  };

  // Real ExploreView screen layout with clean mockup pros
  const renderFindProsScreenContent = () => (
    <div className="space-y-2.5 text-left">
      <div className="space-y-0.5">
        <p className="text-[14px] font-bold font-display text-slate-800 tracking-tight leading-tight">
          <span className="text-brand-blue">What</span> are you looking for?
        </p>
        <p className="text-[9.5px] text-slate-500 leading-snug">
          Search for a pro or let Jane, your AI assistant, match you.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('explore')}
        className="w-full bg-white rounded-2xl border-2 border-blue-200/90 px-2.5 py-2 flex items-center gap-2 text-left hover:border-brand-blue transition-colors cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
        <span className="text-[10px] text-slate-500 font-medium truncate">
          English-speaking dentist nearby...
        </span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('explore')}
        className="w-full py-2 bg-brand-blue hover:bg-[#0958d9] text-white rounded-2xl font-bold text-[10.5px] shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span>Find professionals</span>
      </button>

      <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[8.5px]">
        <Lock className="w-2.5 h-2.5 shrink-0" />
        <span>100% secure. Jane is here to help.</span>
      </div>

      <div className="pt-1 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-brand-navy">Recommended pros</span>
          <span className="text-[9.5px] font-semibold text-brand-blue">Verified</span>
        </div>

        {MOCK_PROS.map((pro) => (
          <button
            key={pro.id}
            type="button"
            onClick={() => onNavigate('explore')}
            className="w-full text-left p-2.5 rounded-2xl border border-slate-100 hover:border-blue-200 bg-white transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-brand-navy truncate">{pro.name}</p>
                <p className="text-[9.5px] text-slate-500 truncate mt-0.5">{pro.profession}</p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-navy tabular-nums shrink-0">
                <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />
                {pro.rating.toFixed(1)}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1 truncate">
              <span className="text-brand-blue font-semibold">{pro.languages.join(' · ')}</span>
              {` · ${pro.location}`}
            </p>
          </button>
        ))}
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

  // Real GuidesView screen layout
  const renderGuidesScreenContent = () => (
    <div className="space-y-2.5 text-left">
      <div className="space-y-0.5">
        <p className="text-[14px] font-bold font-display text-slate-800 tracking-tight leading-tight">
          Ready to <span className="text-emerald-600">settle into</span> your City?
        </p>
        <p className="text-[9.5px] text-slate-500 leading-snug">
          Practical guides, checklists, and local advice.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('guides')}
        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between gap-2 text-left hover:border-emerald-400 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[9.5px] text-slate-400 truncate">Search guides...</span>
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[9px] font-semibold shrink-0">
          Search
        </span>
      </button>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-brand-navy">Start here</p>
        <div className="grid grid-cols-2 gap-2">
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
                className="p-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-emerald-200 transition-colors text-left cursor-pointer space-y-1.5"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${topic.tint}`}>
                  <TopicIcon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] font-bold text-brand-navy leading-tight">{topic.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <p className="text-[10px] font-bold text-brand-navy">Latest reads</p>
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
            className="w-full text-left p-2.5 rounded-2xl border border-emerald-100/80 hover:border-emerald-300 bg-white transition-colors cursor-pointer"
          >
            <p className="text-[9px] font-semibold text-emerald-600">
              {guide.category || 'City Guide'}
              {guide.read_time ? ` · ${guide.read_time}` : ''}
            </p>
            <p className="text-[10.5px] font-bold text-brand-navy line-clamp-2 leading-snug mt-0.5">
              {guide.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Real MarketplaceView ("Unlocked Good Stuff") screen layout with clean mockup listings
  const renderStuffScreenContent = () => (
    <div className="space-y-2.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/80 shrink-0">
            <Shirt className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold font-display text-slate-800 tracking-tight leading-tight truncate">
              Unlocked <span className="text-purple-600">Good Stuff</span>
            </p>
            <p className="text-[8.5px] text-slate-500 truncate">Neighbor marketplace</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('marketplace')}
          className="px-2 py-1 bg-purple-600 text-white text-[8.5px] font-bold rounded-lg flex items-center gap-0.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Post</span>
        </button>
      </div>

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => onNavigate('marketplace')}
          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center gap-2 text-left hover:border-purple-400 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span className="text-[9.5px] text-slate-400 truncate">
            Search bikes, desks, uniforms, strollers...
          </span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[9px] font-semibold text-slate-700 flex items-center gap-1.5 truncate cursor-pointer hover:bg-white"
          >
            <Tag className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="truncate">All Categories</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[9px] font-semibold text-slate-700 flex items-center gap-1.5 truncate cursor-pointer hover:bg-white"
          >
            <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="truncate">All Areas</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {MOCK_STUFF_ADS.map((ad) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="text-left rounded-2xl border border-slate-100 hover:border-purple-200 bg-white overflow-hidden transition-colors cursor-pointer flex flex-col"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-purple-50/40">
              <img
                src={ad.previewImage}
                alt={ad.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-[10px] font-bold text-brand-navy truncate">{ad.title}</p>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] text-slate-500 truncate">{ad.location}</span>
                <span className="text-[10px] font-bold text-purple-700 tabular-nums shrink-0">
                  €{ad.price}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Real HomeView screen layout
  const renderHeroHomeScreenContent = () => (
    <div className="space-y-2.5">
      <div className="text-left px-0.5 space-y-0.5">
        <p className="text-[15px] font-bold font-display text-brand-navy tracking-tight leading-tight">
          {currentUser && userProfile?.full_name
            ? `Hello ${userProfile.full_name.split(' ')[0]}, 👋`
            : 'Hello Guest, 👋'}
        </p>
        <p className="text-brand-blue font-bold italic text-[11px] leading-snug inline-flex flex-wrap items-center gap-x-0.5">
          <span>Discover</span>
          <RotatingCylinderWord />
          <span>better, belong faster.</span>
        </p>
      </div>

      <div className="flex justify-center pt-1 -mb-2 pointer-events-none select-none">
        <img
          src="/people.png"
          alt="Community illustration"
          className="w-[178px] h-auto object-contain block"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 rounded-2xl bg-gradient-to-br from-white to-[#f8fafc] p-3 border-2 border-blue-200/80 shadow-[0_4px_18px_rgba(22,119,255,0.06)] space-y-2.5 text-left">
        <div className="space-y-0.5">
          <p className="text-[12px] font-bold text-brand-navy tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
            <span>
              <span className="text-brand-blue">Find</span> a recommended pro with Jane
            </span>
          </p>
          <p className="text-[9.5px] text-slate-500 leading-snug">
            Jane, your AI assistant, helps you find trusted local specialists.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full bg-white rounded-xl border-2 border-blue-200/90 px-2.5 py-2 flex items-center gap-2 text-left hover:border-brand-blue transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
          <span className="text-[10px] text-slate-400 font-medium truncate">
            English-speaking dentist nearby...
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="w-full py-2 bg-brand-blue hover:bg-[#0958d9] text-white rounded-xl font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3 h-3" />
          <span>Find professionals</span>
        </button>

        <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[8.5px]">
          <Lock className="w-2.5 h-2.5 shrink-0" />
          <span>100% secure. Jane is here to help.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 text-left">
        <button
          type="button"
          onClick={() => setHeroPhoneTab('events')}
          className="p-2.5 rounded-2xl border border-orange-100 bg-orange-50/40 hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <p className="text-[9px] font-bold text-orange-600">This Weekend</p>
          <p className="text-[10.5px] font-bold text-brand-navy truncate mt-0.5">Local Events →</p>
        </button>
        <button
          type="button"
          onClick={() => setHeroPhoneTab('guides')}
          className="p-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <p className="text-[9px] font-bold text-emerald-600">Newcomer Tips</p>
          <p className="text-[10.5px] font-bold text-brand-navy truncate mt-0.5">City Guides →</p>
        </button>
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
              <div>
                <Logo className="items-start" />
              </div>

              <div className="space-y-5">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  iOS &amp; Android <span aria-hidden="true" className="mx-2 text-brand-yellow font-bold">·</span> Free to join
                </p>

                <h1
                  className="font-display font-bold tracking-tight text-brand-navy leading-[1.08] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.65rem)' }}
                >
                  Discover your new city, <span className="text-brand-blue">belong faster.</span>
                </h1>

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
      <section id="section-find-pros" className="py-20 sm:py-24 border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3.5">
                <p className="text-sm font-bold text-brand-blue tabular-nums">01. Find Pros</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Trusted pros, matched in seconds.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Ask Jane in your own words to find community-recommended specialists who speak your language.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5">AI matching with Jane in plain language</li>
                <li className="py-3.5">Verified resident reviews &amp; spoken languages</li>
                <li className="py-3.5">Direct contact with zero middlemen</li>
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
              <div className="rounded-[32px] bg-[#F4F7FF] border border-blue-100 px-6 py-10 sm:px-10 sm:py-12">
                <AppScreenFrame
                  idSuffix="find-pros"
                  activeTab="explore"
                  onTabClick={handleScreenNav}
                >
                  {renderFindProsScreenContent()}
                </AppScreenFrame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 02: Events (Real App Screen w/ Mockup Data Left, Concise Copy Right) */}
      <section id="section-events" className="py-20 sm:py-24 bg-[#F8FAFF] border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-[32px] bg-[#FFF8F3] border border-orange-100 px-6 py-10 sm:px-10 sm:py-12">
                <AppScreenFrame
                  idSuffix="events"
                  activeTab="events"
                  onTabClick={handleScreenNav}
                >
                  {renderEventsScreenContent()}
                </AppScreenFrame>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-7">
              <div className="space-y-3.5">
                <p className="text-sm font-bold text-orange-500 tabular-nums">02. Events</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Curated weekly plans around you.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Discover local meetups, markets, concerts, and weekend outings in one clear calendar.
                </p>
              </div>

              <ul className="divide-y divide-slate-200/70 border-y border-slate-200/70 text-sm font-medium text-brand-navy">
                <li className="py-3.5">Filter by today, tomorrow, or this weekend</li>
                <li className="py-3.5">Schedules, venues &amp; highlights at a glance</li>
                <li className="py-3.5">Weekly community picks &amp; alerts</li>
              </ul>

              <div>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-navy hover:bg-brand-blue text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
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
      <section id="section-guides" className="py-20 sm:py-24 border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 space-y-7">
              <div className="space-y-3.5">
                <p className="text-sm font-bold text-emerald-600 tabular-nums">03. Guides</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Clear playbooks to settle in faster.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Step-by-step local guides written from real experience so nothing gets lost in translation.
                </p>
              </div>

              <ul className="divide-y divide-slate-100 border-y border-slate-100 text-sm font-medium text-brand-navy">
                <li className="py-3.5">Housing, paperwork, transport &amp; healthcare</li>
                <li className="py-3.5">Practical checklists with zero fluff</li>
                <li className="py-3.5">Instant keyword search</li>
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
              <div className="rounded-[32px] bg-[#F2FAF6] border border-emerald-100 px-6 py-10 sm:px-10 sm:py-12">
                <AppScreenFrame
                  idSuffix="guides"
                  activeTab="guides"
                  onTabClick={handleScreenNav}
                >
                  {renderGuidesScreenContent()}
                </AppScreenFrame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 04: Stuff (Real App Screen w/ Mockup Data Left, Concise Copy Right) */}
      <section id="section-stuff" className="py-20 sm:py-24 bg-[#F8FAFF] border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-[32px] bg-[#F8F5FF] border border-purple-100 px-6 py-10 sm:px-10 sm:py-12">
                <AppScreenFrame
                  idSuffix="stuff"
                  activeTab="marketplace"
                  onTabClick={handleScreenNav}
                >
                  {renderStuffScreenContent()}
                </AppScreenFrame>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-7">
              <div className="space-y-3.5">
                <p className="text-sm font-bold text-purple-600 tabular-nums">04. Stuff</p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.12] [text-wrap:balance]">
                  Buy and sell locally with neighbors.
                </h2>
                <p className="text-base text-slate-500 leading-[1.65]">
                  Trade bikes, furniture, kids&apos; gear, and home essentials inside a trusted local community.
                </p>
              </div>

              <ul className="divide-y divide-slate-200/70 border-y border-slate-200/70 text-sm font-medium text-brand-navy">
                <li className="py-3.5">Filter by category, area &amp; budget</li>
                <li className="py-3.5">Private in-app chat with members</li>
                <li className="py-3.5">Post an item in under a minute</li>
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

      {/* 6. Why Unlocked (Concise Trust Principles — No Featured Partner) */}
      <section className="py-20 sm:py-24 bg-white border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-3.5">
              <p className="text-sm font-bold text-brand-blue">Why MyCityUnlocked</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand-navy leading-[1.15] [text-wrap:balance]">
                Built on real word-of-mouth.
              </h2>
              <div className="h-1 w-12 bg-brand-yellow rounded-full" aria-hidden="true" />
            </div>

            <div className="lg:col-span-7 divide-y divide-slate-100 bg-[#F8FAFF] rounded-3xl border border-blue-100 px-7 sm:px-10">
              {[
                {
                  index: '01.',
                  title: 'Community powered',
                  body: 'Recommendations shared by real residents.',
                  color: 'text-emerald-600',
                },
                {
                  index: '02.',
                  title: 'Reviewed by members',
                  body: 'Honest feedback and languages, never paid rankings.',
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
            <p>Made for international communities</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
