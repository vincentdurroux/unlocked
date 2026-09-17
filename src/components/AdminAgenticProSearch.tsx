import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  Copy, 
  Check, 
  ExternalLink, 
  Plus, 
  Download, 
  RefreshCw, 
  Filter, 
  SlidersHorizontal, 
  Building2, 
  Wrench, 
  Zap, 
  HeartPulse, 
  Briefcase, 
  ShieldCheck, 
  FileText, 
  LayoutGrid, 
  Table as TableIcon, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Send,
  Trash2,
  Share2,
  FileSpreadsheet,
  Tag,
  ChevronDown
} from 'lucide-react';
import { proService } from '../services/proService';
import { SYNONYM_GROUPS } from '../utils/categoryUtils';
import { CsvProImporterModal } from './CsvProImporterModal';

export interface AgenticPro {
  id: string;
  name: string;
  formattedId: string;
  sector: string;
  location: string;
  phone: string;
  website: string;
  rating: string;
  ratingNumeric?: number;
  reviewCount?: number;
  highlights: string;
  rawBlock: string;
}

export interface SavedSearch {
  id: string;
  category: string;
  location: string;
  date: string;
  count: number;
  pros: AgenticPro[];
  rawText: string;
}

interface AdminAgenticProSearchProps {
  onRefetchPros?: () => Promise<void>;
  onOpenAddProModal?: (initialData?: any) => void;
  setGlobalAlert?: (alert: { type: 'success' | 'error' | 'info'; text: string }) => void;
}

const PRESET_CATEGORIES = [
  { id: 'plumber', label: 'Plumbing & Heating', icon: Wrench, query: 'Plumber' },
  { id: 'electrician', label: 'Electrician & Solar', icon: Zap, query: 'Electrician' },
  { id: 'dentist', label: 'Dentist & Clinic', icon: HeartPulse, query: 'Dentist' },
  { id: 'cleaner', label: 'Cleaning & Housekeeping', icon: Sparkles, query: 'Cleaning Service' },
  { id: 'lawyer', label: 'Lawyer & Legal', icon: Briefcase, query: 'Lawyer' },
  { id: 'locksmith', label: 'Locksmith & Security', icon: ShieldCheck, query: 'Locksmith' },
  { id: 'builder', label: 'Builder & Renovation', icon: Building2, query: 'General Contractor' },
  { id: 'ac', label: 'Air Conditioning & HVAC', icon: Wrench, query: 'HVAC Air Conditioning' },
  { id: 'mechanic', label: 'Auto Mechanic', icon: Wrench, query: 'Car Mechanic' },
  { id: 'accountant', label: 'Tax & Accountant', icon: Briefcase, query: 'Accountant Gestor' }
];

const PRESET_LOCATIONS = [
  'Valencia (All)',
  'Ruzafa (Valencia)',
  'El Carmen (Valencia)',
  'Benimaclet (Valencia)',
  'El Cabanyal (Valencia)',
  'Extramurs (Valencia)',
  'Torrent (Valencia)',
  'Paterna (Valencia)',
  'Burjassot (Valencia)',
  'Mislata (Valencia)',
  'Alboraya (Valencia)',
  'Sagunto (Valencia)',
  'Gandia (Valencia)',
  'Manises (Valencia)',
  'Alzira (Valencia)'
];

export function parseAgenticMarkdown(markdownText: string): AgenticPro[] {
  if (!markdownText) return [];
  const results: AgenticPro[] = [];
  
  // Split by "### " or "###"
  const sections = markdownText.split(/(?=###\s+)/g);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith('###')) continue;
    
    const lines = trimmed.split('\n');
    const headerLine = lines[0] || '';
    
    // Extract Business Name
    let name = headerLine.replace(/^###\s*/, '').trim();
    if (name.startsWith('[') && name.endsWith(']')) {
      name = name.slice(1, -1).trim();
    }

    let formattedId = '';
    let sector = '';
    let location = '';
    let phone = 'Not provided';
    let website = 'Not provided';
    let rating = 'Not provided';
    let highlights = '';

    for (const line of lines) {
      const lineTrim = line.trim();
      
      // Match ID_Formaté / Formatted_ID
      const idMatch = lineTrim.match(/^[-*]\s*\*\*(?:ID_Formaté|Formatted_ID|Formatted ID|ID)\s*:\*\*\s*(.*)$/i);
      if (idMatch) formattedId = idMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Secteur / Métier or Sector / Trade
      const sectorMatch = lineTrim.match(/^[-*]\s*\*\*(?:Secteur \/ Métier|Sector \/ Trade|Secteur|Sector|Trade|Métier)\s*:\*\*\s*(.*)$/i);
      if (sectorMatch) sector = sectorMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Localisation or Location
      const locMatch = lineTrim.match(/^[-*]\s*\*\*(?:Localisation|Location|Address)\s*:\*\*\s*(.*)$/i);
      if (locMatch) location = locMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Téléphone or Phone
      const phoneMatch = lineTrim.match(/^[-*]\s*\*\*(?:Téléphone|Telephone|Phone)\s*:\*\*\s*(.*)$/i);
      if (phoneMatch) phone = phoneMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Lien Web or Website
      const webMatch = lineTrim.match(/^[-*]\s*\*\*(?:Lien Web|Website|Web Link|Site Web|Web)\s*:\*\*\s*(.*)$/i);
      if (webMatch) website = webMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Évaluation or Rating
      const ratingMatch = lineTrim.match(/^[-*]\s*\*\*(?:Évaluation|Evaluation|Rating)\s*:\*\*\s*(.*)$/i);
      if (ratingMatch) rating = ratingMatch[1].replace(/^\[|\]$/g, '').trim();

      // Match Points forts or Key Highlights
      const highMatch = lineTrim.match(/^[-*]\s*\*\*(?:Points forts|Key Highlights|Highlights|Strengths|Point fort)\s*:\*\*\s*(.*)$/i);
      if (highMatch) highlights = highMatch[1].replace(/^\[|\]$/g, '').trim();
    }

    if (!formattedId && name) {
      formattedId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Extract numerical rating and review count if available
    let ratingNumeric: number | undefined;
    let reviewCount: number | undefined;
    if (rating && rating !== 'Not provided' && rating !== 'Non renseigné') {
      const numMatch = rating.match(/([\d.,]+)\s*\/\s*5/);
      if (numMatch) {
        ratingNumeric = parseFloat(numMatch[1].replace(',', '.'));
      }
      const countMatch = rating.match(/\(?([\d\s,]+)\s*(?:avis|reviews|reviews count|ratings)/i);
      if (countMatch) {
        reviewCount = parseInt(countMatch[1].replace(/[\s,]/g, ''), 10);
      }
    }

    if (name) {
      results.push({
        id: formattedId || `pro-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        formattedId: formattedId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sector: sector || 'Professional Service',
        location: location || 'Not provided',
        phone: phone || 'Not provided',
        website: website || 'Not provided',
        rating: rating || 'Not provided',
        ratingNumeric,
        reviewCount,
        highlights: highlights || 'Verified local professional.',
        rawBlock: trimmed
      });
    }
  }

  return results;
}

export const AdminAgenticProSearch: React.FC<AdminAgenticProSearchProps> = ({
  onRefetchPros,
  onOpenAddProModal,
  setGlobalAlert
}) => {
  // Search Form States
  const [category, setCategory] = useState('Plumber');
  const [location, setLocation] = useState('Valencia, Spain');
  const [customQuery, setCustomQuery] = useState('');
  const [languagePreference, setLanguagePreference] = useState('English');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Execution States
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results States
  const [results, setResults] = useState<AgenticPro[]>([]);
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'cards' | 'raw' | 'table'>('cards');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // History & Saved Searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Category manual overrides for search results
  const [proCategories, setProCategories] = useState<Record<string, string>>({});

  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    dbCategories.forEach(c => { if (c?.trim()) set.add(c.trim()); });
    PRESET_CATEGORIES.forEach(p => { if (p.query?.trim()) set.add(p.query.trim()); });
    SYNONYM_GROUPS.forEach(g => { if (g.canonicalDefault?.trim()) set.add(g.canonicalDefault.trim()); });
    results.forEach(r => { if (r.sector?.trim()) set.add(r.sector.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [dbCategories, results]);

  const getProCategory = (pro: AgenticPro) => proCategories[pro.id] || pro.sector;
  const setProCategory = (proId: string, newCat: string) => {
    setProCategories(prev => ({ ...prev, [proId]: newCat }));
  };

  // Load history & categories from database on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('unlocked_admin_agentic_searches');
      if (stored) {
        setSavedSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not load saved searches', e);
    }

    // Fetch existing categories present in DB / app for intelligent normalization
    proService.getExistingCategoryNames().then(cats => {
      if (Array.isArray(cats) && cats.length > 0) {
        setDbCategories(cats);
      }
    }).catch(err => console.warn('Could not load db categories:', err));
  }, []);

  const saveToHistory = (newSearch: SavedSearch) => {
    try {
      const updated = [newSearch, ...savedSearches.slice(0, 19)];
      setSavedSearches(updated);
      localStorage.setItem('unlocked_admin_agentic_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save search history', e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSearching) return;

    setIsSearching(true);
    setErrorMessage(null);
    setSearchStep('Connecting to Google Search Agent...');

    try {
      setTimeout(() => setSearchStep('Browsing live local web data & checking reviews...'), 800);
      setTimeout(() => setSearchStep('Validating contacts & structuring output...'), 2400);

      const response = await fetch('/api/admin/agentic-pro-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          location,
          customQuery,
          languagePreference,
          specialRequirements,
          maxResults
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to search for professionals. Please try again.');
      }

      const raw = data.rawText || '';
      setRawMarkdown(raw);

      const parsedPros = parseAgenticMarkdown(raw);
      setResults(parsedPros);

      // Save into history
      const newHistoryItem: SavedSearch = {
        id: `search_${Date.now()}`,
        category: customQuery ? customQuery : category,
        location,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        count: parsedPros.length,
        pros: parsedPros,
        rawText: raw
      };
      saveToHistory(newHistoryItem);

      if (setGlobalAlert) {
        setGlobalAlert({
          type: 'success',
          text: `Found ${parsedPros.length} real verified professionals in ${location}!`
        });
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage(err.message || 'An error occurred during search.');
      if (setGlobalAlert) {
        setGlobalAlert({
          type: 'error',
          text: err.message || 'Error executing agentic search.'
        });
      }
    } finally {
      setIsSearching(false);
      setSearchStep('');
    }
  };

  const handleCopySingle = (pro: AgenticPro) => {
    navigator.clipboard.writeText(pro.rawBlock);
    setCopiedId(pro.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllMarkdown = () => {
    navigator.clipboard.writeText(rawMarkdown);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([rawMarkdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pros_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${location.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pros_${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPro = async (pro: AgenticPro) => {
    setImportingId(pro.id);
    try {
      const chosenCategory = getProCategory(pro);
      const proData = {
        name: pro.name,
        company_name: pro.name,
        profession: chosenCategory,
        rating: 0,
        review_count: 0,
        languages: [languagePreference === 'French' ? 'French' : languagePreference === 'Spanish' ? 'Spanish' : 'English', 'Spanish'],
        image_url: '',
        description: `${pro.highlights}\n\nFormatted ID: ${pro.formattedId}`,
        phone: pro.phone !== 'Not provided' ? pro.phone : '',
        email: '',
        website: pro.website !== 'Not provided' ? pro.website : '',
        location: pro.location,
        lat: 39.4699,
        lng: -0.3763,
        top_qualities: [chosenCategory, 'Verified Google Pro', 'Agent Recommended']
      };

      await proService.createProfessional(proData);
      setImportedIds(prev => new Set([...prev, pro.id]));
      
      if (onRefetchPros) {
        await onRefetchPros();
      }

      if (setGlobalAlert) {
        setGlobalAlert({
          type: 'success',
          text: `"${pro.name}" was successfully added to your application directory!`
        });
      }
    } catch (err: any) {
      console.error('Error importing pro:', err);
      if (setGlobalAlert) {
        setGlobalAlert({
          type: 'error',
          text: `Failed to import pro: ${err.message || 'Unknown database error'}`
        });
      }
    } finally {
      setImportingId(null);
    }
  };

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setResults(saved.pros);
    setRawMarkdown(saved.rawText);
    setCategory(saved.category);
    setLocation(saved.location);
    setActiveTab('search');
    if (setGlobalAlert) {
      setGlobalAlert({
        type: 'info',
        text: `Loaded ${saved.pros.length} results from history (${saved.date}).`
      });
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('unlocked_admin_agentic_searches', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Google Real-Time Web Agent • Valencia & Surroundings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
              Agentic Local Pro Search
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Find, verify, and import real local professionals in real time across Valencia and surrounding municipalities with fresh Google contact details, ratings, addresses, and strict structured data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
              title="Import Google Places professionals via CSV file"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import CSV (Google Places)</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Agent</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Saved Searches ({savedSearches.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* History View */
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Search History & Stored Results</h3>
              <p className="text-xs text-slate-500">Access previous web agent searches and export or re-import records.</p>
            </div>
            {savedSearches.length > 0 && (
              <button
                onClick={() => {
                  setSavedSearches([]);
                  localStorage.removeItem('unlocked_admin_agentic_searches');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {savedSearches.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <History className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium">No saved searches yet. Run a search to see historical results here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSearches.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadSavedSearch(item)}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 cursor-pointer transition-all space-y-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-2 flex items-center gap-1.5 text-base">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {item.location}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>{item.count} pros found</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Search Panel */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Category Quick Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Category / Trade
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CATEGORIES.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = category.toLowerCase() === preset.query.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCategory(preset.query);
                          setCustomQuery('');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location & Custom Category Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Target Category / Keyword</span>
                    <span className="text-[10px] text-slate-400 font-normal">Custom input or preset</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Plumber, Electrician, Dentist, Osteopath..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                      required
                    />
                    <Wrench className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Target Location / City / Neighborhood</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. Valencia, Ruzafa, Bordeaux</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Valencia, Spain or Ruzafa, Valencia..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all pl-10"
                      required
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Quick Locations */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Cities:</span>
                {PRESET_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      location.toLowerCase() === loc.toLowerCase()
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              {/* Toggle Advanced Agent Parameters */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showAdvanced ? 'Hide Advanced Agent Filters' : 'Show Advanced Agent Filters (Language, Free-form Prompt, Result Count)'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Language Preference</label>
                        <select
                          value={languagePreference}
                          onChange={(e) => setLanguagePreference(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        >
                          <option value="English">English-speaking</option>
                          <option value="French">French-speaking</option>
                          <option value="Spanish">Spanish-speaking</option>
                          <option value="Any">Any Language</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Number of Results</label>
                        <select
                          value={maxResults}
                          onChange={(e) => setMaxResults(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        >
                          <option value={3}>3 Professionals</option>
                          <option value={5}>5 Professionals (Recommended)</option>
                          <option value={8}>8 Professionals</option>
                          <option value={10}>10 Professionals</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Special Criteria</label>
                        <input
                          type="text"
                          value={specialRequirements}
                          onChange={(e) => setSpecialRequirements(e.target.value)}
                          placeholder="e.g. 24/7 Emergency, 4.5+ stars, Solar energy..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Optional Free-Form Agent Prompt (Overrides standard inputs if filled)
                      </label>
                      <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="e.g. Find 5 top-rated English-speaking pediatric dentists in Valencia with active websites and phone numbers"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSearching || !category.trim()}
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2.5"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                      <span>{searchStep || 'Searching with Google Agent...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <span>Run Live Agentic Search</span>
                    </>
                  )}
                </button>

                {results.length > 0 && !isSearching && (
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {results.length} real professionals discovered on Google
                  </span>
                )}
              </div>
            </form>

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Search Error</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Area */}
          {results.length > 0 && (
            <div className="space-y-4">
              {/* Results Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Display Mode:</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeViewMode === 'cards'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Pro Cards ({results.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveViewMode('raw')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeViewMode === 'raw'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Strict Markdown Format</span>
                    </button>
                    <button
                      onClick={() => setActiveViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeViewMode === 'table'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Table Overview</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCopyAllMarkdown}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAll ? 'Copied All!' : 'Copy Formatted Text'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="Download as .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="Download as .json"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* 1. Cards View */}
              {activeViewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {results.map((pro) => {
                    const isImported = importedIds.has(pro.id);
                    const isImporting = importingId === pro.id;
                    const isCopied = copiedId === pro.id;

                    return (
                      <div
                        key={pro.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Top Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                  {pro.sector}
                                </span>
                                {proCategories[pro.id] && proCategories[pro.id] !== pro.sector && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <Check className="w-2.5 h-2.5 text-amber-600" /> {proCategories[pro.id]}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold font-display text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                                {pro.name}
                              </h3>
                              <div className="text-[11px] font-mono text-slate-400">
                                ID: <span className="text-slate-600 font-semibold">{pro.formattedId}</span>
                              </div>
                            </div>

                            {/* Rating Badge */}
                            {pro.rating && pro.rating !== 'Not provided' && (
                              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl text-amber-900 font-bold text-xs shrink-0 shadow-xs">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span>{pro.rating}</span>
                              </div>
                            )}
                          </div>

                          {/* Category Manual Association Selector */}
                          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold shrink-0">
                              <Tag className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Catégorie :</span>
                            </div>
                            <div className="relative w-full max-w-[200px]">
                              <select
                                value={getProCategory(pro)}
                                onChange={(e) => setProCategory(pro.id, e.target.value)}
                                className="w-full pl-2 pr-6 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                                title="Associer à une catégorie existante avant l'importation"
                              >
                                {!allAvailableCategories.includes(pro.sector) && (
                                  <option value={pro.sector}>{pro.sector} (détecté)</option>
                                )}
                                <optgroup label="Catégories disponibles">
                                  {allAvailableCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown className="w-3 h-3" />
                              </div>
                            </div>
                          </div>

                          {/* Key Details List */}
                          <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                            {/* Location */}
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">
                                {pro.location}
                              </span>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                              {pro.phone !== 'Not provided' ? (
                                <a
                                  href={`tel:${pro.phone.replace(/\s+/g, '')}`}
                                  className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                                >
                                  {pro.phone}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Not provided</span>
                              )}
                            </div>

                            {/* Website */}
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                              {pro.website !== 'Not provided' ? (
                                <a
                                  href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold truncate flex items-center gap-1 hover:underline"
                                >
                                  <span className="truncate">{pro.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Not provided</span>
                              )}
                            </div>
                          </div>

                          {/* Highlights Box */}
                          {pro.highlights && (
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                              <span className="font-bold not-italic text-slate-900 block mb-0.5 text-[11px] uppercase tracking-wider">
                                Key Highlights / Specialty:
                              </span>
                              "{pro.highlights}"
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleCopySingle(pro)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy Markdown'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pro.name + ' ' + pro.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                              title="Search on Google Maps"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => handleImportPro(pro)}
                              disabled={isImported || isImporting}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isImported
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              }`}
                            >
                              {isImporting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Importing...</span>
                                </>
                              ) : isImported ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>In Directory</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Import to Pros</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Strict Markdown View */}
              {activeViewMode === 'raw' && (
                <div className="bg-slate-900 rounded-3xl p-6 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400 font-sans text-xs font-semibold">
                      Exact Structured Markdown Output (Ready to Copy/Paste)
                    </span>
                    <button
                      onClick={handleCopyAllMarkdown}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-sans font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAll ? 'Copied to Clipboard' : 'Copy All'}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed selection:bg-indigo-600 selection:text-white">
                    {rawMarkdown}
                  </pre>
                </div>
              )}

              {/* 3. Table Overview */}
              {activeViewMode === 'table' && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Business Name</th>
                          <th className="px-4 py-3">Formatted ID</th>
                          <th className="px-4 py-3 min-w-[180px]">Sector / Category</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Rating</th>
                          <th className="px-4 py-3">Website</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.map((pro) => (
                          <tr key={pro.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">{pro.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{pro.formattedId}</td>
                            <td className="px-4 py-3 text-slate-700">
                              <div className="relative max-w-[170px]">
                                <select
                                  value={getProCategory(pro)}
                                  onChange={(e) => setProCategory(pro.id, e.target.value)}
                                  className="w-full pl-2 pr-6 py-1 text-xs font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none truncate"
                                  title="Associer à une catégorie"
                                >
                                  {!allAvailableCategories.includes(pro.sector) && (
                                    <option value={pro.sector}>{pro.sector} (détecté)</option>
                                  )}
                                  <optgroup label="Catégories disponibles">
                                    {allAvailableCategories.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <ChevronDown className="w-3 h-3" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{pro.location}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{pro.phone}</td>
                            <td className="px-4 py-3 font-bold text-amber-700">{pro.rating}</td>
                            <td className="px-4 py-3">
                              {pro.website !== 'Not provided' ? (
                                <a
                                  href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  Link <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleImportPro(pro)}
                                disabled={importedIds.has(pro.id) || importingId === pro.id}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                  importedIds.has(pro.id)
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {importedIds.has(pro.id) ? 'Imported' : 'Import'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CSV Pro Importer Modal */}
      <CsvProImporterModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        existingCategories={allAvailableCategories}
        onSuccess={async (count) => {
          if (onRefetchPros) {
            await onRefetchPros();
          }
          if (setGlobalAlert) {
            setGlobalAlert({
              type: 'success',
              text: `Successfully imported ${count} professionals into the directory!`
            });
          }
        }}
        setGlobalAlert={setGlobalAlert}
      />
    </div>
  );
};
