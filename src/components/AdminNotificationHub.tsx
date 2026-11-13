import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Send, 
  Search, 
  Calendar, 
  BookOpen, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  Megaphone, 
  History, 
  Users, 
  MapPin, 
  Filter, 
  ChevronRight, 
  Tag, 
  X, 
  Check, 
  AlertCircle,
  Award,
  Zap,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { oneSignalService } from '../services/oneSignalService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';
import { getCurrentWeekendInterval } from './LandingEventHighlightsCard';
import {
  buildEventNotificationContent,
  buildArticleNotificationContent,
  buildProNotificationContent,
  buildWeekendDigestNotificationContent,
  CUSTOM_NOTIFICATION_THEMES,
  NOTIFICATION_EMOJIS,
  cleanNotificationText,
  extractLeadingEmoji,
  replaceLeadingEmoji,
  smartTruncate,
  type CustomNotificationTheme
} from '../lib/notificationTemplates';

export interface PushLogEntry {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  type: 'custom' | 'event' | 'article' | 'pro' | 'weekend' | 'direct_member';
  target: string; // 'All Users' or username/email
  targetId?: string; // ID of event, article, pro, or user
  targetUserId?: string; // Specific recipient user ID when targeted to a single member
  url?: string;
  recipientsCount?: number;
  deliveryMode?: 'both' | 'in_app' | 'push';
  status: 'sent' | 'error';
  errorMessage?: string;
}

const PUSH_LOG_STORAGE_KEY = 'unlocked_push_history_log';

export function getPushLogs(): PushLogEntry[] {
  try {
    const raw = localStorage.getItem(PUSH_LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load push logs:', e);
    return [];
  }
}

export async function savePushLogEntry(
  entry: Omit<PushLogEntry, 'id' | 'timestamp'>,
  skipAnnouncementSync = false
): Promise<PushLogEntry> {
  const logs = getPushLogs();
  const newEntry: PushLogEntry = {
    ...entry,
    id: 'push_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString()
  };
  const updated = [newEntry, ...logs];
  try {
    localStorage.setItem(PUSH_LOG_STORAGE_KEY, JSON.stringify(updated.slice(0, 200))); // keep last 200
  } catch (e) {
    console.error('Failed to save push log entry:', e);
  }

  // Auto-sync sent push notifications to Supabase announcements table when not already handled by onSaveAnnouncement
  if (entry.status === 'sent' && !skipAnnouncementSync && isSupabaseConfigured) {
    try {
      const iconName = entry.type === 'event' || entry.type === 'weekend'
        ? 'event'
        : entry.type === 'article'
        ? 'guide'
        : entry.type === 'pro'
        ? 'star'
        : 'megaphone';
      const iconTag = `[icon:${iconName}]`;
      const typeTag = entry.type ? `[type:${entry.type}]` : '';
      const targetTag = entry.targetId ? `[target:${entry.targetId}]` : '';
      const userTag = entry.targetUserId ? `[user:${entry.targetUserId}]` : '';
      const linkTag = entry.url ? `[link:${entry.url}]` : '';
      const titleTag = entry.title ? `[${entry.title.trim()}] ` : '';
      const content = `${iconTag}${typeTag}${targetTag}${userTag}${linkTag}${titleTag}${(entry.body || '').trim()}`;

      const { error } = await supabase.from('announcements').insert([
        {
          content,
          is_active: true,
          updated_at: newEntry.timestamp
        }
      ]);

      if (error) {
        await supabase.from('announcements').insert([
          {
            content,
            is_active: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Could not sync push log to Supabase announcements:', err);
    }
  }

  return newEntry;
}

export function clearPushHistoryLog() {
  try {
    localStorage.removeItem(PUSH_LOG_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear push history:', e);
  }
}

interface AdminNotificationHubProps {
  events: any[];
  guides: any[];
  professionals: any[];
  allUsersList: any[];
  adminAnnouncements: any[];
  loadingAnnouncements: boolean;
  onRefetchAnnouncements: () => Promise<void>;
  onSaveAnnouncement: (annData: any) => Promise<void>;
  onDeleteAnnouncement: (id: string | number) => Promise<void>;
  setMsg: (msg: { type: 'success' | 'error', text: string } | null) => void;
  notificationIcons: any[];
}

export const AdminNotificationHub: React.FC<AdminNotificationHubProps> = ({
  events = [],
  guides = [],
  professionals = [],
  allUsersList = [],
  adminAnnouncements = [],
  loadingAnnouncements,
  onRefetchAnnouncements,
  onSaveAnnouncement,
  onDeleteAnnouncement,
  setMsg,
  notificationIcons = []
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'custom' | 'events' | 'articles' | 'pros' | 'weekend'>('history');

  // Self-healing user list fallback: ensures members are always loaded even if parent query was delayed
  const [internalUsers, setInternalUsers] = useState<any[]>([]);

  useEffect(() => {
    if (allUsersList && allUsersList.length > 0) {
      setInternalUsers(allUsersList);
    } else if (isSupabaseConfigured) {
      const loadProfiles = async () => {
        // Prevent background fetch errors if offline
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (!isOnline) return;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, onesignal_player_id')
            .order('full_name', { ascending: true });
          if (!error && data && data.length > 0) {
            setInternalUsers(data);
          } else {
            const { data: fallbackData } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .order('full_name', { ascending: true });
            if (fallbackData && fallbackData.length > 0) {
              setInternalUsers(fallbackData);
            }
          }
        } catch (_) {}
      };
      loadProfiles();
    }
  }, [allUsersList]);

  const activeUsersList = useMemo(() => {
    return (allUsersList && allUsersList.length > 0) ? allUsersList : internalUsers;
  }, [allUsersList, internalUsers]);

  // Push history log state
  const [pushLogs, setPushLogs] = useState<PushLogEntry[]>(() => getPushLogs());
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearCustom, setConfirmClearCustom] = useState(false);

  const handleClearAllHistory = () => {
    clearPushHistoryLog();
    setPushLogs([]);
    setConfirmClearHistory(false);
    setMsg({ type: 'success', text: 'All push notification history cleared successfully.' });
  };

  const handleClearCustomHistory = () => {
    const remaining = pushLogs.filter((log) => {
      const t = (log.type || '').toLowerCase();
      return ['event', 'article', 'pro', 'weekend'].includes(t);
    });
    try {
      localStorage.setItem(PUSH_LOG_STORAGE_KEY, JSON.stringify(remaining));
    } catch (e) {
      console.error('Failed to update push logs:', e);
    }
    setPushLogs(remaining);
    setConfirmClearCustom(false);
    setMsg({ type: 'success', text: 'Custom messages push log cleared successfully.' });
  };

  // User Bell Notification Center Dashboard State
  const [dashboardSubTab, setDashboardSubTab] = useState<'bell' | 'push'>('bell');
  const [bellSearchQuery, setBellSearchQuery] = useState('');
  const [bellTypeFilter, setBellTypeFilter] = useState('all');
  const [deletingBellAnnId, setDeletingBellAnnId] = useState<string | number | null>(null);
  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState<string | number | null>(null);

  const handleDeleteFromBell = async (id: string | number) => {
    try {
      setDeletingBellAnnId(id);
      await onDeleteAnnouncement(id);
      setConfirmDeleteAnnId(null);
      if (onRefetchAnnouncements) {
        await onRefetchAnnouncements();
      }
      setMsg({ type: 'success', text: 'Notification removed from users\' Bell notification center.' });
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setMsg({ type: 'error', text: 'Failed to delete notification: ' + (err?.message || 'Please try again.') });
    } finally {
      setDeletingBellAnnId(null);
    }
  };

  // Search & Filter states for entity tabs
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  const [articleSearch, setArticleSearch] = useState('');
  
  const [proSearch, setProSearch] = useState('');
  const [proCategoryFilter, setProCategoryFilter] = useState('all');

  // Push modal compose state
  const [pushComposeModal, setPushComposeModal] = useState<{
    isOpen: boolean;
    type: 'custom' | 'event' | 'article' | 'pro' | 'weekend' | 'direct_member';
    title: string;
    body: string;
    targetMode: 'all' | 'specific';
    selectedUserId?: string;
    targetId?: string;
    url?: string;
    imageUrl?: string;
    entityName?: string;
    previewDevice?: 'ios' | 'android' | 'in_app';
    channels?: ('ios' | 'android' | 'web')[];
    deliveryMode?: 'both' | 'in_app' | 'push';
    themeId?: string;
    themeLabel?: string;
    icon?: CustomNotificationTheme['icon'];
    toneHint?: string;
    sourceEntity?: any;
  } | null>(null);

  const [isSendingPush, setIsSendingPush] = useState(false);

  // In-App announcement creation form state
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | number | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annIcon, setAnnIcon] = useState('megaphone');
  const [annIsActive, setAnnIsActive] = useState(true);
  const [annCtaType, setAnnCtaType] = useState('');
  const [annSendPush, setAnnSendPush] = useState(true);
  const [annPushTarget, setAnnPushTarget] = useState<'all' | 'specific'>('all');
  const [annPushUserId, setAnnPushUserId] = useState('');

  // Device pairing modal state for test members
  const [deviceLinkModal, setDeviceLinkModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  } | null>(null);
  const [activeDevicesList, setActiveDevicesList] = useState<any[]>([]);
  const [loadingActiveDevices, setLoadingActiveDevices] = useState(false);
  const [isLinkingDevice, setIsLinkingDevice] = useState(false);

  const openDeviceLinkModal = async (userId: string, userName: string) => {
    setDeviceLinkModal({ isOpen: true, userId, userName });
    setLoadingActiveDevices(true);
    try {
      const res = await fetch('/api/onesignal-active-devices');
      if (res.ok) {
        const data = await res.json();
        setActiveDevicesList(Array.isArray(data?.devices) ? data.devices : []);
      }
    } catch (e) {
      console.warn('Could not load OneSignal devices:', e);
    } finally {
      setLoadingActiveDevices(false);
    }
  };

  const handleLinkDeviceToUser = async (userId: string, playerId: string) => {
    setIsLinkingDevice(true);
    try {
      // 1. Link in OneSignal backend
      const res = await fetch('/api/onesignal-link-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playerId })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update device in OneSignal');
      }

      // 2. Link in Supabase profiles
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('profiles')
            .update({ onesignal_player_id: playerId })
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('Supabase profile token update note:', dbErr);
        }
      }

      // 3. Update local state
      setInternalUsers(prev => prev.map(u => u.id === userId ? { ...u, onesignal_player_id: playerId } : u));

      setMsg({
        type: 'success',
        text: `📱 Device paired successfully! Mobile Push notifications for this member will now be delivered to this device.`
      });
      setDeviceLinkModal(null);
    } catch (err: any) {
      setMsg({ type: 'error', text: `Error pairing device: ${err.message || 'Unknown error'}` });
    } finally {
      setIsLinkingDevice(false);
    }
  };

  const handleLinkCurrentDevice = async (userId: string) => {
    setIsLinkingDevice(true);
    try {
      let curId = await oneSignalService.getSubscriptionId();
      if (!curId || curId.startsWith('local-')) {
        await oneSignalService.subscribe(userId);
        curId = await oneSignalService.getSubscriptionId();
      }

      if (!curId || curId.startsWith('local-')) {
        setMsg({
          type: 'error',
          text: 'No active OneSignal subscription found on this browser. Please allow notifications on this device first.'
        });
        setIsLinkingDevice(false);
        return;
      }

      await handleLinkDeviceToUser(userId, curId);
    } catch (err: any) {
      setMsg({ type: 'error', text: `Could not link current device: ${err.message || 'Unknown error'}` });
      setIsLinkingDevice(false);
    }
  };

  // Refresh push log history
  const reloadPushLogs = () => {
    setPushLogs(getPushLogs());
  };

  // Flatten articles from guides categories
  const allArticles = useMemo(() => {
    const list: any[] = [];
    guides.forEach((cat) => {
      if (cat.articles && Array.isArray(cat.articles)) {
        cat.articles.forEach((art: any) => {
          list.push({
            ...art,
            categoryTitle: cat.title || 'Guide'
          });
        });
      }
    });
    return list;
  }, [guides]);

  // Compute weekend events
  const weekendData = useMemo(() => {
    const { friday, sunday } = getCurrentWeekendInterval();
    const weekendEvents = events.filter((e) => {
      if (!e) return false;
      const startDateStr = e.start_date || e.date;
      if (!startDateStr) return false;
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) return false;
      return d.getTime() >= friday.getTime() && d.getTime() <= sunday.getTime();
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sM = months[friday.getMonth()];
    const eM = months[sunday.getMonth()];
    const rangeText = sM === eM
      ? `${friday.getDate()}–${sunday.getDate()} ${sM}`
      : `${friday.getDate()} ${sM} – ${sunday.getDate()} ${eM}`;

    return {
      events: weekendEvents,
      rangeText,
      count: weekendEvents.length
    };
  }, [events]);

  // Filtered push logs
  const filteredPushLogs = useMemo(() => {
    return pushLogs.filter((log) => {
      if (logFilterType !== 'all' && log.type !== logFilterType) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        return (
          log.title.toLowerCase().includes(q) ||
          log.body.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pushLogs, logFilterType, logSearchQuery]);

  // Only custom announcements (strictly exclude events, articles, guides, pros, weekend)
  const customAnnouncements = useMemo(() => {
    return adminAnnouncements.filter((ann) => {
      const cta = (ann.cta_type || '').toLowerCase();
      return !['event', 'article', 'guide', 'pro', 'weekend'].includes(cta);
    });
  }, [adminAnnouncements]);

  // Only custom push logs (strictly exclude events, articles, pros, weekend)
  const customPushLogs = useMemo(() => {
    return pushLogs.filter((log) => {
      const t = (log.type || '').toLowerCase();
      return !['event', 'article', 'pro', 'weekend'].includes(t);
    });
  }, [pushLogs]);

  // Filtered live announcements present in users' in-app Bell center
  const filteredBellAnnouncements = useMemo(() => {
    return adminAnnouncements.filter((ann) => {
      const cta = (ann.cta_type || '').toLowerCase();
      if (bellTypeFilter !== 'all') {
        if (bellTypeFilter === 'custom' && ['event', 'article', 'guide', 'pro', 'weekend'].includes(cta)) return false;
        if (bellTypeFilter === 'event' && cta !== 'event') return false;
        if (bellTypeFilter === 'article' && cta !== 'article' && cta !== 'guide') return false;
        if (bellTypeFilter === 'pro' && cta !== 'pro') return false;
        if (bellTypeFilter === 'weekend' && cta !== 'weekend') return false;
      }
      if (bellSearchQuery.trim()) {
        const q = bellSearchQuery.toLowerCase();
        const titleMatch = (ann.title || '').toLowerCase().includes(q);
        const contentMatch = (ann.content || '').toLowerCase().includes(q);
        const userMatch = ann.target_user_id ? String(ann.target_user_id).toLowerCase().includes(q) : false;
        return titleMatch || contentMatch || userMatch;
      }
      return true;
    });
  }, [adminAnnouncements, bellTypeFilter, bellSearchQuery]);

  // Check if target was already pushed
  const isTargetPushed = (targetId?: string) => {
    if (!targetId) return null;
    const match = pushLogs.find(l => l.targetId === String(targetId) && l.status === 'sent');
    return match ? match.timestamp : null;
  };

  // Execute Notification send (In-App Only, Push Only, or Both)
  const handleExecuteSendPush = async () => {
    if (!pushComposeModal) return;
    const { title, body, targetMode, selectedUserId, type, targetId, url } = pushComposeModal;
    const deliveryMode = pushComposeModal.deliveryMode || 'both';
    const shouldSendInApp = deliveryMode === 'both' || deliveryMode === 'in_app';
    const shouldSendPush = deliveryMode === 'both' || deliveryMode === 'push';

    if (!title.trim() || !body.trim()) {
      setMsg({ type: 'error', text: 'Please fill in both the title and description of the notification.' });
      return;
    }

    if (targetMode === 'specific' && !selectedUserId) {
      setMsg({ type: 'error', text: 'Please select a specific member recipient.' });
      return;
    }

    setIsSendingPush(true);
    try {
      let targetUserIds: string[] | undefined = undefined;
      let targetSubscriptionIds: string[] | undefined = undefined;
      let targetAudienceLabel = 'All Users';

      if (targetMode === 'specific' && selectedUserId) {
        targetUserIds = [selectedUserId];
        const userObj = activeUsersList.find(u => u.id === selectedUserId);
        targetAudienceLabel = userObj ? (userObj.full_name || userObj.email || selectedUserId) : selectedUserId;
        if (userObj?.onesignal_player_id) {
          targetSubscriptionIds = [userObj.onesignal_player_id];
        }
      }

      const resolvedIcon = pushComposeModal.icon || (
        type === 'event' || type === 'weekend'
          ? 'event'
          : type === 'article'
            ? 'guide'
            : type === 'pro'
              ? 'star'
              : 'megaphone'
      );

      // 1. Save as In-App Bell notification if In-App or Both is selected
      let savedInBell = false;
      if (shouldSendInApp) {
        try {
          await onSaveAnnouncement({
            title: title.trim(),
            content: body.trim(),
            icon: resolvedIcon,
            is_active: true,
            cta_type: type,
            target_id: targetId || null,
            target_user_id: (targetMode === 'specific' && selectedUserId) ? selectedUserId : null,
            cta_link: url || '/',
            send_push: false
          });
          savedInBell = true;
          if (onRefetchAnnouncements) {
            await onRefetchAnnouncements();
          }
        } catch (annErr) {
          console.warn('Notice: announcement DB sync note:', annErr);
        }
      }

      // 2. Dispatch mobile push notification via OneSignal if Push or Both is selected
      let recipientCount = 0;
      if (shouldSendPush) {
        const res = await oneSignalService.sendServerNotification(
          title.trim(),
          body.trim(),
          url || '/',
          targetUserIds,
          targetSubscriptionIds,
          pushComposeModal.imageUrl || undefined,
          {
            type,
            theme: pushComposeModal.themeId || type,
            target_id: targetId,
            url: url || '/'
          },
          pushComposeModal.channels || ['ios', 'android', 'web']
        );

        const rawRecipients = res?.recipients ?? res?.result?.recipients;
        recipientCount = typeof rawRecipients === 'number' ? rawRecipients : (targetMode === 'specific' ? 0 : 1);
      }

      // Always pass skipAnnouncementSync = true so "Push Only" never duplicates into In-App Bell
      await savePushLogEntry({
        title: title.trim(),
        body: body.trim(),
        type,
        target: targetAudienceLabel,
        targetId,
        targetUserId: (targetMode === 'specific' && selectedUserId) ? selectedUserId : undefined,
        url: url || '/',
        recipientsCount: shouldSendPush ? recipientCount : undefined,
        deliveryMode,
        status: 'sent'
      }, true);

      reloadPushLogs();

      if (deliveryMode === 'in_app') {
        setMsg({
          type: 'success',
          text: targetMode === 'specific'
            ? `🔔 In-App notification sent to ${targetAudienceLabel}'s Bell center (In-App only).`
            : `🔔 In-App notification published to the Bell center (In-App only)!`
        });
      } else if (deliveryMode === 'push') {
        if (recipientCount > 0) {
          setMsg({
            type: 'success',
            text: `📲 Push notification sent only to ${recipientCount} device${recipientCount > 1 ? 's' : ''} (not added to In-App Bell).`
          });
        } else if (targetMode === 'specific') {
          setMsg({
            type: 'error',
            text: `📲 Push Only: 0 mobile devices are linked in OneSignal for ${targetAudienceLabel}. Pair their device first or choose "In-App" / "Both".`
          });
        } else {
          setMsg({
            type: 'success',
            text: `📲 Push notification dispatched to active mobile subscribers (not added to In-App Bell)!`
          });
        }
      } else {
        if (recipientCount > 0) {
          setMsg({
            type: 'success',
            text: `🚀 Notification published to Bell & Mobile Push sent to ${recipientCount} device${recipientCount > 1 ? 's' : ''}!`
          });
        } else if (targetMode === 'specific') {
          setMsg({
            type: 'success',
            text: `🔔 Notification published to the member's in-app Bell! (Note: 0 mobile devices are currently registered in OneSignal for this user).`
          });
        } else {
          setMsg({
            type: 'success',
            text: `🚀 Notification published to Bell & sent to active subscribers!`
          });
        }
      }

      if (savedInBell || shouldSendPush) {
        setPushComposeModal(null);
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      savePushLogEntry({
        title: title.trim(),
        body: body.trim(),
        type,
        target: targetMode === 'specific' ? 'Specific User' : 'All Users',
        targetId,
        url: url || '/',
        deliveryMode,
        status: 'error',
        errorMessage: err?.message || 'Failed to dispatch notification'
      }, true);
      reloadPushLogs();
      setPushComposeModal(null);
      setMsg({
        type: 'error',
        text: shouldSendInApp
          ? `🔔 Saved to Bell notifications, but OneSignal Push dispatch failed: ${err?.message || 'Check OneSignal setup'}`
          : `📲 Push dispatch failed: ${err?.message || 'Check OneSignal setup'}`
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  // Save In-App Announcement with optional Push
  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annContent.trim()) return;

    try {
      await onSaveAnnouncement({
        id: editingAnnId,
        title: annTitle.trim() || 'Announcement',
        content: annContent.trim(),
        icon: annIcon,
        is_active: annIsActive,
        cta_type: annCtaType || null,
        target_user_id: (annSendPush && annPushTarget === 'specific' && annPushUserId) ? annPushUserId : null
      });

      if (annSendPush) {
        let targetUserIds: string[] | undefined = undefined;
        let targetSubscriptionIds: string[] | undefined = undefined;
        let targetLabel = 'All Users';

        if (annPushTarget === 'specific' && annPushUserId) {
          targetUserIds = [annPushUserId];
          const u = activeUsersList.find(x => x.id === annPushUserId);
          targetLabel = u ? (u.full_name || u.email || annPushUserId) : annPushUserId;
          if (u?.onesignal_player_id) {
            targetSubscriptionIds = [u.onesignal_player_id];
          }
        }

        try {
          const res = await oneSignalService.sendServerNotification(
            annTitle.trim() || 'Unlocked Valencia 🌴',
            annContent.trim(),
            '/',
            targetUserIds,
            targetSubscriptionIds,
            undefined,
            undefined,
            ['ios', 'android', 'web']
          );

          await savePushLogEntry({
            title: annTitle.trim() || 'MyCityUnlocked',
            body: annContent.trim(),
            type: 'custom',
            target: targetLabel,
            targetId: annPushUserId || undefined,
            url: '/',
            recipientsCount: res?.recipients ?? 1,
            status: 'sent'
          }, true);
          reloadPushLogs();
        } catch (pushErr: any) {
          console.warn('Push error on announcement creation:', pushErr);
        }
      }

      setShowAnnForm(false);
      setEditingAnnId(null);
      setAnnTitle('');
      setAnnContent('');
      setAnnSendPush(false);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Error saving announcement: ' + (err?.message || 'Please try again.') });
    }
  };

  // Open Event Push Compose Modal
  const openEventPushModal = (event: any) => {
    const draft = buildEventNotificationContent(event);
    setPushComposeModal({
      isOpen: true,
      type: 'event',
      title: draft.title,
      body: draft.body,
      targetMode: 'all',
      targetId: String(event.id),
      url: draft.defaultUrl || `/?eventId=${event.id}#events`,
      imageUrl: '',
      entityName: event.title,
      previewDevice: 'ios',
      deliveryMode: 'both',
      themeId: draft.themeId,
      themeLabel: draft.themeLabel,
      icon: draft.icon,
      toneHint: 'Logo + "MyCityUnlocked" + "New Event: <Event Name>" (no emoji).',
      sourceEntity: event
    });
  };

  // Open Article Push Compose Modal
  const openArticlePushModal = (article: any) => {
    const draft = buildArticleNotificationContent(article);
    setPushComposeModal({
      isOpen: true,
      type: 'article',
      title: draft.title,
      body: draft.body,
      targetMode: 'all',
      targetId: String(article.id),
      url: draft.defaultUrl || `/?guideId=${article.id}#guides`,
      imageUrl: '',
      entityName: article.title,
      previewDevice: 'ios',
      deliveryMode: 'both',
      themeId: draft.themeId,
      themeLabel: draft.themeLabel,
      icon: draft.icon,
      toneHint: 'Logo + "MyCityUnlocked" + "New Article: <Article Title>" (no emoji).',
      sourceEntity: article
    });
  };

  // Open Pro Push Compose Modal
  const openProPushModal = (pro: any) => {
    const draft = buildProNotificationContent(pro);
    setPushComposeModal({
      isOpen: true,
      type: 'pro',
      title: draft.title,
      body: draft.body,
      targetMode: 'all',
      targetId: String(pro.id),
      url: draft.defaultUrl || `/?proId=${pro.id}#explore`,
      imageUrl: '',
      entityName: pro.full_name || pro.name,
      previewDevice: 'ios',
      deliveryMode: 'both',
      themeId: draft.themeId,
      themeLabel: draft.themeLabel,
      icon: draft.icon,
      toneHint: 'Logo + "MyCityUnlocked" + "New Recommended Pro: <Name> · <Profession>" (no emoji).',
      sourceEntity: pro
    });
  };

  // Open Weekend Digest Push Compose Modal
  const openWeekendDigestPushModal = () => {
    const draft = buildWeekendDigestNotificationContent(weekendData.events, weekendData.rangeText);
    setPushComposeModal({
      isOpen: true,
      type: 'weekend',
      title: draft.title,
      body: draft.body,
      targetMode: 'all',
      url: draft.defaultUrl || '/#events',
      imageUrl: '',
      entityName: `Weekend Digest (${weekendData.rangeText})`,
      previewDevice: 'ios',
      deliveryMode: 'both',
      themeId: draft.themeId,
      themeLabel: draft.themeLabel,
      icon: draft.icon,
      toneHint: 'Logo + "MyCityUnlocked" + "Weekend Highlights: X events to check out!" (no emoji).'
    });
  };

  // Open Announcement Push Compose Modal (OneSignal)
  const openAnnouncementPushModal = (ann: any) => {
    const matchedTheme = CUSTOM_NOTIFICATION_THEMES.find(t => t.icon === ann.icon) || CUSTOM_NOTIFICATION_THEMES[4];
    const cleanTitle = cleanNotificationText(ann.title);
    const titleToUse = cleanTitle && cleanTitle !== 'Announcement' ? smartTruncate(cleanTitle, 50) : matchedTheme.defaultTitle;
    const bodyToUse = ann.content ? smartTruncate(ann.content, 115) : matchedTheme.defaultBody;

    setPushComposeModal({
      isOpen: true,
      type: 'custom',
      title: titleToUse,
      body: bodyToUse,
      targetMode: 'all',
      targetId: String(ann.id),
      url: ann.cta_link || matchedTheme.defaultUrl || '/',
      imageUrl: '',
      entityName: ann.title || 'Announcement',
      previewDevice: 'ios',
      deliveryMode: 'both',
      themeId: matchedTheme.id,
      themeLabel: matchedTheme.label,
      icon: matchedTheme.icon,
      toneHint: matchedTheme.toneHint
    });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header & Navigation Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-100/80 text-yellow-700 flex items-center justify-center shrink-0 shadow-xs border border-yellow-200">
              <Megaphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 leading-tight">
                Admin Notification Hub
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Centralized Push Notifications, In-App Announcements & Sent History
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'history'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Dashboard & Sent Log</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {pushLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'custom'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Bell className="w-4 h-4 text-yellow-400" />
            <span>Custom Notifications</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {customAnnouncements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'events'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>Push Events</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {events.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('articles')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'articles'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Push Articles & Guides</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {allArticles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pros')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'pros'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Push New Pros</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {professionals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weekend')}
            className={cn(
              "px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              activeTab === 'weekend'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Weekend Spotlight</span>
            {weekendData.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-500 text-white font-black">
                {weekendData.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Push Log History & Dashboard */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div 
              onClick={() => setDashboardSubTab('bell')}
              className={cn(
                "p-4 rounded-2xl border shadow-xs space-y-1 cursor-pointer transition-all",
                dashboardSubTab === 'bell' ? "bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-400/30" : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider block">Live in User Bell</span>
                <Bell className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-black font-display text-slate-900">{adminAnnouncements.length}</p>
              <p className="text-[10px] text-slate-500 font-medium">In notification center</p>
            </div>

            <div 
              onClick={() => setDashboardSubTab('push')}
              className={cn(
                "p-4 rounded-2xl border shadow-xs space-y-1 cursor-pointer transition-all",
                dashboardSubTab === 'push' ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30" : "bg-white border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Push Alerts</span>
                <Send className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black font-display text-slate-900">{pushLogs.length}</p>
              <p className="text-[10px] text-slate-500 font-medium">Mobile logs logged</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider block">Events Pushed</span>
              <p className="text-2xl font-black font-display text-orange-600">
                {pushLogs.filter(l => l.type === 'event').length}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Community events</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Articles Pushed</span>
              <p className="text-2xl font-black font-display text-emerald-600">
                {pushLogs.filter(l => l.type === 'article').length}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Expat guides</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Pros Spotlighted</span>
              <p className="text-2xl font-black font-display text-blue-600">
                {pushLogs.filter(l => l.type === 'pro').length}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Service pros</p>
            </div>
          </div>

          {/* View Switcher Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <button
              type="button"
              onClick={() => setDashboardSubTab('bell')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                dashboardSubTab === 'bell'
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <Bell className="w-3.5 h-3.5 text-yellow-400" />
              <span>User Bell Center Notifications</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold",
                dashboardSubTab === 'bell' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {adminAnnouncements.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardSubTab('push')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                dashboardSubTab === 'push'
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Sent Mobile Push Log</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold",
                dashboardSubTab === 'push' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              )}>
                {pushLogs.length}
              </span>
            </button>
          </div>

          {/* VIEW 1: Active In-App Bell Center Notifications (with Delete Actions) */}
          {dashboardSubTab === 'bell' && (
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-500" />
                    Active In-App Notifications (User Bell Center)
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Live notifications currently visible to users in their in-app notification bell. Delete any notification here to remove it from users' view immediately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (onRefetchAnnouncements) await onRefetchAnnouncements();
                  }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                  title="Refresh notifications from database"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Refresh Feed</span>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search active notifications by title, message, or user..."
                    value={bellSearchQuery}
                    onChange={(e) => setBellSearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium text-slate-800"
                  />
                </div>

                <select
                  value={bellTypeFilter}
                  onChange={(e) => setBellTypeFilter(e.target.value)}
                  className="w-full sm:w-52 bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="all">All Notification Types ({adminAnnouncements.length})</option>
                  <option value="custom">Custom Broadcasts</option>
                  <option value="event">Events</option>
                  <option value="article">Articles &amp; Guides</option>
                  <option value="pro">Pro Spotlights</option>
                  <option value="weekend">Weekend Digests</option>
                </select>
              </div>

              {/* Notifications Table */}
              {loadingAnnouncements ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                </div>
              ) : filteredBellAnnouncements.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No active notifications found in users' Bell center</p>
                  <p className="text-[11px] text-slate-400">Broadcast a notification from any tab to deliver it to users' Bell dropdown.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-y border-slate-100">
                      <tr>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Title &amp; Content</th>
                        <th className="p-3.5">Target Audience</th>
                        <th className="p-3.5">Date Published</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 text-right">Delete Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBellAnnouncements.map((ann) => {
                        const cta = (ann.cta_type || '').toLowerCase();
                        let typeBadge = { label: 'Custom', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
                        if (cta === 'event') typeBadge = { label: 'Event', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
                        else if (cta === 'article' || cta === 'guide') typeBadge = { label: 'Article', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                        else if (cta === 'pro') typeBadge = { label: 'Pro', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
                        else if (cta === 'weekend') typeBadge = { label: 'Weekend', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

                        const dateFormatted = ann.created_at || ann.updated_at 
                          ? new Date(ann.created_at || ann.updated_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recent';

                        const targetMember = ann.target_user_id 
                          ? activeUsersList.find(u => u.id === ann.target_user_id) 
                          : null;

                        const isConfirming = confirmDeleteAnnId === ann.id;
                        const isDeleting = deletingBellAnnId === ann.id;

                        return (
                          <tr key={ann.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border", typeBadge.bg)}>
                                {typeBadge.label}
                              </span>
                            </td>
                            <td className="p-3.5 min-w-[240px]">
                              <p className="font-bold text-slate-900 leading-snug">{ann.title || 'Notification'}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{ann.content}</p>
                              {ann.cta_link && (
                                <span className="text-[10px] font-mono text-blue-600 mt-0.5 inline-block">
                                  {ann.cta_link}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {ann.target_user_id ? (
                                <div>
                                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px] inline-flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {targetMember?.full_name || targetMember?.email || 'Targeted Member'}
                                  </span>
                                  {targetMember?.email && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{targetMember.email}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="font-semibold text-slate-700 text-[11px] inline-flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  All Members
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                              {dateFormatted}
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                                ann.is_active !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                              )}>
                                {ann.is_active !== false ? 'Live in Bell' : 'Hidden'}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-right">
                              {isConfirming ? (
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteFromBell(ann.id)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase rounded-lg shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    <span>Confirm</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAnnId(null)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAnnId(ann.id)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                  title="Delete this notification from users' notification center"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Sent Mobile Push Log (OneSignal) */}
          {dashboardSubTab === 'push' && (
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-500" />
                    Sent Mobile Push Notifications Log
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Audit real mobile push notifications broadcasted to iOS &amp; Android members via OneSignal.</p>
                </div>

                {pushLogs.length > 0 && (
                  confirmClearHistory ? (
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Clear All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(false)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  )
                )}
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search log by title, message, or recipient..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium text-slate-800"
                  />
                </div>

                <select
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="w-full sm:w-48 bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="all">All Notification Types</option>
                  <option value="custom">Custom Notifications</option>
                  <option value="event">Events</option>
                  <option value="article">Articles &amp; Guides</option>
                  <option value="pro">Pro Spotlights</option>
                  <option value="weekend">Weekend Digests</option>
                  <option value="direct_member">Direct Member Push</option>
                </select>
              </div>

              {/* Log Table */}
              {filteredPushLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No push notification logs found</p>
                  <p className="text-[11px] text-slate-400">Send your first push notification from any of the sub-tabs above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-y border-slate-100">
                      <tr>
                        <th className="p-3.5">Date &amp; Time</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Title &amp; Message</th>
                        <th className="p-3.5">Target Audience</th>
                        <th className="p-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPushLogs.map((log) => {
                        const dateFormatted = new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        let typeBadge = { label: 'Custom', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
                        if (log.type === 'event') typeBadge = { label: 'Event', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
                        if (log.type === 'article') typeBadge = { label: 'Article', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                        if (log.type === 'pro') typeBadge = { label: 'Pro', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
                        if (log.type === 'weekend') typeBadge = { label: 'Weekend Digest', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                              {dateFormatted}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border", typeBadge.bg)}>
                                  {typeBadge.label}
                                </span>
                                {log.deliveryMode && (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border",
                                    log.deliveryMode === 'in_app'
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : log.deliveryMode === 'push'
                                        ? "bg-sky-50 text-sky-700 border-sky-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                  )}>
                                    {log.deliveryMode === 'in_app' ? 'In-App Only' : log.deliveryMode === 'push' ? 'Push Only' : 'Push + In-App'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 min-w-[240px]">
                              <p className="font-bold text-slate-900 leading-snug">{log.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{log.body}</p>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-semibold text-slate-800">{log.target}</span>
                              {log.recipientsCount !== undefined && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                  ~{log.recipientsCount} recipient{log.recipientsCount > 1 ? 's' : ''}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-center">
                              {log.status === 'sent' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Custom Notifications (Unified Push & In-App) */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-bold font-display text-slate-800">
                Custom Notifications
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                Create and broadcast custom notifications (dispatched to iOS &amp; Android smartphones via OneSignal and saved to the in-app Bell center).
              </p>
            </div>
            {!showAnnForm && (
              <button
                type="button"
                onClick={() => {
                  const defaultTheme = CUSTOM_NOTIFICATION_THEMES[0];
                  setPushComposeModal({
                    isOpen: true,
                    type: 'custom',
                    title: defaultTheme.defaultTitle,
                    body: defaultTheme.defaultBody,
                    targetMode: 'all',
                    url: defaultTheme.defaultUrl,
                    imageUrl: '',
                    previewDevice: 'ios',
                    deliveryMode: 'both',
                    themeId: defaultTheme.id,
                    themeLabel: defaultTheme.label,
                    icon: defaultTheme.icon,
                    toneHint: defaultTheme.toneHint
                  });
                }}
                className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-yellow-500/10 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Custom Notification
              </button>
            )}
          </div>

          {showAnnForm ? (
            <form onSubmit={handleSaveAnn} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {editingAnnId ? "Edit Notification" : "New Custom Notification"}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Configure message and delivery via OneSignal Push &amp; In-App Bell.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnForm(false);
                    setEditingAnnId(null);
                  }}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Theme Template (Quick Apply)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CUSTOM_NOTIFICATION_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setAnnIcon(theme.icon);
                          setAnnTitle(theme.defaultTitle);
                          setAnnContent(theme.defaultBody);
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                          annIcon === theme.icon && annContent === theme.defaultBody
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Title / Notification Heading
                  </label>
                  <input
                    type="text"
                    placeholder="MyCityUnlocked"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full text-xs px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Message Content</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. New Event: Sunset Acoustic Meetup in Ruzafa"
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 text-slate-800 font-medium"
                  />
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Emoji:</span>
                    <button
                      type="button"
                      onClick={() => setAnnContent(replaceLeadingEmoji(annContent, ''))}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer",
                        !extractLeadingEmoji(annContent)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                      )}
                      title="Remove emoji"
                    >
                      None
                    </button>
                    {NOTIFICATION_EMOJIS.map((em) => {
                      const active = extractLeadingEmoji(annContent) === em;
                      return (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setAnnContent(replaceLeadingEmoji(annContent, em))}
                          className={cn(
                            "w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer",
                            active
                              ? "bg-yellow-100 border-yellow-500 scale-105 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                          )}
                          title={`Use ${em}`}
                        >
                          {em}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Push Toggle inside Form */}
                <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="annSendPushCheck"
                      checked={annSendPush}
                      onChange={(e) => setAnnSendPush(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="annSendPushCheck" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        Send OneSignal Mobile Push (iOS App Store &amp; Android)
                      </label>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Dispatches real-time push notifications directly to smartphone lock screens (iOS App Store &amp; Android).
                      </p>
                    </div>
                  </div>

                  {annSendPush && (
                    <div className="pt-2 border-t border-blue-200/60 space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">Target Audience:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnPushTarget('all')}
                          className={cn(
                            "p-2 rounded-xl text-xs font-bold border text-left cursor-pointer",
                            annPushTarget === 'all' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
                          )}
                        >
                          All Subscribed Users
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnPushTarget('specific')}
                          className={cn(
                            "p-2 rounded-xl text-xs font-bold border text-left cursor-pointer",
                            annPushTarget === 'specific' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
                          )}
                        >
                          Specific Member
                        </button>
                      </div>

                      {annPushTarget === 'specific' && (
                        <select
                          value={annPushUserId}
                          onChange={(e) => setAnnPushUserId(e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                        >
                          <option value="">-- Choose member ({activeUsersList.length} registered) --</option>
                          {activeUsersList.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || 'Member'} — {u.email || u.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAnnForm(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-yellow-500/10 cursor-pointer"
                >
                  {annSendPush ? 'Save & Publish with OneSignal' : 'Save In-App Only'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Custom Notifications List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Custom Announcements ({customAnnouncements.length})
                  </h5>
                </div>

                {loadingAnnouncements ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                  </div>
                ) : customAnnouncements.length === 0 ? (
                  <div className="bg-white p-8 rounded-[24px] border border-slate-100 text-center space-y-2">
                    <Megaphone className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No custom notifications published yet</p>
                    <p className="text-xs text-slate-400">Click "New Custom Notification" above to broadcast your first custom message.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {customAnnouncements.map((ann) => {
                      const pushedAt = isTargetPushed(String(ann.id));
                      return (
                        <div
                          key={ann.id}
                          className="p-4 sm:p-5 rounded-[24px] bg-white border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                          <div className="space-y-1 text-left min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                                {ann.title || 'Notification'}
                              </span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ann.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                                {ann.is_active !== false ? 'Online' : 'Offline'}
                              </span>
                              {pushedAt && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OneSignal Push Sent
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">{ann.content}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => openAnnouncementPushModal(ann)}
                              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Broadcast this notification with OneSignal (iOS & Android)"
                            >
                              <Send className="w-3.5 h-3.5 text-slate-900" />
                              <span>Push OneSignal</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnnId(ann.id);
                                setAnnTitle(ann.title || '');
                                setAnnContent(ann.content || '');
                                setAnnIcon(ann.icon || 'megaphone');
                                setAnnSendPush(true);
                                setShowAnnForm(true);
                              }}
                              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteAnnouncement(ann.id)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dedicated Custom Push Log Table */}
              <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-yellow-500" />
                      Sent Custom Messages Log
                    </h5>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Audit history of custom push messages delivered to users (excluding events, guides, pros, and weekend spotlights).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className="px-2.5 py-1 bg-yellow-50 text-yellow-800 text-[10px] font-bold rounded-full border border-yellow-200">
                      {customPushLogs.length} custom alert{customPushLogs.length !== 1 ? 's' : ''} logged
                    </span>

                    {customPushLogs.length > 0 && (
                      confirmClearCustom ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleClearCustomHistory}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[10px] uppercase rounded-full shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearCustom(false)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-full cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearCustom(true)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] rounded-full border border-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Clear custom messages log"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Log</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {customPushLogs.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <History className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No custom messages sent yet</p>
                    <p className="text-[11px] text-slate-400">All broadcasted custom push notifications will appear in this log.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-y border-slate-100">
                        <tr>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">Title & Message</th>
                          <th className="p-3">Audience</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customPushLogs.map((log) => {
                          const dateFormatted = new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                                {dateFormatted}
                              </td>
                              <td className="p-3 min-w-[220px]">
                                <p className="font-bold text-slate-900 leading-snug">{log.title}</p>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{log.body}</p>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-semibold text-slate-800">{log.target}</span>
                                {log.recipientsCount !== undefined && (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    ~{log.recipientsCount} recipient{log.recipientsCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 whitespace-nowrap text-center">
                                {log.status === 'sent' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Sent
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Events Push Hub */}
      {activeTab === 'events' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold font-display text-slate-900">Events Push Center</h4>
                <p className="text-xs text-slate-400 font-medium">Select any community event to broadcast an instant mobile push notification to users.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter events by title or location..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                />
              </div>
            </div>

            {/* Events Grid */}
            {events.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">No events found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events
                  .filter((e) => {
                    if (!eventSearch.trim()) return true;
                    const q = eventSearch.toLowerCase();
                    return (
                      e.title?.toLowerCase().includes(q) ||
                      e.location?.toLowerCase().includes(q) ||
                      e.category?.toLowerCase().includes(q)
                    );
                  })
                  .map((evt) => {
                    const pushedAt = isTargetPushed(String(evt.id));
                    return (
                      <div
                        key={evt.id}
                        className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={evt.image || evt.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=400'}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block truncate">
                              {evt.category || 'Culture'}
                            </span>
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                              {evt.title}
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              📅 {evt.start_date || evt.date || 'Upcoming'} · 📍 {evt.location || 'Valencia'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          {pushedAt ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Pushed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              Not Pushed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openEventPushModal(evt)}
                            className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Push Event</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Articles & Guides Push Hub */}
      {activeTab === 'articles' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold font-display text-slate-900">Articles & Expat Guides Push</h4>
                <p className="text-xs text-slate-400 font-medium">Spotlight helpful expat guides, housing tips, and local articles directly to members' phones.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter articles by title or category..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>
            </div>

            {/* Articles Grid */}
            {allArticles.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">No articles available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allArticles
                  .filter((art) => {
                    if (!articleSearch.trim()) return true;
                    const q = articleSearch.toLowerCase();
                    return (
                      art.title?.toLowerCase().includes(q) ||
                      art.categoryTitle?.toLowerCase().includes(q) ||
                      art.excerpt?.toLowerCase().includes(q)
                    );
                  })
                  .map((art) => {
                    const pushedAt = isTargetPushed(String(art.id));
                    return (
                      <div
                        key={art.id}
                        className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          {art.imageUrl ? (
                            <img
                              src={art.imageUrl}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-lg">
                              📖
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block truncate">
                              {art.categoryTitle || 'Guide'}
                            </span>
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug">
                              {art.title}
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                              {art.excerpt || 'Local Valencia guide for expats.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          {pushedAt ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Pushed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              Not Pushed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openArticlePushModal(art)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Push Article</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: New Pros Push Hub */}
      {activeTab === 'pros' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold font-display text-slate-900">New Professionals Push Spotlight</h4>
                <p className="text-xs text-slate-400 font-medium">Announce newly registered and verified professionals in Valencia to the community.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter pros by name or category..."
                  value={proSearch}
                  onChange={(e) => setProSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>
            </div>

            {/* Pros Grid */}
            {professionals.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">No professionals found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionals
                  .filter((p) => p.is_recommended !== false)
                  .filter((p) => {
                    if (!proSearch.trim()) return true;
                    const q = proSearch.toLowerCase();
                    const name = p.full_name || p.name || '';
                    return (
                      name.toLowerCase().includes(q) ||
                      p.category?.toLowerCase().includes(q) ||
                      p.location?.toLowerCase().includes(q)
                    );
                  })
                  .map((p) => {
                    const pushedAt = isTargetPushed(String(p.id));
                    const proName = p.full_name || p.name || 'Professional';
                    return (
                      <div
                        key={p.id}
                        className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={p.image_url || p.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <h5 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {proName}
                              </h5>
                              {p.verified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block truncate">
                              {p.category || 'Service Provider'}
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              📍 {p.location || 'Valencia'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          {pushedAt ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Pushed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              Not Pushed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openProPushModal(p)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Push Pro</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: Periodic Weekend Digest Push */}
      {activeTab === 'weekend' && (
        <div className="space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-[28px] border border-slate-100 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Sparkles className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-display text-slate-900">
                    Periodic "Events of the Weekend" Broadcast
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Auto-scans upcoming weekend events ({weekendData.rangeText}) and broadcasts a single digest message.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openWeekendDigestPushModal}
                className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Weekend Digest</span>
              </button>
            </div>

            {/* Weekend Events Summary Preview Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Upcoming Weekend ({weekendData.rangeText})
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase">
                  {weekendData.count} Event{weekendData.count !== 1 ? 's' : ''} Found
                </span>
              </div>

              {weekendData.events.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium italic">
                  No specific events scheduled for this weekend. You can still send a general weekend spotlight message!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {weekendData.events.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-white p-3 rounded-xl border border-amber-200/60 flex items-center gap-2.5 shadow-2xs"
                    >
                      <img
                        src={evt.image || evt.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=200'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{evt.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{evt.start_date || evt.date} • {evt.location || 'Valencia'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PUSH COMPOSE, LIVE PREVIEW & EDITING MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {pushComposeModal?.isOpen && (
            <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 pt-[calc(env(safe-area-inset-top,12px)+64px)] pb-[calc(env(safe-area-inset-bottom,12px)+76px)] sm:pt-6 sm:pb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-white rounded-[28px] max-w-4xl w-full flex flex-col shadow-2xl border border-slate-100 text-left my-auto max-h-full overflow-hidden relative"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white rounded-t-[28px]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      <Bell className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 flex-wrap">
                        Push Notification Studio
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                          Live Visual Preview & Editor
                        </span>
                        {pushComposeModal.themeLabel && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase border border-amber-200">
                            Theme: {pushComposeModal.themeLabel}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {pushComposeModal.entityName
                          ? `Target: ${pushComposeModal.entityName}`
                          : 'Theme-adapted mobile push & in-app Bell broadcast'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPushComposeModal(null)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Modal Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
                  {/* Grid: Left Column (Live Visual Preview) & Right Column (Interactive Editor) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: LIVE VISUAL PREVIEW ("Visuel") */}
                <div className="lg:col-span-5 space-y-3.5 bg-slate-900/95 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Live Visual Preview
                      </span>
                    </div>

                    {/* Preview Mode Switcher */}
                    <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPushComposeModal({ ...pushComposeModal, previewDevice: 'ios' })}
                        className={cn(
                          "px-2 py-1 rounded-lg transition-all cursor-pointer",
                          (pushComposeModal.previewDevice || 'ios') === 'ios'
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        📱 iOS
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushComposeModal({ ...pushComposeModal, previewDevice: 'android' })}
                        className={cn(
                          "px-2 py-1 rounded-lg transition-all cursor-pointer",
                          pushComposeModal.previewDevice === 'android'
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        🤖 Android
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushComposeModal({ ...pushComposeModal, previewDevice: 'in_app' })}
                        className={cn(
                          "px-2 py-1 rounded-lg transition-all cursor-pointer",
                          pushComposeModal.previewDevice === 'in_app'
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        🔔 In-App
                      </button>
                    </div>
                  </div>

                  {/* 1. iOS LOCK SCREEN PREVIEW */}
                  {(pushComposeModal.previewDevice || 'ios') === 'ios' && (
                    <div className="relative rounded-2xl bg-gradient-to-b from-purple-950 via-slate-950 to-purple-950 p-4 border border-purple-900/50 shadow-inner space-y-3 overflow-hidden select-none">
                      {/* Phone status bar */}
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium px-1">
                        <span>02:04</span>
                        <div className="w-12 h-2.5 rounded-full bg-black/80 border border-slate-800 mx-auto" />
                        <div className="flex items-center gap-1.5 text-[9px]">
                          <span>5G</span>
                          <span className="w-3.5 h-2 border border-slate-300 rounded-2xs inline-block relative bg-slate-200" />
                        </div>
                      </div>

                      {/* Phone Clock widget (Matching user screenshot) */}
                      <div className="text-center py-1">
                        <div className="text-[11px] font-medium text-slate-300 tracking-wide">Tue 3 Nov</div>
                        <div className="text-3xl font-light tracking-tight text-purple-200">2:04</div>
                      </div>

                      {/* Lockscreen Notification Glass Card (Sleek discreet native iOS style) */}
                      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-3.5 rounded-2xl shadow-xl space-y-1.5 text-left relative overflow-hidden">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-white p-0.5 shadow-xs flex items-center justify-center shrink-0 border border-slate-200">
                              <img src="/logo2.png" alt="" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-bold text-white text-[11px] tracking-tight">
                              {pushComposeModal.title || 'Notification Title'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-300 font-medium">now</span>
                        </div>

                        <p className="text-xs text-slate-200 font-normal leading-relaxed break-words pl-7">
                          {pushComposeModal.body || 'Message body text.'}
                        </p>

                        {pushComposeModal.imageUrl && (
                          <div className="pt-1 pl-7">
                            <img
                              src={pushComposeModal.imageUrl}
                              alt=""
                              className="w-full h-24 rounded-xl object-cover border border-white/20 shadow-xs"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. ANDROID BANNER PREVIEW */}
                  {pushComposeModal.previewDevice === 'android' && (
                    <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 shadow-inner space-y-2 select-none">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pb-1">
                        <span>Android Dropdown Banner</span>
                        <span className="text-emerald-400 font-bold">● Live Preview</span>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-lg text-left">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white p-1 shrink-0 border border-slate-700 flex items-center justify-center shadow-xs">
                            <img src="/logo2.png" alt="Unlocked" className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-xs text-white break-words">
                                {pushComposeModal.title || 'New Event'}
                              </h5>
                              <span className="text-[10px] text-slate-400 shrink-0">now</span>
                            </div>
                            <p className="text-xs text-slate-300 font-normal leading-normal break-words">
                              {pushComposeModal.body || 'Short description text.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. IN-APP BELL CENTER PREVIEW */}
                  {pushComposeModal.previewDevice === 'in_app' && (
                    <div className="relative rounded-2xl bg-slate-100 p-3.5 border border-slate-300 text-slate-900 shadow-inner space-y-2 select-none">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                        <span>In-App Bell Preview</span>
                        <span className="text-blue-600">Logo + Title + Short Description</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex items-start gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                          <img src="/logo2.png" alt="Unlocked" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h5 className="font-bold text-xs text-slate-900 leading-snug break-words">
                              {pushComposeModal.title || 'New Event'}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">Just now</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed break-words line-clamp-2">
                            {pushComposeModal.body || 'Short description text.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Delivery Mode:</span>
                      <span className="font-bold text-sky-400">
                        {(pushComposeModal.deliveryMode || 'both') === 'in_app'
                          ? '🔔 In-App Bell Only'
                          : (pushComposeModal.deliveryMode || 'both') === 'push'
                            ? '📲 Mobile Push Only'
                            : '📲 + 🔔 Push & In-App'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audience:</span>
                      <span className="font-bold text-amber-400">
                        {pushComposeModal.targetMode === 'specific' ? '🎯 Single Specific Member' : '📢 All Registered Members'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE EDITOR ("Edition") */}
                <div className="lg:col-span-7 space-y-4">

                  {/* Theme & Subject Selector (for custom) or Detected Theme Banner (for entity pushes) */}
                  {pushComposeModal.type === 'custom' ? (
                    <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                          Notification Theme &amp; Subject
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Adapts copy, icon &amp; link
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {CUSTOM_NOTIFICATION_THEMES.map((theme) => {
                          const isSelected = pushComposeModal.themeId === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => {
                                setPushComposeModal({
                                  ...pushComposeModal,
                                  themeId: theme.id,
                                  themeLabel: theme.label,
                                  icon: theme.icon,
                                  toneHint: theme.toneHint,
                                  title: theme.defaultTitle,
                                  body: theme.defaultBody,
                                  url: theme.defaultUrl
                                });
                              }}
                              className={cn(
                                "px-2.5 py-2 rounded-xl text-[11px] font-bold border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 truncate",
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                  : "bg-white hover:bg-blue-50/60 text-slate-700 border-slate-200"
                              )}
                            >
                              <span className="truncate">{theme.label}</span>
                              {isSelected && <Check className="w-3 h-3 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {pushComposeModal.toneHint && (
                        <p className="text-[11px] text-slate-600 bg-white/90 px-2.5 py-1.5 rounded-lg border border-slate-200/70 leading-snug">
                          💡 <span className="font-semibold">Style tip:</span> {pushComposeModal.toneHint}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Format: Logo + {pushComposeModal.title || pushComposeModal.themeLabel}</span>
                        </div>
                        {pushComposeModal.toneHint && (
                          <p className="text-[11px] text-blue-800/80 leading-snug">{pushComposeModal.toneHint}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          let refreshed;
                          if (pushComposeModal.type === 'event' && pushComposeModal.sourceEntity) {
                            refreshed = buildEventNotificationContent(pushComposeModal.sourceEntity);
                          } else if (pushComposeModal.type === 'article' && pushComposeModal.sourceEntity) {
                            refreshed = buildArticleNotificationContent(pushComposeModal.sourceEntity);
                          } else if (pushComposeModal.type === 'pro' && pushComposeModal.sourceEntity) {
                            refreshed = buildProNotificationContent(pushComposeModal.sourceEntity);
                          } else if (pushComposeModal.type === 'weekend') {
                            refreshed = buildWeekendDigestNotificationContent(weekendData.events, weekendData.rangeText);
                          }
                          if (refreshed) {
                            setPushComposeModal({
                              ...pushComposeModal,
                              title: refreshed.title,
                              body: refreshed.body,
                              themeId: refreshed.themeId,
                              themeLabel: refreshed.themeLabel,
                              icon: refreshed.icon
                            });
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-100/70 text-blue-700 border border-blue-200 text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                      >
                        ↻ Reset Copy
                      </button>
                    </div>
                  )}

                  {/* Notification Title Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Notification Title <span className="text-rose-500">*</span>
                      </label>
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                        pushComposeModal.title.length > 45 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {pushComposeModal.title.length} / 45 ideal
                      </span>
                    </div>

                    <input
                      type="text"
                      value={pushComposeModal.title}
                      onChange={(e) => setPushComposeModal({ ...pushComposeModal, title: e.target.value })}
                      placeholder="MyCityUnlocked"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Short Description Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Short Description <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {(pushComposeModal.body.length > 130 || pushComposeModal.title.length > 45) && (
                          <button
                            type="button"
                            onClick={() => setPushComposeModal({
                              ...pushComposeModal,
                              title: smartTruncate(pushComposeModal.title, 45),
                              body: smartTruncate(pushComposeModal.body, 130)
                            })}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer transition-colors"
                          >
                            ✂️ Keep Short
                          </button>
                        )}
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                          pushComposeModal.body.length > 130 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        )}>
                          {pushComposeModal.body.length} / 130 ideal
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={pushComposeModal.body}
                      onChange={(e) => setPushComposeModal({ ...pushComposeModal, body: e.target.value })}
                      placeholder="Write a brief, clear description (kept concise for iPhone, Android & In-App)..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
                    />

                    {/* Interactive Emoji Picker */}
                    <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Choose Emoji
                        </span>
                        {extractLeadingEmoji(pushComposeModal.body) && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Selected: {extractLeadingEmoji(pushComposeModal.body)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setPushComposeModal({
                              ...pushComposeModal,
                              body: replaceLeadingEmoji(pushComposeModal.body, '')
                            })
                          }
                          className={cn(
                            "px-2 h-7 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer",
                            !extractLeadingEmoji(pushComposeModal.body)
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white hover:bg-slate-100 text-slate-500 border-slate-200"
                          )}
                          title="Remove leading emoji"
                        >
                          None
                        </button>
                        {NOTIFICATION_EMOJIS.map((em) => {
                          const isCurrent = extractLeadingEmoji(pushComposeModal.body) === em;
                          return (
                            <button
                              key={em}
                              type="button"
                              onClick={() =>
                                setPushComposeModal({
                                  ...pushComposeModal,
                                  body: replaceLeadingEmoji(pushComposeModal.body, em)
                                })
                              }
                              className={cn(
                                "w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer",
                                isCurrent
                                  ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 scale-105 shadow-xs"
                                  : "bg-white hover:bg-blue-50/60 border-slate-200"
                              )}
                              title={`Use ${em}`}
                            >
                              {em}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Destination Link / URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Target Destination Link / Route
                    </label>
                    <input
                      type="text"
                      value={pushComposeModal.url || ''}
                      onChange={(e) => setPushComposeModal({ ...pushComposeModal, url: e.target.value })}
                      placeholder="e.g. /#events or /#directory or https://..."
                      className="w-full text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Link Presets:</span>
                      {[
                        { label: '📅 Events', val: '/#events' },
                        { label: '📖 Guides', val: '/#guides' },
                        { label: '💼 Directory', val: '/#directory' },
                        { label: '🛍️ Marketplace', val: '/#marketplace' }
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setPushComposeModal({ ...pushComposeModal, url: preset.val })}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail Image URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Thumbnail Image URL (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pushComposeModal.imageUrl || ''}
                        onChange={(e) => setPushComposeModal({ ...pushComposeModal, imageUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {pushComposeModal.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPushComposeModal({ ...pushComposeModal, imageUrl: '' })}
                          className="px-2.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          title="Remove Image"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Mode Selector: In-App Only / Push Only / Both */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Delivery Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'both' as const, label: '📲 + 🔔 Both', desc: 'Push & In-App Bell' },
                        { id: 'in_app' as const, label: '🔔 In-App Only', desc: 'Header Bell only' },
                        { id: 'push' as const, label: '📲 Push Only', desc: 'OneSignal Mobile only' }
                      ].map((modeOpt) => {
                        const isSelected = (pushComposeModal.deliveryMode || 'both') === modeOpt.id;
                        return (
                          <button
                            key={modeOpt.id}
                            type="button"
                            onClick={() => setPushComposeModal({
                              ...pushComposeModal,
                              deliveryMode: modeOpt.id,
                              previewDevice: modeOpt.id === 'in_app' ? 'in_app' : (pushComposeModal.previewDevice === 'in_app' && modeOpt.id === 'push' ? 'ios' : pushComposeModal.previewDevice)
                            })}
                            className={cn(
                              "p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col",
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{modeOpt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>
                            <span className={cn("text-[10px]", isSelected ? "text-slate-300" : "text-slate-500")}>
                              {modeOpt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPushComposeModal({ ...pushComposeModal, targetMode: 'all' })}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-bold border text-left cursor-pointer transition-all flex items-center justify-between",
                          pushComposeModal.targetMode === 'all'
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">📢 All Users</span>
                        {pushComposeModal.targetMode === 'all' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushComposeModal({ ...pushComposeModal, targetMode: 'specific' })}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-bold border text-left cursor-pointer transition-all flex items-center justify-between",
                          pushComposeModal.targetMode === 'specific'
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate">🎯 Member</span>
                        {pushComposeModal.targetMode === 'specific' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    </div>

                    {pushComposeModal.targetMode === 'specific' && (
                      <div className="space-y-2 mt-2">
                        <select
                          value={pushComposeModal.selectedUserId || ''}
                          onChange={(e) => setPushComposeModal({ ...pushComposeModal, selectedUserId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- Select target member ({activeUsersList.length} members) --</option>
                          {activeUsersList.map((u) => {
                            const hasToken = Boolean(u.onesignal_player_id);
                            return (
                              <option key={u.id} value={u.id}>
                                {u.full_name || 'Member'} — {u.email || u.id} {hasToken ? '📱 [Push Ready]' : '🔔 [In-App Bell Only]'}
                              </option>
                            );
                          })}
                        </select>

                        {pushComposeModal.selectedUserId && (() => {
                          const selectedUser = activeUsersList.find(u => u.id === pushComposeModal.selectedUserId);
                          const hasPush = Boolean(selectedUser?.onesignal_player_id);
                          if ((pushComposeModal.deliveryMode || 'both') === 'in_app') {
                            return (
                              <div className="p-3 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-900 text-[11px] font-medium flex items-center gap-2">
                                <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                                <span><strong>In-App Bell Ready:</strong> This member will see the notification in their Bell center inside the app (no mobile push will be sent).</span>
                              </div>
                            );
                          }
                          return (
                            <div className={cn(
                              "p-3 rounded-xl border text-[11px] font-medium leading-relaxed",
                              hasPush ? "bg-emerald-50/90 border-emerald-200 text-emerald-800" : "bg-amber-50/90 border-amber-200 text-amber-900"
                            )}>
                              {hasPush ? (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="truncate"><strong>Push Device Linked:</strong> Mobile lockscreen push is active for this member.</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openDeviceLinkModal(selectedUser!.id, selectedUser!.full_name || selectedUser!.email || 'Member')}
                                    className="shrink-0 text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    🔄 Change Phone
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <span><strong>In-App Bell Only:</strong> No push device is currently linked to this member. Pair a device below to deliver OneSignal mobile push:</span>
                                  </div>
                                  <div className="pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => openDeviceLinkModal(selectedUser!.id, selectedUser!.full_name || selectedUser!.email || 'Member')}
                                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                    >
                                      <Smartphone className="w-3.5 h-3.5" />
                                      <span>📲 Pair Admin / Member Device (1-Click)</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Delivery Channels (only needed when Mobile Push is active) */}
                  {(pushComposeModal.deliveryMode || 'both') !== 'in_app' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Push Delivery Channels
                        </label>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                          📱 iOS &amp; Android
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'ios' as const, label: ' iPhone / iPad', desc: 'iOS App & Safari PWA' },
                          { id: 'android' as const, label: '🤖 Android', desc: 'Android App & PWA' },
                          { id: 'web' as const, label: '🌐 Web Push', desc: 'Mobile & Desktop Web' }
                        ].map((chan) => {
                          const active = (pushComposeModal.channels || ['ios', 'android', 'web']).includes(chan.id);
                          return (
                            <button
                              key={chan.id}
                              type="button"
                              onClick={() => {
                                const current = pushComposeModal.channels || ['ios', 'android', 'web'];
                                const next = active
                                  ? current.filter(c => c !== chan.id)
                                  : [...current, chan.id];
                                if (next.length > 0) {
                                  setPushComposeModal({ ...pushComposeModal, channels: next });
                                }
                              }}
                              className={cn(
                                "p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col",
                                active 
                                  ? "bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm" 
                                  : "bg-slate-50 border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{chan.label}</span>
                                {active && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <span className="text-[10px] text-slate-500">{chan.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50/80 rounded-b-[28px]">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {(pushComposeModal.deliveryMode || 'both') === 'in_app'
                      ? 'Will be published only in the In-App Bell notification center.'
                      : (pushComposeModal.deliveryMode || 'both') === 'push'
                        ? 'Will be sent only via OneSignal Mobile Push (not saved in In-App Bell).'
                        : 'Dispatched via OneSignal Push & saved in the In-App Bell center.'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSendingPush}
                    onClick={() => setPushComposeModal(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSendingPush || !pushComposeModal.title.trim() || !pushComposeModal.body.trim()}
                    onClick={handleExecuteSendPush}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSendingPush ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {(pushComposeModal.deliveryMode || 'both') === 'in_app'
                            ? 'Publish In-App Only'
                            : (pushComposeModal.deliveryMode || 'both') === 'push'
                              ? 'Send Push Only'
                              : 'Send Push & In-App'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {deviceLinkModal?.isOpen && (
          <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLinkingDevice && setDeviceLinkModal(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight">Pair Test Device</h3>
                    <p className="text-[11px] text-blue-100 font-medium truncate max-w-[280px]">
                      Target recipient: <span className="underline font-bold">{deviceLinkModal.userName}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLinkingDevice}
                  onClick={() => setDeviceLinkModal(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Option 1: Pair Current Device */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-blue-900 text-xs block">Option A: Pair This Device</span>
                      <p className="text-[11px] text-blue-700 leading-tight">
                        Instantly link your current browser or phone to this member account.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLinkingDevice}
                      onClick={() => handleLinkCurrentDevice(deviceLinkModal.userId)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                    >
                      {isLinkingDevice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Pair This Device</span>
                    </button>
                  </div>
                </div>

                {/* Option 2: Select from Active OneSignal Devices */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs block">Option B: Select Active Device</span>
                      <p className="text-[11px] text-slate-500">
                        Choose from registered active devices in your OneSignal app.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDeviceLinkModal(deviceLinkModal.userId, deviceLinkModal.userName)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      title="Reload devices list"
                    >
                      <RefreshCw className={cn("w-3 h-3", loadingActiveDevices && "animate-spin")} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loadingActiveDevices ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-[11px]">Loading active devices from OneSignal...</span>
                    </div>
                  ) : activeDevicesList.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px]">
                      No messageable devices found in OneSignal. Make sure you opened the app and allowed notifications.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {activeDevicesList.map((dev: any) => {
                        const targetUser = activeUsersList.find(u => u.id === deviceLinkModal.userId);
                        const isCurrent = targetUser?.onesignal_player_id?.includes(dev.id);

                        return (
                          <div
                            key={dev.id}
                            className={cn(
                              "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                              isCurrent 
                                ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-500/20" 
                                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/70"
                            )}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 text-xs truncate">
                                  {dev.platform === 'ios' ? ' ' : dev.platform === 'android' ? '🤖 ' : '🌐 '}
                                  {dev.model}
                                </span>
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider",
                                  dev.platform === 'ios' ? "bg-slate-100 text-slate-700" :
                                  dev.platform === 'android' ? "bg-emerald-100 text-emerald-800" :
                                  "bg-blue-100 text-blue-800"
                                )}>
                                  {dev.platform}
                                </span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                ID: {dev.id} • {dev.sessionCount} sessions {dev.os ? `• OS ${dev.os}` : ''}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={isLinkingDevice}
                              onClick={() => handleLinkDeviceToUser(deviceLinkModal.userId, dev.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg font-bold text-[11px] shrink-0 transition-all cursor-pointer",
                                isCurrent
                                  ? "bg-emerald-600 text-white cursor-default"
                                  : "bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700"
                              )}
                            >
                              {isCurrent ? 'Paired ✓' : 'Pair to Member'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">💡 How Specific Member Delivery Works:</p>
                  <p>When you dispatch a notification to <strong>{deviceLinkModal.userName}</strong>, it will appear strictly in their in-app Bell, and trigger a direct lockscreen mobile push notification exclusively to their paired device.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={isLinkingDevice}
                  onClick={() => setDeviceLinkModal(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
  </div>
);
};
