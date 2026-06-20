import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
}

export function parseEmbeddedQualities(text: string): { qualities: string[], cleanText: string } {
  if (!text || typeof text !== 'string') return { qualities: [], cleanText: '' };
  const match = text.match(/^\[Qualities:\s*([^\]]+)\]\s*([\s\S]*)$/);
  if (match) {
    const qualities = match[1].split(',').map(s => s.trim()).filter(Boolean);
    const cleanText = match[2];
    return { qualities, cleanText };
  }
  return { qualities: [], cleanText: text };
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

  isAdmin(email?: string | null) {
    return false; // Hardcoded emails are deprecated. Admins are strictly verified via userProfile.is_admin = true in DB.
  },

  async getProfessionals() {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching professionals:', error);
      throw error;
    }

    console.log('[proService] Raw data from Supabase:', data);

    if (data && data.length > 0) {
      proService._hasTopQualitiesColumn = 'top_qualities' in data[0];
    }

    const mappedData = data.map((item: any) => {
      // Normalize lat/lng from columns, handling strings if necessary
      let lat = typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat;
      let lng = typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng;
      let displayLocation = item.location || '';

      // Fallback: Check if coordinates are bundled in the location field if columns are empty/invalid
      // We check both lat and lng to be safe, using a small epsilon
      const hasValidColumns = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && 
                              (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001);
      
      if (!hasValidColumns && typeof displayLocation === 'string' && (displayLocation.startsWith('GEO:') || displayLocation.includes('GEO:'))) {
        try {
          // More flexible regex to match GEO:lat,lng|Address even if there are spaces
          const geoMatch = displayLocation.match(/GEO:\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\|(.*)/);
          if (geoMatch) {
            lat = parseFloat(geoMatch[1]);
            lng = parseFloat(geoMatch[2]);
            displayLocation = geoMatch[3].trim();
            console.log(`[proService] Recovered coordinates from location bundle for ${item.name || 'Pro'}: ${lat}, ${lng}`);
          }
        } catch (e) {
          console.error('[proService] Error parsing bundled coordinates:', e);
        }
      }

      let topQualities: string[] = [];
      let cleanDescription = item.description || item.bio || '';

      if (item.top_qualities) {
        topQualities = typeof item.top_qualities === 'string'
          ? JSON.parse(item.top_qualities)
          : item.top_qualities || [];
      } else {
        const parsed = parseEmbeddedQualities(cleanDescription);
        topQualities = parsed.qualities;
        cleanDescription = parsed.cleanText;
      }

      // Normalize categories
      let categoriesList: string[] = [];
      const rawProfession = item.profession || item.category || '';
      if (typeof rawProfession === 'string' && rawProfession.trim()) {
        categoriesList = rawProfession.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (Array.isArray(rawProfession)) {
        categoriesList = rawProfession.map((s: any) => String(s).trim()).filter(Boolean);
      }
      if (categoriesList.length === 0 && rawProfession) {
        categoriesList = [rawProfession.trim()];
      }

      return {
        ...item,
        location: displayLocation,
        category: categoriesList.join(', '), // Map profession to category string for frontend compatibility
        categories: categoriesList,
        image: item.image_url || item.image, // Map image_url or image for frontend compatibility
        bio: cleanDescription, // Map stripped description to bio
        description: cleanDescription,
        top_qualities: topQualities,
        rating: item.rating ?? 0,
        review_count: item.review_count ?? item.reviews_count ?? 0, // Fallback to 0 if column is missing
        languages: typeof item.languages === 'string' ? JSON.parse(item.languages) : item.languages || [],
        has_filled_form: item.has_filled_form ?? false,
        coordinates: (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) ? 
          { lat, lng } : null
      };
    });

    console.log('[proService] Mapped data from Supabase:', mappedData);
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
    let proProfession = '';
    if (Array.isArray(pro.categories) && pro.categories.length > 0) {
      proProfession = pro.categories.join(', ');
    } else {
      proProfession = pro.profession || pro.category || pro.job || '';
    }
    const proImage = pro.image_url || pro.image || '';

    try {
      if (proService._hasTopQualitiesColumn) {
        const finalPro: any = {
          name: pro.name,
          company_name: pro.company_name,
          profession: proProfession,
          rating: pro.rating || 0,
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
          has_filled_form: pro.has_filled_form || false
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
          has_filled_form: pro.has_filled_form || false
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
    let updatedProfession = '';
    if (Array.isArray(pro.categories) && pro.categories.length > 0) {
      updatedProfession = pro.categories.join(', ');
    } else {
      updatedProfession = pro.profession || pro.category || '';
    }
    setIfChanged('profession', updatedProfession, existingRecord.profession || existingRecord.category);
    setIfChanged('rating', pro.rating, existingRecord.rating);
    setIfChanged('review_count', pro.review_count || pro.reviews_count, existingRecord.review_count || existingRecord.reviews_count);
    setIfChanged('languages', Array.isArray(pro.languages) ? pro.languages : [], existingRecord.languages);
    setIfChanged('image_url', pro.image_url || pro.image, existingRecord.image_url || existingRecord.image);

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

  async deleteProfessional(id: string | number) {
    if (!isSupabaseConfigured) return null;

    console.log('[proService] deleteProfessional requested for ID:', id);

    let finalId = id;
    const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Check if it's a numeric string and convert to number if it's NOT a UUID
    if (typeof id === 'string' && /^\d+$/.test(id)) {
      finalId = parseInt(id, 10);
      console.log('[proService] Normalized numeric string ID to number:', finalId);
    } else if (isUuid) {
      console.log('[proService] ID is a UUID:', id);
    }

    // 1. Fetch current data for archiving
    // Use a try-catch for the fetch because eq() on bigint with uuid string will throw 22P02
    let proToArchive = null;
    let fetchError = null;

    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', finalId)
        .maybeSingle();
      
      proToArchive = data;
      fetchError = error;
    } catch (e: any) {
      console.error('[proService] Exception during fetch for archive:', e);
      // If we got a type mismatch (22P02), it means this ID definitely doesn't exist in the bigint column
      if (e.code === '22P02' || (e.message && e.message.includes('bigint'))) {
         throw new Error(`Deletion failed: The ID "${id}" is a UUID, but the professionals table uses BigInt (numeric) IDs. This professional record cannot be found in the active directory.`);
      }
      throw e;
    }

    if (fetchError) {
      console.error('[proService] Error fetching pro for archive:', fetchError);
      // If it's a type mismatch error (22P02 in Postgres), provide a clearer message
      if (fetchError.code === '22P02' || fetchError.message?.includes('bigint')) {
        throw new Error(`Failed to fetch professional: The ID format "${finalId}" does not match the database type (expected BigInt).`);
      }
      throw new Error(`Failed to fetch professional before deletion: ${fetchError.message}`);
    }

    if (!proToArchive) {
      console.warn('[proService] Professional not found for archiving at ID:', finalId);
    } else {
      console.log('[proService] Archiving pro data...');
      
      // Explicitly pick fields to archive to avoid schema mismatches if the 
      // archive table is missing some secondary columns found in professionals table
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
        original_id: String(proToArchive.id), // Ensure it's a string
        deleted_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(archiveData).forEach(key => {
        if (archiveData[key] === undefined) delete archiveData[key];
      });
      
      const { error: archiveError } = await supabase
        .from('deleted_professionals')
        .insert([archiveData]);

      if (archiveError) {
        console.error('[proService] Archiving failed:', archiveError);
        // If it's a "column not found" error, we might want to warn specifically
        if (archiveError.message?.includes('column')) {
            throw new Error(`Archiving failed: ${archiveError.message}. Make sure your 'deleted_professionals' table has all the required columns (name, description, image_url, etc.).`);
        }
        throw new Error(`Archiving failed: ${archiveError.message}. Deletion aborted.`);
      }
      console.log('[proService] Archiving successful.');
    }

    // 3. Delete from original table
    try {
      const { error: deleteError } = await supabase
        .from('professionals')
        .delete()
        .eq('id', finalId);

      if (deleteError) {
        console.error('[proService] Supabase delete ERROR:', deleteError);
        if (deleteError.code === '22P02' || deleteError.message?.includes('bigint')) {
          throw new Error(`Deletion failed: The professional was successfully archived to 'deleted_professionals', but cannot be deleted from the active directory. This happens because of a trigger or constraint check comparing this UUID ID "${finalId}" to a BigInt column (such as 'testimonies.pro_id'). Please alter your relations/triggers in Supabase SQL Editor.`);
        }
        throw new Error(`Deletion failed: ${deleteError.message}`);
      }
    } catch (e: any) {
      if (e.code === '22P02' || (e.message && e.message.includes('bigint'))) {
        throw new Error(`Deletion failed: The professional was successfully archived to 'deleted_professionals', but cannot be deleted from the active directory. This happens because of a trigger or constraint check comparing this UUID ID "${finalId}" to a BigInt column (such as 'testimonies.pro_id'). Please alter your relations/triggers in Supabase SQL Editor.`);
      }
      throw e;
    }
    
    console.log('[proService] Deletion successful for ID:', finalId);
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
  }
};
