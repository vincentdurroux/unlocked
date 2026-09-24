import OneSignal from 'react-onesignal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Default App ID fallback or env variable
const DEFAULT_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

class OneSignalService {
  private isInitialized = false;
  private currentAppId = '';

  /**
   * Device and platform detection for App Store / Play Store
   */
  getDeviceInfo() {
    if (typeof window === 'undefined') {
      return { isMobile: false, isIOS: false, isAndroid: false, isStandalone: false, platform: 'web' };
    }
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid || /Mobi|Tablet/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';

    return { isMobile, isIOS, isAndroid, isStandalone, platform };
  }

  /**
   * Get the active OneSignal App ID
   */
  getAppId(): string {
    if (this.currentAppId) return this.currentAppId;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('onesignal_app_id') : null;
    return stored || DEFAULT_APP_ID;
  }

  /**
   * Save a new OneSignal App ID dynamically
   */
  setAppId(appId: string): void {
    const trimmed = appId.trim();
    this.currentAppId = trimmed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('onesignal_app_id', trimmed);
    }
  }

  /**
   * Initialize OneSignal Web SDK
   */
  async init(userId?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const appId = this.getAppId();

    if (!appId) {
      console.warn('[OneSignal] No App ID configured. Set VITE_ONESIGNAL_APP_ID in .env or configure in Settings.');
      return false;
    }

    if (this.isInitialized) {
      if (userId) {
        await this.loginUser(userId);
      }
      return true;
    }

    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        } as any,
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
      });

      this.isInitialized = true;
      console.log('[OneSignal] Initialized successfully with App ID:', appId);

      if (userId) {
        await this.loginUser(userId);
      }

      return true;
    } catch (error) {
      console.error('[OneSignal] Initialization error:', error);
      return false;
    }
  }

  /**
   * Check if user is currently subscribed to OneSignal push
   */
  async isSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      const optIn = OneSignal.User?.PushSubscription?.optedIn;
      const permission = OneSignal.Notifications?.permission;
      return !!optIn && permission;
    } catch (err) {
      console.warn('[OneSignal] Error checking subscription:', err);
      return false;
    }
  }

  /**
   * Get current Push Subscription ID (Player ID)
   */
  async getSubscriptionId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      return OneSignal.User?.PushSubscription?.id || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Prompt user for notification permission and opt-in
   */
  async subscribe(userId?: string): Promise<boolean> {
    const appId = this.getAppId();
    if (!appId) {
      throw new Error('Veuillez d\'abord renseigner votre OneSignal App ID.');
    }

    if (!this.isInitialized) {
      const ok = await this.init(userId);
      if (!ok) {
        throw new Error('Échec de l\'initialisation de OneSignal. Vérifiez votre App ID.');
      }
    }

    try {
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();

      if (userId) {
        await this.loginUser(userId);
      }

      // Sync player ID to Supabase if configured
      const subId = OneSignal.User?.PushSubscription?.id;
      if (subId && userId && isSupabaseConfigured) {
        try {
          await supabase.from('profiles').update({
            onesignal_player_id: subId,
            updated_at: new Date().toISOString()
          } as any).eq('id', userId);
        } catch (_) {
          // Column might not exist yet, safe fallback
        }
      }

      return true;
    } catch (err: any) {
      console.error('[OneSignal] Error subscribing user:', err);
      throw new Error(err?.message || 'Erreur lors de l\'activation des notifications OneSignal.');
    }
  }

  /**
   * Unsubscribe / opt-out user from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      await OneSignal.User.PushSubscription.optOut();
      return true;
    } catch (err) {
      console.error('[OneSignal] Error opting out:', err);
      return false;
    }
  }

  /**
   * Associate Supabase User ID with OneSignal User
   */
  async loginUser(userId: string, tags?: Record<string, string>): Promise<void> {
    if (!this.isInitialized) return;
    try {
      await OneSignal.login(userId);
      const dev = this.getDeviceInfo();
      const combinedTags: Record<string, string> = {
        platform: dev.platform,
        is_mobile: dev.isMobile ? 'true' : 'false',
        is_standalone: dev.isStandalone ? 'true' : 'false',
        ...(tags || {})
      };
      await OneSignal.User.addTags(combinedTags);
      console.log('[OneSignal] Logged in user with ID:', userId, combinedTags);
    } catch (err) {
      console.warn('[OneSignal] Error logging in user:', err);
    }
  }

  /**
   * Log out user from OneSignal
   */
  async logoutUser(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      await OneSignal.logout();
      console.log('[OneSignal] Logged out user');
    } catch (err) {
      console.warn('[OneSignal] Error logging out user:', err);
    }
  }
}

export const oneSignalService = new OneSignalService();
