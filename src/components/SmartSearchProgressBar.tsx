import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

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
  const [visible, setVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setIsFinishing(false);
      setProgress(5);
      onProgressUpdate?.(5);

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

      return () => clearInterval(interval);
    } else {
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
      </motion.div>
    </AnimatePresence>
  );
}

export default SmartSearchProgressBar;
