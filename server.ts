import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { Resend } from "resend";
import dotenv from "dotenv";
import passkeyHandler from "./api/passkey";
import {
  runEventsDiscoveryAgent,
  verifySingleEventLive,
  generateWeekendPushDraft,
} from "./server/eventsAgent";

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

  // Status check for AI Events Agent configuration
  app.get("/api/search-config", (req, res) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.json({
      gemini_configured: hasGemini,
      agent_mode: "live-valencia-web-grounding"
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

  // Zero-Hallucination Autonomous Events Discovery Agent (Live Google Search Grounding + 4-Layer Verification)
  app.post(["/api/search-events", "/api/events-agent/weekly-hunt"], async (req, res) => {
    const isWeeklyHuntRoute = req.path.includes("weekly-hunt");
    const {
      mode,
      query,
      timeframe,
      month,
      category,
      expatFocus,
      existingTitles,
      existingEvents,
      preferredModel,
    } = req.body || {};

    const resolvedMode: "weekly_hunt" | "custom_search" =
      isWeeklyHuntRoute || mode === "weekly_hunt" ? "weekly_hunt" : "custom_search";

    if (resolvedMode === "custom_search" && (!query || typeof query !== "string" || !query.trim())) {
      return res.status(400).json({ error: "Please enter a search query or run the Weekly Autonomous Hunt." });
    }

    if (typeof query === "string" && query.length > 500) {
      return res.status(400).json({ error: "Search query is too long (max 500 characters)." });
    }

    try {
      const ai = getAiClient();
      const result = await runEventsDiscoveryAgent(ai, {
        mode: resolvedMode,
        query: typeof query === "string" ? query.trim() : undefined,
        timeframe: typeof timeframe === "string" ? timeframe : undefined,
        month: typeof month === "string" ? month : undefined,
        category: typeof category === "string" ? category : undefined,
        expatFocus: Boolean(expatFocus),
        existingTitles: Array.isArray(existingTitles) ? existingTitles.slice(0, 200) : [],
        existingEvents: Array.isArray(existingEvents) ? existingEvents.slice(0, 200) : [],
        preferredModel: typeof preferredModel === "string" ? preferredModel : "auto",
      });

      return res.json(result);
    } catch (error: any) {
      console.error("[api/events-agent] Error:", error);
      const errLower = String(error?.message || "").toLowerCase();
      const is503 = error?.status === 503 || errLower.includes("503") || errLower.includes("high demand") || errLower.includes("unavailable");
      if (is503) {
        return res.status(503).json({
          error: "Gemini is experiencing a brief demand spike. No unverified events were invented — please retry in a few seconds.",
        });
      }
      const status = isQuotaOrRateLimitError(error) ? 429 : 500;
      return res.status(status).json({
        error:
          status === 429
            ? "AI quota temporarily reached. No unverified events were invented — please retry in a minute."
            : error?.message || "Failed to run the Events Agent right now.",
      });
    }
  });

  // Live Fact-Checker for a single event (checks official live web listings, cancellations, and link health)
  app.post("/api/events-agent/verify-event", async (req, res) => {
    const { title, start_date, end_date, start_time, location, price, ticket_url } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Event title is required for live verification." });
    }

    try {
      const ai = getAiClient();
      const verdict = await verifySingleEventLive(ai, {
        title: title.trim().slice(0, 240),
        start_date: typeof start_date === "string" ? start_date : null,
        end_date: typeof end_date === "string" ? end_date : null,
        start_time: typeof start_time === "string" ? start_time : null,
        location: typeof location === "string" ? location.slice(0, 240) : null,
        price: typeof price === "string" ? price.slice(0, 120) : null,
        ticket_url: typeof ticket_url === "string" ? ticket_url : null,
      });
      return res.json(verdict);
    } catch (error: any) {
      console.error("[api/events-agent/verify-event] Error:", error);
      const errLower = String(error?.message || "").toLowerCase();
      const is503 = error?.status === 503 || errLower.includes("503") || errLower.includes("high demand") || errLower.includes("unavailable");
      if (is503) {
        return res.status(503).json({ error: "Gemini is experiencing a brief demand spike. Please retry in a few seconds." });
      }
      const status = isQuotaOrRateLimitError(error) ? 429 : 500;
      return res.status(status).json({
        error:
          status === 429
            ? "AI quota temporarily reached. Please retry verification in a minute."
            : error?.message || "Unable to verify this event live right now.",
      });
    }
  });

  // Weekend Push Notification Composer (grounded strictly in real published weekend events)
  app.post("/api/events-agent/weekend-push", async (req, res) => {
    const { events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "Provide at least one published upcoming weekend event." });
    }

    const sanitizedEvents = events
      .filter((e: any) => e && typeof e.title === "string" && e.title.trim())
      .slice(0, 10)
      .map((e: any) => ({
        title: String(e.title).trim().slice(0, 180),
        start_date: typeof e.start_date === "string" ? e.start_date.slice(0, 40) : undefined,
        category: typeof e.category === "string" ? e.category.slice(0, 60) : undefined,
        location: typeof e.location === "string" ? e.location.slice(0, 140) : undefined,
        is_free: Boolean(e.is_free),
      }));

    if (sanitizedEvents.length === 0) {
      return res.status(400).json({ error: "No valid events provided." });
    }

    try {
      const ai = getAiClient();
      const draft = await generateWeekendPushDraft(ai, sanitizedEvents);
      return res.json(draft);
    } catch (error: any) {
      console.error("[api/events-agent/weekend-push] Error:", error);
      const errLower = String(error?.message || "").toLowerCase();
      const is503 = error?.status === 503 || errLower.includes("503") || errLower.includes("high demand") || errLower.includes("unavailable");
      if (is503) {
        return res.status(503).json({ error: "Gemini is experiencing a brief demand spike. Please retry in a few seconds." });
      }
      const status = isQuotaOrRateLimitError(error) ? 429 : 500;
      return res.status(status).json({
        error:
          status === 429
            ? "AI quota temporarily reached. Please retry in a minute."
            : error?.message || "Unable to generate weekend push draft right now.",
      });
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

  // Endpoint to link a member to a OneSignal subscription (v2 User Model + v1 fallback)
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

      const v2Auth = config.restApiKey.startsWith("os_v2_") ? `Key ${config.restApiKey}` : `Basic ${config.restApiKey}`;
      const v1Auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;

      let v2Success = false;
      let v2Error: any = null;
      try {
        const v2Res = await fetch(
          `https://api.onesignal.com/apps/${encodeURIComponent(config.appId)}/subscriptions/${encodeURIComponent(playerId)}/owner`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": v2Auth
            },
            body: JSON.stringify({
              identity: {
                external_id: userId
              }
            })
          }
        );
        if (v2Res.ok) {
          v2Success = true;
        } else {
          v2Error = await v2Res.json().catch(() => ({ status: v2Res.status }));
        }
      } catch (e: any) {
        v2Error = e?.message || 'v2 transfer error';
      }

      if (v2Success) {
        return res.json({ success: true, playerId, userId, apiVersion: 'v2' });
      }

      const response = await fetch(`https://onesignal.com/api/v1/players/${encodeURIComponent(playerId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": v1Auth
        },
        body: JSON.stringify({
          app_id: config.appId,
          external_user_id: userId
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.errors || v2Error?.errors || "Could not link device in OneSignal.",
          v2Error
        });
      }

      return res.json({ success: true, playerId, userId, apiVersion: 'v1' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error linking device." });
    }
  });

  // Diagnostic endpoint: verify OneSignal external_id, Push subscribed state, token, and recent anonymous iOS devices
  app.get("/api/onesignal-user-status", async (req, res) => {
    try {
      const userId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : '';
      if (!userId) {
        return res.status(400).json({ error: 'userId query parameter is required.' });
      }

      const config = getActiveOneSignalConfig();
      if (!config.restApiKey || !config.appId) {
        return res.status(400).json({ error: 'OneSignal is not configured on the server.' });
      }

      const v2Auth = config.restApiKey.startsWith("os_v2_") ? `Key ${config.restApiKey}` : `Basic ${config.restApiKey}`;
      const v1Auth = config.restApiKey.startsWith("os_v2_") ? `Bearer ${config.restApiKey}` : `Basic ${config.restApiKey}`;

      let userFound = false;
      let onesignalId: string | null = null;
      let subscriptions: any[] = [];
      let lookupStatus = 0;
      let lookupError: string | null = null;

      try {
        const userRes = await fetch(
          `https://api.onesignal.com/apps/${encodeURIComponent(config.appId)}/users/by/external_id/${encodeURIComponent(userId)}`,
          {
            headers: {
              "Authorization": v2Auth,
              "Accept": "application/json"
            }
          }
        );
        lookupStatus = userRes.status;
        if (userRes.ok) {
          const userData = await userRes.json();
          userFound = true;
          onesignalId = userData?.identity?.onesignal_id || null;
          subscriptions = Array.isArray(userData?.subscriptions)
            ? userData.subscriptions.map((sub: any) => ({
                id: sub.id,
                type: sub.type || 'Unknown',
                enabled: Boolean(sub.enabled),
                notificationTypes: sub.notification_types,
                tokenPresent: Boolean(sub.token),
                tokenPreview: sub.token ? `${String(sub.token).slice(0, 10)}…${String(sub.token).slice(-6)}` : null,
                isPushSubscribed: Boolean(sub.enabled) && Boolean(sub.token) && (sub.notification_types === undefined || Number(sub.notification_types) > 0),
                sdk: sub.sdk || null,
                deviceModel: sub.device_model || null,
                deviceOs: sub.device_os || null,
                appVersion: sub.app_version || null,
                lastActive: sub.last_active || null
              }))
            : [];
        } else if (userRes.status !== 404) {
          const errJson = await userRes.json().catch(() => ({}));
          lookupError = JSON.stringify(errJson?.errors || errJson || `HTTP ${userRes.status}`);
        }
      } catch (e: any) {
        lookupError = e?.message || 'Failed to query OneSignal v2 user endpoint';
      }

      let recentAnonymousIOS: any[] = [];
      let recentLinkedIOSFromPlayers: any[] = [];
      let totalIOSDevices = 0;

      try {
        const playersRes = await fetch(
          `https://onesignal.com/api/v1/players?app_id=${encodeURIComponent(config.appId)}&limit=300&offset=0`,
          { headers: { "Authorization": v1Auth } }
        );
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          const players = Array.isArray(playersData?.players) ? playersData.players : [];
          const iosPlayers = players
            .filter((p: any) => p.device_type === 0 && !p.invalid_identifier)
            .sort((a: any, b: any) => (b.last_active || 0) - (a.last_active || 0));

          totalIOSDevices = iosPlayers.length;

          const mapPlayer = (p: any) => ({
            id: p.id,
            externalUserId: p.external_user_id || null,
            tokenPresent: Boolean(p.identifier),
            tokenPreview: p.identifier ? `${String(p.identifier).slice(0, 10)}…${String(p.identifier).slice(-6)}` : null,
            notificationTypes: p.notification_types,
            isPushSubscribed: Boolean(p.identifier) && Number(p.notification_types ?? 1) > 0,
            deviceModel: p.device_model || 'iPhone',
            deviceOs: p.device_os || '',
            sdk: p.sdk || '',
            appVersion: p.game_version || '',
            lastActive: p.last_active || null,
            createdAt: p.created_at || null
          });

          recentAnonymousIOS = iosPlayers
            .filter((p: any) => !p.external_user_id)
            .slice(0, 8)
            .map(mapPlayer);

          recentLinkedIOSFromPlayers = iosPlayers
            .filter((p: any) => p.external_user_id === userId)
            .map(mapPlayer);
        }
      } catch (_) {}

      const hasPushSubscribedIOS =
        subscriptions.some((s) => /ios/i.test(String(s.type)) && s.isPushSubscribed) ||
        recentLinkedIOSFromPlayers.some((p) => p.isPushSubscribed);

      return res.json({
        appId: config.appId,
        externalId: userId,
        userFound,
        lookupStatus,
        lookupError,
        onesignalId,
        subscriptions,
        hasPushSubscribedIOS,
        totalIOSDevices,
        recentAnonymousIOS,
        recentLinkedIOSFromPlayers
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error checking OneSignal user status.' });
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
        const annId = d.announcementId || d.annId || '';
        const convId = d.conversationId || d.convId || '';

        const appendTrackingParams = (builtUrl: string): string => {
          if (!annId && !convId) return builtUrl;
          const hashIdx = builtUrl.indexOf('#');
          const beforeHash = hashIdx >= 0 ? builtUrl.slice(0, hashIdx) : builtUrl;
          const hashPart = hashIdx >= 0 ? builtUrl.slice(hashIdx) : '';
          const additions: string[] = [];
          if (annId && !/[?&]annId=/i.test(beforeHash)) {
            additions.push(`annId=${encodeURIComponent(String(annId))}`);
          }
          if (convId && !/[?&]convId=/i.test(beforeHash)) {
            additions.push(`convId=${encodeURIComponent(String(convId))}`);
          }
          if (additions.length === 0) return builtUrl;
          const sep = beforeHash.includes('?') ? '&' : '?';
          return `${beforeHash}${sep}${additions.join('&')}${hashPart}`;
        };

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

        if (eventId) return appendTrackingParams(`${baseUrl}/?eventId=${encodeURIComponent(String(eventId))}#events`);
        if (guideId) return appendTrackingParams(`${baseUrl}/?guideId=${encodeURIComponent(String(guideId))}#guides`);
        if (proId) return appendTrackingParams(`${baseUrl}/?proId=${encodeURIComponent(String(proId))}#explore`);

        if (
          notifFocus === 'weekend-events' ||
          notifType === 'weekend' ||
          notifTheme === 'weekend' ||
          notifTheme === 'weekend_digest' ||
          /focus=weekend/i.test(safeRaw) ||
          /weekend-events/i.test(safeRaw)
        ) {
          return appendTrackingParams(`${baseUrl}/?focus=weekend-events`);
        }

        if (notifType === 'event' || /#events\b/i.test(safeRaw) || /^\/?events\b/i.test(safeRaw)) {
          return appendTrackingParams(`${baseUrl}/?view=events#events`);
        }
        if (notifType === 'guide' || notifType === 'article' || /#guides\b/i.test(safeRaw) || /^\/?(?:guides|articles)\b/i.test(safeRaw)) {
          return appendTrackingParams(`${baseUrl}/?view=guides#guides`);
        }
        if (notifType === 'pro' || /#(?:explore|directory)\b/i.test(safeRaw) || /^\/?(?:explore|directory)\b/i.test(safeRaw)) {
          return appendTrackingParams(`${baseUrl}/?view=explore#explore`);
        }
        if (notifType === 'chat' || notifType === 'message' || /#messages\b/i.test(safeRaw)) {
          return appendTrackingParams(`${baseUrl}/?view=messages#messages`);
        }
        if (notifType === 'marketplace' || /#marketplace\b/i.test(safeRaw)) {
          return appendTrackingParams(`${baseUrl}/?view=marketplace#marketplace`);
        }

        if (safeRaw.startsWith('http://') || safeRaw.startsWith('https://')) {
          return appendTrackingParams(safeRaw);
        }
        return appendTrackingParams(`${baseUrl}${safeRaw.startsWith('/') ? '' : '/'}${safeRaw}`);
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
        // Web/PWA & Android TWA Launch URL only (prevents OneSignal iOS SDK from opening Safari; iOS reads data.url internally)
        web_url: targetUrl,
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

  // Vite middleware for development (initialized asynchronously so port 3000 binds immediately)
  if (process.env.NODE_ENV !== "production") {
    const viteReadyPromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    }).then((server) => {
      viteServer = server;
      return server;
    });

    viteReadyPromise.catch((err) => {
      console.error("[server] Failed to initialize Vite dev middleware:", err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = viteServer || (await viteReadyPromise);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
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
