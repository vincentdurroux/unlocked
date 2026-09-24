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
    title: 'Vintage 90s Levi\'s 501 Original (Made in USA, W32 L32)', 
    price: '€48', 
    category: 'Clothing', 
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: 'Authentic 1994 Levi\'s 501 straight leg denim with natural vintage fade and honeycombing. Heavyweight 100% cotton, button fly, no rips or tears. Sourced from a local Ruzafa vintage shop.',
    seller_name: 'Camille Laurent',
    seller_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
    seller_phone: '+34 612 345 678'
  },
  { 
    id: '2', 
    title: 'Mid-Century Danish Teak Sideboard & Vinyl Credenza', 
    price: '€280', 
    category: 'Home', 
    condition: 'Like New',
    location: 'El Carmen, Valencia',
    image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    description: 'Gorgeous 1960s restored teak credenza with sliding tambour doors and brass tapered legs. Perfect height for a turntable and holds ~120 vinyl records. Moving flats so priced to go quickly.',
    seller_name: 'Mateo Rossi',
    seller_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  { 
    id: '3', 
    title: 'Vintage Peugeot Touraine City Cruiser (7-Speed)', 
    price: '€95', 
    category: 'Leisure', 
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    description: 'Classic French city commuter in great running condition. Brand new Continental tires, leather Brooks-style saddle, chrome dynamo front light and wicker basket. Perfect for cruising Turia park.',
    seller_name: 'Elena Garcia',
    seller_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '4',
    title: '1970s Leather Biker Jacket (Supple Distressed Leather)',
    price: '€85',
    category: 'Clothing',
    condition: 'Good',
    location: 'Benimaclet',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    description: 'Heavyweight brown vintage leather motorcycle jacket with authentic patina and original brass YKK zips. Quilted satin lining in clean shape. Unisex size Medium.',
    seller_name: 'Lucas Bernard',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '5',
    title: 'Vintage Technics SL-1200 Turntable + 15 Vinyl LPs Bundle',
    price: '€390',
    category: 'Electronics',
    condition: 'Like New',
    location: 'El Carmen',
    image_url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    description: 'Legendary direct drive turntable with fresh Ortofon cartridge. Includes 15 curated classic vinyl records (Fleetwood Mac, Bowie, Miles Davis, Bossa Nova classics). Superb warm sound.',
    seller_name: 'David Wilson',
    seller_image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '6',
    title: 'Handmade Vintage Moroccan Beni Ourain Wool Rug (180x120cm)',
    price: '€140',
    category: 'Home',
    condition: 'Like New',
    location: 'Eixample',
    image_url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    description: '100% natural virgin sheep wool with iconic geometric diamond patterns. Deep plush pile, super soft barefoot. Professionally washed and ready for a cozy Valencia living room.',
    seller_name: 'Sophie Martin',
    seller_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '7',
    title: 'Polaroid 600 Sun Vintage Instant Camera (Tested & Working)',
    price: '€55',
    category: 'Electronics',
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    description: 'Iconic 1980s boxy Polaroid camera with built-in electronic flash. Tested with modern Polaroid 600 film packs. Glass lens is crystal clear. Great creative companion for street photography.',
    seller_name: 'Paula Navarro',
    seller_image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '8',
    title: 'Retro Murano Style Mushroom Swirl Glass Lamp',
    price: '€65',
    category: 'Home',
    condition: 'Like New',
    location: 'Cabañal / Malvarrosa',
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    description: 'Warm ambient glow table lamp with creamy amber swirl hand-blown glass. Rewired to EU standard with warm LED bulb included. Looks stunning on a bedside or shelf.',
    seller_name: 'Liam Chen',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '9',
    title: 'Vintage Adidas Originals 90s Colorblock Windbreaker (Size L)',
    price: '€38',
    category: 'Clothing',
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 68).toISOString(),
    description: 'Retro turquoise, purple and white 90s streetwear shell jacket with embroidered trefoil logo. Lightweight breathable nylon with zip pockets. Authentic vintage piece in excellent shape.',
    seller_name: 'Claire Jenkins',
    seller_image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '10',
    title: 'Set of 6 Glazed Spanish Terracotta Plant Pots + Monsteras',
    price: 'Free',
    category: 'Free',
    condition: 'Good',
    location: 'Ruzafa',
    image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 75).toISOString(),
    description: 'Zero waste giveaway! Relocating to a smaller balcony. 6 charming terracotta planters with healthy rooted Monstera Deliciosa and Pothos cuttings. Free for pickup today in Ruzafa.',
    seller_name: 'Thomas Weber',
    seller_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '11',
    title: 'Solid Oak Dining Table + 4 Matching Chairs (160x90cm)',
    price: '€160',
    category: 'Home',
    condition: 'Good',
    location: 'Eixample',
    image_url: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 82).toISOString(),
    description: 'Beautiful solid oak wood dining set in good condition. Sturdy, treated with natural beeswax. Moving abroad next month, needs to be picked up from first-floor apartment with elevator.',
    seller_name: 'Marta Gomez',
    seller_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
    seller_phone: '+34 654 321 987'
  },
  {
    id: '12',
    title: 'De\'Longhi Dedica Espresso Machine + Stainless Tamper',
    price: '€75',
    category: 'Electronics',
    condition: 'Like New',
    location: 'El Carmen',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    description: 'Slim stainless steel espresso maker, descaled regularly, works like a charm. Includes single and double shot pressurized baskets plus upgraded solid metal tamper.',
    seller_name: 'Jonas Lindqvist',
    seller_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '13',
    title: 'Bugaboo Bee 5 Stroller + Rain Cover (All-black frame)',
    price: '€120',
    category: 'School & Kids',
    condition: 'Very Good',
    location: 'Campanar',
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
    description: 'Compact city stroller ideal for Valencia pavements and metro. Clean fabric, folds smoothly with one hand, stored indoors in a smoke-free home.',
    seller_name: 'Sara & Daniel',
    seller_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'
  },
  {
    id: '14',
    title: 'Collection of 18 Contemporary Fiction & Spanish Learning Novels',
    price: '€25',
    category: 'Books',
    condition: 'Like New',
    location: 'Benimaclet',
    image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600&h=450',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 125).toISOString(),
    description: 'Curated mix of English paperbacks (Murakami, Sally Rooney, Ishiguro) and B1/B2 Spanish graded readers with vocabulary notes. Great bundle for students or expats.',
    seller_name: 'Hannah Brooks',
    seller_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150'
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
