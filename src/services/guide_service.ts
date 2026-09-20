import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GuideArticle {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  businessName?: string;
  isOnline?: boolean;
  author?: {
    name: string;
    role?: string;
    businessName?: string;
    avatarUrl?: string;
    website?: string;
    email?: string;
    phone?: string;
  };
}

export interface GuideCategory {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  articles: GuideArticle[];
}

// SQL TO CREATE THE TABLES IN SUPABASE (without read_time):
// 
// drop table if exists guide_articles;
// drop table if exists guide_categories;
// 
// create table guide_categories (
//   id text primary key,
//   title text not null,
//   description text not null,
//   icon_name text not null,
//   color text not null,
//   created_at timestamp with time zone default timezone('utc'::text, now()) not null
// );
// 
// create table guide_articles (
//   id text primary key,
//   category_id text not null references guide_categories(id) on delete cascade,
//   title text not null,
//   excerpt text not null,
//   tag text,
//   content text,
//   image_url text,
//   business_name text,
//   is_online boolean default true,
//   author jsonb,
//   created_at timestamp with time zone default timezone('utc'::text, now()) not null
// );
// 
// -- To add the column to an existing table:
// -- ALTER TABLE guide_articles ADD COLUMN is_online boolean DEFAULT true;
// 
// -- Enable RLS
// alter table guide_categories enable row level security;
// alter table guide_articles enable row level security;
// 
// -- Allow public read access (Only online articles for public)
// create policy "Allow public read access on guide_categories" on guide_categories for select using (true);
// create policy "Allow public read access on guide_articles" on guide_articles for select using (is_online = true);
// 
// -- Allow write access (for administrative seeding/updating)
// create policy "Allow all actions for admin on categories" on guide_categories for all using (true);
// create policy "Allow all actions for admin on articles" on guide_articles for all using (true);

export const MOCK_GUIDE_CATEGORIES_DATA = [
  {
    id: 'housing',
    title: 'Finding a home',
    description: 'Everything you need to know about housing in Valencia.',
    icon_name: 'HomeIcon',
    color: 'bg-orange-500',
    articles: [
      { 
        id: 'h-1', 
        title: 'Where Should You Live in Valencia?', 
        excerpt: 'Explore Valencia\'s top neighborhoods from Ruzafa to El Cabanyal.', 
        content: `🏡 **Finding Your Dream Neighborhood in Valencia!**

Valencia offers an extraordinary quality of life, combining Mediterranean sunshine ☀️, a relaxed pace, rich cultural heritage 🏛️, and bikeable green corridors like the Turia Gardens 🌳.

### ✨ Top Neighborhoods for Expats & Newcomers

- 🥐 **Ruzafa (L'Eixample)**: The creative, bohemian hotspot of Valencia! Filled with vibrant specialty coffee shops ☕, art workshops 🎨, international food markets 🥘, and bustling terraces. Perfect for young professionals and creatives.
- 🏛️ **El Carmen & Ciutat Vella**: Valencia's historic heart with winding cobblestone streets, authentic tapas bars 🍷, historic city gates (Torres de Serranos), and charming plazas.
- 🌊 **El Cabanyal & Malvarrosa**: The historic maritime district right by the beach 🏖️. Famous for its colorful tiled facades, seafood restaurants, and relaxed seaside breeze.
- 🌳 **Benimaclet**: A village-like atmosphere with students, families, independent bookstores 📚, and a very welcoming community vibe.

💡 **Good to know (tips)**:
- 🚇 **Public Transport**: Metro and Valenbisi stations connect every district in 10-15 minutes.
- 📋 **Rental tip**: Always check whether agency fees (honorarios) and community charges (gastos de comunidad) are included in the rental price.`
      },
      { 
        id: 'h-2', 
        title: 'Renting in Valencia Explained', 
        excerpt: 'Contracts, deposits, fianza, and tenant protections in Spain.', 
        content: `🔑 **Everything You Need to Know About Renting in Spain**

Renting an apartment in Valencia is relatively straightforward once you know the legal framework and market customs 📝.

### 📋 Key Steps & Essentials

- 💰 **Deposit (Fianza)**: Legally, long-term rentals require **1 month of legal deposit** (fianza legal) paid to the regional property registry (IVAM/Prop). Landlords may request an additional 1-2 months as an extra guarantee (garantía adicional).
- 📜 **Contract Duration (LAU)**: Under Spanish urban leasing law, primary residence contracts automatically extend up to **5 years** (or 7 if the landlord is a company) at the tenant's option.
- ⚡ **Utilities**: Water (EMIVASA/Aguas de Valencia) and electricity (Iberdrola/Endesa) are usually transferred into your name or billed directly via IBAN.

💡 **Practical Tips**:
- 🔍 Inspect the apartment thoroughly and take photos before signing the inventory list.
- 💶 Prepare a Spanish bank account for easy direct debits (domiciliación bancaria).`
      },
      { 
        id: 'h-3', 
        title: 'Setting Up Your New Home', 
        excerpt: 'High-speed fiber internet, electricity, water, and home utilities.', 
        content: `⚡ **Setting Up Electricity, Water & High-Speed Internet**

Welcome to your new home! Here is how to activate utilities smoothly and quickly 🏠.

### 🌐 High-Speed Fiber Internet
- Providers like Digi, Movistar, Orange, and Vodafone offer fast fiber (up to 1Gbps) starting from **20€-30€/month** 🚀.
- Installation is typically completed within 2 to 5 business days.

### 💡 Electricity & Gas
- Most apartments use electricity for heating, cooling, and cooking. Look for an energy certificate (Certificado de Eficiencia Energética).
- Standard green tariff providers include Iberdrola, Holaluz, and Octopus Energy 🌿.

### 🚰 Water Services
- Valencia's municipal water is managed by **Global Omnium / Aguas de Valencia** 💧.
- Tap water is safe, though many expats prefer carbon block filters for a milder taste.`
      },
    ]
  },
  {
    id: 'paperwork',
    title: 'Getting your paperwork sorted',
    description: 'Visas, registrations and official processes explained.',
    icon_name: 'PaperworkIcon',
    color: 'bg-blue-500',
    articles: [
      { 
        id: 'p-1', 
        title: 'Empadronamiento Explained', 
        excerpt: 'What is it, why you need it, and how to register at the Ayuntamiento.', 
        content: `📑 **What is the Padrón & Why is it Vital?**

The **Empadronamiento** (or simply *Padrón*) is the official municipal population registry at the Town Hall (Ayuntamiento de Valencia) 🏛️.

### 🎯 Why do you need it?
- 🏥 To access the public healthcare system and get your SIP card.
- 🆔 To complete your NIE / TIE card application.
- 🏫 To register children for local public or concertado schools.
- 🗳️ To obtain Spanish resident discounts for local transport and services.

### 📋 What documents to bring?
- 🛂 Valid Passport or EU National ID.
- 🏠 Rental contract (minimum 6 months) or property deed (Escritura).
- ⚡ Recent utility bill (electricity or water) confirming the address.
- 📝 Formulaire d'inscription municipal (Hoja Padronal) signed by all occupants.

💡 **Good to know**: Book your *Cita Previa* online on the Ayuntamiento de Valencia portal early in the morning!`
      },
      { 
        id: 'p-2', 
        title: 'NIE Explained', 
        excerpt: 'Complete guide to understand and obtain your Spanish NIE number.', 
        content: `🆔 **Your Essential Guide to the Spanish NIE**

The **NIE** (*Número de Identificación de Extranjero*) is your unique tax identification number in Spain 🇪🇸.

### 🌟 When do you need an NIE?
- 💼 Working or freelancing (autónomo) in Spain.
- 🏦 Opening a resident bank account.
- 🏠 Buying or renting real estate on a long-term lease.
- 🚗 Buying a car, scooter, or registering a mobile phone plan.

### 📍 How to Apply in Valencia:
1. Book an appointment (*Cita Previa*) for the Police National station (Extranjería).
2. Fill out official form **EX-15** (for non-resident NIE) or **EX-18** (for EU citizen registration).
3. Pay the small administrative fee (**Modelo 790, code 012**) at any bank ATM 💶.
4. Bring your passport and justification of your economic or professional interest.`
      },
    ]
  },
  {
    id: 'transport',
    title: 'Getting around Valencia',
    description: 'Public transport, cycling, driving and more.',
    icon_name: 'TransportIcon',
    color: 'bg-purple-500',
    articles: [
      { 
        id: 't-1', 
        title: 'Getting Around Valencia Made Easy', 
        excerpt: 'Overview of Metrovalencia, EMT buses, and bike lanes.', 
        content: `🚲 **Navigating Valencia: Fast, Flat & Green!**

Valencia is famously flat and bathed in sunlight, making it one of the easiest and most enjoyable cities to navigate in Europe 🌟.

### 🚇 Metrovalencia & Trams
- 10 modern lines connecting the Airport directly to the city center and the beaches 🏖️.
- The **SUMA card** lets you combine Metro, EMT buses, and Renfe Cercanías trains with one single affordable fare!

### 🚌 EMT City Buses
- Modern, air-conditioned buses covering every district with free onboard Wi-Fi.
- Live arrival times can be checked on the EMT Valencia app 📱.

### 🚲 Valenbisi & Cycling Infrastructure
- Over **160+ kilometers of dedicated cycle paths**, including the scenic 9-km route through the lush Turia riverbed park 🌳!`
      },
      { 
        id: 't-2', 
        title: 'How to Use the Metro & Valenbisi', 
        excerpt: 'Subscriptions, cards, and cycling tips.', 
        content: `🚴‍♂️ **Mastering Valenbisi & Metrovalencia Like a Local**

Everything you need to cruise the city on two wheels or catch the tram to the beach 🏖️.

### 🚲 Getting Started with Valenbisi:
- Download the Valenbisi app and choose an annual subscription (approx. **29.21€/year**) 🎟️.
- The first 30 minutes of every bike ride are completely free!
- Stations are located every 250 meters throughout the city center.

### 🚇 The SUMA Card System:
- Purchase a reusable plastic or cardboard SUMA card at any metro station machine.
- 10-trip tickets (SUMA 10) provide multi-modal transfers within 90 minutes across all buses, trams, and metro lines.`
      },
      { 
        id: 't-3', 
        title: 'Driving in Spain Explained', 
        excerpt: 'Rules, parking, ZBE low emission zones, and driving licenses.', 
        content: `🚗 **Driving in Valencia: Regulations, Parking & Tips**

Thinking about having a car or motorbike in Valencia? Here is what you need to know 🚦.

### 🅿️ Parking Colors
- **White lines**: Free parking for everyone!
- **Blue lines (Zona Azul)**: Paid metered parking during business hours (free on Sundays and holidays).
- **Orange lines (Zona Naranja)**: Resident priority parking with lower fees for locals.

### 🌿 Low Emission Zones (ZBE)
- Valencia is implementing Low Emission Zones in the city center. Check your vehicle's DGT environmental badge (Etiqueta Ambiental B, C, ECO, or 0 Emissions) 🏷️.`
      },
    ]
  },
  {
    id: 'healthcare',
    title: 'Accessing healthcare',
    description: 'How the system works and how to get started.',
    icon_name: 'HealthIcon',
    color: 'bg-emerald-500',
    articles: [
      { 
        id: 'hc-1', 
        title: 'Healthcare in Spain Explained', 
        excerpt: 'How the world-renowned Spanish healthcare system works.', 
        content: `🏥 **The Spanish Healthcare System Explained**

Spain consistently ranks among the healthiest countries in the world, with top-tier public hospitals and accessible private clinics 🩺.

### 🌟 Public System (CatSalut / Sanidad Valenciana)
- Funded by social security contributions, offering free doctor consultations, hospital care, and heavily subsidized prescriptions 💊.
- Accessible once you are registered with Social Security or hold an S1 form (for UK/EU pensioners).

### 🩺 Private Health Insurance
- Insurers like Sanitas, Adeslas, DKV, and Asisa provide rapid access to specialists, English-speaking doctors, and private hospital rooms 🏨.
- Essential for Non-Lucrative or Digital Nomad visa holders.`
      },
      { 
        id: 'hc-2', 
        title: 'Public vs Private Healthcare', 
        excerpt: 'Differences, costs, and pros/cons of both systems.', 
        content: `⚖️ **Public vs. Private Healthcare: Which is Right for You?**

Many expats in Valencia choose a hybrid model for maximum peace of mind 🛡️.

- 🏥 **Public Healthcare**: Superb emergency care, comprehensive treatments, and local primary care doctors (Médico de cabecera).
- 🩺 **Private Insurance**: No waiting lists, direct access to dermatologists, ophthalmologists, and physical therapists without needing a GP referral.
- 💶 **Costs**: Comprehensive private insurance with zero copay ranges from **45€ to 85€/month** depending on age.`
      },
      { 
        id: 'hc-3', 
        title: 'Finding a Doctor in Valencia', 
        excerpt: 'How to register at your local Centro de Salud and find English-speaking GPs.', 
        content: `👩‍⚕️ **How to Register at Your Local Centro de Salud**

Your local medical center is your first point of contact for healthcare 📍.

### 📋 Steps to get your SIP Card:
1. Obtain your **Empadronamiento certificate** from the Town Hall.
2. Bring your **Social Security Number** (Affiliation document).
3. Visit the **Centro de Salud** assigned to your residential address.
4. Receive your official **SIP card** (*Sistema de Información Poblacional*) and meet your assigned doctor!`
      },
    ]
  },
  {
    id: 'family',
    title: 'Family',
    description: 'Install with children.',
    icon_name: 'FamilyIcon',
    color: 'bg-pink-500',
    articles: [
      { 
        id: 'f-1', 
        title: 'Family Life in Valencia', 
        excerpt: 'Why Valencia is one of the world\'s most child-friendly cities.', 
        content: `👨‍👩‍👧 **Raising a Family in Sun-Drenched Valencia!**

Valencia is widely celebrated as a paradise for families: clean air, hundreds of parks, family-centric restaurants, and very safe streets 🌳.

- 🏰 **Gulliver Park**: A massive, fantastical play structure in the Turia gardens where kids can slide down Gulliver's giant limbs!
- 🐠 **Oceanogràfic**: The largest aquarium in Europe, featuring belugas, sharks, and penguins.
- 🦁 **Bioparc**: An immersive zoo experience recreating African savannah habitats without cages.`
      },
      { 
        id: 'f-2', 
        title: 'The Best Family Activities in Valencia', 
        excerpt: 'Parks, beaches, science museums, and weekend playgrounds.', 
        content: `🏖️ **Top Weekend Adventures with Kids**

- 🧪 **Ciutat de les Arts i les Ciències**: Interactive science museum with hands-on experiments for all ages.
- ⛵ **Albufera Natural Park**: Traditional boat rides through freshwater lagoons, followed by an authentic paella lunch in El Palmar 🥘.
- 🚴 **Turia Gardens**: 9km of traffic-free green space with playgrounds, shaded picnic spots, and skate parks.`
      },
      { 
        id: 'f-3', 
        title: 'Building Your Community', 
        excerpt: 'International parent groups, playdates, and bilingual meetups.', 
        content: `🤝 **Connecting with Other Families in Valencia**

Moving with children is an incredible adventure. Here is how to build your support network quickly:

- 📱 **Valencia Parents & Expats WhatsApp and Facebook Groups**: Great for organizing weekend park meetups and sharing local pediatrician tips.
- 🎨 **Family Workshops**: Cultural centers like Bombas Gens and CaixaForum host bilingual family art workshops on Saturday mornings!`
      },
    ]
  },
  {
    id: 'schools',
    title: 'Schools',
    description: 'Education systems.',
    icon_name: 'SchoolsIcon',
    color: 'bg-yellow-500',
    articles: [
      { 
        id: 's-1', 
        title: 'Choosing a School in Valencia', 
        excerpt: 'Public, Concertado, Private, and International curricula explained.', 
        content: `🎒 **Education Options in Valencia: An In-Depth Guide**

Valencia provides a diverse array of schooling options for international and local students alike 📚.

### 🏫 The Three School Types in Spain:
1. **Colegios Públicos (State Schools)**: 100% state-funded, teaching in Spanish and Valenciano.
2. **Colegios Concertados (Semi-Private)**: Subsidized private schools with minimal monthly contributions.
3. **Colegios Internacionales / Privados**: Following British, American, or International Baccalaureate (IB) curricula in English 🇬🇧.`
      },
      { 
        id: 's-2', 
        title: 'Public, Private or International', 
        excerpt: 'Comparison of languages, schedules, and tuition costs.', 
        content: `🌟 **Public vs. International Schools**

- 💬 **Language Immersion**: Public schools are the fastest way for younger children to become fluently trilingual (Spanish, Valenciano, and English).
- 🎓 **International Schools**: Ideal for high schoolers needing British GCSE/A-Levels or IB diplomas for university entry abroad.
- 💶 **Fees**: International schools typically range from **500€ to 1,200€/month** including lunch and activities.`
      },
      { 
        id: 's-3', 
        title: 'School Admissions Explained', 
        excerpt: 'Admissions calendar, scoring criteria, and paperwork.', 
        content: `📋 **The School Admissions Process in Valencia**

- 📅 **Application Window**: The official enrollment period (*Admisión Escolar*) usually opens in May for the following September school year.
- 🎯 **Points System**: Points are awarded based on proximity to your residential address (Empadronamiento), siblings in the school, and family circumstances.`
      },
    ]
  },
  {
    id: 'banking',
    title: 'Banking',
    description: 'Money and accounts.',
    icon_name: 'BankingIcon',
    color: 'bg-yellow-500',
    articles: [
      { 
        id: 'b-1', 
        title: 'Opening a Spanish Bank Account', 
        excerpt: 'Documents required for resident and non-resident accounts.', 
        content: `🏦 **Opening a Bank Account in Spain: Easy & Quick!**

A local Spanish IBAN (starting with ES...) makes life much simpler for paying rent, utilities, and gym memberships 💳.

### 📱 Modern & Digital Options:
- **Neobanks**: N26, Revolut, and Bunq provide Spanish IBANs with instant online verification in 5 minutes ⚡.
- **Traditional Banks**: Santander, BBVA, and CaixaBank offer full local branch services and mortgage facilities.`
      },
      { 
        id: 'b-2', 
        title: 'Understanding Spanish Banking', 
        excerpt: 'IBAN, Bizum, ATM fees, and direct debits.', 
        content: `📲 **What is Bizum & Why Everyone in Spain Uses It!**

- 💸 **Bizum**: The instant peer-to-peer payment system integrated into all Spanish bank apps. Pay friends, split restaurant bills, or buy groceries with just a phone number!
- 🏧 **ATM Withdrawals**: Use your bank's own network (e.g. Euro6000, Servired, CaixaBank) to avoid withdrawal commissions.`
      },
      { 
        id: 'b-3', 
        title: 'Managing Your Money in Spain', 
        excerpt: 'Currency transfers, tax considerations, and cost of living.', 
        content: `💶 **Smart Financial Management for Expats**

- 💱 **Foreign Exchange**: Use Wise or OFX for converting USD, GBP, or CAD into Euros with mid-market exchange rates.
- 🧾 **Beckham Law**: Special tax regime allowing qualifying foreign workers and digital nomads to pay a flat 24% tax rate on Spanish-sourced income.`
      },
    ]
  },
  {
    id: 'pets',
    title: 'Pets',
    description: 'Moving with pets.',
    icon_name: 'PetsIcon',
    color: 'bg-red-500',
    articles: [
      { 
        id: 'pt-1', 
        title: 'Moving to Spain with a Pet', 
        excerpt: 'Microchips, pet passports, rabies vaccinations, and flights.', 
        content: `🐾 **Bringing Your Furry Friends to Valencia!**

Spain is a deeply pet-loving country, and Valencia has numerous dog parks and pet-friendly cafes 🐶.

### 📋 Essential Entry Requirements:
- 💉 **Microchip**: ISO 11784/11785 compliant transponder.
- 🩺 **Rabies Vaccine**: Administered at least 21 days before travel.
- 🛂 **European Pet Passport** (or animal health certificate if arriving from outside the EU).`
      },
      { 
        id: 'pt-2', 
        title: 'Dog-Friendly Valencia', 
        excerpt: 'Parks, dog beaches, metro rules, and canine etiquette.', 
        content: `🐕 **Dog-Friendly Spots Across the City**

- 🏖️ **Platja de Pinedo**: Valencia's official dog beach where pups can splash in the Mediterranean waves during summer!
- 🌳 **Turia Riverbed Park**: Thousands of trees, wide lawns, and dedicated fenced dog agility zones (pipicanes).
- 🚇 **Metro Rules**: Small dogs in carriers are welcome on Metrovalencia and EMT buses.`
      },
      { 
        id: 'pt-3', 
        title: 'Finding a Vet You Can Trust', 
        excerpt: 'Veterinary clinics, emergency hospitals, and pet insurance.', 
        content: `🏥 **Veterinary Care & Health Tips in Valencia**

- 🦟 **Leishmaniasis Prevention**: Protect your dog with scalibor collars or monthly spot-on treatments against sandflies.
- 🚨 **24/7 Emergency Clinics**: Excellent animal hospitals like Hospital Veterinario Valencia Sur and IVC Evidensia provide round-the-clock emergency care.`
      },
    ]
  }
];


export const TOPIC_ORDER = ['housing', 'paperwork', 'transport', 'healthcare', 'family', 'schools', 'banking', 'pets'];

export function sortCategories(categories: any[]): any[] {
  if (!categories) return [];
  return [...categories].sort((a, b) => {
    const indexA = TOPIC_ORDER.indexOf(a.id);
    const indexB = TOPIC_ORDER.indexOf(b.id);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return (a.title || '').localeCompare(b.title || '');
  });
}

export const guideService = {
  getLocalGuides(): GuideCategory[] {
    const cached = localStorage.getItem('local_guide_categories');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // If cached guides still contain legacy placeholder dots '...', refresh with rich articles
        const hasDummyDots = Array.isArray(parsed) && parsed.some((c: any) => c.articles?.some((a: any) => !a.content || a.content === '...'));
        if (hasDummyDots) {
          localStorage.setItem('local_guide_categories', JSON.stringify(MOCK_GUIDE_CATEGORIES_DATA));
          return sortCategories(MOCK_GUIDE_CATEGORIES_DATA);
        }
        return sortCategories(parsed);
      } catch (e) {
        console.error("Failed to parse cached guides", e);
      }
    }
    localStorage.setItem('local_guide_categories', JSON.stringify(MOCK_GUIDE_CATEGORIES_DATA));
    return sortCategories(MOCK_GUIDE_CATEGORIES_DATA);
  },

  saveLocalGuides(guides: GuideCategory[]) {
    localStorage.setItem('local_guide_categories', JSON.stringify(guides));
  },

  async getGuideCategories(): Promise<GuideCategory[]> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, returning local cached/mock guide categories');
      return this.getLocalGuides();
    }

    try {
        let dbCategories: any[] | null = null;
        let catError: any = null;
        let usingTopics = true;

        // Try to fetch from guide_topics first
        let tryCats = await supabase
          .from('guide_topics')
          .select('id, title, description, icon_name, color');

        if (tryCats.error) {
          // If guide_topics doesn't exist, fallback to guide_categories
          console.warn('guide_topics table not found, falling back to guide_categories:', tryCats.error);
          usingTopics = false;
          const fallbackCats = await supabase
            .from('guide_categories')
            .select('id, title, description, icon_name, color');
          dbCategories = fallbackCats.data;
          catError = fallbackCats.error;
        } else {
          dbCategories = tryCats.data;
        }

        if (catError) {
          console.error('Error fetching guide categories/topics from Supabase:', catError);
          throw new Error('Could not fetch guide categories/topics from Supabase');
        }

        // If the table exists but is empty, let's proactively auto-seed it and articles!
        if (!dbCategories || dbCategories.length === 0) {
          console.info('guide_categories/topics table is empty. Proactively performing auto-seeding...');
          await this.seedGuideCategories(usingTopics);
          return this.getLocalGuides(); // Fallback to mock for now
        }

        // Now fetch guide_articles with resilient column fallbacks
        let dbArticles: any[] | null = null;
        let artError: any = null;
        const idCol = usingTopics ? 'topic_id' : 'category_id';
        
        const attempts = [
          `id, ${idCol}, title, excerpt, content, image_url, business_name, is_online, author, is_highlighted`,
          `id, ${idCol}, title, excerpt, content, image_url, business_name, is_online, author`,
          `id, ${idCol}, title, excerpt, content, image_url, business_name, author, is_highlighted`,
          `id, ${idCol}, title, excerpt, content, image_url, business_name, author`,
          `id, ${idCol}, title, excerpt`
        ];

        for (const query of attempts) {
          const tryFetch = await supabase
            .from('guide_articles')
            .select(query);
          
          if (!tryFetch.error && tryFetch.data) {
            dbArticles = tryFetch.data;
            artError = null;
            break; // Succeeded!
          } else {
            artError = tryFetch.error;
          }
        }

        if (artError) {
          console.error('Error fetching guide_articles from Supabase after all resilient attempts:', artError);
          throw new Error('Could not fetch guide articles from Supabase');
        }

      // If articles table exists but is empty, seed articles and return mock data for safety
      if (!dbArticles || dbArticles.length === 0) {
        console.info('guide_articles table is empty. Proactively performing auto-seeding for articles...');
        await this.seedGuideArticles(usingTopics);
        return this.getLocalGuides();
      }

      // Map snake_case columns back to the client-side camelCase format safely
      const mappedArticles = dbArticles.map((art: any) => ({
        id: art.id,
        category_id: usingTopics ? art.topic_id : art.category_id,
        title: art.title,
        excerpt: art.excerpt,
        content: art.content,
        imageUrl: art.image_url,
        businessName: art.business_name,
        isOnline: 'is_online' in art ? art.is_online !== false : true,
        author: art.author, // stored as jsonb
        is_highlighted: 'is_highlighted' in art ? (art.is_highlighted === true || art.is_highlighted === 'true' || art.is_highlighted === 1) : false
      }));

      // Combine database categories with matching database articles
      const enrichedCategories: GuideCategory[] = dbCategories.map((dbCat: any) => {
        const catArticles = mappedArticles.filter((art: any) => art.category_id === dbCat.id);
        return {
          id: dbCat.id,
          title: dbCat.title,
          description: dbCat.description,
          icon_name: dbCat.icon_name,
          color: dbCat.color,
          articles: catArticles
        };
      });

      return sortCategories(enrichedCategories);
    } catch (err) {
      console.error('Failed to get guides and categories from Supabase:', err);
      return this.getLocalGuides();
    }
  },

  async createArticle(art: GuideArticle, categoryId: string): Promise<void> {
    // 1. Update in local storage
    const guides = this.getLocalGuides();
    const targetCat = guides.find(c => c.id === categoryId);
    if (targetCat) {
      if (!targetCat.articles) targetCat.articles = [];
      targetCat.articles.push(art);
      this.saveLocalGuides(guides);
    }

    // 2. Insert into Supabase if configured
    if (isSupabaseConfigured) {
      let useTopicId = true;
      const { error: checkError } = await supabase.from('guide_topics').select('id').limit(1);
      if (checkError) {
        useTopicId = false;
      }

      const insertData: any = {
        id: art.id,
        title: art.title,
        excerpt: art.excerpt,
        content: art.content || null,
        image_url: art.imageUrl || null,
        business_name: art.businessName || null,
        is_online: art.isOnline !== undefined ? art.isOnline : true,
        author: art.author || null
      };

      if (useTopicId) {
        insertData.topic_id = categoryId;
      } else {
        insertData.category_id = categoryId;
      }

      const { error } = await supabase
        .from('guide_articles')
        .insert(insertData);
      if (error) {
        console.error('Failed to create article in Supabase:', error);
        throw error;
      }
    }
  },

  async updateArticle(art: GuideArticle, categoryId: string): Promise<void> {
    // 1. Update in local storage
    const guides = this.getLocalGuides();
    
    // Remove if exists anywhere
    for (const cat of guides) {
      const idx = cat.articles.findIndex(a => a.id === art.id);
      if (idx !== -1) {
        cat.articles.splice(idx, 1);
        break;
      }
    }

    // Insert into specified category
    const targetCat = guides.find(c => c.id === categoryId);
    if (targetCat) {
      targetCat.articles.push(art);
    } else {
      guides[0].articles.push(art);
    }
    this.saveLocalGuides(guides);

    // 2. Update in Supabase if configured
    if (isSupabaseConfigured) {
      let useTopicId = true;
      const { error: checkError } = await supabase.from('guide_topics').select('id').limit(1);
      if (checkError) {
        useTopicId = false;
      }

      const updateData: any = {
        title: art.title,
        excerpt: art.excerpt,
        content: art.content || null,
        image_url: art.imageUrl || null,
        business_name: art.businessName || null,
        is_online: art.isOnline !== undefined ? art.isOnline : true,
        author: art.author || null
      };

      if (useTopicId) {
        updateData.topic_id = categoryId;
      } else {
        updateData.category_id = categoryId;
      }

      const { error } = await supabase
        .from('guide_articles')
        .update(updateData)
        .eq('id', art.id);
      if (error) {
        console.error('Failed to update article in Supabase:', error);
        throw error;
      }
    }
  },

  async deleteArticle(artId: string): Promise<void> {
    // 1. Delete from local storage
    const guides = this.getLocalGuides();
    for (const cat of guides) {
      const idx = cat.articles.findIndex(a => a.id === artId);
      if (idx !== -1) {
        cat.articles.splice(idx, 1);
        break;
      }
    }
    this.saveLocalGuides(guides);

    // 2. Delete from Supabase if configured
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('guide_articles')
        .delete()
        .eq('id', artId);
      if (error) {
        console.error('Failed to delete article in Supabase:', error);
        throw error;
      }
    }
  },

  async seedGuideCategories(useTopics = true): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const pureCategories = MOCK_GUIDE_CATEGORIES_DATA.map(({ id, title, description, icon_name, color }) => ({
        id,
        title,
        description,
        icon_name,
        color
      }));

      const tableName = useTopics ? 'guide_topics' : 'guide_categories';
      const { error } = await supabase
        .from(tableName)
        .upsert(pureCategories);

      if (error) {
        console.warn(`Could not auto-seed ${tableName} (table may need creation or correct RLS policy):`, error);
      } else {
        console.info(`Successfully auto-seeded ${tableName} into Supabase!`);
        await this.seedGuideArticles(useTopics);
      }
    } catch (err) {
      console.error('Error seeding guide categories:', err);
    }
  },

  async seedGuideArticles(useTopics = true): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const articlesToInsert: any[] = [];
      MOCK_GUIDE_CATEGORIES_DATA.forEach(cat => {
        cat.articles.forEach((art: any) => {
          const insertData: any = {
            id: art.id,
            title: art.title,
            excerpt: art.excerpt,
            content: art.content || null,
            image_url: art.imageUrl || null,
            business_name: art.business_name || null,
            is_online: true,
            author: art.author || null
          };

          if (useTopics) {
            insertData.topic_id = cat.id;
          } else {
            insertData.category_id = cat.id;
          }

          articlesToInsert.push(insertData);
        });
      });

      const { error } = await supabase
        .from('guide_articles')
        .upsert(articlesToInsert);

      if (error) {
        console.warn('Could not auto-seed guide articles (table may need creation or correct RLS policy):', error);
      } else {
        console.info('Successfully auto-seeded guide articles into Supabase!');
      }
    } catch (err) {
      console.error('Error seeding guide articles:', err);
    }
  }
};
