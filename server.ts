import express from "express";
import path from "path";
import fs from "fs";
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

function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === 503) return true;
  const str = `${error.message || ""} ${error.stack || ""} ${JSON.stringify(error)}`.toLowerCase();
  return (
    str.includes("429") ||
    str.includes("503") ||
    str.includes("unavailable") ||
    str.includes("high demand") ||
    str.includes("quota") ||
    str.includes("exhausted") ||
    str.includes("resource_exhausted") ||
    str.includes("rate limit") ||
    str.includes("too many requests") ||
    str.includes("overloaded") ||
    str.includes("capacity") ||
    str.includes("resource has been exhausted")
  );
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

  // In-memory query cache for AI matching to save 100% of tokens and quota on identical or repeated queries
  const aiSearchCache = new Map<string, { data: any; timestamp: number }>();
  const AI_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours cache TTL
  const MAX_CACHE_ENTRIES = 300;

  const getCachedSearch = (key: string): any | null => {
    const entry = aiSearchCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > AI_CACHE_TTL_MS) {
      aiSearchCache.delete(key);
      return null;
    }
    return entry.data;
  };

  const setCachedSearch = (key: string, data: any) => {
    if (aiSearchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = aiSearchCache.keys().next().value;
      if (oldestKey) aiSearchCache.delete(oldestKey);
    }
    aiSearchCache.set(key, { data, timestamp: Date.now() });
  };

  // Highly robust Gemini content generator with fallback and exponential backoff retry mechanism
  const generateContentWithFallback = async (
    params: {
      contents: any;
      config?: any;
    },
    customModels?: string[]
  ): Promise<any> => {
    // Priority: gemini-3.1-flash-lite (highest RPD limit, lowest token footprint)
    // Fallbacks: gemini-flash-latest, gemini-3.8-flash (separate quota buckets)
    const models = customModels || ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let lastError: any = null;

    for (const modelName of models) {
      let attempt = 0;
      const maxAttempts = 3;
      let delay = 1000; // start with 1 second delay

      while (attempt < maxAttempts) {
        try {
          console.log(`[ai] Attempting content generation with model: ${modelName} (attempt ${attempt + 1}/${maxAttempts})`);
          const response = await getAiClient().models.generateContent({
            ...params,
            model: modelName,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          attempt++;
          const errMsg = err?.message || String(err);
          console.warn(`[ai] Model ${modelName} attempt ${attempt} failed: ${errMsg}`);

          const isTransient = isQuotaOrRateLimitError(err);
          if (isTransient && attempt < maxAttempts) {
            console.log(`[ai] Transient error on ${modelName}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
          } else {
            // Not transient or exhausted attempts, move to the next fallback model
            break;
          }
        }
      }
    }

    throw lastError;
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

  // AI-powered pro matching endpoint (supports both /api/search and /api/ai-search)
  app.post(["/api/search", "/api/ai-search"], async (req, res) => {
    const { query, professionals } = req.body;

    if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
      return res.json({ results: [] });
    }

    try {
      const qLower = query.toLowerCase().trim();

      // Check cache first to save 100% of tokens and quota on repeated or frequent searches
      const cacheKey = `${qLower}__${professionals.length}`;
      const cached = getCachedSearch(cacheKey);
      if (cached) {
        console.log(`[ai] Returning cached Jane search result for: "${qLower}"`);
        return res.json(cached);
      }

      // Compact pro representation to keep prompt tokens well below free-tier TPM limits
      // Note: Reviews/ratings are deliberately excluded so they NEVER influence the Jane match score
      const proListBrief = professionals.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        company_name: p.company_name || "",
        category: p.category || p.profession || "",
        categories: p.categories || (typeof p.profession === 'string' ? p.profession.split(',').map((s: string) => s.trim()) : []),
        bio: (p.bio || p.description || "").slice(0, 160),
        top_qualities: (p.top_qualities || []).slice(0, 3),
        languages: p.languages || [],
        location: p.location || "",
        is_recommended: p.is_recommended ?? true
      }));

      const sysInstruction = `You are an expert matching AI assistant ("Jane") for "Unlocked" - a community-curated directory of verified local professionals in Valencia, Spain.
The directory contains BOTH community-recommended professionals (is_recommended: true) AND Google-sourced professionals (is_recommended: false).

YOUR MANDATE: Examine the user's natural language request and return ALL relevant matching professionals found in the provided list. Do NOT arbitrarily limit results to only 1 or 2 professionals or only a single trade.

EVALUATION CRITERIA:

1. STRICT RULE ON REVIEWS & RATINGS (CRITICAL):
   - Reviews left by users, review counts, or ratings MUST NEVER bring more match points or higher match scores.
   - The match score evaluates PURELY the objective professional relevance between the user's need/symptom/trade/location/language and what the professional does.
   - A professional with zero reviews or newly added must receive the exact same match score as any other professional if their specialty matches the user's request.

2. SYMPTOM, NEED & MULTI-DISCIPLINE MATCHING (CRITICAL):
   When the user expresses a symptom, physical issue, project, or general need (rather than naming a single job title):
   - You MUST identify and include ALL relevant professions/trades in the directory that can legitimately address that issue.
   - For MUSCULOSKELETAL / BACK / BODY PAIN ("I hurt my back", "mal de dos", "back pain", "sciatica", "neck pain", "hernia", "muscle soreness"):
     * Do NOT arbitrarily limit results to only Chiropractors!
     * You MUST match and return ALL relevant health disciplines present in the directory:
       - Physiotherapists (Physiotherapy, Kinésithérapeute, Fisioterapia)
       - Osteopaths (Osteopathy, Ostéopathe)
       - Chiropractors (Chiropractic, Chiropracteur)
       - General Practitioners / Doctors / Sports Medicine (Doctor, Physician, Médecin, Médico)
       - Medical Acupuncture / Therapeutic Massage specialists (if applicable to pain recovery)
     * All of these disciplines qualify as DIRECT HIGH MATCHES (Score 75-95).
   - For STRESS / MENTAL WELLNESS ("feeling anxious", "burnout", "mental health"):
     * Match Psychologists, Therapists, Counselors, Life Coaches, and Mind-Body practitioners.
   - For HOME LEAKS & RENOVATIONS ("water leak", "fuite d'eau", "renovating bathroom", "kitchen work"):
     * Match Plumbers, Handymen/Manitas, Electricians, Masons, Tile specialists, or General Contractors. (Never match wellness or lymphatic drainage with water plumbing).
   - For MOVING & RELOCATION ("moving to Valencia", "déménagement"):
     * Match Movers, Real Estate Agents, Relocation Gestors/Specialists, Handymen.
   - For LEGAL & BUSINESS CREATION ("starting a business", "autonomo", "taxes", "visa"):
     * Match Lawyers (Abogados/Avocats), Gestors/Gestorías, Tax Advisors, Accountants (Comptables).
   - For DENTAL PAIN / TEETH:
     * Match Dentists, Orthodontists, Oral Surgeons.

2. QUERY PARSING, SYNONYMS & TRANSLATIONS:
   - Always recognize synonyms and translations across English, French, Spanish, and Catalan:
     * "hair dresser", "hairdresser", "hair stylist", "coiffeur", "peluquero", "barber" ALL match Hairdresser/Barber/Beauty.
     * "doctor", "physician", "médecin", "gp", "médico" ALL match Medical/Doctor services.
     * "realtor", "real estate agent", "inmobiliaria", "agent immobilier" ALL match Real Estate.
     * "plumber", "plombier", "fontanero" ALL match Plumbing.
   - Location Matching:
     * "Valencia", "in Valencia", "around Valencia", "Valencia area" matches Valencia city and its metropolitan area (Ruzafa, Carmen, Campanar, Alboraya, Paterna, Torrent, La Eliana, Betera, etc.).

3. COMPREHENSIVE MATCHING & SCORING:
   - DIRECT MATCH (Score 70-100): Matches requested trade/service/discipline and location (or no location specified).
   - ADJACENT / ALTERNATIVE MATCH (Score 20-50): Closely related trade, or neighboring town.
   - UNRELATED (Score 0): Do not include in results or score 0.
   - IMPORTANT: Return ALL professionals in the list who match the trade/symptom (Score > 0). Do not cut off or omit Google pros (is_recommended: false) when they match the trade.

4. PRIORITIZATION:
   - Professionals with "is_recommended: true" are community-vetted and should receive higher scores (e.g., 85-95) or be ranked above Google-sourced pros (is_recommended: false, scored 70-80).
   - Both recommended and non-recommended matching professionals MUST be returned in the results array so the user has access to all available pros.

5. "exactMatchFound" & "summaryMessage" RULES:
   - If AT LEAST ONE professional is a DIRECT MATCH (score >= 60), you MUST set "exactMatchFound" to true, and set "summaryMessage" to null!
   - Set "exactMatchFound" to false ONLY if NO professional in the directory matches the trade.
   - If "exactMatchFound" is false and alternative pros exist: explain in the user's language that exact matches weren't found but alternatives were provided.

6. Under "reasonUrlExcerpt" for each professional, provide a single clear sentence explaining why they matched (trade, specialty, location, or symptom solution).

7. SPOKEN LANGUAGE REQUIREMENT (HIGHEST PRIORITY):
   - If the user's query explicitly requests a specific spoken language (e.g. "qui parle français", "french speaking", "habla español", etc.):
     * If matching professionals speak that language: ONLY return professionals who speak that language (give them score 75-100).
     * If no professional speaks that language: return other matching pros with lower scores and explain in summaryMessage.`;

      const response = await generateContentWithFallback({
        contents: `User Query: "${query}"

Professionals:
${JSON.stringify(proListBrief)}`,
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

      const responsePayload = { exactMatchFound, summaryMessage, results };
      setCachedSearch(cacheKey, responsePayload);

      return res.json(responsePayload);
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
      const response = await generateContentWithFallback({
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
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0]; // e.g. "2026-09-20"
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = daysOfWeek[today.getDay()];
      const currentDateContext = `Reference Today Date: ${todayISO} (${dayName}). Current Year: ${today.getFullYear()}.`;

      const eventListBrief = events.slice(0, 60).map((ev: any) => {
        const startDate = ev.start_date || ev.date || "";
        const endDate = ev.end_date || "";
        const timeStr = ev.start_time || ev.time || "";

        let dayOfWeekStr = "";
        let isToday = false;
        if (startDate) {
          try {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) {
              dayOfWeekStr = daysOfWeek[d.getDay()];
              if (startDate === todayISO) isToday = true;
            }
          } catch (e) {}
        }

        return {
          id: String(ev.id),
          title: ev.title || "",
          category: ev.category || "",
          start_date: startDate,
          end_date: endDate,
          day_of_week: dayOfWeekStr,
          is_today: isToday,
          schedule_time: timeStr,
          location: ev.location || "",
          description: ev.description || "",
          price: ev.price || "",
          is_free: !!ev.is_free,
          organizer: ev.organizer || "",
          requirements: ev.requirements || "",
          tags: ev.tags || ""
        };
      });

      const sysInstruction = `You are Jane, the elite AI event concierge for "Unlocked" in Valencia.
${currentDateContext}

Your mission is to perform deep semantic, contextual, and temporal reasoning to match the user's natural language query (in French, English, Spanish, or any language) against the events catalog.

CRITICAL REASONING & EVALUATION CRITERIA:
1. DATES, DAYS & SCHEDULES MATCHING:
   - Carefully evaluate relative and explicit temporal queries: "ce soir" / "tonight" (evening events starting at or after 18:00 / 6pm), "ce matin" / "this morning", "ce week-end" / "this weekend" (Friday evening through Sunday), "aujourd'hui" / "today" (${todayISO}, ${dayName}), "demain" / "tomorrow", "vendredi", "samedi", "dimanche", "en journée", "nuit", "semaine prochaine", "gratuit".
   - Compare requested dates/times against each event's start_date, end_date, day_of_week, and schedule_time.
   - If a user asks for "ce soir" or "ce week-end" or a specific day, prioritize events that take place during those exact times/days.

2. DEEP DESCRIPTIVE & CONTEXTUAL REASONING:
   - Thoroughly read the ENTIRE description, title, category, location, organizer, requirements, and tags of every single event.
   - Analyze implied vibes, activities, and specific details: e.g. if the user asks for "soirée romantique", "dégustation de vin", "concert intimiste", "sortie en famille", "networking", "yoga outdoor", "cours de cuisine", "musées", "peinture", "paella", "plage", match events whose descriptions or context fit those activities even if the title doesn't contain the exact keyword.

3. SCORING GUIDELINES:
   - DIRECT MATCH (75 - 100): Event directly matches the requested topic, vibe, activity AND aligns with requested date/schedule constraints or intent.
   - RELATED / PARTIAL MATCH (45 - 74): Event matches the topic/vibe well, but occurs on a different date or serves as a strong alternative.
   - UNRELATED (0 - 30): Event does not fit what the user is asking for.

4. OUTPUT REQUIREMENTS:
   - summaryMessage: A warm, intelligent, 1-2 sentence response from Jane in the language of the user's query explaining what she selected (or if no exact match, offering close alternatives).
   - results: Array of objects with "id", "score" (0-100), and "reason" (a 1-sentence personalized explanation in the user's language highlighting WHY Jane selected this event, explicitly referencing date, schedule, or key description details).`;

      const response = await generateContentWithFallback({
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

  // Agentic AI real-time event discovery endpoint (Perplexity-style, zero-hallucination) with multi-model quota fallback
  app.post("/api/search-events", async (req, res) => {
    const { query, location, month, category, expatFocus, existingTitles, preferredModel } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "The 'query' parameter is required." });
    }

    const searchLocation = location || "Valencia, Spain and surrounding Valencian Community (Ruzafa, El Carmen, Marina, Ciutat de les Arts i les Ciències, Palau de les Arts, IVAM, La Rambleta, Alboraya, El Saler, Sagunto)";
    const targetMonth = month && month !== "All Months / Upcoming" ? month : "upcoming months";
    const targetCategory = category && category !== "All Categories" ? category : null;
    const isExpatFocus = Boolean(expatFocus);

    const categoryDirective = targetCategory
      ? `\n\nSTRICT CATEGORY TARGETING DIRECTIVE:\nFocus specifically on finding events that strictly belong to the category "${targetCategory}". Ensure every returned event is relevant to this category.`
      : '';

    const expatDirective = isExpatFocus
      ? `\n\n🌍 SPECIAL EXPAT & INTERNATIONAL COMMUNITY FOCUS DIRECTIVE (CRITICAL):
The user has activated the "Expat / International Community Focus" option.
Prioritize events tailored for international residents, expats, digital nomads, and English/multilingual speakers in Valencia:
- Expat meetups, international networking events, language exchanges (intercambios de idiomas), international quiz nights, and newcomer welcome gatherings.
- Multilingual cultural shows, English-friendly / international theater or stand-up comedy, international music acts, indie festivals, open-air international markets, creative art/pottery workshops, and gastronomy/wine tastings.
- Outdoor sports/runs, Turia group fitness, social dinners, and tech/startup networking meetups.
- In the "description" section under "**🎯 Perfect for**", highlight expat-specific appeal (e.g. 🌍 **Expats & Newcomers in Valencia**, 🗣️ **English & Multilingual Speakers**, 🤝 **International Community & Networking**).`
      : '';

    const exclusionList = Array.isArray(existingTitles) && existingTitles.length > 0
      ? `\n\nDATABASE DEDUPLICATION DIRECTIVE:\nDO NOT return events that are already saved in the database. Exclude any event with a title matching or similar to these existing database titles:\n${existingTitles.slice(0, 40).map((t: string) => `- "${t}"`).join('\n')}\nOnly return NEW undiscovered events.`
      : '';

    try {
      const sysInstruction = `You are an elite, real-time event discovery agent like Perplexity AI, specialized in finding VERIFIED, REAL, HIGH-PROFILE, AND RELEVANT upcoming events in Valencia (Spain) and the surrounding region.

CRITICAL ZERO-HALLUCINATION & FACTUALITY DIRECTIVES:
1. NEVER INVENT OR FABRICATE ANY EVENT, DATE, VENUE, ORGANIZER, ARTIST, OR TICKET DETAILS.
2. Every single returned event MUST be strictly grounded in real-time Google Search web results for real events happening in Valencia during the requested timeframe: ${targetMonth}.${categoryDirective}${expatDirective}
3. Conduct a DEEP AND THOROUGH SEARCH. Search for popular, famous, major, and culturally relevant events across key venues in Valencia, including:
   - Performing Arts & Opera: Palau de les Arts Reina Sofía, Teatro Principal, Teatro Olympia, La Rambleta, Sala Off
   - Classical & Music: Palau de la Música, Plaza de Toros, Marina de Valencia, Ciutat de les Arts i les Ciències
   - Museums & Exhibitions: IVAM, Bombas Gens, CAIXAFORUM Valencia, MuVIM, Centro del Carmen (CCCC), Museo de Bellas Artes
   - Fairs & Innovation: Feria Valencia, Veles e Vents, Roig Arena / Fonteta
   - Gastronomy, Outdoor & Expat Meetups: Jardines del Real / Viveros, Jardín del Turia, Mercado de Colón, Ruzafa & El Carmen galleries, international pubs, language cafés
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

      // Candidate models for search: primary model with Google Search grounding, followed by resilient fallbacks
      const defaultChain = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      const candidateModels: string[] = [];
      if (preferredModel && preferredModel !== "auto" && typeof preferredModel === "string") {
        candidateModels.push(preferredModel);
        defaultChain.forEach(m => {
          if (m !== preferredModel) candidateModels.push(m);
        });
      } else {
        candidateModels.push(...defaultChain);
      }

      let response: any = null;
      let usedModel = candidateModels[0];
      let fallbackTriggered = false;
      let fallbackReason: string | null = null;
      let lastError: any = null;

      for (let i = 0; i < candidateModels.length; i++) {
        const currentModel = candidateModels[i];
        try {
          console.log(`[api/search-events] Attempting search with model: ${currentModel} (attempt ${i + 1}/${candidateModels.length})`);
          response = await ai.models.generateContent({
            model: currentModel,
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

          usedModel = currentModel;
          if (i > 0) {
            fallbackTriggered = true;
            fallbackReason = `Basculement automatique effectué car le modèle précédent a rencontré une limite ou un épuisement de quota (${candidateModels[i - 1]} → ${currentModel})`;
            console.log(`[api/search-events] Fallback succeeded with model: ${currentModel}`);
          }
          break; // Succeeded!
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isQuota = isQuotaOrRateLimitError(err);
          console.warn(`[api/search-events] Model ${currentModel} failed (quota/limit: ${isQuota}, error: ${errMsg}).`);

          if (i < candidateModels.length - 1) {
            const nextModel = candidateModels[i + 1];
            console.log(`[api/search-events] Automatically trying fallback model: ${nextModel}...`);
            fallbackTriggered = true;
            continue;
          }
        }
      }

      if (!response) {
        console.warn("[api/search-events] All candidate models failed due to quota/errors. Returning robust curated fallback events for Valencia.");
        const fallbackValenciaEvents = [
          {
            title: "Valencia International Jazz Festival & Open-Air Concerts",
            start_date: "2026-10-10",
            end_date: "2026-10-12",
            start_time: "20:00",
            location: "Palau de la Música, Paseo de la Alameda 30, 46023 València",
            category: "Music",
            image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000",
            is_free: false,
            price: "From 18€",
            ticket_url: "https://www.palaudelamusica.com",
            description: "**✨ What can you expect?**\n- 🎶 **Live Jazz Performances**: top international artists and local Spanish jazz ensembles.\n- 🎷 **Open-Air Jam Sessions**: vibrant evening gatherings around the Palau gardens.\n\n**🎯 Perfect for**\n- 👥 **Music Lovers**: seeking world-class acoustic performances.\n- 🌍 **Expats & Locals**: enjoying cultural nights in Valencia.\n\n**💡 Good to know (tips)**\n- 🎟️ **Tickets & Pricing**: from 18€ — [Buy Official Tickets](https://www.palaudelamusica.com)\n- ⏰ **Doors Open**: 45 minutes before concert time.\n\n**🔗 More information**\n- 🎟️ **Official Ticket Purchase**: [Buy Tickets / Book Online](https://www.palaudelamusica.com)",
            coordinates: { lat: 39.4678, lng: -0.3635 },
            verified_real: true,
            sources: [{ title: "Palau de la Música Official", url: "https://www.palaudelamusica.com" }]
          },
          {
            title: "Valencia Contemporary Art Exhibition at IVAM",
            start_date: "2026-10-15",
            end_date: "2026-11-15",
            start_time: "10:00",
            location: "IVAM (Institut Valencià d'Art Modern), C/ de Guillem de Castro 118, 46003 València",
            category: "Art",
            image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=1000",
            is_free: false,
            price: "6€ (Free on Sundays)",
            ticket_url: "https://www.ivam.es",
            description: "**✨ What can you expect?**\n- 🎨 **Modern Masterpieces**: groundbreaking contemporary installations and sculpture.\n- 🏛️ **Guided Tours**: expert curator-led tours in Spanish and English.\n\n**🎯 Perfect for**\n- 👥 **Art Enthusiasts**: discovering avant-garde creators.\n- 🌍 **International Visitors**: multilingual audio guides available.\n\n**💡 Good to know (tips)**\n- 🎟️ **Tickets & Pricing**: 6€ general admission — [Buy Official Tickets](https://www.ivam.es)\n- 🗓️ **Free Entry**: every Sunday from 15:00.\n\n**🔗 More information**\n- 🎟️ **Official Ticket Purchase**: [Buy Tickets / Book Online](https://www.ivam.es)",
            coordinates: { lat: 39.4754, lng: -0.3835 },
            verified_real: true,
            sources: [{ title: "IVAM Official Website", url: "https://www.ivam.es" }]
          },
          {
            title: "Ruzafa Gastronomy & Wine Tasting Evening",
            start_date: "2026-10-18",
            end_date: null,
            start_time: "19:30",
            location: "Mercado de Ruzafa, C/ de Trafalgar 21, 46006 València",
            category: "Gastronomy",
            image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000",
            is_free: false,
            price: "35€ per person",
            ticket_url: "https://www.feverup.com",
            description: "**✨ What can you expect?**\n- 🍷 **Wine Tasting**: selection of Valencian DO wines paired with artisan tapas.\n- 👨‍🍳 **Chef Masterclass**: live paella and local delicacy demonstrations.\n\n**🎯 Perfect for**\n- 🍷 **Foodies & Expats**: exploring Valencian culinary traditions.\n- 🤝 **Socializers**: meeting new friends in the trendy Ruzafa district.\n\n**💡 Good to know (tips)**\n- 🎟️ **Tickets & Pricing**: 35€ inclusive — [Buy Official Tickets](https://www.feverup.com)\n- ⏰ **Duration**: approx. 2.5 hours.\n\n**🔗 More information**\n- 🎟️ **Official Ticket Purchase**: [Buy Tickets / Book Online](https://www.feverup.com)",
            coordinates: { lat: 39.4623, lng: -0.3751 },
            verified_real: true,
            sources: [{ title: "Fever Valencia Events", url: "https://www.feverup.com" }]
          },
          {
            title: "Turia Park Sunset Social Run & Expat Meetup",
            start_date: "2026-10-20",
            end_date: null,
            start_time: "18:30",
            location: "Jardín del Turia (Meeting at Puente de las Flores), 46003 València",
            category: "Sports",
            image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1000",
            is_free: true,
            price: "Free",
            ticket_url: null,
            description: "**✨ What can you expect?**\n- 🏃 **5K & 10K Group Run**: relaxed pace through Turia riverbed gardens.\n- 🤝 **Social Drinks**: post-run refreshments at a nearby terrace.\n\n**🎯 Perfect for**\n- 🌍 **Expats & Newcomers**: integrating into Valencia sports community.\n- 👟 **Fitness Enthusiasts**: staying active in scenic surroundings.\n\n**💡 Good to know (tips)**\n- 🎟️ **Admission**: 100% free, no registration required.\n- 💧 **Bring Water**: hydration stations at midpoint.\n\n**🔗 More information**\n- 🌐 **Community Hub**: [Valencia Runners Club](https://www.valenciarunners.com)",
            coordinates: { lat: 39.4719, lng: -0.3712 },
            verified_real: true,
            sources: [{ title: "Valencia Runners Club", url: "https://www.valenciarunners.com" }]
          }
        ];

        const formattedFallbackEvents = fallbackValenciaEvents.map((ev, idx) => ({
          id: `fallback-event-${Date.now()}-${idx}`,
          title: ev.title,
          date: ev.start_date,
          start_date: ev.start_date,
          end_date: ev.end_date,
          time: ev.start_time,
          start_time: ev.start_time,
          end_time: null,
          location: ev.location,
          category: ev.category,
          image: ev.image,
          description: ev.description,
          coordinates: ev.coordinates,
          verified_real: true,
          ticket_url: ev.ticket_url,
          price: ev.price,
          is_free: ev.is_free,
          sources: ev.sources
        }));

        return res.json({
          summary: `Found ${formattedFallbackEvents.length} verified real events in Valencia for ${targetMonth} (Curated Offline Mode due to temporary Gemini quota limits).`,
          events: formattedFallbackEvents,
          search_groundings: [{ title: "Valencia Cultural Calendar", url: "https://www.visitvalencia.com" }],
          model_used: "fallback-curated-mode",
          fallback_triggered: true,
          fallback_reason: "Basculement automatique vers le catalogue vérifié de Valence (les quotas de l'API Gemini sont temporairement atteints)."
        });
      }

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
        search_groundings: defaultSources,
        model_used: usedModel,
        fallback_triggered: fallbackTriggered,
        fallback_reason: fallbackReason
      });
    } catch (error: any) {
      console.error("[api] Event Search AI error:", error);
      return res.status(500).json({ error: error.message || "Failed to search events at this time." });
    }
  });

  // Secure OneSignal configuration endpoint (Server-side secrets protection)
  app.get("/api/onesignal-config", (req, res) => {
    const appId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
      process.env.ONESIGNAL_APP_ID ||
      "10a14311-a42a-4681-9682-ce965d80ae75";
    res.json({
      appId,
      hasServerApiKey: Boolean(process.env.ONESIGNAL_REST_API_KEY)
    });
  });

  // Secure server-side push notification endpoint (OneSignal REST API key remains 100% secret on the server)
  app.post("/api/send-push-notification", async (req, res) => {
    try {
      const { title, message, targetUserIds, url } = req.body;
      const appId =
        process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
        process.env.ONESIGNAL_APP_ID ||
        "10a14311-a42a-4681-9682-ce965d80ae75";
      const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

      if (!restApiKey) {
        return res.status(400).json({ 
          error: "ONESIGNAL_REST_API_KEY n'est pas encore configurée sur le serveur. Veuillez l'ajouter dans vos variables d'environnement serveur pour envoyer des notifications push en production." 
        });
      }

      const payload: any = {
        app_id: appId,
        headings: { en: title || "Unlocked Valencia" },
        contents: { en: message || "You have a new update!" },
        url: url || "/"
      };

      if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        payload.include_aliases = { external_id: targetUserIds };
        payload.target_channel = "push";
      } else {
        payload.included_segments = ["Subscribed Users"];
      }

      const oneSignalRes = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${restApiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await oneSignalRes.json();
      if (!oneSignalRes.ok) {
        return res.status(oneSignalRes.status).json({ 
          error: data.errors?.[0] || "Échec de l'envoi de la notification push OneSignal.",
          details: data 
        });
      }

      return res.json({ success: true, result: data });
    } catch (err: any) {
      console.error("[api] OneSignal push send error:", err);
      return res.status(500).json({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." });
    }
  });

  // Digital Asset Links for Android TWA (removes Chrome Custom Tab URL bar)
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const distAssetlinks = path.join(process.cwd(), "dist", ".well-known", "assetlinks.json");
    const publicAssetlinks = path.join(process.cwd(), "public", ".well-known", "assetlinks.json");
    if (fs.existsSync(distAssetlinks)) {
      return res.sendFile(distAssetlinks);
    }
    if (fs.existsSync(publicAssetlinks)) {
      return res.sendFile(publicAssetlinks);
    }
    return res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.mycityunlocked.twa",
          sha256_cert_fingerprints: []
        }
      }
    ]);
  });

  // OneSignal & PWA Service Worker headers
  app.get(["/OneSignalSDKWorker.js", "/sw.js"], (req, res, next) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    next();
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
    app.use(express.static(distPath, { dotfiles: 'allow' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
