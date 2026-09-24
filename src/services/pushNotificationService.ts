import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PushSubscriptionRecord {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at?: string;
}

// Convert VAPID public key string from base64 to Uint8Array required by pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationService = {
  /**
   * Check if the current browser and platform support Web Push & Notifications
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Check if the device is iOS and running in Safari browser (not installed as PWA)
   * On iOS, Web Push is only supported since iOS 16.4+ AND the user MUST first add the app to their Home Screen.
   */
  isIOSInBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    return isIOS && !isStandalone;
  },

  /**
   * Get the current Notification permission status
   */
  getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported on this device/browser.');
    }

    if (this.isIOSInBrowser()) {
      throw new Error('On iPhone/iPad, please add Unlocked to your Home Screen first (Share > Add to Home Screen) to enable push notifications.');
    }

    const permission = await Notification.requestPermission();
    return permission;
  },

  /**
   * Get existing PushSubscription if available
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.warn('[PushService] Error getting existing subscription:', err);
      return null;
    }
  },

  /**
   * Subscribe user to Web Push using a VAPID Public Key
   */
  async subscribeUser(userId: string, vapidPublicKey?: string): Promise<PushSubscription | null> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted by user.');
    }

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    // If already subscribed, return it
    if (!subscription) {
      // Use provided VAPID or default placeholder for demo / custom configuration
      const key = vapidPublicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };

      if (key) {
        subscribeOptions.applicationServerKey = urlBase64ToUint8Array(key);
      }

      subscription = await reg.pushManager.subscribe(subscribeOptions);
    }

    if (subscription) {
      await this.saveSubscriptionToDatabase(userId, subscription);
    }

    return subscription;
  },

  /**
   * Unsubscribe user from Web Push
   */
  async unsubscribeUser(userId: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      if (isSupabaseConfigured && userId) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }

      localStorage.removeItem(`unlocked_push_subscribed_${userId}`);
      return true;
    } catch (err) {
      console.error('[PushService] Error unsubscribing:', err);
      return false;
    }
  },

  /**
   * Save the PushSubscription credentials (endpoint, p256dh, auth) to Supabase
   */
  async saveSubscriptionToDatabase(userId: string, subscription: PushSubscription): Promise<void> {
    const rawSub = subscription.toJSON();
    const p256dh = rawSub.keys?.p256dh || '';
    const auth = rawSub.keys?.auth || '';
    const endpoint = subscription.endpoint;

    // Cache locally
    try {
      localStorage.setItem(`unlocked_push_subscribed_${userId}`, 'true');
      localStorage.setItem(`unlocked_push_endpoint_${userId}`, endpoint);
    } catch (_) {}

    if (!isSupabaseConfigured) {
      console.warn('[PushService] Supabase not configured, saved subscription to localStorage only.');
      return;
    }

    try {
      const record = {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      };

      // Upsert into push_subscriptions table
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(record, { onConflict: 'endpoint' });

      if (error) {
        // Table might not exist yet, log clear instructions
        console.warn('[PushService] Could not store push subscription in Supabase. Ensure table "push_subscriptions" exists:', error.message);
      } else {
        console.log('[PushService] Push subscription successfully registered in Supabase.');
      }
    } catch (err) {
      console.warn('[PushService] Failed to sync subscription with Supabase:', err);
    }
  },

  /**
   * Trigger a test notification directly on the client to verify browser capabilities
   */
  async showLocalNotification(title: string = 'Unlocked Valencia', body: string = 'Les notifications push fonctionnent parfaitement !'): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported in this browser.');
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      throw new Error('Permission denied.');
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/logo2.png',
        badge: '/logo2.png',
        data: { url: '/' },
        vibrate: [100, 50, 100]
      } as any);
      return true;
    } catch (err) {
      console.warn('[PushService] Fallback to new Notification():', err);
      new Notification(title, {
        body,
        icon: '/logo2.png'
      });
      return true;
    }
  },

  /**
   * SQL Migration script to create the push_subscriptions table in Supabase
   */
  getSupabaseSQLSchema(): string {
    return `-- Table to store Web Push subscriptions for users
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own push subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: Service role / Edge Functions can access all subscriptions to broadcast notifications
`;
  }
};
