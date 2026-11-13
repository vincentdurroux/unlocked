export interface NotificationDraftContent {
  title: string;
  body: string;
  themeId: string;
  themeLabel: string;
  icon: 'event' | 'guide' | 'recommendation' | 'megaphone' | 'star' | 'gift' | 'shield' | 'sparkles' | 'chat' | 'marketplace';
  defaultUrl?: string;
}

export interface CustomNotificationTheme {
  id: string;
  label: string;
  icon: 'event' | 'guide' | 'recommendation' | 'megaphone' | 'star' | 'gift' | 'shield' | 'sparkles' | 'chat' | 'marketplace';
  defaultTitle: string;
  defaultBody: string;
  defaultUrl: string;
  toneHint: string;
}

export const NOTIFICATION_EMOJIS: string[] = [
  '🎉', '🎶', '🍷', '🎨', '🏃', '🤝', '🎆', '👨‍👩‍👧',
  '📖', '📋', '🏡', '🩺', '🎓', '💶', '🚲', '🐾',
  '⭐', '⚖️', '🏠', '🔧', '💆', '☀️', '🌴', '✨',
  '🎁', '🛍️', '📢', '⚡', '🔥', '💬'
];

const LEADING_EMOJI_REGEX = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3)\s*/u;

/**
 * Extract the leading emoji from notification text if present.
 */
export function extractLeadingEmoji(text?: string | null): string | null {
  if (!text) return null;
  const match = String(text).trimStart().match(LEADING_EMOJI_REGEX);
  return match ? match[0].trim() : null;
}

/**
 * Replace (or remove when emoji === '') the leading emoji of a notification text.
 */
export function replaceLeadingEmoji(text: string, emoji: string): string {
  const withoutEmoji = String(text || '').trimStart().replace(LEADING_EMOJI_REGEX, '').trimStart();
  if (!emoji) return withoutEmoji;
  return withoutEmoji ? `${emoji} ${withoutEmoji}` : `${emoji} `;
}

/**
 * Strip HTML tags, markdown markers, and collapse extra whitespace for clean lock-screen push text.
 */
export function cleanNotificationText(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_`~#>]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Word-boundary safe truncation so push & in-app notifications stay crisp without slicing words.
 */
export function smartTruncate(raw: string, maxLen: number): string {
  const clean = cleanNotificationText(raw);
  if (!clean || clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, Math.max(1, maxLen - 1));
  const lastSpace = sliced.lastIndexOf(' ');
  const safeSlice = lastSpace > maxLen * 0.55 ? sliced.slice(0, lastSpace) : sliced;
  return `${safeSlice.replace(/[,:;.\-–—\s]+$/, '')}…`;
}

/**
 * Format raw ISO / string dates into concise, lockscreen-friendly dates (e.g. "Sat, Nov 14").
 */
export function formatReadableEventDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  const parsed = new Date(trimmed);
  let formattedDate = trimmed;
  if (!isNaN(parsed.getTime())) {
    formattedDate = parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  const cleanTime = timeStr ? String(timeStr).trim() : '';
  if (cleanTime && !/^(00:00|tbd|all day|tba)$/i.test(cleanTime)) {
    return `${formattedDate} · ${cleanTime}`;
  }
  return formattedDate;
}

/**
 * Build notification content for an Event.
 * Title: "MyCityUnlocked Events"
 * Description: "New Event: <Event Title>" (no emoji)
 */
export function buildEventNotificationContent(event: any): NotificationDraftContent {
  const rawTitle = cleanNotificationText(event?.title) || 'Community Event in Valencia';
  const body = smartTruncate(`New Event: ${rawTitle}`, 115);

  return {
    title: 'MyCityUnlocked',
    body,
    themeId: 'event_general',
    themeLabel: 'Events',
    icon: 'event',
    defaultUrl: `/?eventId=${event?.id}#events`
  };
}

/**
 * Build notification content for a Guide / Article.
 * Title: "MyCityUnlocked"
 * Description: "New Article: <Article Title>" (no emoji)
 */
export function buildArticleNotificationContent(article: any): NotificationDraftContent {
  const rawTitle = cleanNotificationText(article?.title) || 'Valencia Expat Guide';
  const body = smartTruncate(`New Article: ${rawTitle}`, 115);

  return {
    title: 'MyCityUnlocked',
    body,
    themeId: 'guide_general',
    themeLabel: 'Guides',
    icon: 'guide',
    defaultUrl: `/?guideId=${article?.id}#guides`
  };
}

/**
 * Build notification content for a Verified Professional.
 * Title: "MyCityUnlocked"
 * Description: "New Recommended Pro: <Pro Name> · <Profession>" (no emoji)
 */
export function buildProNotificationContent(pro: any): NotificationDraftContent {
  const proName = cleanNotificationText(pro?.full_name || pro?.name) || 'Trusted Specialist';
  const profession = cleanNotificationText(pro?.profession || pro?.category || 'Verified Pro') || 'Verified Pro';
  const body = smartTruncate(`New Recommended Pro: ${proName} · ${profession}`, 115);

  return {
    title: 'MyCityUnlocked',
    body,
    themeId: 'pro_general',
    themeLabel: 'Pros',
    icon: 'star',
    defaultUrl: `/?proId=${pro?.id}#explore`
  };
}

/**
 * Build notification content for Weekend Highlights.
 * Title: "MyCityUnlocked"
 * Description: "Weekend Highlights: <X> events to check out!" (no emoji)
 */
export function buildWeekendDigestNotificationContent(weekendEvents: any[], _rangeText: string): NotificationDraftContent {
  const count = weekendEvents.filter((e) => cleanNotificationText(e?.title)).length;

  const body = count > 0
    ? `Weekend Highlights: ${count} ${count === 1 ? 'event' : 'events'} to check out!`
    : 'Weekend Highlights: Top events to check out!';

  return {
    title: 'MyCityUnlocked',
    body: smartTruncate(body, 115),
    themeId: 'weekend_digest',
    themeLabel: 'Weekend',
    icon: 'event',
    defaultUrl: '/?focus=weekend-events'
  };
}

export const CUSTOM_NOTIFICATION_THEMES: CustomNotificationTheme[] = [
  {
    id: 'event',
    label: 'Events',
    icon: 'event',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Event: Sunset Acoustic Meetup in Ruzafa',
    defaultUrl: '/#events',
    toneHint: 'Logo + "MyCityUnlocked" + "New Event: <Event Name>" (no emoji).'
  },
  {
    id: 'guide',
    label: 'Guides',
    icon: 'guide',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Article: Living in Valencia Essentials',
    defaultUrl: '/#guides',
    toneHint: 'Logo + "MyCityUnlocked" + "New Article: <Article Title>" (no emoji).'
  },
  {
    id: 'pro',
    label: 'Pros',
    icon: 'star',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Recommended Pro: Maria Lopez · Real Estate Agent',
    defaultUrl: '/#directory',
    toneHint: 'Logo + "MyCityUnlocked" + "New Recommended Pro: <Name> · <Profession>" (no emoji).'
  },
  {
    id: 'weekend',
    label: 'Weekend',
    icon: 'event',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'Weekend Highlights: 5 events to check out!',
    defaultUrl: '/?focus=weekend-events',
    toneHint: 'Logo + "MyCityUnlocked" + "Weekend Highlights: X events to check out!" (no emoji).'
  },
  {
    id: 'update',
    label: 'Updates',
    icon: 'sparkles',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Update: Fresh improvements are now live on MyCityUnlocked.',
    defaultUrl: '/',
    toneHint: 'Brief & clear — highlight the update in one short line.'
  },
  {
    id: 'perk',
    label: 'Perks',
    icon: 'gift',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Member Perk: Exclusive partner offer waiting for members.',
    defaultUrl: '/#directory',
    toneHint: 'Clear value — state the partner and offer concisely.'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'marketplace',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'New Listing: Fresh community finds just listed in Valencia.',
    defaultUrl: '/#marketplace',
    toneHint: 'Timely & direct — mention newly posted community listings.'
  },
  {
    id: 'notice',
    label: 'Notice',
    icon: 'megaphone',
    defaultTitle: 'MyCityUnlocked',
    defaultBody: 'Community Notice: Quick update from the MyCityUnlocked team.',
    defaultUrl: '/',
    toneHint: 'Direct & clear — keep it short so it reads cleanly at a glance.'
  }
];
