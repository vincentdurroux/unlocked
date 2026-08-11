import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        bio: p.bio || p.description || "",
        languages: p.languages || [],
        rating: p.rating || 0,
        location: p.location || ""
      }));

      const sysInstruction = `You are an expert matching AI assistant for "Unlocked" - a premier community-curated directory of recommended local professionals.
Your purpose is to examine the user's natural language request and return the most relevant matching professionals.

Review the list of professionals provided and evaluate BOTH trade/service criteria AND location criteria:

1. QUERY PARSING:
   - Identify the requested trade, skill, or service (e.g., plumber, electrician, dentist, lawyer, real estate agent).
   - Identify if the query mentions a specific location or city (e.g., "in Paris", "à Barcelone", "London", "near Madrid").

2. STRICT LOCATION & SERVICE MATCHING RULES:
   - LOCATION CRITERIA: If the user explicitly asks for a professional in a specific city/location:
     * A professional in a DIFFERENT city/location MUST NOT be treated as an exact match, even if their trade/profession is identical! (e.g. A plumber in Barcelona is NOT a match for "plumber in Paris").
     * Assign a score of 0 to professionals located in a completely different city when a specific city was explicitly requested in the query.
   - DIRECT MATCH (Score 60-100): The professional directly matches BOTH the requested trade/service AND the requested city/location (if specified).
   - ADJACENT / ALTERNATIVE MATCH (Score 15-40): The professional matches the trade but is in an adjacent area, OR provides a relevant related service.
   - UNRELATED OR WRONG LOCATION (Score 0): The professional has an unrelated trade/service OR is located in a completely wrong city when a specific city was requested.

3. "exactMatchFound" & "summaryMessage" RULES:
   - Set "exactMatchFound" to true ONLY if at least one professional directly matches BOTH the requested trade/service AND the specified city/location (if any). Set "summaryMessage" to null.
   - Set "exactMatchFound" to false if NO professional matches BOTH criteria.
   - If "exactMatchFound" is false, write a polite, empathetic "summaryMessage" strictly in ENGLISH explaining that no direct match was found in that location (e.g. "No direct matches were found for 'plumber in Paris' in our directory at the moment.").

4. Under "reasonUrlExcerpt" for each professional with score > 0, write a single, concise explanation strictly in English (1 sentence maximum) clarifying why they matched (mentioning their trade and location).`;

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

startServer();
