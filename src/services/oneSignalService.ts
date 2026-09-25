import OneSignal from 'react-onesignal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Public Web SDK client App ID fallback (used only if server route is unreachable)
export const ONESIGNAL_APP_ID = '10a14311-a42a-4681-9682-ce965d80ae75';

export type PushSubscriptionObserver = (subscriptionId: string) => void;

class OneSignalService {
  private isInitialized = false;
  private currentAppId = '';
  private subscriptionObservers = new Set<PushSubscriptionObserver>();
  private observerBound = false;

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
   * Fetch OneSignal App ID securely from the backend server
   * (Ensures no secrets or keys are exposed via client-side VITE_ environment variables)
   */
  async fetchAppIdFromServer(): Promise<string> {
    if (this.currentAppId) return this.currentAppId;
    try {
      const res = await fetch('/api/onesignal-config');
      if (res.ok) {
        const data = await res.json();
        if (data.appId) {
          this.currentAppId = data.appId;
          return data.appId;
        }
      }
    } catch (err) {
      console.warn('[OneSignal] Could not fetch config from server proxy, using default:', err);
    }
    return this.getAppId();
  }

  /**
   * Get the active OneSignal App ID
   */
  getAppId(): string {
    if (this.currentAppId) return this.currentAppId;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('onesignal_app_id') : null;
    if (stored && stored !== '4653c1cf-3dbe-494d-8897-cfa37b9d4d41') {
      return stored;
    }
    return ONESIGNAL_APP_ID;
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
   * Evaluates if a given subscription ID is a real server-assigned value
   * (non-empty and not prefixed with 'local-')
   */
  isRealServerAssignedId(id?: string | null): boolean {
    return !!id && typeof id === 'string' && id.trim().length > 0 && !id.startsWith('local-');
  }

  /**
   * Get current push subscription ID synchronously if available
   */
  getCurrentSubscriptionId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return OneSignal.User?.PushSubscription?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Register a push subscription observer.
   * Immediately evaluates current subscription ID, and triggers on change.
   * Returns an unsubscribe function.
   */
  addPushSubscriptionObserver(observer: PushSubscriptionObserver): () => void {
    this.subscriptionObservers.add(observer);

    // Evaluate immediately at observer-registration time (Requirement 4)
    const currentId = this.getCurrentSubscriptionId();
    if (this.isRealServerAssignedId(currentId)) {
      try {
        observer(currentId!);
      } catch (err) {
        console.error('[OneSignal] Observer immediate error:', err);
      }
    }

    return () => {
      this.subscriptionObservers.delete(observer);
    };
  }

  private notifyObservers(subId?: string | null) {
    if (this.isRealServerAssignedId(subId)) {
      this.subscriptionObservers.forEach((observer) => {
        try {
          observer(subId!);
        } catch (err) {
          console.error('[OneSignal] Observer notification error:', err);
        }
      });
    }
  }

  /**
   * Initialize OneSignal Web SDK
   */
  async init(userId?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Fetch App ID securely from backend server
    const appId = await this.fetchAppIdFromServer();

    if (!appId) {
      console.warn('[OneSignal] No App ID configured.');
      return false;
    }

    const windowOneSignal = typeof window !== 'undefined' ? (window as any).OneSignal : null;
    const isAlreadyInitialized = this.isInitialized || !!(windowOneSignal?._isInitialized || windowOneSignal?.User?.PushSubscription);

    if (isAlreadyInitialized) {
      this.isInitialized = true;
      if (!this.observerBound && windowOneSignal?.User?.PushSubscription) {
        this.observerBound = true;
        try {
          windowOneSignal.User.PushSubscription.addEventListener('change', (change: any) => {
            const newId = change?.current?.id || windowOneSignal.User?.PushSubscription?.id;
            this.notifyObservers(newId);
          });
        } catch (err) {
          console.warn('[OneSignal] Could not bind change event:', err);
        }
      }
      const currentSubId = windowOneSignal?.User?.PushSubscription?.id;
      if (currentSubId) this.notifyObservers(currentSubId);

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

      // Register push subscription observer listener immediately (Requirement 1)
      if (!this.observerBound) {
        this.observerBound = true;
        try {
          OneSignal.User?.PushSubscription?.addEventListener('change', (change: any) => {
            const newId = change?.current?.id || OneSignal.User?.PushSubscription?.id;
            this.notifyObservers(newId);
          });
        } catch (err) {
          console.warn('[OneSignal] Could not bind change event:', err);
        }
      }

      // Requirement 4: Evaluate current subscription ID immediately at init
      const currentSubId = OneSignal.User?.PushSubscription?.id;
      this.notifyObservers(currentSubId);

      if (userId) {
        await this.loginUser(userId);
      }

      return true;
    } catch (error: any) {
      // If already initialized by inline script, recover gracefully
      const isAlreadyInitError = String(error?.message || '').toLowerCase().includes('already initialized');
      if (isAlreadyInitError || (typeof window !== 'undefined' && (window as any).OneSignal?.User)) {
        this.isInitialized = true;
        if (!this.observerBound) {
          this.observerBound = true;
          try {
            OneSignal.User?.PushSubscription?.addEventListener('change', (change: any) => {
              const newId = change?.current?.id || OneSignal.User?.PushSubscription?.id;
              this.notifyObservers(newId);
            });
          } catch (err) {
            console.warn('[OneSignal] Could not bind change event:', err);
          }
        }
        const currentSubId = OneSignal.User?.PushSubscription?.id;
        if (currentSubId) this.notifyObservers(currentSubId);
        if (userId) await this.loginUser(userId);
        return true;
      }
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
    const appId = await this.fetchAppIdFromServer();
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

  /**
   * Send a push notification securely through the backend server proxy
   * (Keeps the OneSignal REST API secret key strictly protected on the server)
   */
  async sendServerNotification(title: string, message: string, url: string = '/', targetUserIds?: string[]): Promise<any> {
    const res = await fetch('/api/send-push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, url, targetUserIds })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erreur lors de l\'envoi de la notification push.');
    }
    return data;
  }
}

export const oneSignalService = new OneSignalService();
