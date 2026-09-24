import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CylinderWord {
  text: string;
  // Exact colors requested by user:
  // - "Pros": Find Pros blue (#1677FF / brand-blue)
  // - "Events": Events page orange (#f97316 / text-orange-500)
  // - "Guides": Guides page green (#059669 / text-emerald-600)
  colorClass: string;
  extraClass?: string;
}

const CYLINDER_WORDS: CylinderWord[] = [
  {
    text: 'Pros',
    colorClass: 'text-[#1677FF]', // Exactly the Find Pros / brand-blue color
    extraClass: 'tracking-[0.06em]', // Harmonizes width with Events/Guides for consistent snug spacing
  },
  {
    text: 'Events',
    colorClass: 'text-[#f97316]', // Exactly the Events page orange color (orange-500)
  },
  {
    text: 'Guides',
    colorClass: 'text-[#059669]', // Exactly the Guides page green color (emerald-600)
  },
];

export const RotatingCylinderWord: React.FC = () => {
  const [index, setIndex] = useState(0);

  // Accelerated rotation: 1.75s interval between words
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CYLINDER_WORDS.length);
    }, 1750);

    return () => clearInterval(timer);
  }, []);

  const current = CYLINDER_WORDS[index];

  return (
    <span
      className="inline-flex items-center justify-center relative overflow-hidden align-baseline h-[1.25em] select-none cursor-pointer px-1 -mx-0.5"
      style={{
        perspective: '600px',
        transformStyle: 'preserve-3d',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
      }}
      onClick={() => setIndex((prev) => (prev + 1) % CYLINDER_WORDS.length)}
      title="Cliquez pour changer"
    >
      {/* Invisible fixed spacer sized to "Guides".
          Keeping width permanently fixed so the rest of the sentence never moves,
          while having tight margins so it sits close to "Discover" and "better". */}
      <span
        aria-hidden="true"
        className="invisible pointer-events-none select-none font-bold italic leading-none"
      >
        Guides
      </span>

      {/* Rotating 3D cylinder word absolute viewport */}
      <span className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={current.text}
            initial={{
              rotateX: 90,
              y: '75%',
              opacity: 0,
            }}
            animate={{
              rotateX: 0,
              y: '0%',
              opacity: 1,
            }}
            exit={{
              rotateX: -90,
              y: '-75%',
              opacity: 0,
            }}
            transition={{
              duration: 0.4, // Snappy 3D cylinder roll
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              transformOrigin: '50% 50% -14px',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
            }}
            className={`font-bold italic ${current.colorClass} ${current.extraClass || ''} inline-block whitespace-nowrap leading-none`}
          >
            {current.text}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};
