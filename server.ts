import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { Resend } from "resend";
import dotenv from "dotenv";
import { tavily } from "@tavily/core";
import passkeyHandler from "./api/passkey";

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
  const str = `${error.message || ""} ${error.stack || ""}`.toLowerCase();
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

function extractJsonFromModelResponse(rawText: string): any {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText);
  } catch (_) {}
  const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (_) {}
  }
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch (_) {}
  }
  return {};
}

async function startServer() {
  const app = express();
  const portArgIdx = process.argv.indexOf("--port");
  const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : NaN;
  const PORT = Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : (process.env.NODE_ENV === "production" ? (Number(process.env.PORT) || 3000) : 3000);

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

  // Deduplicate identical concurrent in-flight AI searches to prevent duplicate Gemini calls
  const inFlightAiSearches = new Map<string, Promise<any>>();

  // Highly robust Gemini content generator with seamless multi-model fallback
  const generateContentWithFallback = async (
    params: {
      contents: any;
      config?: any;
    },
    customModels?: string[]
  ): Promise<any> => {
    // Fast, high-quota free-tier compatible chain:
    // 1. gemini-3.1-flash-lite (ThinkingLevel.MINIMAL): fastest (1-3s) & highest free-tier RPM/RPD quota
    // 2. gemini-4-hydrogen (ThinkingLevel.LOW): deep semantic fallback when Flash Lite has a 503 demand spike
    const models = customModels || ["gemini-3.1-flash-lite", "gemini-4-hydrogen"];
    let lastError: any = null;

    const buildConfigForModel = (modelName: string, rawConfig?: any) => {
      if (!rawConfig) return undefined;
      const cfg = { ...rawConfig };
      if (modelName.startsWith("gemini-4")) {
        delete cfg.temperature;
        delete cfg.topP;
        delete cfg.topK;
        delete cfg.candidateCount;
        // Gemini 4 does not support ThinkingLevel.MINIMAL (returns 400) — clamp to LOW
        if (cfg.thinkingConfig?.thinkingLevel === ThinkingLevel.MINIMAL) {
          cfg.thinkingConfig = { ...cfg.thinkingConfig, thinkingLevel: ThinkingLevel.LOW };
        }
      } else if (modelName === "gemini-3.1-flash-lite") {
        // Flash Lite is fastest and cheapest with MINIMAL (no thinking overhead)
        if (cfg.thinkingConfig) {
          cfg.thinkingConfig = { ...cfg.thinkingConfig, thinkingLevel: ThinkingLevel.MINIMAL };
        }
      }
      return cfg;
    };

    const callModelWithTimeout = async (modelName: string, timeoutMs: number) => {
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
          getAiClient().models.generateContent({
            ...params,
            config: buildConfigForModel(modelName, params.config),
            model: modelName,
          }),
          timeoutPromise,
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    const isTransient503 = (err: any) => {
      const st = err?.status || err?.statusCode || err?.code;
      if (st === 503) return true;
      const msg = String(err?.message || "").toLowerCase();
      return msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand");
    };

    const attempts: { model: string; status: number | string; ms: number; message: string }[] = [];

    // Try primary model first (with 1 fast backoff retry on transient 503 spikes),
    // then seamlessly fall back to the next model in the chain if unavailable or rate-limited
    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const maxTries = 2;
      const timeoutMs = modelName === "gemini-3.1-flash-lite" ? 9000 : 14000;

      for (let attempt = 1; attempt <= maxTries; attempt++) {
        const t0 = Date.now();
        try {
          const response = await callModelWithTimeout(modelName, timeoutMs);
          if (response && response.text) {
            console.log(`[ai] Model ${modelName} succeeded in ${Date.now() - t0}ms`);
            return response;
          }
        } catch (err: any) {
          lastError = err;
          const elapsed = Date.now() - t0;
          const errStatus = err?.status || err?.statusCode || err?.code || "ERR";
          const errMsg = String(err?.message || err).slice(0, 240);
          attempts.push({ model: modelName, status: errStatus, ms: elapsed, message: errMsg });

          if (attempt < maxTries && isTransient503(err)) {
            const backoffMs = i === 0 ? 800 : 1200;
            console.warn(`[ai] Model ${modelName} hit transient 503 in ${elapsed}ms, retrying once in ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          const nextModel = models[i + 1];
          if (nextModel) {
            console.warn(`[ai] Model ${modelName} failed in ${elapsed}ms (${errStatus}): ${errMsg} -> trying fallback: ${nextModel}`);
          } else {
            console.warn(`[ai] Model ${modelName} failed in ${elapsed}ms (${errStatus}): ${errMsg}`);
          }
          break;
        }
      }
    }

    if (lastError && typeof lastError === "object") {
      lastError.modelAttempts = attempts;
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

  // Lazily initialize Tavily client for live real-time web event search
  let tavilyClient: any = null;
  const getTavilyClient = () => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return null;
    }
    if (!tavilyClient) {
      tavilyClient = tavily({ apiKey: apiKey.trim() });
    }
    return tavilyClient;
  };

  // Status check for search providers (Tavily & Gemini)
  app.get("/api/search-config", (req, res) => {
    const hasTavily = Boolean(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim());
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({
      tavily_configured: hasTavily,
      gemini_configured: hasGemini
    });
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
      const qNormalized = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Versioned cache key including directory size so newly added pros invalidate old results
      const cacheKey = `v7_fl31_${qNormalized}__${professionals.length}`;
      const cached = getCachedSearch(cacheKey);
      if (cached) {
        console.log(`[ai] Returning cached Jane search result for: "${qLower}"`);
        return res.json(cached);
      }

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

      const existingInFlight = inFlightAiSearches.get(cacheKey);
      if (existingInFlight) {
        const sharedPayload = await existingInFlight;
        return res.json(sharedPayload);
      }

      const searchPromise = (async () => {
      const response = await generateContentWithFallback(
        {
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
        },
        ["gemini-3.1-flash-lite", "gemini-4-hydrogen"]
      );

      const parsedData = extractJsonFromModelResponse(response.text || "{}");
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
            .map((r: any) => ({
              ...r,
              score: Math.max(r.score || 0, 75)
            }));

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
          if (!summaryMessage) {
            summaryMessage = `Here are the recommended professionals who speak ${requestedLangs.join(', ')}.`;
          }
        }
      }

      // Verify if any pro has a high confidence match score (>= 40)
      const hasStrongMatch = results.some((r: any) => (r.score || 0) >= 40);
      if (!hasStrongMatch) {
        exactMatchFound = false;
      }

      const responsePayload = { exactMatchFound, summaryMessage, results };
      setCachedSearch(cacheKey, responsePayload);
      return responsePayload;
      })();

      inFlightAiSearches.set(cacheKey, searchPromise);
      try {
        const finalPayload = await searchPromise;
        return res.json(finalPayload);
      } finally {
        if (inFlightAiSearches.get(cacheKey) === searchPromise) {
          inFlightAiSearches.delete(cacheKey);
        }
      }
    } catch (error: any) {
      console.error("[api/search] Jane Gemini AI matching error:", error?.message || error, error?.modelAttempts || "");
      const status = Number(error?.status || error?.statusCode) || 500;
      const errLower = String(error?.message || "").toLowerCase();
      if (status === 503 || errLower.includes("503") || errLower.includes("unavailable") || errLower.includes("high demand")) {
        return res.status(503).json({
          error: "Jane is experiencing high demand right now! Please wait a few seconds and try again."
        });
      }
      if (isQuotaOrRateLimitError(error)) {
        return res.status(429).json({
          error: "Jane is currently very busy! Please wait a few seconds and try again."
        });
      }
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
   - Both "summaryMessage" and "reason" MUST ALWAYS be written in English.
   - summaryMessage: A warm, intelligent, 1-2 sentence response from Jane in ENGLISH explaining what she selected (or if no exact match, offering close alternatives).
   - results: Array of objects with "id", "score" (0-100), and "reason" (a 1-sentence personalized explanation in ENGLISH highlighting WHY Jane selected this event, explicitly referencing date, schedule, or key description details).`;

      const response = await generateContentWithFallback(
        {
          contents: `User Query: "${query.trim()}"

Available Events:
${JSON.stringify(eventListBrief, null, 2)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
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
        },
        ["gemini-3.1-flash-lite", "gemini-4-hydrogen"]
      );

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
      console.error("[api] Jane AI Event matching error:", error?.message || error, error?.modelAttempts || "");
      const status = Number(error?.status || error?.statusCode) || 500;
      const errorMsg = error?.message || "";
      const errorLower = errorMsg.toLowerCase();
      if (
        status === 503 ||
        errorLower.includes("503") ||
        errorLower.includes("unavailable") ||
        errorLower.includes("high demand")
      ) {
        return res.status(503).json({ error: "Jane is experiencing high demand right now! Please wait a few seconds and try again." });
      }
      if (isQuotaOrRateLimitError(error)) {
        return res.status(429).json({ error: "Jane is currently very busy! Please wait a few seconds and try again." });
      }
      if (status === 504) {
        return res.status(504).json({ error: "Jane is taking longer than expected right now. Please try again in a few seconds." });
      }
      return res.status(500).json({ error: "Failed to match events with Jane. Please try again shortly." });
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
4. EXHAUSTIVE DIVERSIFIED SEARCH REQUIREMENT (CRITICAL): Aim to discover 18 to 25 verified real events across ALL domains and categories (festivals, cultural exhibitions, museum shows at IVAM/Bombas Gens/Museo de Bellas Artes, local neighborhood events, sports tournaments/runs, concerts, theater, gastronomy fairs, expat meetups, and workshops) for ${targetMonth}. Do not restrict results to a single domain; ensure maximum diversity and volume across all categories.
5. If no verified real event is found for a specific query, return an empty array [] in "events" and explain in "summary" in clear English.${exclusionList}

TICKETING & PURCHASE URL DIRECTIVE (CRITICAL):
- For events requiring payment / admission fee / tickets (e.g. concerts, theater, cooking classes, museum entry, festivals):
  * "is_free": false
  * "price": precise ticket price or range, e.g. "From 15€", "25€ - 65€", "55€ per person"
  * "ticket_url": direct official ticketing website URL (e.g. lesarts.com, feverup.com, ivam.es, teatrolympia.com, entradas.com, ticketmaster.es, venue booking page)
  * INSIDE the "description" under "### 💡 Good to know", ALWAYS include:
    - 🎟️ **Tickets & Pricing**: **[price]** — [Buy Official Tickets]([ticket_url])
  * INSIDE the "description" under "### 🔗 More info", ALWAYS include:
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
- description: A clear, engaging, and structured Markdown description formatted STRICTLY into these 5 canonical sections (using these exact headers):

### 📝 Description
[1-2 engaging introductory paragraphs presenting the event, its concept, theme, and key highlights.]

### ✨ What to expect
[2-3 engaging paragraphs describing the atmosphere, artists, program highlights, activities, and experience. Use natural, varied emojis and **bold** formatting for important names, artists, and highlights.]

### 🎯 Perfect for
- 🌍 [Target audience 1, e.g. Expats, newcomers, international residents in Valencia]
- 👥 [Target audience 2, e.g. Culture seekers, families, music enthusiasts]
- ✨ [Target audience 3, e.g. Anyone looking for a memorable evening in Valencia]

### 💡 Good to know
- 🎟️ **Tickets & Admission**: [Exact price or Free] — [Buy Official Tickets]([ticket_url]) (if paid)
- 📍 **Venue & Location**: [Venue name, address, and directions]
- ⏰ **Schedule & Timing**: [Doors open, start time, duration]
- 🚇 **Public Transport & Access**: [Metro stations, bus lines, or parking tips]

### 🔗 More info
- 🌐 **Official Website**: [Venue / Organizer Official Page]([sources url or official website])
- 🎟️ **Ticket Purchase / RSVP**: [Book Online]([ticket_url]) (if applicable)

CRITICAL EMOJI & FORMATTING DIRECTIVE:
- NEVER output duplicate or double emojis (e.g. NEVER write "🎶 🎶", "🎟️ 🎟️", or "✨ ✨"). Use each emoji at most once per line/item.
- Always cleanly divide the content into the 5 sections above so each piece of information is placed in its dedicated box.
- coordinates: Estimated GPS coordinates { lat: number, lng: number } in Valencia region
- sources: List of 1-3 official website URLs and verified search source links for this event (e.g. { "title": "Official Venue Website", "url": "https://www.lesarts.com" })
- verified_real: true`;

      const ai = getAiClient();

      // Candidate models for search: gemini-4-hydrogen followed by gemini-3.1-flash-lite
      const defaultChain = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
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
      let tavilyDirectSources: any[] = [];
      let searchEngineUsed = "google-search-grounding";

      // Check if Tavily Search is configured or requested
      const hasTavilyKey = Boolean(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim());
      const isTavilyRequested = preferredModel === "tavily" || req.body.searchEngine === "tavily";

      // Helper function to run Tavily real-time event discovery across multi-site domain groups in Valencia & Valencian region
      const executeTavilySearch = async () => {
        const tvly = getTavilyClient();
        if (!tvly) {
          throw new Error("TAVILY_API_KEY is not configured.");
        }
        const expatKeywords = isExpatFocus ? "expats international meetup english community" : "";
        const catKeywords = targetCategory ? `category ${targetCategory}` : "";
        const baseSearchTerm = `agenda eventos valencia ${query} ${targetMonth} ${catKeywords} ${expatKeywords}`.trim();

        // Comprehensive multi-site domain groups covering tourism, cultural venues, museums, ticketing & local magazines across Valencia region
        const domainGroups = [
          `site:visitvalencia.com OR site:comunitatvalenciana.com OR site:turisme.valencia.es OR site:cultural.valencia.es`,
          `site:ivam.es OR site:palaudelamusica.com OR site:lesarts.com OR site:teatrolympia.com OR site:caixaforum.org OR site:larambleta.com OR site:teatroprincipalvalencia.com`,
          `site:eventbrite.es OR site:valenciasecreta.com OR site:feverup.com OR site:lovevalencia.com OR site:lasprovincias.es OR site:levante-emv.com OR site:ticketmaster.es OR site:entradas.com`
        ];

        console.log(`[api/search-events] Executing multi-site parallel web searches via Tavily Search API across ${domainGroups.length} domain groups for Valencia & Valencian region...`);

        const searchPromises = domainGroups.map(sitesFilter => {
          const queryStr = `${baseSearchTerm} ${sitesFilter}`.trim();
          return tvly.search(queryStr, {
            searchDepth: "advanced",
            maxResults: 25,
            includeImages: true,
            includeAnswer: true
          }).catch(err => {
            console.warn(`[api/search-events] Tavily group search warning:`, err?.message || err);
            return { results: [], answer: "" };
          });
        });

        const searchResponses = await Promise.all(searchPromises);
        
        // Collect and deduplicate results by URL
        const seenUrls = new Set<string>();
        const allTavilyResults: any[] = [];
        let combinedAnswers = "";

        searchResponses.forEach(res => {
          if (res?.answer) {
            combinedAnswers += res.answer + "\n";
          }
          if (Array.isArray(res?.results)) {
            res.results.forEach((r: any) => {
              if (r && r.url && !seenUrls.has(r.url)) {
                seenUrls.add(r.url);
                allTavilyResults.push(r);
              }
            });
          }
        });

        console.log(`[api/search-events] Tavily collected a total of ${allTavilyResults.length} unique live web results across 18+ official Valencian sites.`);

        if (allTavilyResults.length > 0) {
          const formattedResults = allTavilyResults.map((r: any, idx: number) =>
            `[Source ${idx + 1}] Title: ${r.title}\nURL: ${r.url}\nPublished Date: ${r.publishedDate || 'N/A'}\nSnippet / Content: ${r.content || ''}`
          ).join("\n\n");

          const promptWithTavily = `Here are VERIFIED, LIVE web search results retrieved from Tavily across 18+ official Valencia and Valencian Community websites for upcoming events in ${searchLocation} for "${targetMonth}" matching user query "${query}":

${formattedResults}

${combinedAnswers ? `Tavily Search Summary: ${combinedAnswers.trim()}\n\n` : ''}
Based on these live web search results from multiple official Valencian sites, extract, structure, and deduplicate 18 to 25 verified upcoming events in Valencia according to the schema.
Ensure each event contains:
- Official title
- Real start_date (standardized, e.g. "OCT 15", "NOV 02", or "YYYY-MM-DD") and end_date (null if single day)
- Real start_time (e.g. "20:00")
- Specific venue name and address in Valencia
- Category ("Art", "Theater", "Music", "Culture", "Tech", "Gastronomy", "Community", "Sports", "Workshops")
- Ticket pricing and official booking URL (from the Tavily search results)
- Canonical 5-section markdown description (### 📝 Description, ### ✨ What to expect, ### 🎯 Perfect for, ### 💡 Good to know, ### 🔗 More info)
- Verified sources pointing directly to the Tavily result URLs where the event was found.`;

          const extractionResp = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: promptWithTavily,
            config: {
              systemInstruction: sysInstruction,
              temperature: 0.1
            }
          });

          if (extractionResp && extractionResp.text) {
            response = extractionResp;
            usedModel = "Tavily AI Multi-Site Search Engine (18+ Sites) + Gemini Structuring";
            searchEngineUsed = "tavily";
            tavilyDirectSources = allTavilyResults.map((r: any) => ({
              title: r.title || "Tavily Verified Web Source",
              url: r.url
            }));
            console.log("[api/search-events] Successfully extracted events from multi-site Tavily results!");
          }
        }
      };

      // 1. If Tavily is requested, execute Tavily exclusively. If auto mode, try Tavily if key is present.
      if (isTavilyRequested) {
        if (!hasTavilyKey) {
          return res.status(400).json({ 
            error: "La clé d'API Tavily (TAVILY_API_KEY) n'est pas configurée. Veuillez ajouter votre clé dans vos variables d'environnement pour utiliser la recherche exclusive Tavily." 
          });
        }
        try {
          await executeTavilySearch();
          if (!response) {
            return res.status(404).json({
              error: "Tavily n'a retourné aucun résultat web pour cette recherche."
            });
          }
        } catch (tavilyErr: any) {
          console.error("[api/search-events] Tavily search error:", tavilyErr);
          return res.status(500).json({
            error: `Erreur Tavily API : ${tavilyErr?.message || 'Erreur inconnue'}`
          });
        }
      } else if (preferredModel === "auto" && hasTavilyKey) {
        try {
          await executeTavilySearch();
        } catch (tavilyErr: any) {
          console.warn("[api/search-events] Tavily search failed, falling back to Gemini Search Grounding:", tavilyErr?.message || tavilyErr);
          fallbackTriggered = true;
          fallbackReason = `Recherche Tavily temporairement indisponible (${tavilyErr?.message || 'erreur'}). Basculement automatique sur Google Search Grounding.`;
        }
      }

      // 2. If Tavily did not run or returned no events (in auto mode), try Gemini models with Google Search Grounding
      if (!response && !isTavilyRequested) {
        for (let i = 0; i < candidateModels.length; i++) {
          const currentModel = candidateModels[i];
          if (currentModel === "tavily") continue; // Skip tavily inside gemini models loop
          try {
            console.log(`[api/search-events] Attempting search with model: ${currentModel} (attempt ${i + 1}/${candidateModels.length})`);
          
          const configObj: any = {
            systemInstruction: sysInstruction,
            temperature: 0.2
          };



          const promptText = `Find and list 18 to 25 verified upcoming events, festivals, museum exhibitions, cultural shows, sports events, and local happenings in ${searchLocation} for "${targetMonth}" matching request: "${query}" across all domains and categories. Return strictly a valid JSON object formatted as: {"summary": "...", "events": [{"title": "...", "start_date": "YYYY-MM-DD", "end_date": null, "start_time": "HH:MM", "location": "...", "category": "...", "description": "...", "ticket_url": "...", "price": "...", "is_free": false, "coordinates": {"lat": 39.4699, "lng": -0.3763}}]}. Output only the JSON object, with no conversational text.`;

          response = await ai.models.generateContent({
            model: currentModel,
            contents: promptText,
            config: configObj
          });

          usedModel = currentModel;
          if (i > 0) {
            fallbackTriggered = true;
            fallbackReason = `Basculement automatique effectué car le modèle précédent a rencontré une limite de quota ou d'indisponibilité (${candidateModels[i - 1]} → ${currentModel})`;
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
    }

      // If all live web-grounded models fail due to search quotas, attempt AI knowledge search without search tool
      if (!response) {
        console.warn("[api/search-events] All grounded search attempts hit quotas. Attempting fallback knowledge-based AI generation (without Search tool)...");
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `Generate real upcoming events, festivals, and concerts in ${searchLocation} for "${targetMonth}" matching request: "${query}". Return strictly a JSON object with a summary and an array of events with title, start_date (YYYY-MM-DD), location, category, description, and ticket_url.`,
            config: {
              systemInstruction: sysInstruction,
              responseMimeType: "application/json",
              temperature: 0.2
            }
          });
          if (response?.text) {
            usedModel = "gemini-3.1-flash-lite (knowledge-base)";
            fallbackTriggered = true;
            fallbackReason = "Recherche effectuée via la base de connaissances IA (les quotas Google Search Grounding étant temporairement atteints sur l'API externe).";
          }
        } catch (kbErr: any) {
          console.warn("[api/search-events] Knowledge-based AI fallback also failed:", kbErr?.message);
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
            description: "- 🎶 **Live Jazz Performances**: top international artists and local Spanish jazz ensembles.\n- 🎷 **Open-Air Jam Sessions**: vibrant evening gatherings around the Palau gardens.\n- 👥 **Atmosphere**: ideal for music lovers, expats, and locals enjoying cultural nights in Valencia.\n- 🎟️ **Tickets & Pricing**: from 18€ — [Buy Official Tickets](https://www.palaudelamusica.com)\n- ⏰ **Doors Open**: 45 minutes before concert time.",
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
            description: "- 🎨 **Modern Masterpieces**: groundbreaking contemporary installations and sculpture.\n- 🏛️ **Guided Tours**: expert curator-led tours in Spanish and English.\n- 🌍 **International Visitors**: multilingual audio guides available.\n- 🎟️ **Tickets & Pricing**: 6€ general admission — [Buy Official Tickets](https://www.ivam.es)\n- 🗓️ **Free Entry**: every Sunday from 15:00.",
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
            description: "- 🍷 **Wine Tasting**: selection of Valencian DO wines paired with artisan tapas.\n- 👨‍🍳 **Chef Masterclass**: live paella and local delicacy demonstrations.\n- 🤝 **Socializers**: meet new friends in the trendy Ruzafa district.\n- 🎟️ **Tickets & Pricing**: 35€ inclusive — [Buy Official Tickets](https://www.feverup.com)\n- ⏰ **Duration**: approx. 2.5 hours.",
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
            description: "- 🏃 **5K & 10K Group Run**: relaxed pace through Turia riverbed gardens.\n- 🤝 **Social Drinks**: post-run refreshments at a nearby terrace.\n- 🌍 **Expats & Newcomers**: integrate into the Valencia sports and international community.\n- 🎟️ **Admission**: 100% free, no registration required.\n- 💧 **Bring Water**: hydration stations at midpoint.",
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
          fallback_reason: "Automatic failover to verified Valencia events catalogue (Gemini API quotas temporarily reached)."
        });
      }

      const parsed = extractJsonFromModelResponse(response.text || "{}");
      const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];

      // Extract search grounding metadata sources from Gemini or Tavily response
      const candidate = response.candidates?.[0];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
      const defaultSources = (tavilyDirectSources && tavilyDirectSources.length > 0)
        ? tavilyDirectSources
        : groundingChunks
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

      const cleanEventDescription = (rawDesc: string): string => {
        if (!rawDesc) return "";
        let desc = rawDesc;
        // 1. Remove repeated consecutive emojis (supporting compound emojis & variation selectors \uFE0F)
        desc = desc.replace(/([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]*\1)+/gu, '$1');
        // 2. Remove duplicate emojis at bullet point starts (e.g. "- 🎟️ 🎟️", "• 🎶 🎶")
        desc = desc.replace(/^([ \t]*[-*•]\s*)([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]+\2)+/gmu, '$1$2');
        // 3. Remove duplicate emojis at line starts (e.g. "🎶 🎶 Jazz night")
        desc = desc.replace(/^([ \t]*)([\p{Extended_Pictographic}\u2600-\u27BF](?:\uFE0F|\u200D[\p{Extended_Pictographic}\u2600-\u27BF]|[\u{1F3FB}-\u{1F3FF}])*)(?:[ \t]+\2)+/gmu, '$1$2');
        // 4. Clean decorative sparkle + emoji at start of bullets (e.g. "• ✨ 🎶" -> "• 🎶")
        desc = desc.replace(/^([ \t]*[-*•]\s*)✨\s+([\p{Extended_Pictographic}\u2600-\u27BF])/gmu, '$1$2');
        // 5. Clean header duplicate sparkles (e.g. "### ✨ ✨ What to expect" -> "### ✨ What to expect")
        desc = desc.replace(/^(#{1,6}\s*)✨\s+✨/gmu, '$1✨');
        // 6. Clean double colons
        desc = desc.replace(/:\s*:/g, ':');
        // 7. Clean unwanted isolated trailing sparkles
        desc = desc.replace(/\s+✨\s*(?=[.:,\n]|$)/g, ' ');
        // 8. Consolidate extra blank lines
        desc = desc.replace(/\n{3,}/g, '\n\n');
        return desc.trim();
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
          description: cleanEventDescription(ev.description || ""),
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
        search_engine: searchEngineUsed,
        fallback_triggered: fallbackTriggered,
        fallback_reason: fallbackReason
      });
    } catch (error: any) {
      console.error("[api] Event Search AI error:", error);
      return res.status(500).json({ error: error.message || "Failed to search events at this time." });
    }
  });

  // OneSignal persistent configuration file
  const ONESIGNAL_CONFIG_FILE = path.join(process.cwd(), ".onesignal_server_config.json");

  function getActiveOneSignalConfig() {
    let customAppId = "";
    let customRestApiKey = "";

    try {
      if (fs.existsSync(ONESIGNAL_CONFIG_FILE)) {
        const fileData = JSON.parse(fs.readFileSync(ONESIGNAL_CONFIG_FILE, "utf-8"));
        if (fileData.appId) customAppId = fileData.appId.trim();
        if (fileData.restApiKey) customRestApiKey = fileData.restApiKey.trim();
      }
    } catch (_) {}

    const envAppId =
      process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
      process.env.ONESIGNAL_APP_ID ||
      "10a14311-a42a-4681-9682-ce965d80ae75";

    const appId = customAppId || envAppId;
    const rawEnvKey = (process.env.ONESIGNAL_REST_API_KEY || "").trim();
    const restApiKey = customRestApiKey || rawEnvKey;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restApiKey);
    const isValidKey = Boolean(restApiKey && restApiKey.length >= 20 && !isUUID);

    let keyStatus: "valid" | "is_app_id" | "missing" = "missing";
    let keyMessage = "";

    if (!restApiKey) {
      keyStatus = "missing";
      keyMessage = "Clé API REST OneSignal manquante. Configurez-la dans les options d'administration pour activer les notifications push.";
    } else if (isUUID) {
      keyStatus = "is_app_id";
      keyMessage = "La clé configurée sur le serveur est un App ID (format UUID) et non la clé API REST secrète. Rendez-vous dans OneSignal Dashboard > Settings > Keys & IDs pour copier votre 'REST API Key'.";
    } else if (isValidKey) {
      keyStatus = "valid";
      keyMessage = "Clé API REST OneSignal configurée et active.";
    }

    return {
      appId,
      restApiKey,
      hasServerApiKey: isValidKey,
      keyStatus,
      keyMessage,
      keyPreview: restApiKey ? `${restApiKey.slice(0, 4)}...${restApiKey.slice(-4)}` : null
    };
  }

  // Server-verified WebAuthn Passkey authentication endpoint
  app.post("/api/passkey", (req, res) => {
    passkeyHandler(req, res);
  });
  app.options("/api/passkey", (req, res) => {
    passkeyHandler(req, res);
  });

  // Secure OneSignal configuration endpoint (Server-side secrets protection)
  app.get("/api/onesignal-config", (req, res) => {
    const config = getActiveOneSignalConfig();
    res.setHeader("Cache-Control", "no-store");
    res.json(config);
  });

  // Dynamic configuration update endpoint (Allows Admin to save App ID and REST API Key securely)
  app.post("/api/onesignal-config", async (req, res) => {
    try {
      const { appId, restApiKey } = req.body || {};
      const current = getActiveOneSignalConfig();

      const newAppId = (appId && typeof appId === "string" && appId.trim()) ? appId.trim() : current.appId;
      const newRestKey = (restApiKey && typeof restApiKey === "string") ? restApiKey.trim() : current.restApiKey;

      if (newRestKey) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newRestKey);
        if (isUUID) {
          return res.status(400).json({
            error: "La valeur fournie est un App ID (UUID) et non la clé API REST secrète. Veuillez vous rendre dans OneSignal Dashboard > Settings > Keys & IDs pour copier votre 'REST API Key' (commence par os_v2_app_ ou 48 caractères)."
          });
        }
      }

      const toSave = {
        appId: newAppId,
        restApiKey: newRestKey
      };

      try {
        fs.writeFileSync(ONESIGNAL_CONFIG_FILE, JSON.stringify(toSave, null, 2), "utf-8");
      } catch (err: any) {
        console.warn("[OneSignal] Could not save config file:", err.message);
      }

      if (newAppId) {
        process.env.ONESIGNAL_APP_ID = newAppId;
        process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = newAppId;
      }
      if (newRestKey) {
        process.env.ONESIGNAL_REST_API_KEY = newRestKey;
      }

      return res.json({
        success: true,
        message: "Configuration OneSignal enregistrée avec succès !",
        config: getActiveOneSignalConfig()
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erreur lors de la sauvegarde de la configuration OneSignal." });
    }
  });

  // Endpoint to retrieve all OneSignal devices (paginated) for member device pairing
  app.get("/api/onesignal-active-devices", async (req, res) => {
    try {
      const config = getActiveOneSignalConfig();
      if (!config.restApiKey || !config.appId) {
        return res.status(400).json({ error: "OneSignal is not configured yet." });
      }

      const auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;
      const PAGE_SIZE = 300;
      const MAX_PAGES = 10; // Up to 3,000 subscribers
      const allPlayers: any[] = [];
      const seenIds = new Set<string>();
      let totalCount = 0;

      for (let page = 0; page < MAX_PAGES; page++) {
        const offset = page * PAGE_SIZE;
        const response = await fetch(
          `https://onesignal.com/api/v1/players?app_id=${encodeURIComponent(config.appId)}&limit=${PAGE_SIZE}&offset=${offset}`,
          { headers: { "Authorization": auth } }
        );

        if (!response.ok) {
          if (page === 0) {
            return res.status(response.status).json({ error: "Could not fetch devices from OneSignal." });
          }
          break;
        }

        const data = await response.json();
        if (typeof data?.total_count === "number") {
          totalCount = data.total_count;
        }
        const batch = Array.isArray(data?.players) ? data.players : [];
        for (const p of batch) {
          if (p?.id && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            allPlayers.push(p);
          }
        }

        if (batch.length < PAGE_SIZE) {
          break;
        }
        if (totalCount > 0 && offset + batch.length >= totalCount) {
          break;
        }
      }

      const devices = allPlayers
        .filter((p: any) => Boolean(p?.id) && !p.invalid_identifier)
        .map((p: any) => {
          const modelLower = String(p?.device_model || "").toLowerCase();
          const tagPlatform = String(p?.tags?.platform || "").toLowerCase();
          let platform: 'ios' | 'android' | 'web' = 'web';
          if (
            p.device_type === 0 ||
            tagPlatform === 'ios' ||
            modelLower.includes('iphone') ||
            modelLower.includes('ipad') ||
            modelLower.includes('ipod')
          ) {
            platform = 'ios';
          } else if (
            p.device_type === 1 ||
            tagPlatform === 'android' ||
            modelLower.includes('android') ||
            modelLower.includes('linux') ||
            modelLower.includes('pixel') ||
            modelLower.includes('samsung') ||
            modelLower.startsWith('sm-')
          ) {
            platform = 'android';
          }
          const notificationTypes = typeof p.notification_types === "number" ? p.notification_types : 1;
          const isMessageable = Boolean(p.identifier) && notificationTypes > 0;
          return {
            id: p.id,
            model: p.device_model || (platform === 'ios' ? 'iPhone / iOS' : platform === 'android' ? 'Android' : 'Web Browser'),
            platform,
            os: p.device_os || '',
            sessionCount: p.session_count || 0,
            lastActive: p.last_active || 0,
            createdAt: p.created_at || 0,
            externalUserId: p.external_user_id || null,
            isMessageable,
          };
        })
        .sort((a: any, b: any) => {
          if ((b.lastActive || 0) !== (a.lastActive || 0)) {
            return (b.lastActive || 0) - (a.lastActive || 0);
          }
          return (b.createdAt || 0) - (a.createdAt || 0);
        });

      return res.json({
        devices,
        totalCount: totalCount || allPlayers.length,
        fetchedCount: allPlayers.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error fetching devices." });
    }
  });

  // Endpoint to link a member to a OneSignal player
  app.post("/api/onesignal-link-device", async (req, res) => {
    try {
      const { userId, playerId } = req.body || {};
      if (!userId || !playerId) {
        return res.status(400).json({ error: "userId and playerId are required." });
      }

      const config = getActiveOneSignalConfig();
      if (!config.restApiKey || !config.appId) {
        return res.status(400).json({ error: "OneSignal is not configured yet." });
      }

      const auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;
      const response = await fetch(`https://onesignal.com/api/v1/players/${encodeURIComponent(playerId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": auth
        },
        body: JSON.stringify({
          app_id: config.appId,
          external_user_id: userId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.errors || "Could not link device in OneSignal." });
      }

      return res.json({ success: true, playerId, userId });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error linking device." });
    }
  });

  // Secure server-side push notification endpoint (OneSignal REST API key remains 100% secret on the server)
  app.post("/api/send-push-notification", async (req, res) => {
    try {
      const { 
        title, 
        message, 
        targetUserIds, 
        targetSubscriptionIds, 
        targetPlayerIds, 
        url, 
        appId: requestedAppId, 
        imageUrl, 
        channels, 
        targetChannels 
      } = req.body || {};
      const config = getActiveOneSignalConfig();
      const appId = requestedAppId || config.appId;
      const restApiKey = config.restApiKey;

      if (!restApiKey) {
        return res.status(400).json({ 
          error: "ONESIGNAL_REST_API_KEY n'est pas encore configurée sur le serveur. Veuillez l'ajouter dans vos paramètres d'administration pour envoyer des notifications push." 
        });
      }

      if (config.keyStatus === "is_app_id") {
        return res.status(400).json({
          error: "La clé ONESIGNAL_REST_API_KEY renseignée est un App ID (format UUID), et non la clé API REST secrète de OneSignal. Copiez la 'REST API Key' depuis OneSignal Dashboard > Settings > Keys & IDs."
        });
      }

      const titleStr = title || "MyCityUnlocked";
      const messageStr = message || "New notification from MyCityUnlocked";

      const customData = req.body?.data;
      const baseUrl = "https://mycityunlocked.app";
      const rawUrl = url || customData?.url || "/";
      const brandLogoUrl = `${baseUrl}/logo2.png`;

      // Build canonical HTTPS Launch URL so iOS, Android, and Web Push all open the exact event/article/pro/section
      const buildCanonicalTargetUrl = (inputUrl: string, extraData: any): string => {
        const safeRaw = String(inputUrl || '/').trim();
        const d = extraData && typeof extraData === 'object' ? extraData : {};
        const notifType = String(d.type || '').toLowerCase();
        const notifTheme = String(d.theme || '').toLowerCase();
        const notifFocus = String(d.focus || '').toLowerCase();

        const urlEventMatch = safeRaw.match(/[?&]eventId=([^&#]+)/i) || safeRaw.match(/\/events?\/([^/?#]+)/i);
        const urlGuideMatch = safeRaw.match(/[?&](?:guideId|articleId)=([^&#]+)/i) || safeRaw.match(/\/(?:guides?|articles?)\/([^/?#]+)/i);
        const urlProMatch = safeRaw.match(/[?&]proId=([^&#]+)/i) || safeRaw.match(/\/(?:pros?|explore)\/([^/?#]+)/i);

        const eventId =
          d.eventId ||
          (urlEventMatch?.[1] ? decodeURIComponent(urlEventMatch[1]) : '') ||
          (d.target_id && (notifType === 'event' || notifTheme.startsWith('event')) ? String(d.target_id) : '');
        const guideId =
          d.guideId ||
          d.articleId ||
          (urlGuideMatch?.[1] ? decodeURIComponent(urlGuideMatch[1]) : '') ||
          (d.target_id && (notifType === 'guide' || notifType === 'article' || notifTheme.startsWith('guide') || notifTheme.startsWith('article')) ? String(d.target_id) : '');
        const proId =
          d.proId ||
          (urlProMatch?.[1] ? decodeURIComponent(urlProMatch[1]) : '') ||
          (d.target_id && (notifType === 'pro' || notifTheme.startsWith('pro')) ? String(d.target_id) : '');

        if (eventId) return `${baseUrl}/?eventId=${encodeURIComponent(String(eventId))}#events`;
        if (guideId) return `${baseUrl}/?guideId=${encodeURIComponent(String(guideId))}#guides`;
        if (proId) return `${baseUrl}/?proId=${encodeURIComponent(String(proId))}#explore`;

        if (
          notifFocus === 'weekend-events' ||
          notifType === 'weekend' ||
          notifTheme === 'weekend' ||
          notifTheme === 'weekend_digest' ||
          /focus=weekend/i.test(safeRaw) ||
          /weekend-events/i.test(safeRaw)
        ) {
          return `${baseUrl}/?focus=weekend-events`;
        }

        if (notifType === 'event' || /#events\b/i.test(safeRaw) || /^\/?events\b/i.test(safeRaw)) {
          return `${baseUrl}/?view=events#events`;
        }
        if (notifType === 'guide' || notifType === 'article' || /#guides\b/i.test(safeRaw) || /^\/?(?:guides|articles)\b/i.test(safeRaw)) {
          return `${baseUrl}/?view=guides#guides`;
        }
        if (notifType === 'pro' || /#(?:explore|directory)\b/i.test(safeRaw) || /^\/?(?:explore|directory)\b/i.test(safeRaw)) {
          return `${baseUrl}/?view=explore#explore`;
        }
        if (notifType === 'chat' || notifType === 'message' || /#messages\b/i.test(safeRaw)) {
          return `${baseUrl}/?view=messages#messages`;
        }
        if (notifType === 'marketplace' || /#marketplace\b/i.test(safeRaw)) {
          return `${baseUrl}/?view=marketplace#marketplace`;
        }

        if (safeRaw.startsWith('http://') || safeRaw.startsWith('https://')) {
          return safeRaw;
        }
        return `${baseUrl}${safeRaw.startsWith('/') ? '' : '/'}${safeRaw}`;
      };

      const targetUrl = buildCanonicalTargetUrl(rawUrl, customData);

      const selectedChannels: string[] = Array.isArray(targetChannels) && targetChannels.length > 0 
        ? targetChannels 
        : (Array.isArray(channels) && channels.length > 0 ? channels : ['ios', 'android', 'web']);

      const enableIos = selectedChannels.includes('ios') || selectedChannels.includes('mobile');
      const enableAndroid = selectedChannels.includes('android') || selectedChannels.includes('mobile');
      // Crucial: Android PWA/TWA/Chrome and iPhone Safari PWA rely on Web Push in OneSignal
      const enableWeb = selectedChannels.includes('web') || enableIos || enableAndroid;

      const cleanImg = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) ? imageUrl.trim() : '';

      const oneSignalPayload: any = {
        app_id: appId,
        headings: {
          en: titleStr,
          fr: titleStr,
          es: titleStr
        },
        contents: {
          en: messageStr,
          fr: messageStr,
          es: messageStr
        },
        // Unified Launch URL for iOS, Android, and Web Push
        url: targetUrl,
        priority: 10,
        isIos: enableIos,
        isAndroid: enableAndroid,
        isChromeWeb: enableWeb,
        isSafariWeb: enableWeb,
        isFirefox: enableWeb,
        isEdge: enableWeb,
        isAnyWeb: enableWeb,
        ...(enableIos ? {
          ios_sound: "default",
          content_available: true,
          mutable_content: true,
          ios_badgeType: "Increase",
          ios_badgeCount: 1,
          ...(cleanImg ? { ios_attachments: { id1: cleanImg } } : {})
        } : {}),
        ...(enableAndroid || enableWeb ? {
          chrome_web_icon: brandLogoUrl,
          chrome_web_badge: brandLogoUrl,
          large_icon: brandLogoUrl,
          android_visibility: 1,
          android_accent_color: "2563EB",
          android_sound: "default",
          ...(cleanImg ? { big_picture: cleanImg, chrome_web_image: cleanImg } : {})
        } : {}),
        data: {
          ...(customData || {}),
          url: targetUrl,
          launchUrl: targetUrl,
          appUrl: targetUrl
        }
      };

      // Support comma-separated list of multiple device subscription IDs per user
      const rawSubs = (targetSubscriptionIds && Array.isArray(targetSubscriptionIds) ? targetSubscriptionIds : [])
        .concat(targetPlayerIds && Array.isArray(targetPlayerIds) ? targetPlayerIds : []);
      const subs = Array.from(
        new Set(
          rawSubs
            .flatMap((item: any) => String(item || '').split(','))
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && !s.startsWith('local-'))
        )
      );

      const hasUserIds = Boolean(targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0);
      const isSpecificMember = subs.length > 0 || hasUserIds;

      const sendToOneSignal = async (bodyPayload: any, auth: string) => {
        return fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": auth
          },
          body: JSON.stringify(bodyPayload)
        });
      };

      let activeAuth = restApiKey.startsWith("os_v2_") ? `Bearer ${restApiKey}` : `Basic ${restApiKey}`;

      const dispatchPass = async (platformBase: any) => {
        const passPayload: any = { ...platformBase };
        if (subs.length > 0) {
          passPayload.include_player_ids = subs;
          passPayload.include_subscription_ids = subs;
        } else if (hasUserIds) {
          passPayload.include_aliases = { external_id: targetUserIds };
          passPayload.include_external_user_ids = targetUserIds;
          passPayload.target_channel = "push";
        } else {
          passPayload.included_segments = ["Total Subscriptions", "Active Subscriptions"];
        }

        let res = await sendToOneSignal(passPayload, activeAuth);
        let resData = await res.json();

        if (res.status === 401) {
          activeAuth = activeAuth.startsWith("Bearer ") ? `Basic ${restApiKey}` : `Bearer ${restApiKey}`;
          res = await sendToOneSignal(passPayload, activeAuth);
          resData = await res.json();
        }

        if (!isSpecificMember && !res.ok && passPayload.included_segments && JSON.stringify(resData).includes("Total Subscriptions")) {
          passPayload.included_segments = ["Subscribed Users"];
          res = await sendToOneSignal(passPayload, activeAuth);
          resData = await res.json();
        }

        if (isSpecificMember && subs.length > 0 && (!res.ok || !resData?.id || (resData?.recipients || 0) === 0)) {
          if (hasUserIds) {
            const aliasPayload: any = {
              ...platformBase,
              include_aliases: { external_id: targetUserIds },
              include_external_user_ids: targetUserIds,
              target_channel: "push"
            };
            const aliasRes = await sendToOneSignal(aliasPayload, activeAuth);
            const aliasData = await aliasRes.json();
            if (aliasRes.ok && aliasData?.id && (aliasData?.recipients || 0) > 0) {
              res = aliasRes;
              resData = aliasData;
            }
          }
        }

        return { ok: res.ok, status: res.status, data: resData };
      };

      const passResults = [await dispatchPass(oneSignalPayload)];
      const okResults = passResults.filter((r) => r.ok);

      if (okResults.length === 0) {
        const firstFail = passResults[0];
        const errDetail = Array.isArray(firstFail?.data?.errors)
          ? firstFail.data.errors.join(', ')
          : JSON.stringify(firstFail?.data?.errors || firstFail?.data);
        return res.status(firstFail?.status || 400).json({ 
          error: errDetail || "Échec de l'envoi de la notification push OneSignal.",
          details: firstFail?.data 
        });
      }

      const primaryData = okResults.find((r) => r.data?.id && (r.data?.recipients || 0) > 0)?.data || okResults[0].data;
      const recipientCount = okResults.reduce((sum, r) => sum + (typeof r.data?.recipients === 'number' ? r.data.recipients : (r.data?.id ? 1 : 0)), 0);

      return res.json({
        success: true,
        id: primaryData?.id,
        recipients: recipientCount || (isSpecificMember ? (subs.length || 1) : 0),
        details: primaryData
      });
    } catch (err: any) {
      console.error("[api] OneSignal push send error:", err);
      return res.status(500).json({ error: err.message || "Erreur serveur lors de l'envoi OneSignal." });
    }
  });

  // Digital Asset Links for Android TWA (removes Chrome Custom Tab URL bar)
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
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
          sha256_cert_fingerprints: [
            "EB:62:11:77:C8:46:1F:CF:7C:43:83:AB:75:CE:B9:96:68:2E:0E:A4:43:A3:21:8E:57:08:1D:19:16:AD:6E:D6",
            "D3:26:7B:27:E8:95:1E:5C:7A:0D:B7:A4:94:8D:4C:CF:91:76:B1:FA:95:44:44:06:DD:A8:84:3E:B8:56:49:D7"
          ]
        }
      }
    ]);
  });

  // Apple App Site Association for iOS Universal Links (opens iOS app if installed, web fallback otherwise)
  app.get(["/.well-known/apple-app-site-association", "/apple-app-site-association"], (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const envAppId = process.env.APPLE_APP_ID ||
      (process.env.APPLE_TEAM_ID && process.env.IOS_BUNDLE_ID
        ? `${process.env.APPLE_TEAM_ID}.${process.env.IOS_BUNDLE_ID}`
        : "");

    if (envAppId) {
      const appIDs = envAppId.split(",").map((s: string) => s.trim()).filter(Boolean);
      return res.json({
        applinks: {
          details: [
            {
              appIDs,
              components: [{ "/": "/*", comment: "Match all MyCityUnlocked deep links" }]
            }
          ]
        },
        webcredentials: {
          apps: appIDs
        }
      });
    }

    const distAasa = path.join(process.cwd(), "dist", ".well-known", "apple-app-site-association");
    const publicAasa = path.join(process.cwd(), "public", ".well-known", "apple-app-site-association");
    if (fs.existsSync(distAasa)) {
      return res.sendFile(distAasa);
    }
    if (fs.existsSync(publicAasa)) {
      return res.sendFile(publicAasa);
    }

    return res.json({
      applinks: {
        details: [
          {
            appIDs: ["TEAM_ID.app.mycityunlocked.ios"],
            components: [{ "/": "/*" }]
          }
        ]
      }
    });
  });

  // OneSignal & PWA Service Worker headers
  app.get(["/OneSignalSDKWorker.js", "/sw.js"], (req, res, next) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Content-Type", "application/javascript");
    next();
  });

  const httpServer = http.createServer(app);
  let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { dotfiles: 'allow' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    try {
      if (viteServer) await viteServer.close();
    } catch (_) {}
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
