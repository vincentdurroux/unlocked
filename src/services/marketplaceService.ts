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
      
      return (data as Ad[]);
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

    // Embed extra category attributes & location precision into description if present
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
    if (ad.images && Array.isArray(ad.images) && ad.images.length > 0) {
      payload.images = ad.images;
    }

    // Robust insert loop: automatically removes any column that doesn't exist in Supabase schema (PGRST204)
    let currentPayload = { ...payload };
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('marketplace')
          .insert([currentPayload])
          .select()
          .single();

        if (error) throw error;
        return data as Ad;
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
