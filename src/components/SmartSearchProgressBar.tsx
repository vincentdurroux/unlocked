import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, CheckCircle2, Clock, Filter, RotateCcw } from 'lucide-react';

interface SmartSearchProgressBarProps {
  isLoading: boolean;
  query?: string;
  onCancel?: () => void;
  onProgressUpdate?: (progress: number) => void;
  className?: string;
  isTakingLonger?: boolean;
  onSwitchToCategory?: () => void;
  onRetryLater?: () => void;
}

export function SmartSearchProgressBar({
  isLoading,
  query,
  onCancel,
  onProgressUpdate,
  className = '',
  isTakingLonger = false,
  onSwitchToCategory,
  onRetryLater
}: SmartSearchProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [internalTakingLonger, setInternalTakingLonger] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setIsFinishing(false);
      setProgress(5);
      setInternalTakingLonger(false);
      onProgressUpdate?.(5);

      const delayTimer = setTimeout(() => {
        setInternalTakingLonger(true);
      }, 4500);

      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            const next = Math.min(prev + 0.5, 98);
            onProgressUpdate?.(next);
            return next;
          }
          const increment = prev < 30 ? 3 : prev < 70 ? 2 : 1;
          const next = Math.min(prev + increment, 95);
          onProgressUpdate?.(next);
          return next;
        });
      }, 45);

      return () => {
        clearInterval(interval);
        clearTimeout(delayTimer);
      };
    } else {
      setInternalTakingLonger(false);
      if (visible) {
        setIsFinishing(true);
        setProgress(100);
        onProgressUpdate?.(100);

        const timeout = setTimeout(() => {
          setVisible(false);
          setIsFinishing(false);
          setProgress(0);
        }, 400);

        return () => clearTimeout(timeout);
      }
    }
  }, [isLoading]);

  if (!visible && !isLoading) {
    return null;
  }

  const displayPercent = Math.min(Math.round(progress), 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={`w-full bg-white rounded-2xl border border-blue-100 p-4 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isFinishing ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white'
            }`}>
              {isFinishing ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isFinishing ? 'Recommendations ready!' : 'Jane is searching professionals...'}
              </p>
              {query && (
                <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[300px]">
                  "{query}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-blue font-mono">
              {displayPercent}%
            </span>
            {onCancel && !isFinishing && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Simple Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              isFinishing ? 'bg-emerald-500' : 'bg-brand-blue'
            }`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>

        {/* Delay / Taking longer prompt */}
        {(isTakingLonger || internalTakingLonger) && !isFinishing && (
          <div className="mt-3 pt-2.5 border-t border-blue-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Jane search is taking longer than usual...</span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {onSwitchToCategory && (
                <button
                  type="button"
                  onClick={onSwitchToCategory}
                  className="px-2.5 py-1 bg-brand-blue hover:bg-[#0958d9] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Filter className="w-3 h-3" />
                  <span>Switch to category</span>
                </button>
              )}
              {onRetryLater && (
                <button
                  type="button"
                  onClick={onRetryLater}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Try later
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default SmartSearchProgressBar;
