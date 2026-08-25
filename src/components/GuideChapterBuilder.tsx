import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Lightbulb, 
  AlertTriangle, 
  MapPin, 
  Info, 
  FileText, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Code
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface GuideChapterDraft {
  id: string;
  title: string;
  body: string;
  calloutType?: 'none' | 'tip' | 'warning' | 'location' | 'info';
  calloutText?: string;
}

interface GuideChapterBuilderProps {
  initialMarkdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

// Convert markdown text containing ## into structured chapters
export function parseMarkdownToChapters(markdown: string, existingChapters: GuideChapterDraft[] = []): { intro: string; chapters: GuideChapterDraft[] } {
  if (!markdown || !markdown.trim()) {
    return { intro: '', chapters: [] };
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const chapters: GuideChapterDraft[] = [];
  let introLines: string[] = [];
  let currentChapter: GuideChapterDraft | null = null;
  let currentBodyLines: string[] = [];

  const finalizeCurrentChapter = () => {
    if (currentChapter) {
      // Look for callouts at the end or inside lines
      const bodyLines: string[] = [];
      let calloutType: 'none' | 'tip' | 'warning' | 'location' | 'info' = 'none';
      let calloutText = '';

      for (const line of currentBodyLines) {
        const trimmed = line.trim();
        if (/^(💡|Astuce\s*:|Conseil\s*:|Pro-tip\s*:|Tip\s*:|Expert Tip\s*:)/i.test(trimmed)) {
          calloutType = 'tip';
          calloutText = trimmed.replace(/^(💡|Astuce\s*:|Conseil\s*:|Pro-tip\s*:|Tip\s*:|Expert Tip\s*:)\s*/i, '');
        } else if (/^(⚠️|Attention\s*:|Warning\s*:|Important\s*:|À éviter\s*:|Caution\s*:)/i.test(trimmed)) {
          calloutType = 'warning';
          calloutText = trimmed.replace(/^(⚠️|Attention\s*:|Warning\s*:|Important\s*:|À éviter\s*:|Caution\s*:)\s*/i, '');
        } else if (/^(📍|Adresse\s*:|Location\s*:|Où aller\s*:|Bon plan\s*:|Where to go\s*:|Address\s*:)/i.test(trimmed)) {
          calloutType = 'location';
          calloutText = trimmed.replace(/^(📍|Adresse\s*:|Location\s*:|Où aller\s*:|Bon plan\s*:|Where to go\s*:|Address\s*:)\s*/i, '');
        } else if (/^(ℹ️|Info\s*:|À savoir\s*:|Note\s*:|Good to know\s*:)/i.test(trimmed)) {
          calloutType = 'info';
          calloutText = trimmed.replace(/^(ℹ️|Info\s*:|À savoir\s*:|Note\s*:|Good to know\s*:)\s*/i, '');
        } else {
          bodyLines.push(line);
        }
      }

      currentChapter.body = bodyLines.join('\n').trim();
      currentChapter.calloutType = calloutType;
      currentChapter.calloutText = calloutText;
      chapters.push(currentChapter);
    }
  };

  let chapterCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect markdown header 2 (## Title) or (### Title)
    const headerMatch = trimmed.match(/^(?:##|###)\s*(?:(?:\d+[\.\-\)]\s*)|(?:(?:Step|Étape|Part|Section)\s*\d+[:\.\-]\s*))?(.*)$/i);
    
    if (trimmed.startsWith('## ') || (headerMatch && headerMatch[1])) {
      finalizeCurrentChapter();

      // Clean the title
      let rawTitle = trimmed.replace(/^#{2,3}\s*/, '').trim();
      // Remove any leading numbers like "1. " so the editor manages numbering smoothly
      rawTitle = rawTitle.replace(/^\d+[\.\-\)]\s*/, '').replace(/^(?:Step|Étape|Part|Section)\s*\d+[:\.\-]\s*/i, '').trim();

      const existingId = existingChapters[chapterCount]?.id;
      currentChapter = {
        id: existingId || `chap-stable-${chapterCount}-${Math.random().toString(36).substring(2, 6)}`,
        title: rawTitle,
        body: '',
        calloutType: 'none',
        calloutText: ''
      };
      chapterCount++;
      currentBodyLines = [];
    } else {
      if (currentChapter) {
        currentBodyLines.push(line);
      } else {
        introLines.push(line);
      }
    }
  }

  finalizeCurrentChapter();

  return {
    intro: introLines.join('\n').trim(),
    chapters
  };
}

// Convert structured chapters back into clean Markdown
export function buildMarkdownFromChapters(intro: string, chapters: GuideChapterDraft[]): string {
  const parts: string[] = [];

  if (intro && intro.trim()) {
    parts.push(intro.trim());
  }

  chapters.forEach((chap, idx) => {
    const chapNum = idx + 1;
    const chapTitle = chap.title.trim() || `Chapter ${chapNum}`;
    
    const lines: string[] = [`## ${chapTitle}`];

    if (chap.body && chap.body.trim()) {
      lines.push(chap.body.trim());
    }

    if (chap.calloutText && chap.calloutText.trim() && chap.calloutType && chap.calloutType !== 'none') {
      let prefix = '💡 Expert Tip: ';
      if (chap.calloutType === 'warning') prefix = '⚠️ Important: ';
      if (chap.calloutType === 'location') prefix = '📍 Location: ';
      if (chap.calloutType === 'info') prefix = 'ℹ️ Note: ';
      
      lines.push(`${prefix}${chap.calloutText.trim()}`);
    }

    parts.push(lines.join('\n\n'));
  });

  return parts.join('\n\n');
}

export function GuideChapterBuilder({ initialMarkdown, onChangeMarkdown }: GuideChapterBuilderProps) {
  const [mode, setMode] = useState<'structured' | 'raw'>('structured');
  const [introText, setIntroText] = useState('');
  const [chapters, setChapters] = useState<GuideChapterDraft[]>([]);
  const [rawText, setRawText] = useState(initialMarkdown || '');
  
  // Track last markdown emitted to prevent feedback loop re-renderings from prop updates
  const lastEmittedMdRef = useRef<string>(initialMarkdown || '');
  const isInitialMount = useRef<boolean>(true);

  // Initialize from initialMarkdown only when external value changes (e.g. user selected different article or opened form)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setRawText(initialMarkdown || '');
      lastEmittedMdRef.current = initialMarkdown || '';
      const parsed = parseMarkdownToChapters(initialMarkdown || []);
      setIntroText(parsed.intro);
      if (parsed.chapters.length > 0) {
        setChapters(parsed.chapters);
      } else {
        setChapters([
          {
            id: 'chap-init-1',
            title: '',
            body: '',
            calloutType: 'none',
            calloutText: ''
          }
        ]);
      }
      return;
    }

    // If change came from our own local edit, do not overwrite local chapters state
    if (initialMarkdown === lastEmittedMdRef.current) {
      return;
    }

    // External change (e.g. form reset or selected different article)
    setRawText(initialMarkdown || '');
    lastEmittedMdRef.current = initialMarkdown || '';
    const parsed = parseMarkdownToChapters(initialMarkdown || []);
    setIntroText(parsed.intro);
    if (parsed.chapters.length > 0) {
      setChapters(parsed.chapters);
    }
  }, [initialMarkdown]);

  // Sync to parent when structured fields change
  const handleUpdate = (newIntro: string, newChapters: GuideChapterDraft[]) => {
    setIntroText(newIntro);
    setChapters(newChapters);
    const md = buildMarkdownFromChapters(newIntro, newChapters);
    setRawText(md);
    lastEmittedMdRef.current = md;
    onChangeMarkdown(md);
  };

  // Raw editor change
  const handleRawChange = (val: string) => {
    setRawText(val);
    lastEmittedMdRef.current = val;
    onChangeMarkdown(val);
    const parsed = parseMarkdownToChapters(val, chapters);
    setIntroText(parsed.intro);
    setChapters(parsed.chapters);
  };

  // Chapter helpers
  const handleAddChapter = () => {
    const newChap: GuideChapterDraft = {
      id: 'chap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: '',
      body: '',
      calloutType: 'none',
      calloutText: ''
    };
    const updated = [...chapters, newChap];
    handleUpdate(introText, updated);
  };

  const handleRemoveChapter = (index: number) => {
    const updated = chapters.filter((_, i) => i !== index);
    handleUpdate(introText, updated);
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;
    
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...chapters];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    handleUpdate(introText, updated);
  };

  const handleChapterFieldChange = (index: number, field: keyof GuideChapterDraft, value: any) => {
    const updated = [...chapters];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    handleUpdate(introText, updated);
  };

  return (
    <div className="space-y-4">
      {/* View Mode Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-2 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (mode === 'raw') {
                const parsed = parseMarkdownToChapters(rawText);
                setIntroText(parsed.intro);
                setChapters(parsed.chapters.length > 0 ? parsed.chapters : [{
                  id: 'chap-' + Date.now(),
                  title: '',
                  body: '',
                  calloutType: 'none',
                  calloutText: ''
                }]);
              }
              setMode('structured');
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              mode === 'structured'
                ? "bg-white text-orange-600 shadow-xs border border-orange-200"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Structured Chapter Editor (Recommended)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('raw')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              mode === 'raw'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Code className="w-3.5 h-3.5 text-slate-500" />
            <span>Raw Markdown Code</span>
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 pr-2">
          {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} configured
        </span>
      </div>

      {mode === 'raw' ? (
        /* Raw Markdown View */
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">
            Write or paste raw Markdown. Use <code className="bg-slate-200 px-1 py-0.5 rounded text-orange-700 font-mono">## 1. Chapter Title</code> to create collapsible sections.
          </p>
          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => handleRawChange(e.target.value)}
            placeholder="## 1. Chapter Title&#10;Write chapter text here...&#10;&#10;💡 Expert Tip: Special advice..."
            className="w-full text-xs font-mono p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40 leading-relaxed resize-y"
          />
        </div>
      ) : (
        /* Structured Mode with Separate Chapters */
        <div className="space-y-6">
          {/* Optional Introduction / Preamble */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Optional Introduction / Preamble (Before chapters)
              </label>
              <span className="text-[10px] text-slate-400">Displayed at top before accordion sections</span>
            </div>
            <textarea
              rows={2}
              value={introText}
              onChange={(e) => handleUpdate(e.target.value, chapters)}
              placeholder="e.g. Relocating to Valencia is an exciting journey. Here is everything you need to know..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 resize-y"
            />
          </div>

          {/* Chapters List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Article Chapters</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {chapters.length}
                </span>
              </h5>
              <button
                type="button"
                onClick={handleAddChapter}
                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Chapter
              </button>
            </div>

            {chapters.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                <p className="text-xs text-slate-500 font-medium">No chapters yet. Click below to add your first chapter block.</p>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="px-4 py-2 bg-white text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Add First Chapter
                </button>
              </div>
            ) : (
              chapters.map((chap, index) => (
                <div 
                  key={chap.id || index}
                  className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4 hover:border-orange-200 transition-colors"
                >
                  {/* Chapter Header Card Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Chapter {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveChapter(index, 'up')}
                        title="Move Up"
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={index === chapters.length - 1}
                        onClick={() => handleMoveChapter(index, 'down')}
                        title="Move Down"
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveChapter(index)}
                        title="Delete Chapter"
                        className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Chapter Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Chapter Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ruzafa & Ensanche: Vibrant Urban Lifestyle"
                      value={chap.title}
                      onChange={(e) => handleChapterFieldChange(index, 'title', e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900"
                    />
                  </div>

                  {/* Chapter Content / Paragraphs & Bullets */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Chapter Body Text & Bullet Points
                      </label>
                      <span className="text-[10px] text-slate-400">Use dashes (-) for bullet lists</span>
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Write your paragraphs here...&#10;- Ideal for: Young professionals and creatives&#10;- Highlights: Bustling cafe culture and easy commute"
                      value={chap.body}
                      onChange={(e) => handleChapterFieldChange(index, 'body', e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 leading-relaxed resize-y font-sans"
                    />
                  </div>

                  {/* Optional Highlight Callout Box (Tip, Warning, Location) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Callout Banner (Optional highlighted box)
                      </label>

                      {/* Callout type selector buttons */}
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'none', label: 'None' },
                          { id: 'tip', label: '💡 Tip', icon: Lightbulb },
                          { id: 'warning', label: '⚠️ Warning', icon: AlertTriangle },
                          { id: 'location', label: '📍 Location', icon: MapPin },
                          { id: 'info', label: 'ℹ️ Info', icon: Info },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleChapterFieldChange(index, 'calloutType', t.id)}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                              (chap.calloutType || 'none') === t.id
                                ? "bg-white text-slate-900 shadow-2xs border border-slate-300"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {chap.calloutType && chap.calloutType !== 'none' && (
                      <input
                        type="text"
                        placeholder={
                          chap.calloutType === 'tip' ? 'e.g. Apartments on pedestrian streets can be noisy on weekends; look for double glazing.' :
                          chap.calloutType === 'warning' ? 'e.g. Under Spanish law, agency fees for long-term leases are paid by the landlord!' :
                          chap.calloutType === 'location' ? 'e.g. Visit the Mercado Central in Ciutat Vella for fresh seafood and produce.' :
                          'e.g. Bus routes run until midnight on weekdays.'
                        }
                        value={chap.calloutText || ''}
                        onChange={(e) => handleChapterFieldChange(index, 'calloutText', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                      />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Bottom Add Chapter Button */}
            {chapters.length > 0 && (
              <button
                type="button"
                onClick={handleAddChapter}
                className="w-full py-3 bg-slate-50 hover:bg-orange-50/60 text-orange-600 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Another Chapter (Chapter {chapters.length + 1})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
