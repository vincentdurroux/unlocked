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
        excerpt: 'A comprehensive overview of the best neighborhoods in Valencia tailored to your lifestyle, budget, and priorities.', 
        content: `Finding the right neighborhood in Valencia is the most important step for a successful relocation. The city offers a rich variety of atmospheres, from historic cobblestone alleys to vibrant seaside districts and peaceful residential areas.

## 1. Ruzafa & Ensanche: Vibrant Urban Lifestyle
Ruzafa is Valencia's bohemian and trendy epicenter, celebrated for its specialty coffee shops, lively sunny terraces, art galleries, and independent boutiques. L'Eixample (Ensanche) offers wide, elegant avenues lined with stately modernist architecture.
- Ideal for: Young professionals, creatives, remote workers, and expats who love vibrant city living.
- Highlights: Bustling dining scene, local food markets, walking distance to the city center.
- 💡 Expert Tip: Apartments directly facing pedestrian restaurant streets can be noisy on weekends; look for double-glazed windows or interior-facing bedrooms.

## 2. El Carmen & Ciutat Vella: Historic Charm & Atmosphere
The medieval heart of Valencia enchants with picturesque labyrinthine streets, shaded squares, and iconic historic landmarks.
- Ideal for: History enthusiasts and those who want to live inside the ancient city walls.
- Highlights: Authentic architecture, museums, vibrant street art, unmatched historic ambiance.
- ⚠️ Important Notice: Vehicle access is strictly restricted (residential permits only) and street parking is practically nonexistent. Bicycles or walking are essential.

## 3. Benimaclet & Algirós: Village Vibes & University Hub
Benimaclet preserves an authentic village soul with low-rise houses and an active community life. Algirós and Blasco Ibáñez form the vibrant student and young international hub.
- Ideal for: Families, students, and digital nomads looking for moderate rental prices and great connectivity.
- Highlights: Affordable rents, numerous direct metro and tram connections to both the beach and downtown.

## 4. El Cabanyal & Malvarrosa: Coastal Living by the Mediterranean
The historic fishermen's quarter of El Cabanyal is experiencing an exciting cultural revival while preserving its colorful tiled facades and laid-back Mediterranean identity.
- Ideal for: Anyone dreaming of living steps away from the beach.
- Highlights: The beach is only a 5-minute walk, extensive bike lanes, fresh seafood taverns.
- 📍 Location: Don't miss the Mercado del Cabanyal for top-quality fresh local fish and produce.`,
        author: {
          name: 'Vincent Durroux',
          role: 'Founder & Relocation Specialist',
          businessName: 'MyCityUnlocked',
          email: 'vincent@unlockedvalencia.com',
          phone: '+34 600 000 000',
          website: 'https://unlockedvalencia.com'
        }
      },
      { 
        id: 'h-2', 
        title: 'Renting in Valencia Explained', 
        excerpt: 'Everything you need to know about Spanish rental contracts, security deposits, required paperwork, and tenant rights.', 
        content: `The rental market in Valencia is dynamic and governed by clear legal frameworks under the Spanish Urban Leases Act (LAU - Ley de Arrendamientos Urbanos).

## 1. Understanding Long-Term Leases (LAU)
In Spain, a standard residential lease (vivienda habitual) grants tenants legal protection for a minimum duration of 5 years (or 7 years if the landlord is a corporation).
- Tenants are legally entitled to terminate the contract after 6 months with a 30-day written notice.
- Annual rent increases are strictly regulated and capped by official economic indices (IPC / IGC).

## 2. Essential Documents for Your Application
To present a competitive dossier to landlords:
- Valid Passport or NIE (Foreigner Identification Number).
- Spanish employment contract and recent payslips (nóminas), or proof of steady remote/freelance income and bank statements.
- 💡 Expert Tip: Include a friendly introduction letter in Spanish explaining who you are and why you love the property.

## 3. Security Deposits & Agency Fees (Fianza)
- Legal Security Deposit: 1 month of rent deposited officially with the regional administrative authority (PROVIVIENDA / PROP).
- Additional Guarantees: Landlords may request up to a maximum of 2 additional months as complementary security.
- ⚠️ Important Notice: Under the Spanish Housing Law (Ley de Vivienda), agency commission fees for standard long-term residential leases are strictly paid by the landlord, never by the tenant!`,
        author: {
          name: 'Vincent Durroux',
          role: 'Relocation Expert',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 'h-3', 
        title: 'Setting Up Your New Home', 
        excerpt: 'Utility contracts, electricity, water, high-speed fiber internet, and settling into your new home hassle-free.', 
        content: `Once you receive your keys, setting up utilities and internet is the immediate priority to make your home comfortable.

## 1. Electricity & Gas (Luz y Gas)
Major national providers include Iberdrola, Endesa, Naturgy, and TotalEnergies.
- You will need the CUPS code (Universal Supply Point Code—a 20-22 character alphanumeric identifier found on prior bills).
- Verify the contracted power limit (potencia contratada in kW) to ensure appliances don't trip the circuit breaker.

## 2. Tap Water Supply (Aguas de Valencia / Global Omnium)
In Valencia, municipal water is managed by EMIVASA / Global Omnium.
- Account holder changes can be processed online or at municipal customer service offices using your lease agreement and Spanish IBAN.

## 3. Fiber Optic Internet & Mobile Plans
Valencia enjoys one of Europe's best fiber-to-the-home (FTTH) networks with speeds up to 1 Gbps.
- Recommended low-cost and reliable providers: Digi, O2, Vodafone, Orange, Movistar.
- 💡 Expert Tip: Digi and O2 offer exceptional fiber speeds with no lock-in contracts (sin permanencia) and transparent pricing.`,
        author: {
          name: 'Vincent Durroux',
          role: 'Relocation Specialist',
          businessName: 'MyCityUnlocked'
        }
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
        excerpt: 'The complete step-by-step guide to registering on Valencia\'s municipal census (Padrón).', 
        content: `The Empadronamiento (or Padrón) is the official municipal registration certifying your residential address in Valencia. It is the single most essential foundation for almost every subsequent administrative procedure in Spain.

## 1. Why Is the Padrón Essential?
You will need this certificate to:
- Obtain your EU Citizen Registration Certificate (Certificado UE / Green NIE).
- Register your children in local public or subsidized schools.
- Obtain your public healthcare card (SIP) at your local health center.
- Register or import a vehicle in Spain.

## 2. Documents Required for Your Appointment
- Valid Passport or National ID card (original + photocopy).
- Rental contract with a minimum duration of 6 months, or property deed (Escritura).
- Recent utility bill (electricity or water) in your name.
- Completed official municipal application form (solicitud de empadronamiento).

## 3. Booking Your Appointment at City Hall (Cita Previa)
- Visit the official Valencia City Hall portal (valencia.es).
- Navigate to "Padrón de Habitantes" and select "Alta en el Padrón".
- 💡 Expert Tip: New appointment slots are typically released early morning around 8:30 AM. If central offices are fully booked, check neighborhood district offices (Juntas Municipales), which frequently have faster availability.`,
        author: {
          name: 'Unlocked Team',
          role: 'Administrative Assistance',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 'p-2', 
        title: 'NIE Explained', 
        excerpt: 'Understand the difference between the White NIE, EU Registration Certificate (Green NIE), and how to obtain them.', 
        content: `The NIE (Número de Identidad de Extranjero) is the unique fiscal identification number assigned to all foreigners in Spain.

## 1. White NIE vs. Green NIE: What Is the Difference?
- **White NIE (Asignación de NIE)**: A temporary A4 paper certificate. It provides a tax number for buying property or opening bank accounts, but does not grant permanent residency rights.
- **Green NIE (Certificado de Registro de Ciudadano de la UE)**: A small green credit-card-sized paper certificate for EU/EEA citizens residing in Spain for more than 3 months.

## 2. Requirements for the Green NIE (EU Citizens)
You must demonstrate at least one of the following qualifications:
- An active Spanish employment contract or registration as a self-employed worker (autónomo).
- Enrollment in an accredited educational institution with comprehensive private healthcare coverage.
- Sufficient financial funds (approx. €6,000 to €7,000 per person in a bank account) plus a comprehensive private health insurance policy with zero copay (sin copago).

## 3. Step-by-Step Procedure
- 1. Pay the official government fee (Modelo 790 Code 012).
- 2. Book an in-person appointment (Cita previa) with the National Police / Extranjería office.
- 3. Bring all original documents plus duplicate photocopies (Passport, Padrón, financial proof, health insurance).
- 💡 Expert Tip: Arrive 15 minutes early with all documents organized in an orderly folder with double copies of everything to ensure smooth processing.`,
        author: {
          name: 'Unlocked Team',
          role: 'Administrative Assistance',
          businessName: 'MyCityUnlocked'
        }
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
        excerpt: 'Discover how to effortlessly navigate Valencia via metro, EMT buses, bike lanes, and walking.', 
        content: `Valencia is widely recognized as one of Europe's most accessible and pleasant cities for daily commuting: completely flat, compact, and featuring over 160 km of dedicated protected cycle lanes.

## 1. The Cycling Network & Valenbisi
Cycling and electric scooters rule Valencia, highlighted by the continuous green highway of the Turia Riverbed park (Jardín del Turia).
- The annual Valenbisi public bike-share subscription costs under €30/year for unlimited rides under 30 minutes.
- Hundreds of automated docking stations are distributed across every district.

## 2. Metro & Tramway (Metrovalencia)
The network comprises 10 lines connecting the city center, beaches, universities, and Valencia International Airport (Manises).
- Lines 3 and 5 connect central stations (Xàtiva, Colón) directly to the airport terminals in just 20 minutes.

## 3. Urban Buses (EMT Valencia)
The bright red EMT buses cover the entire metropolitan area with high frequencies and late-night services (CorNit).
- SUMA Card: A single unified rechargeable card combining metro, trams, EMT buses, and regional commuter trains (Renfe Cercanías)!
- 💡 Expert Tip: Download the official EMT Valencia app for real-time bus arrival tracking and route planning.`,
        author: {
          name: 'Vincent Durroux',
          role: 'Mobility & Transport Guide',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 't-2', 
        title: 'How to Use the Metro & Valenbisi', 
        excerpt: 'Practical guide to transport passes, discount fares, and smart transit tips.', 
        content: `Maximize your daily travel budget with integrated transit cards and regional discounts.

## 1. The SUMA 10 Card
The most economical option for frequent journeys: 10 trips valid across the entire Zone A (Valencia central metropolitan area) with free transfers between metro, bus, and tram within 90 minutes.

## 2. Youth & Student Discounts
The regional government (Generalitat Valenciana) regularly provides substantial fare reductions, including free travel for youths under 31 years old (Abono Jove Temporal).
- Apply for your personalized card online through the Metrovalencia web portal.

## 3. Rules of the Road for E-Scooters & Bikes
- Helmets are strongly recommended and speed is limited to 20-25 km/h on cycle lanes.
- ⚠️ Important Notice: Riding scooters or bicycles on pedestrian sidewalks is strictly forbidden by municipal law and subject to fines. Always use designated cycle paths or 30 km/h traffic streets.`,
        author: {
          name: 'Vincent Durroux',
          role: 'Mobility & Transport Guide',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 't-3', 
        title: 'Driving in Spain Explained', 
        excerpt: 'Driver\'s license validity, Low Emission Zones (ZBE), and smart parking rules.', 
        content: `What you need to know if you bring your car or rent a vehicle in Spain.

## 1. Driver's License Validity
- EU/EEA driver's licenses are valid indefinitely, though you should register your license with the DGT (Dirección General de Tráfico) if residing for over 2 years.
- Non-EU license holders must exchange (Canje) their license within their first 6 months of residency if an international treaty exists.

## 2. Parking in Valencia (ORA)
- **Blue Zone (Zona Azul)**: Paid short-term parking (1-2 hours max). Free during siesta hours (2:00 PM - 4:00 PM) and overnight.
- **Green / Orange Zone (Zona Verde / Naranja)**: Priority residential parking.
- 💡 Expert Tip: Use mobile parking apps like Telpark or ElParking to extend your parking time directly from your smartphone without visiting a physical meter.`,
        author: {
          name: 'Vincent Durroux',
          role: 'Mobility & Transport Guide',
          businessName: 'MyCityUnlocked'
        }
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
        excerpt: 'How the Spanish public healthcare system works and how to obtain your SIP health card.', 
        content: `Spain is renowned for having one of the highest-rated universal public healthcare systems in the world, with outstanding medical practitioners and state-of-the-art hospital infrastructure.

## 1. The SIP Card (Sistema de Información Poblacional)
The SIP card is your official regional public health insurance card in the Valencian Community.
- It grants 100% free consultations with your assigned family doctor (Médico de cabecera) and emergency hospital treatment.
- It provides heavily subsidized prescription medications at local pharmacies.

## 2. Registering at Your Local Health Center (Centro de Salud)
To obtain your SIP card:
- 1. Visit the Centro de Salud assigned to your neighborhood (determined by your Padrón address).
- 2. Present your Passport/NIE, Certificate of Empadronamiento, and Social Security affiliation document (or S1 form for retirees).
- 3. A designated general practitioner and pediatrician will be immediately assigned to your household.`,
        author: {
          name: 'Dr. Émilie Laurent',
          role: 'Healthcare Consultant',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 'hc-2', 
        title: 'Public vs Private Healthcare', 
        excerpt: 'Comprehensive comparison between public healthcare and private medical insurance in Spain.', 
        content: `Many expats choose to combine public healthcare coverage with private medical insurance (Seguro privado) for added flexibility and rapid access.

## 1. Key Benefits of Private Health Insurance
- Direct access to specialists (dermatologists, gynecologists, cardiologists, ophthalmologists) without general practitioner referrals.
- Very short appointment waiting times (often within 24 to 72 hours).
- Multilingual consultations in English or French at premier private hospitals in Valencia (e.g., Hospital Quirónsalud, Hospital 9 d'Octubre, Hospital Casa de Salud).

## 2. Leading Private Insurance Providers in Spain
- Sanitas (Bupa Group)
- Adeslas (CaixaBank)
- DKV Seguros
- Asisa
- 💡 Expert Tip: If you are applying for a Non-Lucrative Visa or an EU Green NIE without a local employment contract, you must select a policy with zero copays ("Sin Copago") to meet residency approval standards.`,
        author: {
          name: 'Dr. Émilie Laurent',
          role: 'Healthcare Consultant',
          businessName: 'MyCityUnlocked'
        }
      },
      { 
        id: 'hc-3', 
        title: 'Finding a Doctor in Valencia', 
        excerpt: 'How to find reliable English-speaking general practitioners, dentists, and pediatricians.', 
        content: `Connecting with trusted healthcare professionals who speak your language in Valencia.

## 1. Multilingual Directories & Consultations
Many physicians, dentists, and clinics in Valencia provide consultations in English and French.
- Explore the "Verified Professionals" section in the MyCityUnlocked app to view community-recommended medical practitioners.
- Doctoralia.es allows you to filter specialist doctors by spoken language, read patient reviews, and book instant appointments online.

## 2. Emergency Medical Services
- Single European Emergency Number: **112** (multilingual operators available 24/7).
- Public Hospital Emergency Rooms (**Urgencias**): Available around the clock at your assigned health center's emergency desk (PAC) or major university hospitals (Hospital Universitari i Politècnic La Fe, Hospital Clínico).`,
        author: {
          name: 'Dr. Émilie Laurent',
          role: 'Healthcare Consultant',
          businessName: 'MyCityUnlocked'
        }
      },
    ]
  },
  {
    id: 'family',
    title: 'Family',
    description: 'Relocating and living in Valencia with children.',
    icon_name: 'FamilyIcon',
    color: 'bg-pink-500',
    articles: [
      { id: 'f-1', title: 'Family Life in Valencia', excerpt: 'Why Valencia is one of the most welcoming cities for families with children.', content: `## 1. An Exceptionally Child-Friendly Culture\nIn Spain, children are genuinely embraced everywhere: restaurants, open terraces, plazas, and parks. The city is remarkably safe, walkable, and welcoming.\n\n## 2. Parks & Outdoor Green Spaces\nThe lush 9-kilometer Turia Riverbed park features countless playgrounds, cycling paths, and the legendary Gulliver Giant climbing structure.\n\n💡 Expert Tip: Sunday mornings in the Turia park are ideal for family bike rides and picnics.` },
      { id: 'f-2', title: 'The Best Family Activities in Valencia', excerpt: 'Parks, beaches, science museums, and weekend outings.', content: `## 1. City of Arts and Sciences\nThe interactive Science Museum and the world-class Oceanogràfic aquarium offer unforgettable family experiences.\n\n## 2. Bioparc Valencia\nOne of Europe's top immersive zoological parks situated in the scenic Parque de Cabecera.\n\n📍 Location: Parque de Cabecera, easily accessible by metro or bike.` },
      { id: 'f-3', title: 'Building Your Community', excerpt: 'Connecting with other international families and settling in locally.', content: `## 1. Parent Groups & Expat Communities\nJoin local WhatsApp and meetup groups in Valencia to organize playdates and share neighborhood advice.\n\n## 2. Extracurricular Activities (Extraescolares)\nSports, music, and after-school clubs are the fastest and most natural way for children to make friends and pick up Spanish and Valencian.` },
    ]
  },
  {
    id: 'schools',
    title: 'Schools',
    description: 'Schooling systems and education in Valencia.',
    icon_name: 'SchoolsIcon',
    color: 'bg-yellow-500',
    articles: [
      { id: 's-1', title: 'Choosing a School in Valencia', excerpt: 'Public, concertado, private, and international school options.', content: `## 1. Understanding the School Systems\n- Public Schools: 100% state-funded, bilingual Spanish/Valencian curriculum.\n- Concertados: Semi-private, state-subsidized schools with balanced fees.\n- Private & International: British schools, French Lycée, American and IB curriculum schools.\n\n## 2. School Admissions Timeline (Admisión Escolar)\nThe official public application period typically takes place in May for the September school term.` },
      { id: 's-2', title: 'Public, Private or International', excerpt: 'In-depth comparison of academic programs and fee structures.', content: `## 1. International & Bilingual Schools\nCambridge and International Baccalaureate (IB) programs offer global continuity for relocating families.\n\n## 2. French & European Curriculum\nThe Lycée Français de Valence in Paterna offers full French national curriculum accreditation with school bus lines across the city.` },
      { id: 's-3', title: 'School Admissions Explained', excerpt: 'Point scoring system, required documents, and enrollment process.', content: `## 1. The Public Points Scoring System\nPriority points are determined by home proximity (Padrón), siblings already enrolled, and family income brackets.\n\n💡 Expert Tip: Attend school open days (Jornadas de Puertas Abiertas) in February and March to visit campuses and meet teachers.` },
    ]
  },
  {
    id: 'banking',
    title: 'Banking',
    description: 'Opening accounts, transfers, and managing finances in Spain.',
    icon_name: 'BankingIcon',
    color: 'bg-yellow-500',
    articles: [
      { id: 'b-1', title: 'Opening a Spanish Bank Account', excerpt: 'Required documents and comparing traditional vs online banks.', content: `## 1. Traditional Banks vs. Neobanks\n- Traditional High-Street Banks: CaixaBank, BBVA, Santander, Sabadell.\n- Online Banks / Neobanks: N26 (with Spanish ES IBAN), Openbank, Revolut.\n\n## 2. Standard Required Documents\n- Valid Passport or NIE.\n- Proof of residential address in Spain.\n- Proof of income or employment activity.\n\n💡 Expert Tip: N26 allows you to open a full Spanish IBAN account within minutes from your smartphone using your passport.` },
      { id: 'b-2', title: 'Understanding Spanish Banking', excerpt: 'IBAN numbers, Bizum instant payments, and direct debits.', content: `## 1. Bizum: Spain\'s #1 Mobile Payment System\nBizum is the nationwide instant peer-to-peer payment feature integrated directly into all Spanish banking apps using just a mobile phone number.\n\n## 2. Direct Debits (Domiciliación Bancaria)\nEssential for automating recurring utility payments, rent, water, and internet bills without transfer fees.` },
      { id: 'b-3', title: 'Managing Your Money in Spain', excerpt: 'International money transfers, multi-currency accounts, and tax basics.', content: `## 1. International Money Transfers\nUse specialized transfer services like Wise to avoid high exchange markups when transferring foreign currencies.\n\n## 2. Tax Residency Basics\nYou are generally considered a Spanish tax resident if you spend more than 183 days in Spain during a calendar year.` },
    ]
  },
  {
    id: 'pets',
    title: 'Pets',
    description: 'Moving to Valencia with dogs, cats, and pets.',
    icon_name: 'PetsIcon',
    color: 'bg-red-500',
    articles: [
      { id: 'pt-1', title: 'Moving to Spain with a Pet', excerpt: 'EU pet passport, microchip requirements, and mandatory rabies vaccines.', content: `## 1. Entry Requirements for Pets\n- ISO standard 11784/11785 microchip identification.\n- Official EU Pet Passport issued by an authorized veterinarian.\n- Up-to-date rabies vaccination administered at least 21 days prior to entry.\n\n## 2. Registration with RIVIA\nIn the Valencian Community, all dogs and cats must be registered in the regional pet database (RIVIA) during your first visit to a local vet.` },
      { id: 'pt-2', title: 'Dog-Friendly Valencia', excerpt: 'Dog parks, dog-friendly beaches, and public transport rules.', content: `## 1. Dog Parks & Off-Leash Enclosures (Pipicanes)\nThe Turia Riverbed park features dedicated, fenced dog agility and run zones where pets can play safely off-leash.\n\n## 2. Dog-Friendly Beaches\nPlaya de Pinedo (Playa Canina) welcomes dogs during the summer season.\n\n## 3. Public Transit with Pets\nSmall pets in carriers are welcome on EMT buses and Metrovalencia. On the metro network, larger dogs on leashes with muzzles are also permitted under specific conditions.` },
      { id: 'pt-3', title: 'Finding a Vet You Can Trust', excerpt: '24/7 veterinary emergency hospitals and Mediterranean health prevention.', content: `## 1. Leishmaniasis Prevention\nIn Mediterranean climates, sandflies can transmit Leishmaniasis. Protect your dog year-round with specialized repellent collars (Scalibor, Seresto) and preventive vaccination.\n\n## 2. 24/7 Emergency Veterinary Hospitals\nAlways keep the contact details of a 24-hour emergency veterinary hospital handy (e.g., Hospital Veterinario Cruz Cubierta, Hospital Veterinario UCV).` },
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
        const firstArt = parsed?.[0]?.articles?.[0];
        if (firstArt && firstArt.content && firstArt.content.length > 5 && firstArt.content !== '...') {
          return sortCategories(parsed);
        }
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
