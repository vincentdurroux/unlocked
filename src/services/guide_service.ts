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
      { id: 'h-1', title: 'Where Should You Live in Valencia?', excerpt: 'Aperçu des principaux quartiers.', content: '...' },
      { id: 'h-2', title: 'Renting in Valencia Explained', excerpt: 'Comment fonctionne la location.', content: '...' },
      { id: 'h-3', title: 'Setting Up Your New Home', excerpt: 'Internet, électricité, eau.', content: '...' },
    ]
  },
  {
    id: 'paperwork',
    title: 'Getting your paperwork sorted',
    description: 'Visas, registrations and official processes explained.',
    icon_name: 'PaperworkIcon',
    color: 'bg-blue-500',
    articles: [
      { id: 'p-1', title: 'Empadronamiento Explained', excerpt: 'What is it and how to get it.', content: '...' },
      { id: 'p-2', title: 'NIE Explained', excerpt: 'Guide to understand and get your NIE.', content: '...' },
    ]
  },
  {
    id: 'transport',
    title: 'Getting around Valencia',
    description: 'Public transport, cycling, driving and more.',
    icon_name: 'TransportIcon',
    color: 'bg-purple-500',
    articles: [
      { id: 't-1', title: 'Getting Around Valencia Made Easy', excerpt: 'Overview of transport options.', content: '...' },
      { id: 't-2', title: 'How to Use the Metro & Valenbisi', excerpt: 'Public transport and bikes.', content: '...' },
      { id: 't-3', title: 'Driving in Spain Explained', excerpt: 'Rules, parking, and permits.', content: '...' },
    ]
  },
  {
    id: 'healthcare',
    title: 'Accessing healthcare',
    description: 'How the system works and how to get started.',
    icon_name: 'HealthIcon',
    color: 'bg-emerald-500',
    articles: [
      { id: 'hc-1', title: 'Healthcare in Spain Explained', excerpt: 'How the Spanish system works.', content: '...' },
      { id: 'hc-2', title: 'Public vs Private Healthcare', excerpt: 'Differences and pros/cons.', content: '...' },
      { id: 'hc-3', title: 'Finding a Doctor in Valencia', excerpt: 'How to find a doctor.', content: '...' },
    ]
  },
  {
    id: 'family',
    title: 'Family',
    description: 'Install with children.',
    icon_name: 'FamilyIcon',
    color: 'bg-pink-500',
    articles: [
      { id: 'f-1', title: 'Family Life in Valencia', excerpt: 'Install with children.', content: '...' },
      { id: 'f-2', title: 'The Best Family Activities in Valencia', excerpt: 'Parks, beaches, museums.', content: '...' },
      { id: 'f-3', title: 'Building Your Community', excerpt: 'Meet other families.', content: '...' },
    ]
  },
  {
    id: 'schools',
    title: 'Schools',
    description: 'Education systems.',
    icon_name: 'SchoolsIcon',
    color: 'bg-yellow-500',
    articles: [
      { id: 's-1', title: 'Choosing a School in Valencia', excerpt: 'School systems available.', content: '...' },
      { id: 's-2', title: 'Public, Private or International', excerpt: 'Comparison.', content: '...' },
      { id: 's-3', title: 'School Admissions Explained', excerpt: 'Steps and documents.', content: '...' },
    ]
  },
  {
    id: 'banking',
    title: 'Banking',
    description: 'Money and accounts.',
    icon_name: 'BankingIcon',
    color: 'bg-yellow-500',
    articles: [
      { id: 'b-1', title: 'Opening a Spanish Bank Account', excerpt: 'Documents required.', content: '...' },
      { id: 'b-2', title: 'Understanding Spanish Banking', excerpt: 'IBAN, Bizum.', content: '...' },
      { id: 'b-3', title: 'Managing Your Money in Spain', excerpt: 'Transfers, cards.', content: '...' },
    ]
  },
  {
    id: 'pets',
    title: 'Pets',
    description: 'Moving with pets.',
    icon_name: 'PetsIcon',
    color: 'bg-red-500',
    articles: [
      { id: 'pt-1', title: 'Moving to Spain with a Pet', excerpt: 'Documents.', content: '...' },
      { id: 'pt-2', title: 'Dog-Friendly Valencia', excerpt: 'Parks, beaches.', content: '...' },
      { id: 'pt-3', title: 'Finding a Vet You Can Trust', excerpt: 'Emergencies.', content: '...' },
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
