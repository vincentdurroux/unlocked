import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Smartphone, Sparkles } from 'lucide-react';
import { oneSignalService } from '../services/oneSignalService';
import { pushNotificationService } from '../services/pushNotificationService';

interface PushNotificationPromptProps {
  currentUserId?: string;
  isAdmin?: boolean;
  onSubscribed?: () => void;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  currentUserId,
  isAdmin = false,
  onSubscribed
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only check in browser
    if (typeof window === 'undefined') return;

    // Push notification prompt is temporarily restricted to admins only
    if (!isAdmin) return;

    // Check if user dismissed prompt recently (last 7 days)
    const dismissedAt = localStorage.getItem('unlocked_push_prompt_dismissed');
    if (dismissedAt) {
      const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return;
      }
    }

    // Check if permission already granted or blocked
    if ('Notification' in window && (Notification.permission === 'granted' || Notification.permission === 'denied')) {
      return;
    }

    // Delay prompt by 3.5 seconds so user has time to load content
    const timer = setTimeout(async () => {
      const appId = oneSignalService.getAppId();
      if (!appId && !pushNotificationService.isSupported()) {
        return;
      }

      // Check if already subscribed in OneSignal
      if (appId) {
        const isSub = await oneSignalService.isSubscribed();
        if (isSub) return;
      }

      setIsVisible(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [currentUserId]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const appId = oneSignalService.getAppId();
      if (appId) {
        await oneSignalService.subscribe(currentUserId);
      } else {
        await pushNotificationService.subscribeUser(currentUserId || 'guest');
      }

      setSuccess(true);
      onSubscribed?.();

      setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    } catch (err) {
      console.warn('[PushPrompt] Subscribe dismissed or failed:', err);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('unlocked_push_prompt_dismissed', Date.now().toString());
    } catch (_) {}
  };

  if (!isVisible) return null;

  const devInfo = oneSignalService.getDeviceInfo();

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 relative overflow-hidden backdrop-blur-xl">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand-blue/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="flex items-center gap-3 py-2 text-emerald-400 animate-in fade-in">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Notifications activées !</p>
              <p className="text-xs text-slate-300">Vous recevrez désormais les alertes sur votre téléphone.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0 border border-brand-blue/30">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="pr-4">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white">Restez informé en direct</h4>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Activez les notifications sur votre {devInfo.isIOS ? 'iPhone' : devInfo.isAndroid ? 'Android' : 'téléphone'} pour ne manquer aucun message, sortie ou annonce.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="flex-1 py-2 px-3.5 bg-brand-blue hover:bg-blue-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Activation en cours...</span>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Activer sur mon téléphone</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
