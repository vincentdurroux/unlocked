import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  X, 
  Star, 
  Calendar, 
  MapPin, 
  BookOpen, 
  User, 
  Compass, 
  Briefcase, 
  ChevronRight, 
  ChevronDown,
  Clock, 
  AlertCircle,
  Loader2,
  Stethoscope,
  Wrench,
  PartyPopper,
  FileCheck2,
  Home as HomeIcon,
  MessageSquareHeart,
  MessageSquare,
  Send,
  RotateCcw,
  Award
} from 'lucide-react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  detectTargetZone,
  calculateDistanceKm,
  sortProfessionalsByProximityAndRating,
  DEFAULT_VALENCIA_CENTER,
  Coordinates,
  buildOptimizedPlacesQuery,
  isTradeMismatched,
  isActivityQuery
} from '../lib/locationUtils';

interface Professional {
  id: string;
  name: string;
  company_name?: string;
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
  distanceKm?: number | null;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  category: string;
  image: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  is_highlighted?: boolean;
}

interface AISearchMatch {
  id: string;
  score: number;
  reason: string;
}

interface AISearchResponse {
  jane_message: string;
  matched_topics: string[];
  pros: AISearchMatch[];
  events: AISearchMatch[];
  guides: AISearchMatch[];
  google_places_pros?: Professional[];
  target_zone?: {
    zoneName: string;
    centerCoords: Coordinates;
    isSpecificZone: boolean;
  };
  is_new_topic?: boolean;
  effective_search_query?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'jane';
  text: string;
}

interface LandingJaneAISearchProps {
  allPros: Professional[];
  events: Event[];
  allArticles: any[];
  userLocation?: { lat: number; lng: number } | null;
  onSelectPro: (pro: Professional) => void;
  onSelectEvent: (event: Event) => void;
  onSelectArticle: (article: any) => void;
  onNavigate: (view: any, params?: any) => void;
}

const QUICK_INSPIRATIONS = [
  {
    icon: Stethoscope,
    label: "English doctor or pediatrician",
    query: "English speaking doctor or pediatrician in Valencia",
    color: "bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/70"
  },
  {
    icon: PartyPopper,
    label: "Things to do this weekend",
    query: "Fun family events, concerts and activities in Valencia this week",
    color: "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100/70"
  },
  {
    icon: FileCheck2,
    label: "NIE & Residency steps",
    query: "How to get NIE number or legal residency in Valencia",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70"
  },
  {
    icon: Wrench,
    label: "Handyman or Plumber",
    query: "Emergency plumber or handyman in Valencia",
    color: "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100/70"
  },
  {
    icon: HomeIcon,
    label: "Neighborhoods & Renting",
    query: "Best neighborhood to live in Valencia and rent advice",
    color: "bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/70"
  }
];

export const isCommunityPro = (p: any) => {
  if (!p) return false;
  return p.source !== 'google' && p.source !== 'google_places' && p.is_community_recommended !== false;
};

export const LandingJaneAISearch: React.FC<LandingJaneAISearchProps> = ({
  allPros,
  events,
  allArticles,
  userLocation,
  onSelectPro,
  onSelectEvent,
  onSelectArticle,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResult, setSearchResult] = useState<AISearchResponse | null>(null);
  const [googlePlacesPros, setGooglePlacesPros] = useState<Professional[]>([]);
  const [selectedTopicTab, setSelectedTopicTab] = useState<'all' | 'pros' | 'events' | 'guides'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Conversational thread state
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  const detectLanguage = (text: string): 'en' | 'fr' | 'es' => {
    if (!text) return 'en';
    const lower = text.toLowerCase();
    if (/\b(hola|por favor|busco|donde|está|gracias|plomero|dentista|osteopata|actividades|cosas|que hacer|barrio|español|españa)\b/.test(lower)) {
      return 'es';
    }
    if (/\b(bonjour|cherche|trouve|où|est|merci|plombier|dentiste|ostéopathe|activités|choses|faire|quartier|cabinet|médecin|français|france)\b/.test(lower)) {
      return 'fr';
    }
    return 'en';
  };

  const activeLang = detectLanguage(activeQuery || query || (conversation[0]?.text ?? ''));

  const t = {
    en: {
      janeChat: "Jane's chat",
      matched: "Matched",
      resultsFound: "results found in Valencia",
      newSearch: "New search",
      refining: "Jane is refining search results...",
      typePlaceholder: "Type here...",
      askBtn: "Ask",
      tabAll: "All Matches",
      tabPros: "Pros",
      tabEvents: "Events",
      tabGuides: "Guides",
    },
    fr: {
      janeChat: "Discussion avec Jane",
      matched: "Résultat",
      resultsFound: "résultats trouvés à Valencia",
      newSearch: "Nouvelle recherche",
      refining: "Jane affine les résultats...",
      typePlaceholder: "Posez votre question...",
      askBtn: "Envoyer",
      tabAll: "Tous",
      tabPros: "Professionnels",
      tabEvents: "Événements",
      tabGuides: "Guides",
    },
    es: {
      janeChat: "Chat de Jane",
      matched: "Coincidencia",
      resultsFound: "resultados encontrados en Valencia",
      newSearch: "Nueva búsqueda",
      refining: "Jane está refinando los resultados...",
      typePlaceholder: "Escribe aquí...",
      askBtn: "Preguntar",
      tabAll: "Todos",
      tabPros: "Profesionales",
      tabEvents: "Eventos",
      tabGuides: "Guías",
    }
  }[activeLang];

  // Ref to automatically scroll and center on the discussion / latest received message
  const discussionRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);

  // Topic expansion state (max 2 by default, unveiled via arrow)
  const [showAllPros, setShowAllPros] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllGuides, setShowAllGuides] = useState(false);

  // Smooth scroll and center on the latest received response
  useEffect(() => {
    if (hasSearched && !isSearching && !isFollowUpLoading && searchResult) {
      const timer = setTimeout(() => {
        if (latestMessageRef.current) {
          latestMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (discussionRef.current) {
          discussionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [hasSearched, isSearching, isFollowUpLoading, searchResult, conversation.length]);

  const getBriefData = () => {
    const combined = [...allPros, ...googlePlacesPros];
    const map = new Map<string, any>();
    combined.forEach((p: any) => map.set(String(p.id), p));
    const uniquePros = Array.from(map.values());

    const proListBrief = uniquePros.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      company_name: p.company_name || "",
      category: p.category || p.profession || "",
      categories: p.categories || [],
      bio: (p.bio || p.description || "").slice(0, 180),
      top_qualities: p.top_qualities || [],
      languages: p.languages || [],
      rating: p.rating || 0,
      location: p.location || "",
      coordinates: p.coordinates || null,
      is_community_recommended: isCommunityPro(p),
      source: p.source || 'community'
    }));

    const eventsBrief = events.map((e: any) => ({
      id: String(e.id),
      title: e.title,
      category: e.category || "",
      start_date: e.start_date || e.date || "",
      end_date: e.end_date || "",
      start_time: e.start_time || e.time || "",
      location: e.location || "",
      description: (e.description || "").slice(0, 180)
    }));

    const guidesBrief = allArticles.map((g: any) => ({
      id: String(g.id),
      title: g.title,
      categoryTitle: g.categoryTitle || g.category_title || "",
      excerpt: (g.excerpt || g.description || "").slice(0, 180),
      author: g.author?.businessName || g.author?.name || ""
    }));

    return { proListBrief, eventsBrief, guidesBrief };
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q) return;

    if (overrideQuery !== undefined) {
      setQuery(overrideQuery);
    }

    setIsSearching(true);
    setErrorMessage(null);
    setShowAllPros(false);
    setShowAllEvents(false);
    setShowAllGuides(false);
    setFollowUpQuery('');

    const { proListBrief, eventsBrief, guidesBrief } = getBriefData();

    let success = false;
    let data: AISearchResponse | null = null;

    const isVercelHost = typeof window !== 'undefined' && (
      window.location.hostname.includes("vercel.app") || 
      window.location.hostname.includes("vercel") ||
      (!window.location.hostname.includes("run.app") && 
       !window.location.hostname.includes("aistudio") && 
       window.location.hostname !== "localhost" && 
       window.location.hostname !== "127.0.0.1")
    );

    if (!isVercelHost) {
      try {
        const response = await fetch("/api/ai-multi-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            professionals: proListBrief,
            events: eventsBrief,
            guides: guidesBrief,
            conversationHistory: [],
            userLocation: userLocation || null
          }),
        });

        if (response.ok) {
          data = await response.json();
          success = true;
        } else if (response.status === 429) {
          throw new Error("Jane is not available at the moment. Please use manual search in the pages");
        }
      } catch (err: any) {
        console.warn("Server AI multi-search failed, attempting client fallback:", err);
      }
    }

    // Client-side fallback if server fails
    if (!success) {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error("The server AI search service is busy or unavailable (Error 404). To use client-side AI search on static hosts (e.g., Vercel), please configure the VITE_GEMINI_API_KEY environment variable in your Vercel project settings.");
        }

        const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
        let clientGooglePlacesPros: any[] = [];

        if (googleMapsKey) {
          try {
            const targetZone = detectTargetZone(q, userLocation);
            const centerLat = targetZone.centerCoords.lat;
            const centerLng = targetZone.centerCoords.lng;

            const normalizedQuery = q.toLowerCase();
            const isProximity = normalizedQuery.includes('autour') || 
                                normalizedQuery.includes('proche') || 
                                normalizedQuery.includes('near') || 
                                normalizedQuery.includes('around') || 
                                normalizedQuery.includes('close to') || 
                                normalizedQuery.includes('moi') || 
                                normalizedQuery.includes('me') || 
                                normalizedQuery.includes('ici');

            const textQuery = buildOptimizedPlacesQuery(
              q,
              targetZone.isSpecificZone,
              targetZone.zoneName,
              !!userLocation
            );

            const requestBody: any = {
              textQuery,
              maxResultCount: 20,
              languageCode: "en"
            };

            const biasRadius = targetZone.isSpecificZone ? 5000.0 : (userLocation ? 5000.0 : 25000.0);

            requestBody.locationBias = {
              circle: {
                center: { latitude: centerLat, longitude: centerLng },
                radius: biasRadius
              }
            };

            const gpResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": googleMapsKey,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.photos,places.location"
              },
              body: JSON.stringify(requestBody)
            });

            if (gpResponse.ok) {
              const gpData = await gpResponse.json();
              const places = gpData.places || [];
              const mappedPlaces = places
                .map((place: any, idx: number) => {
                  let photoUrl = "";
                  if (place.photos && place.photos.length > 0) {
                    photoUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${googleMapsKey}`;
                  }

                  const cleanAddress = (place.formattedAddress || "Valencia, Spain").replace(', Spain', '').replace(', Espagne', '');

                  let coords = {
                    lat: centerLat + ((idx * 0.005) % 0.02) - 0.01,
                    lng: centerLng + ((idx * 0.005) % 0.02) - 0.01
                  };

                  if (place.location && typeof place.location.latitude === 'number' && typeof place.location.longitude === 'number') {
                    coords = {
                      lat: place.location.latitude,
                      lng: place.location.longitude
                    };
                  }

                  const dist = calculateDistanceKm(centerLat, centerLng, coords.lat, coords.lng);

                  return {
                    id: `google_${place.id}`,
                    name: place.displayName?.text || "Professional",
                    company_name: place.displayName?.text || "",
                    category: place.primaryTypeDisplayName?.text || "Professional",
                    bio: `${place.displayName?.text || 'Professional'}. ${cleanAddress ? 'Adresse : ' + cleanAddress : ''}`,
                    location: cleanAddress,
                    coordinates: coords,
                    distanceKm: dist,
                    rating: typeof place.rating === 'number' ? place.rating : 0,
                    reviews_count: place.userRatingCount || 0,
                    phone: place.nationalPhoneNumber || "",
                    website: place.websiteUri || "",
                    googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((place.displayName?.text || '') + ' Valencia')}`,
                    image: photoUrl,
                    source: 'google_places',
                    is_community_recommended: false
                  };
                })
                .filter((place: any) => !isTradeMismatched(q, place.name, place.category));

              // Strictly sort Google Places by closest distance first, max 6
              mappedPlaces.sort((a: any, b: any) => {
                const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
                const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
                return distA - distB;
              });

              clientGooglePlacesPros = mappedPlaces.slice(0, 6);
            }
          } catch (gpErr) {
            console.warn("Client-side fallback Google Places fetch failed:", gpErr);
          }
        }

        const googleProsBrief = clientGooglePlacesPros.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          company_name: p.company_name || "",
          category: p.category || "Professional",
          categories: [p.category || "Professional"],
          bio: p.bio || "",
          top_qualities: [],
          languages: [],
          rating: p.rating || 0,
          location: p.location || "Valencia",
          distanceKm: p.distanceKm || null,
          website: p.website || "",
          googleMapsUri: p.googleMapsUri || "",
          is_community_recommended: false,
          source: 'google_places'
        }));

        const allCandidatePros = [...proListBrief, ...googleProsBrief].filter((p: any) =>
          !isTradeMismatched(q, p.name, p.category)
        );

        const ai = new GoogleGenAI({ apiKey });
        const sysInstruction = `You are Jane, the friendly and intelligent AI assistant for "Unlocked" in Valencia.
Match items selectively across pros, events, and guides for the user query.
Rules:
- STRICT TRADE COHERENCE: Match ONLY professionals whose specialty directly corresponds to the requested service. (e.g. if searching for an osteopath, NEVER match dentists, doctors, or lawyers).
- GEOGRAPHIC PROXIMITY IS KING & SPOKEN LANGUAGES: Distance and location are paramount. Professionals located far away (> 25 km from the target area) MUST NOT be selected, prioritized, or returned, regardless of what language they speak! Spoken language must NEVER override distance or pull distant professionals into results. Simply asking in French or another language does NOT restrict or filter results by language. ONLY when the user explicitly specifies a language requirement (e.g. "francophone", "parlant français", "en français", "french speaking", "anglophone", "English", "Spanish", "Español"), prioritize local pros within 25 km who speak that language.
- ACTIVITÉS & CHOSES À FAIRE (THINGS TO DO, LEISURE, SPORTS, ENTERTAINMENT):
  * When the user searches for activities ("choses à faire", "activités", "que faire", "sorties", "loisirs", "things to do", "sports", or "entertainment"):
    - PRIORITY ORDER: PROPOSE EVENTS FIRST! In "matched_topics", place "events" first if there are matching events (e.g. ["events", "pros", "guides"]).
    - IN "jane_message": Present upcoming community events, festivals, concerts, cultural activities and meetups FIRST in your message, followed by recommended entertainment, sports, and leisure professionals, and discovery guides.
    - IN "pros": Broadly DIVERSIFY suggestions across premium leisure options while maintaining strict coherence! Propose relevant professionals in:
      * Entertainment & Culture: Live music, stand-up comedy clubs, escape rooms, theaters, flamenco shows, art galleries, museums.
      * Sports, Water & Outdoor: Paddle surf (SUP), kayak/boat rentals, sailing excursions, bike & electric scooter rentals, hiking guides, golf, tennis/padel clubs, surfing/diving.
      * Wellness & Mind: Spas, thermal baths, yoga & pilates studios, meditation centers.
      * Gastronomy & Creativity: Paella cooking classes, pottery/ceramics workshops, wine tasting courses, walking food tours, salsa/bachata dance classes.
      * Event, Services & Outing Prep: Professional vacation photographers & videographers (to capture moments, portraits), private chefs & home catering, private drivers & chauffeurs, local tour guides, massage therapists, beauty therapists, and nail artists (pre-outing pampering).
      - STRICT COHERENCE RULE: NEVER match dentists, general doctors, pediatricians, lawyers, accountants, realtors, or plumbers for activity queries. Unrelated professional categories MUST receive score 0 and be omitted from "pros"!
    - DO NOT limit suggestions only to children/kids activities unless explicitly requested!
- Include a category in "matched_topics" if there are relevant items.
- Score 0-100, only return items with score >= 40.
- Proactively match events that relate to community, expats, socializing, learning local culture (like tapas or wine), networking, beach, or local activities.
- Return a warm, concise jane_message in the user's query language. If no community pros exist for this specific trade, be honest and present the closest verified pros found.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `Query: "${q}"\nPros: ${JSON.stringify(allCandidatePros)}\nEvents: ${JSON.stringify(eventsBrief.slice(0, 20))}\nGuides: ${JSON.stringify(guidesBrief.slice(0, 20))}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                jane_message: { type: Type.STRING },
                matched_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                pros: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      score: { type: Type.INTEGER },
                      reason: { type: Type.STRING }
                    },
                    required: ["id", "score", "reason"]
                  }
                },
                events: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      score: { type: Type.INTEGER },
                      reason: { type: Type.STRING }
                    },
                    required: ["id", "score", "reason"]
                  }
                },
                guides: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      score: { type: Type.INTEGER },
                      reason: { type: Type.STRING }
                    },
                    required: ["id", "score", "reason"]
                  }
                }
              },
              required: ["jane_message", "matched_topics", "pros", "events", "guides"]
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
          }
        });

        const parsed = JSON.parse(response.text || "{}");
        const prosResults = (parsed.pros || []).filter((p: any) => (p.score || 0) >= 40);

        const eventsResults = (parsed.events || []).filter((e: any) => (e.score || 0) >= 40);
        const guidesResults = (parsed.guides || []).filter((g: any) => (g.score || 0) >= 40);

        const topics: string[] = [];
        if (prosResults.length > 0) topics.push("pros");
        if (eventsResults.length > 0) topics.push("events");
        if (guidesResults.length > 0) topics.push("guides");

        data = {
          jane_message: parsed.jane_message || "Here is what I found for you in Valencia:",
          matched_topics: topics,
          pros: prosResults,
          events: eventsResults,
          guides: guidesResults,
          google_places_pros: clientGooglePlacesPros
        };
        success = true;
      } catch (clientErr: any) {
        console.error("Client AI search fallback error:", clientErr);
        const errMsg = clientErr.message || JSON.stringify(clientErr) || "";
        const errLower = errMsg.toLowerCase();
        if (
          errLower.includes("quota") ||
          errLower.includes("limit") ||
          errLower.includes("exhausted") ||
          errLower.includes("429") ||
          errLower.includes("too many requests") ||
          errLower.includes("busy") ||
          errLower.includes("rate limit") ||
          errLower.includes("sollicitée")
        ) {
          setErrorMessage("Jane is not available at the moment. Please use manual search in the pages");
        } else {
          setErrorMessage(clientErr.message || "An error occurred during search. Please try again.");
        }
      }
    }

    if (data) {
      setSearchResult(data);
      if (data.google_places_pros && Array.isArray(data.google_places_pros)) {
        setGooglePlacesPros(data.google_places_pros.slice(0, 6));
      }
      setSelectedTopicTab('all');
      setHasSearched(true);
      setActiveQuery(q);
      setConversation([
        { id: '1', role: 'user', text: q },
        { id: '2', role: 'jane', text: data.jane_message }
      ]);
    }
    setIsSearching(false);
  };

  const handleFollowUp = async (customFollowUpText?: string) => {
    const text = (customFollowUpText !== undefined ? customFollowUpText : followUpQuery).trim();
    if (!text || isFollowUpLoading || isSearching) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text
    };

    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setFollowUpQuery('');
    setIsFollowUpLoading(true);
    setErrorMessage(null);

    const { proListBrief, eventsBrief, guidesBrief } = getBriefData();

    const historyForApi = updatedConversation.map(m => ({
      role: m.role === 'jane' ? 'assistant' : 'user',
      content: m.text
    }));

    let success = false;
    let data: AISearchResponse | null = null;

    const isVercelHost = typeof window !== 'undefined' && (
      window.location.hostname.includes("vercel.app") || 
      window.location.hostname.includes("vercel") ||
      (!window.location.hostname.includes("run.app") && 
       !window.location.hostname.includes("aistudio") && 
       window.location.hostname !== "localhost" && 
       window.location.hostname !== "127.0.0.1")
    );

    if (!isVercelHost) {
      try {
        const response = await fetch("/api/ai-multi-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: text,
            professionals: proListBrief,
            googlePlacesPros: googlePlacesPros,
            events: eventsBrief,
            guides: guidesBrief,
            conversationHistory: historyForApi,
            userLocation: userLocation || null
          }),
        });

        if (response.ok) {
          data = await response.json();
          success = true;
        } else if (response.status === 429) {
          throw new Error("Jane is not available at the moment. Please use manual search in the pages");
        }
      } catch (err: any) {
        console.warn("Server AI follow-up search failed, fallback:", err);
      }
    }

    if (!success) {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

          // 1. Analyze topic transition vs follow-up continuation
          let placesSearchQuery = text;
          let isNewTopic = false;
          if (Array.isArray(historyForApi) && historyForApi.length > 0) {
            try {
              const historyFormattedForClassification = historyForApi
                .map(m => `${(m.role === 'user' || m.role === 'User') ? 'User' : 'Jane'}: ${m.content}`)
                .join('\n');

              const topicAnalysis = await ai.models.generateContent({
                model: "gemini-3.1-flash-lite",
                contents: `Analyze this search conversation thread for local services in Valencia, Spain.
Determine whether the user is:
1. CONTINUING & REFINING the existing discussion (is_new_topic: false)
2. STARTING A NEW DISCUSSION / SWITCHING TOPIC (is_new_topic: true)

Conversation History:
${historyFormattedForClassification}

Latest User Message:
"${text}"

Rules:
- is_new_topic: true if user is asking for a different service, profession, activity, or unrelated request.
- is_new_topic: false if user is refining, filtering, clarifying, or asking questions about the existing topic/service.
- effective_search_query:
  * If is_new_topic is true: Extract ONLY the new trade/service/activity + location (2-5 words max, e.g. "plombier", "restaurant paella", "concert jazz"). DO NOT keep keywords from the old topic!
  * If is_new_topic is false: Synthesize the current trade with the new refinement/filter (e.g. "dentiste francophone", "ostéopathe Ruzafa").
- DO NOT append city/neighborhood name unless explicitly typed.`,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      is_new_topic: { type: Type.BOOLEAN },
                      effective_search_query: { type: Type.STRING }
                    },
                    required: ["is_new_topic", "effective_search_query"]
                  },
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
                }
              });

              const parsedAnalysis = JSON.parse(topicAnalysis.text || "{}");
              isNewTopic = Boolean(parsedAnalysis.is_new_topic);
              if (parsedAnalysis.effective_search_query && parsedAnalysis.effective_search_query.trim().length >= 2) {
                placesSearchQuery = parsedAnalysis.effective_search_query.trim();
              }
            } catch (err) {
              console.warn("Client fallback topic detection error:", err);
            }
          }

          let clientGooglePlacesPros: any[] = isNewTopic ? [] : [...googlePlacesPros];
          let isProximityGlobal = false;

          if (googleMapsKey) {
            try {
              // Extract target zone and query based on follow-up and history
              const targetZone = detectTargetZone(placesSearchQuery, userLocation);
              const centerLat = targetZone.centerCoords.lat;
              const centerLng = targetZone.centerCoords.lng;

              const normalizedQuery = placesSearchQuery.toLowerCase();
              const isProximity = normalizedQuery.includes('autour') || 
                                  normalizedQuery.includes('proche') || 
                                  normalizedQuery.includes('near') || 
                                  normalizedQuery.includes('around') || 
                                  normalizedQuery.includes('close to') || 
                                  normalizedQuery.includes('moi') || 
                                  normalizedQuery.includes('me') || 
                                  normalizedQuery.includes('ici');

              if (isProximity) {
                isProximityGlobal = true;
              }

              let cleanQuery = placesSearchQuery;
              if (isProximity) {
                cleanQuery = placesSearchQuery
                  .replace(/autour de moi/gi, '')
                  .replace(/proche de moi/gi, '')
                  .replace(/autour/gi, '')
                  .replace(/proche/gi, '')
                  .replace(/near me/gi, '')
                  .replace(/around me/gi, '')
                  .replace(/close to me/gi, '')
                  .replace(/\bde\b/gi, '')
                  .trim();
                if (!cleanQuery) cleanQuery = placesSearchQuery;
              }

              const textQuery = targetZone.isSpecificZone
                ? `${cleanQuery} ${targetZone.zoneName} Valencia Spain`
                : (userLocation ? cleanQuery : `${cleanQuery} in Valencia Spain`);

              const requestBody: any = {
                textQuery,
                maxResultCount: 20,
                languageCode: "en"
              };

              const biasRadius = targetZone.isSpecificZone ? 5000.0 : (userLocation ? 5000.0 : 25000.0);

              requestBody.locationBias = {
                circle: {
                  center: { latitude: centerLat, longitude: centerLng },
                  radius: biasRadius
                }
              };

              const gpResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-Api-Key": googleMapsKey,
                  "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.photos,places.location"
                },
                body: JSON.stringify(requestBody)
              });

              if (gpResponse.ok) {
                const gpData = await gpResponse.json();
                const places = gpData.places || [];
                const newlyFetched = places
                  .map((place: any, idx: number) => {
                    let photoUrl = "";
                    if (place.photos && place.photos.length > 0) {
                      photoUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${googleMapsKey}`;
                    }

                    const cleanAddress = (place.formattedAddress || "Valencia, Spain").replace(', Spain', '').replace(', Espagne', '');

                    let coords = {
                      lat: centerLat + ((idx * 0.005) % 0.02) - 0.01,
                      lng: centerLng + ((idx * 0.005) % 0.02) - 0.01
                    };

                    if (place.location && typeof place.location.latitude === 'number' && typeof place.location.longitude === 'number') {
                      coords = {
                        lat: place.location.latitude,
                        lng: place.location.longitude
                      };
                    }

                    const dist = calculateDistanceKm(centerLat, centerLng, coords.lat, coords.lng);

                    return {
                      id: `google_${place.id}`,
                      name: place.displayName?.text || "Professional",
                      company_name: place.displayName?.text || "",
                      category: place.primaryTypeDisplayName?.text || "Professional",
                      bio: `${place.displayName?.text || 'Professional'}. ${cleanAddress ? 'Adresse : ' + cleanAddress : ''}`,
                      location: cleanAddress,
                      coordinates: coords,
                      distanceKm: dist,
                      rating: typeof place.rating === 'number' ? place.rating : 0,
                      reviews_count: place.userRatingCount || 0,
                      phone: place.nationalPhoneNumber || "",
                      website: place.websiteUri || "",
                      googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((place.displayName?.text || '') + ' Valencia')}`,
                      image: photoUrl,
                      source: 'google_places',
                      is_community_recommended: false
                    };
                  })
                  .filter((place: any) => !isTradeMismatched(placesSearchQuery, place.name, place.category));

                // Merge and sort strictly by distance to center
                const mergedMap = new Map<string, any>();
                clientGooglePlacesPros.forEach(p => mergedMap.set(String(p.id), p));
                newlyFetched.forEach(p => mergedMap.set(String(p.id), p));
                const allPlaces = Array.from(mergedMap.values()).filter((p: any) =>
                  !isTradeMismatched(placesSearchQuery, p.name, p.category)
                );
                allPlaces.sort((a: any, b: any) => {
                  const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
                  const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
                  return distA - distB;
                });
                clientGooglePlacesPros = allPlaces.slice(0, 6);
              }
            } catch (gpErr) {
              console.warn("Client-side follow-up Google Places fetch failed:", gpErr);
            }
          }

          const googleProsBrief = clientGooglePlacesPros.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            company_name: p.company_name || "",
            category: p.category || "Professional",
            categories: [p.category || "Professional"],
            bio: p.bio || "",
            top_qualities: [],
            languages: [],
            rating: p.rating || 0,
            location: p.location || "Valencia",
            distanceKm: p.distanceKm || null,
            website: p.website || "",
            googleMapsUri: p.googleMapsUri || "",
            is_community_recommended: false,
            source: 'google_places'
          }));

          // Sort candidate pros prioritizing proximity
          const allCandidatePros = [...proListBrief, ...googleProsBrief].filter((p: any) =>
            !isTradeMismatched(placesSearchQuery, p.name, p.category)
          );

          allCandidatePros.sort((a: any, b: any) => {
            const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
            const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
            return distA - distB;
          });

          const filteredCandidatePros = (isProximityGlobal && userLocation)
            ? allCandidatePros.filter(p => (p as any).distanceKm !== null && (p as any).distanceKm <= 4.5)
            : allCandidatePros;

          const historyFormatted = historyForApi.map(m => `${m.role === 'user' ? 'User' : 'Jane'}: ${m.content}`).join('\n');
          const sysInstruction = `You are Jane, the friendly and intelligent AI assistant for "Unlocked" in Valencia.
${isNewTopic ? `The user has switched to a NEW SEARCH TOPIC for: "${placesSearchQuery}". Completely reset search context, evaluate new matches and smoothly acknowledge the new search.` : `Continue the ongoing discussion and refine search results for "${placesSearchQuery}".`}

3-TIER RANKING PRIORITY FOR PROFESSIONALS:
1. TIER 1 (Unlocked Community Pros): Prioritize relevant professionals registered in the Unlocked app within the target zone / 25km.
2. TIER 2 (Google Places Pros): When community pros do not cover the requested trade, include Google Places professionals sorted strictly by proximity to the user's GPS location (or requested location). Limit Google Places pros to a maximum of 6.
3. TIER 3 (Distant Pros): Professionals beyond 25km should only be suggested as backup with lower relevance.

GEOGRAPHIC PROXIMITY IS KING & SPOKEN LANGUAGES:
- Distance and location are paramount. Professionals located far away (> 25 km from the target area) MUST NOT be selected or returned, regardless of what language they speak! Spoken language must NEVER override distance. Simply asking in French or another language does NOT restrict or filter results by language.
- ONLY when the user explicitly specifies a language requirement (e.g. "francophone", "parlant français", "en français", "french speaking", "anglophone", "English", "Spanish", "Español"), strictly prioritize local pros within 25 km who speak that language. Community pros matching both trade and language rank highest in Tier 1.

CRITICAL TRADE COHERENCE:
- Match ONLY professionals whose specialty directly corresponds to the requested service.
- If searching for an osteopath, NEVER match dentists, doctors, or lawyers. Mismatched pros get score 0.
- ACTIVITÉS & CHOSES À FAIRE (THINGS TO DO, LEISURE, SPORTS, ENTERTAINMENT):
  * When the user searches for activities ("choses à faire", "activités", "que faire", "sorties", "loisirs", "things to do", "sports", or "entertainment"):
    - PRIORITY ORDER: PROPOSE EVENTS FIRST! In "matched_topics", place "events" first if there are matching events (e.g. ["events", "pros", "guides"]).
    - IN "jane_message": Present upcoming community events, festivals, concerts, cultural activities and meetups FIRST in your message, followed by recommended entertainment, sports, and leisure professionals, and discovery guides.
    - IN "pros": Broadly DIVERSIFY suggestions across premium leisure options while maintaining strict coherence! Propose relevant professionals in:
      * Entertainment & Culture: Live music, stand-up comedy clubs, escape rooms, theaters, flamenco shows, art galleries, museums.
      * Sports, Water & Outdoor: Paddle surf (SUP), kayak/boat rentals, sailing excursions, bike & electric scooter rentals, hiking guides, golf, tennis/padel clubs, surfing/diving.
      * Wellness & Mind: Spas, thermal baths, yoga & pilates studios, meditation centers.
      * Gastronomy & Creativity: Paella cooking classes, pottery/ceramics workshops, wine tasting courses, walking food tours, salsa/bachata dance classes.
      * Event, Services & Outing Prep: Professional vacation photographers & videographers (to capture moments, portraits), private chefs & home catering, private drivers & chauffeurs, local tour guides, massage therapists, beauty therapists, and nail artists (pre-outing pampering).
      - STRICT COHERENCE RULE: NEVER match dentists, general doctors, pediatricians, lawyers, accountants, realtors, or plumbers for activity queries. Unrelated professional categories MUST receive score 0 and be omitted from "pros"!
    - DO NOT limit activity suggestions solely to children or kids playgrounds unless the user explicitly mentions kids ("enfants", "pour les enfants", "kids"). Provide engaging, high-quality activities for adults, couples, friends, and the broader community as well!
- Match relevant pros, events, and guides. Return a warm, helpful response answering their specific query.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `User Follow-Up: "${text}"\n\nHistory:\n${historyFormatted}\n\nPros: ${JSON.stringify(filteredCandidatePros.slice(0, 45))}\nEvents: ${JSON.stringify(eventsBrief.slice(0, 20))}\nGuides: ${JSON.stringify(guidesBrief.slice(0, 20))}`,
            config: {
              systemInstruction: sysInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  jane_message: { type: Type.STRING },
                  matched_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pros: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        reason: { type: Type.STRING }
                      },
                      required: ["id", "score", "reason"]
                    }
                  },
                  events: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        reason: { type: Type.STRING }
                      },
                      required: ["id", "score", "reason"]
                    }
                  },
                  guides: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        reason: { type: Type.STRING }
                      },
                      required: ["id", "score", "reason"]
                    }
                  }
                },
                required: ["jane_message", "matched_topics", "pros", "events", "guides"]
              },
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });

          const parsed = JSON.parse(response.text || "{}");
          const prosResults = (parsed.pros || []).filter((p: any) => (p.score || 0) >= 40);

          const eventsResults = (parsed.events || []).filter((e: any) => (e.score || 0) >= 40);
          const guidesResults = (parsed.guides || []).filter((g: any) => (g.score || 0) >= 40);

          const topics: string[] = [];
          if (prosResults.length > 0) topics.push("pros");
          if (eventsResults.length > 0) topics.push("events");
          if (guidesResults.length > 0) topics.push("guides");

          data = {
            jane_message: parsed.jane_message || "I've updated the matches according to your request:",
            matched_topics: topics,
            pros: prosResults,
            events: eventsResults,
            guides: guidesResults,
            google_places_pros: clientGooglePlacesPros,
            is_new_topic: isNewTopic,
            effective_search_query: placesSearchQuery
          };
          success = true;
        }
      } catch (clientErr: any) {
        console.error("Client follow-up error:", clientErr);
        const errMsg = clientErr.message || JSON.stringify(clientErr) || "";
        const errLower = errMsg.toLowerCase();
        if (
          errLower.includes("quota") ||
          errLower.includes("limit") ||
          errLower.includes("exhausted") ||
          errLower.includes("429") ||
          errLower.includes("too many requests") ||
          errLower.includes("busy") ||
          errLower.includes("rate limit") ||
          errLower.includes("sollicitée")
        ) {
          setErrorMessage("Jane is not available at the moment. Please use manual search in the pages");
        } else {
          setErrorMessage(clientErr.message || "Could not process follow-up. Please try again.");
        }
      }
    }

    if (data) {
      setSearchResult(data);
      if (data.is_new_topic) {
        setGooglePlacesPros(data.google_places_pros || []);
      } else if (data.google_places_pros && Array.isArray(data.google_places_pros)) {
        setGooglePlacesPros(data.google_places_pros.slice(0, 6));
      }
      if (data.effective_search_query) {
        setActiveQuery(data.effective_search_query);
      } else {
        setActiveQuery(text);
      }
      const janeMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'jane',
        text: data.jane_message
      };
      setConversation([...updatedConversation, janeMessage]);
    }
    setIsFollowUpLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    setActiveQuery('');
    setHasSearched(false);
    setSearchResult(null);
    setGooglePlacesPros([]);
    setErrorMessage(null);
    setConversation([]);
    setFollowUpQuery('');
    setSelectedTopicTab('all');
    setShowAllPros(false);
    setShowAllEvents(false);
    setShowAllGuides(false);
  };

  // Combine Unlocked directory pros and dynamically discovered Google Places pros
  const combinedPros = useMemo(() => {
    const map = new Map<string, Professional>();
    allPros.forEach(p => map.set(String(p.id), p));
    googlePlacesPros.forEach(p => {
      if (!map.has(String(p.id))) {
        map.set(String(p.id), p);
      }
    });
    return Array.from(map.values());
  }, [allPros, googlePlacesPros]);

  // Active target zone and center coordinates
  const activeTargetZone = useMemo(() => {
    if (searchResult?.target_zone) {
      return searchResult.target_zone;
    }
    return detectTargetZone(activeQuery || query || '', userLocation);
  }, [searchResult, activeQuery, query, userLocation]);

  // Find full objects and sort via 3-Tier priority system:
  // 1. App recommended pros within 25 km
  // 2. Google Places pros within 25 km (closest distance first, strictly max 6)
  // 3. Other pros (> 25 km)
  const rawMatchedPros = useMemo(() => {
    const currentEffectiveQuery = activeQuery || query || '';
    const list: (Professional & { matchReason: string; matchScore: number })[] = [];
    const addedIds = new Set<string>();

    // 1. First include matching pros from searchResult.pros
    (searchResult?.pros || []).forEach(match => {
      let sc = typeof match.score === 'number' ? match.score : 0;
      if (sc > 0 && sc <= 10) sc = sc * 10;
      if (sc >= 40) {
        const matchIdStr = String(match.id);
        const pro = combinedPros.find(p => 
          String(p.id) === matchIdStr ||
          String(p.id) === `google_${matchIdStr}` ||
          matchIdStr === `google_${String(p.id)}`
        );
        if (pro && !addedIds.has(String(pro.id))) {
          addedIds.add(String(pro.id));
          list.push({ ...pro, matchReason: match.reason, matchScore: sc });
        }
      }
    });

    // 2. Guarantee all valid Google Places pros from searchResult or state are included if not trade-mismatched
    const gpList = (searchResult?.google_places_pros && searchResult.google_places_pros.length > 0)
      ? searchResult.google_places_pros
      : (googlePlacesPros || []);

    gpList.forEach((gp, idx) => {
      const gpId = String(gp.id);
      const isAlreadyInList = addedIds.has(gpId) || 
                              addedIds.has(`google_${gpId}`) || 
                              (gpId.startsWith('google_') && addedIds.has(gpId.replace(/^google_/, '')));
      if (!isAlreadyInList) {
        const fullPro = combinedPros.find(p => 
          String(p.id) === gpId ||
          String(p.id) === `google_${gpId}` ||
          gpId === `google_${String(p.id)}`
        ) || gp;

        if (!isTradeMismatched(currentEffectiveQuery, fullPro.name, fullPro.category)) {
          addedIds.add(gpId);
          list.push({
            ...fullPro,
            matchReason: fullPro.bio || (fullPro.distanceKm !== null ? `Professionnel situé à ${fullPro.distanceKm} km` : `Professionnel à Valence`),
            matchScore: 75 - idx
          });
        }
      }
    });

    return list;
  }, [searchResult, combinedPros, googlePlacesPros, activeQuery, query]);

  const matchedPros = useMemo(() => {
    const centerCoords = activeTargetZone.centerCoords;
    return sortProfessionalsByProximityAndRating(rawMatchedPros, centerCoords, 25);
  }, [rawMatchedPros, activeTargetZone]);

  const matchedEvents = (searchResult?.events || []).map(match => {
    const ev = events.find(e => String(e.id) === String(match.id));
    return ev ? { ...ev, matchReason: match.reason, matchScore: match.score } : null;
  }).filter(Boolean) as (Event & { matchReason: string; matchScore: number })[];

  const matchedGuides = (searchResult?.guides || []).map(match => {
    const art = allArticles.find(a => String(a.id) === String(match.id));
    return art ? { ...art, matchReason: match.reason, matchScore: match.score } : null;
  }).filter(Boolean) as (any & { matchReason: string; matchScore: number })[];

  const hasPros = matchedPros.length > 0;
  const hasEvents = matchedEvents.length > 0;
  const hasGuides = matchedGuides.length > 0;
  const totalResultsCount = matchedPros.length + matchedEvents.length + matchedGuides.length;

  // Display all matched pros up to 6 by default (full list when expanded)
  const displayedPros = showAllPros ? matchedPros : matchedPros.slice(0, 6);
  const displayedEvents = showAllEvents ? matchedEvents : matchedEvents.slice(0, 2);
  const displayedGuides = showAllGuides ? matchedGuides : matchedGuides.slice(0, 2);

  return (
    <div id="jane-ai-search-section" className="relative z-10 -mt-3 md:mt-0 space-y-4">
      {/* Clean & Airy Container with subtle light blue border */}
      <div className="relative overflow-hidden rounded-[28px] bg-white p-5 sm:p-7 md:p-8 border border-blue-200/90 shadow-sm shadow-blue-500/5 transition-all duration-300">

        <div className="relative z-10 space-y-5">
          
          {/* 1. INITIAL SEARCH BAR STATE (Shown when no search has been made yet) */}
          {!hasSearched && (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-brand-navy tracking-tight leading-tight">
                    Looking for something in Valencia? <br className="hidden sm:block" />
                    <span className="text-brand-blue font-bold">Ask Jane anything.</span>
                  </h3>
                </div>
              </div>

              {/* Search Input Box */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="relative"
              >
                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 sm:p-2 bg-white rounded-2xl border border-blue-200 focus-within:border-brand-blue focus-within:ring-3 focus-within:ring-brand-blue/10 shadow-xs transition-all duration-200">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask Jane e.g. English pediatrician, concerts this weekend, NIE help..."
                      disabled={isSearching}
                      className="w-full px-4 pr-8 py-2.5 bg-transparent text-slate-800 text-sm sm:text-base font-normal placeholder:text-slate-400 placeholder:font-normal outline-none"
                    />
                    {query && !isSearching && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold text-xs sm:text-sm tracking-normal shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-brand-yellow fill-brand-yellow" />
                        <span>Ask Jane</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Inspiration Chips */}
              {!isSearching && (
                <div className="space-y-2 pt-0.5">
                  <span className="text-xs font-medium text-slate-400">
                    Popular questions to try:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {QUICK_INSPIRATIONS.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSearch(item.query)}
                          className={`group inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${item.color}`}
                        >
                          <IconComp className="w-3.5 h-3.5 shrink-0 text-current" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loading State Animation */}
              {isSearching && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <Sparkles className="w-6 h-6 text-brand-blue animate-spin" />
                  </div>
                  <div className="space-y-1 max-w-sm px-4">
                    <p className="text-base font-semibold text-brand-navy">Jane is finding matches...</p>
                    <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                      Scanning recommended pros, upcoming events, and practical guides in Valencia.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-rose-700 font-normal">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 2. JANE'S CHAT & RESULTS SECTION (Takes the place of the search bar) */}
        {hasSearched && !isSearching && searchResult && (
          <motion.div 
            ref={discussionRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 scroll-mt-20"
          >
            {/* Jane's Chat Card */}
            <div id="jane-discussion-thread" className="p-4 sm:p-5 md:p-6 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-4">
              
              {/* Header with Jane title & New Search Button */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-blue-200/60 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageSquareHeart className="w-5 h-5" />
                  </div>
                   <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-brand-navy">{t.janeChat}</span>
                      <span className="px-2 py-0.5 rounded-md bg-white text-brand-blue border border-blue-200/80 text-[10px] font-semibold uppercase tracking-wider">
                        {t.matched}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal">
                      {totalResultsCount} {t.resultsFound}
                    </p>
                  </div>
                </div>

                {/* New Search Button (Clears and brings back the search bar) */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-brand-blue border border-blue-200 hover:border-brand-blue text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-brand-blue" />
                  <span>{t.newSearch}</span>
                </button>
              </div>

              {/* Conversational History Thread */}
              <div className="space-y-3 pt-1">
                {conversation.length > 2 ? (
                  // Multi-turn conversational flow
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {conversation.map((msg, index) => {
                      const isLatest = index === conversation.length - 1;
                      return (
                        <div
                          key={msg.id}
                          ref={isLatest ? latestMessageRef : undefined}
                          className={`flex gap-2.5 scroll-mt-24 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'jane' && (
                            <div className="w-6 h-6 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                            </div>
                          )}
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] ${
                              msg.role === 'user'
                                ? 'bg-brand-navy text-white font-medium rounded-tr-xs'
                                : 'bg-white border border-blue-100 text-slate-700 font-normal rounded-tl-xs shadow-2xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Initial search answer view
                  <div className="space-y-2">
                    {conversation.length > 0 && conversation[0]?.role === 'user' && (
                      <div className="flex justify-end">
                        <div className="px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium bg-brand-navy text-white rounded-tr-xs max-w-[85%]">
                          "{conversation[0].text}"
                        </div>
                      </div>
                    )}
                    <div 
                      ref={latestMessageRef}
                      className="flex gap-2.5 items-start scroll-mt-24"
                    >
                      <div className="w-6 h-6 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                      </div>
                      <div className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white border border-blue-100 text-xs sm:text-sm text-slate-700 font-normal leading-relaxed rounded-tl-xs shadow-2xs">
                        {searchResult.jane_message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up loading state */}
                {isFollowUpLoading && (
                  <div className="flex items-center gap-2 text-xs text-brand-blue font-medium bg-white/80 p-2.5 rounded-xl border border-blue-100">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-blue" />
                    <span>{t.refining}</span>
                  </div>
                )}
              </div>

              {/* Follow-up Input Bar (Placed directly below the last discussion bubble) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFollowUp();
                }}
                className="pt-1"
              >
                <div className="relative flex items-center bg-white rounded-xl border border-blue-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 p-1 shadow-2xs transition-all h-10">
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder={t.typePlaceholder}
                    disabled={isFollowUpLoading}
                    className="flex-1 min-w-0 w-full px-3 text-base md:text-sm text-slate-800 placeholder:text-slate-400 font-normal outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    disabled={isFollowUpLoading || !followUpQuery.trim()}
                    className="h-8 px-4 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    {isFollowUpLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>{t.askBtn}</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>

            {/* Filter Tabs (Shown ONLY if results exist) */}
            {totalResultsCount > 0 && (
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedTopicTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedTopicTab === 'all'
                      ? 'bg-brand-navy text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {t.tabAll} ({totalResultsCount})
                </button>

                {hasPros && (
                  <button
                    type="button"
                    onClick={() => setSelectedTopicTab('pros')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedTopicTab === 'pros'
                        ? 'bg-brand-blue text-white shadow-2xs'
                        : 'bg-blue-50 text-brand-blue hover:bg-blue-100/60 border border-blue-200/60'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Pros ({matchedPros.length})</span>
                  </button>
                )}

                {hasEvents && (
                  <button
                    type="button"
                    onClick={() => setSelectedTopicTab('events')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedTopicTab === 'events'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100/60 border border-amber-200/60'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Events ({matchedEvents.length})</span>
                  </button>
                )}

                {hasGuides && (
                  <button
                    type="button"
                    onClick={() => setSelectedTopicTab('guides')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedTopicTab === 'guides'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/60 border border-emerald-200/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Guides ({matchedGuides.length})</span>
                  </button>
                )}
              </div>
            )}

            {/* Zero Results State */}
            {totalResultsCount === 0 && (
              <div className="py-8 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-slate-200/80 p-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Compass className="w-5 h-5 text-brand-blue" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm sm:text-base font-semibold text-slate-800">No exact matches found</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Try phrasing your question differently, or browse through the sections directly:
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => onNavigate('explore')}
                    className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-medium shadow-2xs hover:bg-blue-700 transition-colors"
                  >
                    Browse Pros
                  </button>
                  <button
                    onClick={() => onNavigate('events')}
                    className="px-4 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Explore Events
                  </button>
                  <button
                    onClick={() => onNavigate('guides')}
                    className="px-4 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Read Guides
                  </button>
                </div>
              </div>
            )}

            {/* 1. MATCHED PROS (and/or MATCHED EVENTS, conditionally ordered) */}
            {isActivityQuery(activeQuery) ? (
              <>
                {/* 2. MATCHED EVENTS (Rendered First for Activity Queries) */}
                {hasEvents && (selectedTopicTab === 'all' || selectedTopicTab === 'events') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-brand-navy">
                        Matching Events ({matchedEvents.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {displayedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-14 h-14 rounded-xl bg-amber-50 overflow-hidden shrink-0 border border-amber-200/70 relative">
                              {ev.image ? (
                                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-amber-500">
                                  <Calendar className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-semibold uppercase tracking-wide">
                                  {ev.category || 'Event'}
                                </span>
                                {(ev.start_date || ev.date) && (
                                  <span className="text-xs font-semibold text-amber-700">
                                    {ev.start_date || ev.date}
                                  </span>
                                )}
                              </div>

                              <h5 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1 group-hover:text-amber-700 transition-colors">
                                {ev.title}
                              </h5>

                              <div className="flex items-center gap-2.5 text-xs text-slate-500 font-normal mt-0.5">
                                {ev.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{ev.location}</span>
                                  </span>
                                )}
                                {(ev.start_time || ev.time) && (
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{ev.start_time || ev.time}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {ev.matchReason && (
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-amber-50/40 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 px-4 sm:px-5 rounded-b-2xl">
                              <p className="text-xs text-slate-600 font-normal line-clamp-1 italic flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                "{ev.matchReason}"
                              </p>
                              <span className="text-xs font-medium text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
                                Details →
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Show more arrow button */}
                    {matchedEvents.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllEvents(!showAllEvents)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>{showAllEvents ? 'Show fewer events' : `Show all ${matchedEvents.length} events`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllEvents ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                )}

                {/* 1. MATCHED PROS (Rendered Second for Activity Queries) */}
                {hasPros && (selectedTopicTab === 'all' || selectedTopicTab === 'pros') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-blue text-white flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-brand-navy">
                        Recommended Professionals ({matchedPros.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {displayedPros.map((pro) => {
                        const isCommunity = isCommunityPro(pro);
                        const hasDist = typeof pro.distanceKm === 'number';
                        const isWithin25km = hasDist && (pro.distanceKm as number) <= 25;

                        return (
                          <div
                            key={pro.id}
                            onClick={() => {
                              if (!isCommunity) {
                                const googleUrl = (pro as any).googleMapsUri || (pro.website && pro.website.length > 5 ? pro.website : null) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((pro.company_name || pro.name) + ' ' + (pro.location || 'Valencia'))}`;
                                window.open(googleUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                onSelectPro(pro);
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group ${
                              isCommunity
                                ? 'bg-white border-2 border-emerald-500/80 hover:border-emerald-600 shadow-xs shadow-emerald-500/10 hover:shadow-md'
                                : 'bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div>
                              {/* Unlocked Community Recommendation Badge & Distance Badge */}
                              <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap">
                                {isCommunity ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white font-bold text-[11px] tracking-tight shadow-xs shadow-emerald-500/20">
                                    <Award className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>Recommended by MyCityUnlocked community</span>
                                  </span>
                                ) : null}

                                {hasDist && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isWithin25km 
                                      ? 'bg-blue-50 text-brand-blue border border-blue-200/80' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    <MapPin className="w-3 h-3 text-brand-blue shrink-0" />
                                    <span>{pro.distanceKm} km</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-start gap-3.5">
                                <div className="w-13 h-13 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/70">
                                  {pro.image ? (
                                    <img src={pro.image} alt={pro.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <User className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-brand-blue transition-colors">
                                      {pro.company_name || pro.name}
                                    </h5>
                                    {isCommunity && pro.rating > 0 && (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold shrink-0">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span>{pro.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-xs font-medium text-brand-blue line-clamp-1 mt-0.5">
                                    {pro.category}
                                  </p>

                                  {pro.location && (
                                    <p className="text-xs text-slate-500 font-normal flex items-center gap-1 mt-1 truncate">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{pro.location}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Jane's reasoning */}
                            {pro.matchReason && (
                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-blue-50/40 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 px-4 sm:px-5 rounded-b-2xl">
                                <p className="text-xs text-slate-600 font-normal line-clamp-1 italic flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-brand-yellow shrink-0" />
                                  "{pro.matchReason}"
                                </p>
                                <span className="text-xs font-medium text-brand-blue shrink-0 group-hover:translate-x-0.5 transition-transform">
                                  View →
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Show more arrow button */}
                    {matchedPros.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllPros(!showAllPros)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 text-brand-blue text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>{showAllPros ? 'Show fewer pros' : `Show all ${matchedPros.length} pros`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllPros ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 1. MATCHED PROS (Rendered First for standard Queries) */}
                {hasPros && (selectedTopicTab === 'all' || selectedTopicTab === 'pros') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-blue text-white flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-brand-navy">
                        Recommended Professionals ({matchedPros.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {displayedPros.map((pro) => {
                        const isCommunity = isCommunityPro(pro);
                        const hasDist = typeof pro.distanceKm === 'number';
                        const isWithin25km = hasDist && (pro.distanceKm as number) <= 25;

                        return (
                          <div
                            key={pro.id}
                            onClick={() => {
                              if (!isCommunity) {
                                const googleUrl = (pro as any).googleMapsUri || (pro.website && pro.website.length > 5 ? pro.website : null) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((pro.company_name || pro.name) + ' ' + (pro.location || 'Valencia'))}`;
                                window.open(googleUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                onSelectPro(pro);
                              }
                            }}
                            className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group ${
                              isCommunity
                                ? 'bg-white border-2 border-emerald-500/80 hover:border-emerald-600 shadow-xs shadow-emerald-500/10 hover:shadow-md'
                                : 'bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div>
                              {/* Unlocked Community Recommendation Badge & Distance Badge */}
                              <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap">
                                {isCommunity ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white font-bold text-[11px] tracking-tight shadow-xs shadow-emerald-500/20">
                                    <Award className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>Recommended by MyCityUnlocked community</span>
                                  </span>
                                ) : null}

                                {hasDist && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isWithin25km 
                                      ? 'bg-blue-50 text-brand-blue border border-blue-200/80' 
                                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                    <MapPin className="w-3 h-3 text-brand-blue shrink-0" />
                                    <span>{pro.distanceKm} km</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-start gap-3.5">
                                <div className="w-13 h-13 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/70">
                                  {pro.image ? (
                                    <img src={pro.image} alt={pro.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <User className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-brand-blue transition-colors">
                                      {pro.company_name || pro.name}
                                    </h5>
                                    {isCommunity && pro.rating > 0 && (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold shrink-0">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span>{pro.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-xs font-medium text-brand-blue line-clamp-1 mt-0.5">
                                    {pro.category}
                                  </p>

                                  {pro.location && (
                                    <p className="text-xs text-slate-500 font-normal flex items-center gap-1 mt-1 truncate">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{pro.location}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Jane's reasoning */}
                            {pro.matchReason && (
                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-blue-50/40 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 px-4 sm:px-5 rounded-b-2xl">
                                <p className="text-xs text-slate-600 font-normal line-clamp-1 italic flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-brand-yellow shrink-0" />
                                  "{pro.matchReason}"
                                </p>
                                <span className="text-xs font-medium text-brand-blue shrink-0 group-hover:translate-x-0.5 transition-transform">
                                  View →
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Show more arrow button */}
                    {matchedPros.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllPros(!showAllPros)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 text-brand-blue text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>{showAllPros ? 'Show fewer pros' : `Show all ${matchedPros.length} pros`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllPros ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                )}

                {/* 2. MATCHED EVENTS (Rendered Second for standard Queries) */}
                {hasEvents && (selectedTopicTab === 'all' || selectedTopicTab === 'events') && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-brand-navy">
                        Matching Events ({matchedEvents.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {displayedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-14 h-14 rounded-xl bg-amber-50 overflow-hidden shrink-0 border border-amber-200/70 relative">
                              {ev.image ? (
                                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-amber-500">
                                  <Calendar className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-semibold uppercase tracking-wide">
                                  {ev.category || 'Event'}
                                </span>
                                {(ev.start_date || ev.date) && (
                                  <span className="text-xs font-semibold text-amber-700">
                                    {ev.start_date || ev.date}
                                  </span>
                                )}
                              </div>

                              <h5 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1 group-hover:text-amber-700 transition-colors">
                                {ev.title}
                              </h5>

                              <div className="flex items-center gap-2.5 text-xs text-slate-500 font-normal mt-0.5">
                                {ev.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{ev.location}</span>
                                  </span>
                                )}
                                {(ev.start_time || ev.time) && (
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{ev.start_time || ev.time}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {ev.matchReason && (
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-amber-50/40 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 px-4 sm:px-5 rounded-b-2xl">
                              <p className="text-xs text-slate-600 font-normal line-clamp-1 italic flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                "{ev.matchReason}"
                              </p>
                              <span className="text-xs font-medium text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
                                Details →
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Show more arrow button */}
                    {matchedEvents.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setShowAllEvents(!showAllEvents)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>{showAllEvents ? 'Show fewer events' : `Show all ${matchedEvents.length} events`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllEvents ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 3. MATCHED GUIDES */}
            {hasGuides && (selectedTopicTab === 'all' || selectedTopicTab === 'guides') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-brand-navy">
                    Practical Guides ({matchedGuides.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {displayedGuides.map((guide) => (
                    <div
                      key={guide.id}
                      onClick={() => onSelectArticle(guide)}
                      className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400/80 hover:shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold uppercase tracking-wide">
                            {guide.categoryTitle || 'Guide'}
                          </span>
                          {guide.author?.businessName && (
                            <span className="text-xs font-normal text-slate-400 truncate">
                              By {guide.author.businessName}
                            </span>
                          )}
                        </div>

                        <h5 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {guide.title}
                        </h5>

                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                          {guide.excerpt || guide.description}
                        </p>
                      </div>

                      {guide.matchReason && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-emerald-50/40 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 px-4 sm:px-5 rounded-b-2xl">
                          <p className="text-xs text-slate-600 font-normal line-clamp-1 italic flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                            "{guide.matchReason}"
                          </p>
                          <span className="text-xs font-medium text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
                            Read →
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Show more arrow button */}
                {matchedGuides.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllGuides(!showAllGuides)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <span>{showAllGuides ? 'Show fewer guides' : `Show all ${matchedGuides.length} guides`}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllGuides ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

