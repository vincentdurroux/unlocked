import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Smartphone, Sparkles, Share, PlusSquare, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
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
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    // Only check in browser
    if (typeof window === 'undefined') return;

    // Check if user dismissed prompt recently (last 3 days)
    const dismissedAt = localStorage.getItem('unlocked_push_prompt_dismissed');
    if (dismissedAt) {
      const diffDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (diffDays < 3) {
        return;
      }
    }

    // Check if permission already granted in browser
    if ('Notification' in window && Notification.permission === 'granted') {
      return;
    }

    // Delay prompt by 2.5 seconds so user has time to load content
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
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentUserId]);

  const devInfo = oneSignalService.getDeviceInfo();

  const handleSubscribe = async () => {
    setErrorMessage(null);
    setIsDenied(false);

    // If on iPhone/iPad in standard Safari (not yet added to Home Screen), Web Push requires Standalone mode
    if (devInfo.isIOS && !devInfo.isStandalone) {
      setShowIosGuide(true);
      return;
    }

    setLoading(true);
    try {
      const appId = oneSignalService.getAppId();
      if (appId) {
        // Direct invocation preserves browser user activation token
        await oneSignalService.subscribe(currentUserId);
      } else {
        await pushNotificationService.subscribeUser(currentUserId || 'guest');
      }

      setSuccess(true);
      onSubscribed?.();

      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } catch (err: any) {
      console.warn('[PushPrompt] Subscribe result:', err);
      const code = err?.code;

      if (code === 'IOS_STANDALONE_REQUIRED') {
        setShowIosGuide(true);
      } else if (code === 'PERMISSION_DENIED') {
        setIsDenied(true);
        setErrorMessage("Les notifications sont bloquées dans votre navigateur. Veuillez appuyer sur l'icône de cadenas ou de réglages à gauche de l'adresse web pour les autoriser.");
      } else if (code === 'PERMISSION_DISMISSED') {
        setErrorMessage("Demande d'autorisation annulée. Vous pouvez cliquer sur « Activer » quand vous le souhaitez.");
      } else {
        setErrorMessage(err?.message || "Impossible d'activer les notifications pour le moment.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem('unlocked_push_prompt_dismissed', Date.now().toString());
    } catch (_) {}
  };

  if (!isVisible && !showIosGuide) return null;

  return (
    <>
      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Activer sur votre iPhone
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Apple exige d'ajouter l'application à l'écran d'accueil pour recevoir des notifications push en direct :
            </p>

            <div className="space-y-3 bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 mb-5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Appuyez sur Partager</p>
                  <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                    Touchez l'icône <Share className="w-3.5 h-3.5 inline text-blue-400" /> en bas de votre écran Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Ajoutez à l'écran d'accueil</p>
                  <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                    Faites défiler et touchez <PlusSquare className="w-3.5 h-3.5 inline text-blue-400" /> <span className="font-medium text-slate-200">« Sur l'écran d'accueil »</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Ouvrez l'icône Unlocked</p>
                  <p className="text-slate-400 mt-0.5">
                    Touchez « Ajouter ». Ouvrez ensuite l'application depuis votre écran d'accueil pour recevoir toutes vos alertes !
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Prompt Banner */}
      {isVisible && (
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
                      {devInfo.isIOS && !devInfo.isStandalone
                        ? "Activez les notifications sur votre iPhone pour ne manquer aucun message, sortie ou annonce."
                        : `Activez les notifications sur votre ${devInfo.isAndroid ? 'Android' : devInfo.isIOS ? 'iPhone' : 'téléphone'} pour ne manquer aucun message, sortie ou annonce.`}
                    </p>
                  </div>
                </div>

                {/* Inline Error / Guidance message if blocked or dismissed */}
                {errorMessage && (
                  <div className={`p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                    isDenied 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="flex-1 py-2 px-3.5 bg-brand-blue hover:bg-blue-600 active:scale-98 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Activation...
                      </span>
                    ) : devInfo.isIOS && !devInfo.isStandalone ? (
                      <>
                        <Share className="w-3.5 h-3.5 text-blue-200" />
                        <span>Installer sur mon iPhone</span>
                      </>
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
      )}
    </>
  );
};
