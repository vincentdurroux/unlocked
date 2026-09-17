export interface MinimalProInfo {
  id: string | number;
  name?: string;
  company_name?: string;
  category?: string;
  profession?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  location?: string;
  address?: string;
  google_maps_url?: string;
  googleMapsUri?: string;
  is_recommended?: boolean | string | number;
  is_recommanded?: boolean | string | number;
  is_community_recommended?: boolean | string | number;
  source?: string;
  [key: string]: any;
}

export interface DuplicateMatch {
  matchedPro: MinimalProInfo;
  confidence: 'high' | 'medium';
  reasons: string[];
  matchedField: 'phone' | 'email' | 'website' | 'name' | 'company' | 'instagram' | 'address';
  isRecommendedTarget: boolean;
}

/**
 * Normalizes phone numbers into clean digit sequences.
 */
function extractPhoneDigits(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  return digits;
}

/**
 * Extracts significant digits for telephone matching (e.g., last 8 or 9 digits).
 */
function getPhoneKey(phone?: string): string {
  const digits = extractPhoneDigits(phone);
  if (digits.length >= 8) {
    // Return last 9 digits (standard Spanish/French national line length) or all digits if < 9
    return digits.length >= 9 ? digits.slice(-9) : digits.slice(-8);
  }
  return '';
}

/**
 * Normalizes text for comparison (lowercase, accents removed, punctuation removed, trimmed).
 */
function normalizeText(str?: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim();
}

/**
 * Removes common filler words / titles / business suffixes from normalized text.
 */
function removeStopWordsAndTitles(text: string): string {
  const wordsToFilter = new Set([
    'dr', 'dra', 'doctor', 'docteur', 'doctores', 'doctora',
    'clinica', 'clinic', 'cabinet', 'centre', 'centro', 'estudio', 'studio', 'atelier',
    'sl', 'slu', 'sa', 'sarl', 'srl', 'inc', 'ltd', 'gmbh', 'sociedad', 'limitada',
    'de', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'y', 'e', 'o', 'en',
    'le', 'les', 'du', 'des', 'et', 'a', 'au', 'aux',
    'valencia', 'espana', 'spain', 'france'
  ]);

  return text
    .split(' ')
    .filter(w => w.length > 1 && !wordsToFilter.has(w))
    .join(' ');
}

/**
 * Extracts domain name from website or social URL.
 */
function extractDomain(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const domain = clean.split('/')[0].split('?')[0].split('#')[0].trim();
    return domain.length >= 4 ? domain : '';
  } catch {
    return '';
  }
}

/**
 * Extracts social media handle (e.g. @handle or instagram.com/handle).
 */
function extractSocialHandle(urlOrHandle?: string): string {
  if (!urlOrHandle || typeof urlOrHandle !== 'string') return '';
  let clean = urlOrHandle.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, '').replace(/^www\./, '');
  clean = clean.replace(/^(instagram\.com|facebook\.com)\//, '');
  clean = clean.replace(/^@/, '');
  clean = clean.split('/')[0].split('?')[0].trim();
  return clean.length >= 3 ? clean : '';
}

/**
 * Calculates Levenshtein Distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Compares two name/text strings with multi-layer logic:
 * 1. Exact cleaned match
 * 2. Substring inclusion (shorter inside longer)
 * 3. Word set overlap (ratio of shorter string's words present in longer string)
 * 4. Levenshtein edit distance
 */
function evaluateNameMatch(strA: string, strB: string): { matched: boolean; score: number; reason?: string } {
  const normA = normalizeText(strA);
  const normB = normalizeText(strB);

  if (!normA || !normB) return { matched: false, score: 0 };

  // 1. Exact normalized match
  if (normA === normB) {
    return { matched: true, score: 1.0, reason: 'Identical name' };
  }

  // Strip titles and stopwords
  const cleanA = removeStopWordsAndTitles(normA);
  const cleanB = removeStopWordsAndTitles(normB);

  if (!cleanA || !cleanB) return { matched: false, score: 0 };

  if (cleanA === cleanB) {
    return { matched: true, score: 0.95, reason: 'Matching name (excluding titles)' };
  }

  // 2. Substring inclusion
  const minLen = Math.min(cleanA.length, cleanB.length);
  if (minLen >= 5 && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return { matched: true, score: 0.9, reason: 'Matching name fragment' };
  }

  // 3. Word set overlap
  const wordsA = cleanA.split(' ').filter(w => w.length > 1);
  const wordsB = cleanB.split(' ').filter(w => w.length > 1);

  if (wordsA.length > 0 && wordsB.length > 0) {
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);

    let matchCount = 0;
    const shorterWords = wordsA.length <= wordsB.length ? wordsA : wordsB;
    const longerSet = wordsA.length <= wordsB.length ? setB : setA;

    shorterWords.forEach(w => {
      if (longerSet.has(w)) matchCount++;
    });

    const subsetRatio = matchCount / shorterWords.length;
    if (shorterWords.length >= 2 && subsetRatio >= 0.8) {
      return { matched: true, score: 0.85, reason: 'Matching name keywords' };
    }
    if (shorterWords.length === 1 && matchCount === 1 && shorterWords[0].length >= 6) {
      // Single distinct long word match (e.g. unique surname or clinic name)
      return { matched: true, score: 0.75, reason: 'Matching primary surname/brand' };
    }
  }

  // 4. Edit distance for short names
  if (cleanA.length <= 25 && cleanB.length <= 25) {
    const maxLen = Math.max(cleanA.length, cleanB.length);
    const dist = levenshteinDistance(cleanA, cleanB);
    const sim = (maxLen - dist) / maxLen;
    if (sim >= 0.82 && dist <= 3) {
      return { matched: true, score: sim, reason: 'Very similar name' };
    }
  }

  return { matched: false, score: 0 };
}

/**
 * Finds if a given pro is a duplicate against a list of candidate pros.
 */
export function findDuplicateInList(
  targetPro: MinimalProInfo,
  candidateList: MinimalProInfo[]
): DuplicateMatch | null {
  if (!targetPro || !candidateList || candidateList.length === 0) return null;

  const targetId = String(targetPro.id);

  // Extract normalized target fields
  const tPhones = [
    getPhoneKey(targetPro.phone),
    getPhoneKey(targetPro.whatsapp),
    getPhoneKey(targetPro.telephone)
  ].filter(Boolean);

  const tEmail = (targetPro.email || '').toLowerCase().trim();
  const tWebsiteDomain = extractDomain(targetPro.website);
  const tInstagram = extractSocialHandle(targetPro.instagram);
  const tName = targetPro.name || '';
  const tCompany = targetPro.company_name || '';
  const tLocation = normalizeText(targetPro.location || targetPro.address);

  let bestMatch: DuplicateMatch | null = null;
  let highestScore = 0;

  for (const candidate of candidateList) {
    const candId = String(candidate.id);
    if (candId === targetId) continue;

    const reasons: string[] = [];
    let matchedField: 'phone' | 'email' | 'website' | 'name' | 'company' | 'instagram' | 'address' = 'name';
    let matchScore = 0;

    const isRecTarget = Boolean(
      candidate.is_recommended ||
      candidate.is_recommanded ||
      candidate.is_community_recommended
    );

    // 1. Phone match
    const cPhones = [
      getPhoneKey(candidate.phone),
      getPhoneKey(candidate.whatsapp),
      getPhoneKey(candidate.telephone)
    ].filter(Boolean);

    for (const tp of tPhones) {
      if (cPhones.some(cp => cp === tp || (tp.length >= 8 && cp.length >= 8 && (tp.endsWith(cp) || cp.endsWith(tp))))) {
        reasons.push('Matching phone / WhatsApp number');
        matchedField = 'phone';
        matchScore = Math.max(matchScore, 0.95);
        break;
      }
    }

    // 2. Email match
    const cEmail = (candidate.email || '').toLowerCase().trim();
    if (tEmail && cEmail && tEmail === cEmail) {
      reasons.push('Matching email address');
      matchedField = 'email';
      matchScore = Math.max(matchScore, 0.98);
    }

    // 3. Website domain match
    const cWebsiteDomain = extractDomain(candidate.website);
    if (tWebsiteDomain && cWebsiteDomain && tWebsiteDomain === cWebsiteDomain) {
      reasons.push(`Matching website domain (${tWebsiteDomain})`);
      matchedField = 'website';
      matchScore = Math.max(matchScore, 0.9);
    }

    // 4. Instagram match
    const cInstagram = extractSocialHandle(candidate.instagram);
    if (tInstagram && cInstagram && tInstagram === cInstagram) {
      reasons.push(`Matching Instagram handle (@${tInstagram})`);
      matchedField = 'instagram';
      matchScore = Math.max(matchScore, 0.9);
    }

    // 5. Name vs Name
    const cName = candidate.name || '';
    const nameMatch = evaluateNameMatch(tName, cName);
    if (nameMatch.matched) {
      reasons.push(nameMatch.reason || 'Identical name');
      if (matchScore === 0) matchedField = 'name';
      matchScore = Math.max(matchScore, nameMatch.score);
    }

    // 6. Company vs Company
    const cCompany = candidate.company_name || '';
    if (tCompany && cCompany) {
      const compMatch = evaluateNameMatch(tCompany, cCompany);
      if (compMatch.matched) {
        reasons.push(`Matching company name (${tCompany})`);
        if (matchScore === 0) matchedField = 'company';
        matchScore = Math.max(matchScore, compMatch.score);
      }
    }

    // 7. Cross comparison: Name vs Company
    if (!nameMatch.matched && tName && cCompany) {
      const cross1 = evaluateNameMatch(tName, cCompany);
      if (cross1.matched) {
        reasons.push('Cross-match between Name and Company');
        if (matchScore === 0) matchedField = 'name';
        matchScore = Math.max(matchScore, cross1.score * 0.9);
      }
    }
    if (!nameMatch.matched && tCompany && cName) {
      const cross2 = evaluateNameMatch(tCompany, cName);
      if (cross2.matched) {
        reasons.push('Cross-match between Company and Name');
        if (matchScore === 0) matchedField = 'company';
        matchScore = Math.max(matchScore, cross2.score * 0.9);
      }
    }

    // 8. Location match check if name is somewhat similar
    const cLocation = normalizeText(candidate.location || candidate.address);
    if (tLocation && cLocation && tLocation.length >= 8 && tLocation === cLocation && matchScore >= 0.5) {
      reasons.push('Matching address / location');
      matchScore += 0.1;
    }

    if (reasons.length > 0 && matchScore >= 0.7) {
      const isHighConfidence =
        matchScore >= 0.88 ||
        reasons.some(r => r.includes('phone') || r.includes('email') || r.includes('website') || r.includes('Identical'));

      const resultMatch: DuplicateMatch = {
        matchedPro: candidate,
        confidence: isHighConfidence ? 'high' : 'medium',
        reasons,
        matchedField,
        isRecommendedTarget: isRecTarget
      };

      // Prioritize recommended targets, then highest match score
      if (!bestMatch || (isRecTarget && !bestMatch.isRecommendedTarget) || (matchScore > highestScore && isRecTarget === bestMatch.isRecommendedTarget)) {
        bestMatch = resultMatch;
        highestScore = matchScore;
      }
    }
  }

  return bestMatch;
}

/**
 * Main helper: Detects if a Google Pro is a duplicate of any existing Recommended Pro or Pro in database.
 */
export function findDuplicateRecommendedPro(
  googlePro: MinimalProInfo,
  recommendedPros: MinimalProInfo[],
  allPros?: MinimalProInfo[]
): DuplicateMatch | null {
  if (!googlePro) return null;

  // First check against recommended pros (primary focus)
  const matchInRecs = findDuplicateInList(googlePro, recommendedPros || []);
  if (matchInRecs) return matchInRecs;

  // If not found in recommended pros, check against all other pros in database if provided
  if (allPros && allPros.length > 0) {
    const matchInAll = findDuplicateInList(googlePro, allPros);
    if (matchInAll) return matchInAll;
  }

  return null;
}
