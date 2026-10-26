import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AppPartner {
  id: string;
  business_name: string;
  job: string; // e.g. Relocation, NIE & Expat Tax Advisory
  tagline?: string;
  logo_url: string;
  banner_image_url?: string;
  badge_label: string; // e.g. Official Partner, Featured Partner, Gold Partner
  badge_color?: 'emerald' | 'indigo' | 'amber' | 'blue' | 'purple';
  summary: string; // Concise business summary for expanded card
  detailed_description?: string; // Detailed services presentation
  perks?: string; // Expat member discount or special perk
  
  // Detailed contact info
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  whatsapp?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;

  is_active: boolean;
  featured_order?: number;
  updated_at?: string;
  highlight_mode?: PartnerHighlightMode;
}

export type PartnerHighlightMode = 'partner' | 'pro' | 'both';

export const DEFAULT_MOCK_PARTNERS: AppPartner[] = [
  {
    id: 'partner-valencia-expat-hub',
    business_name: 'Valencia Expat Hub & Legal',
    job: 'Relocation, NIE & Expat Tax Advisory',
    tagline: 'Your official relocation & legal settlement partner in Valencia',
    logo_url: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=240&auto=format&fit=crop&q=80',
    banner_image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80',
    badge_label: 'Gold Partner',
    badge_color: 'emerald',
    summary: 'Premier expat concierge and legal advisory in Valencia: NIE numbers, Digital Nomad & NLV visas, home search, bank accounts, and bilingual tax consulting.',
    detailed_description: 'Valencia Expat Hub simplifies every step of relocating to Valencia and the Costa Blanca. Our bilingual team (English, Spanish, French) guides you through visa applications, legal property checks, Golden Visas, and tax registration so you can settle in with total peace of mind.',
    perks: 'Exclusive Unlocked Member Offer: Free 30-min consultation + 10% off full Relocation & Visa packages.',
    phone: '+34 960 12 34 56',
    email: 'contact@valenciaexpathub.com',
    website: 'https://valenciaexpathub.com',
    address: 'Carrer de Colón 22, 46004 València',
    city: 'Valencia City Center',
    whatsapp: '+34612345678',
    linkedin: 'https://linkedin.com/company/valencia-expat-hub',
    instagram: 'https://instagram.com/valenciaexpathub',
    is_active: true,
    featured_order: 1,
    updated_at: new Date().toISOString()
  },
  {
    id: 'partner-costa-blanca-academy',
    business_name: 'Costa Blanca International School',
    job: 'Bilingual Education & Expat Family Advisory',
    tagline: 'Premier British & International Curriculum in Valencia & Costa Blanca',
    logo_url: 'https://images.unsplash.com/photo-1560179704-619285907453?w=240&auto=format&fit=crop&q=80',
    banner_image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000&auto=format&fit=crop&q=80',
    badge_label: 'Official Education Partner',
    badge_color: 'indigo',
    summary: 'Top-tier bilingual education for international children in Valencia. Personal campus tours, language immersion, and year-round admission support for expat families.',
    detailed_description: 'Costa Blanca International School provides accredited K-12 dual British-Spanish curricula, modern STEM labs, and comprehensive integration programs designed for English-speaking pupils settling in Valencia.',
    perks: 'Exclusive Member Perk: Priority admission assessment + waived initial registration fee (€250 value).',
    phone: '+34 961 98 76 54',
    email: 'admissions@costablanca-school.es',
    website: 'https://costablanca-school.es',
    address: 'Av. de les Corts Valencianes 58, 46015 València',
    city: 'Valencia Region',
    whatsapp: '+34698765432',
    linkedin: 'https://linkedin.com/company/costablanca-school',
    instagram: 'https://instagram.com/costablanca_school',
    is_active: true,
    featured_order: 2,
    updated_at: new Date().toISOString()
  },
  {
    id: 'partner-mediterraneo-insurance',
    business_name: 'Mediterráneo Expat Health & Home',
    job: 'Private Medical Insurance & Visa Compliance',
    tagline: 'Full-coverage private healthcare & home insurance for Spanish Residency',
    logo_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=240&auto=format&fit=crop&q=80',
    banner_image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1000&auto=format&fit=crop&q=80',
    badge_label: 'Featured Partner',
    badge_color: 'amber',
    summary: 'No-copay, full-coverage Spanish private health insurance policies tailored for Non-Lucrative Visa (NLV), Digital Nomad, and student visa applicants in Valencia.',
    detailed_description: 'Mediterráneo Insurance specializes in English-speaking assistance across Valencia. Instant quotes, embassy-approved zero-copay health policies, home insurance, and 24/7 bilingual medical support hotline.',
    perks: 'Unlocked Expat Special: 15% annual policy discount for MyCityUnlocked community members.',
    phone: '+34 963 45 67 89',
    email: 'info@mediterraneo-expat.com',
    website: 'https://mediterraneo-expat.com',
    address: 'Plaça de l\'Ajuntament 12, 46002 València',
    city: 'Valencia & Alicante',
    whatsapp: '+34654321098',
    linkedin: 'https://linkedin.com/company/mediterraneo-expat',
    instagram: 'https://instagram.com/mediterraneo_expat',
    is_active: true,
    featured_order: 3,
    updated_at: new Date().toISOString()
  }
];

const STORAGE_KEY_PARTNERS = 'mycity_app_partners_list';
const STORAGE_KEY_MODE = 'mycity_app_partner_mode';

export const partnerService = {
  getPartners(): AppPartner[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PARTNERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse partners list:', e);
    }
    return DEFAULT_MOCK_PARTNERS;
  },

  getActivePartners(): AppPartner[] {
    return this.getPartners().filter(p => p.is_active !== false);
  },

  getHighlightMode(): PartnerHighlightMode {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
      if (savedMode && ['partner', 'pro', 'both'].includes(savedMode)) {
        return savedMode as PartnerHighlightMode;
      }
    } catch (_) {}
    return 'pro'; // Default to 'pro' so standard "Meet a local pro" is shown by default
  },

  setHighlightMode(mode: PartnerHighlightMode): PartnerHighlightMode {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
      this.notifyUpdate();
      this.persistModeToSupabase(mode);
    } catch (e) {
      console.error('Failed to set highlight mode:', e);
    }
    return mode;
  },

  async persistModeToSupabase(mode: PartnerHighlightMode) {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('app_settings').upsert({
        key: 'partner_highlight_mode',
        value: mode,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Non-fatal: Unable to sync partner highlight mode to Supabase app_settings:', err);
    }
  },

  async persistPartnersToSupabase(partners: AppPartner[]) {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('app_settings').upsert({
        key: 'partner_list',
        value: JSON.stringify(partners),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Non-fatal: Unable to sync partners list to Supabase app_settings:', err);
    }
  },

  async syncFromSupabase(): Promise<{ mode: PartnerHighlightMode; partners: AppPartner[] }> {
    if (!isSupabaseConfigured) {
      return { mode: this.getHighlightMode(), partners: this.getPartners() };
    }
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['partner_highlight_mode', 'partner_list']);

      if (!error && data && data.length > 0) {
        const modeSetting = data.find(row => row.key === 'partner_highlight_mode');
        if (modeSetting && modeSetting.value && ['partner', 'pro', 'both'].includes(modeSetting.value)) {
          localStorage.setItem(STORAGE_KEY_MODE, modeSetting.value);
        }

        const partnersSetting = data.find(row => row.key === 'partner_list');
        if (partnersSetting && partnersSetting.value) {
          try {
            const parsedPartners = JSON.parse(partnersSetting.value);
            if (Array.isArray(parsedPartners) && parsedPartners.length > 0) {
              localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(parsedPartners));
            }
          } catch (_) {}
        }

        this.notifyUpdate();
      }
    } catch (err) {
      console.warn('Non-fatal error syncing partner settings from Supabase:', err);
    }

    return { mode: this.getHighlightMode(), partners: this.getPartners() };
  },

  savePartner(partnerData: Partial<AppPartner>): AppPartner[] {
    const list = this.getPartners();
    let updatedList: AppPartner[] = [];

    if (partnerData.id) {
      const index = list.findIndex(p => p.id === partnerData.id);
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...partnerData,
          updated_at: new Date().toISOString()
        };
        updatedList = [...list];
      } else {
        updatedList = [
          ...list,
          {
            ...DEFAULT_MOCK_PARTNERS[0],
            ...partnerData,
            id: partnerData.id || `partner-${Date.now()}`,
            updated_at: new Date().toISOString()
          }
        ];
      }
    } else {
      const newPartner: AppPartner = {
        ...DEFAULT_MOCK_PARTNERS[0],
        ...partnerData,
        id: `partner-${Date.now()}`,
        is_active: true,
        updated_at: new Date().toISOString()
      };
      updatedList = [...list, newPartner];
    }

    try {
      localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(updatedList));
      this.notifyUpdate();
      this.persistPartnersToSupabase(updatedList);
    } catch (e) {
      console.error('Failed to save partner:', e);
    }
    return updatedList;
  },

  deletePartner(id: string): AppPartner[] {
    const list = this.getPartners().filter(p => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(list));
      this.notifyUpdate();
      this.persistPartnersToSupabase(list);
    } catch (e) {
      console.error('Failed to delete partner:', e);
    }
    return list;
  },

  togglePartnerActive(id: string): AppPartner[] {
    const list = this.getPartners().map(p => {
      if (p.id === id) {
        return { ...p, is_active: !p.is_active, updated_at: new Date().toISOString() };
      }
      return p;
    });
    try {
      localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(list));
      this.notifyUpdate();
      this.persistPartnersToSupabase(list);
    } catch (e) {
      console.error('Failed to toggle partner:', e);
    }
    return list;
  },

  resetToDefaultMocks(): AppPartner[] {
    try {
      localStorage.setItem(STORAGE_KEY_PARTNERS, JSON.stringify(DEFAULT_MOCK_PARTNERS));
      localStorage.setItem(STORAGE_KEY_MODE, 'pro');
      this.notifyUpdate();
      this.persistPartnersToSupabase(DEFAULT_MOCK_PARTNERS);
      this.persistModeToSupabase('pro');
    } catch (e) {
      console.error('Failed to reset partners:', e);
    }
    return DEFAULT_MOCK_PARTNERS;
  },

  notifyUpdate() {
    window.dispatchEvent(new CustomEvent('mycity_partner_highlight_updated', {
      detail: {
        partners: this.getPartners(),
        activePartners: this.getActivePartners(),
        mode: this.getHighlightMode()
      }
    }));
  },

  // Backward compatibility helper
  getPartnerHighlight(): AppPartner {
    const active = this.getActivePartners();
    return active.length > 0 ? active[0] : DEFAULT_MOCK_PARTNERS[0];
  },

  savePartnerHighlight(partner: Partial<AppPartner>): AppPartner {
    this.savePartner(partner);
    if (partner.highlight_mode) {
      this.setHighlightMode(partner.highlight_mode);
    }
    return this.getPartnerHighlight();
  }
};

