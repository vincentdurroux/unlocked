import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeCategoriesList, normalizeCategoryName } from '../utils/categoryUtils';

export interface SupabaseProfessional {
  id: string;
  name: string;
  company_name?: string;
  profession: string;
  rating: number;
  reviews_count?: number; // Kept for type compatibility if needed
  review_count?: number;
  languages: string[];
  image_url: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook?: string;
  location: string;
  whatsapp?: string;
  lat?: number;
  lng?: number;
  created_at?: string;
  top_qualities?: string[];
  has_filled_form?: boolean;
  categories?: string[];
  source?: string;
  is_community_recommended?: boolean;
  is_recommended?: boolean;
  is_recommanded?: boolean;
  google_maps_url?: string;
  googleMapsUri?: string;
}

export function parseEmbeddedQualities(text: string): { 
  qualities: string[], 
  cleanText: string, 
  source?: string, 
  googleMapsUrl?: string, 
  reviewCount?: number 
} {
  if (!text || typeof text !== 'string') return { qualities: [], cleanText: '' };
  
  let currentText = text;
  let source: string | undefined;
  let googleMapsUrl: string | undefined;
  let reviewCount: number | undefined;
  let qualities: string[] = [];

  const sourceMatch = currentText.match(/\[Source:\s*([^\]]+)\]/i);
  if (sourceMatch) {
    source = sourceMatch[1].trim();
  }
  currentText = currentText.replace(/\[Source:\s*[^\]]+\]/gi, '').trim();

  const gmapsMatch = currentText.match(/\[GoogleMaps:\s*([^\]]+)\]/i);
  if (gmapsMatch) {
    googleMapsUrl = gmapsMatch[1].trim();
  }
  currentText = currentText.replace(/\[GoogleMaps:\s*[^\]]+\]/gi, '').trim();

  const reviewsMatch = currentText.match(/\[Reviews:\s*(\d+)\]/i);
  if (reviewsMatch) {
    reviewCount = parseInt(reviewsMatch[1], 10);
  }
  currentText = currentText.replace(/\[Reviews:\s*\d+\]/gi, '').trim();

  const qualitiesMatch = currentText.match(/\[Qualities:\s*([^\]]+)\]/i);
  if (qualitiesMatch) {
    qualities = qualitiesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  currentText = currentText.replace(/\[Qualities:\s*[^\]]+\]/gi, '').trim();

  // Strip any remaining bracketed metadata header tags at the beginning if present
  currentText = currentText.replace(/^(\s*\[[^\]]+\])+\s*/g, '').trim();

  return { qualities, cleanText: currentText, source, googleMapsUrl, reviewCount };
}

export function embedQualities(text: string, qualities: string[]): string {
  if (!qualities || qualities.length === 0) return text;
  const prefix = `[Qualities: ${qualities.join(', ')}]`;
  return `${prefix} ${text}`;
}

export const proService = {
  _hasTopQualitiesColumn: true,
  _hasRecTopQualitiesColumn: true,
  _hasRecProImageUrlColumn: true,
  _cachedPros: [] as any[],

  async getExistingCategoryNames(): Promise<string[]> {
    const categoriesSet = new Set<string>();

    // 1. From in-memory cache if available
    if (Array.isArray(this._cachedPros) && this._cachedPros.length > 0) {
      this._cachedPros.forEach((p: any) => {
        const raw = p.profession || p.category;
        if (typeof raw === 'string') {
          raw.split(',').forEach((c: string) => {
            const t = c.trim();
            if (t && t.toLowerCase() !== 'undefined' && t.toLowerCase() !== 'null') {
              categoriesSet.add(t);
            }
          });
        }
      });
    }

    // 2. From localStorage imported pros
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          const localPros: any[] = JSON.parse(stored);
          if (Array.isArray(localPros)) {
            localPros.forEach((p: any) => {
              const raw = p.profession || p.category;
              if (typeof raw === 'string') {
                raw.split(',').forEach((c: string) => {
                  const t = c.trim();
                  if (t && t.toLowerCase() !== 'undefined' && t.toLowerCase() !== 'null') {
                    categoriesSet.add(t);
                  }
                });
              }
            });
          }
        }
      }
    } catch (e) {
      // Ignore localStorage read errors
    }

    // 3. From Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('profession, category');
        if (!error && Array.isArray(data)) {
          data.forEach((p: any) => {
            const raw = p.profession || p.category;
            if (typeof raw === 'string') {
              raw.split(',').forEach((c: string) => {
                const t = c.trim();
                if (t && t.toLowerCase() !== 'undefined' && t.toLowerCase() !== 'null') {
                  categoriesSet.add(t);
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('[proService] Error fetching distinct categories:', e);
      }
    }

    return Array.from(categoriesSet);
  },

  isAdmin(email?: string | null) {
    return false; // Hardcoded emails are deprecated. Admins are strictly verified via userProfile.is_admin = true in DB.
  },

  async getProfessionals() {
    let mappedData: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .order('rating', { ascending: false });

        if (error) {
          console.error('Error fetching professionals:', error);
        } else if (data) {
          if (data.length > 0) {
            proService._hasTopQualitiesColumn = 'top_qualities' in data[0];
          }

          mappedData = data.map((item: any) => {
            // Normalize lat/lng from columns, handling strings if necessary
            let lat = typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat;
            let lng = typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng;
            let displayLocation = item.location || '';

            // Fallback: Check if coordinates are bundled in the location field if columns are empty/invalid
            const hasValidColumns = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && 
                                    (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001);
            
            if (!hasValidColumns && typeof displayLocation === 'string' && (displayLocation.startsWith('GEO:') || displayLocation.includes('GEO:'))) {
              try {
                const geoMatch = displayLocation.match(/GEO:\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\|(.*)/);
                if (geoMatch) {
                  lat = parseFloat(geoMatch[1]);
                  lng = parseFloat(geoMatch[2]);
                  displayLocation = geoMatch[3].trim();
                }
              } catch (e) {
                console.error('[proService] Error parsing bundled coordinates:', e);
              }
            }

            let topQualities: string[] = [];
            let cleanDescription = item.description || item.bio || '';
            const parsed = parseEmbeddedQualities(cleanDescription);
            cleanDescription = parsed.cleanText;

            if (item.top_qualities) {
              topQualities = typeof item.top_qualities === 'string'
                ? JSON.parse(item.top_qualities)
                : item.top_qualities || [];
            } else {
              topQualities = parsed.qualities;
            }

            // Extract categories directly from Supabase "profession" column - do not invent or normalize
            let categoriesList: string[] = [];
            const rawProfession = (typeof item.profession === 'string' && item.profession.trim())
              ? item.profession.trim()
              : ((typeof item.category === 'string' && item.category.trim()) ? item.category.trim() : '');
            if (rawProfession) {
              categoriesList = rawProfession.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(item.profession)) {
              categoriesList = item.profession.map((s: any) => String(s).trim()).filter(Boolean);
            } else if (Array.isArray(item.categories)) {
              categoriesList = item.categories.map((s: any) => String(s).trim()).filter(Boolean);
            }
            if (categoriesList.length === 0 && rawProfession) {
              categoriesList = [rawProfession];
            }

            const isExplicitlyGoogle = item.source === 'google' || item.source === 'google_places' || 
              String(item.id || '').startsWith('google_') || parsed.source === 'google' || parsed.source === 'google_places';

            let isCommunity = false;
            if (isExplicitlyGoogle) {
              isCommunity = false;
            } else if (item.is_recommended !== undefined && item.is_recommended !== null) {
              isCommunity = Boolean(item.is_recommended);
            } else if (item.is_recommanded !== undefined && item.is_recommanded !== null) {
              isCommunity = Boolean(item.is_recommanded);
            } else if (item.is_community_recommended !== undefined && item.is_community_recommended !== null) {
              isCommunity = Boolean(item.is_community_recommended);
            } else {
              isCommunity = true;
            }

            const proSource = item.source || parsed.source || (isCommunity ? 'community' : 'google_places');
            const isGooglePro = isExplicitlyGoogle || proSource === 'google_places' || proSource === 'google' || !isCommunity;
            const proImage = isGooglePro ? '' : (item.image_url || item.image || '');

            return {
              ...item,
              location: displayLocation,
              profession: item.profession || categoriesList.join(', '),
              category: item.profession || categoriesList.join(', '),
              categories: categoriesList,
              image: proImage,
              image_url: proImage,
              bio: cleanDescription,
              description: cleanDescription,
              top_qualities: topQualities,
              rating: isGooglePro ? 0 : (item.rating ?? 0),
              review_count: isGooglePro ? 0 : (item.review_count ?? item.reviews_count ?? parsed.reviewCount ?? 0),
              languages: typeof item.languages === 'string' ? JSON.parse(item.languages) : item.languages || [],
              has_filled_form: item.has_filled_form ?? false,
              source: proSource,
              is_community_recommended: isCommunity,
              is_recommended: isCommunity,
              is_recommanded: isCommunity,
              google_maps_url: item.google_maps_url || parsed.googleMapsUrl || item.website || '',
              googleMapsUri: item.google_maps_url || parsed.googleMapsUrl || item.website || '',
              coordinates: (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) ? 
                { lat, lng } : null
            };
          });
        }
      } catch (err) {
        console.error('[proService] Error fetching from DB:', err);
      }
    }

    // Merge locally persisted CSV imported pros
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          const localPros = JSON.parse(stored);
          if (Array.isArray(localPros)) {
            const dbIds = new Set(mappedData.map((p: any) => String(p.id)));
            const dbNames = new Set(mappedData.map((p: any) => (p.name || '').toLowerCase().trim()));
            localPros.forEach((lp: any) => {
              const nameLower = (lp.name || '').toLowerCase().trim();
              if (!dbIds.has(String(lp.id)) && (!nameLower || !dbNames.has(nameLower))) {
                const lpSource = lp.source || 'google_places';
                const lpParsed = parseEmbeddedQualities(lp.description || lp.bio || '');
                const cleanLpBio = lpParsed.cleanText;
                const lpIsCommunity = lp.is_recommanded !== undefined 
                  ? Boolean(lp.is_recommanded)
                  : (lp.is_recommended !== undefined
                    ? Boolean(lp.is_recommended)
                    : (lp.is_community_recommended !== undefined
                      ? Boolean(lp.is_community_recommended)
                      : (lpSource !== 'google' && lpSource !== 'google_places' && !String(lp.id).startsWith('google_'))
                    )
                  );
                let lat = typeof lp.lat === 'string' ? parseFloat(lp.lat) : lp.lat;
                let lng = typeof lp.lng === 'string' ? parseFloat(lp.lng) : lp.lng;
                
                let coords = lp.coordinates || null;
                if (!coords && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
                  coords = { lat, lng };
                }

                mappedData.push({
                  ...lp,
                  bio: cleanLpBio,
                  description: cleanLpBio,
                  source: lpSource,
                  is_community_recommended: lpIsCommunity,
                  is_recommended: lpIsCommunity,
                  is_recommanded: lpIsCommunity,
                  coordinates: coords
                });
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local imported pros:', e);
    }

    // Filter out any locally deleted pro IDs
    try {
      if (typeof window !== 'undefined') {
        const deletedRaw = localStorage.getItem('deleted_pro_ids');
        if (deletedRaw) {
          const deletedList = JSON.parse(deletedRaw);
          if (Array.isArray(deletedList)) {
            const deletedSet = new Set(deletedList.map((id: any) => String(id)));
            mappedData = mappedData.filter((p: any) => !deletedSet.has(String(p.id)));
          }
        }
      }
    } catch (e) {
      console.warn('Error filtering deleted pros:', e);
    }

    console.log('[proService] Total loaded pros (DB + CSV imports - deleted):', mappedData.length);
    proService._cachedPros = mappedData;
    return mappedData;
  },

  async createProfessional(pro: any) {
    if (!isSupabaseConfigured) return null;

    // Normalize coordinates and ensure they are numbers
    let lat = typeof pro.lat === 'string' ? parseFloat(pro.lat) : pro.lat;
    let lng = typeof pro.lng === 'string' ? parseFloat(pro.lng) : pro.lng;
    
    // Fallback back to 0 if NaN
    if (isNaN(lat)) lat = 0;
    if (isNaN(lng)) lng = 0;

    // Strip existing GEO: prefix if somehow present
    let cleanLocation = pro.location || '';
    if (typeof cleanLocation === 'string' && cleanLocation.startsWith('GEO:')) {
      const match = cleanLocation.match(/^GEO:[\d.-]+,[\d.-]+\|(.*)$/);
      if (match) cleanLocation = match[1];
    }

    // Capture top qualities from multiple possible field names
    const topQuals = pro.top_qualities || pro.topQualities || [];
    const finalDescription = pro.description || pro.bio || '';
    let rawCats: string[] = [];
    if (Array.isArray(pro.categories) && pro.categories.length > 0) {
      rawCats = pro.categories;
    } else {
      const pStr = pro.profession || pro.category || pro.job || '';
      rawCats = pStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const existingCats = await this.getExistingCategoryNames();
    const normalizedCats = normalizeCategoriesList(rawCats, existingCats);
    const proProfession = normalizedCats.join(', ') || 'Professional';
    const isProCommunity = pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_recommanded !== undefined ? Boolean(pro.is_recommanded) : (pro.is_community_recommended !== undefined ? Boolean(pro.is_community_recommended) : (pro.source === 'community')));
    const createSource = pro.source || (isProCommunity ? 'community' : 'google_places');
    const isGooglePro = createSource === 'google_places' || createSource === 'google' || !isProCommunity;
    const proImage = isGooglePro ? '' : (pro.image_url || pro.image || '');

    try {
      if (proService._hasTopQualitiesColumn) {
        const finalPro: any = {
          name: pro.name,
          company_name: pro.company_name,
          profession: proProfession,
          rating: isGooglePro ? 0 : (pro.rating || 0),
          review_count: isGooglePro ? 0 : (pro.review_count || 0),
          languages: Array.isArray(pro.languages) ? pro.languages : [],
          image_url: proImage,
          description: finalDescription,
          phone: pro.phone,
          email: pro.email,
          website: pro.website,
          instagram: pro.instagram,
          facebook: pro.facebook,
          whatsapp: pro.whatsapp,
          lat: lat,
          lng: lng,
          location: cleanLocation,
          top_qualities: topQuals,
          has_filled_form: pro.has_filled_form || false,
          is_recommended: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_recommanded !== undefined ? Boolean(pro.is_recommanded) : false),
          is_recommanded: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_recommanded !== undefined ? Boolean(pro.is_recommanded) : false),
          is_community_recommended: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_community_recommended !== undefined ? Boolean(pro.is_community_recommended) : false),
          source: pro.source || (pro.is_recommended ? 'community' : 'google_places')
        };

        // Remove undefined values to avoid Supabase errors
        Object.keys(finalPro).forEach(key => {
          if (finalPro[key] === undefined) {
            delete finalPro[key];
          }
        });

        console.log('[proService] Creating pro with native payload:', JSON.stringify(finalPro, null, 2));
        const { data: insertData, error } = await supabase
          .from('professionals')
          .insert([finalPro])
          .select();

        if (error) throw error;
        return insertData;
      } else {
        throw new Error('Fallback top_qualities');
      }
    } catch (err: any) {
      const isColumnErr = err.code?.includes('PGRST') || err.message?.includes('column') || err.message?.includes('Fallback');
      if (isColumnErr) {
        console.log('[proService] top_qualities column missing in professionals table. Falling back to embedded description.');
        proService._hasTopQualitiesColumn = false;

        const fallbackDesc = topQuals.length > 0 ? embedQualities(finalDescription, topQuals) : finalDescription;
        const finalPro: any = {
          name: pro.name,
          company_name: pro.company_name,
          profession: pro.profession || pro.category,
          rating: pro.rating,
          languages: pro.languages,
          image_url: pro.image_url || pro.image,
          description: fallbackDesc,
          phone: pro.phone,
          email: pro.email,
          website: pro.website,
          instagram: pro.instagram,
          facebook: pro.facebook,
          whatsapp: pro.whatsapp,
          lat: lat,
          lng: lng,
          location: cleanLocation,
          has_filled_form: pro.has_filled_form || false,
          is_recommended: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_recommanded !== undefined ? Boolean(pro.is_recommanded) : false),
          is_recommanded: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_recommanded !== undefined ? Boolean(pro.is_recommanded) : false),
          is_community_recommended: pro.is_recommended !== undefined ? Boolean(pro.is_recommended) : (pro.is_community_recommended !== undefined ? Boolean(pro.is_community_recommended) : false),
          source: pro.source || (pro.is_recommended ? 'community' : 'google_places')
        };

        // Remove undefined values to avoid Supabase errors
        Object.keys(finalPro).forEach(key => {
          if (finalPro[key] === undefined) {
            delete finalPro[key];
          }
        });

        console.log('[proService] Creating pro with fallback payload:', JSON.stringify(finalPro, null, 2));
        const { data: insertData, error } = await supabase
          .from('professionals')
          .insert([finalPro])
          .select();

        if (error) {
          console.error('Supabase fallback create error:', error);
          throw error;
        }
        return insertData;
      } else {
        throw err;
      }
    }
  },

  async updateProfessional(id: string | number, pro: any) {
    if (!isSupabaseConfigured) return null;

    console.log('[proService] updateProfessional requested for ID:', id);

    // Normalize ID - only parse as int if it's strictly digit-only
    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
      console.log('[proService] Normalized numeric string ID to number:', finalId);
    }

    // Diagnostic: Check auth state
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[proService] Current user:', session?.user?.email || 'Anonymous');

    // Diagnostic: Check if record exists before update and get its current state to see columns
    let existingRecord = null;
    let checkError = null;
    
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', finalId)
        .maybeSingle();
      existingRecord = data;
      checkError = error;
    } catch (e: any) {
      console.error('[proService] Exception during update check:', e);
      if (e.code === '22P02' || (e.message && e.message.includes('bigint'))) {
         return { 
           success: false, 
           message: `Update failed: The ID "${id}" is not compatible with the database bigint type.` 
         };
      }
      throw e;
    }
    
    if (checkError) {
      console.error('[proService] Error fetching existing record:', checkError);
      if (checkError.code === '22P02') {
         return { 
           success: false, 
           message: `Update failed: The ID "${id}" is not compatible with the database bigint type.` 
         };
      }
    }
    
    if (!existingRecord) {
      console.warn('[proService] Record not found in database for ID:', finalId);
      return { 
        success: false, 
        message: `Professional with ID ${finalId} not found. Please refresh the page.` 
      };
    }

    console.log('[proService] Found record. Comparing IDs - Input:', finalId, 'DB:', existingRecord.id);

    // Normalize coordinates
    let lat = typeof pro.lat === 'string' ? parseFloat(pro.lat) : pro.lat;
    let lng = typeof pro.lng === 'string' ? parseFloat(pro.lng) : pro.lng;
    if (isNaN(lat)) lat = 0;
    if (isNaN(lng)) lng = 0;

    // Clean location (remove GEO: prefix if provided in input)
    let cleanLocation = pro.location || '';
    if (typeof cleanLocation === 'string' && cleanLocation.startsWith('GEO:')) {
      const match = cleanLocation.match(/^GEO:[\d.-]+,[\d.-]+\|(.*)$/);
      if (match) cleanLocation = match[1];
    }

    // Build payload dynamically based on existing columns in the table
    // and ONLY include fields that have actually changed to minimize RLS conflicts
    const columns = Object.keys(existingRecord);
    const updatePayload: any = {};
    
    const setIfChanged = (colName: string, newValue: any, existingValue: any) => {
      // Also check if any alternative column names exist (e.g. bio vs description)
      let targetCol = colName;
      if (!columns.includes(targetCol)) {
        if (colName === 'description' && columns.includes('bio')) targetCol = 'bio';
        else if (colName === 'bio' && columns.includes('description')) targetCol = 'description';
        else if (colName === 'image_url' && columns.includes('image')) targetCol = 'image';
        else if (colName === 'image' && columns.includes('image_url')) targetCol = 'image_url';
        else if (colName === 'top_qualities' && columns.includes('topQualities')) targetCol = 'topQualities';
        else if (colName === 'topQualities' && columns.includes('top_qualities')) targetCol = 'top_qualities';
        else if (colName === 'profession' && columns.includes('category')) targetCol = 'category';
        else if (colName === 'category' && columns.includes('profession')) targetCol = 'profession';
      }

      if (!columns.includes(targetCol)) return;
      
      // Basic comparison
      let isChanged = false;

      // Robust helper to normalize value to a sorted JSON string representation for array types
      const normalizeValue = (val: any): string => {
        if (val === null || val === undefined) return 'null';
        if (Array.isArray(val)) {
          return JSON.stringify([...val].sort());
        }
        if (typeof val === 'string') {
          try {
            // Only try parsing as JSON if it looks like an array/object
            if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                return JSON.stringify([...parsed].sort());
              }
              return JSON.stringify(parsed);
            }
          } catch (e) {
            // Not JSON
          }
        }
        return String(val);
      };

      // Detect if either newValue or existingValue is an array (or is expected to be an array)
      const isArrayField = targetCol === 'top_qualities' || targetCol === 'topQualities' || targetCol === 'languages' || Array.isArray(newValue) || Array.isArray(existingValue);

      if (isArrayField) {
        const normNew = normalizeValue(newValue);
        const normExisting = normalizeValue(existingValue);
        isChanged = normNew !== normExisting;
        
        // Log the change detection for debugging
        console.log(`[proService] Array comparison for "${targetCol}":`, {
          newValue,
          existingValue,
          normNew,
          normExisting,
          isChanged
        });
      } else if (typeof newValue === 'number' && typeof existingValue === 'number') {
        isChanged = Math.abs(newValue - existingValue) > 0.000001;
      } else {
        isChanged = String(newValue ?? '') !== String(existingValue ?? '');
      }

      if (isChanged) {
        updatePayload[targetCol] = newValue;
      }
    };

    setIfChanged('name', pro.name, existingRecord.name);
    setIfChanged('company_name', pro.company_name, existingRecord.company_name);
    let rawUpdateCats: string[] = [];
    if (Array.isArray(pro.categories) && pro.categories.length > 0) {
      rawUpdateCats = pro.categories;
    } else if (pro.profession || pro.category) {
      const pStr = pro.profession || pro.category || '';
      rawUpdateCats = pStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const existingCats = await this.getExistingCategoryNames();
    const updatedProfession = rawUpdateCats.length > 0 ? normalizeCategoriesList(rawUpdateCats, existingCats).join(', ') : (existingRecord.profession || existingRecord.category || '');
    const isProCommunity = pro.is_recommended ?? pro.is_recommanded ?? pro.is_community_recommended ?? (existingRecord.is_recommended || existingRecord.is_recommanded || existingRecord.is_community_recommended);
    const updatedSource = pro.source || existingRecord.source || (isProCommunity ? 'community' : 'google_places');
    const isGoogleProUpdate = updatedSource === 'google_places' || updatedSource === 'google' || !isProCommunity;

    setIfChanged('profession', updatedProfession, existingRecord.profession || existingRecord.category);
    setIfChanged('rating', isGoogleProUpdate ? 0 : pro.rating, existingRecord.rating);
    setIfChanged('review_count', isGoogleProUpdate ? 0 : (pro.review_count || pro.reviews_count), existingRecord.review_count || existingRecord.reviews_count);
    setIfChanged('languages', Array.isArray(pro.languages) ? pro.languages : [], existingRecord.languages);
    const targetImageUrl = isGoogleProUpdate ? '' : (pro.image_url || pro.image || '');
    setIfChanged('image_url', targetImageUrl, existingRecord.image_url || existingRecord.image);

    // Description/Bio and Top Qualities mapping
    const newBio = pro.description || pro.bio || '';
    const hasTopQualsCol = columns.includes('top_qualities') || columns.includes('topQualities');
    
    if (hasTopQualsCol) {
      const topQualsVal = pro.top_qualities || pro.topQualities || [];
      setIfChanged('top_qualities', topQualsVal, existingRecord.top_qualities || existingRecord.topQualities);
      setIfChanged('description', newBio, existingRecord.description || existingRecord.bio);
    } else {
      const embeddedBio = (pro.top_qualities && pro.top_qualities.length > 0) || (pro.topQualities && pro.topQualities.length > 0)
        ? embedQualities(newBio, pro.top_qualities || pro.topQualities) 
        : newBio;
      setIfChanged('description', embeddedBio, existingRecord.description || existingRecord.bio);
    }

    setIfChanged('phone', pro.phone, existingRecord.phone);
    setIfChanged('email', pro.email, existingRecord.email);
    setIfChanged('website', pro.website, existingRecord.website);
    setIfChanged('whatsapp', pro.whatsapp, existingRecord.whatsapp);
    setIfChanged('instagram', pro.instagram, existingRecord.instagram);
    setIfChanged('facebook', pro.facebook, existingRecord.facebook);
    setIfChanged('lat', lat, existingRecord.lat);
    setIfChanged('lng', lng, existingRecord.lng);
    setIfChanged('location', cleanLocation, existingRecord.location);
    setIfChanged('has_filled_form', pro.has_filled_form ?? false, existingRecord.has_filled_form);
    if (columns.includes('is_recommanded')) {
      setIfChanged('is_recommanded', pro.is_recommanded ?? pro.is_recommended ?? pro.is_community_recommended, existingRecord.is_recommanded);
    }
    if (columns.includes('is_recommended')) {
      setIfChanged('is_recommended', pro.is_recommended ?? pro.is_recommanded ?? pro.is_community_recommended, existingRecord.is_recommended);
    }
    if (columns.includes('is_community_recommended')) {
      setIfChanged('is_community_recommended', pro.is_community_recommended ?? pro.is_recommanded ?? pro.is_recommended, existingRecord.is_community_recommended);
    }
    if (columns.includes('source')) {
      setIfChanged('source', pro.source, existingRecord.source);
    }

    // Remove undefined
    Object.keys(updatePayload).forEach(key => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    if (Object.keys(updatePayload).length === 0) {
      console.log('[proService] No fields changed, skipping update call.');
      return { success: true, data: existingRecord };
    }

    console.log('[proService] Executing UPDATE. ID:', finalId, 'Payload:', JSON.stringify(updatePayload, null, 2));
    
    const { data: updateData, error } = await supabase
      .from('professionals')
      .update(updatePayload)
      .eq('id', finalId)
      .select();

    if (error) {
      console.error('[proService] Supabase update ERROR:', error);
      return { success: false, message: `Database error: ${error.message}` };
    }
    
    if (!updateData || updateData.length === 0) {
      console.warn('[proService] UPDATE succeeded but returned no rows. This usually means Row Level Security (RLS) policies are preventing this user from updating this specific record or no fields actually changed.');
      return { 
        success: false, 
        message: 'The update was rejected by the database. This usually happens if you are not logged in as an administrator or do not have permission to modify this record.' 
      };
    }

    console.log('[proService] Update SUCCESS. New data:', updateData[0]);
    return { success: true, data: updateData[0] };
  },

  async setProfessionalRecommendation(id: string | number, isRecommended: boolean) {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase is not configured' };

    console.log(`[proService] setProfessionalRecommendation requested for ID ${id} -> is_recommended: ${isRecommended}`);
    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    // Check what columns exist on the table
    const { data: existingRecord } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', finalId)
      .maybeSingle();

    if (!existingRecord) {
      // If it's a locally stored imported pro
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('unlocked_imported_pros');
          if (stored) {
            const localPros = JSON.parse(stored);
            if (Array.isArray(localPros)) {
              const updated = localPros.map((lp: any) => {
                if (String(lp.id) === String(id)) {
                  return { ...lp, is_recommended: isRecommended, is_community_recommended: isRecommended, is_recommanded: isRecommended };
                }
                return lp;
              });
              localStorage.setItem('unlocked_imported_pros', JSON.stringify(updated));
              return { success: true, data: { id, is_recommended: isRecommended } };
            }
          }
        }
      } catch (e) {
        console.warn('Could not update local storage pro:', e);
      }
      return { success: false, message: `Professional ${id} not found.` };
    }

    const columns = Object.keys(existingRecord);
    const updatePayload: any = {};
    if (columns.includes('is_recommended')) {
      updatePayload.is_recommended = isRecommended;
    }
    if (columns.includes('is_recommanded')) {
      updatePayload.is_recommanded = isRecommended;
    }
    if (columns.includes('is_community_recommended')) {
      updatePayload.is_community_recommended = isRecommended;
    }

    // If neither column exists yet, attempt updating is_recommended directly
    if (Object.keys(updatePayload).length === 0) {
      updatePayload.is_recommended = isRecommended;
    }

    const { data: updateData, error } = await supabase
      .from('professionals')
      .update(updatePayload)
      .eq('id', finalId)
      .select();

    if (error) {
      console.error('[proService] Error updating recommendation status:', error);
      return { success: false, message: error.message };
    }

    // Also sync local storage if present
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          const localPros = JSON.parse(stored);
          if (Array.isArray(localPros)) {
            const updated = localPros.map((lp: any) => {
              if (String(lp.id) === String(id)) {
                return { ...lp, is_recommended: isRecommended, is_community_recommended: isRecommended, is_recommanded: isRecommended };
              }
              return lp;
            });
            localStorage.setItem('unlocked_imported_pros', JSON.stringify(updated));
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync local storage pro:', e);
    }

    return { success: true, data: updateData?.[0] };
  },

  async setAllProfessionalsRecommendation(isRecommended: boolean) {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase is not configured' };

    console.log(`[proService] setAllProfessionalsRecommendation requested -> is_recommended: ${isRecommended}`);

    try {
      // 1. Fetch all professional IDs from DB
      const { data: allPros, error: fetchErr } = await supabase
        .from('professionals')
        .select('id');

      if (fetchErr) {
        console.error('[proService] Error fetching pro IDs for bulk update:', fetchErr);
        return { success: false, message: fetchErr.message };
      }

      if (allPros && allPros.length > 0) {
        // Check sample row to see available columns
        const { data: sampleRow } = await supabase
          .from('professionals')
          .select('*')
          .limit(1)
          .maybeSingle();

        const columns = sampleRow ? Object.keys(sampleRow) : [];
        const updatePayload: any = {};
        if (columns.includes('is_recommended')) {
          updatePayload.is_recommended = isRecommended;
        }
        if (columns.includes('is_recommanded')) {
          updatePayload.is_recommanded = isRecommended;
        }
        if (columns.includes('is_community_recommended')) {
          updatePayload.is_community_recommended = isRecommended;
        }
        if (Object.keys(updatePayload).length === 0) {
          updatePayload.is_recommended = isRecommended;
        }

        const ids = allPros.map(p => p.id);
        const { error: updateErr } = await supabase
          .from('professionals')
          .update(updatePayload)
          .in('id', ids);

        if (updateErr) {
          console.error('[proService] Error in bulk update:', updateErr);
          return { success: false, message: updateErr.message };
        }
      }

      // Also update local storage if present
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          try {
            const localPros = JSON.parse(stored);
            if (Array.isArray(localPros)) {
              const updated = localPros.map((lp: any) => ({
                ...lp,
                is_recommended: isRecommended,
                is_community_recommended: isRecommended,
                is_recommanded: isRecommended
              }));
              localStorage.setItem('unlocked_imported_pros', JSON.stringify(updated));
            }
          } catch (e) {
            console.warn('Error updating localStorage unlocked_imported_pros:', e);
          }
        }
      }

      return { success: true, count: allPros?.length || 0 };
    } catch (e: any) {
      console.error('[proService] Exception in setAllProfessionalsRecommendation:', e);
      return { success: false, message: e.message || String(e) };
    }
  },

  async deleteProfessional(id: string | number) {
    console.log('[proService] deleteProfessional requested for ID:', id);

    const strId = String(id);
    let resolvedName: string | null = null;
    let localItemToDelete: any = null;

    // 1. Immediately look for the item in localStorage to check its name or delete it
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          const list = JSON.parse(stored);
          localItemToDelete = list.find((p: any) => String(p.id) === strId);
          if (localItemToDelete && localItemToDelete.name) {
            resolvedName = localItemToDelete.name;
          }
          const filtered = list.filter((p: any) => String(p.id) !== strId);
          localStorage.setItem('unlocked_imported_pros', JSON.stringify(filtered));
        }

        const deletedRaw = localStorage.getItem('deleted_pro_ids');
        const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedList.includes(strId)) {
          deletedList.push(strId);
          localStorage.setItem('deleted_pro_ids', JSON.stringify(deletedList));
        }
      }
    } catch (e) {
      console.warn('[proService] Local storage cleanup warning:', e);
    }

    if (!isSupabaseConfigured) {
      return { success: true };
    }

    let finalId: any = id;
    const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isNumeric = typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id));
    
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    // 2. Fetch current data for archiving if present in DB
    let proToArchive = null;

    if (isNumeric || isUuid) {
      try {
        const { data } = await supabase
          .from('professionals')
          .select('*')
          .eq('id', finalId)
          .maybeSingle();
        proToArchive = data;
        if (proToArchive && proToArchive.name) {
          resolvedName = proToArchive.name;
        }
      } catch (e: any) {
        console.warn('[proService] DB query exception during archive lookup for ID:', finalId, e);
      }
    }

    // Symmetrical cleanup by name:
    // If we have a resolvedName (either from DB or localStorage), find and clean up the corresponding entity in the other storage
    if (resolvedName) {
      const nameNorm = resolvedName.toLowerCase().trim();

      // If we deleted from DB, also remove from localStorage's imported list any matching pro by name
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('unlocked_imported_pros');
          if (stored) {
            const list = JSON.parse(stored);
            const matches = list.filter((p: any) => (p.name || '').toLowerCase().trim() === nameNorm);
            if (matches.length > 0) {
              const remaining = list.filter((p: any) => (p.name || '').toLowerCase().trim() !== nameNorm);
              localStorage.setItem('unlocked_imported_pros', JSON.stringify(remaining));
              
              // Add their local IDs to deleted_pro_ids
              const deletedRaw = localStorage.getItem('deleted_pro_ids');
              const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
              matches.forEach((m: any) => {
                const mIdStr = String(m.id);
                if (!deletedList.includes(mIdStr)) {
                  deletedList.push(mIdStr);
                }
              });
              localStorage.setItem('deleted_pro_ids', JSON.stringify(deletedList));
              console.log('[proService] Automatically removed matching local storage pros by name:', resolvedName);
            }
          }
        }
      } catch (err) {
        console.warn('[proService] localStorage cleanup by name warning:', err);
      }

      // If we deleted from localStorage (original ID is string/custom), also find and delete from DB any matching pro by name
      if (!(isNumeric || isUuid)) {
        try {
          const { data: dbMatches, error: matchError } = await supabase
            .from('professionals')
            .select('*')
            .eq('name', resolvedName);
          
          if (!matchError && dbMatches && dbMatches.length > 0) {
            console.log('[proService] Symmetrically deleting matching database entries by name:', resolvedName);
            for (const dbPro of dbMatches) {
              // Archive it first
              proToArchive = dbPro;
              const archiveData: any = {
                name: dbPro.name,
                company_name: dbPro.company_name,
                profession: dbPro.profession || dbPro.category,
                rating: dbPro.rating,
                review_count: dbPro.review_count ?? dbPro.reviews_count,
                languages: dbPro.languages,
                image_url: dbPro.image_url || dbPro.image,
                description: dbPro.description || dbPro.bio,
                phone: dbPro.phone,
                email: dbPro.email,
                website: dbPro.website,
                instagram: dbPro.instagram,
                facebook: dbPro.facebook,
                location: dbPro.location,
                lat: dbPro.lat,
                lng: dbPro.lng,
                created_at: dbPro.created_at,
                original_id: String(dbPro.id),
                deleted_at: new Date().toISOString()
              };

              Object.keys(archiveData).forEach(key => {
                if (archiveData[key] === undefined) delete archiveData[key];
              });

              try {
                await supabase.from('deleted_professionals').insert([archiveData]);
              } catch (e) {
                console.warn('[proService] Archiving matched pro warning:', e);
              }

              // Delete from DB
              await supabase.from('professionals').delete().eq('id', dbPro.id);

              // Add its DB ID to deleted_pro_ids
              if (typeof window !== 'undefined') {
                const deletedRaw = localStorage.getItem('deleted_pro_ids');
                const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
                if (!deletedList.includes(String(dbPro.id))) {
                  deletedList.push(String(dbPro.id));
                  localStorage.setItem('deleted_pro_ids', JSON.stringify(deletedList));
                }
              }
            }
          }
        } catch (err: any) {
          console.warn('[proService] DB match deletion exception:', err.message);
        }
      }
    }

    if (proToArchive && (isNumeric || isUuid)) {
      console.log('[proService] Archiving pro data...');
      const archiveData: any = {
        name: proToArchive.name,
        company_name: proToArchive.company_name,
        profession: proToArchive.profession || proToArchive.category,
        rating: proToArchive.rating,
        review_count: proToArchive.review_count ?? proToArchive.reviews_count,
        languages: proToArchive.languages,
        image_url: proToArchive.image_url || proToArchive.image,
        description: proToArchive.description || proToArchive.bio,
        phone: proToArchive.phone,
        email: proToArchive.email,
        website: proToArchive.website,
        instagram: proToArchive.instagram,
        facebook: proToArchive.facebook,
        location: proToArchive.location,
        lat: proToArchive.lat,
        lng: proToArchive.lng,
        created_at: proToArchive.created_at,
        original_id: String(proToArchive.id),
        deleted_at: new Date().toISOString()
      };

      Object.keys(archiveData).forEach(key => {
        if (archiveData[key] === undefined) delete archiveData[key];
      });
      
      try {
        const { error: archiveError } = await supabase
          .from('deleted_professionals')
          .insert([archiveData]);
        if (archiveError) {
          console.warn('[proService] Archiving warning:', archiveError.message);
        }
      } catch (e) {
        console.warn('[proService] Archiving exception:', e);
      }
    }

    // 3. Delete from original table in Supabase if numeric or UUID or by ID
    if (isNumeric || isUuid) {
      try {
        const { error: deleteError } = await supabase
          .from('professionals')
          .delete()
          .eq('id', finalId);

        if (deleteError) {
          console.warn('[proService] Supabase delete error (handled):', deleteError.message);
        }
      } catch (e: any) {
        console.warn('[proService] Exception during DB delete:', e.message);
      }
    } else if (proToArchive && proToArchive.id) {
      try {
        await supabase
          .from('professionals')
          .delete()
          .eq('id', proToArchive.id);
      } catch (e) {
        console.warn('[proService] Exception deleting by proToArchive.id:', e);
      }
    }

    console.log('[proService] Deletion completed successfully for ID:', strId);
    return { success: true };
  },

  async submitRecommendation(recommendation: {
    user_email: string;
    pro_name?: string;
    company_name?: string;
    pro_category: string;
    pro_email?: string;
    pro_phone?: string;
    pro_image_url?: string;
    notes: string;
    top_qualities?: string[];
  }) {
    if (!isSupabaseConfigured) return null;

    const topQuals = recommendation.top_qualities || [];

    // Helper to build payload and remove undefined/null/empty keys to stay compliant with column checks
    const buildPayload = (includeTopQuals: boolean, includeImageUrl: boolean) => {
      const payload: any = {
        user_email: recommendation.user_email,
        pro_name: recommendation.pro_name,
        company_name: recommendation.company_name,
        pro_category: recommendation.pro_category,
        pro_email: recommendation.pro_email,
        pro_phone: recommendation.pro_phone,
        notes: includeTopQuals ? recommendation.notes : (topQuals.length > 0 ? embedQualities(recommendation.notes, topQuals) : recommendation.notes)
      };

      if (includeTopQuals) {
        payload.top_qualities = topQuals;
      }
      if (includeImageUrl && recommendation.pro_image_url) {
        payload.pro_image_url = recommendation.pro_image_url;
      }

      // Remove undefined/null keys to let database use default/nullable settings and avoid schema validation errors
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });

      return payload;
    };

    try {
      const useTopQuals = proService._hasRecTopQualitiesColumn;
      const useImageUrl = proService._hasRecProImageUrlColumn;
      const payload = buildPayload(useTopQuals, useImageUrl);
      
      console.log('[proService] Submitting recommendation payload:', JSON.stringify(payload, null, 2));
      const { data, error } = await supabase.from('recommendations').insert([payload]);
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('[proService] Error submitting recommendation, trying fallback:', err);
      
      const isImageUrlErr = err.code?.includes('PGRST') || err.message?.includes('pro_image_url');
      const isTopQualsErr = err.code?.includes('PGRST') || err.message?.includes('top_qualities') || err.message?.includes('Fallback');

      if (isImageUrlErr) {
        console.log('[proService] Detected pro_image_url column missing error. Adjusting flag.');
        proService._hasRecProImageUrlColumn = false;
      }
      if (isTopQualsErr) {
        console.log('[proService] Detected top_qualities column missing error. Adjusting flag.');
        proService._hasRecTopQualitiesColumn = false;
      }

      // Try once more with corrected flags
      try {
        const payload = buildPayload(proService._hasRecTopQualitiesColumn, proService._hasRecProImageUrlColumn);
        console.log('[proService] Executing first fallback submit:', JSON.stringify(payload, null, 2));
        const { data, error } = await supabase.from('recommendations').insert([payload]);
        if (error) throw error;
        return data;
      } catch (retryErr: any) {
        console.error('[proService] Fallback submit failed:', retryErr);
        
        // If it failed again, maybe another column is missing that hasn't been disabled yet
        const stillImageUrlErr = retryErr.code?.includes('PGRST') || retryErr.message?.includes('pro_image_url');
        const stillTopQualsErr = retryErr.code?.includes('PGRST') || retryErr.message?.includes('top_qualities');

        if (stillImageUrlErr) proService._hasRecProImageUrlColumn = false;
        if (stillTopQualsErr) proService._hasRecTopQualitiesColumn = false;

        if (stillImageUrlErr || stillTopQualsErr) {
          const finalPayload = buildPayload(proService._hasRecTopQualitiesColumn, proService._hasRecProImageUrlColumn);
          console.log('[proService] Executing ultimate fallback submit:', JSON.stringify(finalPayload, null, 2));
          const { data, error } = await supabase.from('recommendations').insert([finalPayload]);
          if (error) throw error;
          return data;
        }
        throw retryErr;
      }
    }
  },

  async getRecommendations() {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      proService._hasRecTopQualitiesColumn = 'top_qualities' in data[0];
      proService._hasRecProImageUrlColumn = 'pro_image_url' in data[0];
    }

    return data.map((rec: any) => {
      let topQualities: string[] = [];
      let cleanNotes = rec.notes || '';

      if (rec.top_qualities) {
        topQualities = typeof rec.top_qualities === 'string'
          ? JSON.parse(rec.top_qualities)
          : rec.top_qualities || [];
      } else {
        const parsed = parseEmbeddedQualities(cleanNotes);
        topQualities = parsed.qualities;
        cleanNotes = parsed.cleanText;
      }

      return {
        ...rec,
        notes: cleanNotes,
        top_qualities: topQualities
      };
    });
  },

  async addTestimony(testimony: {
    pro_id: string | number;
    author: string;
    rating: number;
    comment: string;
  }, authorEmail?: string) {
    if (!isSupabaseConfigured) return null;

    let finalProId = testimony.pro_id;
    if (typeof finalProId === 'string' && /^\d+$/.test(finalProId)) {
      finalProId = parseInt(finalProId, 10);
    }
    
    console.log('[proService] Adding testimony for pro_id:', finalProId, 'Type:', typeof finalProId);

    // Make sure author text incorporates the email securely if provided
    let finalAuthorValue = testimony.author;
    let extractedEmail = authorEmail;
    if (testimony.author.includes('|')) {
      const parts = testimony.author.split('|');
      finalAuthorValue = parts[0];
      extractedEmail = parts[1];
    }

    const payloadAuthor = extractedEmail ? `${finalAuthorValue}|${extractedEmail}` : finalAuthorValue;

    // Check if user already reviewed this pro
    const hasReviewed = await this.hasUserReviewedPro(finalAuthorValue, finalProId, extractedEmail);
    if (hasReviewed) {
      throw new Error('You have already submitted a testimonial for this professional.');
    }

    const payload = {
      pro_id: finalProId, // Pass normalized ID
      author: payloadAuthor,
      rating: testimony.rating,
      comment: testimony.comment,
      status: 'pending' // Default to pending for moderation
    };

    const { data, error } = await supabase
      .from('testimonies')
      .insert([payload])
      .select();

    if (error) {
      console.error('Error adding testimony:', error);
      throw error;
    }

    return data;
  },

  async hasUserReviewedPro(authorName: string, proId: string | number, authorEmail?: string) {
    if (!isSupabaseConfigured) return false;

    let finalProId = proId;
    if (typeof finalProId === 'string' && /^\d+$/.test(finalProId)) {
      finalProId = parseInt(finalProId, 10);
    }

    const { data, error } = await supabase
      .from('testimonies')
      .select('id, author')
      .eq('pro_id', finalProId);

    if (error) {
      console.error('Error checking existing testimony:', error);
      return false;
    }

    if (!data || data.length === 0) return false;

    // Check if any review has match with email
    if (authorEmail) {
      const emailLower = authorEmail.toLowerCase();
      const hasEmailMatch = data.some((t: any) => t.author && (
          t.author.toLowerCase() == emailLower || 
          t.author.toLowerCase().endsWith(`|${emailLower}`)
      ));
      return hasEmailMatch;
    }
    
    // Check if any review has match with the clean author name (as fallback for legacy or unmatched)
    const cleanSearchName = authorName.includes('|') ? authorName.split('|')[0].trim() : authorName.trim();
    return data.some((t: any) => {
      if (!t.author) return false;
      const cleanAuthor = t.author.includes('|') ? t.author.split('|')[0] : t.author;
      return cleanAuthor.trim().toLowerCase() === cleanSearchName.toLowerCase();
    });
  },

  async syncProfessionalStats(proId: string | number) {
    if (!isSupabaseConfigured) return;

    let finalProId = proId;
    if (typeof proId === 'string' && /^\d+$/.test(proId)) {
      finalProId = parseInt(proId, 10);
    }

    console.log('[proService] Recalculating stats for professional ID:', finalProId);

    // 1. Fetch all approved testimonies for this pro
    const { data: approvedTestimonies, error: fetchError } = await supabase
      .from('testimonies')
      .select('rating')
      .eq('pro_id', finalProId)
      .eq('status', 'approved');

    if (fetchError) {
      console.error('[proService] Error fetching testimonies for stats sync:', fetchError);
      return;
    }

    // 2. Calculate new stats
    const newCount = approvedTestimonies?.length || 0;
    let newRating = 0;
    if (newCount > 0) {
      const sum = approvedTestimonies.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      newRating = Number((sum / newCount).toFixed(1));
    }

    // 3. Update professional record
    // We check which columns exist to avoid errors
    const { data: proData } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', finalProId)
      .maybeSingle();

    if (!proData) return;

    const updates: any = { rating: newRating };
    if ('review_count' in proData) updates.review_count = newCount;
    if ('reviews_count' in proData) updates.reviews_count = newCount;

    console.log('[proService] Applying recalculated stats:', updates);
    const { error: updateError } = await supabase
      .from('professionals')
      .update(updates)
      .eq('id', finalProId);

    if (updateError) {
      console.error('[proService] Error updating pro stats during sync:', updateError);
    }
  },

  async approveTestimony(id: string | number) {
    if (!isSupabaseConfigured) return null;

    console.log('[proService] Approving testimony:', id);

    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    const { data: updateData, error: updateError, status } = await supabase
      .from('testimonies')
      .update({ status: 'approved', refusal_reason: null })
      .eq('id', finalId)
      .select();

    console.log('[proService] Approve UPDATE status:', status, 'Data returned:', updateData, 'Error:', updateError);

    if (updateError) {
      console.error('Error approving testimony:', updateError);
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      console.warn('[proService] No rows updated in approveTestimony for ID:', finalId);
      throw new Error('Testimony not found or no permission to update');
    }

    const testimonyData = updateData[0];
    console.log('[proService] Testimony state after approval:', testimonyData);

    // Sync stats
    await this.syncProfessionalStats(testimonyData.pro_id);

    return testimonyData;
  },

  async refuseTestimony(id: string | number, reason: string) {
    if (!isSupabaseConfigured) return null;

    console.log('[proService] Refusing testimony:', id, 'Reason:', reason);

    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    const { data, error, status } = await supabase
      .from('testimonies')
      .update({ status: 'refused', refusal_reason: reason })
      .eq('id', finalId)
      .select();

    console.log('[proService] Refuse UPDATE status:', status, 'Data returned:', data, 'Error:', error);

    if (error) {
      console.error('Error refusing testimony:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[proService] No rows updated in refuseTestimony for ID:', finalId);
      throw new Error('Testimony not found or no permission to update');
    }
    
    // Sync stats in case it was previously approved
    await this.syncProfessionalStats(data[0].pro_id);
    
    return data[0];
  },

  async getTestimonies(proId: string | number) {
    if (!isSupabaseConfigured) return [];

    let finalProId = proId;
    if (typeof finalProId === 'string' && /^\d+$/.test(finalProId)) {
      finalProId = parseInt(finalProId, 10);
    }

    const { data, error } = await supabase
      .from('testimonies')
      .select('*')
      .eq('pro_id', finalProId)
      .eq('status', 'approved') // Only return approved testimonies publicly
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching testimonies:', error);
      return [];
    }
    return data;
  },

  async getAllTestimonies() {
    if (!isSupabaseConfigured) return [];

    const { data: testimonies, error } = await supabase
      .from('testimonies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching all testimonies:', error);
      return [];
    }

    const proIds = Array.from(new Set(testimonies.map(t => t.pro_id).filter(Boolean)));
    const professionalsMap = new Map<string, any>();

    if (proIds.length > 0) {
      const { data: professionals, error: proError } = await supabase
        .from('professionals')
        .select('id, name, company_name')
        .in('id', proIds);

      if (proError) {
        console.warn('Error fetching professionals for testimonies:', proError);
      } else if (professionals) {
        professionals.forEach(p => {
          professionalsMap.set(String(p.id), p);
        });
      }
    }

    return testimonies.map(t => {
      const pro = t.pro_id ? professionalsMap.get(String(t.pro_id)) : null;
      return {
        ...t,
        professionals: pro ? { name: pro.name, company_name: pro.company_name } : null
      };
    });
  },

  async getMyTestimonies(authorName: string, authorEmail?: string) {
    if (!isSupabaseConfigured) return [];

    let query = supabase.from('testimonies').select('*');
    
    if (authorEmail) {
      const emailLower = authorEmail.toLowerCase();
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error fetching my testimonies:', error);
        return [];
      }
      
      return data.filter((t: any) => {
        if (!t.author) return false;
        if (t.author.toLowerCase().endsWith(`|${emailLower}`)) return true;
        
        // Fallback for legacy comments: match name only if no '|' is present in the database author field
        if (!t.author.includes('|')) {
          const cleanAuthor = t.author.trim().toLowerCase();
          const cleanSearchName = authorName.trim().toLowerCase();
          return cleanAuthor === cleanSearchName;
        }
        return false;
      });
    } else {
      const { data, error } = await query.eq('author', authorName).order('created_at', { ascending: false });
      if (error) {
        console.warn('Error fetching my testimonies:', error);
        return [];
      }
      return data;
    }
  },

  async updateTestimony(id: string | number, rating: number, comment: string) {
    if (!isSupabaseConfigured) return null;

    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    // 1. Get current testimony to check status and pro_id
    const { data: currentTestimony, error: fetchError } = await supabase
      .from('testimonies')
      .select('*')
      .eq('id', finalId)
      .maybeSingle();

    if (fetchError || !currentTestimony) {
      console.error('Error fetching testimony for update:', fetchError);
      throw new Error('Testimony not found');
    }

    // 2. Update the testimony to pending
    const { data, error } = await supabase
      .from('testimonies')
      .update({ 
        rating, 
        comment, 
        status: 'pending',
        refusal_reason: null
      })
      .eq('id', finalId)
      .select();

    if (error) {
      console.error('Error updating testimony:', error);
      throw error;
    }

    // 3. Recalculate stats for the pro
    await this.syncProfessionalStats(currentTestimony.pro_id);

    return data;
  },

  async deleteTestimony(id: string | number) {
    if (!isSupabaseConfigured) return false;

    let finalId = id;
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
    }

    // Fetch the testimony first to check its status and pro_id (for stats update)
    let testimonyData = null;
    try {
      const { data, error: fetchError } = await supabase
        .from('testimonies')
        .select('*')
        .eq('id', finalId)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      if (!fetchError) {
        testimonyData = data;
      }
    } catch (e) {
      console.warn('Error fetching testimony before deletion:', e);
    }

    const { error: deleteError } = await supabase
      .from('testimonies')
      .delete()
      .eq('id', finalId);

    if (deleteError) {
      console.error('Error deleting testimony:', deleteError);
      throw deleteError;
    }

    // Recalculate stats for the pro
    if (testimonyData) {
      await this.syncProfessionalStats(testimonyData.pro_id);
    }

    return true;
  },

  async updateRecommendationStatus(id: string, status: 'pending' | 'validated' | 'refused', adminNotes?: string | null) {
    if (!isSupabaseConfigured) return null;

    const updatePayload: any = { status };
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    } else if (status === 'pending' || status === 'validated') {
      // Clear notes when moving away from refused status unless specifically provided
      updatePayload.admin_notes = null;
    }

    const { data, error } = await supabase
      .from('recommendations')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No recommendation found with ID: ${id}`);
    }

    return data;
  },

  async bulkImportProfessionals(prosToImport: any[]): Promise<number> {
    if (!Array.isArray(prosToImport) || prosToImport.length === 0) return 0;

    // Dynamically retrieve all existing categories present in the app
    const existingCategories = await this.getExistingCategoryNames();

    // 0. Intelligently normalize categories against existing app categories before storing
    prosToImport.forEach(pro => {
      const rawImpProf = pro.profession || pro.category || 'Professional';
      const impCats = rawImpProf.split(',').map((s: string) => s.trim()).filter(Boolean);
      const normImpCats = normalizeCategoriesList(impCats, existingCategories);

      // Track newly added categories so subsequent pros in this same batch stay aligned
      normImpCats.forEach(nc => {
        if (!existingCategories.includes(nc)) {
          existingCategories.push(nc);
        }
      });

      const normImpProf = normImpCats.join(', ') || 'Professional';
      pro.profession = normImpProf;
      pro.category = normImpProf;
      pro.categories = normImpCats;
    });

    let savedLocallyCount = 0;

    // 1. Always persist in localStorage to guarantee persistence
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        const existing: any[] = stored ? JSON.parse(stored) : [];
        const existingIds = new Set(existing.map(p => String(p.id)));
        const existingNames = new Set(existing.map(p => (p.name || '').toLowerCase().trim()));

        const newlyAdded: any[] = [];
        prosToImport.forEach(pro => {
          const proNameLower = (pro.name || '').toLowerCase().trim();
          if (!existingIds.has(String(pro.id)) && (!proNameLower || !existingNames.has(proNameLower))) {
            const parsed = parseEmbeddedQualities(pro.description || pro.bio || '');
            const cleanBio = parsed.cleanText;
            newlyAdded.push({
              ...pro,
              bio: cleanBio,
              description: cleanBio
            });
            existingIds.add(String(pro.id));
            if (proNameLower) existingNames.add(proNameLower);
          }
        });

        const merged = [...existing, ...newlyAdded];
        localStorage.setItem('unlocked_imported_pros', JSON.stringify(merged));
        savedLocallyCount = newlyAdded.length;
        console.log(`[proService] Saved ${newlyAdded.length} new pros to local storage. Total stored: ${merged.length}`);
      }
    } catch (e) {
      console.warn('[proService] Error saving imported pros to localStorage:', e);
    }

    // 2. Also try batch inserting into Supabase if connected
    if (isSupabaseConfigured) {
      try {
        const dbPayloads = prosToImport.map(pro => {
          const parsed = parseEmbeddedQualities(pro.description || pro.bio || '');
          const cleanBio = parsed.cleanText;

          let lat = typeof pro.lat === 'string' ? parseFloat(pro.lat) : pro.lat;
          let lng = typeof pro.lng === 'string' ? parseFloat(pro.lng) : pro.lng;
          if (isNaN(lat)) lat = 0;
          if (isNaN(lng)) lng = 0;

          const isProCommunity = pro.is_recommended ?? pro.is_recommanded ?? pro.is_community_recommended ?? (pro.source === 'community');
          const isGoogleProImport = pro.source === 'google_places' || pro.source === 'google' || !isProCommunity;

          return {
            name: pro.name,
            company_name: pro.company_name || pro.name,
            profession: pro.profession || 'Professional',
            rating: isGoogleProImport ? 0 : (typeof pro.rating === 'number' ? pro.rating : 4.8),
            review_count: isGoogleProImport ? 0 : (pro.review_count ?? pro.reviews_count ?? 0),
            languages: Array.isArray(pro.languages) ? pro.languages : ['Espagnol'],
            image_url: pro.image_url || pro.image || '',
            description: cleanBio,
            phone: pro.phone || '',
            email: pro.email || '',
            website: pro.website || '',
            location: pro.location || 'Valence',
            lat,
            lng,
            has_filled_form: false
          };
        });

        const { error } = await supabase
          .from('professionals')
          .insert(dbPayloads);

        if (error) {
          console.warn('[proService] Batch DB insert notice (handled safely via local storage):', error.message);
        } else {
          console.log(`[proService] Successfully inserted ${dbPayloads.length} pros into Supabase database.`);
        }
      } catch (err: any) {
        console.warn('[proService] DB batch insert exception (handled safely):', err.message);
      }
    }

    return savedLocallyCount > 0 ? savedLocallyCount : prosToImport.length;
  },

  getImportedPros(): any[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('unlocked_imported_pros');
        return stored ? JSON.parse(stored) : [];
      }
    } catch (e) {
      console.warn('Error reading imported pros:', e);
    }
    return [];
  },

  deleteImportedPro(id: string): boolean {
    try {
      if (typeof window !== 'undefined') {
        const strId = String(id);
        const stored = localStorage.getItem('unlocked_imported_pros');
        if (stored) {
          const list = JSON.parse(stored);
          const filtered = list.filter((p: any) => String(p.id) !== strId);
          localStorage.setItem('unlocked_imported_pros', JSON.stringify(filtered));
        }

        const deletedRaw = localStorage.getItem('deleted_pro_ids');
        const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedList.includes(strId)) {
          deletedList.push(strId);
          localStorage.setItem('deleted_pro_ids', JSON.stringify(deletedList));
        }
        return true;
      }
    } catch (e) {
      console.warn('Error deleting imported pro:', e);
    }
    return false;
  },

  clearAllImportedPros(): boolean {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('unlocked_imported_pros');
        return true;
      }
    } catch (e) {
      console.warn('Error clearing imported pros:', e);
    }
    return false;
  }
};
