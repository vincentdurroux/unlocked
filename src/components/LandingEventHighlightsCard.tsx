import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Event } from '../App';
import { 
  formatEventDate, 
  getEventStartDate,
  getEventEndDate,
  isYearRoundEvent 
} from '../utils/eventFormatter';
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
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const offsetRef = useRef(0);
  const targetRef = useRef(0);
  const animatingRef = useRef(false);

  // Direct DOM references for 120Hz GPU animation with 0 React re-renders during drag
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotsContainerRef = useRef<HTMLDivElement | null>(null);

  // Drag interaction refs
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const dragLastXRef = useRef(0);
  const dragLastTimeRef = useRef(0);
  const dragVelocityXRef = useRef(0);

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

  // Preload all event poster images up-front into browser cache for instant rendering
  useEffect(() => {
    if (!activeEvents || activeEvents.length === 0) return;
    
    activeEvents.forEach((event) => {
      const imageUrl = event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80";
      const img = new Image();
      img.src = imageUrl;
    });
  }, [activeEvents]);

  // Step distance helper
  const getStep = () => {
    if (typeof window === 'undefined') return 210;
    return window.innerWidth >= 640 ? 250 : 210;
  };

  // Ultra-fast Direct DOM Mutation for 120Hz Hardware Acceleration (0 React re-renders)
  const updateCardDOMs = (offsetVal: number) => {
    if (count === 0) return;
    const step = getStep();
    const activeIdx = Math.round(((offsetVal % count) + count) % count);

    for (let i = 0; i < count; i++) {
      const cardEl = cardRefs.current[i];
      if (!cardEl) continue;

      let diff = i - offsetVal;
      while (diff < -count / 2) diff += count;
      while (diff >= count / 2) diff -= count;

      const translateX = diff * step;
      const absDiff = Math.abs(diff);
      const smoothFactor = Math.max(0, 1 - absDiff * 1.12);

      const scale = 0.90 + 0.18 * smoothFactor;
      const opacity = absDiff > 2.2 ? 0 : 0.65 + 0.35 * smoothFactor;
      const glowOpacity = smoothFactor;
      const zIndex = Math.round(100 - absDiff * 10);

      cardEl.style.transform = `translate3d(${translateX}px, 0, 0) scale(${scale})`;
      cardEl.style.opacity = `${opacity}`;
      cardEl.style.zIndex = `${zIndex}`;
      cardEl.style.pointerEvents = absDiff > 1.8 ? 'none' : 'auto';

      const glowEl = cardEl.querySelector('.glow-overlay') as HTMLElement;
      if (glowEl) glowEl.style.opacity = `${glowOpacity}`;

      const imgEl = cardEl.querySelector('img') as HTMLElement;
      if (imgEl) imgEl.style.transform = `scale(${1 + (scale - 0.9) * 0.4})`;

      const badgeEl = cardEl.querySelector('.badge-pill') as HTMLElement;
      if (badgeEl) {
        if (absDiff < 0.35) {
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

    if (dotsContainerRef.current) {
      const dots = dotsContainerRef.current.children;
      for (let d = 0; d < dots.length; d++) {
        const dot = dots[d] as HTMLElement;
        if (d === activeIdx) {
          dot.className = "h-1.5 rounded-full transition-all duration-300 cursor-pointer w-6 bg-orange-500 shadow-sm shadow-orange-500/40";
        } else {
          dot.className = "h-1.5 rounded-full transition-all duration-300 cursor-pointer w-1.5 bg-amber-200 hover:bg-amber-300";
        }
      }
    }
  };

  // Sync DOMs on initial mount, resize or event list change
  useEffect(() => {
    offsetRef.current = 0;
    targetRef.current = 0;
    updateCardDOMs(0);

    const handleResize = () => updateCardDOMs(offsetRef.current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [count]);

  // 120Hz RAF Smooth Spring Lerp Loop using direct DOM updates (0 React re-renders)
  const animateTo = (target: number) => {
    targetRef.current = target;
    if (animatingRef.current) return;
    animatingRef.current = true;

    const stepAnim = () => {
      if (isDraggingRef.current) {
        animatingRef.current = false;
        return;
      }

      const diff = targetRef.current - offsetRef.current;
      if (Math.abs(diff) < 0.001) {
        let finalVal = targetRef.current;
        if (count > 0) {
          finalVal = ((finalVal % count) + count) % count;
        }
        offsetRef.current = finalVal;
        targetRef.current = finalVal;
        updateCardDOMs(finalVal);
        animatingRef.current = false;
        return;
      }

      // Fast responsive spring lerp (0.22 factor for ultra snappy smooth motion)
      offsetRef.current += diff * 0.22;
      updateCardDOMs(offsetRef.current);
      requestAnimationFrame(stepAnim);
    };

    requestAnimationFrame(stepAnim);
  };

  // Drag Gesture Handlers with Pointer Capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (e.button && e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    dragLastXRef.current = e.clientX;
    dragLastTimeRef.current = performance.now();
    dragVelocityXRef.current = 0;

    animatingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || count <= 1) return;

    const currentX = e.clientX;
    const now = performance.now();
    const dt = now - dragLastTimeRef.current;

    if (dt > 0) {
      const dx = currentX - dragLastXRef.current;
      dragVelocityXRef.current = dx / dt;
    }

    dragLastXRef.current = currentX;
    dragLastTimeRef.current = now;

    const deltaX = currentX - dragStartXRef.current;
    const step = getStep();
    const deltaOffset = -deltaX / step;

    const newOffset = dragStartOffsetRef.current + deltaOffset;
    offsetRef.current = newOffset;
    updateCardDOMs(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const velocity = dragVelocityXRef.current; // px/ms
    const step = getStep();
    const velocityOffset = -velocity * 160 / step;

    const target = Math.round(offsetRef.current + velocityOffset);
    animateTo(target);
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
    animateTo(targetRef.current + 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    animateTo(targetRef.current - 1);
  };

  return (
    <div
      id="discover-card-event"
      className="flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-amber-50/30 to-orange-50/15 text-slate-900 border border-amber-200/70 hover:border-orange-400/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden h-full min-h-[480px] select-none"
    >
      {/* Decorative ambient glowing lights: soft warm sunny glow */}
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

      {/* 100% Flicker-Free Continuous Interactive Drag Track with 120Hz Hardware Acceleration */}
      <div 
        className="relative z-10 w-full flex-1 flex items-center justify-center py-2 overflow-hidden min-h-[340px] touch-pan-y cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative w-full h-[320px] sm:h-[340px] flex items-center justify-center">
          {activeEvents.map((event, i) => {
            const badge = getEventBadgeLabel(event);
            const formattedDate = formatEventDate(event.start_date, event.end_date, event.date);

            return (
              <div
                key={event.id || `evt-${i}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                onClick={(e) => {
                  e.stopPropagation();
                  let target = targetRef.current;
                  let currDiff = i - target;
                  while (currDiff < -count / 2) currDiff += count;
                  while (currDiff >= count / 2) currDiff -= count;

                  if (Math.abs(currDiff) < 0.35) {
                    onNavigate('events', { eventId: event.id });
                  } else {
                    animateTo(target + currDiff);
                  }
                }}
                className="absolute w-[195px] sm:w-[230px] aspect-[3/4.2] rounded-2xl overflow-hidden cursor-pointer bg-white border border-slate-200/90 shadow-md transform-gpu select-none group/cardWillChange"
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
        <div 
          ref={dotsContainerRef}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 border border-amber-200/80 shadow-2xs"
        >
          {activeEvents.slice(0, Math.min(count, 8)).map((_, idx) => {
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  let currTarget = targetRef.current;
                  let normalizedTarget = ((currTarget % count) + count) % count;
                  let diff = idx - normalizedTarget;
                  while (diff < -count / 2) diff += count;
                  while (diff >= count / 2) diff -= count;
                  animateTo(currTarget + diff);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className="h-1.5 rounded-full transition-all duration-300 cursor-pointer w-1.5 bg-amber-200 hover:bg-amber-300"
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
