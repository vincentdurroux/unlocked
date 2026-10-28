import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Event } from '../App';
import { 
  formatEventDate, 
  getEventStartDate,
  getEventEndDate,
  isYearRoundEvent 
} from '../utils/eventFormatter';
import { cn } from '../lib/utils';
import { DiscoverCardEventSkeleton } from './CardSkeletons';

interface LandingEventHighlightsCardProps {
  events: Event[];
  highlightedEventIds?: string[];
  onNavigate: (view: string, params?: { eventId?: string; searchQuery?: string }) => void;
  loading?: boolean;
}

export function getCurrentWeekendInterval(refDate = new Date()) {
  const now = new Date(refDate);
  const day = now.getDay();
  // In JS getDay(): 0 is Sunday, 1 is Monday ... 5 is Friday, 6 is Saturday
  const diffToFriday = day === 0 ? -2 : 5 - day;
  const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToFriday, 0, 0, 0, 0);
  const sunday = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2, 23, 59, 59, 999);
  return { friday, sunday };
}

function formatWeekendDateRange(refDate = new Date()): string {
  const { friday, sunday } = getCurrentWeekendInterval(refDate);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sM = months[friday.getMonth()];
  const eM = months[sunday.getMonth()];

  if (sM === eM) {
    return `${friday.getDate()}–${sunday.getDate()} ${sM}`;
  }
  return `${friday.getDate()} ${sM} – ${sunday.getDate()} ${eM}`;
}

function getEventBadgeLabel(event: Event, refDate = new Date()): string {
  if (isYearRoundEvent(event)) {
    return 'Permanent';
  }

  const s = getEventStartDate(event);
  if (!s) return 'Upcoming';

  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  const startOfEvent = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
  const diffDays = Math.round((startOfEvent.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return '🔥 Today';
  if (diffDays === 1) return 'Tomorrow';

  const dayOfWeek = s.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (diffDays >= 0 && diffDays <= 7) {
    if (dayOfWeek === 5) return '🎉 This Friday';
    if (dayOfWeek === 6) return '🌟 This Saturday';
    if (dayOfWeek === 0) return '☀️ This Sunday';
    return `${dayNames[dayOfWeek]} ${s.getDate()} ${monthNames[s.getMonth()]}`;
  }

  return `${s.getDate()} ${monthNames[s.getMonth()]}`;
}

export const LandingEventHighlightsCard: React.FC<LandingEventHighlightsCardProps> = ({
  events,
  onNavigate,
  loading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentIndexRef = useRef(0);
  const itemStepRef = useRef(211);
  const rafRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically refresh date periodically so weekend shifts seamlessly as time progresses
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute current upcoming weekend range dynamically (e.g. "30 Oct – 1 Nov")
  const weekendRange = useMemo(() => formatWeekendDateRange(currentDate), [currentDate]);

  // Strictly filter events occurring within the active upcoming weekend interval (Friday to Sunday)
  const activeEvents = useMemo(() => {
    const { friday, sunday } = getCurrentWeekendInterval(currentDate);

    const weekendEvents = events.filter((e) => {
      // Explicitly exclude Year Round / permanent events
      if (isYearRoundEvent(e)) return false;

      const s = getEventStartDate(e, friday.getFullYear());
      const end = getEventEndDate(e, friday.getFullYear()) || s;
      if (!s) return false;

      return s.getTime() <= sunday.getTime() && end.getTime() >= friday.getTime();
    });

    // Fall back to general non-year-round upcoming events if no specific weekend event matches
    const finalEvents = weekendEvents.length > 0 
      ? weekendEvents 
      : events.filter((e) => !isYearRoundEvent(e)).slice(0, 8);

    return [...finalEvents].sort((a, b) => {
      const aTime = getEventStartDate(a)?.getTime() || 0;
      const bTime = getEventStartDate(b)?.getTime() || 0;
      return aTime - bTime;
    });
  }, [events, currentDate]);

  const count = activeEvents.length;

  // 7-Set Array for 100% smooth, uninterrupted native iOS WebKit momentum scrolling
  const repeatedEvents = useMemo(() => {
    if (!activeEvents || activeEvents.length === 0) return [];
    return [
      ...activeEvents, 
      ...activeEvents, 
      ...activeEvents, 
      ...activeEvents, // Set 3 [MIDDLE SAFE ZONE]
      ...activeEvents, 
      ...activeEvents, 
      ...activeEvents
    ];
  }, [activeEvents]);

  // Preload all event poster images up-front into browser cache for instant rendering
  useEffect(() => {
    if (!activeEvents || activeEvents.length === 0) return;
    
    activeEvents.forEach((event) => {
      const imageUrl = event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80";
      const img = new Image();
      img.src = imageUrl;
    });
  }, [activeEvents]);

  // Measure exact item step distance dynamically
  const measureStep = () => {
    if (!scrollContainerRef.current || count === 0) return;
    const container = scrollContainerRef.current;
    if (container.children.length >= 2) {
      const c0 = container.children[0] as HTMLElement;
      const c1 = container.children[1] as HTMLElement;
      if (c0 && c1) {
        const step = c1.offsetLeft - c0.offsetLeft;
        if (step > 50) {
          itemStepRef.current = step;
        }
      }
    }
  };

  // Sync card DOM transforms/scales directly without triggering React re-renders during active scroll
  const updateCardScales = (currentScrollLeft: number) => {
    if (count === 0) return;
    const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
    const totalCards = count * 7;

    for (let i = 0; i < totalCards; i++) {
      const cardEl = cardRefs.current[i];
      if (!cardEl) continue;

      const cardPos = i * step;
      const offsetPx = Math.abs(cardPos - currentScrollLeft);
      const ratio = Math.min(1, offsetPx / step);
      const smoothFactor = Math.max(0, 1 - ratio * 1.15);

      const scale = 0.90 + 0.18 * smoothFactor;
      const opacity = ratio > 2.2 ? 0 : 0.65 + 0.35 * smoothFactor;
      const glowOpacity = smoothFactor;

      cardEl.style.transform = `scale(${scale})`;
      cardEl.style.opacity = `${opacity}`;

      const glowEl = cardEl.querySelector('.glow-overlay') as HTMLElement;
      if (glowEl) glowEl.style.opacity = `${glowOpacity}`;

      const imgEl = cardEl.querySelector('img') as HTMLElement;
      if (imgEl) imgEl.style.transform = `scale(${1 + (scale - 0.9) * 0.4})`;

      const badgeEl = cardEl.querySelector('.badge-pill') as HTMLElement;
      if (badgeEl) {
        if (ratio < 0.35) {
          badgeEl.style.backgroundColor = '#f97316';
          badgeEl.style.color = '#ffffff';
          badgeEl.style.borderColor = '#fb923c';
        } else {
          badgeEl.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
          badgeEl.style.color = '#1e293b';
          badgeEl.style.borderColor = '#e2e8f0';
        }
      }
    }
  };

  // Initialize position in middle set (Set 3) upon mount or activeEvents change
  useEffect(() => {
    if (count === 0 || !scrollContainerRef.current) return;
    measureStep();

    const timer = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
      const initialScroll = 3 * count * step;
      container.scrollLeft = initialScroll;
      updateCardScales(initialScroll);
    });

    const handleResize = () => {
      measureStep();
      if (scrollContainerRef.current) {
        updateCardScales(scrollContainerRef.current.scrollLeft);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [count]);

  // 120Hz Native WebKit Scroll Listener: Uninterrupted hardware momentum on iOS
  const handleScroll = () => {
    if (!scrollContainerRef.current || count === 0) return;

    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const currentScrollLeft = container.scrollLeft;
      const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);

      // Update card scales instantly on GPU without interrupting WebKit momentum
      updateCardScales(currentScrollLeft);

      const vIdx = Math.round(currentScrollLeft / step);
      const normIdx = ((vIdx % count) + count) % count;

      if (normIdx !== currentIndexRef.current) {
        currentIndexRef.current = normIdx;
        setCurrentIndex(normIdx);
      }

      // Silent reset ONLY when scroll comes completely to rest (idle), 0ms flicker during swipe
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        if (!scrollContainerRef.current) return;
        const currentPos = scrollContainerRef.current.scrollLeft;
        const currentVIdx = Math.round(currentPos / step);

        const middleSetStart = 3 * count;
        const middleSetEnd = 4 * count;

        if (currentVIdx < middleSetStart || currentVIdx >= middleSetEnd) {
          const targetNormIdx = ((currentVIdx % count) + count) % count;
          const targetVIdx = middleSetStart + targetNormIdx;
          const targetScroll = targetVIdx * step;

          // Silent shift while at rest: 100% invisible to human eye
          const prevSnap = container.style.scrollSnapType;
          container.style.scrollSnapType = 'none';
          container.scrollLeft = targetScroll;
          void container.offsetWidth;
          container.style.scrollSnapType = prevSnap;

          updateCardScales(targetScroll);
        }
      }, 150);
    });
  };

  const scrollToVirtualIndex = (vIndex: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
    container.scrollTo({
      left: vIndex * step,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return <DiscoverCardEventSkeleton />;
  }

  if (count === 0) {
    return (
      <div 
        onClick={() => onNavigate('events')}
        className="flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-amber-50/30 to-orange-50/15 text-slate-900 border border-amber-200/70 shadow-sm cursor-pointer h-full min-h-[480px] relative overflow-hidden"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="text-lg font-bold font-display text-slate-900">This Weekend&apos;s Events</h3>
          </div>
          <p className="text-sm text-slate-500">Discover festivals, exhibitions, concerts, and weekend plans in Valencia.</p>
        </div>
        <span className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1 mt-4">
          See all events →
        </span>
      </div>
    );
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!scrollContainerRef.current) return;
    const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
    const currentVIdx = Math.round(scrollContainerRef.current.scrollLeft / step);
    scrollToVirtualIndex(currentVIdx + 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!scrollContainerRef.current) return;
    const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
    const currentVIdx = Math.round(scrollContainerRef.current.scrollLeft / step);
    scrollToVirtualIndex(currentVIdx - 1);
  };

  return (
    <div
      id="discover-card-event"
      className="flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-amber-50/30 to-orange-50/15 text-slate-900 border border-amber-200/70 hover:border-orange-400/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden h-full min-h-[480px] select-none"
    >
      {/* Decorative ambient glowing lights */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header: This Weekend's Events + Weekend date range + All events link */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-3 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Calendar className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold font-display text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                This Weekend&apos;s Events
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              {weekendRange} • Culture & weekend plans
            </p>
          </div>
        </div>

        {/* Action Link: All events */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('events');
          }}
          className="text-[11px] font-bold text-orange-700 hover:text-orange-900 flex items-center gap-1 transition-colors cursor-pointer bg-white/90 hover:bg-white px-2.5 py-1 rounded-full border border-amber-200/80 shadow-2xs"
        >
          <span>All events</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 100% Native WebKit iOS 120Hz Hardware Momentum Scroll Track */}
      <div className="relative z-10 w-full flex-1 flex items-center py-2 overflow-hidden min-h-[340px]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="w-full flex items-center gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-6 px-[calc(50%-97.5px)] sm:px-[calc(50%-115px)] touch-pan-x [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {repeatedEvents.map((event, virtualIdx) => {
            const badge = getEventBadgeLabel(event);
            const formattedDate = formatEventDate(event.start_date, event.end_date, event.date);

            return (
              <div
                key={`${event.id || 'evt'}-${virtualIdx}`}
                ref={(el) => { cardRefs.current[virtualIdx] = el; }}
                onClick={(e) => {
                  e.stopPropagation();
                  const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
                  if (scrollContainerRef.current) {
                    const currentVIdx = Math.round(scrollContainerRef.current.scrollLeft / step);
                    if (virtualIdx === currentVIdx) {
                      onNavigate('events', { eventId: event.id });
                    } else {
                      scrollToVirtualIndex(virtualIdx);
                    }
                  }
                }}
                className="shrink-0 snap-center w-[195px] sm:w-[230px] aspect-[3/4.2] rounded-2xl overflow-hidden cursor-pointer bg-white border border-slate-200/90 shadow-md transform-gpu relative group/card select-none z-10"
                style={{
                  willChange: 'transform, opacity',
                }}
              >
                {/* Dynamic Glowing Orange Border Overlay */}
                <div className="glow-overlay absolute inset-0 rounded-2xl border-2 border-orange-500 shadow-2xl shadow-orange-500/35 ring-4 ring-orange-500/20 pointer-events-none z-30 transition-opacity duration-75" />

                {/* Poster Background Image */}
                <img
                  src={event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80"}
                  alt={event.title}
                  className="w-full h-full object-cover pointer-events-none brightness-100 contrast-[1.02]"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="sync"
                />

                {/* Subtle bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-transparent pointer-events-none" />

                {/* Top Timing Badge */}
                <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                  <span className="badge-pill inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black shadow-md transition-colors bg-white/95 text-slate-800 border border-slate-200">
                    {badge}
                  </span>
                </div>

                {/* Free Badge if applicable */}
                {event.is_free && (
                  <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold shadow-md bg-emerald-500 text-white">
                      Free
                    </span>
                  </div>
                )}

                {/* Bottom Content: Category, Title & Date/Time */}
                <div className="absolute bottom-0 left-0 right-0 p-3.5 z-20 pointer-events-none text-left space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block truncate">
                    {event.category}
                  </span>

                  <h4 className="font-bold font-display text-white text-[13px] sm:text-[14px] leading-snug line-clamp-2 drop-shadow-md">
                    {event.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-medium pt-0.5">
                    <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls: Centered Arrows & Dots placed directly below the event cards */}
      <div className="relative z-10 flex items-center justify-center gap-3 mt-1 pt-2 border-t border-amber-200/60">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous event"
          className="p-2.5 rounded-full bg-white hover:bg-orange-500 text-slate-700 hover:text-white transition-colors cursor-pointer active:scale-95 border border-amber-200/80 shadow-xs hover:shadow-orange-500/25 flex items-center justify-center group/btn"
        >
          <ChevronLeft className="w-4 h-4 group-hover/btn:-translate-x-0.5 transition-transform" />
        </button>

        {/* Clickable Dots Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 border border-amber-200/80 shadow-2xs">
          {activeEvents.slice(0, Math.min(count, 8)).map((_, idx) => {
            const isActive = idx === currentIndex % count;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!scrollContainerRef.current) return;
                  const step = itemStepRef.current || (window.innerWidth >= 640 ? 250 : 211);
                  const currentVIdx = Math.round(scrollContainerRef.current.scrollLeft / step);
                  const setBase = Math.floor(currentVIdx / count) * count;
                  scrollToVirtualIndex(setBase + idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                  isActive
                    ? "w-6 bg-orange-500 shadow-sm shadow-orange-500/40"
                    : "w-1.5 bg-amber-200 hover:bg-amber-300"
                )}
              />
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next event"
          className="p-2.5 rounded-full bg-white hover:bg-orange-500 text-slate-700 hover:text-white transition-colors cursor-pointer active:scale-95 border border-amber-200/80 shadow-xs hover:shadow-orange-500/25 flex items-center justify-center group/btn"
        >
          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
