import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  ArrowLeftRight, 
  Tag, 
  Gift, 
  Heart, 
  ChevronRight, 
  ChevronLeft,
  Ghost,
  Shirt,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Ad } from '../services/marketplaceService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function cleanAdDescription(desc?: string): string {
  if (!desc) return '';
  return desc
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\s*Details:\s*Handover:[^\]]*\]/gi, '')
    .replace(/\[\s*Handover:[^\]]*\]/gi, '')
    .replace(/\[\s*Delivery:[^\]]*\]/gi, '')
    .replace(/\[\s*Details:[^\]]*\]/gi, '')
    .trim();
}

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0 || diffInSeconds < 60) return 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

function formatSellerName(name?: string): string {
  if (!name || !name.trim()) return 'Neighbor';
  const clean = name.trim();
  if (clean.includes('@')) {
    const prefix = clean.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return clean;
}

interface HalloweenMarketplaceSectionProps {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
  onOpenPostHalloweenAd: () => void;
  currentUser?: any;
  favoriteAdIds?: string[];
  onToggleFavoriteAd?: (id: string | number) => void;
}

export const HalloweenMarketplaceSection: React.FC<HalloweenMarketplaceSectionProps> = ({
  ads,
  onSelectAd,
  onOpenPostHalloweenAd,
  favoriteAdIds = [],
  onToggleFavoriteAd
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'swap' | 'sale' | 'free' | 'costumes' | 'decor'>('all');
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // Real user Halloween ads from database / state
  const halloweenAds = useMemo(() => {
    return (Array.isArray(ads) ? ads : []).filter(ad => {
      if (!ad) return false;
      if (ad.is_halloween) return true;
      if (ad.category === 'Halloween Special') return true;
      const lowerTitle = (ad.title || '').toLowerCase();
      const lowerDesc = (ad.description || '').toLowerCase();
      return lowerTitle.includes('halloween') || lowerDesc.includes('halloween') || lowerTitle.includes('spooky') || lowerDesc.includes('spooky');
    });
  }, [ads]);

  // Filter based on active tab
  const filteredHalloweenAds = useMemo(() => {
    return halloweenAds.filter(ad => {
      const mode = ad.halloween_mode || 
        (ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit') ? 'free' : 
         ad.price?.toLowerCase().includes('swap') || ad.price?.toLowerCase().includes('échange') ? 'swap' : 'sale');
      
      const cat = ad.halloween_category || 
        ((ad.title + ' ' + ad.description).toLowerCase().includes('costume') || (ad.title + ' ' + ad.description).toLowerCase().includes('déguisement') ? 'costumes' : 'decor');

      if (filterMode === 'all') return true;
      if (filterMode === 'swap') return mode === 'swap' || Boolean(ad.halloween_trade_for);
      if (filterMode === 'sale') return mode === 'sale' && !ad.price?.toLowerCase().includes('free');
      if (filterMode === 'free') return mode === 'giveaway' || mode === 'free' || ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit');
      if (filterMode === 'costumes') return cat === 'costumes';
      if (filterMode === 'decor') return cat === 'decor' || cat === 'accessories';
      return true;
    });
  }, [halloweenAds, filterMode]);

  const handleScroll = (dir: 'left' | 'right') => {
    if (!scrollTrackRef.current) return;
    const scrollAmount = dir === 'left' ? -300 : 300;
    scrollTrackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-orange-500/25 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md shadow-orange-950/20 my-2 sm:my-3 p-3.5 sm:p-4 md:p-5">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-orange-600/15 via-purple-900/5 to-transparent pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-orange-500/20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🎃</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>Halloween Swap & Spooky Market</span>
                <span className="hidden md:inline-flex text-[10px] font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-500/30">
                  Valencia Event
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Trade costumes, sell pre-loved decor, or giveaway items locally with neighbors.
            </p>
          </div>
        </div>

        {/* Action button & Carousel controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPostHalloweenAd}
            className="w-full sm:w-auto px-3 py-2 sm:px-3.5 sm:py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-sm shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-orange-400/30 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>Post Halloween Item</span>
          </button>

          {filteredHalloweenAds.length > 2 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer border border-slate-700/60"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer border border-slate-700/60"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 py-2 sm:py-2.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
            filterMode === 'all'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All ({halloweenAds.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('swap')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'swap'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-3 h-3 text-amber-300" />
          <span>Swap</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('sale')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'sale'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3 h-3 text-orange-400" />
          <span>For Sale</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('free')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'free'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Gift className="w-3 h-3 text-emerald-400" />
          <span>Free</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('costumes')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'costumes'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shirt className="w-3 h-3 text-purple-400" />
          <span>Costumes</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('decor')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'decor'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🎃 Decor</span>
        </button>
      </div>

      {/* Cards List or Empty State */}
      {filteredHalloweenAds.length > 0 ? (
        <div 
          ref={scrollTrackRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {filteredHalloweenAds.map((ad) => {
            const isSaved = favoriteAdIds.includes(String(ad.id));
            const displayPrice = ad.price?.includes('€') || ad.price?.toLowerCase().includes('swap') || ad.price?.toLowerCase().includes('free') 
              ? ad.price 
              : `${ad.price}€`;
            const displayImage = ad.image_url || (ad.images && ad.images[0]) || 'https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?auto=format&fit=crop&q=80&w=400';

            const isSwap = ad.halloween_mode === 'swap' || Boolean(ad.halloween_trade_for) || ad.price?.toLowerCase().includes('swap') || ad.price?.toLowerCase().includes('échange');
            const isFree = ad.halloween_mode === 'giveaway' || ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit');

            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                style={{ scrollSnapAlign: 'start' }}
                className="group w-[230px] min-[400px]:w-[260px] sm:w-[290px] md:w-[310px] shrink-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-orange-400 shadow-2xs hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 text-slate-900"
              >
                {/* Image container */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={displayImage}
                    alt={ad.title}
                    className={cn(
                      "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out",
                      ad.status === 'sold' && "grayscale-[40%] opacity-90"
                    )}
                    loading="lazy"
                  />

                  {/* Status Overlays */}
                  {ad.status === 'sold' ? (
                    <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-3 pointer-events-none">
                      <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-rose-600 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider rounded-lg sm:rounded-xl shadow-lg flex items-center gap-1 sm:gap-1.5 border border-rose-400">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Sold
                      </span>
                    </div>
                  ) : ad.status === 'pending' ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500 text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Pending
                      </span>
                    </div>
                  ) : isSwap ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500 text-slate-950 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                        <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" /> Swap
                      </span>
                    </div>
                  ) : isFree ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-600 text-white font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                        <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" /> Free
                      </span>
                    </div>
                  ) : null}

                  {/* Price floating tag */}
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-orange-600 text-white font-extrabold text-xs sm:text-sm md:text-base px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-md">
                    {displayPrice}
                  </div>

                  {/* Favorite save button */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavoriteAd?.(String(ad.id));
                      }}
                      className={cn(
                        "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 backdrop-blur-md shadow-md cursor-pointer",
                        isSaved
                          ? "bg-rose-500 text-white"
                          : "bg-white/90 text-slate-600 hover:bg-white hover:text-rose-500"
                      )}
                      title={isSaved ? "Remove from saved" : "Save ad"}
                    >
                      <Heart className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isSaved && "fill-current")} />
                    </button>
                  </div>
                </div>

                {/* Body content */}
                <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3.5">
                  <div className="space-y-1 sm:space-y-1.5">
                    {/* Metadata line */}
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className="text-orange-600 font-bold">{ad.category || 'Halloween Special'}</span>
                      {ad.condition && ad.condition !== 'N/A' && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-600">{ad.condition}</span>
                        </>
                      )}
                      {ad.location && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="truncate max-w-[120px] sm:max-w-[160px] text-slate-600 font-medium">{ad.location}</span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1 leading-snug">
                      {ad.title}
                    </h3>

                    {/* Brief description */}
                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {cleanAdDescription(ad.description)}
                    </p>
                  </div>

                  {/* Footer: Seller & Time */}
                  <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      {ad.seller_image ? (
                        <img
                          src={ad.seller_image}
                          alt={formatSellerName(ad.seller_name)}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-100 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-orange-800 shrink-0">
                          {formatSellerName(ad.seller_name).charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-slate-700 truncate">{formatSellerName(ad.seller_name)}</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0">{formatRelativeTime(ad.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 sm:py-8 px-3 sm:px-4 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 w-full space-y-1.5 sm:space-y-2">
          <Ghost className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400/60 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">
            {filterMode === 'all' ? 'No Halloween listings yet. Be the first to share!' : 'No items match this filter yet.'}
          </p>
          <button
            type="button"
            onClick={onOpenPostHalloweenAd}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 cursor-pointer pt-0.5 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a costume, decor or accessory</span>
          </button>
        </div>
      )}
    </section>
  );
};
