import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  ArrowLeftRight, 
  Tag, 
  Gift, 
  Heart, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Shirt,
  CheckCircle2,
  Clock,
  TreePine,
  Gamepad2
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
    .replace(/[\u00A0\u202F\u2000-\u200B\u2028\u2029]/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\s*Details:\s*Handover:[^\]]*\]/gi, '')
    .replace(/\[\s*Handover:[^\]]*\]/gi, '')
    .replace(/\[\s*Delivery:[^\]]*\]/gi, '')
    .replace(/\[\s*Details:[^\]]*\]/gi, '')
    .replace(/(\d)[ \t\u00A0\u202F]{2,}(\d)/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
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

interface ChristmasMarketplaceSectionProps {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
  onOpenPostChristmasAd: () => void;
  currentUser?: any;
  favoriteAdIds?: string[];
  onToggleFavoriteAd?: (id: string | number) => void;
}

export const ChristmasMarketplaceSection: React.FC<ChristmasMarketplaceSectionProps> = ({
  ads,
  onSelectAd,
  onOpenPostChristmasAd,
  favoriteAdIds = [],
  onToggleFavoriteAd
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'swap' | 'sale' | 'free' | 'gifts' | 'decor' | 'sweaters'>('all');
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<string, number>>({});
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  // Real user Christmas ads from database / state
  const christmasAds = useMemo(() => {
    return (Array.isArray(ads) ? ads : []).filter(ad => {
      if (!ad) return false;
      if (ad.is_christmas) return true;
      if (ad.category === 'Christmas Special' || ad.category === 'Spécial Noël') return true;
      const lowerTitle = (ad.title || '').toLowerCase();
      const lowerDesc = (ad.description || '').toLowerCase();
      return (
        lowerTitle.includes('christmas') || lowerDesc.includes('christmas') ||
        lowerTitle.includes('noël') || lowerDesc.includes('noël') ||
        lowerTitle.includes('noel') || lowerDesc.includes('noel') ||
        lowerTitle.includes('sapin') || lowerTitle.includes('xmas') ||
        lowerDesc.includes('sapin') || lowerDesc.includes('cadeau de noël')
      );
    });
  }, [ads]);

  // Filter based on active tab
  const filteredChristmasAds = useMemo(() => {
    return christmasAds.filter(ad => {
      const mode = ad.christmas_mode || 
        (ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit') ? 'free' : 
         ad.price?.toLowerCase().includes('swap') || ad.price?.toLowerCase().includes('échange') ? 'swap' : 'sale');
      
      const fullText = ((ad.title || '') + ' ' + (ad.description || '')).toLowerCase();
      const cat = ad.christmas_category || 
        (fullText.includes('pull') || fullText.includes('sweater') || fullText.includes('tenue') ? 'sweaters' :
         fullText.includes('sapin') || fullText.includes('decor') || fullText.includes('guirlande') || fullText.includes('boule') ? 'decor' : 'gifts');

      if (filterMode === 'all') return true;
      if (filterMode === 'swap') return mode === 'swap' || Boolean(ad.christmas_trade_for);
      if (filterMode === 'sale') return mode === 'sale' && !ad.price?.toLowerCase().includes('free') && !ad.price?.toLowerCase().includes('gratuit');
      if (filterMode === 'free') return mode === 'giveaway' || mode === 'free' || ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit');
      if (filterMode === 'gifts') return cat === 'gifts' || cat === 'toys' || fullText.includes('cadeau') || fullText.includes('gift') || fullText.includes('jouet');
      if (filterMode === 'decor') return cat === 'decor' || fullText.includes('sapin') || fullText.includes('decor');
      if (filterMode === 'sweaters') return cat === 'sweaters' || fullText.includes('pull') || fullText.includes('sweater');
      return true;
    });
  }, [christmasAds, filterMode]);

  const handleScroll = (dir: 'left' | 'right') => {
    if (!scrollTrackRef.current) return;
    const scrollAmount = dir === 'left' ? -300 : 300;
    scrollTrackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 text-white shadow-lg shadow-emerald-950/20 my-2 sm:my-3 p-3.5 sm:p-4 md:p-5">
      {/* Festive ambient background glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-rose-600/20 via-amber-500/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-emerald-500/20 relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-rose-900/40 shrink-0 border border-rose-400/30 text-xl sm:text-2xl">
            🎄
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>Christmas Market & Holiday Gift Swap</span>
                <span className="hidden md:inline-flex text-[10px] font-bold text-amber-300 bg-emerald-900/80 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-xs">
                  ✨ Holiday Special
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              Gifts, toys, Christmas trees, holiday decor, festive sweaters & neighborly swaps in Valencia.
            </p>
          </div>
        </div>

        {/* Action button & Carousel controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPostChristmasAd}
            className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-md shadow-rose-900/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-400/40 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>Post a Christmas Item</span>
          </button>

          {filteredChristmasAds.length > 2 && (
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
      <div className="flex items-center gap-1.5 py-2 sm:py-2.5 overflow-x-auto no-scrollbar relative z-10">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
            filterMode === 'all'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          All ({christmasAds.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('gifts')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'gifts'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Gift className="w-3 h-3 text-amber-300" />
          <span>Gifts & Toys</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('decor')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'decor'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TreePine className="w-3 h-3 text-emerald-300" />
          <span>Tree & Decor</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('sweaters')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'sweaters'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shirt className="w-3 h-3 text-cyan-300" />
          <span>Holiday Sweaters</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('swap')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'swap'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-3 h-3 text-amber-300" />
          <span>Swap / Trade</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('sale')}
          className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
            filterMode === 'sale'
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
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
              ? 'bg-red-600 text-white shadow-sm shadow-red-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3 h-3 text-yellow-300" />
          <span>Free Giveaway</span>
        </button>
      </div>

      {/* Cards List or Empty State */}
      {filteredChristmasAds.length > 0 ? (
        <div 
          ref={scrollTrackRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar relative z-10"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {filteredChristmasAds.map((ad) => {
            const isSaved = favoriteAdIds.includes(String(ad.id));
            const normalizedPrice = (ad.price || '').trim();
            const lowerPrice = normalizedPrice.toLowerCase();
            const displayPrice = lowerPrice === 'gratuit' || lowerPrice === 'free'
              ? 'Free'
              : lowerPrice === 'échange' || lowerPrice === 'swap'
                ? 'Swap'
                : normalizedPrice.includes('€') || lowerPrice.includes('swap') || lowerPrice.includes('free')
                  ? normalizedPrice
                  : `${normalizedPrice}€`;
            const cardImages = (ad.images && Array.isArray(ad.images) && ad.images.length > 0)
              ? ad.images
              : [ad.image_url || 'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&q=80&w=600'];
            const cardImgIdx = cardImageIndexes[ad.id] || 0;
            const currentCardImage = cardImages[cardImgIdx] || cardImages[0];

            const handlePrevCardImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardImageIndexes(prev => {
                const current = prev[ad.id] || 0;
                const next = (current - 1 + cardImages.length) % cardImages.length;
                return { ...prev, [ad.id]: next };
              });
            };

            const handleNextCardImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              setCardImageIndexes(prev => {
                const current = prev[ad.id] || 0;
                const next = (current + 1) % cardImages.length;
                return { ...prev, [ad.id]: next };
              });
            };

            const isSwap = ad.christmas_mode === 'swap' || Boolean(ad.christmas_trade_for) || ad.price?.toLowerCase().includes('swap') || ad.price?.toLowerCase().includes('échange');
            const isFree = ad.christmas_mode === 'giveaway' || ad.price?.toLowerCase().includes('free') || ad.price?.toLowerCase().includes('gratuit');

            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                style={{ scrollSnapAlign: 'start' }}
                className="group w-[230px] min-[400px]:w-[260px] sm:w-[290px] md:w-[310px] shrink-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-red-400 shadow-2xs hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 text-slate-900"
              >
                {/* Image container */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden group/img">
                  <img
                    src={currentCardImage}
                    alt={ad.title}
                    className={cn(
                      "w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out",
                      ad.status === 'sold' && "grayscale-[40%] opacity-90"
                    )}
                    loading="lazy"
                  />

                  {cardImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevCardImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white backdrop-blur rounded-full shadow-md text-slate-900 opacity-0 group-hover/img:opacity-100 transition-opacity z-20 cursor-pointer"
                        title="Previous photo"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextCardImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white backdrop-blur rounded-full shadow-md text-slate-900 opacity-0 group-hover/img:opacity-100 transition-opacity z-20 cursor-pointer"
                        title="Next photo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-20 pointer-events-none bg-slate-950/40 backdrop-blur-xs px-2 py-1 rounded-full">
                        {cardImages.map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all",
                              i === cardImgIdx ? "bg-white w-3" : "bg-white/50"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}

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
                        <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" /> Swap / Trade
                      </span>
                    </div>
                  ) : isFree ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-600 text-white font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-lg sm:rounded-xl shadow-md flex items-center gap-1">
                        <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" /> Free Giveaway
                      </span>
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 sm:px-2 sm:py-1 bg-emerald-900/90 text-amber-300 font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider rounded-lg shadow-sm border border-emerald-600/40">
                        🎄 Christmas
                      </span>
                    </div>
                  )}

                  {/* Price floating tag */}
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-red-600 text-white font-extrabold text-xs sm:text-sm md:text-base px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-md">
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
                      <span className="text-red-600 font-bold">{ad.category || 'Christmas Special'}</span>
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
                    <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 group-hover:text-red-600 transition-colors line-clamp-1 leading-snug">
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
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-100 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-red-800 shrink-0">
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
        <div className="py-7 sm:py-9 px-3 sm:px-4 text-center rounded-2xl bg-slate-900/50 border border-dashed border-emerald-800/60 w-full space-y-2 relative z-10">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl shadow-inner">
            🎄
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-200">
            {filterMode === 'all' 
              ? 'The Christmas Market is open! Be the first to share a gift, toy, or tree.' 
              : 'No items match this filter yet.'}
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Give a second life to holiday decorations, delight neighbors with pre-loved toys, or arrange a warm seasonal swap.
          </p>
          <button
            type="button"
            onClick={onOpenPostChristmasAd}
            className="px-4 py-2 mt-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-95 border border-rose-400/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Christmas Item</span>
          </button>
        </div>
      )}
    </section>
  );
};
