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

export function fallbackSmartSearch(query: string, professionals: any[]) {
  if (!query || !query.trim() || !professionals || !Array.isArray(professionals) || professionals.length === 0) {
    return { exactMatchFound: false, summaryMessage: null, results: [] };
  }

  const cleanQuery = query.toLowerCase().trim();
  const requestedLangs = detectRequestedLanguages(cleanQuery);
  const rawTokens = cleanQuery
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s,.;:!?/\\+&|()"-]+/)
    .filter(t => t.length >= 2);

  const topicSynonyms: Record<string, { keywords: string[]; targetTerms: string[]; summary: string }> = {
    back_pain: {
      keywords: ["dos", "back", "colonne", "spine", "vertebre", "lombes", "lombaire", "lumbago", "sciatique", "sciatica", "hernie", "cervical", "posture", "kine", "kinesitherapeute", "physio", "physiotherapist", "physiotherapy", "osteo", "osteopathe", "osteopath", "osteopathy", "chiro", "chiropractor", "chiropracteur"],
      targetTerms: ["physiotherapist", "kinésithérapeute", "fisioterapia", "osteopath", "ostéopathe", "chiropractor", "chiropracteur", "physiotherapy", "rehabilitation", "spine", "back"],
      summary: "To help with your back and spine care, I've selected trusted physiotherapists and osteopaths in Valencia."
    },
    dental: {
      keywords: ["dent", "dents", "dentiste", "dentist", "dentaire", "dental", "orthodontiste", "orthodontist", "carie", "implant", "teeth", "tooth"],
      targetTerms: ["dentist", "dentiste", "orthodontist", "dental", "dentaire"],
      summary: "Here are the top-rated dental and orthodontics specialists in Valencia."
    },
    plumbing: {
      keywords: ["plombier", "plumber", "fontanero", "fuite", "leak", "tuyau", "tuyauterie", "robinet", "eau", "water", "plomberie", "chauffe-eau", "canalisation", "evier", "wc"],
      targetTerms: ["plumber", "plombier", "fontanero", "plumbing"],
      summary: "Here are trusted plumbing specialists available in Valencia for repairs and installations."
    },
    electricity: {
      keywords: ["electricien", "electrician", "electricidad", "courant", "panne", "tableau electrique", "prise", "eclairage", "lumiere"],
      targetTerms: ["electrician", "électricien", "electricidad", "electrical"],
      summary: "Here are certified electricians in Valencia for your electrical installations and repairs."
    },
    legal_tax: {
      keywords: ["avocat", "lawyer", "abogado", "juriste", "legal", "droit", "visa", "nie", "empadronamiento", "residence", "fiscal", "tax", "taxes", "impot", "gestor", "gestoria", "comptable", "accountant", "contable", "contrat"],
      targetTerms: ["lawyer", "avocat", "abogado", "legal", "gestor", "gestoria", "gestoría", "tax advisor", "accountant", "comptable"],
      summary: "Here are experienced legal, immigration, and tax advisors in Valencia to guide you."
    },
    doctor_health: {
      keywords: ["medecin", "doctor", "medico", "general practitioner", "docteur", "sante", "health", "pediatre", "pediatrician", "gynecologue", "dermatologue", "ophtalmo", "clinic", "clinique"],
      targetTerms: ["doctor", "médecin", "médico", "general practitioner", "clinic", "pediatrician", "health"],
      summary: "Here are verified medical doctors and healthcare professionals in Valencia."
    },
    real_estate: {
      keywords: ["immobilier", "real estate", "inmobiliaria", "appartement", "apartment", "flat", "maison", "house", "location", "rent", "louer", "achat", "buy", "realtor", "agence"],
      targetTerms: ["real estate", "immobilier", "inmobiliaria", "property", "realtor"],
      summary: "Here are trusted real estate and property consultants in Valencia."
    },
    renovation_building: {
      keywords: ["travaux", "renovation", "architect", "architecte", "peintre", "painter", "peinture", "macon", "handyman", "manitas", "interior designer", "cuisine", "salle de bain"],
      targetTerms: ["architect", "architecte", "renovation", "painter", "peintre", "handyman", "contractor"],
      summary: "Here are recommended architects, renovation specialists, and handymen in Valencia."
    },
    moving: {
      keywords: ["demenagement", "moving", "movers", "relocation", "installation", "expat"],
      targetTerms: ["movers", "moving", "déménagement", "relocation", "gestor"],
      summary: "Here are relocation and moving specialists in Valencia to make your transition smooth."
    },
    languages_translation: {
      keywords: ["traducteur", "traduction", "translator", "translation", "traductor", "assermente", "sworn", "professeur", "cours", "language", "langue"],
      targetTerms: ["translator", "traducteur", "traductor", "language", "sworn"],
      summary: "Here are sworn translators and language specialists in Valencia."
    },
    hair_beauty: {
      keywords: ["coiffeur", "coiffure", "hairdresser", "hair", "barber", "barbier", "peluquero", "ongles", "nails", "beaute", "massage", "spa", "esthetique"],
      targetTerms: ["hairdresser", "coiffeur", "barber", "beauty", "massage", "spa"],
      summary: "Here are recommended hair stylists, barbers, and beauty professionals in Valencia."
    },
    mind_wellness: {
      keywords: ["psychologue", "psychologist", "therapeute", "therapist", "coach", "coaching", "mental", "stress", "anxiete", "burnout", "hypnose", "sophrologie", "yoga", "pilates"],
      targetTerms: ["psychologist", "psychologue", "therapist", "counselor", "coach", "yoga", "pilates"],
      summary: "Here are certified therapists, counselors, and wellness coaches in Valencia."
    }
  };

  let matchedTopic: { keywords: string[]; targetTerms: string[]; summary: string } | null = null;
  for (const topicKey of Object.keys(topicSynonyms)) {
    const topic = topicSynonyms[topicKey];
    if (topic.keywords.some(kw => cleanQuery.includes(kw) || rawTokens.includes(kw))) {
      matchedTopic = topic;
      break;
    }
  }

  const scoredPros: { id: string; score: number; reasonUrlExcerpt: string }[] = [];

  professionals.forEach((p: any) => {
    if (!p || p.id == null) return;
    const proId = String(p.id);
    const pName = (p.name || "").toLowerCase();
    const pCompany = (p.company_name || "").toLowerCase();
    const pCategory = (p.category || p.profession || "").toLowerCase();
    const pCats = [
      pCategory,
      ...(Array.isArray(p.categories) ? p.categories.map((c: any) => String(c).toLowerCase()) : [])
    ].join(" ");
    const pBio = (p.bio || p.description || "").toLowerCase();
    const pQualities = (Array.isArray(p.top_qualities) ? p.top_qualities.map((q: any) => String(q).toLowerCase()) : []).join(" ");
    const pFullText = `${pName} ${pCompany} ${pCats} ${pBio} ${pQualities}`;
    const pNorm = pFullText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let score = 0;
    let matchedReason = "";

    // Topic / Specialty matching
    if (matchedTopic) {
      const hitsTarget = matchedTopic.targetTerms.some(term => pNorm.includes(term));
      if (hitsTarget) {
        score += 75;
        matchedReason = `Specialized in ${p.category || p.profession || 'this discipline'} in Valencia.`;
      }
    }

    // Word tokens matching
    let tokenMatches = 0;
    rawTokens.forEach(tok => {
      if (tok.length <= 2) return;
      if (pName.includes(tok)) {
        score += 35;
        tokenMatches++;
      } else if (pCats.includes(tok)) {
        score += 30;
        tokenMatches++;
      } else if (pNorm.includes(tok)) {
        score += 15;
        tokenMatches++;
      }
    });

    if (tokenMatches > 0 && !matchedReason) {
      matchedReason = `Verified ${p.category || p.profession || 'professional'} in Valencia matching '${query}'.`;
    }

    // Spoken language filter
    if (requestedLangs.length > 0) {
      const speaksLang = proSpeaksAnyLanguage(p, requestedLangs);
      if (speaksLang) {
        score += 25;
        matchedReason = matchedReason 
          ? `${matchedReason} (Speaks ${requestedLangs.join(', ')})`
          : `Verified professional in Valencia who speaks ${requestedLangs.join(', ')}.`;
      } else if (score > 0) {
        score = Math.max(0, score - 50);
      }
    }

    if (p.is_recommended && score > 0) {
      score += 5;
    }

    score = Math.min(score, 98);

    if (score > 0) {
      scoredPros.push({
        id: proId,
        score,
        reasonUrlExcerpt: matchedReason || `Recommended ${p.category || p.profession || 'professional'} in Valencia.`
      });
    }
  });

  scoredPros.sort((a, b) => b.score - a.score);

  const exactMatchFound = scoredPros.length > 0 && scoredPros[0].score >= 40;

  let summaryMessage: string | null = null;
  if (requestedLangs.length > 0) {
    summaryMessage = `Here are the recommended professionals in Valencia who speak ${requestedLangs.join(', ')}.`;
  } else if (matchedTopic) {
    summaryMessage = matchedTopic.summary;
  } else if (exactMatchFound) {
    summaryMessage = `Here are the top-rated professionals in Valencia matching "${query}".`;
  } else {
    summaryMessage = `I couldn't find an exact match for "${query}", but here are top community-recommended professionals in Valencia.`;
  }

  return {
    exactMatchFound,
    summaryMessage,
    results: scoredPros
  };
}

export async function processSearch(query: string, professionals: any[]) {
  // Jane AI Paused flag: only pauses if explicitly requested via environment variable
  const isAiPaused = process.env.PAUSE_JANE_AI === "true";
  const apiKey = process.env.GEMINI_API_KEY;

  if (isAiPaused || !apiKey) {
    console.log(`[api/search] Jane AI running in local high-precision mode: "${query}"`);
    return fallbackSmartSearch(query, professionals);
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

  // Compact pro representation to keep prompt tokens well below free-tier TPM limits
  // Note: Reviews/ratings are deliberately excluded so they NEVER influence the Jane match score
  const proListBrief = professionals.map((p: any) => ({
    id: String(p.id),
    name: p.name,
    company_name: p.company_name || "",
    category: p.category || p.profession || "",
    categories: p.categories || (typeof p.profession === "string" ? p.profession.split(",").map((s: string) => s.trim()) : []),
    bio: (p.bio || p.description || "").slice(0, 180),
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

5. LANGUAGE REQUIREMENT (CRITICAL - ALWAYS ENGLISH):
   - You MUST ALWAYS write all explanations in ENGLISH, even if the user query was written in French, Spanish, or any other language!
   - Both "summaryMessage" and "reasonUrlExcerpt" MUST ALWAYS be written in English.

6. "exactMatchFound" & "summaryMessage" (JANE'S SHORT EXPLANATION):
   - "exactMatchFound": Set to true if at least one professional is a direct or strong match (score >= 40), false otherwise.
   - "summaryMessage" (MANDATORY): Always provide a SHORT, friendly explanation (1 to 2 sentences max, 15 to 25 words) written as Jane speaking naturally in the first person ("I") in ENGLISH.
   - In this short text, Jane explains her found results and why these professions/disciplines were chosen for the user's specific request.
   - English Examples:
     * "To help with your back pain, I've selected trusted physiotherapists and osteopaths in Valencia."
     * "Here are the top-rated professionals in Valencia matching your request."
     * "Here are the recommended professionals in Valencia who speak French."
     * If no exact match: "I couldn't find an exact match in our directory, but here are some close alternatives that may help."

7. Under "reasonUrlExcerpt" for each matched professional, write a concise sentence in ENGLISH explaining why they are recommended for this specific problem (e.g. "Physiotherapist specialized in spine rehabilitation and back pain", "Osteopath offering gentle postural realignment").

8. SPOKEN LANGUAGE REQUIREMENT (HIGHEST PRIORITY):
   - If the query explicitly asks for a language (e.g. "qui parle français", "french speaking", "habla español", etc.):
     * If matching pros speak that language, ONLY return those who speak it (score 75-100) and omit non-speakers.
     * If none speak it, return other matching pros with lower scores and explain in summaryMessage in English.`;

  // Resilient multi-model fallback chain:
  // 1. gemini-3.1-flash-lite: Highest daily request limit & lowest latency
  // 2. gemini-flash-latest: Independent daily quota pool
  // 3. gemini-3.8-flash: Third independent quota pool
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
  let lastError: any = null;
  let responseText = "";

  // Pass 1: Try each model immediately without stalling if one is unavailable
  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
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
              summaryMessage: { type: Type.STRING, description: "A very short, friendly 1-2 sentence explanation (max 25 words) in English from Jane explaining her found results to the user." },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "The professional's ID as a string" },
                    score: { type: Type.INTEGER, description: "The relevancy match score from 0 to 100" },
                    reasonUrlExcerpt: { type: Type.STRING, description: "Explanation of match or recommendation in English" }
                  },
                  required: ["id", "score", "reasonUrlExcerpt"]
                }
              }
            },
            required: ["exactMatchFound", "summaryMessage", "results"]
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
      const nextModel = candidateModels[i + 1];
      if (nextModel) {
        console.log(`[api/search] Model ${modelName} unavailable, seamlessly trying next fallback: ${nextModel}...`);
      }
    }
  }

  // Pass 2: If all models had a simultaneous spike, wait 1s and try one final pass
  if (!responseText) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const modelName of candidateModels) {
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
                summaryMessage: { type: Type.STRING, description: "A very short, friendly 1-2 sentence explanation (max 25 words) in English from Jane explaining her found results to the user." },
                results: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "The professional's ID as a string" },
                      score: { type: Type.INTEGER, description: "The relevancy match score from 0 to 100" },
                      reasonUrlExcerpt: { type: Type.STRING, description: "Explanation of match or recommendation in English" }
                    },
                    required: ["id", "score", "reasonUrlExcerpt"]
                  }
                }
              },
              required: ["exactMatchFound", "summaryMessage", "results"]
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
      }
    }
  }

  if (!responseText) {
    throw lastError || new Error("All AI matching models failed to generate a response.");
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
      if (!summaryMessage) {
        summaryMessage = `Here are the recommended professionals who speak ${requestedLangs.join(', ')}.`;
      }
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
    console.warn("[api/search] Gemini API quota reached. Serving high-precision catalog matching fallback:", error?.message || error);
    
    const cleanQuery = (query || "").trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const allTokens = cleanQuery.split(/[\s,.'"-]+/).filter((t: string) => t.length > 1);

    const locationTokens = allTokens.filter((t: string) => ['valencia', 'valence', 'spain', 'espagne', 'espana', 'ruzafa', 'russafa', 'carmen', 'canovas', 'alboraya', 'benimaclet'].includes(t));
    const tradeTokens = allTokens.filter((t: string) => !locationTokens.includes(t) && !['cherche', 'recherche', 'besoin', 'trouver', 'bon', 'bonne', 'meilleur', 'top', 'pro', 'recommande', 'expert', 'specialiste', 'pour', 'dans', 'avec', 'qui', 'parle', 'un', 'une', 'des', 'le', 'la', 'les'].includes(t));

    const fallbackResults = (professionals || []).map((p: any) => {
      const id = String(p.id);
      const pName = (p.name || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pCat = (p.category || p.profession || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pCats = ((Array.isArray(p.categories) ? p.categories : []).join(' ')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pCompany = (p.company_name || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pBio = (p.bio || p.description || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pLoc = (p.location || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let score = 0;
      let matchReason = `Specialized professional in Valencia`;

      if (tradeTokens.length > 0) {
        let matchedCount = 0;
        for (const t of tradeTokens) {
          let m = false;
          if (pName.includes(t)) { score += 60; m = true; }
          else if (pCat.includes(t) || pCats.includes(t)) { score += 55; m = true; matchReason = `Specialized in ${p.category || p.profession || 'services'}`; }
          else if (pCompany.includes(t)) { score += 45; m = true; }
          else if (pBio.length > 0 && new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`, 'i').test(pBio)) { score += 35; m = true; }
          if (m) matchedCount++;
        }
        if (matchedCount === 0) return { id, score: 0, reasonUrlExcerpt: "" };
        if (locationTokens.length > 0 && locationTokens.some((loc: string) => pLoc.includes(loc))) score += 10;
      } else if (locationTokens.length > 0) {
        const specificLoc = locationTokens.filter((t: string) => !['valencia', 'valence', 'spain', 'espagne', 'espana'].includes(t));
        if (specificLoc.length > 0 && specificLoc.some((loc: string) => pLoc.includes(loc))) score = 75;
        else if (specificLoc.length === 0) score = 60;
      }

      return {
        id,
        score: Math.min(100, score),
        reasonUrlExcerpt: matchReason
      };
    }).filter((r: any) => r.score >= 45).sort((a: any, b: any) => b.score - a.score);

    return res.status(200).json({
      exactMatchFound: fallbackResults.length > 0,
      summaryMessage: fallbackResults.length > 0 ? `Here are the top professionals matching your search for "${query}".` : `No matching professionals found for "${query}".`,
      results: fallbackResults,
      fallback_used: true
    });
  }
}
