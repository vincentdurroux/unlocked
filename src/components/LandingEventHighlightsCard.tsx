import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, PanInfo } from 'motion/react';
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

export function getCurrentWeekInterval(refDate = new Date()) {
  const now = new Date(refDate);
  const day = now.getDay();
  // In JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  return { monday, sunday };
}

function formatWeekDateRange(refDate = new Date()): string {
  const { monday, sunday } = getCurrentWeekInterval(refDate);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sM = months[monday.getMonth()];
  const eM = months[sunday.getMonth()];

  if (sM === eM) {
    return `${monday.getDate()}–${sunday.getDate()} ${sM}`;
  }
  return `${monday.getDate()} ${sM} – ${sunday.getDate()} ${eM}`;
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
  const [rawScrollIndex, setRawScrollIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(currentIndex);
  const isScrollingTouchRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // Automatically refresh date periodically so week shifts seamlessly as time progresses
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute current week range dynamically (e.g. "26 Oct – 1 Nov")
  const weekRange = useMemo(() => formatWeekDateRange(currentDate), [currentDate]);

  // Strictly filter events occurring within the active week interval (Monday to Sunday)
  const activeEvents = useMemo(() => {
    const { monday, sunday } = getCurrentWeekInterval(currentDate);

    const weekEvents = events.filter((e) => {
      if (isYearRoundEvent(e)) return false;

      const s = getEventStartDate(e, monday.getFullYear());
      const end = getEventEndDate(e, monday.getFullYear()) || s;
      if (!s) return false;

      return s.getTime() <= sunday.getTime() && end.getTime() >= monday.getTime();
    });

    return [...weekEvents].sort((a, b) => {
      const aTime = getEventStartDate(a)?.getTime() || 0;
      const bTime = getEventStartDate(b)?.getTime() || 0;
      return aTime - bTime;
    });
  }, [events, currentDate]);

  // Triplicated list for seamless infinite circular scrolling (3 sets: Set 0, Set 1 [Middle], Set 2)
  const repeatedEvents = useMemo(() => {
    if (!activeEvents || activeEvents.length === 0) return [];
    return [...activeEvents, ...activeEvents, ...activeEvents];
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

  const count = activeEvents.length;

  // Sync currentIndexRef
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const scrollToVirtualIndex = (vIndex: number, smooth = true) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const targetChild = container.children[vIndex] as HTMLElement;
    if (targetChild) {
      const targetCenter = targetChild.offsetLeft + targetChild.offsetWidth / 2;
      const scrollPos = targetCenter - container.clientWidth / 2;
      container.scrollTo({
        left: scrollPos,
        behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior,
      });
    }
  };

  // Center strictly on middle set start card upon mounting or when event count changes
  useEffect(() => {
    if (count === 0 || !scrollContainerRef.current) return;
    
    const timer = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container || container.children.length <= count) return;
      
      const targetChild = container.children[count] as HTMLElement;
      if (targetChild) {
        const targetCenter = targetChild.offsetLeft + targetChild.offsetWidth / 2;
        const scrollPos = targetCenter - container.clientWidth / 2;
        container.scrollLeft = scrollPos;
        setRawScrollIndex(count);
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [count]);

  // Precise DOM distance scroll listener to pinpoint the exact centered card & handle infinite loop teleporting
  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current || count === 0) return;
      const container = scrollContainerRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      const children = container.children;
      if (children.length === 0) return;

      let minDistance = Infinity;
      let centeredVirtualIndex = 0;

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(childCenter - containerCenter);
        if (dist < minDistance) {
          minDistance = dist;
          centeredVirtualIndex = i;
        }
      }

      // Infinite Circular Teleportation:
      if (centeredVirtualIndex < count) {
        const itemWidth = children.length > 1 
          ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft 
          : 231;
        container.scrollLeft += count * itemWidth;
        centeredVirtualIndex += count;
      } else if (centeredVirtualIndex >= 2 * count) {
        const itemWidth = children.length > 1 
          ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft 
          : 231;
        container.scrollLeft -= count * itemWidth;
        centeredVirtualIndex -= count;
      }

      setRawScrollIndex(centeredVirtualIndex);

      const normalizedIndex = centeredVirtualIndex % count;
      if (normalizedIndex !== currentIndexRef.current) {
        setCurrentIndex(normalizedIndex);
      }
    });
  };

  // Auto-rotation every 6 seconds in continuous infinite loop
  useEffect(() => {
    if (count <= 1 || isPaused || isScrollingTouchRef.current) return;

    const autoScrollTimer = setInterval(() => {
      if (!scrollContainerRef.current) return;
      scrollToVirtualIndex(rawScrollIndex + 1, true);
    }, 6000);

    return () => clearInterval(autoScrollTimer);
  }, [count, isPaused, rawScrollIndex]);

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
            <h3 className="text-lg font-bold font-display text-slate-900">This Week&apos;s Events</h3>
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
    scrollToVirtualIndex(rawScrollIndex + 1, true);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    scrollToVirtualIndex(rawScrollIndex - 1, true);
  };

  return (
    <div
      id="discover-card-event"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-amber-50/30 to-orange-50/15 text-slate-900 border border-amber-200/70 hover:border-orange-400/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden h-full min-h-[480px]"
    >
      {/* Decorative ambient glowing lights: soft warm sunny glow */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header: This Week's Events + Week date range + All events link */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-3 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Calendar className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold font-display text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                This Week&apos;s Events
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">
              {weekRange} • Culture & outings
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

      {/* 120Hz Infinite Continuous WebKit CSS Scroll Snap Track with Zoom-In effect */}
      <div className="relative z-10 w-full flex-1 flex items-center py-2 overflow-hidden min-h-[340px]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={() => { isScrollingTouchRef.current = true; setIsPaused(true); }}
          onTouchEnd={() => { isScrollingTouchRef.current = false; setIsPaused(false); }}
          className="w-full flex items-center gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-6 px-[calc(50%-97.5px)] sm:px-[calc(50%-115px)] touch-pan-x [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {repeatedEvents.map((event, virtualIdx) => {
            const badge = getEventBadgeLabel(event);
            const formattedDate = formatEventDate(event.start_date, event.end_date, event.date);
            
            // Calculate whether this item is currently dead-center
            const isCenterCard = virtualIdx === rawScrollIndex;

            return (
              <div
                key={`${event.id || 'evt'}-${virtualIdx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCenterCard) {
                    onNavigate('events', { eventId: event.id });
                  } else {
                    scrollToVirtualIndex(virtualIdx, true);
                  }
                }}
                className={cn(
                  "shrink-0 snap-center w-[195px] sm:w-[230px] aspect-[3/4.2] rounded-2xl overflow-hidden cursor-pointer bg-white border transition-all duration-300 transform-gpu relative group/card select-none",
                  isCenterCard
                    ? "border-2 border-orange-500 shadow-2xl shadow-orange-500/35 scale-105 sm:scale-110 z-20 opacity-100 ring-4 ring-orange-500/20"
                    : "border-slate-200/90 shadow-sm scale-90 sm:scale-95 z-0 opacity-70 hover:opacity-90"
                )}
              >
                {/* Poster Background Image with internal zoom effect on active card */}
                <img
                  src={event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80"}
                  alt={event.title}
                  className={cn(
                    "w-full h-full object-cover pointer-events-none brightness-100 contrast-[1.02] transition-transform duration-500",
                    isCenterCard ? "scale-105 group-hover:scale-110" : "scale-100"
                  )}
                  referrerPolicy="no-referrer"
                  loading="eager"
                  decoding="sync"
                />

                {/* Subtle gradient strictly at the bottom 35% for text readability */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-transparent pointer-events-none" />

                {/* Top Timing Badge: Clean, high-contrast luminous pill */}
                <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black shadow-md transition-colors",
                    isCenterCard 
                      ? "bg-orange-500 text-white border border-orange-400" 
                      : "bg-white/95 text-slate-800 border border-slate-200"
                  )}>
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
                  const setBase = Math.floor(rawScrollIndex / count) * count;
                  scrollToVirtualIndex(setBase + idx, true);
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








