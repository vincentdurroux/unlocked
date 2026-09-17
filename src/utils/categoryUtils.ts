// Utility for intelligently and conservatively detecting and mapping categories for Google Pros and CSV imports.
// Strictly reuses existing app category names ONLY when they refer to the exact same profession
// (e.g. "plumbing", "plumbers", "plombier" -> "Plumber", "electricians" -> "Electrician").
// Prevents false-positive merges of distinct trades (e.g. "Architect" vs "Interior Design",
// "Automatic Doors" vs "Automotive Repairs / Mechanic", "Taxi" vs "Tax Advisor", "Carpet" vs "Carpenter").
// When a category does not match an existing trade in the app, it is preserved and added cleanly in Title Case.

export interface SynonymGroup {
  id: string;
  canonicalDefault: string;
  terms: string[];
}

export const SYNONYM_GROUPS: SynonymGroup[] = [
  {
    id: 'plumber',
    canonicalDefault: 'Plumber',
    terms: [
      'plumber', 'plumbers', 'plumbing',
      'plombier', 'plombiers', 'plomberie',
      'fontanero', 'fontaneros', 'fontaneria',
      'sanitaire', 'sanitair'
    ]
  },
  {
    id: 'electrician',
    canonicalDefault: 'Electrician',
    terms: [
      'electrician', 'electricians', 'electrical', 'electricity',
      'electricien', 'electriciens', 'electricite',
      'electricista', 'electricistas', 'electricidad'
    ]
  },
  {
    id: 'dentist',
    canonicalDefault: 'Dentist',
    terms: [
      'dentist', 'dentists', 'dentistry', 'dental clinic', 'dental',
      'dentiste', 'dentistes',
      'dentista', 'dentistas', 'odontologo', 'odontologa', 'odontologia',
      'ortodoncista', 'orthodontiste'
    ]
  },
  {
    id: 'architect',
    canonicalDefault: 'Architect',
    // STRICTLY architectural design / building architecture. Never interior design or decoration!
    terms: [
      'architect', 'architects', 'architecture', 'architectural',
      'architecte', 'architectes', 'cabinet d architecture',
      'arquitecto', 'arquitectos', 'arquitectura', 'estudio de arquitectura'
    ]
  },
  {
    id: 'interior_design',
    canonicalDefault: 'Interior Design',
    // STRICTLY interior design / decoration. Separate from structural architecture!
    terms: [
      'interior design', 'interior designer', 'interior designers', 'interior decoration', 'interior decorator', 'interior decorators',
      'architecte d interieur', 'architecte interieur', 'architecture d interieur',
      'decorateur', 'decoratrice', 'decorateur d interieur', 'decoratrice d interieur', 'decoration d interieur',
      'diseno de interiores', 'disenador de interiores', 'disenadora de interiores', 'decorador de interiores'
    ]
  },
  {
    id: 'mechanic',
    canonicalDefault: 'Mechanic',
    // Car and vehicle mechanics ONLY. Never automatic doors or unrelated automation!
    terms: [
      'mechanic', 'mechanics', 'auto mechanic', 'car mechanic',
      'auto repair', 'automotive repair', 'automotive repairs', 'car repair', 'car repairs',
      'auto service', 'car service',
      'mecanicien', 'mecaniciens', 'garage automobile', 'reparation automobile', 'carrosserie',
      'mecanico', 'mecanicos', 'taller mecanico', 'taller de coches', 'taller mecanica', 'reparacion automotriz'
    ]
  },
  {
    id: 'automatic_doors',
    canonicalDefault: 'Automatic Doors',
    // Door and gate automation installation. Distinct from vehicle automotive repairs!
    terms: [
      'automatic doors', 'automatic door', 'automatic gate', 'automatic gates',
      'portes automatiques', 'porte automatique', 'portails automatiques', 'portail automatique',
      'puertas automaticas', 'puerta automatica'
    ]
  },
  {
    id: 'locksmith',
    canonicalDefault: 'Locksmith',
    terms: [
      'locksmith', 'locksmiths', 'locksmithing',
      'serrurier', 'serruriers', 'serrurerie',
      'cerrajero', 'cerrajeros', 'cerrajeria'
    ]
  },
  {
    id: 'cleaner',
    canonicalDefault: 'Cleaner & Housekeeping',
    terms: [
      'cleaner', 'cleaners', 'cleaning', 'cleaning service', 'housekeeping', 'housekeeper', 'maid', 'concierge',
      'nettoyage', 'nettoyage professionnel', 'femme de menage', 'menage',
      'limpieza', 'empresa de limpieza', 'empleada de hogar'
    ]
  },
  {
    id: 'air_conditioning',
    canonicalDefault: 'Air Conditioning & HVAC',
    terms: [
      'air conditioning', 'air conditioner', 'air conditioning hvac', 'hvac',
      'climatisation', 'climatiseur',
      'aire acondicionado', 'climatizacion',
      'chauffage', 'calefaccion'
    ]
  },
  {
    id: 'builder',
    canonicalDefault: 'Builder & Renovation',
    terms: [
      'builder', 'builders', 'general contractor', 'building contractor', 'renovation', 'renovations', 'construction',
      'macon', 'macons', 'maconnerie', 'entreprise du batiment',
      'albanil', 'albaniles', 'albanileria', 'reformas', 'reformas integrales', 'empresa de reformas'
    ]
  },
  {
    id: 'handyman',
    canonicalDefault: 'Handyman',
    terms: [
      'handyman', 'handymen', 'bricoleur', 'bricolage', 'manitas', 'reparaciones'
    ]
  },
  {
    id: 'painter',
    canonicalDefault: 'Painter',
    terms: [
      'painter', 'painters', 'painting',
      'peintre', 'peintres', 'peinture',
      'pintor', 'pintores', 'pintura'
    ]
  },
  {
    id: 'carpenter',
    canonicalDefault: 'Carpenter',
    terms: [
      'carpenter', 'carpenters', 'carpentry',
      'menuisier', 'menuisiers', 'menuiserie', 'charpentier', 'charpentiers', 'charpente',
      'carpintero', 'carpinteros', 'carpinteria', 'ebeniste', 'ebanista'
    ]
  },
  {
    id: 'gardener',
    canonicalDefault: 'Gardener',
    terms: [
      'gardener', 'gardeners', 'gardening', 'landscaper', 'landscaping', 'landscape gardener',
      'jardinier', 'jardiniers', 'jardinage', 'paysagiste', 'paysagistes',
      'jardinero', 'jardineros', 'jardineria'
    ]
  },
  {
    id: 'mover',
    canonicalDefault: 'Mover',
    terms: [
      'mover', 'movers', 'moving', 'moving company',
      'demenageur', 'demenageurs', 'demenagement',
      'mudanzas', 'empresa de mudanzas'
    ]
  },
  {
    id: 'physiotherapist',
    canonicalDefault: 'Physiotherapist',
    terms: [
      'physiotherapist', 'physiotherapists', 'physiotherapy', 'physical therapist', 'physical therapy',
      'kinesitherapeute', 'kinesitherapeutes', 'kinesitherapie', 'kine', 'kiné',
      'fisioterapeuta', 'fisioterapeutas', 'fisioterapia'
    ]
  },
  {
    id: 'osteopath',
    canonicalDefault: 'Osteopath',
    terms: [
      'osteopath', 'osteopaths', 'osteopathy',
      'osteopathe', 'osteopathes', 'osteopathie',
      'osteopata', 'osteopatas', 'osteopatia'
    ]
  },
  {
    id: 'doctor',
    canonicalDefault: 'General Practitioner',
    terms: [
      'general practitioner', 'gp', 'family doctor', 'physician',
      'medecin', 'medecin generaliste', 'docteur',
      'medico', 'medico general', 'medico de cabecera'
    ]
  },
  {
    id: 'therapist',
    canonicalDefault: 'Therapist / Psychologist',
    terms: [
      'psychologist', 'psychologists', 'psychology', 'therapist', 'therapists', 'psychotherapist', 'counselor',
      'psychologue', 'psychologues', 'psychotherapeute',
      'psicologo', 'psicologa', 'psicologos', 'psicoterapeuta'
    ]
  },
  {
    id: 'lawyer',
    canonicalDefault: 'Lawyer',
    terms: [
      'lawyer', 'lawyers', 'attorney', 'attorneys', 'legal counsel',
      'avocat', 'avocats', 'cabinet d avocats',
      'abogado', 'abogados', 'despacho de abogados'
    ]
  },
  {
    id: 'notary',
    canonicalDefault: 'Notary',
    terms: [
      'notary', 'notary public',
      'notaire', 'etude notariale',
      'notario', 'notaria'
    ]
  },
  {
    id: 'tax_advisor',
    canonicalDefault: 'Tax Advisor / Gestor',
    terms: [
      'tax advisor', 'tax consultant', 'accountant', 'accountants', 'accounting',
      'gestor', 'gestoria',
      'expert comptable', 'comptable',
      'asesor fiscal', 'asesoria', 'contable'
    ]
  },
  {
    id: 'real_estate',
    canonicalDefault: 'Real Estate Agent',
    terms: [
      'real estate', 'real estate agent', 'real estate agency', 'realtor',
      'agent immobilier', 'agence immobiliere',
      'inmobiliaria', 'agente inmobiliario'
    ]
  },
  {
    id: 'veterinarian',
    canonicalDefault: 'Veterinarian',
    terms: [
      'veterinarian', 'veterinarians', 'veterinary', 'veterinary clinic', 'vet',
      'veterinaire', 'veterinaires', 'clinique veterinaire',
      'veterinario', 'veterinarios', 'clinica veterinaria'
    ]
  },
  {
    id: 'hairdresser',
    canonicalDefault: 'Hairdresser',
    terms: [
      'hairdresser', 'hairdressers', 'hair salon', 'barber', 'barbers', 'barbershop',
      'coiffeur', 'coiffeurs', 'coiffeuse', 'salon de coiffure',
      'peluquero', 'peluqueros', 'peluqueria', 'barberia'
    ]
  },
  {
    id: 'photographer',
    canonicalDefault: 'Photographer',
    terms: [
      'photographer', 'photographers', 'photography',
      'photographe', 'photographes',
      'fotografo', 'fotografos', 'fotografia'
    ]
  },
  {
    id: 'solar_energy',
    canonicalDefault: 'Solar & Energy',
    terms: [
      'solar energy', 'solar panels', 'solar installation',
      'panneaux solaires', 'energie solaire',
      'energia solar', 'paneles solares'
    ]
  },
  {
    id: 'web_developer',
    canonicalDefault: 'Web Developer',
    terms: [
      'web developer', 'software developer', 'web designer',
      'developpeur web', 'informatique',
      'desarrollador web', 'programador'
    ]
  },
  {
    id: 'nursery',
    canonicalDefault: 'Nursery School',
    terms: [
      'nursery', 'nursery school', 'daycare', 'childcare', 'preschool',
      'creche', 'garderie', 'guarderia', 'escuela infantil'
    ]
  },
  {
    id: 'gym_fitness',
    canonicalDefault: 'Gym & Fitness',
    terms: [
      'gym', 'fitness', 'fitness center', 'personal trainer',
      'salle de sport', 'coach sportif',
      'gimnasio', 'entrenador personal'
    ]
  },
  {
    id: 'coworking',
    canonicalDefault: 'Coworking Space',
    terms: [
      'coworking', 'coworking space',
      'espace de coworking', 'espacio de coworking'
    ]
  }
];

/**
 * Strips accents, lowers case, replaces punctuation/underscores/hyphens with spaces, and collapses whitespace.
 */
export function simplifyString(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[_\-]+/g, ' ')         // replace underscores and hyphens with space
    .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a clean Title Case string for new genuine categories.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolves a simplified trade string to its strict synonym group if an exact full-term match exists.
 * Supports composite category strings separated by &, /, +, ' and ', ' et ', ' y '.
 */
export function getCategoryGroup(simplifiedName: string): SynonymGroup | null {
  if (!simplifiedName) return null;

  // 1. Direct full-string match in terms
  for (const group of SYNONYM_GROUPS) {
    if (group.terms.includes(simplifiedName)) {
      return group;
    }
  }

  // 2. Compound parts match (e.g. "Plumbing & Heating", "Air Conditioning / HVAC")
  const parts = simplifiedName
    .split(/\s*(?:&|\/|\+|\bet\b|\by\b|\band\b)\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    for (const part of parts) {
      for (const group of SYNONYM_GROUPS) {
        if (group.terms.includes(part)) {
          return group;
        }
      }
    }
  }

  return null;
}

/**
 * Intelligently and conservatively matches a raw category string against existing categories in the app.
 * If an existing category in the app represents the EXACT SAME profession (e.g. "plumbing" -> "Plumber",
 * "dentiste" -> "Dentist"), returns the exact existing name.
 * If the raw category is distinct (e.g. "Interior Design" vs "Architect", "Automatic Doors" vs "Mechanic"),
 * it is NEVER coerced into the wrong trade and is preserved cleanly in Title Case.
 * 
 * @param rawCategory The raw input category (e.g. from CSV, Places, or Google Pro)
 * @param existingCategories List of all category names currently present in the app / database
 */
export function normalizeCategoryName(rawCategory: string, existingCategories: string[] = []): string {
  if (!rawCategory || typeof rawCategory !== 'string') return '';
  const trimmed = rawCategory.trim();
  if (!trimmed) return '';

  const simplifiedRaw = simplifyString(trimmed);
  if (!simplifiedRaw) return '';

  // Clean list of unique valid existing categories
  const validExisting = Array.from(new Set(
    existingCategories
      .map(c => (typeof c === 'string' ? c.trim() : ''))
      .filter(c => c && c.toLowerCase() !== 'undefined' && c.toLowerCase() !== 'null' && c !== 'N/A')
  ));

  // --- Step 1: Direct exact or accent/punctuation-insensitive match ---
  for (const existing of validExisting) {
    if (simplifyString(existing) === simplifiedRaw) {
      return existing;
    }
  }

  // --- Step 2: Simple singular / plural grammatical matching (EN/FR/ES: -s, -es) ---
  // E.g. "electricians" -> "Electrician", "dentists" -> "Dentist", "plumbers" -> "Plumber"
  for (const existing of validExisting) {
    const sExisting = simplifyString(existing);
    if (
      simplifiedRaw + 's' === sExisting ||
      sExisting + 's' === simplifiedRaw ||
      simplifiedRaw + 'es' === sExisting ||
      sExisting + 'es' === simplifiedRaw
    ) {
      return existing;
    }
  }

  // --- Step 3: Exact Synonym Group Match with Existing Categories ---
  const rawGroup = getCategoryGroup(simplifiedRaw);
  if (rawGroup) {
    // Check if ANY existing category in the app matches this exact same group
    for (const existing of validExisting) {
      const sExisting = simplifyString(existing);
      const existingGroup = getCategoryGroup(sExisting);
      if (existingGroup && existingGroup.id === rawGroup.id) {
        return existing; // Strict reuse of the existing app category!
      }
    }

    // If app has no category matching this group yet, check if canonical default is present
    const canonicalMatch = validExisting.find(e => simplifyString(e) === simplifyString(rawGroup.canonicalDefault));
    if (canonicalMatch) {
      return canonicalMatch;
    }
  }

  // --- Step 4: Category does not exist in app -> Add as clean Title Case ---
  // "Si une categorie ne semble pas exister, elle peut par contre etre ajoutée"
  return toTitleCase(trimmed);
}

/**
 * Normalizes an array of category strings, deduplicating them and preserving exact existing app categories.
 */
export function normalizeCategoriesList(
  categories: (string | undefined | null)[], 
  existingCategories: string[] = []
): string[] {
  if (!Array.isArray(categories)) return [];
  const result: string[] = [];
  
  // Track working categories so newly added ones within the same list can be referenced
  const workingExisting = [...existingCategories];

  categories.forEach(c => {
    if (c && typeof c === 'string') {
      const normalized = normalizeCategoryName(c, workingExisting);
      if (normalized && !result.includes(normalized)) {
        result.push(normalized);
        if (!workingExisting.includes(normalized)) {
          workingExisting.push(normalized);
        }
      }
    }
  });

  return result;
}
