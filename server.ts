import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Resend } from "resend";
import dotenv from "dotenv";
import {
  detectTargetZone,
  calculateDistanceKm,
  sortProfessionalsByProximityAndRating,
  DEFAULT_VALENCIA_CENTER,
  Coordinates,
  buildOptimizedPlacesQuery,
  isTradeMismatched,
  isActivityQuery
} from "./src/lib/locationUtils";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Lazily initialize Gemini to prevent the server from crashing on boot if the API key is missing
  let aiClient: GoogleGenAI | null = null;
  const getAiClient = (): GoogleGenAI => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("La clé d'API Google Gemini est manquante. Veuillez la configurer dans l'onglet des Paramètres.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  // Lazily initialize Resend to prevent the server from crashing on boot if the API key is missing
  let resendInstance: Resend | null = null;
  const getResendInstance = (): Resend => {
    if (!resendInstance) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error("La clé d'API Resend est manquante. Veuillez configurer la variable d'environnement RESEND_API_KEY.");
      }
      resendInstance = new Resend(apiKey);
    }
    return resendInstance;
  };

  // Helper to fetch places from Google Places API (New) centered on target zone/user location
  async function fetchGooglePlaces(
    query: string,
    maxResults: number = 6,
    userLocationCoords?: Coordinates | null
  ): Promise<{ places: any[]; targetZone: ReturnType<typeof detectTargetZone> }> {
    const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GEMINI_API_KEY;
    const targetZone = detectTargetZone(query, userLocationCoords);

    if (!apiKey || !query.trim()) return { places: [], targetZone };

    const centerCoords = targetZone.isSpecificZone
      ? targetZone.centerCoords
      : (userLocationCoords || DEFAULT_VALENCIA_CENTER);

    const centerLat = centerCoords.lat;
    const centerLng = centerCoords.lng;

    try {
      // Build optimized query targeted for Google Places Spain
      const textQuery = buildOptimizedPlacesQuery(
        query,
        targetZone.isSpecificZone,
        targetZone.zoneName,
        !!userLocationCoords
      );

      const requestBody: any = {
        textQuery,
        maxResultCount: 20, // Request wider pool to pick the closest 6 genuine matches
        languageCode: "en"
      };

      const biasRadius = targetZone.isSpecificZone ? 5000.0 : (userLocationCoords ? 5000.0 : 25000.0);

      requestBody.locationBias = {
        circle: {
          center: { latitude: centerLat, longitude: centerLng },
          radius: biasRadius
        }
      };

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.photos,places.location"
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const places = data.places || [];

        const formatted = places
          .map((place: any, idx: number) => {
            let photoUrl = "";
            if (place.photos && place.photos.length > 0) {
              photoUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}`;
            }

            const cleanAddress = (place.formattedAddress || "Valencia, Spain").replace(', Spain', '').replace(', Espagne', '');

            let coords: Coordinates = {
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
          // Strict trade filter: discard cross-specialty pollution (e.g. dental clinic when searching for osteopath)
          .filter((p: any) => !isTradeMismatched(query, p.name, p.category));

        // Strictly sort by closest distance to user GPS (or specific requested zone)
        // No priority for ratings or review counts, and never more than 6 pros!
        formatted.sort((a: any, b: any) => {
          const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
          const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
          return distA - distB;
        });

        return { places: formatted.slice(0, Math.min(maxResults, 6)), targetZone };
      }
    } catch (err) {
      console.warn("[Google Places API] Direct search failed, attempting AI grounding fallback:", err);
    }

    // AI Grounding fallback if Places API key is restricted or fails
    try {
      const fallbackResponse = await getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Find up to ${maxResults} real local businesses or professionals in ${targetZone.zoneName}, Valencia, Spain matching: "${query}".
Return real establishments with accurate names, addresses, and accurate latitude/longitude near ${targetZone.zoneName} (around lat ${centerLat}, lng ${centerLng}).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviews_count: { type: Type.INTEGER },
                location: { type: Type.STRING },
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                bio: { type: Type.STRING },
                website: { type: Type.STRING },
                phone: { type: Type.STRING }
              },
              required: ["name", "category", "rating", "location"]
            }
          }
        }
      });

      const parsed = JSON.parse(fallbackResponse.text || "[]");

      const formatted = parsed.map((item: any, idx: number) => {
        const lat = typeof item.latitude === 'number' && item.latitude > 38 && item.latitude < 41
          ? item.latitude
          : centerLat + ((idx * 0.005) % 0.02) - 0.01;
        const lng = typeof item.longitude === 'number' && item.longitude < 0 && item.longitude > -1
          ? item.longitude
          : centerLng + ((idx * 0.005) % 0.02) - 0.01;

        const dist = calculateDistanceKm(centerLat, centerLng, lat, lng);

        return {
          id: `google_ai_${idx}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: item.name,
          company_name: item.name,
          category: item.category || "Professional",
          bio: item.bio || `${item.name} à Valencia (${item.location || targetZone.zoneName}).`,
          location: item.location || targetZone.zoneName,
          coordinates: { lat, lng },
          distanceKm: dist,
          rating: item.rating || 4.5,
          reviews_count: item.reviews_count || 45,
          phone: item.phone || "",
          website: item.website || "",
          image: "",
          source: 'google_places',
          is_community_recommended: false
        };
      });

      // Strictly sort by closest distance first, max 6
      formatted.sort((a: any, b: any) => {
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
        return distA - distB;
      });
      return { places: formatted.slice(0, Math.min(maxResults, 6)), targetZone };
    } catch (fallbackErr) {
      console.error("[Google Places Fallback] Error:", fallbackErr);
      return { places: [], targetZone };
    }
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Resend Email Sending Endpoint
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html, from } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Les champs 'to', 'subject' et 'html' sont requis." });
    }

    try {
      const resend = getResendInstance();
      const sender = from || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      
      const response = await resend.emails.send({
        from: sender,
        to,
        subject,
        html,
      });

      if (response.error) {
        console.error("[api] Resend API error:", response.error);
        
        // Handle sandbox limits specifically
        const errorMsg = response.error.message || "";
        const isSandboxLimit = errorMsg.toLowerCase().includes("send to") || 
                              errorMsg.toLowerCase().includes("verify your domain") || 
                              response.error.name === "validation_error";

        if (isSandboxLimit) {
          return res.status(400).json({ 
            error: `Resend Sandbox Limit Encountered: "${errorMsg}". Note: Under Resend's free tier sandbox mode, you can only send emails to the email address linked to your Resend account. To send emails to any recipient, you need to verify your custom domain in your Resend Dashboard.`
          });
        }

        return res.status(400).json({ error: errorMsg || "Failed to send email via Resend" });
      }

      return res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("[api] Resend email sending error:", error);
      return res.status(500).json({ error: error.message || "La configuration de Resend est incomplète ou erronée." });
    }
  });

  // AI-powered pro matching endpoint
  app.post("/api/ai-search", async (req, res) => {
    const { query, professionals, userLocation } = req.body;

    if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
      return res.json({ results: [] });
    }

    try {
      // 1. Fetch live Google Places results in requested zone/Valencia (up to 6 max)
      let googlePlacesPros: any[] = [];
      let targetZone: any = null;

      try {
        const gpResult = await fetchGooglePlaces(query, 6, userLocation);
        googlePlacesPros = gpResult.places;
        targetZone = gpResult.targetZone;
      } catch (gpErr) {
        console.warn("[Google Places] Error during pro search fetch:", gpErr);
        targetZone = detectTargetZone(query, userLocation);
      }

      // Map community professionals list with coordinates and distance to target center
      const centerCoords = targetZone ? targetZone.centerCoords : DEFAULT_VALENCIA_CENTER;

      const proListBrief = professionals.map((p: any) => {
        let lat = p.coordinates?.lat ?? p.lat;
        let lng = p.coordinates?.lng ?? p.lng;
        const dist = calculateDistanceKm(centerCoords.lat, centerCoords.lng, lat, lng);

        return {
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
          distanceKm: dist,
          is_community_recommended: p.is_community_recommended !== false && p.source !== 'google' && p.source !== 'google_places',
          source: p.source || 'community'
        };
      });

      // Map Google Places pros
      const googleProsBrief = googlePlacesPros.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        company_name: p.company_name || "",
        category: p.category || "Professional",
        categories: [p.category || "Professional"],
        bio: (p.bio || "").slice(0, 180),
        top_qualities: [],
        languages: [],
        rating: p.rating || 0,
        location: p.location || targetZone?.zoneName || "Valencia",
        distanceKm: p.distanceKm ?? null,
        is_community_recommended: false,
        source: 'google_places'
      }));

      const allCandidatePros = [...proListBrief, ...googleProsBrief];

      const sysInstruction = `You are an expert matching AI assistant for "Unlocked" - a premier community-curated directory of recommended local professionals in Valencia, Spain.
Your purpose is to examine the user's natural language request and return the most relevant matching professionals.

Current Target Center / Zone: ${targetZone ? targetZone.zoneName : 'Valence'} (${centerCoords.lat}, ${centerCoords.lng})

Review the list of professionals provided and evaluate BOTH trade/service criteria AND location/proximity criteria:

1. STRICT TRADE COHERENCE & ZERO CROSS-SPECIALTY POLLUTION (CRITICAL):
   - You MUST match ONLY professionals whose actual trade, profession, or service DIRECTLY matches what the user is looking for.
   - ZERO CROSS-SPECIALTY POLLUTION:
     * If user searches "ostéopathe" / "osteopath" / "osteopatía": ONLY match osteopaths (or dedicated osteopathy/physiotherapy practices). NEVER match dentists ("dentistes"), general doctors ("médecins"), pediatricians ("pédiatres"), dermatologists, psychologists, or lawyers! Any mismatched professional MUST receive a score of 0.
     * If user searches "dentiste" / "dentist" / "dentista": ONLY match dentists, dental clinics, or orthodontists. NEVER match doctors, osteopaths, or physiotherapists!
     * If user searches "médecin généraliste" / "general practitioner": ONLY match general practitioners / primary care doctors. NEVER match dentists, surgeons, or osteopaths!
     * If user searches "plombier" / "plumber": ONLY match plumbers. NEVER match electricians or locksmiths unless requested!
     * If user searches "avocat" / "lawyer": ONLY match lawyers / legal counsel. NEVER match accountants, gestors, or real estate agents!
   - Broad categories like "Health & Wellness" or "Medical" MUST NEVER be used to justify returning an unrelated medical specialty. A dentist is NOT an osteopath.
   - Any professional whose trade does not correspond to the requested service MUST receive score 0 and NOT be returned.

2. 3-TIER RANKING PRIORITY SYSTEM (APPLIES EXCLUSIVELY TO GENUINE TRADE MATCHES):
   - TIER 1 (Highest Priority): Recommended App Professionals ('is_community_recommended: true') WITHIN 25 KM of the target area WHO PRACTICE THE REQUESTED TRADE. Give score 85-100. If no community pro practices this trade, return score 0 for all community pros. DO NOT force unrelated community pros!
   - TIER 2: Google Places professionals ('source: google_places') WHO PRACTICE THE REQUESTED TRADE: Up to 6 provided, sorted SOLELY by closest distance to user location (closest first). Any mismatched Google Places entry MUST receive score 0. Score: 60-80.
   - TIER 3: Other genuine matching professionals further than 25 km away (score 40-55).

3. PRESENTATION TONE & REASONS:
   - Do NOT mention or emphasize Google ratings, star scores or review counts in reasonUrlExcerpt or summaryMessage (e.g. NEVER say 'bénéficie d'une note Google de 4.9' or 'très bien noté sur Google').
   - Clarify why they match simply and neutrally (mentioning their trade, specialty, or neighborhood/town in Valencia).

4. "exactMatchFound" & "summaryMessage" RULES:
   - If AT LEAST ONE professional is a genuine match (score >= 40), set "exactMatchFound" to true, and "summaryMessage" to null.
   - If NO professionals match the requested trade at all, set "exactMatchFound" to false and provide a friendly explanation in summaryMessage.

5. Under "reasonUrlExcerpt" for each matched professional, write a single concise sentence clarifying why they fit the user's need.`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `User Query: "${query}"

Target Zone Detected: ${targetZone ? targetZone.zoneName : 'Valence'}

Available Professionals (Unlocked Community & Google Places):
${JSON.stringify(allCandidatePros, null, 2)}`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exactMatchFound: { type: Type.BOOLEAN, description: "True if direct match found for requested trade/service, false if not." },
              summaryMessage: { type: Type.STRING, description: "Explanation message when no direct match is found, written in user's query language." },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The professional's ID as a string" },
                    score: { type: Type.INTEGER, description: "The relevancy match score from 0 to 100" },
                    reasonUrlExcerpt: { type: Type.STRING, description: "Explanation of match or recommendation" }
                  },
                  required: ["id", "score", "reasonUrlExcerpt"]
                }
              }
            },
            required: ["exactMatchFound", "results"]
          },
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL
          },
          temperature: 0.1
        }
      });

      const parsedData = JSON.parse(response.text || "{}");
      let results: any[] = [];
      let exactMatchFound = true;
      let summaryMessage: string | null = null;

      if (Array.isArray(parsedData)) {
        results = parsedData;
      } else if (parsedData && typeof parsedData === "object") {
        results = Array.isArray(parsedData.results) ? parsedData.results : [];
        exactMatchFound = typeof parsedData.exactMatchFound === "boolean" ? parsedData.exactMatchFound : true;
        summaryMessage = parsedData.summaryMessage || null;
      }

      // Normalize scores if Gemini scaled down (e.g., 1-5 or 1-10)
      results = results.map((r: any) => {
        let sc = typeof r.score === 'number' ? r.score : 0;
        if (sc > 0 && sc <= 10) sc = sc * 10;
        return { ...r, score: sc };
      });

      // Guarantee that valid Google Places pros matching the trade are included with positive scores
      const validGooglePros = googlePlacesPros.filter((p: any) => 
        !isTradeMismatched(query, p.name, p.category)
      );

      validGooglePros.forEach((gp: any, idx: number) => {
        const gpId = String(gp.id);
        const existing = results.find((r: any) => 
          String(r.id) === gpId ||
          String(r.id) === `google_${gpId}` ||
          gpId === `google_${String(r.id)}`
        );
        if (!existing || (existing.score || 0) < 40) {
          if (existing) {
            existing.score = 75 - idx;
            if (!existing.reasonUrlExcerpt) {
              existing.reasonUrlExcerpt = gp.bio || (gp.distanceKm !== null ? `Établissement situé à ${gp.distanceKm} km` : `Établissement situé à ${gp.location || 'Valence'}`);
            }
          } else {
            results.push({
              id: gpId,
              score: 75 - idx,
              reasonUrlExcerpt: gp.bio || (gp.distanceKm !== null ? `Établissement situé à ${gp.distanceKm} km` : `Établissement situé à ${gp.location || 'Valence'}`)
            });
          }
        }
      });

      // Verify if any pro has a match score (>= 40)
      const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
      if (!hasStrongMatch) {
        exactMatchFound = false;
      } else {
        exactMatchFound = true;
      }

      return res.json({
        exactMatchFound,
        summaryMessage,
        results,
        google_places_pros: googlePlacesPros,
        target_zone: targetZone
      });
    } catch (error: any) {
      console.error("[api] Gemini AI Search matching error:", error);
      const errorMsg = error.message || "";
      const errorLower = errorMsg.toLowerCase();
      if (
        errorLower.includes("quota") ||
        errorLower.includes("limit") ||
        errorLower.includes("exhausted") ||
        errorLower.includes("429") ||
        errorLower.includes("too many requests") ||
        errorLower.includes("rate limit")
      ) {
        return res.status(429).json({ error: "Jane is not available at the moment. Please use manual search in the pages" });
      }
      return res.status(500).json({ error: error.message || "Failed to process matching" });
    }
  });

  // AI-powered Multi-Domain search endpoint (Pros, Events, Guides)
  app.post("/api/ai-multi-search", async (req, res) => {
    const { query, professionals = [], googlePlacesPros: clientGooglePlacesPros = [], events = [], guides = [], conversationHistory = [], userLocation = null } = req.body;

    if (!query || !query.trim()) {
      return res.json({ 
        jane_message: "Please tell me what you are looking for!",
        matched_topics: [],
        pros: [],
        events: [],
        guides: []
      });
    }

    try {
      // 1. Intelligent Topic & Follow-up Intent Analysis if conversation history exists
      let placesSearchQuery = query;
      let isNewTopic = false;
      let topicTransitionReason = "";

      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        try {
          const historyFormattedForClassification = conversationHistory
            .map((m: any) => `${(m.role === 'user' || m.role === 'User') ? 'User' : 'Jane'}: ${m.content || m.text}`)
            .join('\n');

          const topicAnalysis = await getAiClient().models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `You are an expert conversation flow and search intent analyzer for Unlocked (a local guide & directory in Valencia, Spain).

Analyze the conversation thread and the latest message to determine whether the user is:
1. CONTINUING & REFINING the existing discussion (e.g. asking for a French-speaking professional, asking about closer locations, asking about prices/hours/details of previously mentioned places, asking for alternative options within the same domain/trade).
2. STARTING A NEW DISCUSSION / SWITCHING TOPIC (e.g. was discussing dentists, now asking for a plumber, a restaurant, cultural events, NIE administrative help, or asking a completely separate service or question).

Conversation History:
${historyFormattedForClassification}

Latest User Message:
"${query}"

Rules:
- is_new_topic: true if user is asking for a different service, profession, activity, or unrelated request.
- is_new_topic: false if user is refining, filtering, clarifying, or asking questions about the existing topic/service.
- effective_search_query:
  * If is_new_topic is true: Extract ONLY the new trade/service/activity + location (2-5 words max, e.g. "plombier", "restaurant paella", "concert jazz"). DO NOT keep keywords from the old topic!
  * If is_new_topic is false: Synthesize the current trade with the new refinement/filter (e.g. "dentiste francophone", "ostéopathe Ruzafa").
- DO NOT append city/neighborhood name (like Valencia, Ruzafa) unless the user explicitly mentioned it in their query.`,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  is_new_topic: { type: Type.BOOLEAN, description: "True if user switched to a new topic/service, false if continuing/refining the previous topic" },
                  topic_transition_reason: { type: Type.STRING, description: "Brief reason explaining whether it is a new topic or follow-up" },
                  effective_search_query: { type: Type.STRING, description: "Precise 2-5 word search query for Google Places and local search" }
                },
                required: ["is_new_topic", "effective_search_query"]
              },
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });

          const parsedAnalysis = JSON.parse(topicAnalysis.text || "{}");
          isNewTopic = Boolean(parsedAnalysis.is_new_topic);
          topicTransitionReason = parsedAnalysis.topic_transition_reason || "";
          if (parsedAnalysis.effective_search_query && parsedAnalysis.effective_search_query.trim().length >= 2) {
            placesSearchQuery = parsedAnalysis.effective_search_query.trim();
          }
        } catch (err) {
          console.warn("[Multi-Search] Error during conversation topic analysis:", err);
          placesSearchQuery = query;
        }
      }

      // If user switched to a new topic, discard previous Google Places pros from the old topic!
      const existingPlacesToConsider = isNewTopic ? [] : (Array.isArray(clientGooglePlacesPros) ? clientGooglePlacesPros : []);

      // 2. Fetch live Google Places results in target zone/user location (up to 6 max, closest first)
      let newlyFetchedPlaces: any[] = [];
      let targetZone: any = null;

      try {
        const gpResult = await fetchGooglePlaces(placesSearchQuery, 6, userLocation);
        newlyFetchedPlaces = gpResult.places;
        targetZone = gpResult.targetZone;
      } catch (gpErr) {
        console.warn("[Google Places] Error during multi-search fetch:", gpErr);
        targetZone = detectTargetZone(placesSearchQuery, userLocation);
      }

      const centerCoords = targetZone?.isSpecificZone
        ? targetZone.centerCoords
        : (userLocation || DEFAULT_VALENCIA_CENTER);

      // 3. Merge existing (if same topic) and newly fetched Google Places pros
      const combinedPlacesMap = new Map<string, any>();
      existingPlacesToConsider.forEach((p: any) => {
        if (p && p.id) combinedPlacesMap.set(String(p.id), p);
      });
      newlyFetchedPlaces.forEach((p: any) => {
        if (p && p.id) combinedPlacesMap.set(String(p.id), p);
      });

      const rawGooglePlacesPros = Array.from(combinedPlacesMap.values()).map((p: any) => {
        let lat = p.coordinates?.lat ?? p.lat;
        let lng = p.coordinates?.lng ?? p.lng;
        const dist = (typeof lat === 'number' && typeof lng === 'number')
          ? calculateDistanceKm(centerCoords.lat, centerCoords.lng, lat, lng)
          : (p.distanceKm ?? null);
        return { ...p, distanceKm: dist };
      });

      // Strict user rule: "Supprime les ordres de priorité des pros de google places. La seule regle est les plus proches de ma position gps en premier sauf si une demande particuliere d'emplacement est demandée par l'utilisateur. Et pas plus de 6 pros de google places données"
      rawGooglePlacesPros.sort((a, b) => {
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
        return distA - distB;
      });

      const googlePlacesPros = rawGooglePlacesPros.slice(0, 6);

      // Format community pros with distance - DO NOT slice to 50 items so all community pros are considered
      const proListBrief = professionals.map((p: any) => {
        let lat = p.coordinates?.lat ?? p.lat;
        let lng = p.coordinates?.lng ?? p.lng;
        const dist = calculateDistanceKm(centerCoords.lat, centerCoords.lng, lat, lng);

        return {
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
          distanceKm: dist,
          is_community_recommended: p.is_community_recommended !== false && p.source !== 'google' && p.source !== 'google_places',
          source: p.source || 'community'
        };
      });

      // Format Google Places brief items (strictly max 6, ordered by closest distance)
      const googleProsBrief = googlePlacesPros.map((p: any) => {
        let lat = p.coordinates?.lat ?? p.lat;
        let lng = p.coordinates?.lng ?? p.lng;
        const dist = (lat && lng) ? calculateDistanceKm(centerCoords.lat, centerCoords.lng, lat, lng) : (p.distanceKm ?? null);

        return {
          id: String(p.id),
          name: p.name,
          company_name: p.company_name || "",
          category: p.category || "Professional",
          categories: [p.category || "Professional"],
          bio: (p.bio || "").slice(0, 180),
          top_qualities: [],
          languages: [],
          rating: p.rating || 0,
          location: p.location || targetZone?.zoneName || "Valencia",
          distanceKm: dist,
          website: p.website || "",
          googleMapsUri: p.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.name || '') + ' Valencia')}`,
          is_community_recommended: false,
          source: 'google_places'
        };
      });

      // Combine both lists for Gemini matching, applying strict pre-filtering for mismatched trades
      const allCandidatePros = [...proListBrief, ...googleProsBrief];
      const filteredCandidatePros = allCandidatePros.filter((p: any) => 
        !isTradeMismatched(placesSearchQuery || query, p.name, p.category)
      );

      const eventsBrief = events.slice(0, 30).map((e: any) => ({
        id: String(e.id),
        title: e.title,
        category: e.category || "",
        start_date: e.start_date || e.date || "",
        end_date: e.end_date || "",
        start_time: e.start_time || e.time || "",
        location: e.location || "",
        description: (e.description || "").slice(0, 180)
      }));

      const guidesBrief = guides.slice(0, 30).map((g: any) => ({
        id: String(g.id),
        title: g.title,
        categoryTitle: g.categoryTitle || g.category_title || "",
        excerpt: (g.excerpt || g.description || "").slice(0, 180),
        author: g.author?.businessName || g.author?.name || ""
      }));

      const formattedHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0
        ? `\n\nPrevious Conversation Context:\n${conversationHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Jane'}: ${m.text || m.content}`).join('\n')}`
        : '';

      const conversationFlowDirective = isNewTopic
        ? `CRITICAL CONVERSATION FLOW - NEW TOPIC DETECTED:
The user has shifted context or started a brand NEW search discussion for: "${placesSearchQuery}".
- Completely reset search focus to this new subject: evaluate professionals, events, and guides specifically for this new topic.
- In your "jane_message", smoothly and warmly acknowledge the new request (e.g. "Bien sûr, voici ce que j'ai trouvé pour votre recherche de...") and introduce the matching items without referencing past unrelated topics.`
        : `CONVERSATION FLOW - CONTINUING DISCUSSION:
The user is continuing, refining, or asking follow-ups regarding the ongoing search topic: "${placesSearchQuery}".
- Keep the discussion thread natural, answering their refinement criteria (e.g. spoken language, neighborhood, specific details) accurately.`;

      const sysInstruction = `You are Jane, the friendly and intelligent AI assistant for "Unlocked" — a premier community-curated directory and city guide for Valencia, Spain and surrounding areas.
Your mission is to evaluate the user's natural language request (and any ongoing conversation history for refining search criteria) and match relevant items across THREE distinct categories:
1. "pros": Verified local professionals, tradespeople, legal/medical/wellness experts, services.
2. "events": Local community events, festivals, concerts, cultural activities, workshops.
3. "guides": Practical informational guides, administrative help (NIE, Padrón, Healthcare, Real Estate, Taxes), and neighborhood advice.

${conversationFlowDirective}

TARGET CENTER / ZONE FOR GEOGRAPHIC LOCATION:
- Active Target Zone: ${targetZone ? targetZone.zoneName : 'Valencia'} (${centerCoords.lat}, ${centerCoords.lng})
- Radius rule: Search prioritizes professionals within 25 km of ${targetZone ? targetZone.zoneName : 'this location'}.

3-TIER RANKING PRIORITY FOR PROFESSIONALS:
- TIER 1: Recommended App Pros ('is_community_recommended: true') WITHIN 25 KM of ${targetZone ? targetZone.zoneName : 'the target center'} WHO PRACTICE THE REQUESTED TRADE. Must rank highest (scores 85-100). If no community pro practices the requested trade, return score 0 for all community pros. DO NOT force unrelated community pros!
- TIER 2: Google Places pros ('source: google_places') WHO PRACTICE THE REQUESTED TRADE: Strictly max 6 provided, sorted SOLELY by closest distance to user location (or requested location). DO NOT sort or reorder by ratings or reviews; preserve closest distance first (scores 60-80). Mismatched Google Places entries MUST receive score 0.
- TIER 3: Other genuine trade matches further than 25 km away (scores 40-55).

CRITICAL TRADE COHERENCE & ZERO CROSS-SPECIALTY POLLUTION (MANDATORY):
1. STRICT TRADE COHERENCE:
   - Match ONLY professionals who genuinely practice or specialize in the requested trade.
   - ZERO CROSS-SPECIALTY POLLUTION:
     * If user searches "ostéopathe" / "osteopath" / "osteopatía": ONLY match osteopaths or dedicated osteopathy practices. NEVER match dentists ("dentistes", dental clinics), general doctors ("médecins généralistes"), pediatricians ("pédiatres"), dermatologists, psychologists, or lawyers! Any mismatched professional MUST receive score 0.
     * If user searches "dentiste" / "dentist": ONLY match dentists, dental clinics, or orthodontists. NEVER match general doctors, osteopaths, or physiotherapists!
     * If user searches "médecin généraliste": ONLY match general doctors / primary care physicians. NEVER match dentists, surgeons, or osteopaths!
     * If user searches "plombier" / "plumber": ONLY match plumbers. NEVER match electricians or locksmiths!
     * If user searches "avocat" / "lawyer": ONLY match legal counsel. NEVER match accountants or real estate agents!
   - Broad categories like "Health & Wellness" or "Medical" MUST NEVER be used to justify returning an unrelated specialty. A dentist is NOT an osteopath.
   - Any candidate professional whose actual trade does not match the requested service MUST receive score 0 and be omitted from "pros".

2. HONEST & HELPFUL JANE MESSAGE:
   - When community-recommended professionals ('is_community_recommended: true') exist in the candidate list matching the requested trade, YOU MUST explicitly celebrate and present them as members of the Unlocked community in your "jane_message" (e.g. "Voici les dentistes recommandés par notre communauté Unlocked :").
   - ONLY if there are truly NO community-recommended professionals for that specific trade in the candidate list, then state honestly that none are registered in the community yet and present the verified nearby professionals found on Google Places.
   - Write a warm, helpful, conversational response in the SAME language as the user's query (French, Spanish, English, etc.).
   - Directly address their question or refinement with precision and empathy.
   - If a specific neighborhood/zone was detected (${targetZone?.zoneName}), gently confirm in your message that results are centered on ${targetZone?.zoneName} within 10 km.

3. SELECTIVE INCLUSION & TOPICS:
   - ONLY include a category in "matched_topics" if there are genuinely relevant items for that category.
   - Do NOT force items into a category if there is no natural match.
   - If the user asks a follow-up to refine (e.g. "Only those who speak French", "Which one is closest to Ruzafa?"), refine the matching items accordingly.
   - If no items in a category score >= 40, return an empty array [] for that category.
   - Include ONLY topic names that actually have at least one matching item (e.g. ["pros"] or ["pros", "guides"]). If none match, return [].

4. PRESENTATION TONE FOR PROFESSIONALS:
   - Do NOT mention or emphasize Google ratings, scores, or review counts in your message (jane_message) or in the reason field (e.g. NEVER say 'bénéficie d'une excellente note Google de 4.9' or 'très bien noté sur Google'). Simply present them neutrally and naturally by their profession, service, specialty, or location in Valencia.

5. ACTIVITÉS & CHOSES À FAIRE (THINGS TO DO, LEISURE, SPORTS, ENTERTAINMENT):
   - When user asks for "choses à faire", "activités", "que faire", "sorties", "loisirs", "things to do", "sports", or "entertainment":
     * PRIORITY ORDER: PROPOSE EVENTS FIRST! In "matched_topics", place "events" first if there are matching events (e.g. ["events", "pros", "guides"]).
     * IN "jane_message": Present upcoming community events, festivals, concerts, cultural activities and meetups FIRST in your message, followed by recommended entertainment, sports, and leisure professionals, and discovery guides.
     * IN "pros": Broadly DIVERSIFY suggestions across premium leisure options while maintaining strict coherence! Propose relevant professionals in:
       - Entertainment & Culture: Live music, stand-up comedy clubs, escape rooms, theaters, flamenco shows, art galleries, museums.
       - Sports, Water & Outdoor: Paddle surf (SUP), kayak/boat rentals, sailing excursions, bike & electric scooter rentals, hiking guides, golf, tennis/padel clubs, surfing/diving.
       - Wellness & Mind: Spas, thermal baths, yoga & pilates studios, meditation centers.
       - Gastronomy & Creativity: Paella cooking classes, pottery/ceramics workshops, wine tasting courses, walking food tours, salsa/bachata dance classes.
       - Event, Services & Outing Prep: Professional vacation photographers & videographers (to capture moments, portraits), private chefs & home catering, private drivers & chauffeurs, local tour guides, massage therapists, beauty therapists, and nail artists (pre-outing pampering).
       - STRICT COHERENCE RULE: NEVER match dentists, general doctors, pediatricians, lawyers, accountants, realtors, or plumbers for activity queries. Unrelated professional categories MUST receive score 0 and be omitted from "pros"!
     * DO NOT limit activity suggestions solely to children or kids playgrounds unless the user explicitly mentions kids ("enfants", "pour les enfants", "kids"). Provide engaging, high-quality activities for adults, couples, friends, and the broader community as well!
     * IN "events": Include relevant community events, concerts, social meetups, workshops, cultural festivals.
     * IN "guides": Match relevant city guides, neighborhood discoveries, itineraries, and activity recommendations in Valencia.`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `User Latest Query/Refinement: "${query}"${formattedHistory}

Target Zone: ${targetZone ? targetZone.zoneName : 'Valence'}

Available Professionals (Unlocked Community & Google Places):
${JSON.stringify(filteredCandidatePros, null, 2)}

Available Events:
${JSON.stringify(eventsBrief, null, 2)}

Available Guides:
${JSON.stringify(guidesBrief, null, 2)}`,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              jane_message: { type: Type.STRING, description: "Friendly summary message in user's language" },
              matched_topics: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Array of topic keys with matches: 'pros', 'events', 'guides'" 
              },
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
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL
          },
          temperature: 0.1
        }
      });

      const parsedData = JSON.parse(response.text || "{}");
      
      const rawPros = Array.isArray(parsedData.pros) ? parsedData.pros : [];
      const prosResults = rawPros.map((p: any) => {
        let sc = typeof p.score === 'number' ? p.score : 0;
        if (sc > 0 && sc <= 10) sc = sc * 10;
        return { ...p, score: sc };
      }).filter((p: any) => p.score >= 40);

      const rawEvents = Array.isArray(parsedData.events) ? parsedData.events : [];
      const eventsResults = rawEvents.map((e: any) => {
        let sc = typeof e.score === 'number' ? e.score : 0;
        if (sc > 0 && sc <= 10) sc = sc * 10;
        return { ...e, score: sc };
      }).filter((e: any) => e.score >= 40);

      const rawGuides = Array.isArray(parsedData.guides) ? parsedData.guides : [];
      const guidesResults = rawGuides.map((g: any) => {
        let sc = typeof g.score === 'number' ? g.score : 0;
        if (sc > 0 && sc <= 10) sc = sc * 10;
        return { ...g, score: sc };
      }).filter((g: any) => g.score >= 40);

      // GUARANTEE 1: Ensure valid community-recommended pros matching the trade query are present in prosResults
      const validCommunityPros = proListBrief.filter((p: any) => 
        p.is_community_recommended === true && 
        !isTradeMismatched(placesSearchQuery || query, p.name, p.category)
      );

      validCommunityPros.forEach((cp: any, idx: number) => {
        const cpId = String(cp.id);
        const existing = prosResults.find((pr: any) => 
          String(pr.id) === cpId ||
          String(pr.id) === `google_${cpId}` ||
          cpId === `google_${String(pr.id)}`
        );
        if (!existing) {
          prosResults.push({
            id: cpId,
            score: 95 - idx,
            reason: cp.bio || `Recommandé par la communauté Unlocked`
          });
        }
      });

      // GUARANTEE 2: Ensure valid Google Places pros matching the trade query are present in prosResults
      const validGooglePros = googlePlacesPros.filter((p: any) => 
        !isTradeMismatched(placesSearchQuery || query, p.name, p.category)
      );

      validGooglePros.forEach((gp: any, idx: number) => {
        const gpId = String(gp.id);
        const existing = prosResults.find((pr: any) => 
          String(pr.id) === gpId ||
          String(pr.id) === `google_${gpId}` ||
          gpId === `google_${String(pr.id)}`
        );
        if (!existing) {
          prosResults.push({
            id: gpId,
            score: 75 - idx,
            reason: gp.bio || (gp.distanceKm !== null ? `${gp.category || 'Professionnel'} situé à ${gp.distanceKm} km` : `${gp.category || 'Professionnel'} à Valence`)
          });
        }
      });

      const effectiveTopics: string[] = [];
      if (prosResults.length > 0) effectiveTopics.push("pros");
      if (eventsResults.length > 0) effectiveTopics.push("events");
      if (guidesResults.length > 0) effectiveTopics.push("guides");

      return res.json({
        jane_message: parsedData.jane_message || "Here are the results I found for you:",
        matched_topics: effectiveTopics,
        pros: prosResults,
        events: eventsResults,
        guides: guidesResults,
        google_places_pros: googlePlacesPros,
        target_zone: targetZone,
        is_new_topic: isNewTopic,
        effective_search_query: placesSearchQuery
      });
    } catch (error: any) {
      console.error("[api] Gemini AI Multi-Search matching error:", error);
      const errorMsg = error.message || "";
      const errorLower = errorMsg.toLowerCase();
      if (
        errorLower.includes("quota") ||
        errorLower.includes("limit") ||
        errorLower.includes("exhausted") ||
        errorLower.includes("429") ||
        errorLower.includes("too many requests") ||
        errorLower.includes("rate limit")
      ) {
        return res.status(429).json({ error: "Jane is not available at the moment. Please use manual search in the pages" });
      }
      return res.status(500).json({ error: error.message || "Failed to process multi-search matching" });
    }
  });

  // Server-side city-normalization endpoint (migrated from client-side for safety)
  app.post("/api/city-normalization", async (req, res) => {
    const { city, region, country } = req.body;
    if (!city) {
      return res.json({ result: 'Valencia' });
    }

    try {
      const locationContext = `${city}, ${region || ''}, ${country || ''}`;
      const response = await getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Target: Identify the nearest major metropolitan city for "${locationContext}". 
        Rules: 
        1. Return ONLY the name of the major city.
        2. No punctuation, no sentences.
        3. If the location is already a major city, return its name.
        4. Example: "La Eliana, Valencian Community, Spain" -> "Valencia".`,
      });

      const result = response.text?.trim() || city;
      return res.json({ result });
    } catch (error: any) {
      console.error("[api] City normalization error:", error);
      return res.json({ result: city || 'Valencia' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
