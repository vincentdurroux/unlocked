import React from 'react';
import { 
  Handshake, 
  ChevronRight, 
  ChevronLeft, 
  Award, 
  ShieldCheck, 
  Sparkles, 
  Crown, 
  MessageSquare, 
  ExternalLink 
} from 'lucide-react';
import { AppPartner } from '../services/partnerService';
import { cn } from '../lib/utils';

interface PartnerHighlightCardProps {
  partner: AppPartner;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Multi-partner navigation props
  totalPartners?: number;
  currentIndex?: number;
  onNextPartner?: (e: React.MouseEvent) => void;
  onPrevPartner?: (e: React.MouseEvent) => void;
}

export const PartnerHighlightCard: React.FC<PartnerHighlightCardProps> = ({
  partner,
  isExpanded,
  onToggleExpand,
  totalPartners = 1,
  currentIndex = 0,
  onNextPartner,
  onPrevPartner,
}) => {
  const badgeColorClass = partner.badge_color === 'amber'
    ? 'bg-amber-500/10 text-amber-700 border-amber-300'
    : partner.badge_color === 'indigo'
    ? 'bg-indigo-500/10 text-indigo-700 border-indigo-300'
    : 'bg-emerald-500/10 text-emerald-700 border-emerald-300';

  return (
    <div
      id="discover-card-partner"
      onClick={onToggleExpand}
      className={cn(
        "flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white via-slate-50/40 to-emerald-50/25 border transition-all duration-300 cursor-pointer group relative overflow-hidden h-full min-h-[480px] shadow-sm hover:shadow-xl hover:-translate-y-1",
        isExpanded
          ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl bg-emerald-50/35"
          : "border-emerald-100/90 hover:border-emerald-400/80"
      )}
    >
      {/* Top Spotlight Glow Accent */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-emerald-400/20 via-teal-400/15 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-between text-center z-10 space-y-3">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between w-full">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest shrink-0 shadow-2xs backdrop-blur-xs",
            badgeColorClass
          )}>
            <Crown className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            {partner.badge_label || "Official Partner"}
          </span>
        </div>

        {/* Logo and Partner Identity */}
        <div className="flex flex-col items-center space-y-3 flex-1 justify-center my-1 w-full">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl md:rounded-3xl overflow-hidden bg-white p-2 shadow-lg ring-4 ring-emerald-100 group-hover:ring-emerald-300 group-hover:scale-105 transition-all duration-300 border border-slate-100">
              <img
                src={partner.logo_url || "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=240&auto=format&fit=crop&q=80"}
                alt={partner.business_name}
                className="w-full h-full object-cover rounded-xl md:rounded-2xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=240&auto=format&fit=crop&q=80";
                }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-r from-amber-500 to-emerald-600 text-white rounded-full shadow-md ring-2 ring-white">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1 w-full px-2">
            <h4 className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors text-base md:text-lg leading-tight truncate">
              {partner.business_name}
            </h4>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide truncate">
              {partner.job}
            </p>
            {partner.city && (
              <p className="text-[11px] text-slate-400 font-medium truncate">
                📍 {partner.city}
              </p>
            )}
          </div>

          {/* Short Tagline */}
          {partner.tagline && (
            <p className="text-xs text-slate-600 line-clamp-2 italic font-medium px-1">
              "{partner.tagline}"
            </p>
          )}

          {/* Special Member Perk Box */}
          {partner.perks && (
            <div className="w-full px-3 py-1.5 rounded-2xl bg-amber-50/90 text-amber-900 border border-amber-200/80 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{partner.perks}</span>
            </div>
          )}
        </div>

        {/* Quick Direct Actions on Front */}
        <div className="w-full pt-2.5 border-t border-emerald-100 flex items-center justify-between text-xs font-extrabold text-emerald-700">
          <div className="flex items-center gap-2">
            {partner.whatsapp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://wa.me/${partner.whatsapp?.replace(/[^0-9]/g, '')}`, '_blank');
                }}
                title="Direct WhatsApp Chat"
                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-transform active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1 text-[10px]"
              >
                <MessageSquare className="w-3 h-3" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
            <span className="text-[11px]">
              {isExpanded ? "Close details" : "Tap for contacts"}
            </span>
          </div>

          <span className={cn(
            "p-1.5 rounded-full bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 shadow-2xs",
            isExpanded && "rotate-90 bg-emerald-600 text-white"
          )}>
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>

        {/* Multi-partner carousel pagination indicators */}
        {totalPartners > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {Array.from({ length: totalPartners }).map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentIndex
                    ? "w-5 bg-emerald-600"
                    : "w-1.5 bg-slate-200"
                )}
              />
            ))}
          </div>
        )}

      </div>

      {/* Navigation Left/Right Arrows for Multi-Partner Carousel */}
      {totalPartners > 1 && onPrevPartner && onNextPartner && (
        <>
          <button
            type="button"
            onClick={onPrevPartner}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-md text-slate-500 hover:text-emerald-700 hover:scale-110 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 cursor-pointer"
            title="Previous Partner"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextPartner}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 backdrop-blur-md shadow-md text-slate-500 hover:text-emerald-700 hover:scale-110 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30 cursor-pointer"
            title="Next Partner"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};
