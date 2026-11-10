import React, { useState, useEffect, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { oneSignalService } from '../services/oneSignalService';
import { cn } from '../lib/utils';
import { getCurrentWeekendInterval } from './LandingEventHighlightsCard';

export interface PushLogEntry {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  type: 'custom' | 'event' | 'article' | 'pro' | 'weekend' | 'direct_member';
  target: string; // 'All Users' or username/email
  targetId?: string; // ID of event, article, pro, or user
  url?: string;
  recipientsCount?: number;
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

export function savePushLogEntry(entry: Omit<PushLogEntry, 'id' | 'timestamp'>): PushLogEntry {
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

  // Push history log state
  const [pushLogs, setPushLogs] = useState<PushLogEntry[]>(() => getPushLogs());
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

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

  // Check if target was already pushed
  const isTargetPushed = (targetId?: string) => {
    if (!targetId) return null;
    const match = pushLogs.find(l => l.targetId === String(targetId) && l.status === 'sent');
    return match ? match.timestamp : null;
  };

  // Execute Push Notification send
  const handleExecuteSendPush = async () => {
    if (!pushComposeModal) return;
    const { title, body, targetMode, selectedUserId, type, targetId, url } = pushComposeModal;

    if (!title.trim() || !body.trim()) {
      setMsg({ type: 'error', text: 'Please fill in both the title and body of the push notification.' });
      return;
    }

    if (targetMode === 'specific' && !selectedUserId) {
      setMsg({ type: 'error', text: 'Please select a specific member recipient.' });
      return;
    }

    setIsSendingPush(true);
    try {
      let targetUserIds: string[] | undefined = undefined;
      let targetAudienceLabel = 'All Users';

      if (targetMode === 'specific' && selectedUserId) {
        targetUserIds = [selectedUserId];
        const userObj = allUsersList.find(u => u.id === selectedUserId);
        targetAudienceLabel = userObj ? (userObj.full_name || userObj.email || selectedUserId) : selectedUserId;
      }

      const res = await oneSignalService.sendServerNotification(
        title.trim(),
        body.trim(),
        url || '/',
        targetUserIds,
        undefined,
        pushComposeModal.imageUrl,
        {
          type,
          target_id: targetId,
          url: url || '/'
        }
      );

      const recipientCount = res?.recipients ?? res?.result?.recipients ?? (targetMode === 'specific' ? 1 : allUsersList.length || 1);

      // Record in history log
      savePushLogEntry({
        title: title.trim(),
        body: body.trim(),
        type,
        target: targetAudienceLabel,
        targetId,
        url: url || '/',
        recipientsCount: recipientCount,
        status: 'sent'
      });

      // Save as in-app announcement so all users see it in header notification bell
      try {
        await onSaveAnnouncement({
          title: title.trim(),
          content: body.trim(),
          icon: type === 'event' || type === 'weekend' ? 'event' : type === 'article' ? 'guide' : type === 'pro' ? 'star' : 'megaphone',
          is_active: true,
          cta_type: type,
          target_id: targetId || null,
          cta_link: url || '/'
        });
        if (onRefetchAnnouncements) {
          await onRefetchAnnouncements();
        }
      } catch (annErr) {
        console.warn('Notice: announcement DB sync note:', annErr);
      }

      reloadPushLogs();
      setMsg({ type: 'success', text: `🚀 Mobile Push Notification sent successfully! (${recipientCount} recipient${recipientCount > 1 ? 's' : ''})` });
      setPushComposeModal(null);
    } catch (err: any) {
      console.error('Error sending push notification:', err);
      // Record failure entry in log
      savePushLogEntry({
        title: title.trim(),
        body: body.trim(),
        type,
        target: targetMode === 'specific' ? 'Specific User' : 'All Users',
        targetId,
        url: url || '/',
        status: 'error',
        errorMessage: err?.message || 'Failed to dispatch notification'
      });
      reloadPushLogs();
      setMsg({ type: 'error', text: 'Error sending push: ' + (err?.message || 'Check OneSignal configuration.') });
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
        cta_type: annCtaType || null
      });

      if (annSendPush) {
        let targetUserIds: string[] | undefined = undefined;
        let targetLabel = 'All Users';

        if (annPushTarget === 'specific' && annPushUserId) {
          targetUserIds = [annPushUserId];
          const u = allUsersList.find(x => x.id === annPushUserId);
          targetLabel = u ? (u.full_name || u.email || annPushUserId) : annPushUserId;
        }

        try {
          const res = await oneSignalService.sendServerNotification(
            annTitle.trim() || 'Unlocked Valencia 🌴',
            annContent.trim(),
            '/',
            targetUserIds
          );

          savePushLogEntry({
            title: annTitle.trim() || 'Unlocked Valencia 🌴',
            body: annContent.trim(),
            type: 'custom',
            target: targetLabel,
            targetId: annPushUserId || undefined,
            url: '/',
            recipientsCount: res?.recipients ?? 1,
            status: 'sent'
          });
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
    const dateStr = event.start_date || event.date ? `📅 ${event.start_date || event.date}` : '';
    const locStr = event.location ? `📍 ${event.location}` : 'Valencia';
    const bodyStr = [dateStr, locStr].filter(Boolean).join(' · ') || 'Discover this new event on Unlocked!';

    setPushComposeModal({
      isOpen: true,
      type: 'event',
      title: `🎉 ${event.title}`,
      body: bodyStr,
      targetMode: 'all',
      targetId: String(event.id),
      url: `/?eventId=${event.id}#events`,
      imageUrl: '',
      entityName: event.title,
      previewDevice: 'ios'
    });
  };

  // Open Article Push Compose Modal
  const openArticlePushModal = (article: any) => {
    const excerptStr = article.excerpt ? article.excerpt.substring(0, 90) : 'Check out our new guide on Unlocked!';
    setPushComposeModal({
      isOpen: true,
      type: 'article',
      title: `📖 ${article.title}`,
      body: `${excerptStr} · Read the guide on Unlocked!`,
      targetMode: 'all',
      targetId: String(article.id),
      url: `/?guideId=${article.id}#guides`,
      imageUrl: '',
      entityName: article.title,
      previewDevice: 'ios'
    });
  };

  // Open Pro Push Compose Modal
  const openProPushModal = (pro: any) => {
    const categoryStr = pro.category ? `${pro.category}` : 'Professional Service';
    const locationStr = pro.location ? ` in ${pro.location}` : ' in Valencia';
    setPushComposeModal({
      isOpen: true,
      type: 'pro',
      title: `✨ ${pro.full_name || pro.name}`,
      body: `${categoryStr}${locationStr} · Contact and reviews now available on Unlocked!`,
      targetMode: 'all',
      targetId: String(pro.id),
      url: `/?proId=${pro.id}#explore`,
      imageUrl: '',
      entityName: pro.full_name || pro.name,
      previewDevice: 'ios'
    });
  };

  // Open Weekend Digest Push Compose Modal
  const openWeekendDigestPushModal = () => {
    const titles = weekendData.events.map(e => e.title).filter(Boolean);
    let sampleText = '';
    if (titles.length > 0) {
      sampleText = titles.slice(0, 2).join(', ');
      if (titles.length > 2) sampleText += `, & ${titles.length - 2} more!`;
    } else {
      sampleText = 'Fairs, concerts, and weekend plans!';
    }

    setPushComposeModal({
      isOpen: true,
      type: 'weekend',
      title: `🌟 Valencia Weekend (${weekendData.rangeText})`,
      body: weekendData.count > 0 
        ? `${weekendData.count} top events this weekend: ${sampleText} Tap to discover plans on Unlocked!`
        : `Discover weekend events, exhibitions, and concerts in Valencia on Unlocked!`,
      targetMode: 'all',
      url: '/#events',
      imageUrl: '',
      entityName: `Weekend Digest (${weekendData.rangeText})`,
      previewDevice: 'ios'
    });
  };

  // Open Announcement Push Compose Modal (OneSignal)
  const openAnnouncementPushModal = (ann: any) => {
    setPushComposeModal({
      isOpen: true,
      type: 'custom',
      title: ann.title && ann.title !== 'Announcement' ? ann.title : 'Unlocked Valencia 🌴',
      body: ann.content || '',
      targetMode: 'all',
      targetId: String(ann.id),
      url: '/',
      imageUrl: '',
      entityName: ann.title || 'Announcement',
      previewDevice: 'ios'
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

          <button
            type="button"
            onClick={() => {
              setPushComposeModal({
                isOpen: true,
                type: 'custom',
                title: 'Unlocked Valencia 🌴',
                body: '',
                targetMode: 'all',
                url: '/',
                imageUrl: '',
                previewDevice: 'ios'
              });
            }}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-yellow-500/15 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Send Custom Push</span>
          </button>
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
            <span>In-App & Custom Push</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold">
              {adminAnnouncements.length}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Push Alerts</span>
              <p className="text-2xl font-black font-display text-slate-900">{pushLogs.length}</p>
              <p className="text-[10px] text-slate-500 font-medium">Logged in storage</p>
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

            <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Pros Spotlighted</span>
              <p className="text-2xl font-black font-display text-blue-600">
                {pushLogs.filter(l => l.type === 'pro').length}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Service professionals</p>
            </div>
          </div>

          {/* History Log Controls */}
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold font-display text-slate-900">Sent Push Notifications Log</h4>
                <p className="text-xs text-slate-400 font-medium">Audit real mobile push notifications broadcasted to iOS &amp; Android members.</p>
              </div>

              {pushLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all push history logs from this browser?')) {
                      clearPushHistoryLog();
                      reloadPushLogs();
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
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
                <option value="custom">Custom Broadcasts</option>
                <option value="event">Events</option>
                <option value="article">Articles & Guides</option>
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
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Title & Message</th>
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
                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border", typeBadge.bg)}>
                              {typeBadge.label}
                            </span>
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
        </div>
      )}

      {/* SUB-TAB 2: Custom Broadcasts & In-App Announcements */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-bold font-display text-slate-800">
                In-App Announcements & Custom Messages
              </h4>
              <p className="text-xs text-slate-400 font-medium">Publish announcements that show in the app bell dropdown or push to lock screens.</p>
            </div>
            {!showAnnForm && (
              <button
                onClick={() => {
                  setAnnTitle('');
                  setAnnContent('');
                  setAnnIsActive(true);
                  setAnnCtaType('');
                  setAnnSendPush(true);
                  setEditingAnnId(null);
                  setShowAnnForm(true);
                }}
                className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-yellow-500/10 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Announcement
              </button>
            )}
          </div>

          {showAnnForm ? (
            <form onSubmit={handleSaveAnn} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    {editingAnnId ? "Edit Announcement" : "New In-App Announcement"}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Configure message and mobile push delivery via OneSignal.</p>
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
                    Title / Notification Heading
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Community Announcement, Maintenance, Feature Update"
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
                    placeholder="e.g. New features added to Unlocked Valencia! Explore events and local pro recommendations."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="w-full text-xs px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 text-slate-800 font-medium"
                  />
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
                        Envoyer le Push Mobile OneSignal (iOS App Store & Android)
                      </label>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Toutes les annonces sont envoyées via OneSignal Push directement sur smartphones (iPhone App Store &amp; Android).
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
                          <option value="">-- Choose member ({allUsersList.length} registered) --</option>
                          {allUsersList.map(u => (
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
                  Save &amp; Publish with OneSignal
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {loadingAnnouncements ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                </div>
              ) : adminAnnouncements.length === 0 ? (
                <div className="bg-white p-10 rounded-[28px] border border-slate-100 text-center space-y-2">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No announcements published yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {adminAnnouncements.map((ann) => {
                    const pushedAt = isTargetPushed(String(ann.id));
                    return (
                      <div
                        key={ann.id}
                        className="p-4 sm:p-5 rounded-[24px] bg-white border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                      >
                        <div className="space-y-1 text-left min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                              {ann.title || 'Announcement'}
                            </span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ann.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                              {ann.is_active !== false ? 'Online' : 'Offline'}
                            </span>
                            {pushedAt && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OneSignal Pushed
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
                            title="Diffuser cette annonce avec OneSignal (iOS & Android)"
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
      <AnimatePresence>
        {pushComposeModal?.isOpen && (
          <div 
            onClick={() => setPushComposeModal(null)}
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] sm:rounded-[32px] max-w-4xl w-full h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 text-left my-auto relative overflow-hidden"
            >
              {/* Modal Header (Fixed) */}
              <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Bell className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2 flex-wrap">
                      Push Notification Studio
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                        Live Preview
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {pushComposeModal.entityName
                        ? `Target: ${pushComposeModal.entityName}`
                        : 'Custom mobile push broadcast'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPushComposeModal(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
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

                      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-lg space-y-2 text-left">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                              U
                            </div>
                            <span className="font-semibold text-slate-300 text-[11px]">
                              Unlocked Valencia
                            </span>
                            <span className="text-[10px] text-slate-500">• 1m</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 rotate-90" />
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h5 className="font-bold text-xs text-white break-words">
                              {pushComposeModal.title || 'Notification Title'}
                            </h5>
                            <p className="text-xs text-slate-300 font-normal leading-normal break-words">
                              {pushComposeModal.body || 'Message body text...'}
                            </p>
                          </div>
                          {pushComposeModal.imageUrl && (
                            <img
                              src={pushComposeModal.imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. IN-APP BELL CENTER PREVIEW */}
                  {pushComposeModal.previewDevice === 'in_app' && (
                    <div className="relative rounded-2xl bg-slate-100 p-3.5 border border-slate-300 text-slate-900 shadow-inner space-y-2 select-none">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                        <span>Header Bell Dropdown Preview</span>
                        <span className="text-blue-600">Unread Badge</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-md space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase border border-blue-100">
                              {pushComposeModal.type.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                        </div>

                        <h5 className="font-bold text-xs text-slate-900 leading-snug break-words">
                          {pushComposeModal.title || 'Notification Title'}
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed break-words">
                          {pushComposeModal.body || 'Message body text.'}
                        </p>

                        <div className="pt-1 flex justify-end">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                            Explore {pushComposeModal.url || '/'} →
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Delivery Reach:</span>
                    <span className="font-bold text-amber-400">
                      {pushComposeModal.targetMode === 'specific' ? '🎯 Single Specific Member' : '📢 All Registered Members'}
                    </span>
                  </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE EDITOR ("Edition") */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Push Title Input & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Push Title <span className="text-rose-500">*</span>
                      </label>
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                        pushComposeModal.title.length > 60 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {pushComposeModal.title.length} / 65 chars
                      </span>
                    </div>

                    <input
                      type="text"
                      value={pushComposeModal.title}
                      onChange={(e) => setPushComposeModal({ ...pushComposeModal, title: e.target.value })}
                      placeholder="e.g. 🎉 Upcoming Event: Beach Sunset Session"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />

                    {/* Quick Title Prefix Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                      {['🎉 Event:', '📖 New Guide:', '✨ Pro Spotlight:', '⚡ Announcement:'].map((prefix) => (
                        <button
                          key={prefix}
                          type="button"
                          onClick={() => {
                            const clean = pushComposeModal.title.replace(/^([🎉📖✨⚡]\s*[\w\s]+:\s*)?/, '');
                            setPushComposeModal({ ...pushComposeModal, title: `${prefix} ${clean}`.trim() });
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          {prefix}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Body Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Message Body <span className="text-rose-500">*</span>
                      </label>
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                        pushComposeModal.body.length > 140 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {pushComposeModal.body.length} / 180 chars
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={pushComposeModal.body}
                      onChange={(e) => setPushComposeModal({ ...pushComposeModal, body: e.target.value })}
                      placeholder="Write your push notification message body here..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
                    />
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
                        <span>📢 All App Subscribers</span>
                        {pushComposeModal.targetMode === 'all' && <Check className="w-4 h-4" />}
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
                        <span>🎯 Specific Member Only</span>
                        {pushComposeModal.targetMode === 'specific' && <Check className="w-4 h-4" />}
                      </button>
                    </div>

                    {pushComposeModal.targetMode === 'specific' && (
                      <select
                        value={pushComposeModal.selectedUserId || ''}
                        onChange={(e) => setPushComposeModal({ ...pushComposeModal, selectedUserId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">-- Select target member ({allUsersList.length} members) --</option>
                        {allUsersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || 'Member'} — {u.email || u.id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>

              {/* Bottom Actions Bar (Fixed Footer) */}
              <div className="px-5 sm:px-7 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-10">
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dispatched via OneSignal Push & recorded in Header Bell notifications.</span>
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
                        <span>Sending Push...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dispatch Push Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
