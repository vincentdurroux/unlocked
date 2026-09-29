import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  X, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  ThumbsUp, 
  Megaphone, 
  Gift, 
  ShieldCheck, 
  Star,
  ChevronDown,
  UserPlus,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  ShoppingBag,
  Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InAppNotification {
  id: string | number;
  title?: string;
  content?: string;
  message?: string;
  notes?: string;
  type?: string;
  icon?: string;
  cta_type?: string;
  cta_link?: string;
  created_at?: string;
  updated_at?: string;
  is_read?: boolean;
  user_email?: string;
  pro_category?: string;
  pro_name?: string;
  target_id?: string;
}

export const NOTIFICATION_ICONS_CONFIG = [
  { 
    id: 'event', 
    label: 'Events & Meetups', 
    category: 'Events',
    icon: Calendar, 
    bgColor: 'bg-amber-50', 
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200'
  },
  { 
    id: 'guide', 
    label: 'Guides & Legal', 
    category: 'Guides',
    icon: BookOpen, 
    bgColor: 'bg-purple-50', 
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200'
  },
  { 
    id: 'recommendation', 
    label: 'Member Recommendation', 
    category: 'Recommendations',
    icon: ThumbsUp, 
    bgColor: 'bg-rose-50', 
    textColor: 'text-rose-600',
    borderColor: 'border-rose-200'
  },
  { 
    id: 'megaphone', 
    label: 'Announcements', 
    category: 'General',
    icon: Megaphone, 
    bgColor: 'bg-sky-50', 
    textColor: 'text-sky-600',
    borderColor: 'border-sky-200'
  },
  { 
    id: 'star', 
    label: 'Top Pro & Featured', 
    category: 'Recommendations',
    icon: Star, 
    bgColor: 'bg-yellow-50', 
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200'
  },
  { 
    id: 'gift', 
    label: 'Offers & Perks', 
    category: 'Promotions',
    icon: Gift, 
    bgColor: 'bg-pink-50', 
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200'
  },
  { 
    id: 'shield', 
    label: 'Verified & Security', 
    category: 'Trust',
    icon: ShieldCheck, 
    bgColor: 'bg-emerald-50', 
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200'
  },
  { 
    id: 'sparkles', 
    label: 'New Updates', 
    category: 'Updates',
    icon: Sparkles, 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  {
    id: 'chat',
    label: 'Messages',
    category: 'Messages',
    icon: MessageCircle,
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    borderColor: 'border-indigo-200'
  },
  {
    id: 'marketplace',
    label: 'Classifieds',
    category: 'Marketplace',
    icon: ShoppingBag,
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-200'
  }
];

export function getInAppNotificationIconData(iconId?: string, type?: string) {
  if (iconId) {
    const found = NOTIFICATION_ICONS_CONFIG.find(item => item.id === iconId);
    if (found) return found;
  }
  if (type === 'recommendation' || type === 'recommendation_request') {
    return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'recommendation')!;
  }
  if (type === 'event') {
    return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'event')!;
  }
  if (type === 'guide') {
    return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'guide')!;
  }
  if (type === 'chat' || type === 'message') {
    return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'chat')!;
  }
  if (type === 'marketplace' || type === 'ad') {
    return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'marketplace')!;
  }
  return NOTIFICATION_ICONS_CONFIG.find(i => i.id === 'megaphone')!;
}

export function formatNotificationTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

interface InAppNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: InAppNotification[];
  readIds: string[];
  dismissedIds?: string[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismissNotification?: (id: string) => void;
  onClearAll?: () => void;
  onNavigate?: (view: any, params?: any) => void;
  onAddPro?: () => void;
}

export function InAppNotificationCenter({
  isOpen,
  onClose,
  announcements,
  readIds,
  dismissedIds = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onClearAll,
  onNavigate,
  onAddPro
}: InAppNotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showOlder, setShowOlder] = useState(false);

  // Filter out dismissed notifications
  const activeNotifications = useMemo(() => {
    return (announcements || []).filter(item => item && !dismissedIds.includes(String(item.id)));
  }, [announcements, dismissedIds]);

  // Determine unread status per item
  const isItemUnread = (item: InAppNotification) => {
    // For chat notifications, recent unread messages take priority
    if (item.type === 'chat' || String(item.id).startsWith('chat-')) {
      return item.is_read === false;
    }
    const isLocallyRead = readIds.includes(String(item.id));
    if (isLocallyRead) return false;
    if (item.is_read === true) return false;
    return true;
  };

  const unreadList = useMemo(() => {
    return activeNotifications.filter(isItemUnread);
  }, [activeNotifications, readIds]);

  const filteredList = filter === 'unread' ? unreadList : activeNotifications;
  const displayedList = showOlder ? filteredList : filteredList.slice(0, 7);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs cursor-default" 
        onClick={onClose} 
      />

      {/* Main Notification Popover */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -10 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'calc(100% - 24px) 0px' }}
        className="absolute top-full right-0 mt-3 w-[calc(100vw-32px)] sm:w-[480px] bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caret Arrow pointing to the Bell */}
        <div className="absolute -top-2 right-6 w-4 h-4 bg-white rotate-45 border-t border-l border-slate-100 z-20" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100/80 flex items-center justify-between bg-white rounded-t-3xl z-10 gap-2">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Notifications</h3>
            {unreadList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200">
                {unreadList.length} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadList.length > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}

            {activeNotifications.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center px-4 py-2 border-b border-slate-100 bg-slate-50/50 gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer",
              filter === 'all' 
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            All ({activeNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              filter === 'unread' 
                ? "bg-white text-blue-600 shadow-xs border border-blue-200/80" 
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Unread
            {unreadList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>

        {/* Notification List Body */}
        <div className="overflow-y-auto divide-y divide-slate-100/80 p-2 sm:p-3 space-y-1">
          {displayedList.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">
                {filter === 'unread' ? "You're all caught up!" : "No notifications yet"}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {filter === 'unread' 
                  ? "You have read all your recent notifications and alerts." 
                  : "Important updates, recommendations, and events will appear here."}
              </p>
            </div>
          ) : (
            displayedList.map((item) => {
              const unread = isItemUnread(item);
              const itemData = getInAppNotificationIconData(item.icon, item.type);
              const IconComp = itemData.icon;

              const title = item.title && item.title.toLowerCase() !== 'notification' && item.title.toLowerCase() !== 'announcement'
                ? item.title
                : (item.type === 'recommendation_request' 
                    ? `Looking for a ${item.pro_category || 'professional'}` 
                    : 'Announcement');

              const description = item.content || item.notes || item.message || '';
              const timeString = formatNotificationTime(item.created_at || item.updated_at);

              return (
                <div
                  key={String(item.id)}
                  onClick={() => {
                    onMarkAsRead(String(item.id));
                    if (item.type === 'event' && onNavigate) {
                      onClose();
                      onNavigate('events');
                    } else if (item.type === 'guide' && onNavigate) {
                      onClose();
                      onNavigate('guides');
                    } else if ((item.type === 'recommendation_request' || item.type === 'recommendation') && onNavigate) {
                      onClose();
                      onNavigate('explore');
                    } else if ((item.type === 'chat' || item.type === 'message') && onNavigate) {
                      onClose();
                      onNavigate('messages', item.target_id ? { chat: { id: String(item.target_id) } } : undefined);
                    } else if ((item.type === 'marketplace' || item.type === 'ad') && onNavigate) {
                      onClose();
                      onNavigate('classifieds');
                    }
                  }}
                  className={cn(
                    "p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 relative group border",
                    unread 
                      ? "bg-blue-50/40 hover:bg-blue-50/70 border-blue-100/70" 
                      : "bg-white hover:bg-slate-50/80 border-transparent"
                  )}
                >
                  {/* Category Icon */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border transition-transform group-hover:scale-105",
                    itemData.bgColor,
                    itemData.textColor,
                    itemData.borderColor
                  )}>
                    <IconComp className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <h4 className={cn(
                        "text-xs sm:text-sm font-bold leading-snug break-words",
                        unread ? "text-slate-900 font-extrabold" : "text-slate-800"
                      )}>
                        {title}
                      </h4>
                      {timeString && (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {timeString}
                        </span>
                      )}
                    </div>

                    {description && (
                      <p className={cn(
                        "text-xs leading-relaxed break-words",
                        unread ? "text-slate-700 font-medium" : "text-slate-500"
                      )}>
                        {description}
                      </p>
                    )}

                    {/* Interactive CTAs */}
                    <div className="flex items-center gap-2 mt-2">
                      {item.cta_type === 'recommend_pro' && onAddPro && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(String(item.id));
                            onClose();
                            onAddPro();
                          }}
                          className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Recommend Pro</span>
                        </button>
                      )}

                      {item.type === 'event' && onNavigate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(String(item.id));
                            onClose();
                            onNavigate('events');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>View Event</span>
                        </button>
                      )}

                      {item.type === 'guide' && onNavigate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(String(item.id));
                            onClose();
                            onNavigate('guides');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Read Guide</span>
                        </button>
                      )}

                      {(item.type === 'chat' || item.type === 'message') && onNavigate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(String(item.id));
                            onClose();
                            onNavigate('messages', item.target_id ? { chat: { id: String(item.target_id) } } : undefined);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions (Unread Indicator Dot & Dismiss Button) */}
                  <div className="flex flex-col items-end justify-between shrink-0 self-stretch py-0.5">
                    {onDismissNotification && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissNotification(String(item.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-100 mt-auto" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Older Notifications Toggle */}
        {filteredList.length > 7 && !showOlder && (
          <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center rounded-b-3xl">
            <button
              onClick={() => setShowOlder(true)}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
            >
              <span>View older notifications ({filteredList.length - 7} more)</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// In-App Toast Banner Component
export interface InAppToastProps {
  notification: InAppNotification | null;
  onDismiss: () => void;
  onClickToast?: () => void;
}

export function InAppToastBanner({
  notification,
  onDismiss,
  onClickToast
}: InAppToastProps) {
  if (!notification) return null;

  const itemData = getInAppNotificationIconData(notification.icon, notification.type);
  const IconComp = itemData.icon;

  const title = notification.title && notification.title.toLowerCase() !== 'notification' && notification.title.toLowerCase() !== 'announcement'
    ? notification.title
    : (notification.type === 'recommendation_request' 
        ? `Looking for a ${notification.pro_category || 'professional'}` 
        : 'New Notification');

  const description = notification.content || notification.notes || notification.message || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClickToast}
      className="fixed top-20 right-4 sm:right-6 max-w-[420px] w-[calc(100vw-32px)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-3.5 z-50 flex items-start gap-3 cursor-pointer group hover:border-blue-300 transition-all"
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
        itemData.bgColor,
        itemData.textColor,
        itemData.borderColor
      )}>
        <IconComp className="w-5 h-5 stroke-[2.2]" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
            New
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {title}
          </h4>
        </div>
        {description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
            {description}
          </p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        aria-label="Close alert"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
