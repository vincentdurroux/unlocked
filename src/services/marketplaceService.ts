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

const MOCK_ADS: Ad[] = [
  { 
    id: '1', 
    title: 'Lycée Français de Valence Uniform Bundle (Navy Blazers, Polos, Cardigan - Size 8-10)', 
    price: '€45', 
    category: 'School & Uniforms', 
    condition: 'Like New',
    location: 'Paterna',
    exact_address: 'Calle Llentiscle 1, 46980 Paterna, Valencia',
    lat: 39.5298,
    lng: -0.4496,
    coordinates: { lat: 39.5298, lng: -0.4496 },
    image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: 'Complete official school uniform set for LFValence (elementary). Includes 1 official navy blazer, 3 embroidered white polo shirts, and 1 knitted cardigan. Clean, smoke-free home.',
    seller_name: 'Camille Laurent',
    seller_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
    seller_phone: '+34 612 345 678'
  },
  { 
    id: '2', 
    title: 'Vintage Sezane Floral Silk Wrap Dress (Size 38 / M)', 
    price: '€55', 
    category: 'Women’s Clothing', 
    condition: 'Like New',
    location: 'Ruzafa',
    exact_address: 'Carrer de Cadis 22, 46006 València',
    lat: 39.4624,
    lng: -0.3732,
    coordinates: { lat: 39.4624, lng: -0.3732 },
    image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    description: 'Gorgeous 100% mulberry silk wrap dress from Paris. Flattering cut, deep floral prints with subtle lining. Worn once for a wedding, dry cleaned.',
    seller_name: 'Elena Garcia',
    seller_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'
  },
  { 
    id: '3', 
    title: '1970s Distressed Brown Leather Biker Jacket (Unisex Size M)', 
    price: '€85', 
    category: 'Men’s Clothing', 
    condition: 'Good',
    location: 'Benimaclet',
    exact_address: 'Carrer del Baró de San Petrillo 14, 46020 València',
    lat: 39.4862,
    lng: -0.3582,
    coordinates: { lat: 39.4862, lng: -0.3582 },
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    description: 'Heavyweight brown vintage leather motorcycle jacket with authentic patina and original brass YKK zips. Quilted satin lining in clean shape.',
    seller_name: 'Lucas Bernard',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '4',
    title: 'Zara Kids & Petit Bateau Winter Outerwear Bundle (Ages 4-6)',
    price: '€32',
    category: 'Kids’ Clothing',
    condition: 'Like New',
    location: 'Campanar',
    lat: 39.4812,
    lng: -0.3955,
    coordinates: { lat: 39.4812, lng: -0.3955 },
    image_url: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    description: 'Warm hooded puffer jacket + 2 fleece sweaters and a raincoat. Very gentle wear, no stains or scuffs.',
    seller_name: 'Marta Gomez',
    seller_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '5',
    title: 'Autry Medalist Low Vintage Sneakers (White & Emerald, EU 41)',
    price: '€75',
    category: 'Shoes',
    condition: 'Like New',
    location: 'Ruzafa',
    lat: 39.4635,
    lng: -0.3712,
    coordinates: { lat: 39.4635, lng: -0.3712 },
    image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    description: 'Iconic retro low-top leather sneakers with vintage sole effect. Barely worn twice indoors, includes original box and dustbag.',
    seller_name: 'Mateo Rossi',
    seller_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '6',
    title: 'Handcrafted 18k Gold Plated Pearl Drop Earrings & Silk Pouch',
    price: '€35',
    category: 'Jewellery & Accessories',
    condition: 'Pristine Vintage',
    location: 'El Carmen',
    lat: 39.4774,
    lng: -0.3802,
    coordinates: { lat: 39.4774, lng: -0.3802 },
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    description: 'Locally crafted baroque freshwater pearls set in textured hypoallergenic 18k gold vermeil. Lightweight, comfortable for all-day wear.',
    seller_name: 'Sophie Martin',
    seller_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '7',
    title: 'Vintage Peugeot Touraine City Cruiser Bike (7-Speed Shimano)',
    price: '€95',
    category: 'Sports & Outdoors',
    condition: 'Good',
    location: 'Ruzafa',
    lat: 39.4611,
    lng: -0.3725,
    coordinates: { lat: 39.4611, lng: -0.3725 },
    image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    description: 'Classic city bike, newly tuned up with fresh Continental tires, front basket and rear rack. Ideal for cruising the Turia park.',
    seller_name: 'David Wilson',
    seller_image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '8',
    title: 'Bugaboo Bee 5 City Stroller + Rain Cover (All-black frame)',
    price: '€120',
    category: 'Baby & Nursery',
    condition: 'Like New',
    location: 'Campanar',
    lat: 39.4820,
    lng: -0.3930,
    coordinates: { lat: 39.4820, lng: -0.3930 },
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    description: 'Compact city stroller ideal for Valencia pavements and metro. Clean fabric, folds smoothly with one hand, stored indoors in a smoke-free home.',
    seller_name: 'Sara & Daniel',
    seller_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '9',
    title: 'Family Board Games Bundle (Catan, Ticket to Ride, Dixit)',
    price: '€40',
    category: 'Toys & Games',
    condition: 'Like New',
    location: 'Benimaclet',
    lat: 39.4855,
    lng: -0.3590,
    coordinates: { lat: 39.4855, lng: -0.3590 },
    image_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    description: '3 top rated modern board games in English and Spanish. 100% complete cards and tokens, perfect for cozy game nights.',
    seller_name: 'Paula Navarro',
    seller_image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '10',
    title: 'Vintage Technics SL-1200 Turntable + 15 Vinyl LPs Bundle',
    price: '€390',
    category: 'Electronics',
    condition: 'Like New',
    location: 'El Carmen',
    image_url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    description: 'Legendary direct drive turntable with fresh Ortofon cartridge. Includes 15 curated classic vinyl records (Fleetwood Mac, Bowie, Miles Davis, Bossa Nova classics).',
    seller_name: 'David Wilson',
    seller_image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '11',
    title: 'Mid-Century Danish Teak Sideboard & Vinyl Credenza',
    price: '€280',
    category: 'Home Décor & Furniture',
    condition: 'Like New',
    location: 'El Carmen',
    image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    description: 'Gorgeous 1960s restored teak credenza with sliding tambour doors and brass tapered legs. Perfect height for a turntable and holds ~120 records.',
    seller_name: 'Mateo Rossi',
    seller_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '12',
    title: 'De\'Longhi Dedica Espresso Machine + Stainless Steel Tamper',
    price: '€75',
    category: 'Appliances',
    condition: 'Like New',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    description: 'Slim stainless steel espresso maker, descaled regularly, works like a charm. Includes single and double shot pressurized baskets plus upgraded solid metal tamper.',
    seller_name: 'Jonas Lindqvist',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '13',
    title: 'Xiaomi Mi Pro 2 Electric Scooter + Helmet & High-Security Lock',
    price: '€180',
    category: 'Cars & Vehicles',
    condition: 'Good',
    location: 'Benimaclet',
    image_url: 'https://images.unsplash.com/photo-1597843786411-a7fa8ad44a9f?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    description: '45km range on full charge, battery health 96%. Includes phone mount, charger, U-lock and breathable helmet. Ready to ride in Valencia.',
    seller_name: 'Liam Chen',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '14',
    title: 'Collection of 18 Contemporary Fiction & Spanish Learning Novels',
    price: '€25',
    category: 'Books & Media',
    condition: 'Like New',
    location: 'Benimaclet',
    image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
    description: 'Curated mix of English paperbacks (Murakami, Sally Rooney, Ishiguro) and B1/B2 Spanish graded readers with vocabulary notes. Great bundle for expats.',
    seller_name: 'Hannah Brooks',
    seller_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '15',
    title: 'Set of 6 Glazed Spanish Terracotta Plant Pots + Monsteras',
    price: 'Free',
    category: 'Other',
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 62).toISOString(),
    description: 'Zero waste giveaway! Relocating to a smaller balcony. 6 charming terracotta planters with healthy rooted Monstera Deliciosa and Pothos cuttings. Free for pickup today.',
    seller_name: 'Thomas Weber',
    seller_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  }
];

export const marketplaceService = {
  async getAds() {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning mock ads');
      return MOCK_ADS;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        return MOCK_ADS;
      }
      
      // Put real database ads first, then complement with sample ads
      const dbIds = new Set(data.map((d: any) => String(d.id)));
      const complementaryMocks = MOCK_ADS.filter(m => !dbIds.has(String(m.id)));
      return [...(data as Ad[]), ...complementaryMocks];
    } catch (error) {
      console.error('Error fetching ads from Supabase:', error);
      return MOCK_ADS;
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
