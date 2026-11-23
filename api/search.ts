import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

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

// Global in-memory cache for fast repeated queries
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours
const MAX_CACHE_SIZE = 250;

function getCachedResult(key: string): any | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResult(key: string, data: any) {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

export async function processSearch(query: string, professionals: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const missingErr: any = new Error("GEMINI_API_KEY is not configured on the server.");
    missingErr.status = 503;
    throw missingErr;
  }

  if (!query || !query.trim() || !professionals || !Array.isArray(professionals)) {
    return { exactMatchFound: false, summaryMessage: null, results: [] };
  }

  const cleanKey = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cacheKey = `v7_fl31_${cleanKey}__${professionals.length}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Encode ALL professionals (up to 300) into an ultra-compact pipe-delimited table
  // (~65% fewer input tokens than JSON, so Jane sees the full directory without dropping pros at 35)
  // Note: Reviews/ratings are deliberately excluded so they NEVER influence the Jane match score
  const cleanCell = (val: any, maxLen = 120) =>
    String(val ?? '')
      .replace(/[|\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, maxLen);

  const directoryRows = professionals.slice(0, 300).map((p: any) => {
    const cats = Array.isArray(p.categories) && p.categories.length > 0
      ? p.categories.join(', ')
      : (p.category || p.profession || '');
    const langs = Array.isArray(p.languages) ? p.languages.join(', ') : '';
    return [
      cleanCell(p.id, 40),
      cleanCell(p.name, 60),
      cleanCell(p.company_name, 50),
      cleanCell(cats, 60),
      cleanCell(langs, 50),
      cleanCell(p.location, 45),
      p.is_recommended === false ? '0' : '1',
      cleanCell(p.bio || p.description, 120)
    ].join('|');
  }).join('\n');

  const sysInstruction = `You are Jane, the AI matching assistant for "MyCityUnlocked", a local professionals directory in Valencia, Spain.
Match ALL relevant professionals from the pipe-delimited directory (ID|Name|Company|Category|Languages|Location|Rec|Bio) to the user's request.

RULES:
1. NO REVIEW BIAS: Score purely on objective specialty, symptom/need fit, location, and language. Never favor older listings over new ones.
2. SYMPTOMS & MULTI-DISCIPLINE MATCHING:
   - Back/neck/muscle/joint pain ("mal de dos", "back pain", "sciatica", "hernia"): match ALL relevant disciplines in the list (Physiotherapists/Kiné/Fisio, Osteopaths, Chiropractors, Doctors/GP/Sports Medicine, Therapeutic Massage/Acupuncture) as strong matches (75-95).
   - Stress/anxiety/burnout/mental health: match Psychologists, Therapists, Counselors, Life Coaches.
   - Home leaks/repairs/renovation ("fuite d'eau", "water leak", "bathroom"): match Plumbers/Fontaneros, Handymen/Manitas, Electricians, Contractors (never wellness/lymphatic drainage).
   - Relocation/moving ("déménagement", "moving"): match Movers, Real Estate Agents, Relocation/Gestors, Handymen.
   - Legal/tax/business/visa ("autonomo", "NIE", "taxes"): match Lawyers/Abogados/Avocats, Gestors, Tax Advisors, Accountants.
   - Dental/teeth: match Dentists, Orthodontists, Oral Surgeons.
3. MULTILINGUAL SYNONYMS (EN/FR/ES/CA): Recognize all translations (e.g. coiffeur/peluquero/hairdresser/barber; médecin/médico/doctor/GP; plombier/fontanero/plumber; agent immobilier/inmobiliaria/realtor; kiné/fisioterapeuta/physiotherapist; avocat/abogado/lawyer).
4. LOCATION: "Valencia" matches Valencia city and metro towns (Ruzafa, Carmen, Campanar, Alboraya, Paterna, Torrent, La Eliana, Bétera, etc.).
5. SPOKEN LANGUAGE (HIGHEST PRIORITY): If a spoken language is requested ("qui parle français", "French speaking", "habla español", etc.) and matching pros speak it, ONLY return those speakers (score 75-100) and omit non-speakers. If none speak it, return closest trade matches with lower scores and mention it in summaryMessage.
6. COMPREHENSIVE SCORING: Return ALL matching pros (both Rec=1 community-recommended at 85-95 and Rec=0 Google-sourced at 70-80; adjacent alternatives 20-50). Omit unrelated pros (do NOT output score 0 entries).
7. ENGLISH & CONCISE OUTPUT: ALWAYS write "summaryMessage" (1-2 friendly first-person English sentences, max 25 words) and each "reasonUrlExcerpt" (1 concise English sentence, max 16 words) in ENGLISH regardless of query language. Set exactMatchFound=true if any result has score >= 40.`;

  // Exclusively use gemini-3.1-flash-lite with ThinkingLevel.MINIMAL for fastest latency & highest quota
  const modelName = "gemini-3.1-flash-lite";
  let lastError: any = null;
  let responseText = "";

  const isTransient503 = (err: any) => {
    const st = err?.status || err?.statusCode || err?.code;
    if (st === 503) return true;
    const msg = String(err?.message || "").toLowerCase();
    return msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand");
  };

  const callWithTimeout = async (timeoutMs: number) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const timeoutErr: any = new Error(`Model ${modelName} timed out after ${timeoutMs}ms`);
        timeoutErr.status = 504;
        reject(timeoutErr);
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: `Query: "${query}"\n\nID|Name|Company|Category|Languages|Location|Rec|Bio\n${directoryRows}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                exactMatchFound: { type: Type.BOOLEAN, description: "True if at least one direct match (score >= 40) is found." },
                summaryMessage: { type: Type.STRING, description: "Short, friendly 1-2 sentence explanation (max 25 words) in English from Jane." },
                results: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "The professional's ID as a string" },
                      score: { type: Type.INTEGER, description: "Relevancy match score from 1 to 100" },
                      reasonUrlExcerpt: { type: Type.STRING, description: "Concise 1-sentence match explanation in English (max 16 words)" }
                    },
                    required: ["id", "score", "reasonUrlExcerpt"]
                  }
                }
              },
              required: ["exactMatchFound", "summaryMessage", "results"]
            }
          }
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await callWithTimeout(14000);
      if (response && response.text) {
        responseText = response.text;
        break;
      }
    } catch (err: any) {
      lastError = err;
      if (attempt === 1 && isTransient503(err)) {
        console.warn(`[api/search] ${modelName} hit transient 503, retrying once in 700ms...`);
        await new Promise((resolve) => setTimeout(resolve, 700));
        continue;
      }
      break;
    }
  }

  if (!responseText) {
    throw lastError || new Error("Jane AI model failed to generate a response.");
  }

  let parsedData: any = {};
  try {
    const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsedData = JSON.parse(cleaned || "{}");
  } catch {
    const firstBrace = responseText.indexOf("{");
    const lastBrace = responseText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      parsedData = JSON.parse(responseText.slice(firstBrace, lastBrace + 1));
    }
  }

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

  // Drop zero-score noise if any slipped through
  results = results.filter((r: any) => r && r.id != null && (Number(r.score) || 0) > 0);

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
      if (!summaryMessage) {
        summaryMessage = `Here are the recommended professionals who speak ${requestedLangs.join(', ')}.`;
      }
    }
  }

  const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
  if (!hasStrongMatch) {
    exactMatchFound = false;
  }

  const outputPayload = { exactMatchFound, summaryMessage, results };
  setCachedResult(cacheKey, outputPayload);
  return outputPayload;
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
    console.error("[api/search] Jane Gemini AI matching error:", error?.message || error);
    if (isQuotaOrRateLimitError(error)) {
      return res.status(429).json({
        error: "Jane is currently very busy! Please wait a few seconds and try again."
      });
    }
    const status = Number(error?.status || error?.statusCode) || 500;
    if (status === 504) {
      return res.status(504).json({
        error: "Jane is taking longer than expected right now. Please try again in a few seconds."
      });
    }
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return res.status(safeStatus).json({
      error: error?.message || "Jane AI search is temporarily unavailable. Please try again shortly."
    });
  }
}
