import React, { useEffect } from 'react';
import { oneSignalService } from '../services/oneSignalService';
import { pushNotificationService } from '../services/pushNotificationService';

interface PushNotificationPromptProps {
  currentUserId?: string;
  isAdmin?: boolean;
  onSubscribed?: () => void;
}

/**
 * PushNotificationPrompt
 * 
 * Utilise uniquement le message générique du système (la demande d'autorisation native du navigateur/OS)
 * sans afficher de bannière personnalisée intrusive ni de message « il faut activer sur le téléphone ».
 */
export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  currentUserId,
  onSubscribed
}) => {
  useEffect(() => {
    // Exécuté uniquement côté client dans le navigateur
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Si la permission n'est pas "default" (déjà accordée ou déjà refusée), ne rien faire
    if (Notification.permission !== 'default') return;

    // Vérifier si l'utilisateur a déjà vu la demande système récemment
    const askedAt = localStorage.getItem('unlocked_native_prompt_requested');
    if (askedAt) {
      const diffHours = (Date.now() - parseInt(askedAt, 10)) / (1000 * 60 * 60);
      if (diffHours < 24) return;
    }

    // Déclencher directement la boîte de dialogue générique du système au premier geste utilisateur
    const triggerSystemPrompt = async () => {
      window.removeEventListener('click', triggerSystemPrompt);
      window.removeEventListener('touchend', triggerSystemPrompt);

      try {
        localStorage.setItem('unlocked_native_prompt_requested', Date.now().toString());

        const appId = oneSignalService.getAppId();
        if (appId) {
          await oneSignalService.subscribe(currentUserId);
        } else if (pushNotificationService.isSupported()) {
          await pushNotificationService.subscribeUser(currentUserId || 'guest');
        }

        if (Notification.permission === 'granted') {
          onSubscribed?.();
        }
      } catch (err) {
        console.debug('[Push] System prompt request completed:', err);
      }
    };

    // Attendre la première interaction naturelle de l'utilisateur pour afficher la boîte de dialogue système native
    window.addEventListener('click', triggerSystemPrompt, { once: true });
    window.addEventListener('touchend', triggerSystemPrompt, { once: true });

    return () => {
      window.removeEventListener('click', triggerSystemPrompt);
      window.removeEventListener('touchend', triggerSystemPrompt);
    };
  }, [currentUserId, onSubscribed]);

  // Aucun élément visuel intrusif : on conserve le dialogue système natif générique
  return null;
};
