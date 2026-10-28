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
  const [rawScrollIndex, setRawScrollIndex] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(currentIndex);
  const isScrollingTouchRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

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
        setScrollLeftState(scrollPos);
        setRawScrollIndex(count);
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [count]);

  // Ultra-lightweight 120Hz scroll listener using refs only (Zero React state re-renders during touch move)
  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current || count === 0) return;
      const container = scrollContainerRef.current;
      const currentScrollLeft = container.scrollLeft;

      const containerCenter = currentScrollLeft + container.clientWidth / 2;
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

      // Infinite Circular Teleportation with instant jump:
      if (centeredVirtualIndex < count) {
        const itemWidth = children.length > 1 
          ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft 
          : 210;
        container.scrollLeft += count * itemWidth;
        centeredVirtualIndex += count;
      } else if (centeredVirtualIndex >= 2 * count) {
        const itemWidth = children.length > 1 
          ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft 
          : 210;
        container.scrollLeft -= count * itemWidth;
        centeredVirtualIndex -= count;
      }

      setRawScrollIndex(centeredVirtualIndex);
      setScrollLeftState(container.scrollLeft);

      const normalizedIndex = centeredVirtualIndex % count;
      if (normalizedIndex !== currentIndexRef.current) {
        setCurrentIndex(normalizedIndex);
      }
    });
  };

  // Calculate dynamic scale, opacity and glow opacity based on physical distance from container center
  const getCardProgress = (virtualIdx: number) => {
    if (!scrollContainerRef.current) {
      const isCenter = virtualIdx === rawScrollIndex;
      return {
        scale: 1.0,
        opacity: isCenter ? 1.0 : 0.75,
        glowOpacity: isCenter ? 1.0 : 0.0,
        isCenterCard: isCenter,
      };
    }

    const container = scrollContainerRef.current;
    const child = container.children[virtualIdx] as HTMLElement;
    if (!child) {
      const isCenter = virtualIdx === rawScrollIndex;
      return {
        scale: 1.0,
        opacity: isCenter ? 1.0 : 0.75,
        glowOpacity: isCenter ? 1.0 : 0.0,
        isCenterCard: isCenter,
      };
    }

    const containerCenter = scrollLeftState + container.clientWidth / 2;
    const childCenter = child.offsetLeft + child.offsetWidth / 2;
    const offsetPx = Math.abs(childCenter - containerCenter);

    const itemWidth = container.children.length > 1
      ? (container.children[1] as HTMLElement).offsetLeft - (container.children[0] as HTMLElement).offsetLeft
      : 210;

    const ratio = Math.min(1, offsetPx / itemWidth);
    const smoothFactor = Math.max(0, 1 - Math.pow(ratio, 1.2));

    const scale = 1.0;
    const opacity = 0.75 + (1.00 - 0.75) * smoothFactor;
    const glowOpacity = smoothFactor;
    const isCenterCard = ratio < 0.4;

    return { scale, opacity, glowOpacity, isCenterCard };
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
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-slate-100/40 rounded-full blur-3xl pointer-events-none" />

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

      {/* 120Hz Infinite Continuous WebKit CSS Scroll Track with Zoom-In effect */}
      <div className="relative z-10 w-full flex-1 flex items-center py-2 overflow-hidden min-h-[340px]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={() => { isScrollingTouchRef.current = true; setIsPaused(true); }}
          onTouchEnd={() => { isScrollingTouchRef.current = false; setIsPaused(false); }}
          className="w-full flex items-center gap-3.5 sm:gap-5 overflow-x-auto py-6 px-[calc(50%-97.5px)] sm:px-[calc(50%-115px)] touch-pan-x [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {repeatedEvents.map((event, virtualIdx) => {
            const badge = getEventBadgeLabel(event);
            const formattedDate = formatEventDate(event.start_date, event.end_date, event.date);
            
            // Continuous proportional morphing calculations
            const { scale, opacity, glowOpacity, isCenterCard } = getCardProgress(virtualIdx);

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
                style={{
                  transform: `translateY(${isCenterCard ? '-6px' : '0px'})`,
                  opacity: opacity,
                  transition: isScrollingTouchRef.current ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out',
                }}
                className={cn(
                  "shrink-0 w-[195px] sm:w-[230px] aspect-[3/4.2] rounded-2xl overflow-hidden isolation-auto cursor-pointer bg-white border transform-gpu relative group/card select-none z-10 transition-shadow duration-300",
                  isCenterCard
                    ? "border-orange-500 shadow-2xl shadow-orange-500/30 ring-2 ring-orange-500/30"
                    : "border-slate-200/90 shadow-sm opacity-75"
                )}
              >
                {/* Dynamic Glowing Orange Border Overlay that morphs continuously with touch distance */}
                <div 
                  className="absolute inset-0 rounded-2xl border-2 border-orange-500 shadow-xl shadow-orange-500/25 pointer-events-none z-30 transition-opacity duration-150"
                  style={{ opacity: glowOpacity }}
                />

                {/* Poster Background Image */}
                <img
                  src={event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80"}
                  alt={event.title}
                  className="w-full h-full object-cover pointer-events-none brightness-100 contrast-[1.02]"
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








