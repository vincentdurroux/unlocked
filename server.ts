import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// Language helper functions for AI matching
function detectRequestedLanguages(query: string): string[] {
  if (!query || typeof query !== "string") return [];
  const q = query.toLowerCase();
  const detected: string[] = [];

  if (/\b(fran[cç]ais|fran[cç]aise|fran[cç]aises|french|francophone|francophones)\b/i.test(q)) {
    detected.push("French");
  }
  if (/\b(anglais|anglaise|anglaises|english|anglophone|anglophones|ingles|inglés)\b/i.test(q)) {
    detected.push("English");
  }
  if (/\b(espagnol|espagnole|espagnols|espagnoles|spanish|español|espanol|hispanophone|hispanophones|hispano|castellano|castillan)\b/i.test(q)) {
    detected.push("Spanish");
  }
  if (/\b(allemand|allemande|allemands|allemandes|german|deutsch|germanophone)\b/i.test(q)) {
    detected.push("German");
  }
  if (/\b(italien|italienne|italiens|italiennes|italian|italiano|italophone)\b/i.test(q)) {
    detected.push("Italian");
  }
  if (/\b(portugais|portugaise|portugaises|portuguese|portugu[eê]s|lusophone)\b/i.test(q)) {
    detected.push("Portuguese");
  }
  if (/\b(n[ée]erlandais|n[ée]erlandaise|dutch|hollandais|hollandaise|nederlands)\b/i.test(q)) {
    detected.push("Dutch");
  }
  if (/\b(russe|russes|russian|russophone|ruso)\b/i.test(q)) {
    detected.push("Russian");
  }
  if (/\b(arabe|arabes|arabic|arabophone|[aá]rabe)\b/i.test(q)) {
    detected.push("Arabic");
  }
  if (/\b(chinois|chinoise|chinoises|chinese|mandarin|canton[a-z]+|sinophone)\b/i.test(q)) {
    detected.push("Chinese");
  }
  if (/\b(japonais|japonaise|japonaises|japanese|japone?s)\b/i.test(q)) {
    detected.push("Japanese");
  }

  return detected;
}

function proSpeaksAnyLanguage(pro: any, requestedLanguages: string[]): boolean {
  if (!pro || !Array.isArray(pro.languages) || requestedLanguages.length === 0) return false;

  const proLangs = pro.languages.map((l: any) => (typeof l === "string" ? l.trim().toLowerCase() : ""));

  return requestedLanguages.some(targetLang => {
    const t = targetLang.toLowerCase();
    return proLangs.some((lang: string) => {
      if (!lang) return false;
      if (lang === t) return true;
      if (t === "french" && (lang.includes("fran") || lang.includes("french"))) return true;
      if (t === "english" && (lang.includes("angl") || lang.includes("engl") || lang.includes("ingl"))) return true;
      if (t === "spanish" && (lang.includes("esp") || lang.includes("span") || lang.includes("cast"))) return true;
      if (t === "german" && (lang.includes("allem") || lang.includes("germ") || lang.includes("deutsch"))) return true;
      if (t === "italian" && lang.includes("ital")) return true;
      if (t === "portuguese" && lang.includes("portug")) return true;
      if (t === "dutch" && (lang.includes("dutch") || lang.includes("neerl") || lang.includes("néerl") || lang.includes("holl"))) return true;
      if (t === "russian" && lang.includes("russ")) return true;
      if (t === "arabic" && lang.includes("arab")) return true;
      if (t === "chinese" && lang.includes("chin")) return true;
      if (t === "japanese" && (lang.includes("japon") || lang.includes("japan"))) return true;
      return false;
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
    const { query, professionals } = req.body;

    if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
      return res.json({ results: [] });
    }

    try {
      // Map professionals list with only relevant fields to stay within token limits and maintain focus
      const proListBrief = professionals.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        company_name: p.company_name || "",
        category: p.category || p.profession || "",
        categories: p.categories || [],
        bio: p.bio || p.description || "",
        top_qualities: p.top_qualities || [],
        languages: p.languages || [],
        rating: p.rating || 0,
        location: p.location || "",
        is_recommended: p.is_recommended ?? true
      }));

      const sysInstruction = `You are an expert matching AI assistant for "Unlocked" - a premier community-curated directory of recommended local professionals.
Your purpose is to examine the user's natural language request and return the most relevant matching professionals.

Review the list of professionals provided and evaluate BOTH trade/service criteria AND location criteria:

1. QUERY PARSING & SYNONYMS (CRITICAL) - Updated:
   - Trade / Profession Synonyms & Translations:
     * "hair dresser", "hairdresser", "hair stylist", "coiffeur", "peluquero", "hair salon", "barber" ALL match "Hairdresser", "Coiffeur", "Beauty & Wellness", or hair care services.
     * "doctor", "physician", "médecin", "gp" ALL match Doctor/Medical services.
     * "realtor", "real estate agent", "inmobiliaria" ALL match Real Estate / Property services.
     * "plumber", "plombier", "fontanero" ALL match Plumbing services.
     * "I hurt my back", "back pain", "mal de dos" ALL match "Physiotherapist", "Osteopath", or "Chiropractor".
     * Treat language translations (English, French, Spanish) and word variations (e.g., "hair dresser" vs "hairdresser") as EXACT trade matches!
   - Location Matching:
     * "Valencia area", "in Valencia", "around Valencia", "Valencia city" matches professionals located in Valencia or Valencia metropolitan/province towns (e.g. Valencia, La Eliana, Torrent, Paterna, etc.).

2. SCORING & MATCHING RULES:
   - DIRECT MATCH (Score 70-100): The professional matches BOTH requested trade/service (including synonyms/translations) AND requested location/area (or if no location was specified).
     * Example: "hair dresser in valencia area" + hairdresser in Valencia => DIRECT MATCH (Score 80-100).
   - ADJACENT / ALTERNATIVE MATCH (Score 15-45): The professional offers a closely related trade (e.g. general beauty salon for a hairdresser request), OR matches the trade in a neighboring distant town.
   - UNRELATED OR WRONG LOCATION (Score 0): The professional has a completely unrelated trade OR is in a totally different distant city/country when a specific city was requested.

3. "exactMatchFound" & "summaryMessage" RULES:
   - CRITICAL: If AT LEAST ONE professional is a DIRECT MATCH (score >= 60), you MUST set "exactMatchFound" to true, and set "summaryMessage" to null!
   - Set "exactMatchFound" to false ONLY if NO professional in the directory directly matches both trade and location.
   - If "exactMatchFound" is false:
     * If there ARE alternative/adjacent professionals returned with score > 0:
       - With specific trade and location (e.g. "plumber in La Eliana"): "We couldn't find a [trade] in [location] in our directory. Jane found some alternative options, but they may not meet all your criteria."
       - Without specific location: "We couldn't find an exact match for '[user request]' in our directory. Jane found some alternative options, but they may not meet all your criteria."
     * If NO professionals match at all (all professionals have score 0):
       - With specific trade and location: "We couldn't find a [trade] in [location] in our directory."
       - Without specific location: "We couldn't find an exact match for '[user request]' in our directory."

4. Under "reasonUrlExcerpt" for each professional with score > 0, write a single concise sentence in ENGLISH clarifying why they matched (mentioning their trade and location).
 
5. PRIORITIZATION (CRITICAL):
   - Professionals with "is_recommended: true" are community-vetted and MUST be prioritized over those with "is_recommended: false".
   - If multiple professionals match the user's query well, those with "is_recommended: true" should receive a score bonus or be ranked higher than those with "is_recommended: false".
   - A non-recommended professional should only have a higher score than a recommended one if they are a significantly better match for the specific trade or location requested.

6. SPOKEN LANGUAGE REQUIREMENT (HIGHEST PRIORITY):
   - Check if the user's query requests a specific spoken language (e.g. "qui parle français", "parlant français", "francophone", "french speaking", "speaking english", "anglais", "habla español", "spanish", "deutsch", "allemand", etc.).
   - If a language is requested:
     * FIRST PRIORITY: Check each professional's "languages" list for that language (handling translations like French/Français, English/Anglais, Spanish/Español, etc.).
     * EXCLUSION RULE (CRITICAL): If AT LEAST ONE matching professional speaks the requested language:
       - You MUST ONLY return professionals who speak that language (give them positive scores 70-100).
       - You MUST give score: 0 to ANY professional who does NOT speak that language! (Do NOT include or suggest non-speakers when at least 1 speaker exists).
       - Set exactMatchFound to true (if score >= 60).
     * ONLY if NO professional in the directory speaks the requested language:
       - You may return alternative professionals in that trade with lower scores (score 20-45).
       - Set exactMatchFound to false, and in "summaryMessage" explain in the user's query language that no professional speaking that language was found for this service.`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `User Query: "${query}"

Professionals:
${JSON.stringify(proListBrief, null, 2)}`,
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

      // Check if user requested a specific spoken language
      const requestedLangs = detectRequestedLanguages(query);
      if (requestedLangs.length > 0) {
        const proLookup: Record<string, any> = {};
        professionals.forEach((p: any) => {
          if (p && p.id != null) proLookup[String(p.id)] = p;
        });
        
        // Find matching pros with score > 0 who speak any of the requested languages
        const matchingSpeakers = results.filter((r: any) => {
          if ((r.score || 0) <= 0) return false;
          const pro = proLookup[String(r.id)];
          return pro && proSpeaksAnyLanguage(pro, requestedLangs);
        });

        if (matchingSpeakers.length > 0) {
          // At least 1 speaker found! Strictly exclude any non-speaker
          results = results
            .filter((r: any) => {
              const pro = proLookup[String(r.id)];
              return pro && proSpeaksAnyLanguage(pro, requestedLangs);
            })
            .map((r: any) => {
              // Ensure speakers have strong direct match scores
              return {
                ...r,
                score: Math.max(r.score || 0, 75)
              };
            });

          // Prioritize by recommended status and score
          results.sort((a: any, b: any) => {
            const proA = proLookup[String(a.id)];
            const proB = proLookup[String(b.id)];
            const recA = proA?.is_recommended !== false;
            const recB = proB?.is_recommended !== false;
            if (recA !== recB) return recA ? -1 : 1;
            return (b.score || 0) - (a.score || 0);
          });

          exactMatchFound = true;
          summaryMessage = null;
        }
      }

      // Verify if any pro has a high confidence match score (>= 40)
      const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
      if (!hasStrongMatch) {
        exactMatchFound = false;
      }

      return res.json({ exactMatchFound, summaryMessage, results });
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
        return res.status(429).json({ error: "Jane is very busy right now! Please wait a few seconds and try again, or use the category list in filters to find the pro you need." });
      }
      return res.status(500).json({ error: error.message || "Failed to process matching" });
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
        model: "gemini-flash-latest",
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

  // AI-powered event matching with Assistant Jane
  app.post("/api/ai-event-matching", async (req, res) => {
    const { query, events } = req.body;

    if (!query || !query.trim() || !events || !Array.isArray(events) || events.length === 0) {
      return res.json({ exactMatchFound: false, summaryMessage: null, results: [] });
    }

    try {
      const eventListBrief = events.slice(0, 50).map((ev: any) => ({
        id: String(ev.id),
        title: ev.title || "",
        category: ev.category || "",
        start_date: ev.start_date || ev.date || "",
        end_date: ev.end_date || "",
        time: ev.start_time || ev.time || "",
        location: ev.location || "",
        description: ev.description || "",
        price: ev.price || "",
        organizer: ev.organizer || "",
        requirements: ev.requirements || "",
        tags: ev.tags || ""
      }));

      const sysInstruction = `You are Jane, the AI event specialist and local concierge for "Unlocked" in Valencia.
Your role is to understand the user's natural language request (in English, French, Spanish, or any language) and search across the entire event sheet (title, description, category, location, organizer, price, requirements, tags, dates) to find the best matching events from the catalog.

Evaluate each event based on:
1. Activity/Theme matching: (e.g., "jazz" or "concert" matches Music/Concert events; "kids" or "enfants" or "famille" matches Family/Kids events; "wine" or "tapas" or "gastronomie" matches Food & Wine events; "museum", "art", "peinture" matches Art/Museum events).
2. Audience / Vibe: (e.g. romantic date, expat social meetup, outdoor chill, learning workshop).
3. Timing / Date / Location / Full Details: (e.g., this weekend, evening, Malvarrosa beach, Ruzafa, City of Arts and Sciences, specific keywords anywhere in the event description).

Scoring rules:
- DIRECT MATCH (70 - 100): The event directly matches the requested topic, vibe, activity, or target audience based on its full description and details.
- PARTIAL / RELATED MATCH (20 - 65): The event is in a related or complementary category that the user might also enjoy.
- UNRELATED (0): The event has nothing to do with what the user is looking for.

Output format:
- exactMatchFound: boolean (true if at least one event scores >= 60).
- summaryMessage: A friendly, concise message from Jane in the language of the user's query (English/French/Spanish):
  * If matches found: e.g. "Jane a sélectionné 3 événements parfaits pour votre recherche :" or "Jane found 2 great events matching your search:"
  * If no direct match: e.g. "Jane n'a pas trouvé d'événement exact pour votre demande, mais voici d'autres sorties incontournables à Valence :" or "Jane couldn't find an exact match for your request, but here are some popular upcoming events in Valencia:"
- results: Array of objects with "id", "score" (0-100), and "reason" (a 1-sentence friendly highlight in the user's language explaining why Jane picked this event).`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `User Query: "${query.trim()}"

Available Events:
${JSON.stringify(eventListBrief, null, 2)}`,
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
                    reason: { type: Type.STRING }
                  },
                  required: ["id", "score", "reason"]
                }
              }
            },
            required: ["exactMatchFound", "results"]
          },
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
      const exactMatchFound = parsed.exactMatchFound ?? rawResults.some((r: any) => (r.score || 0) >= 60);
      const summaryMessage = parsed.summaryMessage || null;

      // Filter results to only positive scores and sort by score descending
      const validResults = rawResults
        .filter((r: any) => typeof r.score === 'number' && r.score > 0)
        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

      return res.json({
        exactMatchFound,
        summaryMessage,
        results: validResults
      });
    } catch (error: any) {
      console.error("[api] Jane AI Event matching error:", error);
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
        return res.status(429).json({ error: "Jane is currently very busy! Please wait a few seconds and try again." });
      }
      return res.status(500).json({ error: error.message || "Failed to match events with Jane." });
    }
  });

  // Agentic AI real-time event discovery endpoint (Perplexity-style, zero-hallucination)
  app.post("/api/search-events", async (req, res) => {
    const { query, location, month, category, existingTitles } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "The 'query' parameter is required." });
    }

    const searchLocation = location || "Valencia, Spain and surrounding Valencian Community (Ruzafa, El Carmen, Marina, Ciutat de les Arts i les Ciències, Palau de les Arts, IVAM, La Rambleta, Alboraya, El Saler, Sagunto)";
    const targetMonth = month && month !== "All Months / Upcoming" ? month : "upcoming months";
    const targetCategory = category && category !== "All Categories" ? category : null;

    const categoryDirective = targetCategory
      ? `\n\nSTRICT CATEGORY TARGETING DIRECTIVE:\nFocus specifically on finding events that strictly belong to the category "${targetCategory}". Ensure every returned event is relevant to this category.`
      : '';

    const exclusionList = Array.isArray(existingTitles) && existingTitles.length > 0
      ? `\n\nDATABASE DEDUPLICATION DIRECTIVE:\nDO NOT return events that are already saved in the database. Exclude any event with a title matching or similar to these existing database titles:\n${existingTitles.slice(0, 40).map((t: string) => `- "${t}"`).join('\n')}\nOnly return NEW undiscovered events.`
      : '';

    try {
      const sysInstruction = `You are an elite, real-time event discovery agent like Perplexity AI, specialized in finding VERIFIED, REAL, HIGH-PROFILE, AND RELEVANT upcoming events in Valencia (Spain) and the surrounding region.

CRITICAL ZERO-HALLUCINATION & FACTUALITY DIRECTIVES:
1. NEVER INVENT OR FABRICATE ANY EVENT, DATE, VENUE, ORGANIZER, ARTIST, OR TICKET DETAILS.
2. Every single returned event MUST be strictly grounded in real-time Google Search web results for real events happening in Valencia during the requested timeframe: ${targetMonth}.${categoryDirective}
3. Conduct a DEEP AND THOROUGH SEARCH. Search for popular, famous, major, and culturally relevant events across key venues in Valencia, including:
   - Performing Arts & Opera: Palau de les Arts Reina Sofía, Teatro Principal, Teatro Olympia, La Rambleta, Sala Off
   - Classical & Music: Palau de la Música, Plaza de Toros, Marina de Valencia, Ciutat de les Arts i les Ciències
   - Museums & Exhibitions: IVAM, Bombas Gens, CAIXAFORUM Valencia, MuVIM, Centro del Carmen (CCCC), Museo de Bellas Artes
   - Fairs & Innovation: Feria Valencia, Veles e Vents, Roig Arena / Fonteta
   - Gastronomy, Outdoor & Expat Meetups: Jardines del Real / Viveros, Jardín del Turia, Mercado de Colón, Ruzafa & El Carmen galleries
4. Aim to discover 8 to 12 top verified real events matching the user request for ${targetMonth}.
5. If no verified real event is found for a specific query, return an empty array [] in "events" and explain in "summary" in clear English.${exclusionList}

TICKETING & PURCHASE URL DIRECTIVE (CRITICAL):
- For events requiring payment / admission fee / tickets (e.g. concerts, theater, cooking classes, museum entry, festivals):
  * "is_free": false
  * "price": precise ticket price or range, e.g. "From 15€", "25€ - 65€", "55€ per person"
  * "ticket_url": direct official ticketing website URL (e.g. lesarts.com, feverup.com, ivam.es, teatrolympia.com, entradas.com, ticketmaster.es, venue booking page)
  * INSIDE the "description" under "**💡 Good to know (tips)**", ALWAYS include:
    - 🎟️ **Tickets & Pricing**: **[price]** — [Buy Official Tickets]([ticket_url])
  * INSIDE the "description" under "**🔗 More information**", ALWAYS include:
    - 🎟️ **Official Ticket Purchase**: [Buy Tickets / Book Online]([ticket_url])
- For free events:
  * "is_free": true
  * "price": "Free"
  * "ticket_url": registration link if RSVP is required, or null

FOR EACH REAL EVENT FOUND:
- title: Complete official title of the event
- start_date: Standardized date string, e.g., "OCT 15", "NOV 02", or "2026-10-15"
- end_date: Standardized end date string ONLY if the event spans multiple distinct days, e.g., "OCT 18". CRITICAL: If the event takes place on a single day or if start_date and end_date are on the same day, end_date MUST be null (publish only start_date).
- start_time: Formatted start time, e.g., "20:00" or "08:00 PM"
- end_time: Formatted end time or null
- location: Complete venue name and precise street address with postal code in Valencia (e.g., "Palau de les Arts Reina Sofía, Av. del Professor López Piñero 1, 46013 València")
- category: One of "Art", "Theater", "Music", "Culture", "Tech", "Gastronomy", "Community", "Sports", "Workshops"
- image: High quality real photo URL or relevant Unsplash image URL matching the specific theme
- is_free: Boolean (true if 100% free admission, false if paid)
- price: Formatted price string (e.g. "Free", "From 20€", "35€")
- ticket_url: Official ticketing or booking URL if paid, or registration URL
- description: Comprehensive factual Markdown summary generously populated with vibrant, friendly, relevant emojis INSIDE every section's content (e.g., ✨ 🎭 🎶 🍷 🎨 📍 💡 👥 🎟️ 🌟 🏛️ 🥘 🕒 🚇 💶 🤝) to make reading engaging and visual.
  BOLD HIGHLIGHTING DIRECTIVE: Put key terms, artist names, show titles, venue highlights, ticket prices, and important keywords in **bold** text (e.g., **Palau de les Arts**, **25€ to 75€**, **Verdi Requiem**).
  Strictly format into these FOUR structured sections, ensuring the bullet points and content of EVERY section begin with contextual emojis:

  **✨ What can you expect?**
  [Factual explanation of highlights with **bold** key terms and bullet points featuring themed emojis, e.g.:
  - 🎨 **Main Exhibition**: showcasing contemporary works...
  - 🎶 **Live Performance**: acoustic set by...]

  **🎯 Perfect for**
  [Target audience with friendly emojis and **bold** keywords, e.g.:
  - 👥 **Art & Culture Lovers**: seeking immersive experiences
  - 👨‍👩‍👧 **Families with Kids**: interactive daylight activities
  - 🍷 **Expats & Socializers**: meeting new people in Valencia]

  **💡 Good to know (tips)**
  [Practical tips with helpful emojis and **bold** info, e.g.:
  - 🎟️ **Tickets & Pricing**: from 15€ — [Buy Official Tickets](ticket_url)
  - ⏰ **Doors Open**: 30 minutes before showtime
  - 🚇 **Metro Access**: Line 3 to Colón station
  - 🅿️ **Parking**: available nearby]

  **🔗 More information**
  [Official venue website notes, ticketing website links, and organizer details with 🔗 Markdown links and 🌐 official websites, e.g.:
  - 🎟️ **Official Ticket Purchase**: [Buy Tickets / Book Online](ticket_url)
  - 🌐 **Venue Website**: [lesarts.com](https://www.lesarts.com)]
- coordinates: Estimated GPS coordinates { lat: number, lng: number } in Valencia region
- sources: List of 1-3 official website URLs and verified search source links for this event (e.g. { "title": "Official Venue Website", "url": "https://www.lesarts.com" })
- verified_real: true`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Perform a deep web search for REAL upcoming events in ${searchLocation} for target month/timeframe "${targetMonth}" matching request: "${query}". For every paid event, ensure you find and include the official ticket purchase URL and price details in the description and ticket_url. Return the most famous, popular, or relevant verified events.`,
        config: {
          tools: [
            { googleSearch: {} }
          ],
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "Detailed factual summary of the search results in English" },
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    start_date: { type: Type.STRING },
                    end_date: { type: Type.STRING },
                    start_time: { type: Type.STRING },
                    end_time: { type: Type.STRING },
                    location: { type: Type.STRING },
                    category: { type: Type.STRING },
                    image: { type: Type.STRING },
                    is_free: { type: Type.BOOLEAN },
                    price: { type: Type.STRING },
                    ticket_url: { type: Type.STRING },
                    description: { type: Type.STRING },
                    coordinates: {
                      type: Type.OBJECT,
                      properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                      },
                      required: ["lat", "lng"]
                    },
                    sources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          url: { type: Type.STRING }
                        },
                        required: ["title", "url"]
                      }
                    },
                    verified_real: { type: Type.BOOLEAN }
                  },
                  required: ["title", "start_date", "location", "category", "description"]
                }
              }
            },
            required: ["events"]
          },
          temperature: 0.1
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];

      // Extract search grounding metadata sources from Gemini response
      const candidate = response.candidates?.[0];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
      const defaultSources = groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => ({
          title: chunk.web?.title || "Google Search Grounding Source",
          url: chunk.web?.uri
        }));

      const categoryFallbackImages: Record<string, string> = {
        Art: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=1000",
        Theater: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80&w=1000",
        Music: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1000",
        Culture: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=1000",
        Tech: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000",
        Gastronomy: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000",
        Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1000",
        Community: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000"
      };

      const isSameDay = (d1?: string | null, d2?: string | null): boolean => {
        if (!d1 || !d2) return false;
        const s1 = d1.trim().toLowerCase();
        const s2 = d2.trim().toLowerCase();
        if (s1 === s2) return true;

        const clean1 = s1.replace(/,/g, '').replace(/\s+/g, ' ').trim();
        const clean2 = s2.replace(/,/g, '').replace(/\s+/g, ' ').trim();
        if (clean1 === clean2) return true;

        const p1 = Date.parse(d1);
        const p2 = Date.parse(d2);
        if (!isNaN(p1) && !isNaN(p2)) {
          const dt1 = new Date(p1);
          const dt2 = new Date(p2);
          return (
            dt1.getFullYear() === dt2.getFullYear() &&
            dt1.getMonth() === dt2.getMonth() &&
            dt1.getDate() === dt2.getDate()
          );
        }
        return false;
      };

      const enrichEventDescriptionWithEmojis = (rawDesc: string): string => {
        if (!rawDesc) return "";
        let desc = rawDesc;
        desc = desc.replace(/\*\*(?:[✨\s]*)?What can you expect\?\*\*/gi, "**✨ What can you expect?**");
        desc = desc.replace(/\*\*(?:[🎯\s]*)?Perfect for\*\*/gi, "**🎯 Perfect for**");
        desc = desc.replace(/\*\*(?:[💡\s]*)?Good to know \(tips\)\*\*/gi, "**💡 Good to know (tips)**");
        desc = desc.replace(/\*\*(?:[🔗\s]*)?More information\*\*/gi, "**🔗 More information**");

        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
        const sections = desc.split(/(\*\*.*?\*\*)/g);
        let currentHeader = "";

        const enrichedSections = sections.map((section) => {
          if (section.startsWith("**") && section.endsWith("**")) {
            currentHeader = section;
            return section;
          }
          if (!section.trim()) return section;

          const lines = section.split("\n");
          const enrichedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed || emojiRegex.test(trimmed)) return line;

            const bulletMatch = line.match(/^(\s*[-*•]\s*)(.*)$/);
            const prefix = bulletMatch ? bulletMatch[1] : "";
            const body = bulletMatch ? bulletMatch[2] : line;
            const lower = body.toLowerCase();

            let emoji = "✨";
            if (currentHeader.includes("What can you expect")) {
              if (/music|concert|jazz|song|band|singer|orchestra|dj|acoustic/i.test(lower)) emoji = "🎶";
              else if (/art|paint|sculpture|exhibit|gallery|visual|museum|photo/i.test(lower)) emoji = "🎨";
              else if (/theat|drama|stage|actor|play|comedy|performance/i.test(lower)) emoji = "🎭";
              else if (/food|wine|tapas|gastro|tasting|beer|dinner|lunch|chef|culinary/i.test(lower)) emoji = "🍷";
              else if (/dance|flamenco|ballet/i.test(lower)) emoji = "💃";
              else if (/tech|digital|code|innovation|startup|ai|screen/i.test(lower)) emoji = "💻";
              else if (/sport|run|match|race|fitness|yoga|marathon/i.test(lower)) emoji = "🏃";
              else if (/workshop|class|learn|craft|talk|conference/i.test(lower)) emoji = "🛠️";
              else if (/garden|outdoor|park|beach|terrace|sunset/i.test(lower)) emoji = "🌅";
              else emoji = "✨";
            } else if (currentHeader.includes("Perfect for")) {
              if (/family|child|kid|parent|baby/i.test(lower)) emoji = "👨‍👩‍👧";
              else if (/expat|international|newcomer|english|nomad|tourist/i.test(lower)) emoji = "🌍";
              else if (/music|concert|live music/i.test(lower)) emoji = "🎶";
              else if (/art|design|creative/i.test(lower)) emoji = "🎨";
              else if (/food|wine|tasting|foodie/i.test(lower)) emoji = "🍷";
              else if (/couple|date|romantic/i.test(lower)) emoji = "💑";
              else if (/student|youth|teen/i.test(lower)) emoji = "🎓";
              else if (/sport|runner|active|athletic/i.test(lower)) emoji = "👟";
              else emoji = "👥";
            } else if (currentHeader.includes("Good to know")) {
              if (/ticket|price|fee|cost|admission|free|gratis|entry|€|euro/i.test(lower)) emoji = "🎟️";
              else if (/metro|bus|transport|train|tram|station|bike|valenbisi/i.test(lower)) emoji = "🚇";
              else if (/time|hour|door|schedule|start|duration|arrive|early/i.test(lower)) emoji = "⏰";
              else if (/park|car|garage|vehicle/i.test(lower)) emoji = "🅿️";
              else if (/wheelchair|access|reduced mobility|disabilit/i.test(lower)) emoji = "♿";
              else if (/dress|wear|clothes|jacket/i.test(lower)) emoji = "👔";
              else if (/language|english|spanish|valencian|audio/i.test(lower)) emoji = "🗣️";
              else if (/weather|rain|sun|outdoor|indoor/i.test(lower)) emoji = "☀️";
              else emoji = "💡";
            } else if (currentHeader.includes("More information")) {
              if (/ticket|book|buy|reserve|entry/i.test(lower)) emoji = "🎟️";
              else if (/site|web|http|url|official|link|page/i.test(lower)) emoji = "🌐";
              else if (/phone|call|contact|email|whatsapp/i.test(lower)) emoji = "📱";
              else if (/location|address|venue|map|google/i.test(lower)) emoji = "📍";
              else emoji = "🔗";
            }

            if (bulletMatch) {
              return `${prefix}${emoji} ${body}`;
            } else {
              return `${emoji} ${line}`;
            }
          });
          return enrichedLines.join("\n");
        });
        return enrichedSections.join("");
      };

      const formattedEvents = rawEvents.map((ev: any, idx: number) => {
        const id = `ai-event-${Date.now()}-${idx}`;
        const sources = (Array.isArray(ev.sources) && ev.sources.length > 0)
          ? ev.sources
          : defaultSources;

        const fallbackImg = categoryFallbackImages[ev.category] || categoryFallbackImages.Culture;
        const sDate = ev.start_date || "UPCOMING";
        const eDate = (ev.end_date && !isSameDay(sDate, ev.end_date)) ? ev.end_date : null;

        // Auto-extract or fallback ticket_url
        let ticketUrl = ev.ticket_url;
        if (!ticketUrl && sources && sources.length > 0) {
          const ticketingSource = sources.find((s: any) => 
            /ticket|entrada|billet|booking|fever|lesarts|eventbrite|ivam|palau/i.test(s.url || '') ||
            /ticket|entrada|billet|booking|fever|lesarts|eventbrite|ivam|palau/i.test(s.title || '')
          );
          if (ticketingSource?.url) {
            ticketUrl = ticketingSource.url;
          }
        }

        const isFree = typeof ev.is_free === 'boolean' 
          ? ev.is_free 
          : (ev.price ? ev.price.toLowerCase().includes('free') || ev.price.toLowerCase().includes('gratis') : false);

        return {
          id,
          title: ev.title,
          date: sDate,
          start_date: sDate,
          end_date: eDate,
          time: ev.start_time || "TBA",
          start_time: ev.start_time || "TBA",
          end_time: ev.end_time || null,
          location: ev.location || "Valencia, Spain",
          category: ev.category || "Culture",
          image: (ev.image && ev.image.startsWith('http')) ? ev.image : fallbackImg,
          description: enrichEventDescriptionWithEmojis(ev.description || ""),
          coordinates: ev.coordinates && ev.coordinates.lat ? ev.coordinates : { lat: 39.4699, lng: -0.3763 },
          verified_real: true,
          ticket_url: ticketUrl || null,
          price: ev.price || (isFree ? 'Free' : null),
          is_free: isFree,
          sources: sources.slice(0, 5)
        };
      });

      return res.json({
        summary: parsed.summary || `Found ${formattedEvents.length} verified real events in Valencia for ${targetMonth}.`,
        events: formattedEvents,
        search_groundings: defaultSources
      });
    } catch (error: any) {
      console.error("[api] Event Search AI error:", error);
      return res.status(500).json({ error: error.message || "Failed to search events at this time." });
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

startServer();
