import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Ad {
  id: string;
  created_at: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  location: string;
  location_precision?: 'approximate' | 'exact';
  exact_address?: string;
  lat?: number;
  lng?: number;
  coordinates?: { lat: number; lng: number };
  type?: string;
  fuel_type?: string;
  property_type?: string;
  contract_type?: string;
  size?: string;
  image_url: string;
  images?: string[];
  user_id?: string;
  seller_name?: string;
  seller_image?: string;
  seller_phone?: string;
}

export const marketplaceService = {
  async getAds(): Promise<Ad[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('marketplace')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        return [];
      }

      // Collect user_ids to batch query author profiles from 'profiles' table
      const userIds = Array.from(new Set(data.map((item: any) => item.user_id).filter(Boolean)));
      const profilesMap: Record<string, { full_name?: string; avatar_url?: string }> = {};

      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              profilesMap[p.id] = {
                full_name: p.full_name,
                avatar_url: p.avatar_url
              };
            });
          }
        } catch (profileErr) {
          console.warn('[Marketplace] Could not batch fetch profiles:', profileErr);
        }
      }

      // Parse metadata and enrich each ad
      return data.map((rawItem: any) => {
        let desc = rawItem.description || '';
        let meta: Record<string, any> = {};

        // Extract metadata block <!-- unlocked_meta:{...} -->
        const metaMatch = desc.match(/<!--\s*unlocked_meta:([\s\S]*?)\s*-->/);
        if (metaMatch) {
          try {
            meta = JSON.parse(metaMatch[1]);
            // Remove the hidden metadata block from visible description
            desc = desc.replace(metaMatch[0], '').trim();
          } catch (e) {
            console.warn('[Marketplace] Failed to parse ad metadata JSON:', e);
          }
        }

        const userProfile = rawItem.user_id ? profilesMap[rawItem.user_id] : null;

        const seller_name = rawItem.seller_name || 
                            meta.seller_name || 
                            userProfile?.full_name || 
                            'Community Member';

        const seller_image = rawItem.seller_image || 
                             meta.seller_image || 
                             userProfile?.avatar_url || 
                             undefined;

        const seller_phone = rawItem.seller_phone || 
                             meta.seller_phone || 
                             undefined;

        const exact_address = rawItem.exact_address || 
                              meta.exact_address || 
                              undefined;

        const location_precision = rawItem.location_precision || 
                                  meta.location_precision || 
                                  (exact_address ? 'exact' : 'approximate');

        const lat = rawItem.lat !== undefined && rawItem.lat !== null 
          ? Number(rawItem.lat) 
          : (meta.lat !== undefined && meta.lat !== null ? Number(meta.lat) : undefined);

        const lng = rawItem.lng !== undefined && rawItem.lng !== null 
          ? Number(rawItem.lng) 
          : (meta.lng !== undefined && meta.lng !== null ? Number(meta.lng) : undefined);

        return {
          ...rawItem,
          description: desc,
          seller_name,
          seller_image,
          seller_phone,
          exact_address,
          location_precision,
          lat,
          lng,
          coordinates: lat && lng ? { lat, lng } : undefined,
          type: rawItem.type || meta.type,
          fuel_type: rawItem.fuel_type || meta.fuel_type,
          property_type: rawItem.property_type || meta.property_type,
          contract_type: rawItem.contract_type || meta.contract_type,
          size: rawItem.size || meta.size,
        } as Ad;
      });
    } catch (error) {
      console.error('Error fetching ads from Supabase:', error);
      return [];
    }
  },

  async createAd(ad: Omit<Ad, 'id' | 'created_at'>) {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, mock creating ad');
      const newAd: Ad = {
        ...ad,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      return newAd;
    }

    // Embed extra category attributes into visible description if present
    const extraDetails: string[] = [];
    if (ad.category === 'Real Estate') {
      if (ad.type) extraDetails.push(`For ${ad.type}`);
      if (ad.property_type) extraDetails.push(`Property: ${ad.property_type}`);
    } else if (ad.category === 'Vehicles' && ad.fuel_type) {
      extraDetails.push(`Fuel: ${ad.fuel_type}`);
    } else if (ad.category === 'Jobs' && ad.contract_type) {
      extraDetails.push(`Contract: ${ad.contract_type}`);
    } else if (ad.category === 'Clothing' && ad.size) {
      extraDetails.push(`Size: ${ad.size}`);
    }
    if (ad.exact_address) {
      extraDetails.push(`Exact Meeting/Pickup: ${ad.exact_address}`);
    }

    let finalDescription = (ad.description || '').trim();
    if (extraDetails.length > 0) {
      const extraBlock = `\n\n[Details: ${extraDetails.join(' · ')}]`;
      if (!finalDescription.includes(extraDetails[0])) {
        finalDescription = finalDescription ? `${finalDescription}${extraBlock}` : extraDetails.join(' · ');
      }
    }

    // Store seller_phone, seller_name, exact_address, coordinates in a hidden metadata comment block
    // to guarantee 100% persistence in Supabase even if custom columns do not exist in the database table
    const meta: Record<string, any> = {};
    if (ad.seller_name) meta.seller_name = ad.seller_name;
    if (ad.seller_phone) meta.seller_phone = ad.seller_phone;
    if (ad.seller_image) meta.seller_image = ad.seller_image;
    if (ad.exact_address) meta.exact_address = ad.exact_address;
    if (ad.location_precision) meta.location_precision = ad.location_precision;
    if (ad.lat !== undefined && ad.lat !== null) meta.lat = ad.lat;
    if (ad.lng !== undefined && ad.lng !== null) meta.lng = ad.lng;
    if (ad.type) meta.type = ad.type;
    if (ad.fuel_type) meta.fuel_type = ad.fuel_type;
    if (ad.property_type) meta.property_type = ad.property_type;
    if (ad.contract_type) meta.contract_type = ad.contract_type;
    if (ad.size) meta.size = ad.size;

    if (Object.keys(meta).length > 0) {
      finalDescription = `${finalDescription}\n\n<!-- unlocked_meta:${JSON.stringify(meta)} -->`.trim();
    }

    // Build payload with safe, standard columns
    const payload: Record<string, any> = {
      title: ad.title,
      description: finalDescription,
      price: ad.price,
      category: ad.category,
      condition: ad.condition || 'Good',
      location: ad.location || 'Valencia',
      image_url: ad.image_url || '',
    };

    if (ad.user_id) payload.user_id = ad.user_id;
    if (ad.seller_name) payload.seller_name = ad.seller_name;
    if (ad.seller_image) payload.seller_image = ad.seller_image;
    if (ad.seller_phone) payload.seller_phone = ad.seller_phone;
    if (ad.lat !== undefined && ad.lat !== null) payload.lat = ad.lat;
    if (ad.lng !== undefined && ad.lng !== null) payload.lng = ad.lng;
    if (ad.exact_address) payload.exact_address = ad.exact_address;
    if (ad.location_precision) payload.location_precision = ad.location_precision;
    if (ad.images && Array.isArray(ad.images) && ad.images.length > 0) {
      payload.images = ad.images;
    }

    // Robust insert loop: automatically removes any column that doesn't exist in Supabase schema (PGRST204)
    let currentPayload = { ...payload };
    const maxRetries = 12;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('marketplace')
          .insert([currentPayload])
          .select()
          .single();

        if (error) throw error;
        
        // Return enriched Ad object
        return {
          ...data,
          seller_name: ad.seller_name || data.seller_name,
          seller_image: ad.seller_image || data.seller_image,
          seller_phone: ad.seller_phone || data.seller_phone,
          exact_address: ad.exact_address,
          location_precision: ad.location_precision,
          lat: ad.lat,
          lng: ad.lng,
          coordinates: ad.coordinates,
          description: (ad.description || '').trim()
        } as Ad;
      } catch (err: any) {
        const errMsg = err?.message || JSON.stringify(err);
        const match = errMsg.match(/Could not find the '([^']+)' column/i);
        
        if (match && match[1] && match[1] in currentPayload) {
          const colToRemove = match[1];
          console.warn(`[Marketplace] Column '${colToRemove}' does not exist in 'marketplace' table. Removing and retrying insert...`);
          delete currentPayload[colToRemove];
          continue;
        }

        console.error('Error inserting ad into Supabase:', err);
        throw err;
      }
    }

    throw new Error('Failed to create ad after removing unrecognized columns.');
  },

  async deleteAd(id: string) {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, mock deleting ad');
      return;
    }

    const { error } = await supabase
      .from('marketplace')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
