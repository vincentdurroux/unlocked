import React, { useEffect } from 'react';
import { oneSignalService } from '../services/oneSignalService';

interface PushNotificationPromptProps {
  currentUserId?: string;
  isAdmin?: boolean;
  onSubscribed?: () => void;
}

/**
 * PushNotificationPrompt
 *
 * Utilise uniquement le dialogue système natif (via push-permission-request dans la WKWebView iOS
 * ou via l'autorisation système sur les autres wrappers natifs), sans afficher de bannière intrusive.
 */
export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  currentUserId,
  onSubscribed
}) => {
  useEffect(() => {
    // If the user is not signed up or signed in, do not request push permissions
    if (!currentUserId) return;

    if (typeof window === 'undefined') return;

    // Do NOT request or prompt for Web Push in standard desktop/mobile web browsers
    const dev = oneSignalService.getDeviceInfo();
    const isIOSNative = dev.isIOSWebView || dev.hasIOSPushBridge;
    if (!dev.isNativeWrapper && !isIOSNative) {
      return;
    }

    if (isIOSNative) {
      // In iOS WKWebView, window.Notification is absent — rely exclusively on native push-permission-state
      const cachedState = oneSignalService.getCachedNativePushPermissionState();
      if (cachedState === 'granted') {
        onSubscribed?.();
        return;
      }
      if (cachedState === 'denied') {
        return;
      }
    } else {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'default') return;
    }

    // Vérifier si l'utilisateur a déjà vu la demande système récemment
    const askedAt = localStorage.getItem('unlocked_native_prompt_requested');
    if (askedAt) {
      const diffHours = (Date.now() - parseInt(askedAt, 10)) / (1000 * 60 * 60);
      if (diffHours < 24) return;
    }

    let cancelled = false;

    // Déclencher directement la boîte de dialogue système sur l'app native
    const triggerSystemPrompt = async () => {
      window.removeEventListener('click', triggerSystemPrompt);
      window.removeEventListener('touchend', triggerSystemPrompt);
      if (cancelled) return;

      if (isIOSNative) {
        const latestState = oneSignalService.getCachedNativePushPermissionState();
        if (latestState === 'granted') {
          onSubscribed?.();
          return;
        }
        if (latestState === 'denied') {
          return;
        }
      }

      try {
        localStorage.setItem('unlocked_native_prompt_requested', Date.now().toString());

        const granted = await oneSignalService.subscribe(currentUserId);
        if (cancelled) return;

        if (granted || (!isIOSNative && 'Notification' in window && Notification.permission === 'granted')) {
          onSubscribed?.();
        }
      } catch (err) {
        console.debug('[Push] System prompt request completed:', err);
      }
    };

    // Attendre la première interaction naturelle de l'utilisateur pour afficher la boîte de dialogue système native
    window.addEventListener('click', triggerSystemPrompt, { once: true });
    window.addEventListener('touchend', triggerSystemPrompt, { once: true });

    // Interroger l'état natif en arrière-plan dès le montage si Xcode expose push-permission-state
    if (isIOSNative) {
      oneSignalService.queryNativePushPermissionState().then((state) => {
        if (cancelled) return;
        if (state === 'granted') {
          window.removeEventListener('click', triggerSystemPrompt);
          window.removeEventListener('touchend', triggerSystemPrompt);
          onSubscribed?.();
        } else if (state === 'denied') {
          window.removeEventListener('click', triggerSystemPrompt);
          window.removeEventListener('touchend', triggerSystemPrompt);
        }
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      window.removeEventListener('click', triggerSystemPrompt);
      window.removeEventListener('touchend', triggerSystemPrompt);
    };
  }, [currentUserId, onSubscribed]);

  // Aucun élément visuel intrusif : on conserve le dialogue système natif générique
  return null;
};
