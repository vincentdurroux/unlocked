import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  Database, 
  UserCheck, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Zap, 
  Check 
} from 'lucide-react';

export interface SmartSearchStep {
  id: string;
  label: string;
  detail: string;
  targetPercent: number;
  icon: React.ElementType;
}

const SEARCH_STEPS: SmartSearchStep[] = [
  {
    id: 'analyze',
    label: 'Analyzing request & intent',
    detail: 'Understanding discipline, location & criteria',
    targetPercent: 25,
    icon: Sparkles
  },
  {
    id: 'scan',
    label: 'Scanning verified directory',
    detail: 'Searching vetted professionals in Valencia',
    targetPercent: 52,
    icon: Database
  },
  {
    id: 'match',
    label: 'Cross-referencing skills & languages',
    detail: 'Matching spoken languages & verified ratings',
    targetPercent: 78,
    icon: UserCheck
  },
  {
    id: 'rank',
    label: 'Ranking top recommendations',
    detail: 'Curating Jane’s personalized match insights',
    targetPercent: 94,
    icon: ShieldCheck
  }
];

interface SmartSearchProgressBarProps {
  isLoading: boolean;
  query?: string;
  onCancel?: () => void;
  onProgressUpdate?: (progress: number) => void;
  className?: string;
}

export function SmartSearchProgressBar({
  isLoading,
  query,
  onCancel,
  onProgressUpdate,
  className = ''
}: SmartSearchProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [visible, setVisible] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When isLoading turns true, start the progression
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setIsFinishing(false);
      setProgress(5);
      setCurrentStepIndex(0);
      startTimeRef.current = Date.now();

      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }

      // Smooth multi-stage simulation with asymptotic easing toward 94%
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 94) {
            // Very slow creep above 94% so it never feels stalled
            const creep = Math.min(prev + 0.15, 96.5);
            onProgressUpdate?.(creep);
            return creep;
          }

          // Adaptive increment based on current progress
          let increment = 1.6;
          if (prev < 25) {
            increment = 2.4; // fast start
          } else if (prev < 50) {
            increment = 1.8;
          } else if (prev < 75) {
            increment = 1.2;
          } else if (prev < 90) {
            increment = 0.7; // gentle deceleration
          } else {
            increment = 0.25;
          }

          const next = Math.min(prev + increment, 94);
          onProgressUpdate?.(next);

          // Update active step based on progress thresholds
          if (next >= 75) setCurrentStepIndex(3);
          else if (next >= 50) setCurrentStepIndex(2);
          else if (next >= 22) setCurrentStepIndex(1);
          else setCurrentStepIndex(0);

          return next;
        });
      }, 50);

      return () => {
        clearInterval(interval);
      };
    } else {
      // When isLoading transitions to false
      if (visible) {
        setIsFinishing(true);
        setProgress(100);
        setCurrentStepIndex(SEARCH_STEPS.length - 1);
        onProgressUpdate?.(100);

        // Keep visible briefly for user satisfaction, then fade away
        finishTimeoutRef.current = setTimeout(() => {
          setVisible(false);
          setIsFinishing(false);
          setProgress(0);
          onProgressUpdate?.(0);
        }, 450);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!visible && !isLoading) {
    return null;
  }

  const currentStep = SEARCH_STEPS[currentStepIndex] || SEARCH_STEPS[0];
  const StepIcon = isFinishing ? CheckCircle2 : currentStep.icon;
  const displayPercent = Math.min(Math.round(progress), 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`w-full overflow-hidden rounded-2xl border ${
          isFinishing 
            ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 border-emerald-200/80 shadow-md shadow-emerald-500/5' 
            : 'bg-gradient-to-r from-blue-50/95 via-indigo-50/70 to-sky-50/95 border-blue-200/90 shadow-md shadow-blue-500/5'
        } p-4 sm:p-5 transition-colors duration-300 ${className}`}
      >
        {/* Header line: Jane Avatar / Icon + Step Title + Percent Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
              isFinishing
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-400/30'
                : 'bg-brand-blue text-white shadow-sm shadow-blue-500/25'
            }`}>
              <StepIcon className={`w-4.5 h-4.5 ${isFinishing ? 'animate-none' : 'animate-pulse'}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isFinishing 
                    ? 'bg-emerald-100/90 text-emerald-800' 
                    : 'bg-blue-100/90 text-brand-blue'
                }`}>
                  {isFinishing ? 'Complete' : `Step ${currentStepIndex + 1} of ${SEARCH_STEPS.length}`}
                </span>
                
                {query && (
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px] sm:max-w-[220px]">
                    "{query}"
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">
                {isFinishing ? 'Personalized recommendations ready!' : currentStep.label}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Percentage Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition-colors ${
              isFinishing 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                : 'bg-white/80 text-brand-blue border-blue-200/60 shadow-xs'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isFinishing ? 'bg-emerald-500' : 'bg-brand-blue animate-ping'
              }`} />
              <span>{displayPercent}%</span>
            </div>

            {/* Optional Cancel button */}
            {onCancel && !isFinishing && (
              <button
                type="button"
                onClick={onCancel}
                title="Cancel search"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Sub-detail text */}
        <p className="text-[11px] text-slate-500 font-medium mb-3 pl-0.5">
          {isFinishing 
            ? 'Presenting top vetted professionals tailored to your criteria...'
            : currentStep.detail}
        </p>

        {/* Main Progress Bar Track */}
        <div className="relative w-full h-2.5 bg-blue-100/70 rounded-full overflow-hidden p-0.5 shadow-inner">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${
              isFinishing
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-sm shadow-emerald-400/50'
                : 'bg-gradient-to-r from-brand-blue via-indigo-500 to-cyan-400 shadow-sm shadow-blue-400/50'
            }`}
            style={{ width: `${displayPercent}%` }}
          >
            {/* Shimmer light effect running across the bar */}
            {!isFinishing && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.4,
                  ease: 'linear'
                }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12 pointer-events-none"
              />
            )}
          </motion.div>
        </div>

        {/* Step checkpoints indicators */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-blue-100/60">
          {SEARCH_STEPS.map((step, idx) => {
            const isCompleted = isFinishing || currentStepIndex > idx;
            const isCurrent = !isFinishing && currentStepIndex === idx;

            return (
              <div key={step.id} className="flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-1 w-full justify-center">
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500 scale-100 ring-2 ring-emerald-200'
                        : isCurrent
                        ? 'bg-brand-blue scale-125 ring-2 ring-blue-200 animate-pulse'
                        : 'bg-slate-200'
                    }`}
                  />
                </div>
                <span className={`text-[9px] font-semibold leading-tight line-clamp-1 transition-colors ${
                  isCompleted
                    ? 'text-emerald-700'
                    : isCurrent
                    ? 'text-brand-blue font-bold'
                    : 'text-slate-400'
                }`}>
                  {step.id === 'analyze' ? 'Analyze' :
                   step.id === 'scan' ? 'Scan' :
                   step.id === 'match' ? 'Match' : 'Rank'}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
export default SmartSearchProgressBar;
