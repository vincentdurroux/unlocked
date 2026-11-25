import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Home,
  Instagram,
  Lock,
  Mail,
  Menu,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { RotatingCylinderWord } from './RotatingCylinderWord';
import type { AppPartner } from '../services/partnerService';
import heroCityImg from '../assets/images/valencia_hero_editorial_1795634116923.jpg';
import localProImg from '../assets/images/valencia_local_pro_1795634118527.jpg';
import socialEventsImg from '../assets/images/valencia_social_events_1795634120123.jpg';
import cityGuideImg from '../assets/images/valencia_city_guide_1795634119504.jpg';

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

export function WebLandingPage({
  allPros,
  events,
  allArticles,
  ads,
  allPartners,
  highlightedProIds,
  highlightedEventIds,
  currentUser,
  userProfile,
  unreadConversationsCount,
  onNavigate,
  onAddPro,
  onOpenAppMode,
}: WebLandingPageProps) {
  const [phoneTab, setPhoneTab] = useState<PhoneTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const featuredPros = useMemo(() => {
    const highlighted = allPros.filter(
      (p) =>
        p.is_highlighted === true ||
        p.is_highlighted === 'true' ||
        highlightedProIds.includes(String(p.id))
    );
    const pool = highlighted.length > 0 ? highlighted : allPros;
    return pool.slice(0, 3);
  }, [allPros, highlightedProIds]);

  const upcomingEvents = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    const future = events.filter((ev) => {
      const d = ev.start_date || ev.date || '';
      return !d || d >= todayIso;
    });
    const highlighted = future.filter(
      (ev) =>
        ev.is_highlighted === true ||
        ev.is_highlighted === 'true' ||
        highlightedEventIds.includes(String(ev.id))
    );
    const pool = highlighted.length > 0 ? highlighted : future.length > 0 ? future : events;
    return pool.slice(0, 3);
  }, [events, highlightedEventIds]);

  const featuredGuides = useMemo(() => {
    const online = allArticles.filter((a) => a.isOnline !== false);
    const highlighted = online.filter((a) => a.is_highlighted === true || a.is_highlighted === 'true');
    const pool = highlighted.length > 0 ? highlighted : online;
    return pool.slice(0, 3);
  }, [allArticles]);

  const featuredAds = useMemo(() => ads.slice(0, 3), [ads]);

  const activePartner = useMemo(() => {
    const active = allPartners.filter((p) => p.is_active !== false);
    return active[0] || null;
  }, [allPartners]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavAction = (view: string) => {
    setMobileMenuOpen(false);
    onNavigate(view);
  };

  const phoneNavItems: Array<{ id: PhoneTab | 'profile'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'explore', label: 'Find Pro', icon: Search },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'guides', label: 'Guides', icon: BookOpen },
    { id: 'marketplace', label: 'Stuff', icon: Shirt },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-full w-full bg-white text-brand-navy font-sans select-text selection:bg-brand-blue/15 selection:text-brand-navy">
      {/* 1. Clean 3-Zone Top Bar */}
      <header
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100"
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10 h-[66px] lg:h-[76px] flex items-center justify-between gap-4 lg:gap-8">
          <button
            type="button"
            onClick={() => scrollToSection('web-landing-top')}
            className="flex items-center shrink-0 whitespace-nowrap hover:opacity-85 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded-lg"
            aria-label="MyCityUnlocked Home"
          >
            <Logo className="items-start" />
          </button>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => scrollToSection('features-bento')}
              className="hover:text-brand-blue underline-offset-8 hover:underline decoration-brand-blue/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNavAction('explore')}
              className="hover:text-brand-blue underline-offset-8 hover:underline decoration-brand-blue/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Professionals
            </button>
            <button
              type="button"
              onClick={() => handleNavAction('events')}
              className="hover:text-brand-blue underline-offset-8 hover:underline decoration-brand-blue/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Events
            </button>
            <button
              type="button"
              onClick={() => handleNavAction('guides')}
              className="hover:text-brand-blue underline-offset-8 hover:underline decoration-brand-blue/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Guides
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('download-app')}
              className="hover:text-brand-blue underline-offset-8 hover:underline decoration-brand-blue/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Download
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => handleNavAction('profile')}
                className="px-4 lg:px-5 py-2 lg:py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-navy hover:bg-brand-blue rounded-xl transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
              >
                {userProfile?.full_name
                  ? `${userProfile.full_name.split(' ')[0]}'s Account`
                  : 'My Account'}
                {unreadConversationsCount > 0 ? ` (${unreadConversationsCount})` : ''}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavAction('login')}
                className="px-4 lg:px-5 py-2 lg:py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-blue hover:bg-[#0958d9] rounded-xl transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-brand-navy hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 px-6 sm:px-8 py-4 space-y-1 shadow-lg">
            {[
              { label: 'Features', action: () => scrollToSection('features-bento') },
              { label: 'Professionals', action: () => handleNavAction('explore') },
              { label: 'Events', action: () => handleNavAction('events') },
              { label: 'Guides', action: () => handleNavAction('guides') },
              { label: 'Stuff', action: () => handleNavAction('marketplace') },
              { label: 'Download App', action: () => scrollToSection('download-app') },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="w-full text-left py-2.5 px-2 text-sm font-semibold text-brand-navy hover:text-brand-blue transition-colors cursor-pointer block"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAppMode();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E9ECFF]/70 hover:bg-[#E9ECFF] text-sm font-semibold text-brand-navy flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-brand-blue" />
                <span>Open Web App</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section: Minimalist, Airy, City-Agnostic + Exact Mobile App Mockup */}
      <section id="web-landing-top" className="pt-12 pb-20 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Clean, Minimal Proposition */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-5">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  iOS &amp; Android <span aria-hidden="true" className="mx-2 text-brand-yellow font-bold">·</span> Free to join
                </p>

                <h1
                  className="font-display font-bold tracking-tight text-brand-navy leading-[1.1] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.2rem, 4.2vw, 3.6rem)' }}
                >
                  Discover your new city, <span className="text-brand-blue">belong faster.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-500 leading-[1.7] max-w-[44ch]">
                  Trusted local pros, curated events, practical guides, and community essentials — all in one app recommended by residents.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3.5">
                  <StoreBadge store="ios" variant="dark" />
                  <StoreBadge store="android" variant="dark" />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <button
                    type="button"
                    onClick={onOpenAppMode}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy transition-colors whitespace-nowrap shrink-0 cursor-pointer group"
                  >
                    <span>Open web app</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onAddPro}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-navy transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Recommend a pro</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Editorial Frame + Exact Mobile App Screen inside iPhone */}
            <div className="lg:col-span-6">
              <div className="relative min-h-[590px] sm:min-h-[620px] rounded-[32px] overflow-hidden border border-blue-100 bg-[#E9ECFF]">
                <img
                  src={heroCityImg}
                  alt="Sunlit city street and outdoor terrace"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 via-brand-navy/30 to-brand-blue/15" />

                {/* Interactive iPhone showing the EXACT MyCityUnlocked Mobile UI */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-5 sm:p-8">
                  <div className="w-full max-w-[330px] rounded-[42px] bg-[#0A0F2C] p-[9px] shadow-[0_28px_68px_rgba(10,15,44,0.45)] border border-white/20">
                    <div className="bg-white rounded-[34px] overflow-hidden flex flex-col h-[556px] sm:h-[570px] relative">
                      {/* iOS Status Bar */}
                      <div className="px-5 pt-2.5 pb-1 flex items-center justify-between bg-white shrink-0">
                        <span className="text-[10px] font-bold text-brand-navy tabular-nums">9:41</span>
                        <div className="w-[76px] h-[18px] rounded-full bg-[#0A0F2C]" aria-hidden="true" />
                        <div className="flex items-center gap-1">
                          <span className="w-3.5 h-2 rounded-[2px] border border-brand-navy/70 inline-flex items-center p-[1px]">
                            <span className="w-full h-full bg-brand-navy rounded-[1px]" />
                          </span>
                        </div>
                      </div>

                      {/* Exact Real Mobile App Header */}
                      <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                        <img
                          src="/logo.png?v=3"
                          alt="MyCityUnlocked"
                          className="h-7 w-auto object-contain shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                          <Sun className="w-4 h-4 text-amber-500 fill-amber-300/60 shrink-0" />
                          <div className="flex flex-col leading-none text-left">
                            <span className="text-[11px] font-bold font-display text-brand-navy tabular-nums">24°C</span>
                            <span className="text-[8.5px] font-semibold text-slate-500">Your City</span>
                          </div>
                        </div>

                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 filter drop-shadow-[0_1px_3px_rgba(217,119,6,0.3)]" aria-hidden="true">
                            <defs>
                              <linearGradient id="phoneMockBellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FFE066" />
                                <stop offset="40%" stopColor="#FFB300" />
                                <stop offset="100%" stopColor="#F59E0B" />
                              </linearGradient>
                              <linearGradient id="phoneMockClapperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#D97706" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M12 2.25c-1.1 0-2 .9-2 2v.45c-2.82.57-5 3.06-5 6.05v4.5c0 .65-.28 1.25-.78 1.68l-.47.41c-.6.53-.22 1.54.59 1.54h15.32c.81 0 1.19-1.01.59-1.54l-.47-.41a2.24 2.24 0 0 1-.78-1.68v-4.5c0-2.99-2.18-5.48-5-6.05v-.45c0-1.1-.9-2-2-2z"
                              fill="url(#phoneMockBellGrad)"
                            />
                            <path d="M9.5 19.38c.4 1.5 1.76 2.62 3.5 2.62s3.1-1.12 3.5-2.62h-7z" fill="url(#phoneMockClapperGrad)" />
                          </svg>
                        </div>
                      </div>

                      {/* Exact Real Mobile Screen Content */}
                      <div className="flex-1 overflow-y-auto no-scrollbar bg-white px-3.5 pt-3 pb-3">
                        {phoneTab === 'home' && (
                          <div className="space-y-0">
                            <div className="text-left px-0.5 space-y-0.5">
                              <p className="text-[16px] font-bold font-display text-brand-navy tracking-tight leading-tight">
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

                            <div className="flex justify-center pt-1.5 -mb-2 pointer-events-none select-none">
                              <img
                                src="/people.png"
                                alt="Community illustration"
                                className="w-[184px] h-auto object-contain block"
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
                                  Jane, your AI assistant, is here to help you find the right pro.
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
                                className="w-full py-2 bg-brand-blue hover:bg-[#0958d9] text-white rounded-xl font-bold text-[11px] shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Find professionals</span>
                              </button>

                              <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[8.5px]">
                                <Lock className="w-2.5 h-2.5 shrink-0" />
                                <span>100% secure. Jane is here to help.</span>
                              </div>

                              <button
                                type="button"
                                onClick={onAddPro}
                                className="w-full mt-1 flex items-center justify-between gap-2 bg-amber-50/80 hover:bg-amber-50 rounded-xl p-2 border border-amber-200/80 transition-colors cursor-pointer text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-brand-yellow/20 text-amber-700 flex items-center justify-center shrink-0">
                                    <UserPlus className="w-3 h-3 text-amber-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-brand-navy text-[10px] leading-tight truncate">
                                      Know someone great? 🌟
                                    </p>
                                    <p className="text-[8.5px] text-slate-600 truncate">
                                      Recommend a local pro
                                    </p>
                                  </div>
                                </div>
                                <span className="px-2 py-1 bg-brand-yellow text-brand-navy font-bold text-[9px] rounded-lg shrink-0">
                                  Add →
                                </span>
                              </button>
                            </div>
                          </div>
                        )}

                        {phoneTab === 'explore' && (
                          <div className="space-y-2.5 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold font-display text-brand-navy">Find a Professional</p>
                              <span className="text-[10px] font-semibold text-brand-blue tabular-nums">
                                {allPros.length > 0 ? `${allPros.length} pros` : 'Directory'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate('explore')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-blue-200/80 bg-blue-50/30 text-[10.5px] text-slate-500 cursor-pointer hover:border-brand-blue transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                              <span className="truncate">Ask Jane or browse categories...</span>
                            </button>

                            <div className="space-y-2 pt-0.5">
                              {(featuredPros.length > 0
                                ? featuredPros.slice(0, 3)
                                : [
                                    { id: 'sample-1', name: 'Dr. Elena Martinez', profession: 'Physiotherapist', rating: 5.0, languages: ['English', 'Spanish'] },
                                    { id: 'sample-2', name: 'Cabinet Sante', profession: 'Osteopath', rating: 4.9, languages: ['French', 'English'] },
                                    { id: 'sample-3', name: 'Local Legal Advisors', profession: 'Immigration & Tax', rating: 5.0, languages: ['English', 'French'] },
                                  ]
                              ).map((pro: any) => (
                                <button
                                  key={pro.id}
                                  type="button"
                                  onClick={() =>
                                    onNavigate(
                                      'explore',
                                      String(pro.id).startsWith('sample-') ? undefined : { proId: pro.id }
                                    )
                                  }
                                  className="w-full text-left p-2.5 rounded-2xl border border-slate-100 hover:border-blue-200 bg-white shadow-xs transition-colors cursor-pointer"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[11.5px] font-bold text-brand-navy truncate">{pro.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                        {pro.profession || pro.title || pro.category || 'Recommended Pro'}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-brand-navy tabular-nums shrink-0">
                                      <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />
                                      {(pro.rating || 5).toFixed(1)}
                                    </span>
                                  </div>
                                  <p className="text-[9.5px] text-brand-blue font-medium mt-1 truncate">
                                    {Array.isArray(pro.languages) && pro.languages.length > 0
                                      ? pro.languages.slice(0, 3).join(' · ')
                                      : 'Member verified'}
                                  </p>
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate('explore')}
                              className="w-full py-2 rounded-xl bg-brand-blue hover:bg-[#0958d9] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Open Directory →
                            </button>
                          </div>
                        )}

                        {phoneTab === 'events' && (
                          <div className="space-y-2.5 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold font-display text-brand-navy">Local Events</p>
                              <span className="text-[10px] font-semibold text-brand-blue">This Week</span>
                            </div>

                            <div className="space-y-2">
                              {(upcomingEvents.length > 0
                                ? upcomingEvents.slice(0, 3)
                                : [
                                    { id: 'ev-1', title: 'Sunset Run & Social', start_date: 'This Weekend', location: 'City Park' },
                                    { id: 'ev-2', title: 'International Wine & Meet', start_date: 'Friday · 19:30', location: 'Downtown' },
                                    { id: 'ev-3', title: 'Sunday Artisans Market', start_date: 'Sunday · 10:30', location: 'Old Town' },
                                  ]
                              ).map((ev: any) => (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={() =>
                                    onNavigate(
                                      'events',
                                      String(ev.id).startsWith('ev-') ? undefined : { eventId: ev.id }
                                    )
                                  }
                                  className="w-full text-left p-2.5 rounded-2xl border border-blue-100/80 hover:border-brand-blue/50 bg-gradient-to-br from-white to-blue-50/30 transition-colors cursor-pointer"
                                >
                                  <p className="text-[11.5px] font-bold text-brand-navy line-clamp-1">{ev.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    {ev.start_date || ev.date || 'Upcoming'}
                                    {ev.location ? ` · ${ev.location}` : ''}
                                  </p>
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate('events')}
                              className="w-full py-2 rounded-xl bg-brand-blue hover:bg-[#0958d9] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Explore Events →
                            </button>
                          </div>
                        )}

                        {phoneTab === 'guides' && (
                          <div className="space-y-2.5 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold font-display text-brand-navy">Tips of the Week</p>
                              <span className="text-[10px] font-semibold text-teal-600">Guides</span>
                            </div>

                            <div className="space-y-2">
                              {(featuredGuides.length > 0
                                ? featuredGuides.slice(0, 3)
                                : [
                                    { id: 'g-1', title: 'Essential paperwork for newcomers', category: 'Paperwork' },
                                    { id: 'g-2', title: 'How to choose your neighborhood', category: 'Living' },
                                    { id: 'g-3', title: 'Healthcare & family setup', category: 'Health' },
                                  ]
                              ).map((guide: any) => (
                                <button
                                  key={guide.id}
                                  type="button"
                                  onClick={() =>
                                    onNavigate(
                                      'guides',
                                      String(guide.id).startsWith('g-') ? undefined : { guideId: guide.id }
                                    )
                                  }
                                  className="w-full text-left p-2.5 rounded-2xl border border-teal-100 hover:border-teal-400/60 bg-gradient-to-br from-white to-teal-50/30 transition-colors cursor-pointer"
                                >
                                  <p className="text-[9.5px] font-bold text-teal-600">
                                    {guide.category || 'City Guide'}
                                  </p>
                                  <p className="text-[11px] font-bold text-brand-navy line-clamp-2 mt-0.5 leading-snug">
                                    {guide.title}
                                  </p>
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate('guides')}
                              className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Read Guides →
                            </button>
                          </div>
                        )}

                        {phoneTab === 'marketplace' && (
                          <div className="space-y-2.5 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold font-display text-brand-navy">Community Stuff</p>
                              <span className="text-[10px] font-semibold text-amber-600">Local</span>
                            </div>

                            <div className="space-y-2">
                              {(featuredAds.length > 0
                                ? featuredAds
                                : [
                                    { id: 'ad-1', title: 'City Bike + Basket', price: '120€' },
                                    { id: 'ad-2', title: 'Oak Work Desk', price: '95€' },
                                    { id: 'ad-3', title: 'Stroller (Like New)', price: '140€' },
                                  ]
                              ).map((ad: any) => (
                                <button
                                  key={ad.id}
                                  type="button"
                                  onClick={() => onNavigate('marketplace')}
                                  className="w-full text-left p-2.5 rounded-2xl border border-amber-100 hover:border-brand-yellow bg-amber-50/30 transition-colors cursor-pointer flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-brand-navy truncate">{ad.title}</p>
                                    {ad.location && (
                                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5">{ad.location}</p>
                                    )}
                                  </div>
                                  {ad.price !== undefined && ad.price !== null && (
                                    <span className="text-[11px] font-bold text-brand-navy tabular-nums shrink-0">
                                      {typeof ad.price === 'number' ? `${ad.price}€` : ad.price}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => onNavigate('marketplace')}
                              className="w-full py-2 rounded-xl bg-brand-blue hover:bg-[#0958d9] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Browse Stuff →
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Exact Real Mobile App Bottom Navigation Bar */}
                      <div className="px-1.5 py-1.5 bg-white border-t border-slate-100 grid grid-cols-6 gap-0.5 shrink-0">
                        {phoneNavItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = item.id === phoneTab;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (item.id === 'profile') {
                                  onNavigate(currentUser ? 'profile' : 'login');
                                } else {
                                  setPhoneTab(item.id);
                                }
                              }}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 02: Airy 4-Pillar Bento Showcase */}
      <section id="features-bento" className="py-20 sm:py-28 border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10 space-y-14">
          <div className="max-w-xl space-y-3">
            <p className="text-sm font-bold text-brand-blue">Inside the app</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-navy leading-[1.15] [text-wrap:balance]">
              Everything you need to feel at home.
            </h2>
          </div>

          <div className="space-y-8">
            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* 01. Trusted Professionals */}
              <article className="lg:col-span-7 rounded-3xl bg-white border border-blue-100 overflow-hidden flex flex-col justify-between">
                <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-7 space-y-4">
                    <p className="text-xs font-bold text-brand-blue tabular-nums">01. Professionals &amp; Jane AI</p>
                    <h3 className="font-display text-2xl font-bold text-brand-navy tracking-tight [text-wrap:balance]">
                      Vetted pros, matched in seconds
                    </h3>
                    <p className="text-sm sm:text-[15px] text-slate-500 leading-relaxed">
                      Ask Jane in your own words to find trusted local specialists who speak your language.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('explore')}
                      className="pt-1 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:text-brand-navy transition-colors cursor-pointer group"
                    >
                      <span>Explore pros</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  <div className="md:col-span-5">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-blue-100/80">
                      <img
                        src={localProImg}
                        alt="Bright local specialist office"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* 02. Local Events */}
              <article className="lg:col-span-5 rounded-3xl bg-white border border-blue-100 overflow-hidden flex flex-col justify-between">
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 border-b border-blue-100/70">
                  <img
                    src={socialEventsImg}
                    alt="Residents gathering at an outdoor evening event"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 space-y-3">
                  <p className="text-xs font-bold text-brand-blue tabular-nums">02. Events</p>
                  <h3 className="font-display text-2xl font-bold text-brand-navy tracking-tight">
                    Curated weekly plans
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Meetups, markets, and weekend highlights happening around you.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('events')}
                    className="pt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:text-brand-navy transition-colors cursor-pointer group"
                  >
                    <span>See events</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </article>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* 03. Practical Guides */}
              <article className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-white to-teal-50/25 border border-teal-100 overflow-hidden flex flex-col justify-between">
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 border-b border-teal-100/70">
                  <img
                    src={cityGuideImg}
                    alt="Sunlit urban park path"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-8 space-y-3">
                  <p className="text-xs font-bold text-teal-600 tabular-nums">03. Practical Guides</p>
                  <h3 className="font-display text-2xl font-bold text-brand-navy tracking-tight">
                    Clear local answers
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Step-by-step guides for paperwork, health, housing, and daily life.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('guides')}
                    className="pt-2 inline-flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-brand-navy transition-colors cursor-pointer group"
                  >
                    <span>Read guides</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </article>

              {/* 04. Community Stuff & Recommendations */}
              <article className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-white via-amber-50/30 to-[#FFFDF5] border border-amber-200/70 p-8 sm:p-10 flex flex-col justify-between space-y-8">
                <div className="space-y-3 max-w-lg">
                  <p className="text-xs font-bold text-amber-600 tabular-nums">04. Community Exchange</p>
                  <h3 className="font-display text-2xl font-bold text-brand-navy tracking-tight [text-wrap:balance]">
                    Share essentials and recommend great pros
                  </h3>
                  <p className="text-sm sm:text-[15px] text-slate-500 leading-relaxed">
                    Buy and sell locally with neighbors on Stuff, or add a pro you trust to help the community.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-5 pt-6 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace')}
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-brand-navy transition-colors cursor-pointer group"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Browse Stuff</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onAddPro}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-yellow hover:bg-amber-500 text-brand-navy font-bold text-xs transition-colors cursor-pointer group"
                  >
                    <span>Recommend a Pro</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 03: Minimalist Trust Principles */}
      <section className="py-20 sm:py-28 bg-[#F4F7FF] border-y border-blue-100/80">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-sm font-bold text-brand-blue">Why Unlocked</p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand-navy leading-[1.15] [text-wrap:balance]">
                Built on real word-of-mouth.
              </h2>
              <div className="h-1 w-12 bg-brand-yellow rounded-full" aria-hidden="true" />

              {activePartner && (
                <div className="pt-6 mt-6 border-t border-blue-200/60 space-y-1.5">
                  <p className="text-xs font-bold text-slate-400">Featured Partner</p>
                  <p className="text-sm font-bold text-brand-navy">{activePartner.business_name}</p>
                  {activePartner.website && /^https?:\/\//i.test(activePartner.website.trim()) && (
                    <a
                      href={activePartner.website.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue hover:text-brand-navy transition-colors pt-0.5"
                    >
                      <span>Visit partner</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 divide-y divide-slate-100 bg-white rounded-3xl border border-blue-100 px-7 sm:px-10">
              {[
                {
                  index: '01.',
                  title: 'Community powered',
                  body: 'Real recommendations shared by people living in your city.',
                  color: 'text-emerald-600',
                },
                {
                  index: '02.',
                  title: 'Reviewed by members',
                  body: 'Honest feedback and spoken languages, not paid ad rankings.',
                  color: 'text-brand-blue',
                },
                {
                  index: '03.',
                  title: 'Local first',
                  body: 'Focused on what genuinely helps you settle in and connect.',
                  color: 'text-amber-500',
                },
              ].map((pillar) => (
                <div key={pillar.index} className="py-7 flex items-start gap-5">
                  <span className={`font-display text-base font-bold tabular-nums shrink-0 pt-0.5 ${pillar.color}`}>
                    {pillar.index}
                  </span>
                  <div className="space-y-1">
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

      {/* 5. Section 04: Minimal App Download Band */}
      <section id="download-app" className="py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="rounded-[32px] bg-brand-navy text-white overflow-hidden px-8 py-12 sm:px-14 sm:py-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div className="space-y-4 max-w-xl">
              <p className="text-xs sm:text-sm font-semibold text-brand-yellow">
                iOS &amp; Android <span aria-hidden="true" className="mx-2 text-white/30">·</span> Free Download
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.12] [text-wrap:balance]">
                Take your city in your pocket.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Save favorite pros, get weekly event alerts, message neighbors, and sign in with Face ID or fingerprint.
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

      {/* 6. Quiet Brand Footer (#E9ECFF) */}
      <footer
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}
        className="bg-[#E9ECFF] text-brand-navy border-t border-brand-navy/5 pt-14"
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 xl:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-brand-navy/10">
            <div className="sm:col-span-2 lg:col-span-4 space-y-4">
              <Logo className="items-start" />
              <p className="text-sm text-brand-navy/70 leading-relaxed max-w-xs">
                Trusted local pros, events, and practical guides for international residents.
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
                    Professionals
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
