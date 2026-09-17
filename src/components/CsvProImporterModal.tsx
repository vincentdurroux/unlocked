import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Info, 
  ShieldCheck, 
  MapPin, 
  Star, 
  Globe, 
  Trash2,
  Search,
  CheckSquare,
  Square,
  ExternalLink,
  Phone,
  Maximize2,
  Minimize2,
  Users,
  Tag,
  ChevronDown,
  Check,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { proService } from '../services/proService';
import { VALENCIA_ZONES, DEFAULT_VALENCIA_CENTER } from '../lib/locationUtils';
import { normalizeCategoryName, SYNONYM_GROUPS } from '../utils/categoryUtils';

interface CsvProImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  setGlobalAlert?: (alert: { type: 'success' | 'error' | 'info'; text: string }) => void;
  defaultSource?: 'google_places' | 'community';
  existingCategories?: string[];
}

interface ParsedProRow {
  name: string;
  company_name?: string;
  category: string;
  originalCategory: string;
  isCategoryManuallyModified?: boolean;
  location: string;
  rating: number;
  review_count: number;
  phone: string;
  website: string;
  google_maps_url: string;
  lat?: number;
  lng?: number;
  languages: string[];
  description: string;
  source: 'google_places' | 'community';
  isValid: boolean;
  error?: string;
  isSelected?: boolean;
}

export const CsvProImporterModal: React.FC<CsvProImporterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  setGlobalAlert,
  defaultSource = 'google_places',
  existingCategories = []
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [, setRawContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedProRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSource, setImportSource] = useState<'google_places' | 'community'>(defaultSource);
  const [defaultZone, setDefaultZone] = useState<string>('Valencia');
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [importedCount, setImportedCount] = useState(0);

  // Inspection and view controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'selected' | 'valid' | 'invalid'>('all');
  const [isExpandedModal, setIsExpandedModal] = useState(false);

  // Category management & manual association state
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>('');
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategoryTarget, setCustomCategoryTarget] = useState<'bulk' | number | null>(null);
  const [bulkCategorySelect, setBulkCategorySelect] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample CSV Template Generator
  const downloadTemplate = () => {
    const templateData = `name,category,address,rating,reviews_count,phone,website,google_maps_url,latitude,longitude,languages,description
Clinica Dental Ruzafa,Dentist,Carrer de Cuba 12 46006 Valencia,4.8,124,+34 963 11 22 33,https://clinicadentalruzafa.es,https://maps.google.com/?cid=123456,39.4612,-0.3734,"Spanish, English",Modern dental clinic specialized in implants in Ruzafa.
Osteopathy Valencia Carmen,Osteopath,Carrer de Cavallers 8 46001 Valencia,4.9,86,+34 961 44 55 66,https://osteo-valencia.com,https://maps.google.com/?cid=234567,39.4765,-0.3789,"French, Spanish, English",Gentle osteopathy clinic for adults and athletes.
Plumbing Express Valencia,Plumber,Avinguda del Port 45 46021 Valencia,4.7,52,+34 962 77 88 99,https://plumbing-express.es,https://maps.google.com/?cid=345678,39.4678,-0.3456,"Spanish, English",Fast plumbing repairs and water heater services in Valencia.`;

    const blob = new Blob([templateData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_google_pros.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Robust CSV Line Parser supporting quotes, commas, semicolons, and tabs
  const parseCSVLines = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

    const parseLine = (line: string): string[] => {
      const values: string[] = [];
      let currentVal = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuote && line[i + 1] === '"') {
            currentVal += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === delimiter && !insideQuote) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());
      return values;
    };

    const parsedHeaders = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const parsedRowsData: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowVals = parseLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
      if (rowVals.some(v => v.length > 0)) {
        parsedRowsData.push(rowVals);
      }
    }

    return { headers: parsedHeaders, rows: parsedRowsData };
  };

  // Column Matcher Helper
  const findColumnValue = (row: string[], colHeaders: string[], possibleNames: string[]): string => {
    for (let i = 0; i < colHeaders.length; i++) {
      const h = colHeaders[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const name of possibleNames) {
        const target = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (h === target || h.includes(target)) {
          return row[i] || '';
        }
      }
    }
    return '';
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsParsing(true);
    try {
      const text = await uploadedFile.text();
      setRawContent(text);

      const { headers: parsedHeaders, rows: parsedRowsData } = parseCSVLines(text);
      setHeaders(parsedHeaders);

      const proRows: ParsedProRow[] = parsedRowsData.map((row) => {
        const name = findColumnValue(row, parsedHeaders, [
          'name', 'nom', 'title', 'titre', 'businessname', 'companyname', 'displayname', 'place_name'
        ]);

        const category = findColumnValue(row, parsedHeaders, [
          'category', 'categorie', 'catégorie', 'profession', 'metier', 'métier', 'sector', 'secteur', 'primarytype', 'type'
        ]) || 'Professional';

        const location = findColumnValue(row, parsedHeaders, [
          'address', 'adresse', 'location', 'formattedaddress', 'street', 'city', 'ville', 'zone', 'quartier'
        ]) || defaultZone;

        const ratingStr = findColumnValue(row, parsedHeaders, [
          'rating', 'note', 'score', 'stars', 'etoiles', 'étoiles'
        ]);
        const rating = ratingStr ? parseFloat(ratingStr.replace(',', '.')) : 4.5;

        const reviewsCountStr = findColumnValue(row, parsedHeaders, [
          'reviews_count', 'review_count', 'reviews', 'avis', 'nombreavis', 'user_ratings_total'
        ]);
        const review_count = reviewsCountStr ? parseInt(reviewsCountStr.replace(/\D/g, ''), 10) : 0;

        const phone = findColumnValue(row, parsedHeaders, [
          'phone', 'telephone', 'téléphone', 'tel', 'mobile', 'international_phone_number'
        ]);

        const website = findColumnValue(row, parsedHeaders, [
          'website', 'site', 'siteweb', 'site_web', 'url', 'web', 'link', 'lien', 'lienweb', 'lien_web', 'sitio', 'sitioweb', 'webpage', 'homepage'
        ]);

        const google_maps_url = findColumnValue(row, parsedHeaders, [
          'google_maps_url', 'maps_url', 'googlemaps', 'maps', 'gmaps', 'link_maps', 'url_maps'
        ]);

        const latStr = findColumnValue(row, parsedHeaders, ['latitude', 'lat']);
        const lngStr = findColumnValue(row, parsedHeaders, ['longitude', 'lng', 'lon', 'long']);

        let lat = latStr ? parseFloat(latStr.replace(',', '.')) : undefined;
        let lng = lngStr ? parseFloat(lngStr.replace(',', '.')) : undefined;

        // Auto fallback coordinates from default Valencia center if missing
        if ((lat === undefined || isNaN(lat) || lat === 0) || (lng === undefined || isNaN(lng) || lng === 0)) {
          const locLower = location.toLowerCase();
          const matchedZone = VALENCIA_ZONES.find(z => z.keywords.some(kw => locLower.includes(kw)));
          if (matchedZone) {
            lat = matchedZone.coords.lat;
            lng = matchedZone.coords.lng;
          } else {
            lat = DEFAULT_VALENCIA_CENTER.lat;
            lng = DEFAULT_VALENCIA_CENTER.lng;
          }
        }

        const languagesStr = findColumnValue(row, parsedHeaders, [
          'languages', 'langues', 'langue', 'spoken_languages'
        ]);
        let languages: string[] = [];
        if (languagesStr) {
          languages = languagesStr.split(/[,;/]/).map(l => l.trim()).filter(Boolean);
        }
        if (languages.length === 0) {
          languages = ['Spanish'];
        }

        const description = findColumnValue(row, parsedHeaders, [
          'description', 'bio', 'details', 'about', 'apropos', 'presentation'
        ]) || `${name} - ${category} in ${location}.`;

        const isValid = Boolean(name && name.trim().length >= 2);
        const error = !isValid ? 'Name is required' : undefined;

        const rawCategory = category || 'Other';
        const normCat = normalizeCategoryName(rawCategory, existingCategories);

        return {
          name: name || 'Unknown',
          category: normCat || rawCategory,
          originalCategory: rawCategory,
          isCategoryManuallyModified: false,
          location,
          rating: isNaN(rating) ? 4.5 : Math.min(5, Math.max(0, rating)),
          review_count: isNaN(review_count) ? 0 : review_count,
          phone,
          website,
          google_maps_url,
          lat,
          lng,
          languages,
          description,
          source: importSource,
          isValid,
          error,
          isSelected: isValid
        };
      });

      setParsedRows(proRows);
      setSearchQuery('');
      setFilterStatus('all');
      setStep('preview');
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      if (setGlobalAlert) {
        setGlobalAlert({ type: 'error', text: `Error reading CSV file: ${err.message}` });
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      processFile(uploadedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const validCount = useMemo(() => parsedRows.filter(r => r.isValid).length, [parsedRows]);
  const invalidCount = parsedRows.length - validCount;
  const selectedValidCount = useMemo(
    () => parsedRows.filter(r => r.isValid && r.isSelected !== false).length,
    [parsedRows]
  );
  const allValidSelected = useMemo(
    () => validCount > 0 && parsedRows.filter(r => r.isValid).every(r => r.isSelected !== false),
    [parsedRows, validCount]
  );

  // Combined pool of available categories for manual association
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    (existingCategories || []).forEach(c => {
      const trimmed = c?.trim();
      if (trimmed && trimmed.toLowerCase() !== 'undefined' && trimmed.toLowerCase() !== 'null') {
        set.add(trimmed);
      }
    });
    SYNONYM_GROUPS.forEach(g => {
      if (g.canonicalDefault) set.add(g.canonicalDefault);
    });
    parsedRows.forEach(r => {
      if (r.category && r.category.trim()) {
        set.add(r.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [existingCategories, parsedRows]);

  const toggleRow = (originalIndex: number) => {
    setParsedRows(prev => {
      const next = [...prev];
      if (next[originalIndex]) {
        next[originalIndex] = {
          ...next[originalIndex],
          isSelected: !next[originalIndex].isSelected
        };
      }
      return next;
    });
  };

  const toggleSelectAll = (selectTarget?: boolean) => {
    const shouldSelect = selectTarget !== undefined ? selectTarget : !allValidSelected;
    setParsedRows(prev => prev.map(r => ({
      ...r,
      isSelected: shouldSelect ? r.isValid : false
    })));
  };

  const deleteRow = (originalIndex: number) => {
    setParsedRows(prev => prev.filter((_, idx) => idx !== originalIndex));
  };

  // Category change handlers
  const handleRowCategoryChange = (originalIndex: number, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setParsedRows(prev => {
      const next = [...prev];
      if (next[originalIndex]) {
        const isModified = trimmed !== next[originalIndex].originalCategory;
        next[originalIndex] = {
          ...next[originalIndex],
          category: trimmed,
          isCategoryManuallyModified: isModified,
          isValid: Boolean(next[originalIndex].name && next[originalIndex].name.trim().length >= 2),
          error: (next[originalIndex].name && next[originalIndex].name.trim().length >= 2) ? undefined : next[originalIndex].error
        };
      }
      return next;
    });
  };

  const handleResetRowCategory = (originalIndex: number) => {
    setParsedRows(prev => {
      const next = [...prev];
      if (next[originalIndex]) {
        const orig = next[originalIndex].originalCategory || next[originalIndex].category;
        const norm = normalizeCategoryName(orig, existingCategories);
        next[originalIndex] = {
          ...next[originalIndex],
          category: norm || orig,
          isCategoryManuallyModified: false
        };
      }
      return next;
    });
  };

  const handleSaveCustomCategory = (originalIndex: number, val: string) => {
    if (val.trim()) {
      handleRowCategoryChange(originalIndex, val.trim());
    }
    setEditingCategoryIndex(null);
  };

  const handleApplyBulkCategory = (categoryToApply: string) => {
    const trimmed = categoryToApply.trim();
    if (!trimmed) return;
    let modifiedCount = 0;
    setParsedRows(prev => prev.map(row => {
      if (row.isSelected && row.isValid) {
        modifiedCount++;
        return {
          ...row,
          category: trimmed,
          isCategoryManuallyModified: true
        };
      }
      return row;
    }));

    if (setGlobalAlert) {
      setGlobalAlert({
        type: 'success',
        text: `Catégorie "${trimmed}" associée à ${modifiedCount} professionnel(s) sélectionné(s).`
      });
    }
  };

  const confirmCustomCategoryModal = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (customCategoryTarget === 'bulk') {
      handleApplyBulkCategory(trimmed);
    } else if (typeof customCategoryTarget === 'number') {
      handleRowCategoryChange(customCategoryTarget, trimmed);
    }
    setShowCustomCategoryModal(false);
    setCustomCategoryInput('');
    setCustomCategoryTarget(null);
  };

  const filteredRowsWithIndex = useMemo(() => {
    return parsedRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (filterStatus === 'selected' && !row.isSelected) return false;
        if (filterStatus === 'valid' && !row.isValid) return false;
        if (filterStatus === 'invalid' && row.isValid) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = row.name?.toLowerCase().includes(q);
          const matchesCat = row.category?.toLowerCase().includes(q);
          const matchesLoc = row.location?.toLowerCase().includes(q);
          const matchesPhone = row.phone ? row.phone.toLowerCase().includes(q) : false;
          if (!matchesName && !matchesCat && !matchesLoc && !matchesPhone) {
            return false;
          }
        }
        return true;
      });
  }, [parsedRows, filterStatus, searchQuery]);

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid && r.isSelected !== false);
    if (validRows.length === 0) {
      if (setGlobalAlert) {
        setGlobalAlert({ type: 'error', text: 'No selected valid professionals to import.' });
      }
      return;
    }

    setIsImporting(true);
    try {
      const formattedPros = validRows.map((row, index) => {
        const id = `imported_google_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;
        // Use row.category directly to preserve manual associations
        const finalCat = (row.category || 'Other').trim();
        return {
          id,
          name: row.name,
          company_name: row.name,
          category: finalCat,
          categories: [finalCat],
          profession: finalCat,
          location: row.location,
          rating: importSource === 'google_places' ? 0 : (row.rating || 4.5),
          review_count: importSource === 'google_places' ? 0 : (row.review_count || 0),
          reviews_count: importSource === 'google_places' ? 0 : (row.review_count || 0),
          phone: row.phone || '',
          website: row.website || '',
          google_maps_url: row.google_maps_url || '',
          googleMapsUri: row.google_maps_url || '',
          lat: row.lat,
          lng: row.lng,
          coordinates: (row.lat && row.lng) ? { lat: row.lat, lng: row.lng } : null,
          languages: row.languages && row.languages.length > 0 ? row.languages : ['Espagnol'],
          description: row.description || '',
          bio: row.description || '',
          image_url: '',
          image: '',
          source: importSource,
          is_community_recommended: importSource === 'community',
          is_recommended: importSource === 'community',
          is_recommanded: importSource === 'community',
          created_at: new Date().toISOString()
        };
      });

      const count = await proService.bulkImportProfessionals(formattedPros);
      setImportedCount(count);
      setStep('success');

      if (setGlobalAlert) {
        setGlobalAlert({ 
          type: 'success', 
          text: `🎉 Successfully imported ${count} professionals (${importSource === 'google_places' ? 'Google Pros' : 'Recommended Pros'})!` 
        });
      }

      onSuccess(count);
    } catch (err: any) {
      console.error('Import error:', err);
      if (setGlobalAlert) {
        setGlobalAlert({ type: 'error', text: `Import error: ${err.message}` });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setRawContent('');
    setParsedRows([]);
    setHeaders([]);
    setSearchQuery('');
    setFilterStatus('all');
    setStep('upload');
    setImportedCount(0);
    setEditingCategoryIndex(null);
    setEditingCategoryValue('');
    setShowCustomCategoryModal(false);
    setCustomCategoryInput('');
    setCustomCategoryTarget(null);
    setBulkCategorySelect('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-4 sm:my-8 transition-all duration-200 animate-in fade-in zoom-in-95 ${
        isExpandedModal ? 'max-w-[96vw] max-h-[94vh] flex flex-col' : 'max-w-5xl'
      }`}>
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-300 border border-white/10">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Import Google Pros via CSV
              </h3>
              <p className="text-xs text-blue-200/80">
                Bulk upload Google Places listings and business directories directly into the app
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsExpandedModal(!isExpandedModal)}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpandedModal ? 'Standard width' : 'Full width view'}
            >
              {isExpandedModal ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={`p-6 md:p-8 overflow-y-auto ${isExpandedModal ? 'flex-1' : 'max-h-[75vh]'}`}>
          
          {step === 'upload' && (
            <div className="space-y-6">
              
              {/* Context Box */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm text-blue-900 space-y-1">
                  <p className="font-semibold">How does Google Pros CSV Import work?</p>
                  <p className="text-blue-800/90 leading-relaxed">
                    Upload a CSV file containing professionals found on Google Places or directories. They will be registered in your database under the <strong>Google Pros</strong> tab (marked as non-recommended by default). You can selectively recommend any of them anytime.
                  </p>
                </div>
              </div>

              {/* Import Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target Category
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImportSource('google_places')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        importSource === 'google_places'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Google Pros
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSource('community')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        importSource === 'community'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Recommended Pros
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {importSource === 'google_places' 
                      ? 'Pros will appear in the "Google Pros" tab with a Google badge.'
                      : 'Pros will be imported directly as Recommended (is_recommended = true).'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Zone / City (if omitted in CSV)
                  </label>
                  <select
                    value={defaultZone}
                    onChange={(e) => setDefaultZone(e.target.value)}
                    className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Valencia">Valencia (General)</option>
                    <option value="Ruzafa, Valencia">Ruzafa (Valencia)</option>
                    <option value="El Carmen, Valencia">El Carmen (Valencia)</option>
                    <option value="El Cabanyal, Valencia">El Cabanyal (Valencia)</option>
                    <option value="Benimaclet, Valencia">Benimaclet (Valencia)</option>
                    <option value="Extramurs, Valencia">Extramurs (Valencia)</option>
                    <option value="Paterna, Valencia">Paterna</option>
                    <option value="Torrent, Valencia">Torrent</option>
                    <option value="L'Eliana, Valencia">L'Eliana</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Valencia GPS coordinates will be assigned automatically if missing.
                  </p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,text/csv,text/plain,.tsv" 
                  className="hidden" 
                />
                <div className="w-16 h-16 rounded-2xl bg-blue-100/80 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                  {isParsing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800">
                    Drag and drop your CSV file here, or <span className="text-blue-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports CSV and TSV formats (comma, semicolon, or tab separators)
                  </p>
                </div>
              </div>

              {/* Template Download Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-white rounded-xl shadow-xs text-slate-700">
                    <Download className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Need a sample template?</p>
                    <p className="text-[11px] text-slate-500">Download a pre-formatted CSV template ready to fill with columns.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV Template
                </button>
              </div>

            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{file?.name || 'CSV File'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        {parsedRows.length} professionals found
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedValidCount} selected for import • {validCount} valid • {invalidCount} with issues
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    importSource === 'google_places' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {importSource === 'google_places' ? 'Destination: Google Pros' : 'Destination: Recommended Pros'}
                  </span>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Change file and reset"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              {/* Toolbar: Search, Filters & Bulk Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, trade, address, phone..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('selected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      filterStatus === 'selected'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Selected ({selectedValidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      filterStatus === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterStatus('invalid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        filterStatus === 'invalid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      Issues ({invalidCount})
                    </button>
                  )}
                </div>

                {/* Bulk Select Toggles */}
                <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Select all valid professionals"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Deselect all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Deselect All
                  </button>
                </div>

                {/* Bulk Category Association Tool */}
                <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <div className="flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 rounded-xl shadow-xs">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-indigo-950 whitespace-nowrap hidden lg:inline">
                      Associer catégorie :
                    </span>
                    <select
                      value={bulkCategorySelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setCustomCategoryTarget('bulk');
                          setCustomCategoryInput('');
                          setShowCustomCategoryModal(true);
                          setBulkCategorySelect('');
                        } else if (val) {
                          handleApplyBulkCategory(val);
                          setBulkCategorySelect('');
                        }
                      }}
                      disabled={selectedValidCount === 0}
                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs max-w-[210px] truncate"
                    >
                      <option value="">
                        {selectedValidCount === 0
                          ? 'Sélectionnez des pros...'
                          : `Appliquer aux ${selectedValidCount} sélectionnés...`}
                      </option>
                      <optgroup label="Catégories existantes & recommandées">
                        {allAvailableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Personnalisé">
                        <option value="__custom__">✏️ Nouvelle catégorie personnalisée...</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Complete List Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Import List ({filteredRowsWithIndex.length} displayed of {parsedRows.length} total)
                    </p>
                    {filteredRowsWithIndex.length < parsedRows.length && (
                      <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                        Filtered
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Columns: {headers.join(', ')}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <div className={`overflow-x-auto overflow-y-auto ${isExpandedModal ? 'max-h-[62vh]' : 'max-h-[500px]'}`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-200 shadow-xs">
                        <tr>
                          <th className="py-3 px-3.5 font-bold w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allValidSelected}
                              onChange={() => toggleSelectAll()}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              title="Toggle select all valid"
                            />
                          </th>
                          <th className="py-3 px-2 font-bold w-12 text-slate-500">#</th>
                          <th className="py-3 px-3 font-bold">Status</th>
                          <th className="py-3 px-3.5 font-bold min-w-[160px]">Professional / Business</th>
                          <th className="py-3 px-3.5 font-bold min-w-[210px]">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Catégorie associée</span>
                            </div>
                          </th>
                          <th className="py-3 px-3.5 font-bold min-w-[180px]">Address / Zone</th>
                          <th className="py-3 px-3 font-bold whitespace-nowrap">Rating / Reviews</th>
                          <th className="py-3 px-3.5 font-bold min-w-[140px]">Contact Details</th>
                          <th className="py-3 px-3 font-bold w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredRowsWithIndex.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center">
                              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm font-bold text-slate-700">No professionals found</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {searchQuery ? 'Try clearing your search query or adjusting your filters.' : 'No professionals in this view.'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredRowsWithIndex.map(({ row, originalIndex }) => {
                            const isRowSelected = row.isSelected !== false;
                            const norm = normalizeCategoryName(row.category, existingCategories);
                            const isExisting = existingCategories.some(c => c.toLowerCase().trim() === norm.toLowerCase().trim());
                            const isRemapped = row.category && norm.toLowerCase().trim() !== row.category.toLowerCase().trim();

                            return (
                              <tr 
                                key={originalIndex} 
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  !row.isValid ? 'bg-rose-50/40' : !isRowSelected ? 'opacity-60 bg-slate-50/30' : ''
                                }`}
                              >
                                {/* Row Checkbox */}
                                <td className="py-2.5 px-3.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isRowSelected}
                                    onChange={() => toggleRow(originalIndex)}
                                    disabled={!row.isValid}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-30"
                                    title={!row.isValid ? 'Cannot select invalid row' : isRowSelected ? 'Uncheck to exclude from import' : 'Check to include in import'}
                                  />
                                </td>

                                {/* Row Index */}
                                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-400">
                                  #{originalIndex + 1}
                                </td>

                                {/* Validation Status */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> OK
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md" title={row.error}>
                                      <AlertCircle className="w-3 h-3" /> {row.error || 'Issue'}
                                    </span>
                                  )}
                                </td>

                                {/* Name & Company */}
                                <td className="py-2.5 px-3.5">
                                  <div className="font-bold text-slate-900 leading-tight">
                                    {row.name}
                                  </div>
                                  {row.languages && row.languages.length > 0 && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {row.languages.join(', ')}
                                    </div>
                                  )}
                                </td>

                                {/* Category Mapping */}
                                <td className="py-2.5 px-3.5">
                                  {editingCategoryIndex === originalIndex ? (
                                    <div className="flex items-center gap-1 animate-in fade-in duration-150">
                                      <input
                                        type="text"
                                        value={editingCategoryValue}
                                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                                        placeholder="Nom de catégorie..."
                                        className="px-2 py-1 text-xs font-semibold border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[130px]"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveCustomCategory(originalIndex, editingCategoryValue);
                                          } else if (e.key === 'Escape') {
                                            setEditingCategoryIndex(null);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveCustomCategory(originalIndex, editingCategoryValue)}
                                        className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                        title="Enregistrer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCategoryIndex(null)}
                                        className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-pointer"
                                        title="Annuler"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-start gap-1 min-w-[180px]">
                                      <div className="relative w-full">
                                        <select
                                          value={row.category}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '__custom__') {
                                              setEditingCategoryIndex(originalIndex);
                                              setEditingCategoryValue(row.category);
                                            } else if (val) {
                                              handleRowCategoryChange(originalIndex, val);
                                            }
                                          }}
                                          className={`w-full pl-2.5 pr-7 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer truncate appearance-none border ${
                                            row.isCategoryManuallyModified
                                              ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold focus:ring-2 focus:ring-amber-500'
                                              : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-indigo-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                          }`}
                                          title="Cliquez pour associer à une catégorie existante ou personnalisée"
                                        >
                                          {!allAvailableCategories.includes(row.category) && (
                                            <option value={row.category}>{row.category} (actuel)</option>
                                          )}
                                          <optgroup label="Catégories existantes & recommandées">
                                            {allAvailableCategories.map((cat) => (
                                              <option key={cat} value={cat}>
                                                {cat}
                                              </option>
                                            ))}
                                          </optgroup>
                                          <optgroup label="Autre">
                                            <option value="__custom__">✏️ Saisir un nom personnalisé...</option>
                                          </optgroup>
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </div>
                                      </div>

                                      {/* Information & Reset action */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {row.isCategoryManuallyModified ? (
                                          <div className="flex items-center gap-1 text-[10px]">
                                            <span className="inline-flex items-center gap-0.5 text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                                              <Check className="w-2.5 h-2.5 text-amber-600" /> Associé manuellement
                                            </span>
                                            {row.originalCategory && (
                                              <button
                                                type="button"
                                                onClick={() => handleResetRowCategory(originalIndex)}
                                                className="text-slate-400 hover:text-slate-700 underline cursor-pointer"
                                                title={`Rétablir la catégorie originale ("${row.originalCategory}")`}
                                              >
                                                Rétablir
                                              </button>
                                            )}
                                          </div>
                                        ) : isRemapped ? (
                                          <span className="text-[10px] text-emerald-600 font-medium truncate max-w-[170px]" title={`Mappé automatiquement depuis "${row.originalCategory || row.category}"`}>
                                            Mappé depuis "{row.originalCategory || row.category}"
                                          </span>
                                        ) : !isExisting ? (
                                          <span className="text-[10px] text-indigo-600 font-medium">
                                            + Nouvelle catégorie
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Location */}
                                <td className="py-2.5 px-3.5 text-slate-600" title={row.location}>
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <span className="line-clamp-2 leading-tight">{row.location}</span>
                                  </div>
                                </td>

                                {/* Rating / Reviews */}
                                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    <span className="font-bold">{row.rating}</span>
                                    <span className="text-slate-400 text-[11px]">({row.review_count})</span>
                                  </div>
                                </td>

                                {/* Contact Details */}
                                <td className="py-2.5 px-3.5 text-slate-600">
                                  <div className="flex flex-col gap-1 text-[11px]">
                                    {row.phone ? (
                                      <span className="text-slate-700 font-medium flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {row.phone}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 italic">No phone</span>
                                    )}
                                    {row.website && (
                                      <a 
                                        href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate max-w-[140px] flex items-center gap-1"
                                      >
                                        <Globe className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                        <span className="truncate">{row.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                      </a>
                                    )}
                                  </div>
                                </td>

                                {/* Delete / Discard */}
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => deleteRow(originalIndex)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Discard this pro from import"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Counter Footer */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-2 px-1 gap-2">
                  <p>
                    Showing <strong className="text-slate-800">{filteredRowsWithIndex.length}</strong> of{' '}
                    <strong className="text-slate-800">{parsedRows.length}</strong> professionals in list
                  </p>
                  <p>
                    <strong className="text-emerald-700">{selectedValidCount}</strong> valid professionals ready to be imported
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isImporting}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel & Restart
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={isImporting || selectedValidCount === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing {selectedValidCount} pros...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Import ({selectedValidCount} Pros)
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  {importedCount} professionals imported successfully!
                </h4>
                <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
                  The professionals have been added to your database and are immediately searchable by Jane in the app.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Custom Category Entry Modal */}
        {showCustomCategoryModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-base">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <span>Associer une catégorie</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                {customCategoryTarget === 'bulk'
                  ? `Entrez le nom de la catégorie exacte à associer à tous les ${selectedValidCount} professionnels sélectionnés :`
                  : `Entrez le nom de la catégorie exacte pour ce professionnel :`}
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="ex: Architecte, Plombier, Électricien, Avocat..."
                  className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmCustomCategoryModal();
                    }
                  }}
                />

                {/* Quick Suggestions Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Catégories suggérées :
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {allAvailableCategories.slice(0, 20).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomCategoryInput(c)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                          customCategoryInput.toLowerCase() === c.toLowerCase()
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmCustomCategoryModal}
                  disabled={!customCategoryInput.trim()}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Valider l'association
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
