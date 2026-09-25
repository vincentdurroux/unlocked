import OneSignal from 'react-onesignal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Public Web SDK client App ID fallback (reads NEXT_PUBLIC_ONESIGNAL_APP_ID from Vercel / environment)
export const ONESIGNAL_APP_ID =
  (typeof process !== 'undefined' && (process.env as any)?.NEXT_PUBLIC_ONESIGNAL_APP_ID) ||
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.NEXT_PUBLIC_ONESIGNAL_APP_ID) ||
  '10a14311-a42a-4681-9682-ce965d80ae75';

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
   * Check if current hostname is compatible with the active OneSignal App ID
   */
  isOriginAllowedForAppId(appId: string): boolean {
    if (typeof window === 'undefined') return true;
    const isDefault = appId === '10a14311-a42a-4681-9682-ce965d80ae75';
    if (!isDefault) return true;
    const hostname = window.location.hostname;
    return hostname.endsWith('mycityunlocked.app') || hostname === 'localhost' || hostname === '127.0.0.1';
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

    // Guard against OneSignal domain restriction on dev / preview domains
    if (!this.isOriginAllowedForAppId(appId)) {
      console.info(`[OneSignal] Skipping OneSignal SDK init: default App ID is bound to https://mycityunlocked.app (current host: ${window.location.hostname})`);
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
        welcomeNotification: {
          disable: true,
        } as any,
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
      const errMsg = String(error?.message || error || '');
      if (errMsg.includes('mycityunlocked.app') || errMsg.toLowerCase().includes('can only be used on')) {
        console.info('[OneSignal] Origin restriction notice handled gracefully:', errMsg);
        return false;
      }
      // If already initialized by inline script, recover gracefully
      const isAlreadyInitError = errMsg.toLowerCase().includes('already initialized');
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
      const windowOS = (window as any).OneSignal;
      const optIn = OneSignal.User?.PushSubscription?.optedIn ?? windowOS?.User?.PushSubscription?.optedIn;
      const permission = (typeof Notification !== 'undefined' && Notification.permission === 'granted') || 
                         OneSignal.Notifications?.permission || 
                         windowOS?.Notifications?.permission;
      return !!optIn && !!permission;
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
      const windowOS = (window as any).OneSignal;
      return OneSignal.User?.PushSubscription?.id || windowOS?.User?.PushSubscription?.id || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Prompt user for notification permission and opt-in
   * CRITICAL FOR MOBILE: Must execute permission request immediately in the user gesture event frame
   * without any preceding network fetch delays (which cause modern mobile browsers to drop user activation).
   */
  async subscribe(userId?: string): Promise<boolean> {
    // 1. Browser check
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.info('[OneSignal] Push notifications not supported in this browser.');
      return false;
    }

    // 2. Permission already denied in browser settings
    if (Notification.permission === 'denied') {
      console.info('[OneSignal] Notification permission is currently denied.');
      return false;
    }

    // 3. REQUEST PERMISSION IMMEDIATELY (native system prompt)
    // Directly invoke Notification.requestPermission() within the user gesture event frame
    // so mobile browsers (iOS/Android) and desktop browsers present the generic system message immediately.
    let currentPerm: NotificationPermission = Notification.permission;

    if (currentPerm !== 'granted') {
      try {
        if (typeof Notification.requestPermission === 'function') {
          const reqPromise = Notification.requestPermission();
          if (reqPromise && typeof (reqPromise as any).then === 'function') {
            currentPerm = await reqPromise;
          } else {
            currentPerm = await new Promise<NotificationPermission>((resolve) => {
              Notification.requestPermission(resolve);
            });
          }
        }
      } catch (e) {
        // Fallback for older browsers using callback syntax
        try {
          if (Notification.requestPermission) {
            currentPerm = await new Promise<NotificationPermission>((resolve) => {
              Notification.requestPermission(resolve);
            });
          }
        } catch (_) {}
      }

      if (currentPerm !== 'granted') {
        return false;
      }
    }

    // 4. Now that permission is granted, check origin compatibility before OneSignal opt-in
    const activeAppId = this.getAppId();
    const canUseOneSignal = this.isOriginAllowedForAppId(activeAppId);

    if (canUseOneSignal) {
      if (!this.isInitialized) {
        await this.init(userId);
      }

      const windowOS = typeof window !== 'undefined' ? (window as any).OneSignal : null;

      try {
        if (OneSignal.User?.PushSubscription?.optIn) {
          await OneSignal.User.PushSubscription.optIn();
        } else if (windowOS?.User?.PushSubscription?.optIn) {
          await windowOS.User.PushSubscription.optIn();
        }
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (msg.includes('mycityunlocked.app') || msg.toLowerCase().includes('can only be used on')) {
          console.info('[OneSignal] OptIn notice:', msg);
        } else {
          console.warn('[OneSignal] optIn call warning:', err);
        }
      }
    } else {
      console.info(`[OneSignal] Active origin (${window.location.hostname}) differs from production (mycityunlocked.app). Native notification permission is granted.`);
    }

    // 5. Sync observer with latest subscription ID
    const windowOS = typeof window !== 'undefined' ? (window as any).OneSignal : null;
    const subId = this.getCurrentSubscriptionId() || windowOS?.User?.PushSubscription?.id;
    if (subId) {
      this.notifyObservers(subId);
    }

    if (userId && canUseOneSignal) {
      await this.loginUser(userId);
    }

    // Sync player ID to Supabase if configured
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
  }

  /**
   * Run full diagnostics on the current Web Push & OneSignal environment
   */
  async getDiagnostics() {
    const isBrowser = typeof window !== 'undefined';
    const hasNotification = isBrowser && 'Notification' in window;
    const hasServiceWorker = isBrowser && 'serviceWorker' in navigator;
    const hasPushManager = isBrowser && 'PushManager' in window;
    const permission = hasNotification ? Notification.permission : 'unsupported';
    const isSupported = hasNotification && hasServiceWorker && hasPushManager;
    const appId = this.getAppId();
    const isInit = this.isInitialized;
    const subscriptionId = await this.getSubscriptionId();
    const isSub = await this.isSubscribed();
    
    let activeWorkerUrl: string | null = null;
    if (hasServiceWorker) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        activeWorkerUrl = reg?.active?.scriptURL || null;
      } catch (_) {}
    }

    return {
      isSupported,
      permission,
      isInit,
      appId,
      subscriptionId,
      isSubscribed: isSub,
      activeWorkerUrl
    };
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
