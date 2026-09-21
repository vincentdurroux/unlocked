const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseDesc(desc) {
  let en = '';
  let es = '';
  if (!desc) return { en, es };

  const enIdx = desc.indexOf('🇬🇧');
  const esIdx = desc.indexOf('🇪🇸');

  if (enIdx !== -1 && esIdx !== -1) {
    if (enIdx < esIdx) {
      en = desc.substring(enIdx + 4, esIdx).trim();
      es = desc.substring(esIdx + 4).trim();
    } else {
      es = desc.substring(esIdx + 4, enIdx).trim();
      en = desc.substring(enIdx + 4).trim();
    }
  } else if (enIdx !== -1) {
    en = desc.substring(enIdx + 4).trim();
  } else if (esIdx !== -1) {
    es = desc.substring(esIdx + 4).trim();
  } else {
    // Plain text without flag
    en = desc.trim();
  }

  // Remove any remaining stray flag prefixes
  en = en.replace(/^🇬🇧\s*/, '').trim();
  es = es.replace(/^🇪🇸\s*/, '').trim();

  return { en, es };
}

function selectBestModel(en, es) {
  const enClean = (en || '').trim();
  const esClean = (es || '').trim();

  if (!enClean && !esClean) return null;
  if (!enClean) return 'ES';
  if (!esClean) return 'EN';

  const enWords = enClean.split(/\s+/).filter(Boolean).length;
  const esWords = esClean.split(/\s+/).filter(Boolean).length;

  // Detect automated generic fallback templates in ES
  const isEsGeneric = /ofrece servicios de .* en Valencia y alrededores/i.test(esClean) ||
                      /ofrece clases .* en Valencia y alrededores/i.test(esClean) ||
                      /ofrece tratamientos de .* en Valencia y alrededores/i.test(esClean);

  // Detect ultra-short generic 2-4 word classifications in EN (e.g. "Language school.")
  const isEnGeneric = enWords <= 7 && /^(private|english|french|professional|music|veterinary|vehicle|residential|garden|interior|dentist|dental|beauty|dog)/i.test(enClean);

  // If EN has rich detail (>15 words) and ES is a generic fallback template
  if (enWords >= 15 && isEsGeneric) {
    return 'EN';
  }

  // If ES has more specific details and EN is just a short 2-5 word label
  if (esWords >= 10 && isEnGeneric) {
    return 'ES';
  }

  // If one has significantly more descriptive words (> 4 words difference)
  if (enWords > esWords + 4) return 'EN';
  if (esWords > enWords + 4) return 'ES';

  // Fallback to character length
  return enClean.length >= esClean.length ? 'EN' : 'ES';
}

async function translateText(text, from, to, retries = 3) {
  if (!text || !text.trim()) return '';
  const clean = text.trim();
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=` + encodeURIComponent(clean);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (!data || !data[0]) throw new Error('Invalid response structure');
      return data[0].map(s => s[0]).join('').trim();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 600 * attempt));
    }
  }
}

async function runHarmonization() {
  console.log('--- STARTING GOOGLE PROS DESCRIPTION HARMONIZATION ---');
  
  // 1. Fetch all Google Pros
  const { data: pros, error } = await supabase
    .from('professionals')
    .select('id, name, description')
    .eq('is_recommended', false);

  if (error) {
    console.error('Error fetching professionals:', error);
    process.exit(1);
  }

  console.log(`Found ${pros.length} Google professionals to evaluate.`);

  // 2. Backup existing descriptions to file
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, `google_pros_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(pros, null, 2), 'utf-8');
  console.log(`Saved safety backup of ${pros.length} records to ${backupFile}`);

  let updatedCount = 0;
  let modelEnCount = 0;
  let modelEsCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pros.length; i++) {
    const p = pros[i];
    const originalDesc = (p.description || '').trim();
    const { en, es } = parseDesc(originalDesc);
    const model = selectBestModel(en, es);

    if (!model) {
      skippedCount++;
      continue;
    }

    try {
      let harmonizedEn = en;
      let harmonizedEs = es;

      if (model === 'EN') {
        modelEnCount++;
        harmonizedEs = await translateText(en, 'en', 'es');
      } else {
        modelEsCount++;
        harmonizedEn = await translateText(es, 'es', 'en');
      }

      const newDescription = `🇬🇧 ${harmonizedEn}\n🇪🇸 ${harmonizedEs}`;

      if (newDescription !== originalDesc) {
        const { error: updateError } = await supabase
          .from('professionals')
          .update({ description: newDescription })
          .eq('id', p.id);

        if (updateError) {
          console.error(`Error updating pro ${p.id} (${p.name}):`, updateError.message);
          errorCount++;
        } else {
          updatedCount++;
        }
      } else {
        skippedCount++;
      }
    } catch (err) {
      console.error(`Translation error on pro ${p.id} (${p.name}):`, err.message);
      errorCount++;
    }

    // Small delay to be polite to the translation endpoint
    await new Promise(r => setTimeout(r, 60));

    if ((i + 1) % 25 === 0 || i === pros.length - 1) {
      console.log(`Progress: ${i + 1}/${pros.length} processed (${updatedCount} updated, ${errorCount} errors)...`);
    }
  }

  console.log('\n--- HARMONIZATION COMPLETE ---');
  console.log({
    totalPros: pros.length,
    updated: updatedCount,
    modelUsedEN: modelEnCount,
    modelUsedES: modelEsCount,
    skipped: skippedCount,
    errors: errorCount,
    backupFile
  });
}

runHarmonization();
