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
  isTradeMismatched
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

      const proListBrief = professionals.slice(0, 50).map((p: any) => {
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

      // Verify if any pro has a match score (>= 40)
      const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
      if (!hasStrongMatch) {
        exactMatchFound = false;
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
      // 1. Synthesize effective search query for Google Places if conversation history exists
      let placesSearchQuery = query;

      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        try {
          const userMsgList = conversationHistory
            .filter((m: any) => (m.role === 'user' || m.role === 'User') && (m.content || m.text))
            .map((m: any) => m.content || m.text);
          userMsgList.push(query);

          const fullUserIntent = userMsgList.join(" | ");

          const qExtract = await getAiClient().models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `Analyze this search conversation thread for local services.
Extract the CURRENT core trade/profession + location/neighborhood (ONLY if explicitly specified by user) (2-6 words max in English or French) to search on Google Places.
CRITICAL: Do NOT append any neighborhood or city name (like Valencia, Ruzafa, etc.) unless the user EXPLICITLY typed that specific location in their messages!

Conversation History: "${fullUserIntent}"

Examples:
- History: "Je cherche un dentiste" | "avez vous des options proches" -> "dentiste"
- History: "besoin d'un plombier" | "qui parle anglais" -> "plombier anglais"
- History: "recherche un pédiatre à Bétera" -> "pédiatre Bétera"
- History: "un avocat fiscaliste" -> "avocat fiscaliste"

Return ONLY the concise 2-6 word search query string.`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
            }
          });

          const extractedQuery = qExtract.text?.trim().replace(/['"]/g, '');
          if (extractedQuery && extractedQuery.length >= 3) {
            placesSearchQuery = extractedQuery;
          } else {
            placesSearchQuery = `${query} ${conversationHistory.map((m: any) => m.content || m.text).join(" ")}`;
          }
        } catch (err) {
          console.warn("[Google Places] Error extracting refined query:", err);
          placesSearchQuery = `${query} ${conversationHistory.map((m: any) => m.content || m.text).join(" ")}`;
        }
      }

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

      // 3. Merge existing client Google Places pros with newly fetched ones
      const combinedPlacesMap = new Map<string, any>();
      if (Array.isArray(clientGooglePlacesPros)) {
        clientGooglePlacesPros.forEach((p: any) => {
          if (p && p.id) combinedPlacesMap.set(String(p.id), p);
        });
      }
      if (Array.isArray(newlyFetchedPlaces)) {
        newlyFetchedPlaces.forEach((p: any) => {
          if (p && p.id) combinedPlacesMap.set(String(p.id), p);
        });
      }

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

      // Format community pros with distance
      const proListBrief = professionals.slice(0, 50).map((p: any) => {
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

      const sysInstruction = `You are Jane, the friendly and intelligent AI assistant for "Unlocked" — a premier community-curated directory and city guide for Valencia, Spain and surrounding areas.
Your mission is to evaluate the user's natural language request (and any ongoing conversation history for refining search criteria) and match relevant items across THREE distinct categories:
1. "pros": Verified local professionals, tradespeople, legal/medical/wellness experts, services.
2. "events": Local community events, festivals, concerts, cultural activities, workshops.
3. "guides": Practical informational guides, administrative help (NIE, Padrón, Healthcare, Real Estate, Taxes), and neighborhood advice.

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
   - If there are no community recommended professionals in Unlocked for the specific trade, be completely honest and transparent with the user in "jane_message":
     * For example: "Nous n'avons pas encore d'ostéopathe recommandé directement au sein de la communauté Unlocked, mais voici les professionnels les plus proches trouvés autour de vous :" (or equivalent in user's query language).
     * NEVER claim an unrelated doctor or dentist is a match.
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
   - Do NOT mention or emphasize Google ratings, scores, or review counts in your message (jane_message) or in the reason field (e.g. NEVER say 'bénéficie d'une excellente note Google de 4.9' or 'très bien noté sur Google'). Simply present them neutrally and naturally by their profession, service, specialty, or location in Valencia.`;

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
      
      const prosResults = Array.isArray(parsedData.pros) ? parsedData.pros.filter((p: any) => (p.score || 0) >= 40) : [];
      const eventsResults = Array.isArray(parsedData.events) ? parsedData.events.filter((e: any) => (e.score || 0) >= 40) : [];
      const guidesResults = Array.isArray(parsedData.guides) ? parsedData.guides.filter((g: any) => (g.score || 0) >= 40) : [];

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
        target_zone: targetZone
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
