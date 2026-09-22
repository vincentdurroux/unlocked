import { GoogleGenAI, Type } from "@google/genai";

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
    str.includes("capacity")
  );
}

export async function processSearch(query: string, professionals: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
    return { exactMatchFound: false, summaryMessage: null, results: [] };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

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

1. QUERY PARSING & SYNONYMS (CRITICAL):
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

  const response = await ai.models.generateContent({
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

  // Spoken language post-filtering and prioritization
  const requestedLangs = detectRequestedLanguages(query);
  if (requestedLangs.length > 0) {
    const proLookup: Record<string, any> = {};
    professionals.forEach((p: any) => {
      if (p && p.id != null) proLookup[String(p.id)] = p;
    });

    const matchingSpeakers = results.filter((r: any) => {
      if ((r.score || 0) <= 0) return false;
      const pro = proLookup[String(r.id)];
      return pro && proSpeaksAnyLanguage(pro, requestedLangs);
    });

    if (matchingSpeakers.length > 0) {
      results = results
        .filter((r: any) => {
          const pro = proLookup[String(r.id)];
          return pro && proSpeaksAnyLanguage(pro, requestedLangs);
        })
        .map((r: any) => ({
          ...r,
          score: Math.max(r.score || 0, 75)
        }));

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

  const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
  if (!hasStrongMatch) {
    exactMatchFound = false;
  }

  return { exactMatchFound, summaryMessage, results };
}

// Vercel Serverless Function handler
export default async function handler(req: any, res: any) {
  // Handle CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { query, professionals } = body || {};

  try {
    const result = await processSearch(query, professionals);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[api/search] Serverless search error:", error);
    if (isQuotaOrRateLimitError(error)) {
      return res.status(429).json({
        error: "Jane is very busy right now! Please wait a few seconds and try again, or use the category list in filters to find the pro you need."
      });
    }
    return res.status(500).json({
      error: error.message || "Failed to process matching"
    });
  }
}
