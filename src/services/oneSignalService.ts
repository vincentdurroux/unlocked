import OneSignal from 'react-onesignal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Public Web SDK client App ID fallback (reads NEXT_PUBLIC_ONESIGNAL_APP_ID from Vercel / environment)
export const ONESIGNAL_APP_ID =
  (typeof process !== 'undefined' && (process.env as any)?.NEXT_PUBLIC_ONESIGNAL_APP_ID) ||
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.NEXT_PUBLIC_ONESIGNAL_APP_ID) ||
  '10a14311-a42a-4681-9682-ce965d80ae75';

export type PushSubscriptionObserver = (subscriptionId: string) => void;
export type NativePushPermissionState = 'granted' | 'denied' | 'default' | 'unknown';

export interface OneSignalDiagnosticLog {
  ts: string;
  step: 'init' | 'permission' | 'subscription' | 'login' | 'server' | 'bridge';
  level: 'info' | 'ok' | 'warn' | 'error';
  message: string;
  data?: any;
}

class OneSignalService {
  private isInitialized = false;
  private currentAppId = '';
  private subscriptionObservers = new Set<PushSubscriptionObserver>();
  private observerBound = false;
  private clickListenerBound = false;
  private nativeSubscriptionId: string | null = null;
  private nativePushToken: string | null = null;
  private nativeOptedIn: boolean | null = null;
  private nativeExternalId: string | null = null;
  private nativeSdkInitialized: boolean | null = null;
  private nativePushPermissionState: NativePushPermissionState = 'unknown';
  private nativeRawPermissionDetail: any = null;
  private nativePermissionWaiters = new Set<(state: NativePushPermissionState) => void>();

  private currentUserId: string | null = null;
  private lastLoginAttemptUserId: string | null = null;
  private lastLoginHandlersCalled: string[] = [];
  private lastServerLinkResult: { ok: boolean; userId: string; subscriptionId: string; apiVersion?: string; error?: string; ts: string } | null = null;
  private diagnosticLogs: OneSignalDiagnosticLog[] = [];
  private pendingNotificationClick: { notification: any; data: any; launchUrl: string; ts: number } | null = null;

  private addDiag(
    step: OneSignalDiagnosticLog['step'],
    level: OneSignalDiagnosticLog['level'],
    message: string,
    data?: any
  ): void {
    const entry: OneSignalDiagnosticLog = {
      ts: new Date().toISOString(),
      step,
      level,
      message,
      ...(data !== undefined ? { data } : {})
    };
    this.diagnosticLogs.push(entry);
    if (this.diagnosticLogs.length > 80) {
      this.diagnosticLogs.splice(0, this.diagnosticLogs.length - 80);
    }
    const prefix = `[OneSignal:Diag][${step}] ${message}`;
    if (level === 'error') {
      console.error(prefix, data ?? '');
    } else if (level === 'warn') {
      console.warn(prefix, data ?? '');
    } else {
      console.info(prefix, data ?? '');
    }
  }

  private handleNativePushInfoPayload(raw: any): void {
    if (raw === null || raw === undefined) return;
    let payload: any = raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          payload = JSON.parse(trimmed);
        } catch (_) {
          payload = trimmed;
        }
      } else {
        payload = trimmed;
      }
    }

    // Plain string: could be UUID (OneSignal subscription ID) or 64-char hex APNs device token
    if (typeof payload === 'string') {
      const clean = payload.trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
        this.handleNativeSubscriptionReceived(clean);
      } else if (/^[0-9a-f]{32,}$/i.test(clean)) {
        this.nativePushToken = clean;
        this.addDiag('subscription', 'ok', 'Native APNs device token received from iOS bridge.', {
          tokenPreview: `${clean.slice(0, 10)}…${clean.slice(-6)}`,
          length: clean.length
        });
      } else if (clean.length > 6 && !clean.startsWith('local-')) {
        this.handleNativeSubscriptionReceived(clean);
      }
      return;
    }

    if (typeof payload === 'object') {
      const obj = payload.detail && typeof payload.detail === 'object' ? payload.detail : payload;
      const subId = obj.subscriptionId || obj.oneSignalSubscriptionId || obj.playerId || obj.oneSignalId || obj.id;
      const token = obj.token || obj.pushToken || obj.apnsToken || obj.deviceToken;
      const optedIn = obj.optedIn ?? obj.pushSubscribed ?? obj.isSubscribed ?? obj.subscribed;
      const extId = obj.externalId || obj.externalUserId || obj.external_id;
      const sdkInit = obj.initialized ?? obj.sdkInitialized;
      const perm = obj.permission ?? obj.permissionState ?? obj.authorizationStatus;

      if (typeof sdkInit === 'boolean') this.nativeSdkInitialized = sdkInit;
      if (typeof optedIn === 'boolean') this.nativeOptedIn = optedIn;
      if (typeof extId === 'string' && extId.trim()) this.nativeExternalId = extId.trim();
      if (typeof token === 'string' && token.trim()) {
        this.nativePushToken = token.trim();
        this.addDiag('subscription', 'ok', 'Native push token received from iOS state payload.', {
          tokenPreview: `${this.nativePushToken.slice(0, 10)}…${this.nativePushToken.slice(-6)}`
        });
      }
      if (perm !== undefined) {
        this.handleNativePermissionState(perm);
      }
      if (subId && typeof subId === 'string' && subId.trim()) {
        this.handleNativeSubscriptionReceived(subId.trim());
      } else {
        this.addDiag('bridge', 'info', 'Native OneSignal state payload received (no subscriptionId yet).', {
          sdkInitialized: this.nativeSdkInitialized,
          optedIn: this.nativeOptedIn,
          hasToken: Boolean(this.nativePushToken),
          externalId: this.nativeExternalId
        });
      }
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const windowAny = window as any;

      windowAny.__mcuOneSignalDiagnostics = () => this.getFullDiagnostics();

      windowAny.setNativeOneSignalSubscriptionId = (id: string) => {
        if (id && typeof id === 'string') {
          this.handleNativeSubscriptionReceived(id.trim());
        }
      };

      windowAny.setNativePushToken = (token: string) => {
        if (token && typeof token === 'string') {
          this.handleNativePushInfoPayload({ token: token.trim() });
        }
      };

      windowAny.setOneSignalState = (stateObj: any) => {
        this.handleNativePushInfoPayload(stateObj);
      };

      windowAny.__mcuOnNativePushInfo = (detail: any) => {
        this.handleNativePushInfoPayload(detail);
      };

      if (windowAny.__mcuLastNativePushInfo !== undefined) {
        this.handleNativePushInfoPayload(windowAny.__mcuLastNativePushInfo);
      }

      const onNativePushInfoEvent = (e: any) => {
        if (e && e.__mcuPushInfoHandled) return;
        if (e) {
          try { e.__mcuPushInfoHandled = true; } catch (_) {}
        }
        this.handleNativePushInfoPayload(e && e.detail !== undefined ? e.detail : e);
      };

      [
        'OneSignalSubscriptionReady',
        'native-onesignal-subscription',
        'onesignal-subscription-id',
        'onesignal-state',
        'push-subscription',
        'push-token',
        'push-notification-token'
      ].forEach((evtName) => {
        window.addEventListener(evtName, onNativePushInfoEvent);
        document.addEventListener(evtName, onNativePushInfoEvent);
      });

      // Median.co (GoNative) info callback
      const pollMedian = () => {
        if (windowAny.median?.onesignal?.info) {
          windowAny.median.onesignal.info((data: any) => {
            const id = data?.oneSignalUserId || data?.userId || data?.playerId;
            if (id) this.handleNativeSubscriptionReceived(String(id).trim());
          });
        }
        if (windowAny.gonative?.onesignal?.info) {
          windowAny.gonative.onesignal.info((data: any) => {
            const id = data?.oneSignalUserId || data?.userId || data?.playerId;
            if (id) this.handleNativeSubscriptionReceived(String(id).trim());
          });
        }
      };
      pollMedian();
      setTimeout(pollMedian, 1000);

      const parsePossibleJson = (val: any, depth = 0): any => {
        if (typeof val !== 'string' || depth > 2) return val;
        const trimmed = val.trim();
        if (!trimmed) return val;
        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ) {
          try {
            return parsePossibleJson(JSON.parse(trimmed), depth + 1);
          } catch (_) {
            return val;
          }
        }
        return val;
      };

      // Native & Bridge Push Opened callbacks (Median/GoNative, Capacitor, Cordova, WKWebView, PWABuilder, iOS SDK)
      const handleNativePushOpened = (rawPayload: any) => {
        try {
          const parsed = parsePossibleJson(rawPayload);
          if (typeof parsed === 'string') {
            const trimmedUrl = parsed.trim();
            if (trimmedUrl) {
              this.emitNotificationClick({ launchUrl: trimmedUrl }, { url: trimmedUrl, launchUrl: trimmedUrl }, trimmedUrl);
            }
            return;
          }

          const payload = parsed && typeof parsed === 'object' ? parsed : {};
          const userInfo = parsePossibleJson(payload?.userInfo || payload?.notification?.userInfo || payload?.request?.content?.userInfo) || {};
          const notifObj = parsePossibleJson(payload?.notification || payload?.result?.notification) || payload;
          const nestedPayload = parsePossibleJson(notifObj?.payload || payload?.payload) || {};
          const rawOneSignalPayload = parsePossibleJson(notifObj?.rawPayload || payload?.rawPayload || userInfo?.rawPayload) || {};
          const customObj =
            parsePossibleJson(
              notifObj?.custom ||
              notifObj?.data?.custom ||
              payload?.custom ||
              payload?.data?.custom ||
              userInfo?.custom ||
              rawOneSignalPayload?.custom
            ) || {};

          const extractedData =
            parsePossibleJson(notifObj?.additionalData) ||
            parsePossibleJson(nestedPayload?.additionalData) ||
            parsePossibleJson(customObj?.a) ||
            parsePossibleJson(notifObj?.data) ||
            parsePossibleJson(payload?.additionalData) ||
            parsePossibleJson(payload?.data) ||
            (userInfo && typeof userInfo === 'object' && Object.keys(userInfo).length > 0 ? userInfo : null) ||
            payload ||
            {};
          const data = extractedData && typeof extractedData === 'object' ? extractedData : {};

          const launchUrl = String(
            notifObj?.launchURL ||
            notifObj?.launchUrl ||
            notifObj?.appUrl ||
            nestedPayload?.launchURL ||
            nestedPayload?.launchUrl ||
            nestedPayload?.appUrl ||
            payload?.launchURL ||
            payload?.launchUrl ||
            payload?.appUrl ||
            payload?.result?.url ||
            payload?.result?.action?.launchUrl ||
            payload?.result?.action?.launchURL ||
            payload?.url ||
            customObj?.u ||
            data?.launchURL ||
            data?.launchUrl ||
            data?.appUrl ||
            data?.url ||
            userInfo?.launchURL ||
            userInfo?.launchUrl ||
            userInfo?.appUrl ||
            userInfo?.url ||
            ''
          ).trim();

          const apsAlert = userInfo?.aps?.alert || payload?.aps?.alert;
          const normalizedNotif =
            notifObj && typeof notifObj === 'object'
              ? {
                  ...notifObj,
                  title: notifObj.title || (typeof apsAlert === 'object' ? apsAlert?.title : undefined),
                  body: notifObj.body || (typeof apsAlert === 'string' ? apsAlert : apsAlert?.body),
                }
              : notifObj;

          this.emitNotificationClick(normalizedNotif, data, launchUrl);
        } catch (err) {
          console.warn('[OneSignal] Native push click dispatch error:', err);
        }
      };

      // Native iOS Universal Link & Custom URL Scheme (mycityunlocked://) deep link handlers
      const handleAppDeepLink = (raw: any) => {
        const parsed = parsePossibleJson(raw);
        const incomingUrl =
          typeof parsed === 'string'
            ? parsed
            : (parsed?.url || parsed?.launchUrl || parsed?.launchURL || parsed?.appUrl || parsed?.detail?.url || '');
        if (!incomingUrl) return;
        this.emitNotificationClick({ launchUrl: incomingUrl }, { url: incomingUrl, launchUrl: incomingUrl }, incomingUrl);
      };

      windowAny.gonative_onesignal_push_opened = handleNativePushOpened;
      windowAny.median_onesignal_push_opened = handleNativePushOpened;
      windowAny.handleOneSignalNotificationOpened = handleNativePushOpened;
      windowAny.handleUniversalLink = handleAppDeepLink;
      windowAny.handleDeepLink = handleAppDeepLink;

      // Connect synchronous early queue from index.html
      windowAny.__mcuOneSignalDispatch = (kind: string, payload: any) => {
        if (kind === 'deeplink') {
          handleAppDeepLink(payload);
        } else {
          handleNativePushOpened(payload);
        }
      };

      if (Array.isArray(windowAny.__mcuEarlyPushQueue) && windowAny.__mcuEarlyPushQueue.length > 0) {
        const queued = windowAny.__mcuEarlyPushQueue.splice(0);
        queued.forEach((entry: any) => {
          if (entry && Date.now() - (entry.ts || 0) < 60000) {
            windowAny.__mcuOneSignalDispatch(entry.kind, entry.payload);
          }
        });
      }

      // Capacitor App plugin: warm appUrlOpen + cold start getLaunchUrl()
      try {
        const capApp = windowAny.Capacitor?.Plugins?.App;
        if (capApp?.addListener && !windowAny.__mcuCapAppBound) {
          windowAny.__mcuCapAppBound = true;
          capApp.addListener('appUrlOpen', (data: any) => {
            handleAppDeepLink(data);
          });
        }
        if (capApp?.getLaunchUrl) {
          Promise.resolve(capApp.getLaunchUrl()).then((res: any) => {
            if (res?.url) {
              handleAppDeepLink(res.url);
            }
          }).catch(() => {});
        }
      } catch (_) {}

      // Capacitor PushNotifications plugin listener (APNs action performed)
      const bindCapacitorPushAction = () => {
        try {
          const capPush = windowAny.Capacitor?.Plugins?.PushNotifications;
          if (capPush?.addListener && !windowAny.__mcuCapPushActionBound) {
            windowAny.__mcuCapPushActionBound = true;
            capPush.addListener('pushNotificationActionPerformed', (action: any) => {
              handleNativePushOpened(action);
            });
          }
        } catch (_) {}
      };
      bindCapacitorPushAction();

      // Eagerly attach native Cordova/Capacitor click listeners (and retry on deviceready & staged intervals)
      this.bindClickListeners();
      document.addEventListener('deviceready', () => {
        bindCapacitorPushAction();
        this.bindClickListeners();
      }, false);
      setTimeout(() => { bindCapacitorPushAction(); this.bindClickListeners(); }, 500);
      setTimeout(() => { bindCapacitorPushAction(); this.bindClickListeners(); }, 1500);
      setTimeout(() => { bindCapacitorPushAction(); this.bindClickListeners(); }, 3000);

      // Connect native iOS WKWebView push-permission-state listener (including any early event from index.html)
      windowAny.__mcuOnPushPermissionState = (detail: any) => {
        this.handleNativePermissionState(detail);
      };
      if (windowAny.__mcuLastPushPermissionState !== undefined) {
        this.handleNativePermissionState(windowAny.__mcuLastPushPermissionState);
      }
      const onPushPermissionStateEvent = (e: any) => {
        if (e && e.__mcuPushStateHandled) return;
        if (e) {
          try { e.__mcuPushStateHandled = true; } catch (_) {}
        }
        this.handleNativePermissionState(e && e.detail !== undefined ? e.detail : e);
      };
      window.addEventListener('push-permission-state', onPushPermissionStateEvent);
      document.addEventListener('push-permission-state', onPushPermissionStateEvent);
      window.addEventListener('push-permission-request', onPushPermissionStateEvent);
      document.addEventListener('push-permission-request', onPushPermissionStateEvent);

      try {
        windowAny.OneSignalDeferred = windowAny.OneSignalDeferred || [];
        windowAny.OneSignalDeferred.push((OS: any) => {
          this.attachClickListenerToSdk(OS);
        });
      } catch (_) {}
    }
  }

  private normalizeNativePermissionState(raw: any, depth = 0): NativePushPermissionState {
    if (raw === null || raw === undefined || depth > 3) return 'unknown';
    if (typeof raw === 'boolean') return raw ? 'granted' : 'denied';
    if (typeof raw === 'number') {
      // UNAuthorizationStatus raw values: 0=notDetermined, 1=denied, 2=authorized, 3=provisional, 4=ephemeral
      if (raw === 0) return 'default';
      if (raw === 1) return 'denied';
      if (raw === 2 || raw === 3 || raw === 4) return 'granted';
      return 'unknown';
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return 'unknown';
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed !== raw) {
            return this.normalizeNativePermissionState(parsed, depth + 1);
          }
        } catch (_) {}
      }
      const cleaned = trimmed.replace(/^['"]+|['"]+$/g, '').trim().toLowerCase();
      if (
        cleaned === 'granted' ||
        cleaned === 'authorized' ||
        cleaned === 'provisional' ||
        cleaned === 'ephemeral' ||
        cleaned === 'allow' ||
        cleaned === 'allowed' ||
        cleaned === 'true'
      ) {
        return 'granted';
      }
      if (
        cleaned === 'denied' ||
        cleaned === 'declined' ||
        cleaned === 'rejected' ||
        cleaned === 'false'
      ) {
        return 'denied';
      }
      if (
        cleaned === 'default' ||
        cleaned === 'notdetermined' ||
        cleaned === 'not_determined' ||
        cleaned === 'not-determined' ||
        cleaned === 'undetermined' ||
        cleaned === 'prompt'
      ) {
        return 'default';
      }
      return 'unknown';
    }
    if (typeof raw === 'object') {
      const candidate =
        raw.state ??
        raw.status ??
        raw.permission ??
        raw.authorizationStatus ??
        raw.granted ??
        raw.authorized ??
        raw.detail;
      if (candidate !== undefined) {
        return this.normalizeNativePermissionState(candidate, depth + 1);
      }
    }
    return 'unknown';
  }

  private handleNativePermissionState(rawDetail: any): void {
    this.nativeRawPermissionDetail = rawDetail;
    const normalized = this.normalizeNativePermissionState(rawDetail);
    this.addDiag(
      'permission',
      normalized === 'granted' ? 'ok' : normalized === 'denied' ? 'warn' : 'info',
      `Native push permission event received -> "${normalized}"`,
      { raw: rawDetail }
    );
    if (normalized === 'unknown') return;
    this.nativePushPermissionState = normalized;
    if (this.nativePermissionWaiters.size > 0) {
      const waiters = Array.from(this.nativePermissionWaiters);
      this.nativePermissionWaiters.clear();
      waiters.forEach((resolve) => {
        try { resolve(normalized); } catch (_) {}
      });
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('onesignal:permission-state-changed', {
            detail: { state: normalized, raw: rawDetail }
          })
        );
      } catch (_) {}
    }

    // When iOS permission becomes granted, ask Xcode for the Subscription ID / APNs token
    // and re-sync the Supabase user ID after APNs has a moment to register.
    if (normalized === 'granted') {
      this.requestNativeSubscriptionState();
      if (this.currentUserId) {
        const uid = this.currentUserId;
        this.loginUser(uid).catch(() => {});
        setTimeout(() => {
          this.requestNativeSubscriptionState();
          if (this.currentUserId === uid) {
            this.loginUser(uid).catch(() => {});
          }
        }, 1800);
      }
    }
  }

  private waitForNativePermissionState(timeoutMs: number): Promise<NativePushPermissionState> {
    return new Promise<NativePushPermissionState>((resolve) => {
      let settled = false;
      const onState = (state: NativePushPermissionState) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.nativePermissionWaiters.delete(onState);
        resolve(state);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.nativePermissionWaiters.delete(onState);
        resolve(this.nativePushPermissionState);
      }, timeoutMs);
      this.nativePermissionWaiters.add(onState);
    });
  }

  getCachedNativePushPermissionState(): NativePushPermissionState {
    return this.nativePushPermissionState;
  }

  getRegisteredWebKitHandlers(): string[] {
    if (typeof window === 'undefined') return [];
    const handlers = (window as any).webkit?.messageHandlers;
    if (!handlers || typeof handlers !== 'object') return [];
    try {
      const own = Object.keys(handlers);
      if (own.length > 0) return own;
      // WKWebView messageHandlers proxy sometimes hides keys from Object.keys; probe known handler names
      const known = [
        'push-permission-request',
        'push-permission-state',
        'push-subscribe',
        'push-token',
        'push-notification-token',
        'onesignal-login',
        'oneSignalLogin',
        'onesignalLogin',
        'onesignal-state',
        'oneSignalState',
        'oneSignalGetState',
        'oneSignal',
        'setExternalUserId',
        'setExternalId',
        'push-login',
        'login',
        'setUser',
        'faceIdSettings',
        'print',
        'iOS'
      ];
      return known.filter((name) => handlers[name] && typeof handlers[name].postMessage === 'function');
    } catch (_) {
      return [];
    }
  }

  requestNativeSubscriptionState(): string[] {
    if (typeof window === 'undefined') return [];
    const handlers = (window as any).webkit?.messageHandlers;
    if (!handlers) return [];
    const candidates = [
      'onesignal-state',
      'oneSignalState',
      'oneSignalGetState',
      'push-subscription-state',
      'push-token',
      'push-subscribe'
    ];
    const invoked: string[] = [];
    for (const name of candidates) {
      if (handlers[name] && typeof handlers[name].postMessage === 'function') {
        try {
          handlers[name].postMessage(name);
          invoked.push(name);
        } catch (_) {
          try {
            handlers[name].postMessage({});
            invoked.push(name);
          } catch (_) {}
        }
      }
    }
    if (invoked.length > 0) {
      this.addDiag('bridge', 'info', `Requested native OneSignal state/token via [${invoked.join(', ')}]`);
    }
    return invoked;
  }

  async queryNativePushPermissionState(timeoutMs = 1500): Promise<NativePushPermissionState> {
    if (typeof window === 'undefined') return 'unknown';
    const windowAny = window as any;
    const stateHandler = windowAny.webkit?.messageHandlers?.['push-permission-state'];
    if (stateHandler && typeof stateHandler.postMessage === 'function') {
      const waiter = this.waitForNativePermissionState(timeoutMs);
      try {
        stateHandler.postMessage('push-permission-state');
      } catch (_) {
        try { stateHandler.postMessage({}); } catch (_) {}
      }
      return await waiter;
    }
    return this.nativePushPermissionState;
  }

  private async requestNativeIOSPushPermission(
    timeoutMs = 25000
  ): Promise<{ handled: boolean; state: NativePushPermissionState }> {
    if (typeof window === 'undefined') {
      return { handled: false, state: 'unknown' };
    }
    const windowAny = window as any;
    const reqHandler = windowAny.webkit?.messageHandlers?.['push-permission-request'];
    if (!reqHandler || typeof reqHandler.postMessage !== 'function') {
      this.addDiag('permission', 'warn', 'iOS WKWebView bridge handler "push-permission-request" not found.');
      return { handled: false, state: this.nativePushPermissionState };
    }

    this.addDiag('permission', 'info', 'Posting "push-permission-request" to native iOS WKWebView bridge.');
    const statePromise = this.waitForNativePermissionState(timeoutMs);
    try {
      reqHandler.postMessage('push-permission-request');
    } catch (_) {
      try {
        reqHandler.postMessage({});
      } catch (err) {
        this.addDiag('permission', 'error', 'push-permission-request postMessage failed.', String(err));
        return { handled: false, state: this.nativePushPermissionState };
      }
    }

    const state = await statePromise;
    this.addDiag(
      'permission',
      state === 'granted' ? 'ok' : 'warn',
      `Native push-permission-request resolved with state "${state}".`
    );
    return { handled: true, state };
  }

  private emitNotificationClick(notification: any, data: any, launchUrl: string): void {
    const detail = { notification, data: data || {}, launchUrl: launchUrl || '' };
    this.pendingNotificationClick = { ...detail, ts: Date.now() };
    try {
      sessionStorage.setItem('__mcu_pending_push_click', JSON.stringify({ data: detail.data, launchUrl: detail.launchUrl, ts: Date.now() }));
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('onesignal:notification-clicked', { detail }));
    }
  }

  consumePendingNotificationClick(): { notification: any; data: any; launchUrl: string; ts: number } | null {
    let pending = this.pendingNotificationClick;
    this.pendingNotificationClick = null;
    if (!pending && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('__mcu_pending_push_click');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.ts === 'number') {
            pending = { notification: { launchUrl: parsed.launchUrl }, data: parsed.data || {}, launchUrl: parsed.launchUrl || '', ts: parsed.ts };
          }
        }
      } catch (_) {}
    }
    try {
      sessionStorage.removeItem('__mcu_pending_push_click');
    } catch (_) {}
    if (!pending) return null;
    // Ignore stale clicks older than 60 seconds
    if (Date.now() - pending.ts > 60000) return null;
    return pending;
  }

  private createNotifClickHandler() {
    return (event: any) => {
      try {
        const notif = event?.notification || event?.result?.notification || event;
        const nestedPayload = notif?.payload || {};
        const data =
          notif?.additionalData ||
          nestedPayload?.additionalData ||
          notif?.data?.custom?.a ||
          notif?.data ||
          event?.data ||
          notif?.rawPayload?.custom?.a ||
          {};
        const launchUrl =
          notif?.launchURL ||
          notif?.launchUrl ||
          notif?.appUrl ||
          nestedPayload?.launchURL ||
          nestedPayload?.launchUrl ||
          nestedPayload?.appUrl ||
          event?.result?.url ||
          event?.result?.action?.launchUrl ||
          event?.result?.action?.launchURL ||
          notif?.data?.custom?.u ||
          data?.launchURL ||
          data?.launchUrl ||
          data?.appUrl ||
          data?.url ||
          '';
        this.emitNotificationClick(notif, data, launchUrl);
      } catch (clickErr) {
        console.warn('[OneSignal] Notification click handler error:', clickErr);
      }
    };
  }

  private attachClickListenerToSdk(sdk: any): void {
    if (this.clickListenerBound || !sdk?.Notifications?.addEventListener) return;
    try {
      sdk.Notifications.addEventListener('click', this.createNotifClickHandler());
      this.clickListenerBound = true;
    } catch (err) {
      console.warn('[OneSignal] Could not bind Web SDK click event:', err);
    }
  }

  private bindClickListeners(): void {
    if (typeof window === 'undefined') return;
    const windowAny = window as any;
    const windowOS = windowAny.OneSignal;
    const notifHandler = this.createNotifClickHandler();

    if (!this.clickListenerBound) {
      if (OneSignal?.Notifications?.addEventListener) {
        this.attachClickListenerToSdk(OneSignal);
      } else if (windowOS?.Notifications?.addEventListener) {
        this.attachClickListenerToSdk(windowOS);
      }
    }

    try {
      if (!windowAny.__mcuNativePushListenerBound) {
        if (windowAny.Capacitor?.Plugins?.OneSignal?.Notifications?.addEventListener) {
          windowAny.Capacitor.Plugins.OneSignal.Notifications.addEventListener('click', notifHandler);
          windowAny.__mcuNativePushListenerBound = true;
        } else if (windowAny.Capacitor?.Plugins?.OneSignalPlugin?.Notifications?.addEventListener) {
          windowAny.Capacitor.Plugins.OneSignalPlugin.Notifications.addEventListener('click', notifHandler);
          windowAny.__mcuNativePushListenerBound = true;
        } else if (windowAny.OneSignalPlugin?.Notifications?.addEventListener) {
          windowAny.OneSignalPlugin.Notifications.addEventListener('click', notifHandler);
          windowAny.__mcuNativePushListenerBound = true;
        } else if (windowAny.plugins?.OneSignal?.Notifications?.addEventListener) {
          windowAny.plugins.OneSignal.Notifications.addEventListener('click', notifHandler);
          windowAny.__mcuNativePushListenerBound = true;
        } else if (windowAny.plugins?.OneSignal?.setNotificationOpenedHandler) {
          windowAny.plugins.OneSignal.setNotificationOpenedHandler(notifHandler);
          windowAny.__mcuNativePushListenerBound = true;
        }
      }
    } catch (_) {}
  }

  /**
   * Handle incoming native device push token / subscription ID from iOS / Android wrappers
   */
  async handleNativeSubscriptionReceived(id: string): Promise<void> {
    if (!id) return;
    const cleanId = id.trim();
    if (!cleanId || cleanId.startsWith('local-')) return;
    this.nativeSubscriptionId = cleanId;
    this.addDiag('subscription', 'ok', 'Native OneSignal Subscription ID received.', { subscriptionId: cleanId });
    this.notifyObservers(cleanId);

    const dev = this.getDeviceInfo();
    const nativeTags: Record<string, string> = {
      platform: dev.isIOS ? 'ios' : dev.isAndroid ? 'android' : 'mobile',
      is_mobile: 'true',
      app_channel: dev.isIOS ? 'pushApp_ios' : 'pushApp_android',
      is_standalone: 'true'
    };

    // Apply tags to native wrapper (and Web SDK only when NOT in iOS WKWebView)
    try {
      const windowAny = typeof window !== 'undefined' ? (window as any) : null;
      if (!dev.isIOSWebView && !dev.hasIOSPushBridge) {
        if (OneSignal?.User?.addTags) {
          await OneSignal.User.addTags(nativeTags);
        } else if (windowAny?.OneSignal?.sendTags) {
          await windowAny.OneSignal.sendTags(nativeTags);
        }
      }
      if (windowAny?.webkit?.messageHandlers?.oneSignal) {
        windowAny.webkit.messageHandlers.oneSignal.postMessage({ action: 'setTags', tags: nativeTags });
      }
    } catch (e) {
      console.warn('[OneSignal] Tagging native subscription warning:', e);
    }

    // If an authenticated user is known, link external ID (native + server REST API) & persist to Supabase
    try {
      let uid = this.currentUserId;
      if (!uid && isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        uid = sessionData?.session?.user?.id || null;
      }
      if (uid) {
        await this.loginUser(uid, nativeTags);
        await this.linkDeviceOnServer(uid, cleanId);
      } else {
        this.addDiag('login', 'warn', 'Subscription ID received before Supabase session was ready — will auto-link once user logs in.', {
          subscriptionId: cleanId
        });
      }
    } catch (err) {
      this.addDiag('login', 'warn', 'Error linking native subscription to Supabase/OneSignal.', String(err));
    }
  }

  /**
   * Server-side fallback: link a known Subscription ID to the user's Supabase external_id in OneSignal
   */
  async linkDeviceOnServer(userId: string, subscriptionId: string): Promise<boolean> {
    if (!userId || !subscriptionId || !this.isRealServerAssignedId(subscriptionId)) return false;
    try {
      const res = await fetch('/api/onesignal-link-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playerId: subscriptionId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        this.lastServerLinkResult = {
          ok: true,
          userId,
          subscriptionId,
          apiVersion: data.apiVersion,
          ts: new Date().toISOString()
        };
        this.addDiag('server', 'ok', `Linked Subscription ID to external_id on OneSignal server (${data.apiVersion || 'api'}).`, {
          userId,
          subscriptionId
        });
        return true;
      }
      this.lastServerLinkResult = {
        ok: false,
        userId,
        subscriptionId,
        error: typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error || `HTTP ${res.status}`),
        ts: new Date().toISOString()
      };
      this.addDiag('server', 'warn', 'Server-side OneSignal link returned error.', this.lastServerLinkResult);
      return false;
    } catch (err: any) {
      this.lastServerLinkResult = {
        ok: false,
        userId,
        subscriptionId,
        error: err?.message || 'Network error',
        ts: new Date().toISOString()
      };
      this.addDiag('server', 'error', 'Server-side OneSignal link network error.', this.lastServerLinkResult);
      return false;
    }
  }

  /**
   * Device and platform detection for App Store / Play Store
   */
  getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isIOS: false,
        isAndroid: false,
        isStandalone: false,
        isNativeWrapper: false,
        isIOSWebView: false,
        hasIOSPushBridge: false,
        platform: 'web'
      };
    }
    const windowAny = window as any;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid || /Mobi|Tablet/.test(ua);
    const isAndroidTWA = document.referrer.includes('android-app://');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      isAndroidTWA;

    const hasWebKitHandlers = !!windowAny.webkit?.messageHandlers;
    const hasIOSPushBridge = !!(
      windowAny.webkit?.messageHandlers?.['push-permission-request'] &&
      typeof windowAny.webkit.messageHandlers['push-permission-request'].postMessage === 'function'
    );
    const isIOSWebView = !!(
      isIOS && (
        hasWebKitHandlers ||
        hasIOSPushBridge ||
        windowAny.Capacitor ||
        windowAny.OneSignalPlugin ||
        windowAny.plugins?.OneSignal ||
        ua.includes('WKWebView') ||
        (!/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) && (window.navigator as any).standalone !== true)
      )
    );

    const isNativeWrapper = !!(
      isIOSWebView ||
      hasWebKitHandlers ||
      windowAny.Capacitor ||
      windowAny.OneSignalPlugin ||
      windowAny.plugins?.OneSignal ||
      ua.includes('WKWebView') ||
      isAndroidTWA
    );

    const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';

    return {
      isMobile,
      isIOS,
      isAndroid,
      isStandalone,
      isNativeWrapper,
      isIOSWebView,
      hasIOSPushBridge,
      platform
    };
  }

  /**
   * Fetch OneSignal configuration securely from the backend server
   */
  async fetchServerConfig(): Promise<any> {
    try {
      const res = await fetch('/api/onesignal-config');
      if (res.ok) {
        const data = await res.json();
        if (data.appId) {
          this.currentAppId = data.appId;
        }
        return data;
      }
    } catch (err) {
      console.warn('[OneSignal] Could not fetch config from server proxy:', err);
    }
    return {
      appId: this.getAppId(),
      hasServerApiKey: false,
      keyStatus: 'missing'
    };
  }

  /**
   * Save OneSignal configuration to backend server
   */
  async saveServerConfig(appId?: string, restApiKey?: string): Promise<any> {
    const res = await fetch('/api/onesignal-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, restApiKey })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erreur lors de la sauvegarde de la configuration OneSignal.');
    }
    if (appId) {
      this.setAppId(appId);
    }
    return data;
  }

  /**
   * Fetch OneSignal App ID securely from the backend server
   */
  async fetchAppIdFromServer(): Promise<string> {
    const config = await this.fetchServerConfig();
    return config?.appId || this.getAppId();
  }

  /**
   * Get the active OneSignal App ID
   */
  getAppId(): string {
    if (this.currentAppId) return this.currentAppId;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('onesignal_app_id') : null;
    if (stored) {
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
    if (this.nativeSubscriptionId) return this.nativeSubscriptionId;
    try {
      return OneSignal.User?.PushSubscription?.id || (window as any).OneSignal?.User?.PushSubscription?.id || null;
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
    const hostname = window.location.hostname || '';
    return !hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('mycityunlocked.app') || hostname.includes('run.app') || hostname.includes('web.app') || hostname.includes('capacitor') || hostname.includes('ionic');
  }

  /**
   * Initialize OneSignal SDK (Native bridge on iOS WKWebView, Web SDK v16 on browsers/PWA)
   */
  async init(userId?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const dev = this.getDeviceInfo();
    // Fetch App ID securely from backend server
    const appId = await this.fetchAppIdFromServer();

    if (!appId) {
      this.addDiag('init', 'error', 'No OneSignal App ID configured.');
      return false;
    }

    // Native iOS WKWebView (TestFlight / App Store): NEVER initialize the OneSignal Web SDK.
    // Push registration & APNs tokens MUST come from the native iOS OneSignal SDK in Xcode.
    if (dev.isIOSWebView || dev.hasIOSPushBridge) {
      const registeredHandlers = this.getRegisteredWebKitHandlers();
      this.isInitialized = true;
      this.bindClickListeners();
      this.addDiag('init', 'ok', 'iOS WKWebView mode active (Web SDK skipped; using native Xcode bridge).', {
        appId,
        host: window.location.hostname,
        registeredHandlers,
        cachedPermission: this.nativePushPermissionState,
        nativeSubscriptionId: this.nativeSubscriptionId
      });

      this.queryNativePushPermissionState(1200).catch(() => {});
      this.requestNativeSubscriptionState();

      if (userId) {
        await this.loginUser(userId);
      }
      return true;
    }

    // Guard against OneSignal domain restriction on dev / preview domains
    if (!this.isOriginAllowedForAppId(appId)) {
      this.addDiag('init', 'info', `Skipping Web SDK init: default App ID is bound to mycityunlocked.app (host: ${window.location.hostname})`);
      return false;
    }

    const windowOneSignal = typeof window !== 'undefined' ? (window as any).OneSignal : null;
    const isAlreadyInitialized = this.isInitialized || !!(windowOneSignal?._isInitialized || windowOneSignal?.User?.PushSubscription);

    if (isAlreadyInitialized) {
      this.isInitialized = true;
      this.bindClickListeners();
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

      this.bindClickListeners();

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
        this.bindClickListeners();
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
    const dev = this.getDeviceInfo();
    if (dev.isIOSWebView || dev.hasIOSPushBridge) {
      if (this.nativeSubscriptionId) return true;
      if (this.nativePushPermissionState === 'granted') return true;
      if (this.nativePushPermissionState === 'denied') return false;
      const state = await this.queryNativePushPermissionState(1200);
      return state === 'granted';
    }

    const subId = await this.getSubscriptionId();
    if (subId) return true;

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
    if (this.nativeSubscriptionId) return this.nativeSubscriptionId;

    try {
      const windowAny = window as any;
      const windowOS = windowAny.OneSignal;

      const medianId = windowAny.median?.onesignal?.playerId || windowAny.gonative?.onesignal?.playerId;
      if (medianId && typeof medianId === 'string') {
        this.nativeSubscriptionId = medianId;
        return medianId;
      }

      const globalId = windowAny.OneSignalUserId || windowAny.OneSignalPlayerId || windowAny.OneSignalSubscriptionId;
      if (globalId && typeof globalId === 'string' && !globalId.startsWith('local-')) {
        this.nativeSubscriptionId = globalId;
        return globalId;
      }

      const webSubId = OneSignal.User?.PushSubscription?.id || windowOS?.User?.PushSubscription?.id;
      if (webSubId) {
        return webSubId;
      }

      const stored = localStorage.getItem('onesignal_subscription_id') || localStorage.getItem('onesignal_player_id');
      if (stored && typeof stored === 'string' && !stored.startsWith('local-')) {
        return stored;
      }

      if (!this.isInitialized) {
        await this.init();
        const postInitId = OneSignal.User?.PushSubscription?.id || (window as any).OneSignal?.User?.PushSubscription?.id;
        if (postInitId) {
          return postInitId;
        }
      }

      return null;
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
    if (typeof window === 'undefined') return false;

    const windowAny = window as any;
    const dev = this.getDeviceInfo();

    // 1. Native iOS WKWebView path (Xcode / PWABuilder):
    // Strictly use native message handlers (push-permission-request + push-permission-state)
    // and NEVER fall through to Notification.requestPermission() or the OneSignal Web SDK.
    if (dev.isIOSWebView || dev.hasIOSPushBridge) {
      try {
        const bridgeResult = await this.requestNativeIOSPushPermission();
        if (bridgeResult.handled) {
          if (bridgeResult.state === 'granted') {
            if (userId) {
              await this.loginUser(userId);
            }
            return true;
          }
          return false;
        }

        // Fallback for non-PWABuilder native iOS wrappers (Capacitor / Cordova / custom WKWebView)
        let nativeHandled = false;
        if (windowAny.Capacitor?.Plugins?.PushNotifications) {
          const permRes = await windowAny.Capacitor.Plugins.PushNotifications.requestPermissions();
          if (permRes.receive === 'granted') {
            await windowAny.Capacitor.Plugins.PushNotifications.register();
            nativeHandled = true;
          }
        } else if (windowAny.OneSignalPlugin?.promptForPushNotifications) {
          windowAny.OneSignalPlugin.promptForPushNotifications();
          nativeHandled = true;
        } else if (windowAny.plugins?.OneSignal?.promptForPushNotificationsWithUserResponse) {
          windowAny.plugins.OneSignal.promptForPushNotificationsWithUserResponse();
          nativeHandled = true;
        } else if (windowAny.webkit?.messageHandlers) {
          const handlers = windowAny.webkit.messageHandlers;
          const legacyHandlers = [
            'requestNotificationPermission',
            'requestPushPermission',
            'registerForPush',
            'promptForPush',
            'oneSignalPrompt',
            'oneSignal',
            'pushNotification',
            'push',
            'nativeApp',
            'ios'
          ];
          for (const h of legacyHandlers) {
            if (handlers[h] && typeof handlers[h].postMessage === 'function') {
              try {
                handlers[h].postMessage({ action: 'subscribe', userId });
                nativeHandled = true;
              } catch (_) {
                try { handlers[h].postMessage({}); nativeHandled = true; } catch (_) {}
              }
            }
          }
        }

        if (nativeHandled && userId) {
          await this.loginUser(userId);
        }
        return nativeHandled;
      } catch (e) {
        console.warn('[OneSignal] Native iOS WKWebView permission error:', e);
        return false;
      }
    }

    // 2. Non-iOS Native Wrappers (e.g. Android Capacitor / Cordova)
    try {
      let nativeHandled = false;

      if (windowAny.Capacitor?.Plugins?.PushNotifications) {
        const permRes = await windowAny.Capacitor.Plugins.PushNotifications.requestPermissions();
        if (permRes.receive === 'granted') {
          await windowAny.Capacitor.Plugins.PushNotifications.register();
          nativeHandled = true;
        }
      }

      if (windowAny.OneSignalPlugin?.promptForPushNotifications) {
        windowAny.OneSignalPlugin.promptForPushNotifications();
        nativeHandled = true;
      } else if (windowAny.plugins?.OneSignal?.promptForPushNotificationsWithUserResponse) {
        windowAny.plugins.OneSignal.promptForPushNotificationsWithUserResponse();
        nativeHandled = true;
      }

      if (nativeHandled) {
        if (userId) {
          await this.loginUser(userId);
        }
        return true;
      }
    } catch (e) {
      console.warn('[OneSignal] Native permission attempt:', e);
    }

    // 3. Browser / Web Push check (non-WKWebView)
    if (!('Notification' in window)) {
      console.info('[OneSignal] Push notifications not supported in this browser.');
      return false;
    }

    // 3. Permission already denied in browser settings
    if (Notification.permission === 'denied') {
      console.info('[OneSignal] Notification permission is currently denied.');
      return false;
    }

    // 4. REQUEST PERMISSION IMMEDIATELY (native system prompt)
    let currentPerm: NotificationPermission = Notification.permission;

    if (currentPerm !== 'granted') {
      try {
        const windowOS = windowAny.OneSignal;
        if (windowOS?.Notifications?.requestPermission) {
          await windowOS.Notifications.requestPermission();
          currentPerm = Notification.permission;
        }
      } catch (_) {}

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

    // Sync subscription ID to Supabase (merging with existing device IDs so multiple devices per user are preserved)
    if (subId && userId && isSupabaseConfigured) {
      await this.persistUserSubscriptionId(userId, subId);
    }

    return true;
  }

  /**
   * Append/merge a device Subscription ID into profiles.onesignal_player_id without overwriting other devices
   */
  private async persistUserSubscriptionId(userId: string, newSubId: string): Promise<void> {
    if (!userId || !newSubId || !this.isRealServerAssignedId(newSubId) || !isSupabaseConfigured) return;
    try {
      const cleanNew = newSubId.trim();
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('onesignal_player_id')
        .eq('id', userId)
        .maybeSingle();

      const existingRaw = (existingProfile as any)?.onesignal_player_id || '';
      const existingList = String(existingRaw)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.startsWith('local-'));

      // Put the newest active device ID first, keeping up to 6 unique devices per user
      const merged = [cleanNew, ...existingList.filter((id: string) => id !== cleanNew)].slice(0, 6).join(',');

      if (merged !== existingRaw) {
        await supabase.from('profiles').update({
          onesignal_player_id: merged,
          updated_at: new Date().toISOString()
        } as any).eq('id', userId);
      }
    } catch (_) {
      // Column might not exist yet, safe fallback
    }
  }

  /**
   * Run full diagnostics on the current Push & OneSignal environment (iOS WKWebView & Web)
   */
  async getDiagnostics() {
    const isBrowser = typeof window !== 'undefined';
    const dev = this.getDeviceInfo();
    const isIOSNative = dev.isIOSWebView || dev.hasIOSPushBridge;
    const hasNotification = isBrowser && 'Notification' in window;
    const hasServiceWorker = isBrowser && 'serviceWorker' in navigator;
    const hasPushManager = isBrowser && 'PushManager' in window;
    const permission = isIOSNative
      ? (this.nativePushPermissionState !== 'unknown' ? this.nativePushPermissionState : 'default')
      : hasNotification
        ? Notification.permission
        : dev.isNativeWrapper
          ? 'granted'
          : 'unsupported';
    const isSupported = (hasNotification && hasServiceWorker && hasPushManager) || dev.isNativeWrapper || dev.hasIOSPushBridge;
    const appId = this.getAppId();
    const isInit = this.isInitialized;
    const subscriptionId = await this.getSubscriptionId();
    const isSub = await this.isSubscribed();

    let activeWorkerUrl: string | null = null;
    if (hasServiceWorker && !isIOSNative) {
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

  getDiagnosticLogs(): OneSignalDiagnosticLog[] {
    return [...this.diagnosticLogs];
  }

  async getFullDiagnostics(userId?: string) {
    const base = await this.getDiagnostics();
    const dev = this.getDeviceInfo();
    const registeredHandlers = this.getRegisteredWebKitHandlers();
    const effectiveUserId = userId || this.currentUserId || this.lastLoginAttemptUserId;

    let supabaseSavedPlayerId: string | null = null;
    if (effectiveUserId && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('onesignal_player_id')
          .eq('id', effectiveUserId)
          .maybeSingle();
        supabaseSavedPlayerId = (data as any)?.onesignal_player_id || null;
      } catch (_) {}
    }

    const hasNativeLoginHandler = registeredHandlers.some((h) =>
      [
        'oneSignalLogin',
        'onesignalLogin',
        'onesignal-login',
        'oneSignal-login',
        'push-login',
        'setExternalUserId',
        'setExternalId',
        'external-id',
        'login',
        'oneSignal',
        'setUser'
      ].includes(h)
    );

    return {
      ...base,
      environment: dev.isIOSWebView || dev.hasIOSPushBridge
        ? 'ios-wkwebview'
        : dev.isNativeWrapper
          ? 'native-wrapper'
          : 'web',
      deviceInfo: dev,
      host: typeof window !== 'undefined' ? window.location.hostname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      registeredWebKitHandlers: registeredHandlers,
      hasNativeLoginHandler,
      nativeSdkInitialized: this.nativeSdkInitialized,
      nativePushPermissionState: this.nativePushPermissionState,
      nativeRawPermissionDetail: this.nativeRawPermissionDetail,
      nativeSubscriptionId: this.nativeSubscriptionId,
      nativePushTokenPreview: this.nativePushToken
        ? `${this.nativePushToken.slice(0, 10)}…${this.nativePushToken.slice(-6)}`
        : null,
      nativeOptedIn: this.nativeOptedIn,
      nativeExternalId: this.nativeExternalId,
      currentUserId: effectiveUserId,
      lastLoginHandlersCalled: [...this.lastLoginHandlersCalled],
      lastServerLinkResult: this.lastServerLinkResult,
      supabaseSavedPlayerId,
      logs: this.getDiagnosticLogs()
    };
  }

  async fetchServerUserStatus(userId: string): Promise<any> {
    if (!userId) return null;
    const res = await fetch(`/api/onesignal-user-status?userId=${encodeURIComponent(userId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    this.addDiag(
      'server',
      data.hasPushSubscribedIOS ? 'ok' : 'warn',
      data.hasPushSubscribedIOS
        ? 'OneSignal server confirms Push Subscribed iOS device for this user.'
        : `OneSignal server check: userFound=${data.userFound}, linkedSubs=${(data.subscriptions || []).length}, recentAnonymousIOS=${(data.recentAnonymousIOS || []).length}.`,
      {
        userFound: data.userFound,
        onesignalId: data.onesignalId,
        hasPushSubscribedIOS: data.hasPushSubscribedIOS,
        recentAnonymousIOSCount: (data.recentAnonymousIOS || []).length
      }
    );
    return data;
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
   * Associate Supabase User ID with OneSignal User (Sets External ID in OneSignal)
   */
  async loginUser(userId: string, tags?: Record<string, string>): Promise<void> {
    if (!userId || typeof userId !== 'string' || !userId.trim()) return;
    const cleanUserId = userId.trim();
    this.currentUserId = cleanUserId;
    this.lastLoginAttemptUserId = cleanUserId;

    const dev = this.getDeviceInfo();
    const isIOSNative = dev.isIOSWebView || dev.hasIOSPushBridge;
    const combinedTags: Record<string, string> = {
      platform: dev.platform,
      is_mobile: dev.isMobile ? 'true' : 'false',
      is_standalone: dev.isStandalone ? 'true' : 'false',
      ...(tags || {})
    };

    const windowAny = typeof window !== 'undefined' ? (window as any) : null;
    const invokedNativeHandlers: string[] = [];

    // 1. Forward to native iOS WKWebView if running inside an Xcode Swift / Obj-C wrapper
    if (windowAny) {
      try {
        const handlers = windowAny.webkit?.messageHandlers;
        if (handlers) {
          const stringHandlers = [
            'oneSignalLogin',
            'onesignalLogin',
            'onesignal-login',
            'oneSignal-login',
            'push-login',
            'setExternalUserId',
            'setExternalId',
            'external-id',
            'login'
          ];
          for (const hName of stringHandlers) {
            if (handlers[hName] && typeof handlers[hName].postMessage === 'function') {
              handlers[hName].postMessage(cleanUserId);
              invokedNativeHandlers.push(hName);
            }
          }
          if (handlers.oneSignal && typeof handlers.oneSignal.postMessage === 'function') {
            handlers.oneSignal.postMessage({ action: 'login', userId: cleanUserId, tags: combinedTags });
            invokedNativeHandlers.push('oneSignal');
          }
          if (handlers.setUser && typeof handlers.setUser.postMessage === 'function') {
            handlers.setUser.postMessage({ id: cleanUserId });
            invokedNativeHandlers.push('setUser');
          }
        }
      } catch (e) {
        this.addDiag('login', 'error', 'Native iOS WKWebView login postMessage failed.', String(e));
      }

      // 2. Median.co (GoNative) native bridge for iOS & Android
      try {
        if (windowAny.median?.onesignal?.login) {
          windowAny.median.onesignal.login(cleanUserId);
          invokedNativeHandlers.push('median.onesignal.login');
        } else if (windowAny.median?.onesignal?.externalUserId?.set) {
          windowAny.median.onesignal.externalUserId.set({ externalId: cleanUserId });
          invokedNativeHandlers.push('median.onesignal.externalUserId.set');
        }
        if (windowAny.median?.onesignal?.tags?.set) {
          windowAny.median.onesignal.tags.set({ tags: combinedTags });
        }
        if (windowAny.gonative?.onesignal?.login) {
          windowAny.gonative.onesignal.login(cleanUserId);
          invokedNativeHandlers.push('gonative.onesignal.login');
        } else if (windowAny.gonative?.onesignal?.externalUserId?.set) {
          windowAny.gonative.onesignal.externalUserId.set({ externalId: cleanUserId });
          invokedNativeHandlers.push('gonative.onesignal.externalUserId.set');
        }
        if (windowAny.gonative?.onesignal?.tags?.set) {
          windowAny.gonative.onesignal.tags.set({ tags: combinedTags });
        }
      } catch (medErr) {
        console.warn('[OneSignal] Median/GoNative bridge login warning:', medErr);
      }

      // 3. Capacitor / Cordova native plugins
      try {
        if (windowAny.OneSignalPlugin?.login) {
          await windowAny.OneSignalPlugin.login(cleanUserId);
          invokedNativeHandlers.push('OneSignalPlugin.login');
        } else if (windowAny.OneSignalPlugin?.setExternalUserId) {
          await windowAny.OneSignalPlugin.setExternalUserId(cleanUserId);
          invokedNativeHandlers.push('OneSignalPlugin.setExternalUserId');
        }
        if (windowAny.Capacitor?.Plugins?.OneSignal?.login) {
          await windowAny.Capacitor.Plugins.OneSignal.login(cleanUserId);
          invokedNativeHandlers.push('Capacitor.OneSignal.login');
        } else if (windowAny.Capacitor?.Plugins?.OneSignalPlugin?.login) {
          await windowAny.Capacitor.Plugins.OneSignalPlugin.login(cleanUserId);
          invokedNativeHandlers.push('Capacitor.OneSignalPlugin.login');
        }
        if (windowAny.plugins?.OneSignal?.login) {
          await windowAny.plugins.OneSignal.login(cleanUserId);
          invokedNativeHandlers.push('plugins.OneSignal.login');
        } else if (windowAny.plugins?.OneSignal?.setExternalUserId) {
          await windowAny.plugins.OneSignal.setExternalUserId(cleanUserId);
          invokedNativeHandlers.push('plugins.OneSignal.setExternalUserId');
        }
      } catch (capErr) {
        console.warn('[OneSignal] Capacitor plugin login error:', capErr);
      }
    }

    this.lastLoginHandlersCalled = invokedNativeHandlers;

    // On iOS WKWebView, NEVER fall through to the Web SDK (it cannot bind an APNs iOS subscription).
    if (isIOSNative) {
      if (invokedNativeHandlers.length > 0) {
        this.addDiag('login', 'ok', `Forwarded external_id to native iOS bridge via [${invokedNativeHandlers.join(', ')}].`, {
          userId: cleanUserId
        });
      } else {
        const available = this.getRegisteredWebKitHandlers();
        this.addDiag(
          'login',
          'warn',
          'No native OneSignal login handler found in WKWebView! Xcode must register "onesignal-login" (or "oneSignalLogin") to call OneSignal.login(userId).',
          { userId: cleanUserId, availableHandlers: available }
        );
      }

      // Also ask Xcode for current Subscription ID / state if supported
      this.requestNativeSubscriptionState();

      // If we already have a native Subscription ID, persist to Supabase & link directly via backend API
      if (this.nativeSubscriptionId) {
        if (isSupabaseConfigured) {
          await this.persistUserSubscriptionId(cleanUserId, this.nativeSubscriptionId);
        }
        await this.linkDeviceOnServer(cleanUserId, this.nativeSubscriptionId);
      }
      return;
    }

    // 4. Web / PWA path: Ensure OneSignal Web SDK is initialized (without recursing back into loginUser)
    if (!this.isInitialized) {
      await this.init();
    }

    // 5. Web SDK login & tagging (both via OneSignalDeferred queue and direct SDK call)
    try {
      if (windowAny) {
        windowAny.OneSignalDeferred = windowAny.OneSignalDeferred || [];
        windowAny.OneSignalDeferred.push(async (OS: any) => {
          try {
            if (OS?.login) {
              await OS.login(cleanUserId);
            } else if (OS?.setExternalUserId) {
              await OS.setExternalUserId(cleanUserId);
            }
            if (OS?.User?.addTags) {
              await OS.User.addTags(combinedTags);
            } else if (OS?.sendTags) {
              await OS.sendTags(combinedTags);
            }
          } catch (defErr) {
            console.warn('[OneSignal] Deferred login/tags warning:', defErr);
          }
        });
      }

      if (OneSignal?.login) {
        await OneSignal.login(cleanUserId);
      } else if (windowAny?.OneSignal?.login) {
        await windowAny.OneSignal.login(cleanUserId);
      } else if (windowAny?.OneSignal?.setExternalUserId) {
        await windowAny.OneSignal.setExternalUserId(cleanUserId);
      }

      if (OneSignal?.User?.addTags) {
        await OneSignal.User.addTags(combinedTags);
      } else if (windowAny?.OneSignal?.User?.addTags) {
        await windowAny.OneSignal.User.addTags(combinedTags);
      } else if (windowAny?.OneSignal?.sendTags) {
        await windowAny.OneSignal.sendTags(combinedTags);
      }
      this.addDiag('login', 'ok', 'Set External ID in OneSignal Web SDK.', { userId: cleanUserId });
    } catch (err) {
      this.addDiag('login', 'warn', 'Error setting External ID in OneSignal Web SDK.', String(err));
    }

    // 6. Sync subscription ID to Supabase profiles (preserving all devices of the user)
    const subId = this.nativeSubscriptionId || this.getCurrentSubscriptionId() || windowAny?.OneSignal?.User?.PushSubscription?.id;
    if (subId && cleanUserId && isSupabaseConfigured) {
      await this.persistUserSubscriptionId(cleanUserId, subId);
    }
  }

  /**
   * Log out user from OneSignal
   */
  async logoutUser(): Promise<void> {
    this.currentUserId = null;
    const windowAny = typeof window !== 'undefined' ? (window as any) : null;
    if (windowAny) {
      try {
        const handlers = windowAny.webkit?.messageHandlers;
        if (handlers?.oneSignalLogout) handlers.oneSignalLogout.postMessage({});
        if (handlers?.removeExternalUserId) handlers.removeExternalUserId.postMessage({});
        if (handlers?.logout) handlers.logout.postMessage({});
        if (handlers?.oneSignal) handlers.oneSignal.postMessage({ action: 'logout' });
      } catch (_) {}

      try {
        if (windowAny.OneSignalPlugin?.logout) await windowAny.OneSignalPlugin.logout();
        if (windowAny.Capacitor?.Plugins?.OneSignal?.logout) await windowAny.Capacitor.Plugins.OneSignal.logout();
        if (windowAny.plugins?.OneSignal?.logout) await windowAny.plugins.OneSignal.logout();
      } catch (_) {}
    }

    if (!this.isInitialized) return;
    try {
      if (OneSignal?.logout) {
        await OneSignal.logout();
      } else if (windowAny?.OneSignal?.logout) {
        await windowAny.OneSignal.logout();
      }
      console.log('[OneSignal] Logged out user');
    } catch (err) {
      console.warn('[OneSignal] Error logging out user:', err);
    }
  }

  /**
   * Send a push notification securely through the backend server proxy
   * (Keeps the OneSignal REST API secret key strictly protected on the server)
   */
  async sendServerNotification(
    title: string,
    message: string,
    url: string = '/',
    targetUserIds?: string[],
    targetSubscriptionIds?: string[],
    imageUrl?: string,
    data?: Record<string, any>,
    targetChannels?: ('ios' | 'android' | 'web')[]
  ): Promise<any> {
    const appId = this.getAppId();
    const res = await fetch('/api/send-push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        url,
        appId,
        targetUserIds,
        targetSubscriptionIds,
        imageUrl,
        data,
        targetChannels: targetChannels || ['ios', 'android', 'web']
      })
    });
    const jsonRes = await res.json();
    if (!res.ok) {
      throw new Error(jsonRes.error || 'Erreur lors de l\'envoi de la notification push.');
    }
    return jsonRes;
  }
}

export const oneSignalService = new OneSignalService();
