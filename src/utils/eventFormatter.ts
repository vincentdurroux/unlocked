import { isSameDay } from '../services/eventService';

export const MONTH_ABBRS: Record<number, string> = {
  0: 'JAN',
  1: 'FEB',
  2: 'MAR',
  3: 'APR',
  4: 'MAY',
  5: 'JUN',
  6: 'JUL',
  7: 'AUG',
  8: 'SEP',
  9: 'OCT',
  10: 'NOV',
  11: 'DEC'
};

const MONTH_NAMES_MAP: Record<string, string> = {
  'jan': 'JAN', 'january': 'JAN', 'janv': 'JAN', 'janvier': 'JAN', 'enero': 'JAN',
  'feb': 'FEB', 'february': 'FEB', 'fevr': 'FEB', 'février': 'FEB', 'febrero': 'FEB',
  'mar': 'MAR', 'march': 'MAR', 'mars': 'MAR', 'marzo': 'MAR',
  'apr': 'APR', 'april': 'APR', 'avr': 'APR', 'avril': 'APR', 'abril': 'APR',
  'may': 'MAY', 'mai': 'MAY', 'mayo': 'MAY',
  'jun': 'JUN', 'june': 'JUN', 'juin': 'JUN', 'junio': 'JUN',
  'jul': 'JUL', 'july': 'JUL', 'juil': 'JUL', 'juillet': 'JUL', 'julio': 'JUL',
  'aug': 'AUG', 'august': 'AUG', 'août': 'AUG', 'aout': 'AUG', 'agosto': 'AUG',
  'sep': 'SEP', 'september': 'SEP', 'sept': 'SEP', 'septembre': 'SEP', 'septiembre': 'SEP',
  'oct': 'OCT', 'october': 'OCT', 'octobre': 'OCT', 'octubre': 'OCT',
  'nov': 'NOV', 'november': 'NOV', 'novembre': 'NOV', 'noviembre': 'NOV',
  'dec': 'DEC', 'december': 'DEC', 'déc': 'DEC', 'décembre': 'DEC', 'diciembre': 'DEC'
};

/**
 * Normalizes a single date string into a clean, harmonized "MMM DD" format (e.g. "OCT 15")
 */
export function normalizeSingleDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  if (/year[- ]round|toute l'ann|permanent/i.test(trimmed)) {
    return 'YEAR ROUND';
  }

  // 1. Check if ISO or full parseable date: e.g. "2026-10-15" or "2026-10-15T00:00:00"
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const parts = trimmed.split(/[-T\s]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && month >= 0 && month <= 11) {
      const monthAbbr = MONTH_ABBRS[month] || 'OCT';
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      return `${monthAbbr} ${dayStr}`;
    }
  }

  // 2. Check format "DD/MM/YYYY" or "DD-MM-YYYY"
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    if (!isNaN(month) && !isNaN(day) && month >= 0 && month <= 11) {
      const monthAbbr = MONTH_ABBRS[month] || 'OCT';
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      return `${monthAbbr} ${dayStr}`;
    }
  }

  // 3. Check format like "OCT 15" or "OCTOBER 15" or "15 OCT"
  const tokens = trimmed.replace(/,/g, '').split(/\s+/);
  if (tokens.length >= 2) {
    let foundMonth: string | null = null;
    let foundDay: number | null = null;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (MONTH_NAMES_MAP[lower]) {
        foundMonth = MONTH_NAMES_MAP[lower];
      } else {
        const num = parseInt(token, 10);
        if (!isNaN(num) && num >= 1 && num <= 31) {
          foundDay = num;
        }
      }
    }

    if (foundMonth && foundDay !== null) {
      const dayStr = foundDay < 10 ? `0${foundDay}` : `${foundDay}`;
      return `${foundMonth} ${dayStr}`;
    }
  }

  // 4. Try Standard Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const m = MONTH_ABBRS[d.getMonth()] || 'OCT';
    const day = d.getDate();
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    return `${m} ${dayStr}`;
  }

  // Return uppercase clean representation if unrecognized
  return trimmed.toUpperCase();
}

/**
 * Harmonizes and formats the full date display of an event (handling start & optional end date)
 */
export function formatEventDate(startDate?: string | null, endDate?: string | null, legacyDate?: string | null): string {
  const startRaw = startDate || legacyDate || '';
  const sNorm = normalizeSingleDate(startRaw);

  if (!sNorm) return 'UPCOMING';

  if (!endDate) return sNorm;

  const eNorm = normalizeSingleDate(endDate);
  if (!eNorm || eNorm === sNorm || isSameDay(startRaw, endDate)) {
    return sNorm;
  }

  return `${sNorm} - ${eNorm}`;
}

/**
 * Harmonizes time display (e.g. "19:00" or "10:00 AM - 01:00 PM")
 */
export function formatEventTime(startTime?: string | null, endTime?: string | null, legacyTime?: string | null): string {
  const start = startTime || legacyTime || '';
  if (!start) return '';
  if (!endTime || endTime.trim() === start.trim()) return start.trim();
  return `${start.trim()} - ${endTime.trim()}`;
}

/**
 * Parses an event date string or tokens into a Date object (set to end of day 23:59:59).
 */
export function getEventEndDate(event: { start_date?: string | null; end_date?: string | null; date?: string | null }, referenceYear = new Date().getFullYear()): Date | null {
  const targetStr = event.end_date || event.start_date || event.date;
  if (!targetStr || typeof targetStr !== 'string') return null;

  const trimmed = targetStr.trim();
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d, 23, 59, 59, 999);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    return new Date(y, m, d, 23, 59, 59, 999);
  }

  // 3. Formats with month names, e.g. "OCT 24", "NOV 12 - NOV 20", "24 OCT 2026", "24 OCT"
  let strToEvaluate = trimmed;
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    strToEvaluate = parts[parts.length - 1].trim();
  }

  const tokens = strToEvaluate.replace(/,/g, '').split(/\s+/);
  let foundMonth: number | null = null;
  let foundDay: number | null = null;
  let foundYear = referenceYear;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (MONTH_NAMES_MAP[lower]) {
      const monthAbbr = MONTH_NAMES_MAP[lower];
      const mIdx = Object.values(MONTH_ABBRS).indexOf(monthAbbr);
      if (mIdx !== -1) foundMonth = mIdx;
    } else {
      const num = parseInt(token, 10);
      if (!isNaN(num)) {
        if (num > 1900 && num < 2100) {
          foundYear = num;
        } else if (num >= 1 && num <= 31 && foundDay === null) {
          foundDay = num;
        }
      }
    }
  }

  if (foundMonth !== null && foundDay !== null) {
    return new Date(foundYear, foundMonth, foundDay, 23, 59, 59, 999);
  }

  // 4. Try native Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  return null;
}

/**
 * Parses an event start date string into a Date object (set to start of day 00:00:00).
 */
export function getEventStartDate(event: { start_date?: string | null; end_date?: string | null; date?: string | null }, referenceYear = new Date().getFullYear()): Date | null {
  const targetStr = event.start_date || event.date;
  if (!targetStr || typeof targetStr !== 'string') return null;

  const trimmed = targetStr.trim();
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  // 3. Formats with month names, e.g. "OCT 24", "NOV 12 - NOV 20", "24 OCT 2026"
  let strToEvaluate = trimmed;
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    strToEvaluate = parts[0].trim();
  }

  const tokens = strToEvaluate.replace(/,/g, '').split(/\s+/);
  let foundMonth: number | null = null;
  let foundDay: number | null = null;
  let foundYear = referenceYear;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (MONTH_NAMES_MAP[lower]) {
      const monthAbbr = MONTH_NAMES_MAP[lower];
      const mIdx = Object.values(MONTH_ABBRS).indexOf(monthAbbr);
      if (mIdx !== -1) foundMonth = mIdx;
    } else {
      const num = parseInt(token, 10);
      if (!isNaN(num)) {
        if (num > 1900 && num < 2100) {
          foundYear = num;
        } else if (num >= 1 && num <= 31 && foundDay === null) {
          foundDay = num;
        }
      }
    }
  }

  if (foundMonth !== null && foundDay !== null) {
    return new Date(foundYear, foundMonth, foundDay, 0, 0, 0, 0);
  }

  // 4. Try native Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Detects if an event is a "Year Round" / permanent / ongoing event.
 */
export function isYearRoundEvent(event: {
  start_date?: string | null;
  end_date?: string | null;
  date?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string | null;
  category?: string | null;
}): boolean {
  const dates = `${event.start_date || ''} ${event.end_date || ''} ${event.date || ''}`.trim();
  if (/year[- ]round|toute l'ann[ée]e|permanent|all[- ]year|ongoing|annual/i.test(dates)) {
    return true;
  }
  const norm = normalizeSingleDate(event.start_date || event.date);
  if (norm === 'YEAR ROUND') {
    return true;
  }
  const metadata = `${event.title || ''} ${event.tags || ''} ${event.category || ''}`.toLowerCase();
  if (/(#|\b)(year[- ]round|permanent|toute[- ]l['’]ann[ée]e)\b/i.test(metadata)) {
    return true;
  }
  return false;
}

/**
 * Checks whether an event (particularly year-round) is open on the weekend (Saturday and/or Sunday).
 */
export function isEventOpenOnWeekend(event: {
  time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  tags?: string | null;
  title?: string | null;
}): boolean {
  const content = `${event.time || ''} ${event.start_time || ''} ${event.end_time || ''} ${event.description || ''} ${event.tags || ''} ${event.title || ''}`.toLowerCase();

  // 1. Explicitly closed on weekends / Saturdays / Sundays
  if (
    /closed\s+(on\s+)?(the\s+)?(weekends?|saturdays?\s*(and|&)\s*sundays?)/i.test(content) ||
    /ferm[ée](s)?\s+(le\s+)?(week[- ]?end|samedi\s*(et|&)\s*dimanche)/i.test(content) ||
    /cerrado\s+(los\s+)?(fines\s+de\s+semana|s[aá]bados\s*(y|&)\s*domingos)/i.test(content) ||
    /ferm[ée](s)?\s+samedi\s*(et|&)\s*dimanche/i.test(content) ||
    /closed\s+saturdays?\s*(&|and)\s*sundays?/i.test(content)
  ) {
    return false;
  }

  // 2. Weekdays only (en semaine uniquement, solo días laborables)
  if (
    /\b(weekdays?\s+only|only\s+on\s+weekdays?)\b/i.test(content) ||
    /\b(en\s+semaine\s+uniquement|uniquement\s+en\s+semaine|en\s+semaine\s+seulement)\b/i.test(content) ||
    /\b(solo\s+d[ií]as\s+laborables|solo\s+entre\s+semana)\b/i.test(content)
  ) {
    return false;
  }

  // 3. Monday to Friday pattern without weekend mention
  const hasMonToFri =
    /\b(mon(day)?\s*(-|to)\s*fri(day)?)\b/i.test(content) ||
    /\b(lun(di)?\s*(-|au)\s*ven(dredi)?)\b/i.test(content) ||
    /\b(lun(es)?\s*(-|a)\s*vie(rnes)?)\b/i.test(content);

  if (hasMonToFri) {
    // If it mentions Monday-Friday, does it also explicitly list weekend opening (e.g. "Sat: 10:00-14:00" or "samedi")?
    const hasWeekendOpening =
      /\b(sat(urday)?|sam(edi)?|s[aá]b(ado)?|sun(day)?|dim(anche)?|dom(ingo)?)\s*[:\-–0-9]/i.test(content) ||
      /\b(week[- ]?end|open\s+sat|ouvert\s+le\s+samedi|ouvert\s+le\s+dimanche|open\s+sun)\b/i.test(content);
    if (!hasWeekendOpening) {
      return false;
    }
  }

  // Default: Open on weekends unless restricted
  return true;
}

/**
 * Checks whether an event is closed on a specific day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 */
export function isEventClosedOnDayOfWeek(content: string, dayOfWeek: number): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();

  switch (dayOfWeek) {
    case 0: // Sunday
      return (
        /closed\s+(on\s+)?sundays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?dimanche/i.test(lower) ||
        /cerrado\s+(los\s+)?domingos?/i.test(lower)
      );
    case 1: // Monday
      return (
        /closed\s+(on\s+)?mondays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?lundi/i.test(lower) ||
        /cerrado\s+(los\s+)?lunes/i.test(lower)
      );
    case 2: // Tuesday
      return (
        /closed\s+(on\s+)?tuesdays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?mardi/i.test(lower) ||
        /cerrado\s+(los\s+)?martes/i.test(lower)
      );
    case 3: // Wednesday
      return (
        /closed\s+(on\s+)?wednesdays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?mercredi/i.test(lower) ||
        /cerrado\s+(los\s+)?mi[eé]rcoles/i.test(lower)
      );
    case 4: // Thursday
      return (
        /closed\s+(on\s+)?thursdays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?jeudi/i.test(lower) ||
        /cerrado\s+(los\s+)?jueves/i.test(lower)
      );
    case 5: // Friday
      return (
        /closed\s+(on\s+)?fridays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?vendredi/i.test(lower) ||
        /cerrado\s+(los\s+)?viernes/i.test(lower)
      );
    case 6: // Saturday
      return (
        /closed\s+(on\s+)?saturdays?/i.test(lower) ||
        /ferm[ée](s)?\s+(le\s+)?samedi/i.test(lower) ||
        /cerrado\s+(los\s+)?s[aá]bados?/i.test(lower)
      );
    default:
      return false;
  }
}

/**
 * Checks whether an event matches a selected date filter: 'all' | 'today' | 'tomorrow' | 'weekend'.
 * Properly handles:
 * - "Year Round" / permanent events (visible on today, tomorrow, and weekend IF open on the weekend).
 * - Multi-day date ranges (e.g. from 2026-09-20 to 2026-09-30, or "NOV 12 - NOV 20").
 * - Single day dates in various formats ("2026-09-25", "SEP 25", "25/09/2026", etc.).
 */
export function isEventMatchingDateFilter(
  event: {
    start_date?: string | null;
    end_date?: string | null;
    date?: string | null;
    time?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    tags?: string | null;
    title?: string | null;
    category?: string | null;
  },
  dateFilter: 'all' | 'today' | 'tomorrow' | 'weekend',
  referenceDate = new Date()
): boolean {
  if (dateFilter === 'all') return true;

  // 1. Handle "Year Round" / permanent events
  if (isYearRoundEvent(event)) {
    const content = `${event.time || ''} ${event.start_time || ''} ${event.end_time || ''} ${event.description || ''} ${event.tags || ''} ${event.title || ''}`;

    if (dateFilter === 'today') {
      const todayDayOfWeek = referenceDate.getDay(); // 0 = Sun, 6 = Sat
      if (todayDayOfWeek === 0 || todayDayOfWeek === 6) {
        return isEventOpenOnWeekend(event);
      }
      return !isEventClosedOnDayOfWeek(content, todayDayOfWeek);
    }

    if (dateFilter === 'tomorrow') {
      const tom = new Date(referenceDate);
      tom.setDate(tom.getDate() + 1);
      const tomDayOfWeek = tom.getDay();
      if (tomDayOfWeek === 0 || tomDayOfWeek === 6) {
        return isEventOpenOnWeekend(event);
      }
      return !isEventClosedOnDayOfWeek(content, tomDayOfWeek);
    }

    if (dateFilter === 'weekend') {
      // Must be open on the weekend!
      return isEventOpenOnWeekend(event);
    }
  }

  // 2. Handle standard scheduled events
  const refYear = referenceDate.getFullYear();
  const sDate = getEventStartDate(event, refYear);
  const eDate = getEventEndDate(event, refYear) || sDate;

  // Helpers to get start and end timestamps for target days
  const getDayRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
  };

  const getIsoStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const evDateRaw = (event.start_date || event.date || '').trim();

  if (dateFilter === 'today') {
    const { start, end } = getDayRange(referenceDate);
    if (sDate && eDate) {
      if (sDate.getTime() <= end && eDate.getTime() >= start) return true;
    }
    const todayIso = getIsoStr(referenceDate);
    const todayNorm = normalizeSingleDate(todayIso);
    const evNorm = normalizeSingleDate(evDateRaw);
    return evDateRaw === todayIso || (!!todayNorm && todayNorm === evNorm);
  }

  if (dateFilter === 'tomorrow') {
    const tom = new Date(referenceDate);
    tom.setDate(tom.getDate() + 1);
    const { start, end } = getDayRange(tom);
    if (sDate && eDate) {
      if (sDate.getTime() <= end && eDate.getTime() >= start) return true;
    }
    const tomIso = getIsoStr(tom);
    const tomNorm = normalizeSingleDate(tomIso);
    const evNorm = normalizeSingleDate(evDateRaw);
    return evDateRaw === tomIso || (!!tomNorm && tomNorm === evNorm);
  }

  if (dateFilter === 'weekend') {
    const dayOfWeek = referenceDate.getDay(); // 0 = Sun, ..., 5 = Fri, 6 = Sat
    const fri = new Date(referenceDate);
    const sat = new Date(referenceDate);
    const sun = new Date(referenceDate);

    if (dayOfWeek === 0) { // Sunday
      fri.setDate(referenceDate.getDate() - 2);
      sat.setDate(referenceDate.getDate() - 1);
      sun.setDate(referenceDate.getDate());
    } else if (dayOfWeek === 6) { // Saturday
      fri.setDate(referenceDate.getDate() - 1);
      sat.setDate(referenceDate.getDate());
      sun.setDate(referenceDate.getDate() + 1);
    } else if (dayOfWeek === 5) { // Friday
      fri.setDate(referenceDate.getDate());
      sat.setDate(referenceDate.getDate() + 1);
      sun.setDate(referenceDate.getDate() + 2);
    } else { // Mon-Thu
      const daysToFri = 5 - dayOfWeek;
      fri.setDate(referenceDate.getDate() + daysToFri);
      sat.setDate(referenceDate.getDate() + daysToFri + 1);
      sun.setDate(referenceDate.getDate() + daysToFri + 2);
    }

    const weekendStart = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate(), 0, 0, 0, 0).getTime();
    const weekendEnd = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59, 999).getTime();

    if (sDate && eDate) {
      if (sDate.getTime() <= weekendEnd && eDate.getTime() >= weekendStart) return true;
    }

    // String fallbacks for Friday, Saturday, Sunday
    const friIso = getIsoStr(fri);
    const satIso = getIsoStr(sat);
    const sunIso = getIsoStr(sun);
    const evNorm = normalizeSingleDate(evDateRaw);
    if (evDateRaw === friIso || evDateRaw === satIso || evDateRaw === sunIso) return true;
    if (evNorm && (evNorm === normalizeSingleDate(friIso) || evNorm === normalizeSingleDate(satIso) || evNorm === normalizeSingleDate(sunIso))) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Checks whether an event takes place in the current calendar month (or reference date).
 */
export function isEventInCurrentMonth(
  event: { start_date?: string | null; end_date?: string | null; date?: string | null },
  referenceDate = new Date()
): boolean {
  if (isEventExpired(event, referenceDate)) return false;
  if (isYearRoundEvent(event)) return true;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed (e.g. 8 for September)

  const s = getEventStartDate(event, currentYear);
  const e = getEventEndDate(event, currentYear) || s;

  if (s && e) {
    const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    return s.getTime() <= monthEnd.getTime() && e.getTime() >= monthStart.getTime();
  }

  // Fallback string matching for YYYY-MM or MM/YYYY
  const padMonth = String(currentMonth + 1).padStart(2, '0');
  const raw = `${event.start_date || ''} ${event.end_date || ''} ${event.date || ''}`;
  if (raw.includes(`${currentYear}-${padMonth}`) || raw.includes(`${padMonth}/${currentYear}`)) {
    return true;
  }

  return false;
}

/**
 * Checks whether an event takes place in the current or next calendar month.
 */
export function isEventInCurrentOrNextMonth(
  event: { start_date?: string | null; end_date?: string | null; date?: string | null },
  referenceDate = new Date()
): boolean {
  if (isEventExpired(event, referenceDate)) return false;
  if (isYearRoundEvent(event)) return true;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed

  // Next month calculation
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const targetYear = nextMonthDate.getFullYear();
  const targetMonth = nextMonthDate.getMonth();

  const s = getEventStartDate(event, currentYear);
  const e = getEventEndDate(event, currentYear) || s;

  // Range from start of current month to end of next month
  const rangeStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
  const rangeEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  if (s && e) {
    return s.getTime() <= rangeEnd.getTime() && e.getTime() >= rangeStart.getTime();
  }

  // Fallback string matching
  const padCurrentMonth = String(currentMonth + 1).padStart(2, '0');
  const padNextMonth = String(targetMonth + 1).padStart(2, '0');
  const raw = `${event.start_date || ''} ${event.end_date || ''} ${event.date || ''}`;
  if (
    raw.includes(`${currentYear}-${padCurrentMonth}`) || 
    raw.includes(`${padCurrentMonth}/${currentYear}`) ||
    raw.includes(`${targetYear}-${padNextMonth}`) || 
    raw.includes(`${padNextMonth}/${targetYear}`)
  ) {
    return true;
  }

  return false;
}

/**
 * Returns true if an event is completely in the past (expired).
 * An event is expired only if its end date is strictly before today (00:00:00).
 */
export function isEventExpired(event: { start_date?: string | null; end_date?: string | null; date?: string | null }, now = new Date()): boolean {
  if (isYearRoundEvent(event)) return false;
  const endDate = getEventEndDate(event, now.getFullYear());
  if (!endDate) return false; // If date cannot be parsed, do not mistakenly drop it

  // Start of today (00:00:00.000):
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return endDate.getTime() < startOfToday.getTime();
}

export interface CategoryMeta {
  id: string;
  name: string;
  emoji: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const CATEGORY_DEFINITIONS: Record<string, CategoryMeta> = {
  All: {
    id: 'all',
    name: 'All Events',
    emoji: '✨',
    label: '✨ All Events',
    color: '#0870B8',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-200'
  },
  Art: {
    id: 'Art',
    name: 'Art',
    emoji: '🎨',
    label: '🎨 Art',
    color: '#EC4899',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200'
  },
  Museums: {
    id: 'Museums',
    name: 'Museums',
    emoji: '🏛️',
    label: '🏛️ Museums',
    color: '#8B5CF6',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200'
  },
  Music: {
    id: 'Music',
    name: 'Music',
    emoji: '🎵',
    label: '🎵 Music',
    color: '#8B5CF6',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200'
  },
  Nightlife: {
    id: 'Nightlife',
    name: 'Nightlife',
    emoji: '🌙',
    label: '🌙 Nightlife',
    color: '#EC4899',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200'
  },
  Gastronomy: {
    id: 'Gastronomy',
    name: 'Gastronomy',
    emoji: '🍷',
    label: '🍷 Gastronomy',
    color: '#EF4444',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200'
  },
  Theatre: {
    id: 'Theatre',
    name: 'Theatre',
    emoji: '🎭',
    label: '🎭 Theatre',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200'
  },
  Theater: {
    id: 'Theatre',
    name: 'Theatre',
    emoji: '🎭',
    label: '🎭 Theatre',
    color: '#F59E0B',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200'
  },
  Outdoor: {
    id: 'Outdoor',
    name: 'Outdoor',
    emoji: '🌳',
    label: '🌳 Outdoor',
    color: '#84CC16',
    bgClass: 'bg-lime-50',
    textClass: 'text-lime-700',
    borderClass: 'border-lime-200'
  },
  Sports: {
    id: 'Sports',
    name: 'Sports',
    emoji: '⚽',
    label: '⚽ Sports',
    color: '#10B981',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200'
  },
  Tech: {
    id: 'Tech',
    name: 'Tech',
    emoji: '💻',
    label: '💻 Tech',
    color: '#3B82F6',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200'
  },
  Community: {
    id: 'Community',
    name: 'Community',
    emoji: '👥',
    label: '👥 Community',
    color: '#0870B8',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200'
  },
  Family: {
    id: 'Family',
    name: 'Family',
    emoji: '👨‍👩‍👧',
    label: '👨‍👩‍👧 Family',
    color: '#F97316',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200'
  },
  Festival: {
    id: 'Festival',
    name: 'Festival',
    emoji: '🌟',
    label: '🌟 Festival',
    color: '#EAB308',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200'
  },
  Workshops: {
    id: 'Workshops',
    name: 'Workshops',
    emoji: '🛠️',
    label: '🛠️ Workshops',
    color: '#14B8A6',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200'
  },
  Culture: {
    id: 'Culture',
    name: 'Culture',
    emoji: '🏛️',
    label: '🏛️ Culture',
    color: '#6366F1',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200'
  }
};

/**
 * Normalizes an arbitrary category string to a canonical key in CATEGORY_DEFINITIONS
 */
export function normalizeCategoryKey(rawCategory?: string | null): string {
  if (!rawCategory) return 'Culture';
  const trimmed = rawCategory.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct exact matches
  if (lower === 'art') return 'Art';
  if (lower === 'museums' || lower === 'museum' || lower === 'museo' || lower === 'musee') return 'Museums';
  if (lower === 'music' || lower === 'musique' || lower === 'musica') return 'Music';
  if (lower === 'nightlife' || lower === 'party' || lower === 'parties' || lower === 'club') return 'Nightlife';
  if (lower === 'gastronomy' || lower === 'food' || lower === 'wine' || lower === 'tapas' || lower === 'culinary') return 'Gastronomy';
  if (lower === 'theatre' || lower === 'theater' || lower === 'teatro') return 'Theatre';
  if (lower === 'outdoor' || lower === 'nature' || lower === 'park' || lower === 'turia' || lower === 'beach') return 'Outdoor';
  if (lower === 'sports' || lower === 'sport' || lower === 'fitness' || lower === 'race' || lower === 'marathon' || lower === 'yoga') return 'Sports';
  if (lower === 'tech' || lower === 'technology' || lower === 'startup' || lower === 'ai') return 'Tech';
  if (lower === 'community' || lower === 'social' || lower === 'expat' || lower === 'networking' || lower === 'meetup') return 'Community';
  if (lower === 'family' || lower === 'kids' || lower === 'children' || lower === 'famille') return 'Family';
  if (lower === 'festival' || lower === 'festivals' || lower === 'fair' || lower === 'fete') return 'Festival';
  if (lower === 'workshops' || lower === 'workshop' || lower === 'classes' || lower === 'class' || lower === 'atelier') return 'Workshops';
  if (lower === 'culture') return 'Culture';

  // 2. Keyword substring matching
  if (lower.includes('museum') || lower.includes('museo') || lower.includes('musee') || lower.includes('exhibition') || lower.includes('galerie') || lower.includes('gallery')) return 'Museums';
  if (lower.includes('art') || lower.includes('expo') || lower.includes('peint')) return 'Art';
  if (lower.includes('night') || lower.includes('party') || lower.includes('club') || lower.includes('dj') || lower.includes('soiree') || lower.includes('fiesta')) return 'Nightlife';
  if (lower.includes('music') || lower.includes('concert') || lower.includes('jazz') || lower.includes('symphon')) return 'Music';
  if (lower.includes('theat') || lower.includes('théât') || lower.includes('opera') || lower.includes('spectacle') || lower.includes('danse') || lower.includes('dance')) return 'Theatre';
  if (lower.includes('gastro') || lower.includes('food') || lower.includes('wine') || lower.includes('tapas') || lower.includes('culin')) return 'Gastronomy';
  if (lower.includes('tech') || lower.includes('startup') || lower.includes('digital') || lower.includes('innov') || lower.includes('ai') || lower.includes('code')) return 'Tech';
  if (lower.includes('community') || lower.includes('social') || lower.includes('expat') || lower.includes('meetup') || lower.includes('network')) return 'Community';
  if (lower.includes('sport') || lower.includes('run') || lower.includes('race') || lower.includes('fitness') || lower.includes('marathon') || lower.includes('yoga')) return 'Sports';
  if (lower.includes('workshop') || lower.includes('class') || lower.includes('atelier') || lower.includes('cours') || lower.includes('learn')) return 'Workshops';
  if (lower.includes('fam') || lower.includes('kid') || lower.includes('enfant')) return 'Family';
  if (lower.includes('out') || lower.includes('park') || lower.includes('turia') || lower.includes('beach') || lower.includes('jardin')) return 'Outdoor';
  if (lower.includes('fest') || lower.includes('fair') || lower.includes('fête')) return 'Festival';
  if (lower.includes('cultur')) return 'Culture';

  return 'Culture';
}

/**
 * Returns complete category badge metadata with themed emoji, colors, and label
 */
export function getCategoryBadge(category?: string | null): CategoryMeta {
  const key = normalizeCategoryKey(category);
  if (CATEGORY_DEFINITIONS[key]) {
    return CATEGORY_DEFINITIONS[key];
  }

  const raw = (category || 'Culture').trim();
  return {
    id: raw,
    name: raw,
    emoji: '🏷️',
    label: `🏷️ ${raw}`,
    color: '#0870B8',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200'
  };
}

/**
 * Returns an array of category badge metadata for events with multiple categories.
 * Splits by commas, slashes, or semicolons, preserving each distinct category chosen in edition.
 */
export function getCategoryBadges(category?: string | null): CategoryMeta[] {
  if (!category || !category.trim()) {
    return [getCategoryBadge('Culture')];
  }

  const parts = category.split(/[,;/]|(?:\s+&\s+)/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return [getCategoryBadge('Culture')];
  }

  const seen = new Set<string>();
  const list: CategoryMeta[] = [];

  for (const part of parts) {
    const badge = getCategoryBadge(part);
    const idKey = badge.id.toLowerCase();
    if (!seen.has(idKey)) {
      seen.add(idKey);
      list.push(badge);
    }
  }

  return list.length > 0 ? list : [getCategoryBadge('Culture')];
}

/**
 * List of category definitions for tabs/selectors (deduplicated by id)
 */
export const CATEGORY_LIST: CategoryMeta[] = (() => {
  const seen = new Set<string>();
  const list: CategoryMeta[] = [];
  for (const cat of Object.values(CATEGORY_DEFINITIONS)) {
    if (cat.id === 'all') continue;
    if (!seen.has(cat.id.toLowerCase())) {
      seen.add(cat.id.toLowerCase());
      list.push(cat);
    }
  }
  return list;
})();

/**
 * Checks if an event matches a selected category filter
 */
export function matchesCategoryFilter(eventCategory?: string | null, filterKey?: string | null): boolean {
  if (!filterKey || filterKey === 'all' || filterKey === 'All Events' || filterKey === 'All Categories' || filterKey === 'All') return true;
  if (!eventCategory) return false;
  const filterNorm = normalizeCategoryKey(filterKey).toLowerCase();
  const parts = eventCategory.split(/[,;/]|(?:\s+&\s+)/).map(s => s.trim()).filter(Boolean);
  return parts.some(part => {
    const partNorm = normalizeCategoryKey(part).toLowerCase();
    return partNorm === filterNorm || part.toLowerCase() === filterKey.toLowerCase();
  });
}
