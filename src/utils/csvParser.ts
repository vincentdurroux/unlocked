import Papa from 'papaparse';

export interface ParsedProImport {
  name: string;
  company_name: string;
  category: string;
  phone: string;
  email: string;
  website: string;
  location: string;
  description: string;
  rating: number;
  is_recommended: boolean;
  languages: string[];
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  lat?: number;
  lng?: number;
  rawRow?: Record<string, any>;
}

export interface CSVParseResult {
  pros: ParsedProImport[];
  rawColumns: string[];
  rawRows: Record<string, any>[];
  detectedMapping: Record<string, string>;
  delimiter: string;
}

// Clean string for header matching: lowercase, remove accents, strip symbols & whitespace
export function normalizeHeaderKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
}

// Known aliases and synonyms for each field
const FIELD_MATCHERS: Record<keyof Omit<ParsedProImport, 'is_recommended' | 'rawRow'>, string[]> = {
  name: [
    'title',
    'titre',
    'name',
    'fullname',
    'businessname',
    'placename',
    'storename',
    'nom',
    'nomcomplet',
    'enseigne',
    'etablissement',
    'nomdeletablissement',
    'raisonsociale',
    'pro',
    'query',
    'contact',
    'contactname',
    'firstandlastname',
    'nompro',
    'nomprofessionnel'
  ],
  company_name: [
    'company',
    'companyname',
    'entreprise',
    'nomentreprise',
    'societe',
    'nomsociete',
    'business',
    'agency',
    'agence',
    'cabinet',
    'organization',
    'organisation',
    'firm',
    'brand',
    'studio',
    'structure'
  ],
  category: [
    'category',
    'categories',
    'primarycategory',
    'maincategory',
    'subcategory',
    'googlecategory',
    'categoryname',
    'type',
    'types',
    'subtype',
    'profession',
    'metier',
    'specialite',
    'speciality',
    'activite',
    'activiteprincipale',
    'secteur',
    'secteuractivite',
    'industry',
    'job',
    'service',
    'services',
    'rubrique',
    'tag',
    'tags'
  ],
  phone: [
    'phone',
    'phonenumber',
    'telephone',
    'numtelephone',
    'numerodetelephone',
    'tel',
    'mobile',
    'portable',
    'fixe',
    'contactphone',
    'formattedphone',
    'formattedphonenumber',
    'internationalphone',
    'internationalphonenumber',
    'telnumber',
    'cel',
    'cell',
    'call'
  ],
  email: [
    'email',
    'e_mail',
    'mail',
    'courriel',
    'contactemail',
    'emailaddress',
    'adresseemail',
    'contactmail'
  ],
  website: [
    'website',
    'web',
    'url',
    'link',
    'siteweb',
    'site',
    'homepage',
    'weburl',
    'domain',
    'domaine',
    'placeurl',
    'googleurl'
  ],
  location: [
    'location',
    'address',
    'fulladdress',
    'formattedaddress',
    'adresse',
    'adressecomplete',
    'streetaddress',
    'street',
    'rue',
    'city',
    'ville',
    'place',
    'area',
    'quartier',
    'postaladdress',
    'localisation',
    'zone'
  ],
  description: [
    'description',
    'bio',
    'about',
    'aboutus',
    'apropos',
    'resume',
    'overview',
    'snippet',
    'summary',
    'presentation',
    'details',
    'intro',
    'introduction',
    'prestations'
  ],
  rating: [
    'rating',
    'note',
    'reviewsrating',
    'totalscore',
    'score',
    'stars',
    'avis',
    'averagerating',
    'starrating',
    'googlerating',
    'notemoyenne'
  ],
  languages: [
    'languages',
    'language',
    'langues',
    'langue',
    'spokenlanguages',
    'languesparlees'
  ],
  instagram: [
    'instagram',
    'insta',
    'ig',
    'instagramurl'
  ],
  facebook: [
    'facebook',
    'fb',
    'facebookurl'
  ],
  whatsapp: [
    'whatsapp',
    'wa',
    'wanumber',
    'whatsappnumber'
  ],
  lat: [
    'latitude',
    'lat'
  ],
  lng: [
    'longitude',
    'lng',
    'long',
    'lon'
  ]
};

// Auto-detect which original column best matches each target field
export function detectColumnMappings(rawColumns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedColumns = rawColumns.map(col => ({
    original: col,
    normalized: normalizeHeaderKey(col)
  }));

  for (const [field, aliases] of Object.entries(FIELD_MATCHERS)) {
    // 1. Exact match with normalized alias
    let matched = normalizedColumns.find(c => aliases.includes(c.normalized));

    // 2. Contains match (e.g. "Primary Category" or "Full Street Address")
    if (!matched) {
      matched = normalizedColumns.find(c =>
        aliases.some(alias => c.normalized.includes(alias) || alias.includes(c.normalized))
      );
    }

    if (matched) {
      mapping[field] = matched.original;
    }
  }

  return mapping;
}

// Extract float rating, supporting "4,8", "4.8 / 5", "5 stars"
function parseRating(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(',', '.');
  const match = str.match(/\d+(\.\d+)?/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : Math.min(5, Math.max(0, num));
}

// Robust function to convert raw row data into a clean ParsedProImport
export function rowToPro(
  row: Record<string, any>,
  mapping: Record<string, string>,
  allRawColumns: string[]
): ParsedProImport {
  const getMappedVal = (field: string): string => {
    const colName = mapping[field];
    if (colName && row[colName] !== undefined && row[colName] !== null) {
      return String(row[colName]).trim();
    }
    return '';
  };

  let name = getMappedVal('name');
  let company = getMappedVal('company_name');
  let category = getMappedVal('category');
  let phone = getMappedVal('phone');
  let email = getMappedVal('email');
  let website = getMappedVal('website');
  let location = getMappedVal('location');
  let description = getMappedVal('description');
  let ratingVal = getMappedVal('rating');
  let languagesVal = getMappedVal('languages');
  let instagram = getMappedVal('instagram');
  let facebook = getMappedVal('facebook');
  let whatsapp = getMappedVal('whatsapp');
  let latVal = getMappedVal('lat');
  let lngVal = getMappedVal('lng');

  // Fallback for first_name + last_name if name is empty
  if (!name) {
    const fnCol = allRawColumns.find(c => ['prenom', 'firstname', 'first'].includes(normalizeHeaderKey(c)));
    const lnCol = allRawColumns.find(c => ['nom', 'lastname', 'last'].includes(normalizeHeaderKey(c)));
    const fn = fnCol ? String(row[fnCol] || '').trim() : '';
    const ln = lnCol ? String(row[lnCol] || '').trim() : '';
    if (fn || ln) {
      name = `${fn} ${ln}`.trim();
    }
  }

  // Fallback for address parts (street, postal code, city, country)
  if (!location) {
    const streetCol = allRawColumns.find(c => ['street', 'rue', 'addressline1', 'adresse'].includes(normalizeHeaderKey(c)));
    const zipCol = allRawColumns.find(c => ['zip', 'zipcode', 'postalcode', 'codepostal'].includes(normalizeHeaderKey(c)));
    const cityCol = allRawColumns.find(c => ['city', 'ville', 'commune'].includes(normalizeHeaderKey(c)));
    const countryCol = allRawColumns.find(c => ['country', 'pays'].includes(normalizeHeaderKey(c)));

    const street = streetCol ? String(row[streetCol] || '').trim() : '';
    const zip = zipCol ? String(row[zipCol] || '').trim() : '';
    const city = cityCol ? String(row[cityCol] || '').trim() : '';
    const country = countryCol ? String(row[countryCol] || '').trim() : '';

    const cityPart = [zip, city].filter(Boolean).join(' ');
    const fullLoc = [street, cityPart, country].filter(Boolean).join(', ');
    if (fullLoc) {
      location = fullLoc;
    }
  }

  // Fallback: value-based inspection across all row cells if key wasn't matched
  if (!email || !phone || !website) {
    for (const val of Object.values(row)) {
      if (!val || typeof val !== 'string') continue;
      const strVal = val.trim();

      // Email detection
      if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(strVal)) {
        email = strVal;
        continue;
      }
      // Website detection
      if (!website && /^(https?:\/\/|www\.)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/i.test(strVal)) {
        website = strVal.startsWith('www.') ? `https://${strVal}` : strVal;
        continue;
      }
      // Phone detection (e.g. +34 600 000 000 or 06 12 34 56 78)
      if (!phone && /^(\+?\d[\d\s\-\.\(\)]{6,}\d)$/.test(strVal) && !strVal.includes('@')) {
        phone = strVal;
        continue;
      }
    }
  }

  // Cross-fallback: if name is missing but company exists, use company as name
  if (!name && company) {
    name = company;
  }
  // Cross-fallback: if company is missing but name exists, use name as company
  if (!company && name) {
    company = name;
  }

  // Parse languages into array
  const languages = languagesVal
    ? languagesVal.split(/[,;/]/).map(s => s.trim()).filter(Boolean)
    : [];

  const lat = latVal ? parseFloat(String(latVal).replace(',', '.')) : undefined;
  const lng = lngVal ? parseFloat(String(lngVal).replace(',', '.')) : undefined;

  return {
    name: name.trim(),
    company_name: company.trim(),
    category: category.trim(),
    phone: phone.trim(),
    email: email.trim(),
    website: website.trim(),
    location: location.trim(),
    description: description.trim(),
    rating: parseRating(ratingVal),
    is_recommended: false,
    languages,
    instagram: instagram.trim() || undefined,
    facebook: facebook.trim() || undefined,
    whatsapp: whatsapp.trim() || undefined,
    lat: isNaN(lat as number) ? undefined : lat,
    lng: isNaN(lng as number) ? undefined : lng,
    rawRow: row
  };
}

// Main robust CSV parse core helper with auto-delimiter, BOM strip, header extraction and fallback
export interface GenericCSVParseResult {
  rawColumns: string[];
  rawRows: Record<string, any>[];
  delimiter: string;
}

export function parseCSVCore(text: string): GenericCSVParseResult {
  if (!text || !text.trim()) {
    throw new Error('The CSV file is empty or contains no readable data.');
  }

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // Check for Excel "sep=;" line at the top
  let explicitDelimiter: string | undefined = undefined;
  const firstLineMatch = text.match(/^sep=([^\r\n]+)[\r\n]+/i);
  if (firstLineMatch) {
    explicitDelimiter = firstLineMatch[1].trim();
    text = text.slice(firstLineMatch[0].length);
  }

  // Strip leading empty lines
  text = text.replace(/^([\r\n]+)/, '');

  const delimitersToTry = explicitDelimiter 
    ? [explicitDelimiter, ';', ',', '\t', '|']
    : [',', ';', '\t', '|'];

  let bestResult: { rows: Record<string, any>[]; fields: string[]; delimiter: string } | null = null;

  for (const delim of delimitersToTry) {
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      delimiter: delim,
      transformHeader: (h) => h.trim().replace(/^['"]|['"]$/g, '')
    });

    const fields = (parsed.meta.fields || []).map(f => f.trim()).filter(Boolean);
    const rows = (parsed.data as Record<string, any>[]).filter(row => {
      if (!row || typeof row !== 'object') return false;
      return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    });

    if (fields.length > 1 && rows.length > 0) {
      bestResult = { rows, fields, delimiter: delim };
      break;
    }

    if (!bestResult && fields.length > 0 && rows.length > 0) {
      bestResult = { rows, fields, delimiter: delim };
    }
  }

  // Fallback if header: true resulted in 0 or 1 column or empty rows
  if (!bestResult || bestResult.fields.length <= 1) {
    for (const delim of delimitersToTry) {
      const parsed = Papa.parse(text, {
        header: false,
        skipEmptyLines: 'greedy',
        delimiter: delim
      });

      const rawGrid = (parsed.data as string[][]).filter(row => Array.isArray(row) && row.some(cell => String(cell).trim() !== ''));

      if (rawGrid.length >= 1) {
        // Find first row with non-empty cells
        const headerRowIndex = rawGrid.findIndex(row => row.filter(cell => String(cell).trim() !== '').length > 0);
        if (headerRowIndex !== -1) {
          const headerRow = rawGrid[headerRowIndex].map((h, i) => String(h).trim() || `Column_${i + 1}`);
          const dataRows = rawGrid.slice(headerRowIndex + 1);

          const mappedRows: Record<string, any>[] = dataRows.map(rowArray => {
            const rowObj: Record<string, any> = {};
            headerRow.forEach((colName, idx) => {
              rowObj[colName] = rowArray[idx] !== undefined ? String(rowArray[idx]).trim() : '';
            });
            return rowObj;
          });

          if (!bestResult || headerRow.length > bestResult.fields.length) {
            bestResult = {
              fields: headerRow,
              rows: mappedRows,
              delimiter: delim
            };
          }
        }
      }
    }
  }

  // Final fallback: if there is at least something in the file
  if (!bestResult || bestResult.fields.length === 0) {
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const header = lines[0] || 'Data';
      const dataLines = lines.slice(1);
      const rows = (dataLines.length > 0 ? dataLines : lines).map(line => ({ [header]: line }));
      return {
        rawColumns: [header],
        rawRows: rows,
        delimiter: ','
      };
    }
    throw new Error('Unable to read columns from the CSV file. Please check that the file is not empty and is formatted correctly.');
  }

  return {
    rawColumns: bestResult.fields,
    rawRows: bestResult.rows,
    delimiter: bestResult.delimiter || ','
  };
}

// Main robust CSV parse function for professionals with auto-delimiter and fallback detection
export function parseProfessionalCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      let text = e.target?.result as string;
      if (!text) {
        return reject(new Error('Le fichier CSV est vide.'));
      }

      try {
        const { rawColumns, rawRows, delimiter } = parseCSVCore(text);
        const detectedMapping = detectColumnMappings(rawColumns);

        const pros = rawRows
          .map(row => rowToPro(row, detectedMapping, rawColumns))
          .filter(pro => pro.name || pro.company_name || pro.phone || pro.email || pro.category);

        // If filtering yielded 0, keep raw mapped rows
        const finalPros = pros.length > 0 ? pros : rawRows.map(row => rowToPro(row, detectedMapping, rawColumns));

        resolve({
          pros: finalPros,
          rawColumns,
          rawRows,
          detectedMapping,
          delimiter
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading the CSV file.'));
    };

    reader.readAsText(file, 'utf-8');
  });
}

export interface ParsedEventImport {
  title: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  category: string;
  location: string;
  description: string;
  image?: string;
  lat?: number;
  lng?: number;
  rawRow?: Record<string, any>;
}

export interface EventCSVParseResult {
  events: ParsedEventImport[];
  rawColumns: string[];
  rawRows: Record<string, any>[];
  detectedMapping: Record<string, string>;
  delimiter: string;
}

const EVENT_FIELD_MATCHERS: Record<keyof Omit<ParsedEventImport, 'rawRow'>, string[]> = {
  title: ['title', 'titre', 'name', 'nom', 'event', 'evenement', 'sujet', 'subject'],
  start_date: ['startdate', 'date', 'datedebut', 'start', 'day', 'jour', 'dateevenement'],
  end_date: ['enddate', 'datefin', 'end'],
  start_time: ['starttime', 'time', 'heure', 'heuredebut', 'horaire', 'debut'],
  end_time: ['endtime', 'heurefin', 'fin'],
  category: ['category', 'categories', 'type', 'types', 'theme', 'tag', 'tags', 'rubrique'],
  location: ['location', 'address', 'venue', 'lieu', 'adresse', 'place', 'ville', 'city'],
  description: ['description', 'details', 'about', 'resume', 'summary', 'bio', 'contenu', 'content'],
  image: ['image', 'photo', 'picture', 'poster', 'img', 'url'],
  lat: ['latitude', 'lat'],
  lng: ['longitude', 'lng', 'long', 'lon']
};

export function detectEventColumnMappings(rawColumns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedColumns = rawColumns.map(col => ({
    original: col,
    normalized: normalizeHeaderKey(col)
  }));

  for (const [field, aliases] of Object.entries(EVENT_FIELD_MATCHERS)) {
    let matched = normalizedColumns.find(c => aliases.includes(c.normalized));
    if (!matched) {
      matched = normalizedColumns.find(c =>
        aliases.some(alias => c.normalized.includes(alias) || alias.includes(c.normalized))
      );
    }
    if (matched) {
      mapping[field] = matched.original;
    }
  }

  return mapping;
}

export function rowToEvent(
  row: Record<string, any>,
  mapping: Record<string, string>,
  allRawColumns: string[]
): ParsedEventImport {
  const getMappedVal = (field: string): string => {
    const colName = mapping[field];
    if (colName && row[colName] !== undefined && row[colName] !== null) {
      return String(row[colName]).trim();
    }
    return '';
  };

  const title = getMappedVal('title');
  const start_date = getMappedVal('start_date');
  const end_date = getMappedVal('end_date');
  const start_time = getMappedVal('start_time');
  const end_time = getMappedVal('end_time');
  const category = getMappedVal('category') || 'Community';
  const location = getMappedVal('location');
  const description = getMappedVal('description');
  const image = getMappedVal('image');
  const latVal = getMappedVal('lat');
  const lngVal = getMappedVal('lng');

  const lat = latVal ? parseFloat(String(latVal).replace(',', '.')) : undefined;
  const lng = lngVal ? parseFloat(String(lngVal).replace(',', '.')) : undefined;

  return {
    title: title.trim(),
    start_date: start_date.trim(),
    end_date: end_date.trim() || undefined,
    start_time: start_time.trim() || undefined,
    end_time: end_time.trim() || undefined,
    category: category.trim(),
    location: location.trim(),
    description: description.trim(),
    image: image.trim() || undefined,
    lat: isNaN(lat as number) ? undefined : lat,
    lng: isNaN(lng as number) ? undefined : lng,
    rawRow: row
  };
}

export function parseEventCSV(file: File): Promise<EventCSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      let text = e.target?.result as string;
      if (!text) {
        return reject(new Error('Le fichier CSV est vide.'));
      }

      try {
        const { rawColumns, rawRows, delimiter } = parseCSVCore(text);
        const detectedMapping = detectEventColumnMappings(rawColumns);

        const events = rawRows
          .map(row => rowToEvent(row, detectedMapping, rawColumns))
          .filter(ev => ev.title || ev.start_date || ev.location);

        const finalEvents = events.length > 0 ? events : rawRows.map(row => rowToEvent(row, detectedMapping, rawColumns));

        resolve({
          events: finalEvents,
          rawColumns,
          rawRows,
          detectedMapping,
          delimiter
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading the CSV file.'));
    };

    reader.readAsText(file, 'utf-8');
  });
}

