import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const JANE_SEARCH_PLACEHOLDERS: string[] = [
  "e.g. plumber in Ruzafa, French-speaking dentist...",
  "e.g. help sorting out my NIE & paperwork...",
  "e.g. English-speaking pediatrician in Valencia...",
  "e.g. reliable electrician or air conditioning repair...",
  "e.g. osteopath, physiotherapist or massage...",
  "e.g. tax advisor for expats & freelancers...",
  "e.g. French-speaking lawyer or notary...",
  "e.g. painter, handyman or carpenter...",
];

interface RotatingPlaceholderProps {
  value: string;
  placeholders?: string[];
  intervalMs?: number;
  className?: string;
}

export function RotatingPlaceholder({
  value,
  placeholders = JANE_SEARCH_PLACEHOLDERS,
  intervalMs = 3800,
  className = "text-slate-300 text-xs sm:text-sm font-medium leading-normal truncate"
}: RotatingPlaceholderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Only cycle when input is empty
    if (value && value.trim().length > 0) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [value, intervalMs, placeholders.length]);

  if (value && value.length > 0) {
    return null;
  }

  const currentText = placeholders[index] || placeholders[0];

  return (
    <div 
      aria-hidden="true"
      className="absolute inset-y-0 left-0 right-8 pointer-events-none select-none flex items-center overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${index}-${currentText}`}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -7 }}
          transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
          className={`block w-full ${className}`}
        >
          {currentText}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default RotatingPlaceholder;
