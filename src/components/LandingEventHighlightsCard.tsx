import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, ArrowRight, X, MapPin, Ticket, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Event, SimpleMarkdown } from '../App';
import { 
  formatEventDate, 
  formatEventTime,
  getCategoryBadges,
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

const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80";

const loadedPosterUrls = new Set<string>();

const EventPosterImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const initialSrc = src || DEFAULT_EVENT_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [useNoReferrer, setUseNoReferrer] = useState(true);
  const [isLoaded, setIsLoaded] = useState(() => loadedPosterUrls.has(initialSrc));
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const nextSrc = src || DEFAULT_EVENT_IMAGE;
    setImgSrc(nextSrc);
    setUseNoReferrer(true);
    setIsLoaded(loadedPosterUrls.has(nextSrc));
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      loadedPosterUrls.add(imgSrc);
      setIsLoaded(true);
    }
  }, [imgSrc]);

  return (
    <>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-amber-950/60 animate-pulse pointer-events-none" />
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy={useNoReferrer ? "no-referrer" : undefined}
        loading="eager"
        decoding="async"
        draggable={false}
        onLoad={() => {
          loadedPosterUrls.add(imgSrc);
          setIsLoaded(true);
        }}
        onError={() => {
          if (useNoReferrer && imgSrc !== DEFAULT_EVENT_IMAGE) {
            setUseNoReferrer(false);
          } else if (imgSrc !== DEFAULT_EVENT_IMAGE) {
            setImgSrc(DEFAULT_EVENT_IMAGE);
          } else {
            setIsLoaded(true);
          }
        }}
      />
    </>
  );
};

export const LandingEventHighlightsCard: React.FC<LandingEventHighlightsCardProps> = ({
  events,
  onNavigate,
  loading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEventForModal, setSelectedEventForModal] = useState<Event | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(0);
  const rawScrollIndexRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const isAnimatingScrollRef = useRef<boolean>(false);
  const scrollRafRef = useRef<number | null>(null);
  const animRafRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualInteractRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDraggedRef = useRef<boolean>(false);

  // Keyboard accessibility and body scroll lock when modal is open
  useEffect(() => {
    if (!selectedEventForModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEventForModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedEventForModal]);

  useEffect(() => {
    if (selectedEventForModal) {
      const modalBody = document.getElementById('event-modal-scrollable-body');
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
    }
  }, [selectedEventForModal]);

  // Cleanup timers & animations on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    };
  }, []);

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
  const setCount = count <= 1 ? 1 : count <= 3 ? 5 : 3;
  const middleSetIndex = Math.floor(setCount / 2);

  const eventsKey = useMemo(
    () => activeEvents.map((e, i) => `${e.id || i}:${e.image || ''}`).join('|'),
    [activeEvents]
  );

  // Buffered sets for seamless infinite sliding while keeping total DOM nodes light on iOS/Android
  const repeatedEvents = useMemo(() => {
    if (!activeEvents || activeEvents.length === 0) return [];
    const list: Event[] = [];
    for (let s = 0; s < setCount; s++) {
      list.push(...activeEvents);
    }
    return list;
  }, [activeEvents, setCount]);

  // Preload & decode unique event poster images up-front so swiped cards appear instantaneously
  useEffect(() => {
    if (!activeEvents || activeEvents.length === 0) return;
    const seen = new Set<string>();
    activeEvents.forEach((event) => {
      const imageUrl = event.image || DEFAULT_EVENT_IMAGE;
      if (!seen.has(imageUrl)) {
        seen.add(imageUrl);
        const img = new Image();
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
          loadedPosterUrls.add(imageUrl);
          img.decode?.().catch(() => {});
        };
        img.src = imageUrl;
      }
    });
  }, [activeEvents]);

  // Sync currentIndexRef
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const getCenteredScrollLeftForVirtualIndex = (vIndex: number): number | null => {
    const container = scrollContainerRef.current;
    if (!container) return null;
    const targetChild = container.children[vIndex] as HTMLElement | undefined;
    if (!targetChild) return null;
    const targetCenter = targetChild.offsetLeft + targetChild.offsetWidth / 2;
    return Math.max(0, targetCenter - container.clientWidth / 2);
  };

  // Silently re-center into middle set ONLY when scrolling has completely settled.
  // Because card active styling uses (virtualIdx % count === currentIndex), this shift produces
  // zero React re-renders and zero visual flicker.
  const normalizeToMiddleSet = () => {
    const container = scrollContainerRef.current;
    if (!container || count <= 1 || isPointerDownRef.current || isAnimatingScrollRef.current) return;

    const currentIdx = rawScrollIndexRef.current;
    const normalized = ((currentIdx % count) + count) % count;
    const targetIdx = middleSetIndex * count + normalized;

    if (targetIdx !== currentIdx) {
      const targetLeft = getCenteredScrollLeftForVirtualIndex(targetIdx);
      if (targetLeft !== null) {
        container.style.scrollSnapType = 'none';
        container.scrollLeft = targetLeft;
        rawScrollIndexRef.current = targetIdx;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current && !isAnimatingScrollRef.current) {
            scrollContainerRef.current.style.scrollSnapType = '';
          }
        });
      }
    }
  };

  const cancelProgrammaticScroll = () => {
    if (animRafRef.current) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
    if (isAnimatingScrollRef.current) {
      isAnimatingScrollRef.current = false;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.scrollSnapType = '';
      }
    }
  };

  // Silky 60/120fps rAF eased scroll for auto-rotation & arrows (avoids iOS scroll-snap vs smooth-scroll fighting)
  const scrollToVirtualIndex = (vIndex: number, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container || count === 0) return;

    const clampedTarget = Math.max(0, Math.min(repeatedEvents.length - 1, vIndex));
    const targetLeft = getCenteredScrollLeftForVirtualIndex(clampedTarget);
    if (targetLeft === null) return;

    cancelProgrammaticScroll();

    if (!smooth) {
      container.style.scrollSnapType = 'none';
      container.scrollLeft = targetLeft;
      rawScrollIndexRef.current = clampedTarget;
      const norm = ((clampedTarget % count) + count) % count;
      if (norm !== currentIndexRef.current) {
        setCurrentIndex(norm);
      }
      requestAnimationFrame(() => {
        if (scrollContainerRef.current && !isAnimatingScrollRef.current) {
          scrollContainerRef.current.style.scrollSnapType = '';
        }
      });
      return;
    }

    const startLeft = container.scrollLeft;
    const distance = targetLeft - startLeft;
    if (Math.abs(distance) < 1) {
      normalizeToMiddleSet();
      return;
    }

    const duration = 520;
    const startTime = performance.now();
    isAnimatingScrollRef.current = true;
    container.style.scrollSnapType = 'none';

    const step = (now: number) => {
      if (!scrollContainerRef.current || isPointerDownRef.current) {
        cancelProgrammaticScroll();
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);

      scrollContainerRef.current.scrollLeft = startLeft + distance * eased;

      if (progress < 1) {
        animRafRef.current = requestAnimationFrame(step);
      } else {
        animRafRef.current = null;
        isAnimatingScrollRef.current = false;
        scrollContainerRef.current.scrollLeft = targetLeft;
        scrollContainerRef.current.style.scrollSnapType = '';
        rawScrollIndexRef.current = clampedTarget;
        const norm = ((clampedTarget % count) + count) % count;
        if (norm !== currentIndexRef.current) {
          setCurrentIndex(norm);
        }
        requestAnimationFrame(() => normalizeToMiddleSet());
      }
    };

    animRafRef.current = requestAnimationFrame(step);
  };

  // Center strictly on middle set start card upon mounting or when events list updates
  useEffect(() => {
    if (count === 0 || !scrollContainerRef.current) return;

    const timer = requestAnimationFrame(() => {
      const initialVirtualIndex = count > 1 ? middleSetIndex * count : 0;
      scrollToVirtualIndex(initialVirtualIndex, false);
      setCurrentIndex(0);
    });

    return () => cancelAnimationFrame(timer);
  }, [eventsKey, count, middleSetIndex]);

  // Keep active card centered if container width changes (e.g., mobile rotation or layout settle)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || count === 0 || typeof ResizeObserver === 'undefined') return;

    let lastWidth = container.clientWidth;
    const ro = new ResizeObserver(() => {
      if (!scrollContainerRef.current || isPointerDownRef.current || isAnimatingScrollRef.current) return;
      const nextWidth = scrollContainerRef.current.clientWidth;
      if (Math.abs(nextWidth - lastWidth) > 2) {
        lastWidth = nextWidth;
        scrollToVirtualIndex(rawScrollIndexRef.current, false);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [count, repeatedEvents.length]);

  // Listen for native scrollend (modern iOS Safari & Android Chrome) for instant zero-jank loop recentering
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || count <= 1) return;
    const onScrollEnd = () => {
      if (!isPointerDownRef.current && !isAnimatingScrollRef.current) {
        if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
        normalizeToMiddleSet();
      }
    };
    container.addEventListener('scrollend', onScrollEnd, { passive: true });
    return () => container.removeEventListener('scrollend', onScrollEnd);
  }, [count, middleSetIndex]);

  // Lightweight scroll listener: only triggers React state when active event index actually changes
  const handleScroll = () => {
    if (scrollIdleTimerRef.current) {
      clearTimeout(scrollIdleTimerRef.current);
    }

    if (!isAnimatingScrollRef.current && !isPointerDownRef.current) {
      scrollIdleTimerRef.current = setTimeout(() => {
        normalizeToMiddleSet();
      }, 280);
    }

    if (scrollRafRef.current) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const container = scrollContainerRef.current;
      if (!container || count === 0) return;

      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      const children = container.children;
      if (children.length === 0) return;

      let minDistance = Infinity;
      let centeredVirtualIndex = rawScrollIndexRef.current;

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(childCenter - containerCenter);
        if (dist < minDistance) {
          minDistance = dist;
          centeredVirtualIndex = i;
        }
      }

      if (centeredVirtualIndex !== rawScrollIndexRef.current) {
        rawScrollIndexRef.current = centeredVirtualIndex;
        const normalizedIndex = ((centeredVirtualIndex % count) + count) % count;
        if (normalizedIndex !== currentIndexRef.current) {
          setCurrentIndex(normalizedIndex);
        }
      }
    });
  };

  // Step forward or backward cleanly from middle set so we never hit a track edge
  const stepCarousel = (delta: 1 | -1) => {
    if (count <= 1) return;
    const currentIdx = rawScrollIndexRef.current;
    let baseIdx = currentIdx;

    if (currentIdx + delta < 1 || currentIdx + delta >= repeatedEvents.length - 1) {
      const norm = ((currentIdx % count) + count) % count;
      baseIdx = middleSetIndex * count + norm;
      const resetLeft = getCenteredScrollLeftForVirtualIndex(baseIdx);
      if (resetLeft !== null && scrollContainerRef.current) {
        scrollContainerRef.current.style.scrollSnapType = 'none';
        scrollContainerRef.current.scrollLeft = resetLeft;
        rawScrollIndexRef.current = baseIdx;
      }
    }

    scrollToVirtualIndex(baseIdx + delta, true);
  };

  // Auto-rotation every 6 seconds in continuous infinite loop
  useEffect(() => {
    if (count <= 1 || isPaused || selectedEventForModal) return;

    const autoScrollTimer = setInterval(() => {
      if (!scrollContainerRef.current || isPointerDownRef.current || isAnimatingScrollRef.current) return;
      if (Date.now() - lastManualInteractRef.current < 4500) return;
      stepCarousel(1);
    }, 6000);

    return () => clearInterval(autoScrollTimer);
  }, [count, isPaused, selectedEventForModal, middleSetIndex]);

  if (loading) {
    return (
      <div id="discover-card-event" className="h-full">
        <DiscoverCardEventSkeleton />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div 
        id="discover-card-event"
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

      {/* Hardware-accelerated Native Scroll-Snap Track */}
      <div className="relative z-10 w-full flex-1 flex items-center py-2 overflow-hidden min-h-[340px]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onPointerDown={() => {
            lastManualInteractRef.current = Date.now();
            cancelProgrammaticScroll();
          }}
          onWheel={() => {
            lastManualInteractRef.current = Date.now();
            cancelProgrammaticScroll();
          }}
          onTouchStart={(e) => {
            isPointerDownRef.current = true;
            touchDraggedRef.current = false;
            lastManualInteractRef.current = Date.now();
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
            setIsPaused(true);
            cancelProgrammaticScroll();
            if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
          }}
          onTouchMove={(e) => {
            const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
            if (dx > 8 || dy > 8) {
              touchDraggedRef.current = true;
            }
          }}
          onTouchEnd={() => { 
            isPointerDownRef.current = false; 
            lastManualInteractRef.current = Date.now();
            setIsPaused(false);
            if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
            scrollIdleTimerRef.current = setTimeout(() => {
              normalizeToMiddleSet();
            }, 300);
          }}
          onTouchCancel={() => {
            isPointerDownRef.current = false;
            setIsPaused(false);
          }}
          className="w-full flex items-center gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-3 px-[calc(50%-102.5px)] sm:px-[calc(50%-120px)] [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {repeatedEvents.map((event, virtualIdx) => {
            const formattedDate = formatEventDate(event.start_date, event.end_date, event.date);
            const isCenterCard = count > 0 && (virtualIdx % count) === currentIndex;

            return (
              <div
                key={`${event.id || 'evt'}-${virtualIdx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (touchDraggedRef.current) {
                    touchDraggedRef.current = false;
                    return;
                  }
                  setSelectedEventForModal(event);
                }}
                className={cn(
                  "shrink-0 snap-center w-[205px] h-[290px] sm:w-[240px] sm:h-[345px] rounded-2xl overflow-hidden cursor-pointer bg-slate-800 border-2 relative group/card select-none z-10 transition-[opacity,transform] duration-200 ease-out",
                  isCenterCard
                    ? "opacity-100 border-orange-500 shadow-lg shadow-orange-500/20 -translate-y-1"
                    : "opacity-75 border-slate-200/80 shadow-sm translate-y-0"
                )}
              >
                {/* Reliable Poster Background Image with preload cache & fallback */}
                <EventPosterImage src={event.image} alt={event.title} />

                {/* Deep gradient at the bottom for crystal-clear readability with full titles */}
                <div className="absolute bottom-0 left-0 right-0 h-44 sm:h-52 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />

                {/* Top Timing Badge */}
                <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                  <span 
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black shadow-md border transition-colors duration-200",
                      isCenterCard 
                        ? "bg-orange-500 text-white border-orange-400" 
                        : "bg-white/95 text-slate-800 border-slate-200"
                    )}
                  >
                    {formattedDate}
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

                {/* Bottom Content: Category & Full Title */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 z-20 pointer-events-none text-left space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block truncate">
                    {event.category}
                  </span>

                  <h4 className="font-bold font-display text-white text-[12px] sm:text-[13px] leading-snug drop-shadow-md break-words">
                    {event.title}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop hover navigation arrows */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous weekend event"
              onClick={(e) => {
                e.stopPropagation();
                lastManualInteractRef.current = Date.now();
                stepCarousel(-1);
              }}
              className="hidden md:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/85 backdrop-blur shadow-sm text-slate-500 hover:text-orange-600 transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next weekend event"
              onClick={(e) => {
                e.stopPropagation();
                lastManualInteractRef.current = Date.now();
                stepCarousel(1);
              }}
              className="hidden md:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/85 backdrop-blur shadow-sm text-slate-500 hover:text-orange-600 transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>



      {/* Event Details Modal on Landing Page */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedEventForModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              {/* Backdrop - optimized for mobile GPU rendering */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={() => setSelectedEventForModal(null)}
                className="fixed inset-0 bg-slate-950/80 cursor-pointer"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 my-auto z-10 max-h-[90vh] flex flex-col will-change-transform transform-gpu"
              >
                {/* Modal Media Header */}
                <div className="relative w-full h-56 sm:h-72 shrink-0 bg-slate-900 overflow-hidden">
                  <img
                    src={selectedEventForModal.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"}
                    alt={selectedEventForModal.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Dark gradient for text readability and top shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/40 pointer-events-none" />

                  {/* Top-Left Date Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-lg border border-orange-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatEventDate(selectedEventForModal.start_date, selectedEventForModal.end_date, selectedEventForModal.date)}</span>
                    </span>
                  </div>

                  {/* Top-Right Cross Close Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedEventForModal(null)}
                    aria-label="Close modal"
                    className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white backdrop-blur-md shadow-xl border border-white/20 transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer z-20"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Title & Category over bottom of image */}
                  <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCategoryBadges(selectedEventForModal.category).map((badge, idx) => (
                        <span
                          key={idx}
                          className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border", badge.bgClass, badge.textClass, badge.borderClass)}
                        >
                          {badge.emoji} {badge.name}
                        </span>
                      ))}
                      {selectedEventForModal.is_free && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow-sm">
                          Free Entry
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow-md leading-tight break-words">
                      {selectedEventForModal.title}
                    </h3>
                  </div>
                </div>

                {/* Modal Scrollable Body */}
                <div id="event-modal-scrollable-body" className="p-5 sm:p-7 overflow-y-auto space-y-5 text-left">
                  {/* Date, Time, Location Info Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                    <div className="flex items-center gap-2.5 text-xs text-slate-700">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {formatEventDate(selectedEventForModal.start_date, selectedEventForModal.end_date, selectedEventForModal.date)}
                        </p>
                        {formatEventTime(selectedEventForModal.start_time, selectedEventForModal.end_time, selectedEventForModal.time) && (
                          <p className="text-[11px] text-slate-500">
                            {formatEventTime(selectedEventForModal.start_time, selectedEventForModal.end_time, selectedEventForModal.time)}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedEventForModal.location && (
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 truncate">
                            {selectedEventForModal.location}
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEventForModal.location + ' Valencia')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-orange-600 hover:text-orange-700 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            <span>Open in Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticketing & Price Banner if available */}
                  {(selectedEventForModal.ticket_url || selectedEventForModal.price || selectedEventForModal.is_free !== undefined) && (
                    <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-200 flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                            {selectedEventForModal.is_free ? 'Free Event' : 'Ticketing & Admission'}
                          </p>
                          <p className="text-xs text-slate-600 font-medium">
                            {selectedEventForModal.price ? `Price: ${selectedEventForModal.price}` : (selectedEventForModal.is_free ? '100% Free RSVP / Open admission' : 'Official ticketing available')}
                          </p>
                        </div>
                      </div>
                      {selectedEventForModal.ticket_url && (
                        <a
                          href={selectedEventForModal.ticket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{selectedEventForModal.is_free ? 'Free RSVP / Registration' : 'Buy Tickets'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Description with full Markdown support (headers ###, lists, bold, links, sections) */}
                  {selectedEventForModal.description && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">About this event</h4>
                      <div className="markdown-body text-slate-700 leading-relaxed text-sm sm:text-base space-y-3">
                        <SimpleMarkdown>
                          {selectedEventForModal.description}
                        </SimpleMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Footer */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const eventId = selectedEventForModal.id;
                        setSelectedEventForModal(null);
                        onNavigate('events', { eventId });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-orange-200"
                    >
                      <span>Explore on Events page</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEventForModal(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};








