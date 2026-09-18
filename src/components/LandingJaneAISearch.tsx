import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RotateCcw, 
  Loader2, 
  Lock, 
  AlertCircle, 
  X, 
  User, 
  Award, 
  Star, 
  MapPin, 
  Globe, 
  ChevronRight, 
  Settings, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  ThumbsUp, 
  Clock
} from 'lucide-react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { cn } from '../lib/utils';
import { isTradeMismatched } from '../lib/locationUtils';

export interface Professional {
  id: string;
  name: string;
  company_name?: string;
  profession?: string;
  category: string;
  rating: number;
  review_count?: number;
  languages: string[];
  image: string;
  bio: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  is_highlighted?: boolean;
  top_qualities?: string[];
  has_filled_form?: boolean;
  categories?: string[];
  source?: string;
  is_community_recommended?: boolean;
  is_recommended?: boolean;
  is_recommanded?: boolean;
  distanceKm?: number | null;
}

export interface Event {
  id: string;
  title: string;
  date?: string;
  time?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  category: string;
  image: string;
  description?: string;
}

export interface LandingJaneAISearchProps {
  allPros: Professional[];
  events?: Event[];
  allArticles?: any[];
  userLocation?: { lat: number; lng: number } | null;
  onSelectPro: (pro: Professional) => void;
  onSelectEvent?: (event: Event) => void;
  onSelectArticle?: (article: any) => void;
  onNavigate: (view: any, params?: any) => void;
}

export const isCommunityPro = (p: any): boolean => {
  if (!p) return false;
  const src = ((p.source || '') as string).toLowerCase();
  const idStr = String(p.id || '');
  if (src === 'google' || src === 'google_places' || idStr.startsWith('google_')) {
    return false;
  }
  if (p.is_community_recommended !== undefined && p.is_community_recommended !== null) return Boolean(p.is_community_recommended);
  if (p.is_recommended !== undefined && p.is_recommended !== null) return Boolean(p.is_recommended);
  if (p.is_recommanded !== undefined && p.is_recommanded !== null) return Boolean(p.is_recommanded);
  return true;
};

const QUALITY_CONFIGS = [
  { name: "Professional", icon: Award, color: "bg-blue-500/10 text-blue-800 border-blue-500/25 hover:bg-blue-500/20", iconColor: "text-blue-500", rawTheme: "blue" },
  { name: "Responsive", icon: Clock, color: "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 hover:bg-emerald-500/20", iconColor: "text-emerald-500", rawTheme: "emerald" },
  { name: "Reliable", icon: ShieldCheck, color: "bg-indigo-500/10 text-indigo-800 border-indigo-500/25 hover:bg-indigo-500/20", iconColor: "text-indigo-500", rawTheme: "indigo" },
  { name: "Friendly", icon: ThumbsUp, color: "bg-rose-500/10 text-rose-800 border-rose-500/25 hover:bg-rose-500/20", iconColor: "text-rose-500", rawTheme: "rose" },
  { name: "Efficient", icon: Settings, color: "bg-teal-500/10 text-teal-800 border-teal-500/25 hover:bg-teal-500/20", iconColor: "text-teal-500", rawTheme: "teal" },
  { name: "Detail-oriented", icon: Search, color: "bg-violet-500/10 text-violet-800 border-violet-500/25 hover:bg-violet-500/20", iconColor: "text-violet-500", rawTheme: "violet" },
  { name: "Clear communication", icon: MessageSquare, color: "bg-amber-500/10 text-amber-800 border-amber-500/25 hover:bg-amber-500/20", iconColor: "text-amber-500", rawTheme: "amber" },
];

const getQualityConfig = (name: string) => {
  const cfg = QUALITY_CONFIGS.find(q => q.name.toLowerCase() === name.toLowerCase()) || {
    name,
    icon: Award,
    color: "bg-slate-500/10 text-slate-800 border-slate-500/25 hover:bg-slate-500/20",
    iconColor: "text-slate-500",
    rawTheme: "slate"
  };
  return cfg;
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

export const LandingJaneAISearch: React.FC<LandingJaneAISearchProps> = ({
  allPros,
  userLocation,
  onSelectPro,
  onNavigate
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<{ [key: string]: { score: number; reason: string } } | null>(null);
  const [aiExactMatch, setAiExactMatch] = useState<boolean>(true);
  const [aiSummaryMessage, setAiSummaryMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');

  // Automatically scroll to results once Jane has finished analyzing
  useEffect(() => {
    if (!aiLoading && aiResults !== null && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [aiLoading, aiResults]);

  const handleSearchSubmit = async () => {
    const trimmed = search.trim();
    if (!trimmed) {
      setAiResults(null);
      setAiExactMatch(true);
      setAiSummaryMessage(null);
      setAiQuery('');
      setAiError(null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiQuery(trimmed);

    try {
      let data: any = null;
      let serverFailed = false;

      const proListBrief = allPros.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        company_name: p.company_name || "",
        category: p.category || p.profession || "",
        categories: p.categories || [],
        bio: (p.bio || p.description || "").slice(0, 500),
        top_qualities: p.top_qualities || [],
        languages: p.languages || [],
        rating: p.rating || 0,
        location: p.location || "",
        coordinates: p.coordinates || null,
        lat: p.coordinates?.lat ?? p.lat,
        lng: p.coordinates?.lng ?? p.lng,
        is_community_recommended: isCommunityPro(p),
        is_recommended: isCommunityPro(p),
        source: p.source || (isCommunityPro(p) ? 'community' : 'google_places')
      }));

      const briefPros = proListBrief.filter((p: any) =>
        !isTradeMismatched(trimmed, p.name, p.category)
      );

      try {
        const response = await fetch("/api/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, professionals: briefPros, userLocation }),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          serverFailed = true;
        }
      } catch (fetchErr) {
        console.warn("[Landing Jane Search] Server search failed, engaging fallback:", fetchErr);
        serverFailed = true;
      }

      // Client-side fallback if server fails
      if (serverFailed || !data) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
            
            const sysInstruction = `You are an expert matching AI assistant for "Unlocked" in Valencia.
Evaluate the user query and return matching professionals from the provided list.
Rules:
- STRICT DIRECTORY CONSTRAINT: Recommend only professionals from the list.
- Score from 0 to 100, only score > 30 for relevant pros.
- Provide a concise reasonUrlExcerpt for each matching professional.`;

            for (const model of candidateModels) {
              try {
                const response = await ai.models.generateContent({
                  model,
                  contents: `User Query: "${trimmed}"\nProfessionals:\n${JSON.stringify(briefPros.slice(0, 40), null, 2)}`,
                  config: {
                    systemInstruction: sysInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        exactMatchFound: { type: Type.BOOLEAN },
                        summaryMessage: { type: Type.STRING },
                        results: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              score: { type: Type.INTEGER },
                              reasonUrlExcerpt: { type: Type.STRING }
                            },
                            required: ["id", "score", "reasonUrlExcerpt"]
                          }
                        }
                      },
                      required: ["exactMatchFound", "results"]
                    },
                    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                    temperature: 0.1
                  }
                });

                data = JSON.parse(response.text || "{}");
                if (data) break;
              } catch (mErr) {
                console.warn(`[Landing Jane] Client model ${model} failed:`, mErr);
              }
            }
          } catch (clientErr) {
            console.warn("[Landing Jane] Client AI search error:", clientErr);
          }
        }

        // Local semantic keyword matching fallback if AI is unavailable or quota reached
        if (!data || !data.results) {
          const qToks = trimmed.toLowerCase().split(/[\s,.'"-]+/).filter(t => t.length >= 3);
          const fallbackResults = briefPros.map(p => {
            let sc = 0;
            const cat = (p.category || '').toLowerCase();
            const bio = (p.bio || '').toLowerCase();
            const name = (p.name || '').toLowerCase();
            for (const t of qToks) {
              if (cat.includes(t)) sc += 35;
              if (name.includes(t)) sc += 25;
              if (bio.includes(t)) sc += 15;
            }
            if (p.is_community_recommended) sc += 15;
            return {
              id: String(p.id),
              score: Math.min(sc, 95),
              reasonUrlExcerpt: `${p.category || 'Spécialiste'} à ${p.location || 'Valence'}`
            };
          }).filter(p => p.score >= 30).sort((a, b) => b.score - a.score);

          data = {
            exactMatchFound: fallbackResults.length > 0,
            summaryMessage: fallbackResults.length > 0 ? null : "We couldn't find an exact match for this search in our directory.",
            results: fallbackResults.slice(0, 10)
          };
        }
      }

      const resultsMap: { [key: string]: { score: number; reason: string } } = {};
      if (data && data.results && Array.isArray(data.results)) {
        data.results.forEach((r: any) => {
          resultsMap[String(r.id)] = {
            score: r.score,
            reason: r.reasonUrlExcerpt || r.reason || ""
          };
        });
      }

      setAiResults(resultsMap);
      setAiExactMatch(data?.exactMatchFound ?? true);
      setAiSummaryMessage(data?.summaryMessage ?? null);
    } catch (err: any) {
      console.error("[Landing Jane] Search error:", err);
      setAiError("Jane is temporarily unavailable. Please try again or browse the directory directly.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredPros = useMemo(() => {
    if (!aiResults) return [];

    return (allPros || [])
      .filter(pro => {
        const matchInfo = aiResults[String(pro.id)];
        return !!matchInfo && typeof matchInfo.score === 'number' && matchInfo.score > 0;
      })
      .sort((a, b) => {
        // 1. Community Pros first
        const aComm = isCommunityPro(a) ? 1 : 0;
        const bComm = isCommunityPro(b) ? 1 : 0;
        if (aComm !== bComm) return bComm - aComm;

        // 2. Score descending
        const scoreA = aiResults[String(a.id)]?.score || 0;
        const scoreB = aiResults[String(b.id)]?.score || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;

        // 3. Proximity
        if (userLocation && a.coordinates && b.coordinates) {
          const distA = getDistance(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng);
          const distB = getDistance(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng);
          if (distA !== distB) return distA - distB;
        }

        // 4. Rating
        return (b.rating || 0) - (a.rating || 0);
      });
  }, [allPros, aiResults, userLocation]);

  const hasStrongAiMatches = filteredPros.some(p => (aiResults?.[String(p.id)]?.score || 0) >= 60);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 my-6">
      {/* Ask Jane Search Interface - Duplicated from Find Pro */}
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="text-left space-y-1">
          <h2 className="text-3xl md:text-4xl font-semibold font-display text-slate-900 tracking-tight leading-tight">
            <span className="text-brand-blue font-semibold">What</span> are you looking for?
          </h2>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            Search for a professional or let Jane, your AI assistant, find the best match for you.
          </p>
        </div>

        <div className="space-y-4">
          {/* Blue Bordered Ask Jane Container */}
          <div className="relative bg-white rounded-[24px] border-2 border-blue-200/90 p-5 shadow-[0_4px_24px_rgba(37,99,235,0.02)] space-y-2 focus-within:border-brand-blue/50 focus-within:ring-4 focus-within:ring-brand-blue/5 transition-all">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-blue mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-[11px] font-extrabold text-brand-blue uppercase tracking-wider">
                    Tell Jane what you need...
                  </label>
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setAiResults(null);
                        setAiQuery('');
                        inputRef.current?.focus();
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 cursor-pointer"
                      title="Clear input"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea 
                  ref={inputRef}
                  rows={3}
                  placeholder="e.g. plumber, French-speaking dentist, or help sorting out my paperwork"
                  className="w-full bg-transparent outline-none text-slate-700 font-medium leading-relaxed placeholder:text-slate-300 text-xs sm:text-sm border-none p-0 focus:ring-0 resize-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Large Blue Recommendations Action Button */}
          <button 
            onClick={handleSearchSubmit}
            disabled={aiLoading || !search.trim()}
            className="w-full py-4.5 bg-brand-blue hover:bg-[#0958d9] active:scale-[0.98] text-white rounded-[24px] font-bold text-sm md:text-base shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {aiLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 fill-white/10" />
            )}
            Find professionals
          </button>

          {/* Privacy Safeguard Note */}
          <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold text-[10px] md:text-[11px] tracking-wide pt-1 text-center">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>100% private. Jane is here to help.</span>
          </div>
        </div>

        {/* AI Error banner */}
        {aiError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Skeleton / Loading pulse for AI mapping */}
        {aiLoading && (
          <div className="p-8 bg-blue-50/40 rounded-3xl border border-blue-100/40 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-blue animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand-navy">Jane is analyzing your request...</p>
              <p className="text-xs text-slate-400 max-w-sm">Jane is searching our database of recommended professionals to find the perfect matches.</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div ref={resultsRef}>
        {/* Active AI search message banner */}
        {aiQuery && aiResults && !aiLoading && (
          <motion.div 
            id="ai-search-banner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`scroll-mt-28 p-4 md:p-5 rounded-2xl border transition-all shadow-xs ${
              !hasStrongAiMatches || !aiExactMatch
                ? "bg-amber-50/70 border-amber-200/80 text-amber-950"
                : "bg-blue-50/60 border-blue-100 text-slate-900"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 border ${
                  !hasStrongAiMatches || !aiExactMatch
                    ? "bg-amber-100/80 border-amber-200 text-amber-800"
                    : "bg-blue-100/80 border-blue-200 text-brand-blue"
                }`}>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      !hasStrongAiMatches || !aiExactMatch
                        ? "bg-amber-100 text-amber-900 border-amber-200"
                        : "bg-blue-100 text-blue-900 border-blue-200"
                    }`}>
                      {!hasStrongAiMatches || !aiExactMatch ? "Jane's Tips" : "Jane's Search"}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      "{aiQuery}"
                    </span>
                  </div>

                  {!hasStrongAiMatches || !aiExactMatch ? (
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-amber-950">
                      {aiSummaryMessage ? (
                        filteredPros.length === 0 
                          ? aiSummaryMessage.replace(/Jane found some alternative options, but they may not meet all your criteria\./gi, '').trim()
                          : aiSummaryMessage
                      ) : (
                        <>
                          We couldn't find an exact match for "<strong>{aiQuery}</strong>" in our directory.
                          {filteredPros.length > 0 && " Jane found some alternative options, but they may not meet all your criteria."}
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-700">
                      Jane found <strong>{filteredPros.length}</strong> {filteredPros.length === 1 ? 'match' : 'matches'} for "<strong>{aiQuery}</strong>" sorted by relevance:
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center shrink-0 self-start md:self-center pt-1 md:pt-0">
                <button
                  onClick={() => {
                    setSearch('');
                    setAiResults(null);
                    setAiQuery('');
                    setAiSummaryMessage(null);
                    setAiExactMatch(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Results banner */}
        <AnimatePresence>
          {aiResults && !aiLoading && filteredPros.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 mt-4 bg-amber-50/60 rounded-2xl border border-amber-100/50 text-amber-900 text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-center sm:text-left"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>No direct matches found. Try using broader keywords or explore our verified directory! 🌟</span>
              </div>
              <button
                onClick={() => onNavigate('explore')}
                className="px-4 py-2 bg-white hover:bg-amber-100/50 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 shadow-xs transition-all shrink-0"
              >
                Browse directory
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List View matching Find Pro */}
        {filteredPros.length > 0 && (
          <div className="space-y-6 mt-6">
            <div id="pro-cards-list" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPros.map((pro, index) => (
                <motion.div 
                  key={pro.id} 
                  id={`pro-card-${pro.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onSelectPro(pro);
                  }}
                  className={cn(
                    "group relative bg-white rounded-[32px] p-6 flex flex-col lg:flex-row gap-6 transition-all shadow-sm hover:shadow-xl cursor-pointer overflow-hidden text-left",
                    isCommunityPro(pro)
                      ? "border-2 border-emerald-500/80 hover:border-emerald-600 shadow-emerald-500/10"
                      : "border border-slate-200/80 hover:border-slate-300 bg-slate-50/20"
                  )}
                >
                  {/* Number Badge to match map pins */}
                  <div className={cn(
                    "absolute top-6 right-6 w-8 h-8 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg z-10 transition-transform group-hover:scale-110",
                    isCommunityPro(pro)
                      ? "bg-emerald-600 shadow-emerald-600/30"
                      : "bg-slate-600 shadow-slate-600/30"
                  )}>
                    {index + 1}
                  </div>

                  {/* AI Match Score Badge */}
                  {aiResults && aiResults[String(pro.id)] && (
                    <div className="absolute top-6 right-16 px-2.5 py-1 bg-blue-50 text-brand-blue rounded-full flex items-center gap-1 text-[10px] font-bold border border-blue-100/50 z-10">
                      <Sparkles className="w-3 h-3 text-brand-blue fill-blue-200" />
                      <span>{aiResults[String(pro.id)].score}% Jane match</span>
                    </div>
                  )}

                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-brand-blue/5 transition-colors duration-500" />
                  
                  <div className="relative w-24 h-24 sm:w-40 sm:h-40 lg:w-32 lg:h-32 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                    {pro.image ? (
                      <img src={pro.image} alt={pro.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-1/2 h-1/2 text-slate-200" />
                    )}
                  </div>
  
                  <div className="relative flex-1 flex flex-col justify-between min-w-0 py-1">
                    <div className="space-y-2">
                      {isCommunityPro(pro) && (
                        <div className="mb-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] tracking-tight shadow-xs shadow-emerald-500/30">
                            <Award className="w-3.5 h-3.5 text-white shrink-0" />
                            <span>recommended by MyCityUnlocked</span>
                          </span>
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-xl truncate group-hover:text-brand-blue transition-colors tracking-tight pr-8">{pro.name}</h4>
                        {pro.company_name && (
                          <p className="text-xs font-semibold text-slate-600 truncate -mt-0.5 mb-1.5">{pro.company_name}</p>
                        )}
                        <div className="flex items-center gap-2">
                           <span className="text-[11px] font-medium text-brand-blue uppercase tracking-widest">{pro.category}</span>
                           {isCommunityPro(pro) && (
                             <>
                               <span className="text-slate-200">•</span>
                               <div className="flex items-center gap-1">
                                 <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />
                                 <span className="text-xs font-normal text-slate-700">
                                   {pro.rating ? pro.rating.toFixed(1) : "5.0"}
                                 </span>
                               </div>
                             </>
                           )}
                        </div>
                      </div>

                      {pro.top_qualities && pro.top_qualities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-4 pb-2">
                          {pro.top_qualities.map(quality => {
                            const cfg = getQualityConfig(quality);
                            const IconComp = cfg.icon;
                            return (
                              <span 
                                key={quality} 
                                className="px-2 py-1 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-100 flex items-center gap-1.5 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                              >
                                <IconComp className={`w-3 h-3 ${cfg.iconColor}`} />
                                {quality}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium transition-all mb-4">
                        {pro.bio}
                      </p>

                      {/* AI Tailored Matching Reason */}
                      {aiResults && aiResults[String(pro.id)]?.reason && (
                        <div className="mt-3 p-3 bg-blue-50/40 rounded-2xl border border-blue-100/45 flex items-start gap-2 max-w-full">
                          <Sparkles className="w-3.5 h-3.5 text-brand-blue mt-0.5 flex-shrink-0 animate-pulse" />
                          <p className="text-xs text-blue-900 font-medium italic leading-relaxed">
                            "{aiResults[String(pro.id)].reason}"
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-50/80 space-y-3.5">
                      {/* Languages Row */}
                      {pro.languages && Array.isArray(pro.languages) && pro.languages.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="flex items-center gap-1 mr-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>Languages:</span>
                          </div>
                          {pro.languages.map(lang => (
                            <span key={lang} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-semibold border border-slate-100/60 transition-colors hover:bg-slate-100/50">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Location Row */}
                      <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest min-w-0 flex-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                          <span className="truncate font-medium text-slate-500 normal-case">
                            {pro.location || "Valencia, Spain"}
                          </span>
                        </div>

                        {userLocation && pro.coordinates && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50/70 border border-rose-100 text-rose-600 rounded-full text-[10px] font-semibold shrink-0 shadow-[0_1px_2px_rgba(244,63,94,0.02)] select-none">
                            <span>{getDistance(userLocation.lat, userLocation.lng, pro.coordinates.lat, pro.coordinates.lng)} km</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action to navigate to the full directory */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => onNavigate('explore', { searchQuery: search })}
                className="px-6 py-3 bg-brand-navy hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>View all in directory</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
