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
