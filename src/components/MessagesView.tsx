import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  MessageCircle,
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Flag,
  Ban,
  Lock,
  Send,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Copy,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSupabaseConfigured } from '../lib/supabase';
import { authService, Profile } from '../services/authService';
import { chatService, Conversation, Message } from '../services/chatService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatName(name: string | null | undefined): string {
  if (!name) return '';
  let cleanName = name.includes('|') ? name.split('|')[0] : name;
  cleanName = cleanName.trim();
  if (cleanName.includes('@')) {
    const prefix = cleanName.split('@')[0];
    cleanName = prefix.replace(/[._-]/g, ' ');
  }
  const parts = cleanName.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const formattedFirst = first.charAt(0).toUpperCase() + first.slice(1);
    const formattedLastInitial = last.charAt(0).toUpperCase() + '.';
    return `${formattedFirst} ${formattedLastInitial}`;
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return '';
}

function formatConversationTimestamp(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'Now';
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function isHiddenLegacyIntro(content?: string | null): boolean {
  if (!content) return false;
  return content.startsWith('Hello ') && content.includes('! I saw your review for ');
}

function renderMessageContent(content: string, isSentByMe: boolean) {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const parts = content.split(urlRegex);
  if (parts.length === 1) return content;

  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'underline underline-offset-2 break-all transition-opacity hover:opacity-80',
            isSentByMe ? 'text-white decoration-white/60' : 'text-brand-blue decoration-brand-blue/50'
          )}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

type UIMessage = Message & {
  _optimisticStatus?: 'sending' | 'failed';
};

const QUICK_EMOJIS = [
  '👋', '😊', '🙌', '🙏', '👍', '❤️', '✨', '🔥',
  '🎉', '☕', '🌞', '📍', '💬', '😂', '👌', '🤝',
];

const ICEBREAKERS = [
  "Hi there! I'd love to ask about your recommendation.",
  'Thanks for sharing such a helpful review!',
  'Hello! Do you have a quick minute for a question?',
];

export interface MessagesViewProps {
  scrollToTop?: () => void;
  initialChat?: any;
  onClearInitial?: () => void;
  onNavigate?: (view: any, params?: { eventId?: string; proId?: string; guideId?: string; searchQuery?: string; chat?: any }) => void;
  onClose?: () => void;
  currentUser?: any;
  userProfile?: Profile | null;
  unreadConversations?: string[];
  blockedUsers: string[];
  usersWhoBlockedMe: string[];
  onBlockedUsersUpdate?: () => void;
  onMarkChatAsRead?: (chatId: string) => void;
}

export default function MessagesView({
  initialChat,
  onClearInitial,
  onNavigate,
  onClose,
  currentUser,
  userProfile,
  unreadConversations = [],
  blockedUsers = [],
  usersWhoBlockedMe = [],
  onBlockedUsersUpdate,
  onMarkChatAsRead,
}: MessagesViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Smooth UX states
  const [viewAlert, setViewAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatListFilter, setChatListFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Report fields
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');

  // Archived IDs
  const [archivedConvIds, setArchivedConvIds] = useState<string[]>(() =>
    currentUser?.id ? chatService.getArchivedConversationIds(currentUser.id) : []
  );

  // Refs for smooth zero-lag interactions
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const emojiTrayRef = useRef<HTMLDivElement>(null);
  const messagesCacheRef = useRef<Map<string, UIMessage[]>>(new Map());
  const typingSenderRef = useRef<((isTyping: boolean) => void) | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadRef = useRef<number>(0);
  const lastMessagesLengthRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);
  const selectedChatIdRef = useRef<string | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selectedChatIdRef.current = selectedChat?.id || null;

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string, durationMs = 3600) => {
    setViewAlert({ type, text });
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setViewAlert(null), durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
    };
  }, []);

  // Auto-resize composer textarea cleanly (1 to 5 rows)
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 124);
    el.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [newMessage, resizeTextarea]);

  // Click-outside dismissal for dropdowns & emoji tray
  useEffect(() => {
    if (!showOptionsDropdown && !showEmojiBar) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showOptionsDropdown && optionsMenuRef.current && !optionsMenuRef.current.contains(target)) {
        setShowOptionsDropdown(false);
      }
      if (showEmojiBar && emojiTrayRef.current && !emojiTrayRef.current.contains(target)) {
        setShowEmojiBar(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showOptionsDropdown, showEmojiBar]);

  // Keyboard Escape ergonomics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showReportModal) {
        setShowReportModal(false);
      } else if (showBlockModal) {
        setShowBlockModal(false);
      } else if (showArchiveConfirmModal) {
        setShowArchiveConfirmModal(false);
      } else if (showOptionsDropdown) {
        setShowOptionsDropdown(false);
      } else if (showEmojiBar) {
        setShowEmojiBar(false);
      } else if (onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReportModal, showBlockModal, showArchiveConfirmModal, showOptionsDropdown, showEmojiBar, onClose]);

  // Archive sync
  useEffect(() => {
    if (currentUser?.id) {
      setArchivedConvIds(chatService.getArchivedConversationIds(currentUser.id));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const handleArchiveUpdate = () => {
      if (currentUser?.id) {
        setArchivedConvIds(chatService.getArchivedConversationIds(currentUser.id));
      }
    };
    window.addEventListener('chat_archive_changed', handleArchiveUpdate);
    return () => window.removeEventListener('chat_archive_changed', handleArchiveUpdate);
  }, [currentUser?.id]);

  // Cleanup empty conversations when switching chats or unmounting
  useEffect(() => {
    const lastActiveChatId = selectedChat?.id;
    return () => {
      if (lastActiveChatId) {
        chatService.deleteConversationIfEmpty(lastActiveChatId).then((deleted) => {
          if (deleted) {
            setConversations((prev) => prev.filter((c) => c.id !== lastActiveChatId));
            messagesCacheRef.current.delete(lastActiveChatId);
          }
        });
      }
    };
  }, [selectedChat?.id]);

  const handleCloseChat = async () => {
    const chatId = selectedChat?.id;
    setSelectedChat(null);
    setShowOptionsDropdown(false);
    setShowEmojiBar(false);
    setIsOtherUserTyping(false);
    if (chatId) {
      const deleted = await chatService.deleteConversationIfEmpty(chatId);
      if (deleted) {
        setConversations((prev) => prev.filter((c) => c.id !== chatId));
        messagesCacheRef.current.delete(chatId);
      }
    }
  };

  // Smooth scrolling helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }
    setShowScrollToBottom(false);
    setUnreadBelowCount(0);
    isNearBottomRef.current = true;
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const nearBottom = distanceFromBottom < 140;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom && messages.length > 4);
    if (nearBottom && unreadBelowCount > 0) {
      setUnreadBelowCount(0);
    }

    const now = Date.now();
    if (now - lastMarkedReadRef.current > 1500) {
      lastMarkedReadRef.current = now;
      if (selectedChat && currentUser) {
        const hasUnreadIncoming = messages.some((m) => m.sender_id !== currentUser.id && !m.is_read);
        if (!hasUnreadIncoming) return;

        chatService.markMessagesAsRead(selectedChat.id, currentUser.id);
        localStorage.setItem(`chat_last_read_${selectedChat.id}`, new Date().toISOString());
        onMarkChatAsRead?.(selectedChat.id);

        setMessages((prev) =>
          prev.map((m) => (m.sender_id !== currentUser.id && !m.is_read ? { ...m, is_read: true } : m))
        );
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedChat.id ? { ...c, unread_count: 0 } : c))
        );
      }
    }
  };

  // Auto-scroll smoothly when new messages arrive (only if already near bottom or first load)
  useEffect(() => {
    if (messages.length > lastMessagesLengthRef.current || lastMessagesLengthRef.current === 0) {
      if (lastMessagesLengthRef.current === 0 || isNearBottomRef.current) {
        const behavior: ScrollBehavior = lastMessagesLengthRef.current === 0 ? 'auto' : 'smooth';
        requestAnimationFrame(() => scrollToBottom(behavior));
      } else if (messages.length > lastMessagesLengthRef.current) {
        const latest = messages[messages.length - 1];
        if (latest && latest.sender_id !== currentUser?.id) {
          setUnreadBelowCount((c) => c + 1);
        }
      }
    }
    lastMessagesLengthRef.current = messages.length;
  }, [messages.length, currentUser?.id, scrollToBottom]);

  // Keep conversation list previews live for incoming messages across all threads
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubInbox = chatService.subscribeToIncomingMessages(currentUser.id, (incoming) => {
      if (blockedUsers.includes(incoming.sender_id)) return;
      const isCurrentlyOpen = selectedChatIdRef.current === incoming.conversation_id;

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === incoming.conversation_id);
        if (!exists) {
          // New conversation started by someone else — refresh list silently
          chatService
            .getUserConversations(currentUser.id)
            .then((fresh) => setConversations(fresh))
            .catch(() => {});
          return prev;
        }
        const updated = prev.map((c) => {
          if (c.id !== incoming.conversation_id) return c;
          return {
            ...c,
            last_message_at: incoming.created_at,
            last_message_content: incoming.content,
            last_message_sender_id: incoming.sender_id,
            unread_count: isCurrentlyOpen ? 0 : (c.unread_count || 0) + 1,
          };
        });
        return updated.sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
      });
    });

    return () => unsubInbox();
  }, [currentUser?.id, blockedUsers]);

  // Load conversations and initialChat coordination
  useEffect(() => {
    let active = true;

    const initMessages = async () => {
      if (!currentUser) return;
      try {
        setLoadingConversations(true);

        let userConvs: Conversation[] = [];
        try {
          if (isSupabaseConfigured) {
            userConvs = await chatService.getUserConversations(currentUser.id);
          }
        } catch (e) {
          console.warn('Error fetching user conversations:', e);
        }

        if (!active) return;

        if (initialChat) {
          if (initialChat.id) {
            const matched = userConvs.find((c) => c.id === initialChat.id);
            if (matched) {
              setConversations(userConvs);
              setSelectedChat(matched);
              setLoadingConversations(false);
              onClearInitial?.();
              return;
            }
          }

          if (initialChat.id && initialChat.participant_1 && initialChat.participant_2) {
            setConversations(userConvs);
            setSelectedChat(initialChat);
            setLoadingConversations(false);
            onClearInitial?.();
            return;
          }

          const targetName = initialChat.name || initialChat.targetName || initialChat.otherUser?.full_name;
          const targetId = initialChat.userId || initialChat.otherUser?.id;

          if (!targetName && !targetId) {
            setConversations(userConvs);
            setLoadingConversations(false);
            onClearInitial?.();
            return;
          }

          const currentUserNormalizedName = (
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split('@')[0] ||
            ''
          )
            .trim()
            .toLowerCase();
          const targetNormalizedName = (targetName || '').trim().toLowerCase();

          if (targetId === currentUser.id || (targetName && targetNormalizedName === currentUserNormalizedName)) {
            showToast('info', 'You cannot start a conversation with yourself.');
            setConversations(userConvs);
            setLoadingConversations(false);
            onClearInitial?.();
            return;
          }

          let otherProfile = null;
          try {
            if (targetId) {
              otherProfile = await authService.getProfile(targetId);
            } else if (targetName) {
              otherProfile = await chatService.getProfileByName(targetName);
            }
          } catch (e) {
            console.warn('Error fetching profile for initial chat:', e);
          }

          if (!active) return;

          if (otherProfile) {
            if (otherProfile.id === currentUser.id) {
              showToast('info', 'You cannot start a conversation with yourself.');
              setConversations(userConvs);
              setLoadingConversations(false);
              onClearInitial?.();
              return;
            }

            if (otherProfile.chat_enabled === false) {
              showToast('error', 'This member has disabled chat participation.');
              setConversations(userConvs);
              setLoadingConversations(false);
              onClearInitial?.();
              return;
            }

            if (blockedUsers.includes(otherProfile.id)) {
              showToast('info', `You have blocked ${otherProfile.full_name || 'this member'}.`);
            }

            try {
              const conv = await chatService.getOrCreateConversation(currentUser.id, otherProfile.id);
              if (conv && active) {
                const fullConv: Conversation = {
                  ...conv,
                  otherUser: otherProfile,
                };

                let updatedConvs: Conversation[] = [];
                try {
                  updatedConvs = await chatService.getUserConversations(currentUser.id);
                } catch (e) {
                  console.warn('Error refreshing conversations list:', e);
                }

                setConversations(updatedConvs.length > 0 ? updatedConvs : [fullConv]);
                const matchedConv = updatedConvs.find((c) => c.id === conv.id) || fullConv;
                setSelectedChat(matchedConv);
              } else if (active) {
                showToast('error', 'Messaging service is temporarily unavailable.');
              }
            } catch (dbErr: any) {
              const errorMsg = dbErr?.message || 'Unable to start conversation.';
              showToast('error', errorMsg);
            }
          } else {
            showToast(
              'error',
              `Member "${targetName || 'Requested'}" could not be found.`
            );
            setConversations(userConvs);
          }
          onClearInitial?.();
        } else {
          setConversations(userConvs);
        }
      } catch (err) {
        console.error('Error during message flow initialization:', err);
      } finally {
        if (active) {
          setLoadingConversations(false);
        }
      }
    };

    initMessages();

    return () => {
      active = false;
    };
  }, [currentUser, initialChat]);

  // Load selected conversation messages (instant cache hit + background sync + live subscriptions + typing indicator)
  useEffect(() => {
    const activeChatId = selectedChat?.id;
    if (!activeChatId) {
      setMessages([]);
      setIsOtherUserTyping(false);
      typingSenderRef.current = null;
      return;
    }

    let isMounted = true;
    setIsOtherUserTyping(false);
    setShowScrollToBottom(false);
    setUnreadBelowCount(0);
    isNearBottomRef.current = true;
    lastMessagesLengthRef.current = 0;

    // 1. Instant render from in-memory cache if available (0ms switch!)
    const cached = messagesCacheRef.current.get(activeChatId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoadingMessages(false);
    } else {
      setMessages([]);
      setLoadingMessages(true);
    }

    // Focus composer smoothly on desktop when opening a chat
    if (window.innerWidth >= 768) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }

    // 2. Fetch fresh messages from Supabase
    const loadMsgs = async () => {
      try {
        const msgs = await chatService.getMessages(activeChatId);
        if (!isMounted) return;
        const filteredMsgs = msgs.filter((m) => !blockedUsers.includes(m.sender_id));
        const readMappedMsgs: UIMessage[] = filteredMsgs.map((m) =>
          m.sender_id !== currentUser?.id ? { ...m, is_read: true } : m
        );

        messagesCacheRef.current.set(activeChatId, readMappedMsgs);
        setMessages((prev) => {
          // Preserve any still-pending or failed optimistic messages
          const pendingLocal = prev.filter((m) => m._optimisticStatus);
          if (pendingLocal.length === 0) return readMappedMsgs;
          return [...readMappedMsgs, ...pendingLocal];
        });

        localStorage.setItem(`chat_last_read_${activeChatId}`, new Date().toISOString());
        onMarkChatAsRead?.(activeChatId);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeChatId ? { ...c, unread_count: 0 } : c))
        );

        if (currentUser) {
          chatService.markMessagesAsRead(activeChatId, currentUser.id);
        }
      } catch (err) {
        console.error('Error fetching messages list:', err);
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMsgs();

    // 3. Real-time message inserts & read-receipt updates
    const unsubscribeMsgs = chatService.subscribeToMessages(
      activeChatId,
      (newMsg) => {
        if (!isMounted) return;
        if (blockedUsers.includes(newMsg.sender_id)) return;

        if (newMsg.sender_id !== currentUser?.id) {
          setIsOtherUserTyping(false);
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // If this is our own message arriving via Realtime before the REST response returns, replace matching optimistic bubble
          if (newMsg.sender_id === currentUser?.id) {
            const tempIdx = prev.findIndex(
              (m) => m._optimisticStatus === 'sending' && m.content === newMsg.content
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = newMsg;
              messagesCacheRef.current.set(activeChatId, next);
              return next;
            }
          }

          localStorage.setItem(`chat_last_read_${activeChatId}`, new Date().toISOString());
          onMarkChatAsRead?.(activeChatId);

          if (currentUser && newMsg.sender_id !== currentUser.id) {
            chatService.markMessagesAsRead(activeChatId, currentUser.id);
          }

          const finalMsg: UIMessage = {
            ...newMsg,
            is_read: newMsg.sender_id === currentUser?.id ? newMsg.is_read : true,
          };
          const next = [...prev, finalMsg];
          messagesCacheRef.current.set(activeChatId, next);
          return next;
        });

        // Update sidebar preview immediately
        setConversations((prev) =>
          prev
            .map((c) =>
              c.id === activeChatId
                ? {
                    ...c,
                    last_message_at: newMsg.created_at,
                    last_message_content: newMsg.content,
                    last_message_sender_id: newMsg.sender_id,
                    unread_count: 0,
                  }
                : c
            )
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
      },
      (updatedMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
          messagesCacheRef.current.set(activeChatId, next);
          return next;
        });
      }
    );

    // 4. Ephemeral typing indicator broadcast
    const typingChannel = currentUser?.id
      ? chatService.createTypingChannel(activeChatId, currentUser.id, (typing) => {
          if (!isMounted) return;
          setIsOtherUserTyping(typing);
          if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
          if (typing) {
            remoteTypingTimeoutRef.current = setTimeout(() => {
              if (isMounted) setIsOtherUserTyping(false);
            }, 3500);
          }
        })
      : { sendTyping: () => {}, unsubscribe: () => {} };

    typingSenderRef.current = typingChannel.sendTyping;

    return () => {
      isMounted = false;
      typingChannel.sendTyping(false);
      typingChannel.unsubscribe();
      typingSenderRef.current = null;
      unsubscribeMsgs();
    };
  }, [selectedChat?.id, blockedUsers, onMarkChatAsRead, currentUser]);

  // Broadcast typing state cleanly (throttled)
  const notifyTyping = useCallback((value: string) => {
    if (!typingSenderRef.current) return;
    if (!value.trim()) {
      typingSenderRef.current(false);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      return;
    }
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 1800) {
      lastTypingBroadcastRef.current = now;
      typingSenderRef.current(true);
    }
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(() => {
      typingSenderRef.current?.(false);
    }, 2400);
  }, []);

  // Optimistic zero-lag message dispatch (also used for 1-click retry)
  const dispatchMessage = useCallback(
    async (text: string, retryTempId?: string) => {
      if (!selectedChat || !currentUser || !text.trim()) return;

      const otherUserId = selectedChat.otherUser?.id;
      if (otherUserId) {
        if (selectedChat.otherUser?.chat_enabled === false) {
          showToast('error', 'This member has disabled chat participation.');
          return;
        }
        if (blockedUsers.includes(otherUserId)) {
          showToast('error', 'You need to unblock this member to send them a message.');
          return;
        }
        if (usersWhoBlockedMe.includes(otherUserId)) {
          showToast('error', 'You cannot send messages to this member.');
          return;
        }
      }

      const trimmed = text.trim();
      const chatId = selectedChat.id;
      const nowIso = new Date().toISOString();
      const tempId = retryTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Stop typing broadcast right away
      typingSenderRef.current?.(false);
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);

      // 1. Optimistically render bubble immediately (0ms perceived latency)
      const optimisticMsg: UIMessage = {
        id: tempId,
        created_at: nowIso,
        conversation_id: chatId,
        sender_id: currentUser.id,
        receiver_id: otherUserId || '',
        content: trimmed,
        is_read: false,
        _optimisticStatus: 'sending',
      };

      setMessages((prev) => {
        const next = retryTempId
          ? prev.map((m) => (m.id === retryTempId ? optimisticMsg : m))
          : [...prev, optimisticMsg];
        messagesCacheRef.current.set(chatId, next);
        return next;
      });

      // Immediately update sidebar preview & bubble conversation to top
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  last_message_at: nowIso,
                  last_message_content: trimmed,
                  last_message_sender_id: currentUser.id,
                  unread_count: 0,
                }
              : c
          )
          .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      );

      requestAnimationFrame(() => scrollToBottom('smooth'));

      // 2. Persist in Supabase asynchronously without locking the input
      try {
        const sent = await chatService.sendMessage(chatId, currentUser.id, trimmed);
        if (sent) {
          localStorage.setItem(`chat_last_read_${chatId}`, sent.created_at || nowIso);
          setMessages((prev) => {
            // If Realtime already swapped or appended the confirmed row, remove temp duplicate
            const alreadyConfirmed = prev.some((m) => m.id === sent.id);
            const next = alreadyConfirmed
              ? prev.filter((m) => m.id !== tempId)
              : prev.map((m) => (m.id === tempId ? sent : m));
            messagesCacheRef.current.set(chatId, next);
            return next;
          });
        }
      } catch (err: any) {
        console.error('Error executing sendMessage:', err);
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === tempId ? { ...m, _optimisticStatus: 'failed' as const } : m
          );
          messagesCacheRef.current.set(chatId, next);
          return next;
        });

        if (err.message === 'This discussion is blocked.' || err.message === 'This conversation is blocked.') {
          showToast('error', 'You cannot send messages because this conversation is blocked.');
          onBlockedUsersUpdate?.();
        } else if (err.message === 'Chat participation is disabled for one of the users.') {
          showToast('error', 'Chat participation is disabled for you or this member.');
        } else {
          showToast('error', 'Message failed to send. Tap Retry on the message.');
        }
      }
    },
    [selectedChat, currentUser, blockedUsers, usersWhoBlockedMe, scrollToBottom, showToast, onBlockedUsersUpdate]
  );

  const handleSendMessage = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    const textToSend = newMessage;
    setNewMessage('');
    setShowEmojiBar(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    void dispatchMessage(textToSend);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = async (msg: UIMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMessageId(msg.id);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === msg.id ? null : prev));
      }, 1600);
    } catch {
      showToast('error', 'Could not copy message.');
    }
  };

  // Block or Unblock user execution
  const executeBlockToggle = async () => {
    const otherUserId = selectedChat?.otherUser?.id;
    if (!otherUserId || !currentUser || !selectedChat) return;

    try {
      setIsActionLoading(true);
      const isCurrentlyBlocked = blockedUsers.includes(otherUserId);

      if (isCurrentlyBlocked) {
        await chatService.unblockUser(currentUser.id, otherUserId);
        const unblockedGlobally = await chatService.unblockConversation(selectedChat.id, currentUser.id);
        onBlockedUsersUpdate?.();
        if (unblockedGlobally) {
          setSelectedChat((prev) => (prev ? { ...prev, is_blocked: false } : null));
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedChat.id ? { ...c, is_blocked: false } : c))
          );
        }
        showToast('success', 'Member unblocked.');
      } else {
        await chatService.blockUser(currentUser.id, otherUserId);
        await chatService.blockConversation(selectedChat.id);
        onBlockedUsersUpdate?.();
        setSelectedChat((prev) => (prev ? { ...prev, is_blocked: true } : null));
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedChat.id ? { ...c, is_blocked: true } : c))
        );
        showToast('success', 'Member blocked.');
      }
      setShowBlockModal(false);
    } catch (err) {
      console.error('Error toggling block state:', err);
      showToast('error', 'Failed to update block state.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Submit report
  const handleSendReport = async () => {
    const otherUserId = selectedChat?.otherUser?.id;
    if (!otherUserId || !currentUser || !selectedChat) return;

    try {
      setIsActionLoading(true);
      await chatService.reportUser({
        reporter_id: currentUser.id,
        reported_id: otherUserId,
        reason: reportReason,
        details: reportDetails.trim(),
        conversation_id: selectedChat.id,
      });

      if (!blockedUsers.includes(otherUserId)) {
        try {
          await chatService.blockUser(currentUser.id, otherUserId);
          onBlockedUsersUpdate?.();
        } catch (blockErr) {
          console.warn('[Report] Automatic block failed:', blockErr);
        }
      }

      showToast('success', 'Report submitted. The member has been blocked automatically.');
      setReportDetails('');
      setShowReportModal(false);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      showToast('error', err?.message || 'Failed to submit report.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmArchiveCurrentChat = () => {
    if (!currentUser?.id || !selectedChat?.id) return;
    chatService.archiveConversation(currentUser.id, selectedChat.id);
    setArchivedConvIds(chatService.getArchivedConversationIds(currentUser.id));
    setShowArchiveConfirmModal(false);
    showToast('success', 'Conversation archived.');
  };

  const handleUnarchiveCurrentChat = () => {
    if (!currentUser?.id || !selectedChat?.id) return;
    chatService.unarchiveConversation(currentUser.id, selectedChat.id);
    setArchivedConvIds(chatService.getArchivedConversationIds(currentUser.id));
    setShowOptionsDropdown(false);
    showToast('success', 'Conversation restored to Active.');
  };

  const activeConversations = useMemo(
    () => conversations.filter((c) => !archivedConvIds.includes(c.id)),
    [conversations, archivedConvIds]
  );

  const archivedConversations = useMemo(
    () => conversations.filter((c) => archivedConvIds.includes(c.id)),
    [conversations, archivedConvIds]
  );

  const unreadListCount = useMemo(
    () =>
      activeConversations.filter(
        (c) => unreadConversations.includes(c.id) || (c.unread_count || 0) > 0
      ).length,
    [activeConversations, unreadConversations]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const otherName = (conv.otherUser?.full_name || '').toLowerCase();
      const preview = (conv.last_message_content || '').toLowerCase();
      if (q && !otherName.includes(q) && !preview.includes(q)) return false;

      const isArchived = archivedConvIds.includes(conv.id);
      if (chatListFilter === 'unread') {
        return !isArchived && (unreadConversations.includes(conv.id) || (conv.unread_count || 0) > 0);
      }
      if (chatListFilter === 'archived') {
        return isArchived;
      }
      return !isArchived;
    });
  }, [conversations, searchQuery, chatListFilter, archivedConvIds, unreadConversations]);

  const visibleMessages = useMemo(
    () => messages.filter((msg) => !isHiddenLegacyIntro(msg?.content)),
    [messages]
  );

  const otherUserId = selectedChat?.otherUser?.id || '';
  const isSelectedBlockedByMe = blockedUsers.includes(otherUserId);
  const isSelectedBlockedMe = usersWhoBlockedMe.includes(otherUserId);
  const isSelectedArchived = selectedChat ? archivedConvIds.includes(selectedChat.id) : false;

  const filterTabs: { id: 'all' | 'unread' | 'archived'; label: string; count: number }[] = [
    { id: 'all', label: 'Active', count: activeConversations.length },
    { id: 'unread', label: 'Unread', count: unreadListCount },
    { id: 'archived', label: 'Archived', count: archivedConversations.length },
  ];

  return (
    <div className="h-full w-full bg-white overflow-hidden flex relative font-sans select-text min-h-0">
      {/* Floating Toast Alert */}
      <AnimatePresence>
        {viewAlert && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] bg-slate-900/95 backdrop-blur-md text-white rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-3 text-xs font-medium border border-white/10"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {viewAlert.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : viewAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="leading-snug">{viewAlert.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setViewAlert(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR — Conversation List */}
      <aside
        className={cn(
          'w-full md:w-[320px] lg:w-[356px] border-r border-slate-200/80 flex flex-col bg-white min-h-0 h-full shrink-0',
          selectedChat ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Sidebar Header */}
        <div className="px-3.5 pt-3 pb-2.5 sm:px-4 sm:pt-4 sm:pb-3 border-b border-slate-100 bg-white space-y-2.5 sm:space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-display tracking-tight">
                    Messages
                  </h2>
                  {conversations.length > 0 && (
                    <span className="text-xs font-medium text-slate-400 tabular-nums">
                      {conversations.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (onClose ? onClose() : onNavigate?.('back'))}
              className="min-h-[40px] min-w-[40px] px-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
              title="Close messages"
              aria-label="Close messages"
            >
              <span className="hidden sm:inline">Close</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people or messages..."
              className="w-full h-10 pl-10 pr-9 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-[13px] font-medium text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-brand-blue/35 focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Smooth Segmented Filter Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/90 rounded-xl" role="tablist">
            {filterTabs.map((tab) => {
              const isActive = chatListFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setChatListFilter(tab.id)}
                  className={cn(
                    'relative py-2 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer z-0',
                    isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="chatFilterActivePill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/70 -z-10"
                    />
                  )}
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        'text-[11px] font-semibold tabular-nums',
                        tab.id === 'unread' && !isActive
                          ? 'text-brand-blue font-bold'
                          : isActive
                          ? 'text-slate-500'
                          : 'text-slate-400'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2.5 py-2 space-y-1">
          {loadingConversations ? (
            <div className="space-y-2 p-1.5">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex justify-between gap-4">
                      <div className="h-3.5 w-28 bg-slate-100 rounded-md" />
                      <div className="h-3 w-10 bg-slate-100 rounded-md" />
                    </div>
                    <div className="h-3 w-44 bg-slate-100/80 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                {chatListFilter === 'archived' ? (
                  <Archive className="w-5 h-5 text-slate-500" />
                ) : (
                  <MessageSquare className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  {searchQuery
                    ? 'No matching conversations'
                    : chatListFilter === 'unread'
                    ? 'All caught up'
                    : chatListFilter === 'archived'
                    ? 'No archived chats'
                    : 'No messages yet'}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[230px] mx-auto">
                  {searchQuery
                    ? 'Try a different name or keyword.'
                    : chatListFilter === 'unread'
                    ? 'You have no unread messages right now.'
                    : chatListFilter === 'archived'
                    ? 'Archived conversations can be restored anytime from the options menu.'
                    : 'Connect with community members by tapping the message button next to their reviews.'}
                </p>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUserObj = conv.otherUser;
              const otherName = otherUserObj?.full_name || 'Community Member';
              const displayedName = formatName(otherName) || 'Community Member';
              const otherAvatar =
                otherUserObj?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayedName)}&background=0a192f&color=fff`;
              const isBlockedByMe = blockedUsers.includes(otherUserObj?.id || '');
              const isBlockedMe = usersWhoBlockedMe.includes(otherUserObj?.id || '');
              const isUnread = unreadConversations.includes(conv.id) || (conv.unread_count || 0) > 0;
              const isSelected = selectedChat?.id === conv.id;
              const sentLastByMe = conv.last_message_sender_id === currentUser?.id;

              const previewText = conv.is_blocked
                ? 'Conversation blocked'
                : isBlockedByMe
                ? 'Blocked by you'
                : isBlockedMe
                ? 'Unavailable'
                : conv.last_message_content
                ? `${sentLastByMe ? 'You: ' : ''}${conv.last_message_content}`
                : isUnread
                ? 'New message'
                : 'No messages yet';

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={async () => {
                    const prevId = selectedChat?.id;
                    setSelectedChat(conv);
                    setShowOptionsDropdown(false);
                    setShowEmojiBar(false);
                    localStorage.setItem(`chat_last_read_${conv.id}`, new Date().toISOString());

                    if (prevId && prevId !== conv.id) {
                      const deleted = await chatService.deleteConversationIfEmpty(prevId);
                      if (deleted) {
                        setConversations((prev) => prev.filter((c) => c.id !== prevId));
                        messagesCacheRef.current.delete(prevId);
                      }
                    }
                  }}
                  className={cn(
                    'w-full text-left px-3 py-3 min-h-[64px] rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-150 select-none active:scale-[0.99]',
                    isSelected
                      ? 'bg-brand-blue/[0.07] ring-1 ring-brand-blue/25'
                      : 'hover:bg-slate-50 active:bg-slate-100/80'
                  )}
                >
                  <div className="relative shrink-0">
                    <img
                      src={otherAvatar}
                      alt={displayedName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200/80 bg-slate-100"
                    />
                    {(isBlockedByMe || isBlockedMe || conv.is_blocked) && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-slate-900 text-white p-0.5 rounded-full border-2 border-white">
                        <Ban className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h4
                        className={cn(
                          'text-[13px] truncate',
                          isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        )}
                      >
                        {displayedName}
                      </h4>
                      <span
                        className={cn(
                          'text-[11px] shrink-0 tabular-nums',
                          isUnread ? 'font-semibold text-brand-blue' : 'font-medium text-slate-400'
                        )}
                      >
                        {formatConversationTimestamp(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs truncate leading-snug',
                          conv.is_blocked || isBlockedByMe || isBlockedMe
                            ? 'text-slate-400 italic'
                            : isUnread
                            ? 'font-semibold text-slate-800'
                            : 'font-normal text-slate-500'
                        )}
                      >
                        {previewText}
                      </p>

                      {isUnread && !isSelected && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                          {(conv.unread_count || 0) > 9 ? '9+' : conv.unread_count || 1}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT PANEL — Active Chat Thread */}
      <section
        className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 h-full bg-[#F8FAFC] relative',
          selectedChat ? 'flex' : 'hidden md:flex bg-white items-center justify-center text-center p-8'
        )}
      >
        {selectedChat ? (
          <motion.div
            key={selectedChat.id}
            initial={{ opacity: 0.7, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col min-h-0 h-full"
          >
            {/* Thread Header */}
            <header className="px-3 sm:px-5 h-[54px] sm:h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200/75 flex items-center justify-between gap-2 relative z-30 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCloseChat}
                  className="md:hidden min-h-[44px] min-w-[44px] -ml-1.5 px-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-0.5 text-xs font-semibold shrink-0 cursor-pointer active:scale-95"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Chats</span>
                </button>

                <img
                  src={
                    selectedChat.otherUser?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      formatName(selectedChat.otherUser?.full_name) || 'Member'
                    )}&background=0a192f&color=fff`
                  }
                  alt={formatName(selectedChat.otherUser?.full_name) || 'Member'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200/80 shrink-0 bg-slate-100"
                />

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 font-display truncate leading-tight">
                    {formatName(selectedChat.otherUser?.full_name) || 'Community Member'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] leading-tight mt-0.5">
                    {isSelectedBlockedByMe ? (
                      <span className="text-rose-600 font-medium">Blocked by you</span>
                    ) : isSelectedBlockedMe ? (
                      <span className="text-slate-400 font-medium">Unavailable</span>
                    ) : isOtherUserTyping ? (
                      <span className="text-brand-blue font-semibold">Typing...</span>
                    ) : (
                      <span className="text-slate-400 font-medium truncate">
                        Community member · Direct message
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Thread Actions */}
              <div className="relative flex items-center gap-1 shrink-0" ref={optionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowOptionsDropdown((prev) => !prev)}
                  className={cn(
                    'min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl transition-colors cursor-pointer active:scale-95',
                    showOptionsDropdown
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  )}
                  title="Conversation options"
                  aria-label="Conversation options"
                  aria-expanded={showOptionsDropdown}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => (onClose ? onClose() : onNavigate?.('back'))}
                  className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer active:scale-95"
                  title="Close messages"
                  aria-label="Close messages"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Options Menu */}
                <AnimatePresence>
                  {showOptionsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-slate-200/90 shadow-xl py-1.5 z-40"
                    >
                      {isSelectedArchived ? (
                        <button
                          type="button"
                          onClick={handleUnarchiveCurrentChat}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-semibold cursor-pointer"
                        >
                          <ArchiveRestore className="w-4 h-4 text-brand-blue" />
                          <span>Unarchive conversation</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOptionsDropdown(false);
                            setShowArchiveConfirmModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-semibold cursor-pointer"
                        >
                          <Archive className="w-4 h-4 text-amber-500" />
                          <span>Archive conversation</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          setShowReportModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-semibold border-t border-slate-100 cursor-pointer"
                      >
                        <Flag className="w-4 h-4 text-amber-500" />
                        <span>Report behavior</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsDropdown(false);
                          setShowBlockModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50/70 flex items-center gap-2.5 transition-colors font-semibold border-t border-slate-100 cursor-pointer"
                      >
                        <Ban className="w-4 h-4 text-rose-500" />
                        <span>{isSelectedBlockedByMe ? 'Unblock member' : 'Block member'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Archived Banner */}
            {isSelectedArchived && (
              <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200/70 flex items-center justify-between text-xs text-amber-900 shrink-0">
                <div className="flex items-center gap-2">
                  <Archive className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-medium">This conversation is archived</span>
                </div>
                <button
                  type="button"
                  onClick={handleUnarchiveCurrentChat}
                  className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 relative min-h-0 flex flex-col">
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 scroll-smooth"
              >
                {loadingMessages ? (
                  <div className="space-y-4 py-4">
                    <div className="flex justify-start">
                      <div className="h-12 w-52 rounded-2xl bg-slate-200/60 animate-pulse" />
                    </div>
                    <div className="flex justify-end">
                      <div className="h-10 w-44 rounded-2xl bg-brand-blue/15 animate-pulse" />
                    </div>
                    <div className="flex justify-start">
                      <div className="h-16 w-64 rounded-2xl bg-slate-200/60 animate-pulse" />
                    </div>
                    <div className="flex justify-end">
                      <div className="h-12 w-56 rounded-2xl bg-brand-blue/15 animate-pulse" />
                    </div>
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-5 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                      <MessageCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 font-display">
                        Start the conversation
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Say hello to {formatName(selectedChat.otherUser?.full_name) || 'this member'} and ask about their experience in Valencia.
                      </p>
                    </div>

                    <div className="w-full space-y-2 pt-1">
                      <p className="text-[11px] font-semibold text-slate-400">Quick starters</p>
                      <div className="flex flex-col gap-2">
                        {ICEBREAKERS.map((promptText, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewMessage(promptText);
                              requestAnimationFrame(() => textareaRef.current?.focus());
                            }}
                            className="text-left text-xs font-medium text-slate-700 bg-white hover:bg-brand-blue hover:text-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 transition-all duration-150 active:scale-[0.99] cursor-pointer"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col pb-2">
                    {visibleMessages.map((msg, idx) => {
                      const isSentByMe = msg.sender_id === currentUser?.id;
                      const prevMsg = idx > 0 ? visibleMessages[idx - 1] : null;
                      const nextMsg = idx < visibleMessages.length - 1 ? visibleMessages[idx + 1] : null;

                      const dateHeader = formatMessageDateGroup(msg.created_at);
                      const prevDateHeader = prevMsg ? formatMessageDateGroup(prevMsg.created_at) : '';
                      const showDateDivider = dateHeader !== prevDateHeader;

                      const isSameSenderAsPrev =
                        !showDateDivider &&
                        prevMsg !== null &&
                        prevMsg.sender_id === msg.sender_id &&
                        Math.abs(new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) <
                          3 * 60 * 1000;

                      const isSameSenderAsNext =
                        nextMsg !== null &&
                        formatMessageDateGroup(nextMsg.created_at) === dateHeader &&
                        nextMsg.sender_id === msg.sender_id &&
                        Math.abs(new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()) <
                          3 * 60 * 1000;

                      const showAvatar = !isSentByMe && !isSameSenderAsNext;
                      const isFailed = msg._optimisticStatus === 'failed';
                      const isSending = msg._optimisticStatus === 'sending';

                      // Adaptive clustered corner geometry
                      const bubbleRadius = isSentByMe
                        ? cn(
                            'rounded-[20px]',
                            isSameSenderAsPrev && 'rounded-tr-[6px]',
                            isSameSenderAsNext ? 'rounded-br-[6px]' : 'rounded-br-[6px]'
                          )
                        : cn(
                            'rounded-[20px]',
                            isSameSenderAsPrev && 'rounded-tl-[6px]',
                            isSameSenderAsNext ? 'rounded-bl-[6px]' : 'rounded-bl-[6px]'
                          );

                      return (
                        <React.Fragment key={msg.id || idx}>
                          {showDateDivider && (
                            <div className="flex items-center justify-center my-4">
                              <span className="text-[11px] font-semibold text-slate-400 px-3 py-1 bg-slate-200/50 rounded-full">
                                {dateHeader}
                              </span>
                            </div>
                          )}

                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                              'group flex items-end gap-2',
                              isSentByMe ? 'justify-end' : 'justify-start',
                              isSameSenderAsPrev ? 'mt-1' : 'mt-3.5'
                            )}
                          >
                            {/* Avatar spacer keeps clustered bubbles cleanly aligned */}
                            {!isSentByMe && (
                              <div className="w-7 shrink-0">
                                {showAvatar && (
                                  <img
                                    src={
                                      selectedChat.otherUser?.avatar_url ||
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        formatName(selectedChat.otherUser?.full_name) || 'Member'
                                      )}&background=0a192f&color=fff`
                                    }
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200/80 bg-slate-100"
                                  />
                                )}
                              </div>
                            )}

                            {/* Subtle Copy button on left for outgoing messages */}
                            {isSentByMe && !isFailed && (
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all cursor-pointer shrink-0 self-center"
                                title="Copy message"
                                aria-label="Copy message"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            <div className="flex flex-col max-w-[82%] sm:max-w-[72%]">
                              <div
                                className={cn(
                                  'px-3.5 py-2.5 text-[13.5px] sm:text-[14px] leading-[1.48] transition-opacity',
                                  bubbleRadius,
                                  isSentByMe
                                    ? isFailed
                                      ? 'bg-rose-50 text-rose-900 border border-rose-200'
                                      : 'bg-brand-blue text-white shadow-xs shadow-brand-blue/15'
                                    : 'bg-white text-slate-800 border border-slate-200/75 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
                                  isSending && 'opacity-80'
                                )}
                              >
                                <p className="break-words whitespace-pre-wrap">
                                  {renderMessageContent(msg.content, isSentByMe && !isFailed)}
                                </p>

                                <div
                                  className={cn(
                                    'flex items-center justify-end gap-1 mt-1 text-[10px] font-medium tabular-nums select-none',
                                    isSentByMe
                                      ? isFailed
                                        ? 'text-rose-600'
                                        : 'text-white/75'
                                      : 'text-slate-400'
                                  )}
                                >
                                  <span>
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {isSentByMe && (
                                    <>
                                      {isFailed ? (
                                        <AlertCircle className="w-3 h-3 text-rose-500" />
                                      ) : isSending ? (
                                        <Clock className="w-3 h-3 text-white/70" />
                                      ) : msg.is_read ? (
                                        <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5 text-white/70" />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* 1-click Retry row if optimistic send failed */}
                              {isFailed && (
                                <div className="flex items-center justify-end gap-2 mt-1">
                                  <span className="text-[11px] font-medium text-rose-600">Not delivered</span>
                                  <button
                                    type="button"
                                    onClick={() => dispatchMessage(msg.content, msg.id)}
                                    className="text-[11px] font-semibold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Retry</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Subtle Copy button on right for incoming messages */}
                            {!isSentByMe && (
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg)}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all cursor-pointer shrink-0 self-center"
                                title="Copy message"
                                aria-label="Copy message"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </motion.div>
                        </React.Fragment>
                      );
                    })}

                    {/* Live Typing Indicator Bubble */}
                    <AnimatePresence>
                      {isOtherUserTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.16 }}
                          className="flex items-end gap-2 mt-3"
                        >
                          <img
                            src={
                              selectedChat.otherUser?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                formatName(selectedChat.otherUser?.full_name) || 'Member'
                              )}&background=0a192f&color=fff`
                            }
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border border-slate-200/80"
                          />
                          <div className="px-4 py-3 rounded-[20px] rounded-bl-[6px] bg-white border border-slate-200/75 shadow-2xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:140ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:280ms]" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating Scroll-to-Bottom Button */}
              <AnimatePresence>
                {showScrollToBottom && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.92 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-3 right-4 z-20 h-10 px-3 rounded-full bg-white text-slate-700 border border-slate-200/90 shadow-lg flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                    aria-label="Scroll to latest messages"
                  >
                    {unreadBelowCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-brand-blue text-white text-[10px] font-bold tabular-nums">
                        {unreadBelowCount} new
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Composer Area */}
            <div className="px-2.5 sm:px-4 py-2 sm:py-3 bg-white border-t border-slate-200/75 relative shrink-0">
              {userProfile?.chat_enabled === false ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center text-slate-600 text-xs font-medium leading-relaxed">
                  You have disabled chat participation. Enable it in Profile &gt; Settings to message members.
                </div>
              ) : selectedChat.otherUser?.chat_enabled === false ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>This member has disabled chat participation.</span>
                </div>
              ) : selectedChat.is_blocked ? (
                <div className="bg-slate-900 rounded-2xl p-3.5 text-center text-white text-xs font-medium flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <span>
                      {isSelectedBlockedByMe
                        ? 'You have blocked this conversation.'
                        : 'This conversation has been blocked by the other participant.'}
                    </span>
                  </div>
                  {isSelectedBlockedByMe && (
                    <button
                      type="button"
                      onClick={() => setShowBlockModal(true)}
                      className="bg-white/15 hover:bg-white/25 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Unblock to resume
                    </button>
                  )}
                </div>
              ) : isSelectedBlockedByMe ? (
                <div className="bg-rose-50/70 border border-rose-200/70 rounded-2xl p-3.5 text-center text-rose-700 text-xs font-medium flex flex-col items-center gap-2">
                  <span>You have blocked this member. Unblock them to resume chatting.</span>
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(true)}
                    className="bg-white hover:bg-rose-50 text-rose-600 px-4 py-1.5 rounded-xl border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Unblock member
                  </button>
                </div>
              ) : isSelectedBlockedMe ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center text-slate-500 text-xs font-medium">
                  This member does not accept private messages or is currently unavailable.
                </div>
              ) : (
                <div className="relative" ref={emojiTrayRef}>
                  {/* Smooth Animated Emoji Drawer */}
                  <AnimatePresence>
                    {showEmojiBar && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200/90 p-2 rounded-2xl shadow-xl grid grid-cols-8 gap-1 z-30"
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage((prev) => prev + emoji);
                              textareaRef.current?.focus();
                            }}
                            className="w-9 h-9 rounded-xl hover:bg-slate-100 active:scale-110 transition-all text-lg flex items-center justify-center cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2 bg-slate-100/80 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-blue/15 focus-within:border-brand-blue/35 border border-transparent rounded-2xl p-1.5 pl-2 transition-all duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => setShowEmojiBar((prev) => !prev)}
                      className={cn(
                        'w-10 h-10 rounded-xl transition-colors flex items-center justify-center shrink-0 cursor-pointer active:scale-95',
                        showEmojiBar
                          ? 'text-brand-blue bg-brand-blue/10'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                      )}
                      title="Insert emoji"
                      aria-label="Insert emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        notifyTyping(e.target.value);
                      }}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder="Write a message..."
                      className="flex-1 bg-transparent border-none text-[13.5px] sm:text-sm font-normal text-slate-800 placeholder-slate-400 outline-none resize-none py-2.5 max-h-[124px] leading-snug"
                    />

                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer',
                        newMessage.trim()
                          ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/25 hover:brightness-110 active:scale-95'
                          : 'bg-slate-200/80 text-slate-400 cursor-not-allowed'
                      )}
                      title="Send message"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4 translate-x-[0.5px]" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 md:p-12 space-y-4 bg-white">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Your private conversations
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a conversation on the left or start a new one from any member review on a professional profile.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* REPORT MEMBER MODAL */}
      <AnimatePresence>
        {showReportModal && selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setShowReportModal(false)}
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-[210] flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl relative border border-slate-200/80"
            >
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
                aria-label="Close report dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Report inappropriate behavior
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Help keep our community safe. Submitting a report also blocks this member automatically.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Primary reason
                    </label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand-blue/15 focus:border-brand-blue/40 rounded-xl text-xs font-medium text-slate-800 outline-none"
                    >
                      <option value="harassment">Harassment or disrespectful behavior</option>
                      <option value="spam">Spam or unsolicited advertising</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="scam">Scam or suspicious behavior</option>
                      <option value="other">Other reason</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Details (optional)
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={3}
                      placeholder="Describe the situation briefly..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand-blue/15 focus:border-brand-blue/40 rounded-xl text-xs text-slate-800 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    disabled={isActionLoading}
                    className="py-2.5 bg-brand-blue hover:brightness-110 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BLOCK MEMBER MODAL */}
      <AnimatePresence>
        {showBlockModal && selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setShowBlockModal(false)}
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-[210] flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-200/80"
            >
              <div className="space-y-4 text-center">
                <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {isSelectedBlockedByMe ? 'Unblock this member?' : 'Block this member?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {isSelectedBlockedByMe
                      ? `You will be able to exchange messages with ${formatName(selectedChat.otherUser?.full_name)} again.`
                      : `You will no longer send or receive messages with ${formatName(selectedChat.otherUser?.full_name)}.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    className="py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeBlockToggle}
                    disabled={isActionLoading}
                    className={cn(
                      'py-2.5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer',
                      isSelectedBlockedByMe
                        ? 'bg-brand-blue hover:brightness-110'
                        : 'bg-rose-600 hover:bg-rose-700'
                    )}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSelectedBlockedByMe ? (
                      'Unblock'
                    ) : (
                      'Block'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ARCHIVE CONVERSATION MODAL */}
      <AnimatePresence>
        {showArchiveConfirmModal && selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setShowArchiveConfirmModal(false)}
            className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs z-[210] flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-200/80"
            >
              <div className="space-y-4 text-center">
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Archive conversation?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Your conversation with{' '}
                    <span className="font-semibold text-slate-700">
                      {formatName(selectedChat.otherUser?.full_name)}
                    </span>{' '}
                    will move to Archived and can be restored anytime.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirmModal(false)}
                    className="py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmArchiveCurrentChat}
                    className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
