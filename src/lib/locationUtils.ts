// Location and Distance Utilities for Valencia and Surrounding Areas

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ZoneInfo {
  name: string;
  coords: Coordinates;
  keywords: string[];
}

// Known neighborhoods in Valencia & major towns in Valencia province
export const VALENCIA_ZONES: ZoneInfo[] = [
  {
    name: "Ruzafa",
    coords: { lat: 39.4612, lng: -0.3725 },
    keywords: ["ruzafa", "russafa"]
  },
  {
    name: "El Carmen",
    coords: { lat: 39.4782, lng: -0.3789 },
    keywords: ["el carmen", "carmen", "barrio del carmen"]
  },
  {
    name: "Ciutat Vella / Center",
    coords: { lat: 39.4745, lng: -0.3763 },
    keywords: ["ciutat vella", "centre", "center", "centro", "valencia centro", "valencia center", "downtown"]
  },
  {
    name: "Benimaclet",
    coords: { lat: 39.4858, lng: -0.3582 },
    keywords: ["benimaclet"]
  },
  {
    name: "Eixample / Ensanche",
    coords: { lat: 39.4642, lng: -0.3690 },
    keywords: ["eixample", "ensanche", "canovas", "gran via"]
  },
  {
    name: "Extramurs / Gran Via",
    coords: { lat: 39.4680, lng: -0.3850 },
    keywords: ["extramurs", "arrancapins", "petxina", "la petxina"]
  },
  {
    name: "Campanar",
    coords: { lat: 39.4820, lng: -0.3980 },
    keywords: ["campanar", "nou campanar"]
  },
  {
    name: "El Cabanyal / Malvarrosa / Beach",
    coords: { lat: 39.4690, lng: -0.3280 },
    keywords: ["cabanyal", "cabañal", "malvarrosa", "malva-rosa", "playa", "platja", "poblats maritims", "poblados maritimos"]
  },
  {
    name: "Algirós",
    coords: { lat: 39.4750, lng: -0.3450 },
    keywords: ["algiros", "algirós", "amistat", "cedro"]
  },
  {
    name: "Quatre Carreres / City of Arts",
    coords: { lat: 39.4550, lng: -0.3550 },
    keywords: ["quatre carreres", "ciudad de las artes", "cite des arts", "monteolivete", "narovella"]
  },
  {
    name: "Patraix",
    coords: { lat: 39.4570, lng: -0.3920 },
    keywords: ["patraix", "zafra"]
  },
  {
    name: "Oliveral / San Marcelino",
    coords: { lat: 39.4470, lng: -0.3880 },
    keywords: ["oliveral", "san marcelino", "sant marceli"]
  },
  {
    name: "Saïdia",
    coords: { lat: 39.4830, lng: -0.3750 },
    keywords: ["saidia", "saidia", "marxalenes", "tormos"]
  },
  {
    name: "La Eliana / L'Eliana",
    coords: { lat: 39.5663, lng: -0.5288 },
    keywords: ["la eliana", "l'eliana", "eliana"]
  },
  {
    name: "Mas Camarena",
    coords: { lat: 39.5370, lng: -0.4480 },
    keywords: ["mas camarena", "mascamarena", "camarena", "sector mas camarena"]
  },
  {
    name: "La Cañada / El Plantío",
    coords: { lat: 39.5210, lng: -0.4680 },
    keywords: ["la canada", "la cañada", "la canyada", "canyada", "plantio", "el plantio", "el plantío"]
  },
  {
    name: "Godella",
    coords: { lat: 39.5180, lng: -0.4130 },
    keywords: ["godella", "campolivar", "campo olivar"]
  },
  {
    name: "Rocafort",
    coords: { lat: 39.5290, lng: -0.4070 },
    keywords: ["rocafort", "santa barbara", "santa bárbara"]
  },
  {
    name: "Moncada",
    coords: { lat: 39.5440, lng: -0.3940 },
    keywords: ["moncada", "montcada"]
  },
  {
    name: "San Antonio de Benagéber",
    coords: { lat: 39.5600, lng: -0.5000 },
    keywords: ["san antonio de benageber", "san antonio de benagéber", "san antonio", "san antonio de benagever", "colinas de san antonio"]
  },
  {
    name: "Puzol / Puçol",
    coords: { lat: 39.6170, lng: -0.3010 },
    keywords: ["puzol", "puçol", "alfinach", "monasterios", "los monasterios"]
  },
  {
    name: "Torrent",
    coords: { lat: 39.4372, lng: -0.4651 },
    keywords: ["torrent", "torrente"]
  },
  {
    name: "Paterna",
    coords: { lat: 39.5028, lng: -0.4402 },
    keywords: ["paterna", "valterna", "heron city", "tactica", "táctica", "parque tecnologico", "parc tecnologic"]
  },
  {
    name: "Alboraya / Alboraia",
    coords: { lat: 39.5010, lng: -0.3500 },
    keywords: ["alboraya", "alboraia", "port saplaya", "patacona", "la patacona"]
  },
  {
    name: "Burjassot",
    coords: { lat: 39.5090, lng: -0.4120 },
    keywords: ["burjassot", "burjasot"]
  },
  {
    name: "Mislata",
    coords: { lat: 39.4750, lng: -0.4180 },
    keywords: ["mislata"]
  },
  {
    name: "Bétera",
    coords: { lat: 39.5910, lng: -0.4620 },
    keywords: ["betera", "bétera", "torre en conill", "torre conill"]
  },
  {
    name: "Sagunto / Sagunt",
    coords: { lat: 39.6800, lng: -0.2780 },
    keywords: ["sagunto", "sagunt", "puerto de sagunto"]
  },
  {
    name: "Cullera",
    coords: { lat: 39.1650, lng: -0.2540 },
    keywords: ["cullera"]
  },
  {
    name: "Gandia",
    coords: { lat: 38.9670, lng: -0.1800 },
    keywords: ["gandia", "gandía"]
  }
];

export const DEFAULT_VALENCIA_CENTER: Coordinates = {
  lat: 39.4699,
  lng: -0.3763
};

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null
): number | null {
  if (
    typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
    isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2) ||
    (lat1 === 0 && lng1 === 0) || (lat2 === 0 && lng2 === 0)
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal precision e.g. 3.4 km
}

/**
 * Detects if a query asks for a specific neighborhood, zone, or town in Valencia.
 */
export function detectTargetZone(
  query: string,
  userLocation?: Coordinates | null
): { centerCoords: Coordinates; zoneName: string; isSpecificZone: boolean } {
  const isNearbyValencia = userLocation && calculateDistanceKm(
    userLocation.lat, userLocation.lng,
    DEFAULT_VALENCIA_CENTER.lat, DEFAULT_VALENCIA_CENTER.lng
  )! <= 80;

  if (!query || typeof query !== 'string') {
    return {
      centerCoords: (isNearbyValencia && userLocation) ? userLocation : DEFAULT_VALENCIA_CENTER,
      zoneName: (isNearbyValencia && userLocation) ? "Your location" : "Valencia",
      isSpecificZone: false
    };
  }

  const normalized = query.toLowerCase().trim();

  // Search through known Valencia zones
  for (const zone of VALENCIA_ZONES) {
    for (const keyword of zone.keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        return {
          centerCoords: zone.coords,
          zoneName: zone.name,
          isSpecificZone: true
        };
      }
    }
  }

  // Default to user location if within Valencia area (<80km), otherwise central Valencia
  return {
    centerCoords: (isNearbyValencia && userLocation) ? userLocation : DEFAULT_VALENCIA_CENTER,
    zoneName: (isNearbyValencia && userLocation) ? "Your location" : "Valencia",
    isSpecificZone: false
  };
}

export interface ProWithDistance {
  [key: string]: any;
  coordinates?: Coordinates | null;
  distanceKm?: number | null;
  is_community_recommended?: boolean;
  source?: string;
  rating?: number;
  review_count?: number;
  reviews_count?: number;
}

/**
 * Applies the 3-Tier priority sorting logic requested by the user:
 * 1. App recommended pros (community pros) within radiusKm (default 25 km)
 * 2. Google Places pros within radiusKm (default 25 km) sorted by highest rating first
 * 3. Other pros (distance > 25 km or unknown location)
 */
export function sortProfessionalsByProximityAndRating<T extends ProWithDistance>(
  pros: T[],
  centerCoords: Coordinates,
  radiusKm: number = 25
): T[] {
  if (!Array.isArray(pros)) return [];

  // Compute distance for each pro
  const prosWithDist = pros.map(pro => {
    let dist: number | null = null;
    
    // Check if coordinates exist
    if (pro.coordinates && typeof pro.coordinates.lat === 'number' && typeof pro.coordinates.lng === 'number') {
      dist = calculateDistanceKm(centerCoords.lat, centerCoords.lng, pro.coordinates.lat, pro.coordinates.lng);
    } else if (typeof pro.lat === 'number' && typeof pro.lng === 'number') {
      dist = calculateDistanceKm(centerCoords.lat, centerCoords.lng, pro.lat, pro.lng);
    }

    return {
      ...pro,
      distanceKm: dist
    };
  });

  const isCommunity = (p: ProWithDistance) => {
    return p.source !== 'google' && p.source !== 'google_places' && p.is_community_recommended !== false;
  };

  // Group into 3 Tiers
  const tier1: typeof prosWithDist = []; // Community recommended pros <= 25km
  const tier2: typeof prosWithDist = []; // Google Places pros <= 25km
  const tier3: typeof prosWithDist = []; // Other pros (> 25km or no dist)

  for (const pro of prosWithDist) {
    const isWithinRadius = pro.distanceKm !== null && pro.distanceKm <= radiusKm;

    if (isWithinRadius) {
      if (isCommunity(pro)) {
        tier1.push(pro);
      } else {
        tier2.push(pro);
      }
    } else {
      tier3.push(pro);
    }
  }

  // Tier 1 sorting: Community pros within 25 km
  // Sub-sorted by closest distance first, then higher rating
  tier1.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      if (Math.abs(a.distanceKm - b.distanceKm) > 0.1) {
        return a.distanceKm - b.distanceKm;
      }
    }
    return (b.rating || 0) - (a.rating || 0);
  });

  // Tier 2 sorting: Google Places pros
  // User directive: "Supprime les ordres de priorité des pros de google places.
  // La seule regle est les plus proches de ma position gps en premier sauf si une demande particuliere d'emplacement est demandée par l'utilisateur.
  // Et pas plus de 6 pros de google places données"
  tier2.sort((a, b) => {
    const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
    const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
    return distA - distB;
  });

  // Strict limit of maximum 6 Google Places pros
  let cappedTier2 = tier2.slice(0, 6);

  // If no Google Places pros were within radiusKm, but some exist in tier3, promote up to 6 closest
  if (cappedTier2.length === 0) {
    const tier3Google = tier3.filter(p => !isCommunity(p));
    if (tier3Google.length > 0) {
      tier3Google.sort((a, b) => {
        const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
        const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
        return distA - distB;
      });
      cappedTier2 = tier3Google.slice(0, 6);
    }
  }

  // Tier 3 sorting: Other pros (> 25km)
  // Sub-sorted by Community first, then closest distance (excluding pros already included in cappedTier2)
  const cappedTier2Ids = new Set(cappedTier2.map(p => String(p.id)));
  const remainingTier3 = tier3.filter(p => !cappedTier2Ids.has(String(p.id)));

  remainingTier3.sort((a, b) => {
    const aComm = isCommunity(a) ? 1 : 0;
    const bComm = isCommunity(b) ? 1 : 0;
    if (aComm !== bComm) return bComm - aComm;

    const distA = typeof a.distanceKm === 'number' ? a.distanceKm : 999999;
    const distB = typeof b.distanceKm === 'number' ? b.distanceKm : 999999;
    return distA - distB;
  });

  return [...tier1, ...cappedTier2, ...remainingTier3];
}

// Clean conversational and proximity phrases from user query for trade searches
export function cleanTradeSearchTerm(query: string): string {
  if (!query) return "";
  let q = query.trim();

  // Strip conversational polite / search prefixes (French, English, Spanish)
  q = q.replace(/^(bonjour|salut|hello|hola|hey|bonsoir)[,\s]+/i, '');
  q = q.replace(/\b(je\s+cherche\s+(un|une|des|le|la|les)?|j'ai\s+besoin\s+d'(un|une|de)?|recherche\s+(un|une|d'un|d'une)?|trouver\s+(un|une)?|cherche\s+(un|une)?|donne[- ]moi\s+(un|une)?|avez[- ]vous\s+(un|une)?|est[- ]ce\s+qu'il\s+y\s+a\s+(un|une)?|pourriez[- ]vous\s+me\s+(donner|conseiller)\s+(un|une)?)\b/gi, '');
  q = q.replace(/\b(i('m|\s+am)?\s+looking\s+for\s+(a|an)?|looking\s+for\s+(a|an)?|need\s+(a|an)?|find\s+(a|an)?|search\s+for\s+(a|an)?|can\s+you\s+recommend\s+(a|an)?)\b/gi, '');
  q = q.replace(/\b(busco\s+(un|una)?|necesito\s+(un|una)?|encuentra\s+(un|una)?|recomiéndame\s+(un|una)?)\b/gi, '');

  // Strip location phrases when specific zone is handled separately
  q = q.replace(/\b(situ[ée]e?(\s+[aà]|\s+vers|\s+au)?|located\s+(in|at|around)?|ubicad[oa]\s+(en)?)\b/gi, '');
  q = q.replace(/\b(dans\s+le\s+quartier\s+(de|d')?|dans\s+la\s+zone\s+(de|d')?|vers|around)\b/gi, '');

  // Strip proximity tokens
  q = q.replace(/\b(autour\s+de\s+moi|proche\s+de\s+moi|près\s+de\s+moi|près\s+d'ici|autour|proche|near\s+me|around\s+me|close\s+to\s+me|cerca\s+de\s+mí|cerca\s+de\s+mi|alrededor)\b/gi, '');
  q = q.replace(/\s+/g, ' ').trim();

  if (!q) q = query.trim();
  return q;
}

// Build optimized Google Places search string targeting Valencia, Spain
export function buildOptimizedPlacesQuery(rawQuery: string, isSpecificZone: boolean, zoneName?: string, hasGps?: boolean): string {
  const clean = cleanTradeSearchTerm(rawQuery);
  const lower = clean.toLowerCase();

  // Map common trades and activity queries to precise Spanish search terms for Google Places Spain
  let spanishTerms = "";

  // Check if query is just a generic leisure/activity request
  const isGenericActivity = /^(choses?\s+[aà]\s+faire|activit[ée]s?|loisirs?|sorties?|que\s+faire|things?\s+to\s+do|activities|experiences?|sortir|what\s+to\s+do|leisure)$/i.test(lower);

  if (isGenericActivity) {
    spanishTerms = "actividades ocio tours experiencias talleres deportes";
  } else if (isActivityQuery(lower)) {
    // Keep user's specific activity and translate the sports/leisure type precisely
    let specificQuery = clean;
    // Strip common generic words
    specificQuery = specificQuery.replace(/\b(activit[ée]s?(\s+de)?|choses?\s+[aà]\s+faire(\s+comme|\s+de)?|things?\s+to\s+do|activities?(\s+of)?|experiences?)\b/gi, '');
    specificQuery = specificQuery.replace(/\s+/g, ' ').trim();

    if (specificQuery) {
      const lowerSpecific = specificQuery.toLowerCase();
      if (/\b(sports?\s+de\s+raquettes?|raquettes?|racket\s+sports?|padel|tennis|squash|badminton|ping\s*pong|table\s+tennis)\b/i.test(lowerSpecific)) {
        spanishTerms = "club de padel tenis deportes raqueta";
      } else if (/\b(sports?\s+nautiques?|activit[ée]s?\s+nautiques?|water\s+sports?|paddle\s*surf|sup|kayak|cano[eë]|voile|sailing|bateau|boat\s+rental)\b/i.test(lowerSpecific)) {
        spanishTerms = "alquiler de barcos paddle surf kayak deportes acuaticos";
      } else if (/\b(creative|art|pottery|poterie|ceramics?|c[ée]ramique|peinture|painting|crafts|loisirs\s+cr[ée]atifs)\b/i.test(lowerSpecific)) {
        spanishTerms = "taller de ceramica alfareria pintura manualidades";
      } else if (/\b(cuisine|cooking|chef|paella|cours?\s+de\s+cuisine|gastronom[ie]|gastronomy|wine|vin|degustation)\b/i.test(lowerSpecific)) {
        spanishTerms = "clase de cocina paella cata de vinos gastronomia";
      } else if (/\b(v[ée]lo|bike|scooter|trottinette|cycling|balade\s+a\s+velo)\b/i.test(lowerSpecific)) {
        spanishTerms = "alquiler de bicicletas cicloturismo bike rental";
      } else if (/\b(escalade|climbing|randonn[ée]e|hiking|trekking|montagne|mountain)\b/i.test(lowerSpecific)) {
        spanishTerms = "senderismo escalada rocodromo excursiones";
      } else if (/\b(danse|dance|salsa|bachata|tango)\b/i.test(lowerSpecific)) {
        spanishTerms = "academia de baile salsa bachata clases de danza";
      } else {
        spanishTerms = specificQuery;
      }
    } else {
      spanishTerms = "actividades ocio tours experiencias talleres deportes";
    }
  } else if (/\b(ost[ée]opathe?|osteopath|mal\s+au\s+dos|mal\s+de\s+dos|dos\s+coinc[eé]|lumbago|sciatique|mal\s+aux\s+muscles|mal\s+aux\s+articulations|douleur\s+dos|back\s+pain)\b/i.test(lower)) {
    spanishTerms = "osteopata fisioterapeuta osteopatia";
  } else if (/\b(kin[ée]sith[ée]rapeute?|kin[ée]|kine|physiotherapist|physio|reeducation|r[eé]éducation)\b/i.test(lower)) {
    spanishTerms = "fisioterapeuta fisioterapia";
  } else if (/\b(dentiste?|dentist|orthodontiste?|mal\s+aux\s+dents|mal\s+de\s+dents|rage\s+de\s+dents|toothache)\b/i.test(lower)) {
    spanishTerms = "dentista clinica dental";
  } else if (/\b(m[ée]decin(\s+g[ée]n[ée]raliste)?|docteur|doctor|gp|m[ée]decine|malade|fi[eè]vre|grippe)\b/i.test(lower)) {
    spanishTerms = "medico consulta medica";
  } else if (/\b(p[ée]diatre?|pediatrician)\b/i.test(lower)) {
    spanishTerms = "pediatra clinica pediatrica";
  } else if (/\b(ophtalmologue?|ophtalmo|ophthalmologist)\b/i.test(lower)) {
    spanishTerms = "oftalmologo clinica oftalmologica";
  } else if (/\b(dermatologue?|dermato|dermatologist)\b/i.test(lower)) {
    spanishTerms = "dermatologo dermatologia";
  } else if (/\b(gyn[ée]cologue?|gyneco|gynecologist)\b/i.test(lower)) {
    spanishTerms = "ginecologo ginecologia";
  } else if (/\b(psychologue?|psyc?hologist)\b/i.test(lower)) {
    spanishTerms = "psicologo psicologia";
  } else if (/\b(v[ée]t[ée]rinaire?|vet|veterinarian)\b/i.test(lower)) {
    spanishTerms = "veterinario clinica veterinaria";
  } else if (/\b(plombier|plumber)\b/i.test(lower)) {
    spanishTerms = "fontanero fontaneria";
  } else if (/\b([ée]lectricien|electrician)\b/i.test(lower)) {
    spanishTerms = "electricista";
  } else if (/\b(serrurier|locksmith)\b/i.test(lower)) {
    spanishTerms = "cerrajero cerrajeria";
  } else if (/\b(coiffeur|coiffeuse|hairdresser|barbier|barber)\b/i.test(lower)) {
    spanishTerms = "peluqueria peluquero";
  } else if (/\b(avocat|lawyer|attorney)\b/i.test(lower)) {
    spanishTerms = "abogado despacho abogados";
  } else if (/\b(comptable|expert-comptable|accountant|fiscaliste)\b/i.test(lower)) {
    spanishTerms = "gestoria asesor fiscal contable";
  } else if (/\b(notaire|notary)\b/i.test(lower)) {
    spanishTerms = "notaria notario";
  } else if (/\b(m[ée]canicien|garagiste|mechanic)\b/i.test(lower)) {
    spanishTerms = "taller mecanico";
  } else if (/\b(peintre|painter)\b/i.test(lower)) {
    spanishTerms = "pintor pintura";
  }

  const queryToUse = spanishTerms || clean;

  if (isSpecificZone && zoneName) {
    return `${queryToUse} ${zoneName} Valencia Spain`;
  }
  if (hasGps) {
    return queryToUse;
  }
  return `${queryToUse} in Valencia Spain`;
}

// Check for cross-specialty pollution (e.g., user asks for osteopath but place is a dental clinic or animal clinic)
export function isTradeMismatched(rawQuery: string, placeName: string, placeCategory: string): boolean {
  const q = rawQuery.toLowerCase();
  const text = `${placeName} ${placeCategory}`.toLowerCase();

  // User specifically wants activities / sports / leisure: reject all clinical, legal, accounting, home repairs, real estate and admin trades
  if (isActivityQuery(q)) {
    const isMismatchedActivityCategory = /\b(dentist|odontol|ortodonc|medico|doctor|clinica\s+dental|consulta\s+medica|pediatr|abogad|notari|notaire|fontaner|plombier|plumber|electric|cerrajer|serrurier|locksmith|taller\s+mecanico|mecanicien|inmobiliar|immobilier|real\s+estate|realtor|relocation|accountant|comptable|fiscaliste|gestor|asesor|padr[oó]n|nie|taxes|lawyer|avocat|plumbing)\b/i.test(text);
    if (isMismatchedActivityCategory) {
      return true;
    }
  }

  // User specifically wants an osteopath or has back pain/muscle pain symptoms: reject all unrelated lifestyle, retail, food, beauty, or professional trades (like hairdressers, bakeries, shopping malls, bars, restaurants, lawyers, real estate, plumbers, mechanics)
  if (/\b(ost[ée]opathe?|osteopath|osteopata|osteopatia|mal\s+au\s+dos|mal\s+de\s+dos|dos\s+coinc[eé]|lumbago|sciatique|back\s+pain|mal\s+aux\s+muscles|mal\s+aux\s+articulations|douleur\s+dos)\b/i.test(q)) {
    const isMismatchedBackPainCategory = /\b(peluquer|hair|coiffeur|pasteler|baker|panader|reposter|comercial|mall|tienda|store|restauran|bar|tapas|cafe|abogad|lawyer|notari|notaire|inmobiliar|immobilier|real\s+estate|realtor|fontaner|plombier|plumber|electric|cerrajer|serrurier|locksmith|taller|mecanic|dental|dentist|odontol|ortodonc|dientes|veterinar|animal|pet|hotel)\b/i.test(text);
    if (isMismatchedBackPainCategory) {
      return true;
    }
  }

  // User specifically wants a dentist: reject osteopaths, physios, lawyers, vets
  if (/\b(dentiste?|dentist|dentista|odontol|orthodont)\b/i.test(q)) {
    if (/\b(osteopat|fisioterap|veterinar|animal|abogad|peluquer|hotel|restauran)\b/i.test(text)) {
      return true;
    }
  }

  // User wants a plumber: reject electricians, locksmiths, painters, lawyers, health pros
  if (/\b(plombier|plumber|fontaner)\b/i.test(q)) {
    if (/\b(electric|cerrajer|pintor|abogad|dentist|medico|veterinar)\b/i.test(text)) {
      return true;
    }
  }

  // User wants a lawyer: reject real estate, accountants, doctors, dental
  if (/\b(avocat|lawyer|abogad)\b/i.test(q)) {
    if (/\b(inmobiliar|dentist|medico|veterinar|fontaner|electric)\b/i.test(text)) {
      return true;
    }
  }

  // User wants a hairdresser: reject medical, legal, home repairs
  if (/\b(coiffeur|hairdresser|peluquer|barber)\b/i.test(q)) {
    if (/\b(dentist|medico|abogad|fontaner|taller)\b/i.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a query is asking for things to do, activities, leisure, sports, entertainment, or outings.
 */
export function isActivityQuery(query?: string | null): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.toLowerCase();
  return /\b(choses?\s+[aà]\s+faire|activit[ée]s?|loisirs?|sorties?|que\s+faire|things?\s+to\s+do|activities|experiences?|sortir|spectacles?|concerts?|events?|[ée]v[ée]nements?|weekend|visiter|visite|divertissement|sports?|entertainment|divertir|amuser|escapades?)\b/i.test(q);
}

