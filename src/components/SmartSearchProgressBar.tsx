import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check } from 'lucide-react';

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
  onProgressUpdate,
  className = ''
}: SmartSearchProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [visible, setVisible] = useState(false);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setIsFinishing(false);
      setProgress(10);
      onProgressUpdate?.(10);

      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }

      // Smooth progression up to 92%
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 92) {
            const creep = Math.min(prev + 0.1, 95);
            onProgressUpdate?.(creep);
            return creep;
          }

          let increment = 2.0;
          if (prev < 30) increment = 3.0;
          else if (prev < 65) increment = 2.0;
          else if (prev < 85) increment = 1.0;
          else increment = 0.3;

          const next = Math.min(prev + increment, 92);
          onProgressUpdate?.(next);
          return next;
        });
      }, 60);

      return () => clearInterval(interval);
    } else {
      if (visible) {
        setIsFinishing(true);
        setProgress(100);
        onProgressUpdate?.(100);

        finishTimeoutRef.current = setTimeout(() => {
          setVisible(false);
          setIsFinishing(false);
          setProgress(0);
          onProgressUpdate?.(0);
        }, 400);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  if (!visible && !isLoading) {
    return null;
  }

  // Simple, calm dynamic message
  let statusText = "Jane is searching the directory...";
  if (isFinishing) {
    statusText = "Matches ready!";
  } else if (progress > 68) {
    statusText = "Ranking the best recommendations...";
  } else if (progress > 32) {
    statusText = "Matching languages & specialties...";
  }

  const displayPercent = Math.min(Math.round(progress), 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.99 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`w-full py-2.5 px-3.5 bg-blue-50/70 rounded-xl border border-blue-100/90 shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <div className="flex items-center gap-2 min-w-0">
            {isFinishing ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-brand-blue animate-pulse shrink-0" />
            )}
            <span className={`truncate text-xs ${isFinishing ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`}>
              {statusText}
            </span>
          </div>

          <span className="font-mono text-[11px] font-bold text-brand-blue shrink-0 ml-2">
            {displayPercent}%
          </span>
        </div>

        {/* Sleek, simple animated progress bar */}
        <div className="w-full h-1.5 bg-blue-100/80 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isFinishing
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-brand-blue via-indigo-500 to-cyan-400'
            }`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SmartSearchProgressBar;
