import { GoogleGenAI, Type } from "@google/genai";
import { 
  matchProsLocally, 
  preFilterCandidatesForGemini,
  detectLanguagesInQuery,
  proSpeaksAnyRequestedLanguage
} from "../src/services/janeMatchingEngine";

function detectRequestedLanguages(query: string): string[] {
  return detectLanguagesInQuery(query);
}

function proSpeaksAnyLanguage(pro: any, requestedLanguages: string[]): boolean {
  return proSpeaksAnyRequestedLanguage(pro, requestedLanguages);
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
  if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
    return { exactMatchFound: false, summaryMessage: null, results: [] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[api/search] No GEMINI_API_KEY present, using Jane Local Matcher");
    return matchProsLocally(query, professionals);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // 1. Intelligent Candidate Pre-filtering:
    // Pre-filter to top 36 candidates to reduce token payload by 85%+
    const candidatePros = preFilterCandidatesForGemini(query, professionals, 36);

    // Compact pro representation to keep prompt tokens well below rate limits
    // Note: Reviews/ratings are deliberately excluded so they NEVER influence the Jane match score
    const proListBrief = candidatePros.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      company_name: p.company_name || "",
      category: p.category || p.profession || "",
      categories: p.categories || (typeof p.profession === "string" ? p.profession.split(",").map((s: string) => s.trim()) : []),
      bio: (p.bio || p.description || "").slice(0, 150),
      top_qualities: (p.top_qualities || []).slice(0, 3),
      languages: p.languages || [],
      location: p.location || "",
      is_recommended: p.is_recommended ?? true
    }));

    const sysInstruction = `You are an expert matching AI assistant ("Jane") for "Unlocked" - a community-curated directory of verified local professionals in Valencia, Spain.
Your purpose is to deeply understand the user's natural language request and match ALL relevant professionals from the directory.

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

3. COMPREHENSIVE RESULTS:
   - Return ALL qualifying professionals in the provided directory whose skills match the need.
   - Do NOT stop after 1 or 2 entries if more matching professionals are available.
   - DIRECT MATCH (Score 70-100): Matches requested trade/discipline and location.
   - ADJACENT / ALTERNATIVE (Score 20-50): Neighboring service or town.
   - UNRELATED (Score 0): Omit or score 0.

4. PRIORITIZATION:
   - Community-vetted professionals (is_recommended: true) should receive a slight score boost (e.g. 85-95) over Google-sourced listings (is_recommended: false, scored 70-80).
   - Both recommended and non-recommended pros must be returned if they match.

5. "exactMatchFound" & "summaryMessage":
   - If at least one professional has score >= 60: set "exactMatchFound" to true, and "summaryMessage" to null!
   - Set "exactMatchFound" to false ONLY if no professional matches the request. In that case, explain briefly in the user's query language what was found.

6. Under "reasonUrlExcerpt" for each matched professional, write a concise sentence explaining why they are recommended for this specific problem (e.g. "Physiotherapist specialized in spine rehabilitation and back pain", "Osteopath offering gentle postural realignment").

7. SPOKEN LANGUAGE REQUIREMENT (HIGHEST PRIORITY):
   - If the query explicitly asks for a language (e.g. "qui parle français", "french speaking", "habla español", etc.):
     * If matching pros speak that language, ONLY return those who speak it (score 75-100) and omit non-speakers.
     * If none speak it, return other matching pros with lower scores and explain in summaryMessage.`;

    const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let lastError: any = null;
    let responseText = "";

    for (const modelName of candidateModels) {
      let attempts = 0;
      const maxAttempts = 2;
      let delayMs = 1000;

      while (attempts < maxAttempts) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `User Query: "${query}"

Professionals:
${JSON.stringify(proListBrief)}`,
            config: {
              systemInstruction: sysInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  exactMatchFound: { type: Type.BOOLEAN, description: "True if direct match found for requested trade/service/symptom, false if not." },
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

          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          attempts++;
          const isQuota = isQuotaOrRateLimitError(err);
          console.warn(`[api/search] Model ${modelName} attempt ${attempts} failed (quota: ${isQuota}):`, err?.message || err);

          if (isQuota && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2;
          } else {
            break; // Try next fallback model
          }
        }
      }

      if (responseText) {
        break; // Successfully generated content
      }
    }

    if (!responseText) {
      console.warn("[api/search] All Gemini models were rate-limited or failed. Activating Jane Local Matcher failover...");
      return matchProsLocally(query, professionals);
    }

    const parsedData = JSON.parse(responseText || "{}");
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
  } catch (err: any) {
    console.warn("[api/search] Uncaught exception during search, falling back to local matcher:", err);
    return matchProsLocally(query, professionals);
  }
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
    console.warn("[api/search] Serverless search error, executing local failover:", error);
    const localResult = matchProsLocally(query || "", professionals || []);
    return res.status(200).json(localResult);
  }
}

