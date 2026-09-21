import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Event } from '../App';
import { 
  formatEventDate, 
  getCategoryBadges, 
  isEventInCurrentMonth, 
  isEventExpired, 
  getEventStartDate 
} from '../utils/eventFormatter';
import { cn } from '../lib/utils';

interface LandingEventHighlightsCardProps {
  events: Event[];
  highlightedEventIds?: string[];
  onNavigate: (view: string, params?: { eventId?: string }) => void;
}

export const LandingEventHighlightsCard: React.FC<LandingEventHighlightsCardProps> = ({
  events,
  onNavigate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Compute the list of events of the month (never restricted to a single event)
  const monthlyEvents = useMemo(() => {
    // 1. Filter out expired events
    const active = events.filter(e => !isEventExpired(e));
    if (active.length === 0) return [];

    // Helper to sort events chronologically
    const sortChronologically = (list: Event[]) => {
      return [...list].sort((a, b) => {
        const aTime = getEventStartDate(a)?.getTime() || 0;
        const bTime = getEventStartDate(b)?.getTime() || 0;
        return aTime - bTime;
      });
    };

    const sortedActive = sortChronologically(active);

    // 2. Events in the current calendar month
    const thisMonthEvents = sortedActive.filter(e => isEventInCurrentMonth(e));

    // If current calendar month has 2 or more events, display all of them
    if (thisMonthEvents.length >= 2) {
      return thisMonthEvents;
    }

    // If current calendar month has only 1 event, complement with upcoming events so it's not a single event
    if (thisMonthEvents.length === 1) {
      const remaining = sortedActive.filter(e => e.id !== thisMonthEvents[0].id);
      return [...thisMonthEvents, ...remaining.slice(0, 5)];
    }

    // If 0 events in current calendar month:
    // Look at the month of the first upcoming event (e.g. next month)
    const firstEventDate = getEventStartDate(sortedActive[0]);
    if (firstEventDate) {
      const targetMonth = firstEventDate.getMonth();
      const targetYear = firstEventDate.getFullYear();
      
      const targetMonthEvents = sortedActive.filter(e => {
        const s = getEventStartDate(e, targetYear);
        return s && s.getMonth() === targetMonth && s.getFullYear() === targetYear;
      });

      if (targetMonthEvents.length >= 2) {
        return targetMonthEvents;
      }
    }

    // Fallback: take all active upcoming events (up to 8)
    return sortedActive.slice(0, 8);
  }, [events]);

  const count = monthlyEvents.length;

  // Reset index if it goes out of bounds
  useEffect(() => {
    if (currentIndex >= count && count > 0) {
      setCurrentIndex(0);
    }
  }, [count, currentIndex]);

  // Automatic scrolling (7 seconds per event), pauses on hover
  const AUTO_SCROLL_SECONDS = 7;

  useEffect(() => {
    if (count <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % count);
    }, AUTO_SCROLL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [count, isPaused, currentIndex]);

  if (count === 0) return null;

  const currentEvent = monthlyEvents[currentIndex % count];
  const categoryBadges = getCategoryBadges(currentEvent.category);

  // Month label for the active event slide
  const eventMonthLabel = (() => {
    if (!currentEvent) return 'Événements';
    const d = getEventStartDate(currentEvent);
    if (d) {
      try {
        const m = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(d);
        return m.charAt(0).toUpperCase() + m.slice(1);
      } catch {}
    }
    return 'Agenda';
  })();

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % count);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  };

  const handleDotClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  const formattedDate = formatEventDate(
    currentEvent.start_date, 
    currentEvent.end_date, 
    currentEvent.date
  );

  return (
    <div
      id="discover-card-event"
      onClick={() => onNavigate('events', { eventId: currentEvent.id })}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 hover:border-brand-blue/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full"
    >
      <div className="relative flex-1 flex flex-col justify-between">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-brand-blue/5 text-brand-blue border border-brand-blue/10 uppercase tracking-widest shrink-0">
              <Calendar className="w-3 h-3 text-brand-blue" />
              <span>Event Highlights</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>{eventMonthLabel}</span>
            </span>
          </div>

          {count > 1 && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
              {currentIndex + 1}/{count}
            </span>
          )}
        </div>

        {/* Slide Content with Directional Animation */}
        <div className="relative overflow-hidden flex-1 flex flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentEvent.id || currentIndex}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="space-y-3 text-left flex-1 flex flex-col"
            >
              {/* Image Container */}
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
                <img
                  src={currentEvent.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80"}
                  alt={currentEvent.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle auto-play indicator line */}
                {count > 1 && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/15 overflow-hidden z-10">
                    <motion.div
                      key={`progress-${currentIndex}-${isPaused}`}
                      initial={{ width: "0%" }}
                      animate={{ width: isPaused ? undefined : "100%" }}
                      transition={{ duration: isPaused ? 0 : AUTO_SCROLL_SECONDS, ease: "linear" }}
                      className="h-full bg-brand-blue"
                    />
                  </div>
                )}

                {/* Separated Category Badges Overlaid on Image */}
                {categoryBadges.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 pointer-events-none">
                    {categoryBadges.slice(0, 2).map((cat, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shadow-xs backdrop-blur-md bg-white/90 text-slate-800 border border-white/40"
                        )}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </span>
                    ))}
                    {categoryBadges.length > 2 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-white backdrop-blur-md">
                        +{categoryBadges.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="space-y-1.5 pt-0.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-brand-blue transition-colors text-[13px] leading-snug line-clamp-2">
                    {currentEvent.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </div>

                  {currentEvent.location && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{currentEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Manual Controls: Navigation Arrows & Indicator Dots */}
        {count > 1 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            {/* Clickable Dots */}
            <div className="flex items-center gap-1 max-w-[140px] overflow-hidden">
              {monthlyEvents.slice(0, Math.min(count, 8)).map((_, idx) => {
                const isActive = idx === currentIndex % count;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleDotClick(e, idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all cursor-pointer",
                      isActive
                        ? "w-4 bg-brand-blue"
                        : "w-1.5 bg-slate-200 hover:bg-slate-300"
                    )}
                  />
                );
              })}
              {count > 8 && (
                <span className="text-[8px] text-slate-300 font-bold ml-0.5">
                  +{count - 8}
                </span>
              )}
            </div>

            {/* Manual Next / Prev Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous event"
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-brand-blue hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next event"
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-brand-blue hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
