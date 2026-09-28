import React from 'react';
import { motion } from 'motion/react';

interface AppSplashScreenProps {
  isLoading: boolean;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <motion.div
      key="app-splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white px-6 select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Background subtle radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_center,_rgba(22,119,255,0.08)_0%,_rgba(255,184,0,0.04)_40%,_transparent_70%)]" 
      />

      <div className="relative flex flex-col items-center max-w-xs w-full text-center space-y-6">
        {/* Animated Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Subtle pulsating halo */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.35, 0.7, 0.35],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-blue-400/20 blur-xl"
          />

          {/* Logo Card */}
          <motion.div
            animate={{
              scale: [1, 1.04, 1],
              y: [0, -3, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white shadow-xl shadow-blue-500/10 border border-slate-100 flex items-center justify-center p-3.5"
          >
            <img
              src="/logo2.png"
              alt="Unlocked Logo"
              className="w-full h-full object-contain drop-shadow-sm"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Brand Text */}
        <div className="space-y-1.5">
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-2xl font-black text-brand-navy tracking-tight"
          >
            Unlocked
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-xs font-semibold text-slate-400 tracking-wide uppercase"
          >
            Your local community guide
          </motion.p>
        </div>

        {/* Elegant Animated Progress Bar */}
        <div className="w-36 sm:w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-brand-blue via-[#38bdf8] to-brand-yellow rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
};
