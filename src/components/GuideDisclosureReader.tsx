import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  MapPin, 
  ExternalLink,
  Check,
  Share2,
  Phone,
  Mail,
  Globe,
  Compass,
  ArrowRight
} from 'lucide-react';

export interface GuideArticle {
  id?: string | number;
  title: string;
  excerpt?: string;
  content?: string;
  imageUrl?: string;
  image_url?: string;
  categoryTitle?: string;
  businessName?: string;
  business_name?: string;
  author?: {
    name?: string;
    role?: string;
    businessName?: string;
    business_name?: string;
    website?: string;
    email?: string;
    phone?: string;
  } | string;
}

interface ParsedSection {
  id: string;
  number: number;
  title: string;
  rawTitle: string;
  badge?: string;
  lines: string[];
  tipsCount: number;
  listItemsCount: number;
  wordCount: number;
}

// Inline Markdown parser for bold, italics, links, and code
export function parseInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Helper to parse bold (**text**) and italic (*text*) inside plain text segments
  const parseFormatting = (raw: string, keyPrefix: string): React.ReactNode[] => {
    const formattedParts: React.ReactNode[] = [];
    // Match **bold** or *italic* or `code`
    const formatRegex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g;
    let lastFormatIdx = 0;
    let formatMatch: RegExpExecArray | null;

    while ((formatMatch = formatRegex.exec(raw)) !== null) {
      if (formatMatch.index > lastFormatIdx) {
        formattedParts.push(raw.substring(lastFormatIdx, formatMatch.index));
      }
      if (formatMatch[2] !== undefined) {
        // Bold
        formattedParts.push(
          <strong key={`${keyPrefix}-b-${formatMatch.index}`} className="font-extrabold text-slate-900">
            {formatMatch[2]}
          </strong>
        );
      } else if (formatMatch[3] !== undefined) {
        // Italic
        formattedParts.push(
          <em key={`${keyPrefix}-i-${formatMatch.index}`} className="italic text-slate-800">
            {formatMatch[3]}
          </em>
        );
      } else if (formatMatch[4] !== undefined) {
        // Code
        formattedParts.push(
          <code key={`${keyPrefix}-c-${formatMatch.index}`} className="px-1.5 py-0.5 rounded bg-slate-100 text-teal-700 text-xs font-mono">
            {formatMatch[4]}
          </code>
        );
      }
      lastFormatIdx = formatRegex.lastIndex;
    }

    if (lastFormatIdx < raw.length) {
      formattedParts.push(raw.substring(lastFormatIdx));
    }
    return formattedParts.length > 0 ? formattedParts : [raw];
  };

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainSegment = text.substring(lastIndex, match.index);
      parts.push(...parseFormatting(plainSegment, `plain-${lastIndex}`));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={`link-${match.index}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-teal-600 hover:text-teal-700 font-bold underline underline-offset-2 inline-flex items-center gap-0.5 hover:opacity-90 transition-opacity"
      >
        <span>{linkText}</span>
        <ExternalLink className="w-3 h-3 inline-block shrink-0" />
      </a>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailingSegment = text.substring(lastIndex);
    parts.push(...parseFormatting(trailingSegment, `plain-end`));
  }

  return parts.length > 0 ? parts : text;
}

// Helper to determine callout type
function getCalloutType(line: string): { type: 'tip' | 'warning' | 'location' | 'info' | 'quote' | null; text: string } {
  const trimmed = line.trim();
  
  if (/^(💡|Astuce\s*:|Conseil\s*:|Pro-tip\s*:|Tip\s*:|Expert Tip\s*:)/i.test(trimmed)) {
    return {
      type: 'tip',
      text: trimmed.replace(/^(💡|Astuce\s*:|Conseil\s*:|Pro-tip\s*:|Tip\s*:|Expert Tip\s*:)\s*/i, '')
    };
  }
  if (/^(⚠️|Attention\s*:|Warning\s*:|Important\s*:|À éviter\s*:|Caution\s*:)/i.test(trimmed)) {
    return {
      type: 'warning',
      text: trimmed.replace(/^(⚠️|Attention\s*:|Warning\s*:|Important\s*:|À éviter\s*:|Caution\s*:)\s*/i, '')
    };
  }
  if (/^(📍|Adresse\s*:|Location\s*:|Où aller\s*:|Bon plan\s*:|Where to go\s*:|Address\s*:)/i.test(trimmed)) {
    return {
      type: 'location',
      text: trimmed.replace(/^(📍|Adresse\s*:|Location\s*:|Où aller\s*:|Bon plan\s*:|Where to go\s*:|Address\s*:)\s*/i, '')
    };
  }
  if (/^(ℹ️|Info\s*:|À savoir\s*:|Note\s*:|Good to know\s*:)/i.test(trimmed)) {
    return {
      type: 'info',
      text: trimmed.replace(/^(ℹ️|Info\s*:|À savoir\s*:|Note\s*:|Good to know\s*:)\s*/i, '')
    };
  }
  if (trimmed.startsWith('>')) {
    return {
      type: 'quote',
      text: trimmed.replace(/^>\s*/, '')
    };
  }
  return { type: null, text: trimmed };
}

// Parses raw markdown into cohesive sections for disclosure widgets
export function parseGuideContent(rawContent?: string, articleTitle?: string): { introLines: string[]; sections: ParsedSection[] } {
  if (!rawContent || !rawContent.trim()) {
    return { introLines: [], sections: [] };
  }

  const cleanText = rawContent.replace(/\r\n/g, '\n');
  const lines = cleanText.split('\n');

  const sections: ParsedSection[] = [];
  const introLines: string[] = [];
  let currentSection: ParsedSection | null = null;
  let sectionIndex = 1;

  const isHeadingLine = (trimmed: string): { isHeading: boolean; title: string; level: number; badge?: string } => {
    // Markdown headers: #, ##, ###, ####
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (mdMatch) {
      const level = mdMatch[1].length;
      let title = mdMatch[2].trim();
      // Remove trailing # if any
      title = title.replace(/\s+#+$/, '');
      return { isHeading: true, title, level };
    }

    // Numbered step pattern: "1. Title", "Step 1: Title", "Étape 1: Title", "Part 1: Title", "Partie 1: Title"
    const stepMatch = trimmed.match(/^(?:(Étape|Step|Partie|Part|Section)\s+(\d+)\s*[:\.\-]\s*|(\d+)[\.\-\)]\s+)(.+)$/i);
    if (stepMatch && trimmed.length < 90 && !trimmed.endsWith('.')) {
      const stepNumber = stepMatch[2] || stepMatch[3];
      const title = stepMatch[4].trim();
      const badge = stepNumber ? `Step ${stepNumber}` : undefined;
      return { isHeading: true, title, level: 2, badge };
    }

    // Bold title on its own line: **Title**
    const boldTitleMatch = trimmed.match(/^\*\*([^\*]+)\*\*$/);
    if (boldTitleMatch && trimmed.length < 80) {
      return { isHeading: true, title: boldTitleMatch[1].trim(), level: 3 };
    }

    return { isHeading: false, title: '', level: 0 };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentSection) {
        currentSection.lines.push('');
      } else {
        introLines.push('');
      }
      continue;
    }

    const headingInfo = isHeadingLine(trimmed);

    // If it's the very first H1 and matches the article title, treat it as title / intro
    if (headingInfo.isHeading && headingInfo.level === 1 && i === 0) {
      if (articleTitle && headingInfo.title.toLowerCase() === articleTitle.toLowerCase()) {
        continue;
      }
    }

    if (headingInfo.isHeading) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        id: `section-${sectionIndex}`,
        number: sectionIndex,
        title: headingInfo.title,
        rawTitle: headingInfo.title,
        badge: headingInfo.badge || `Part ${sectionIndex}`,
        lines: [],
        tipsCount: 0,
        listItemsCount: 0,
        wordCount: 0
      };
      sectionIndex++;
    } else {
      if (currentSection) {
        currentSection.lines.push(line);
        if (/^(💡|Astuce|Conseil|Pro-tip|Tip|⚠️|Attention|Warning|Important)/i.test(trimmed)) {
          currentSection.tipsCount++;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
          currentSection.listItemsCount++;
        }
        currentSection.wordCount += trimmed.split(/\s+/).length;
      } else {
        introLines.push(line);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // If no markdown headings were detected, let's gracefully split paragraphs into structured digestible sections
  if (sections.length === 0 && introLines.length > 0) {
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length >= 2) {
      const generatedSections: ParsedSection[] = paragraphs.map((para, idx) => {
        const pLines = para.split('\n');
        const firstLine = pLines[0].trim();
        let sectionTitle = `Step ${idx + 1}`;
        let contentLines = pLines;

        // Try extracting first sentence or bold line as title
        if (firstLine.length < 60 && !firstLine.endsWith('.')) {
          sectionTitle = firstLine.replace(/^\*\*|\*\*$/g, '');
          contentLines = pLines.slice(1);
        } else {
          const firstSentence = firstLine.split(/[.!?]/)[0];
          if (firstSentence && firstSentence.length < 50) {
            sectionTitle = firstSentence.trim();
          } else {
            sectionTitle = idx === 0 ? "Overview & Context" : idx === paragraphs.length - 1 ? "Practical Advice & Next Steps" : `Key Point ${idx + 1}`;
          }
        }

        return {
          id: `section-gen-${idx + 1}`,
          number: idx + 1,
          title: sectionTitle,
          rawTitle: sectionTitle,
          badge: `Part ${idx + 1}`,
          lines: contentLines,
          tipsCount: 0,
          listItemsCount: contentLines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')).length,
          wordCount: para.split(/\s+/).length
        };
      });

      return {
        introLines: [],
        sections: generatedSections
      };
    }
  }

  return { introLines, sections };
}

// Renders lines inside an expanded disclosure section
function SectionContentRenderer({ lines }: { lines: string[] }) {
  const elements: React.ReactNode[] = [];
  let currentList: { items: string[]; type: 'bullet' | 'ordered' } | null = null;

  const flushList = (keySuffix: number) => {
    if (currentList && currentList.items.length > 0) {
      elements.push(
        <ul key={`list-${keySuffix}`} className="space-y-2.5 my-3 pl-1 text-slate-700">
          {currentList.items.map((item, itemIdx) => (
            <li key={`item-${itemIdx}`} className="flex items-start gap-2.5 text-sm md:text-[15px] leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">
                <Check className="w-3 h-3 stroke-[2.5]" />
              </span>
              <div className="flex-1 text-slate-700">
                {parseInlineMarkdown(item)}
              </div>
            </li>
          ))}
        </ul>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(i);
      continue;
    }

    // Sub-sub headings: ### Subtitle
    if (trimmed.startsWith('###') || trimmed.startsWith('####')) {
      flushList(i);
      const subTitle = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div key={`subhead-${i}`} className="pt-3 pb-1">
          <h4 className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
            {parseInlineMarkdown(subTitle)}
          </h4>
        </div>
      );
      continue;
    }

    // Callouts: Tip, Warning, Location, Quote, Info
    const callout = getCalloutType(line);
    if (callout.type) {
      flushList(i);
      if (callout.type === 'tip') {
        elements.push(
          <div key={`tip-${i}`} className="my-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-900 uppercase tracking-wider mb-0.5">Expert Tip</p>
              <div className="text-xs md:text-sm text-amber-950/90 leading-relaxed">
                {parseInlineMarkdown(callout.text)}
              </div>
            </div>
          </div>
        );
      } else if (callout.type === 'warning') {
        elements.push(
          <div key={`warn-${i}`} className="my-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-rose-900 uppercase tracking-wider mb-0.5">Important Notice</p>
              <div className="text-xs md:text-sm text-rose-950/90 leading-relaxed">
                {parseInlineMarkdown(callout.text)}
              </div>
            </div>
          </div>
        );
      } else if (callout.type === 'location') {
        elements.push(
          <div key={`loc-${i}`} className="my-3 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-teal-900 uppercase tracking-wider mb-0.5">Location & Landmark</p>
              <div className="text-xs md:text-sm text-teal-950/90 leading-relaxed">
                {parseInlineMarkdown(callout.text)}
              </div>
            </div>
          </div>
        );
      } else if (callout.type === 'info') {
        elements.push(
          <div key={`info-${i}`} className="my-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-blue-900 uppercase tracking-wider mb-0.5">Good to Know</p>
              <div className="text-xs md:text-sm text-blue-950/90 leading-relaxed">
                {parseInlineMarkdown(callout.text)}
              </div>
            </div>
          </div>
        );
      } else if (callout.type === 'quote') {
        elements.push(
          <blockquote key={`quote-${i}`} className="my-3 pl-4 py-1.5 border-l-3 border-teal-500 italic text-slate-700 text-sm md:text-[15px] bg-slate-50/60 rounded-r-xl pr-3">
            {parseInlineMarkdown(callout.text)}
          </blockquote>
        );
      }
      continue;
    }

    // List items: - or * or numbered
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      if (!currentList) {
        currentList = { items: [itemText], type: 'bullet' };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Regular paragraph line
    flushList(i);
    elements.push(
      <p key={`p-${i}`} className="text-sm md:text-[15px] text-slate-700 leading-relaxed my-2">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList(lines.length);
  return <div className="space-y-1">{elements}</div>;
}

export function GuideDisclosureReader({ article }: { article: GuideArticle }) {
  const { introLines, sections } = useMemo(() => {
    return parseGuideContent(article.content, article.title);
  }, [article.content, article.title]);

  // Section open/closed state: First section is open by default for immediate preview
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (sections.length > 0) {
      initial.add(sections[0].id);
      // If there are only 2 sections, open both by default
      if (sections.length === 2) {
        initial.add(sections[1].id);
      }
    }
    return initial;
  });

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleSection = (id: string) => {
    setOpenSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenSectionIds(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setOpenSectionIds(new Set());
  };

  const scrollToSection = (id: string) => {
    // Make sure section is expanded
    setOpenSectionIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      const el = sectionRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Interactive Quick Nav Table of Contents (Chips) */}
      {sections.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600 pl-1">
            Table of contents:
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
            {sections.map((sec, idx) => {
              const isOpen = openSectionIds.has(sec.id);
              return (
                <button
                  key={`chip-${sec.id}`}
                  onClick={() => scrollToSection(sec.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isOpen
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:border-teal-500/40 hover:bg-teal-50/40'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                    isOpen ? 'bg-teal-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="max-w-[140px] sm:max-w-[200px] truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Introduction / Key Takeaway Card ("At a Glance") */}
      {(article.excerpt || introLines.length > 0) && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-amber-500/5 to-slate-50 border border-teal-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-800">
                  Key Takeaways
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 text-slate-500 border border-slate-200/50">
                  Practical Guide
                </span>
              </div>

              {article.excerpt && (
                <p className="text-sm md:text-[15px] font-medium text-slate-800 leading-relaxed italic">
                  "{article.excerpt}"
                </p>
              )}

              {introLines.length > 0 && (
                <div className="pt-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                  <SectionContentRenderer lines={introLines} />
                </div>
              )}

              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-slate-500 border-t border-teal-500/15">
                <Compass className="w-3.5 h-3.5 text-teal-600" />
                <span>Written by <strong className="text-slate-800 font-extrabold">{typeof article.author === 'object' ? article.author?.name || 'MyCityUnlocked' : article.author || 'MyCityUnlocked'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Structured Disclosure Widgets (Accordions) */}
      <div className="space-y-3.5">
        {sections.map((sec, idx) => {
          const isOpen = openSectionIds.has(sec.id);
          const displayNumber = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={sec.id}
              ref={el => { sectionRefs.current[sec.id] = el; }}
              className={`rounded-2xl md:rounded-3xl border transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? 'bg-white border-teal-500/30 shadow-md ring-1 ring-teal-500/15' 
                  : 'bg-white hover:bg-slate-50/50 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Disclosure Trigger Header */}
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                aria-expanded={isOpen}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer outline-none group"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Step Number Badge */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs sm:text-sm transition-transform duration-200 group-hover:scale-105 ${
                    isOpen
                      ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/30'
                      : 'bg-slate-100 text-slate-700 border border-slate-200/80 group-hover:bg-teal-50 group-hover:text-teal-700'
                  }`}>
                    {displayNumber}
                  </div>

                  {/* Title & Badge */}
                  <div className="min-w-0 space-y-0.5">
                    {sec.badge && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 block">
                        {sec.badge}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base md:text-[17px] font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug line-clamp-2">
                      {sec.title}
                    </h3>
                  </div>
                </div>

                {/* Right side stats & Chevron */}
                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  {!isOpen && sec.listItemsCount > 0 && (
                    <span className="hidden sm:inline-flex text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {sec.listItemsCount} points
                    </span>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isOpen 
                      ? 'bg-teal-50 text-teal-700 rotate-180' 
                      : 'bg-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>
              </button>

              {/* Collapsible Body */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={`content-${sec.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 border-t border-slate-100 bg-slate-50/30">
                      <SectionContentRenderer lines={sec.lines} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* If article has no content */}
      {sections.length === 0 && !article.excerpt && introLines.length === 0 && (
        <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200 text-slate-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">Guide content is currently being prepared.</p>
        </div>
      )}
    </div>
  );
}
