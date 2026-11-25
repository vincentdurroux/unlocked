import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Biometric Sign-In (Server-Verified WebAuthn Passkeys for Android PWABuilder TWA / Web)
// + Optional Native iOS Xcode Face ID Lock bridge (window.webkit.messageHandlers.faceIdSettings)

export interface NativeIosFaceIdStatus {
  available: boolean;
  enabled: boolean;
  type: 'faceId' | 'touchId';
  label: string;
  description: string;
}

export interface PasskeyServerStatus {
  supported: boolean;
  configured: boolean;
  enabled: boolean;
  count: number;
  code?: string;
}

const IOS_LOCK_KEY = 'mcu_faceid_lock_enabled';
const PASSKEY_HINT_KEY = 'mcu_passkey_registered';
const LOCK_EVENT_NAME = 'mcu-biometric-auth-changed';

function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'Android device';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'This device';
}

function getPlatformContext() {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isNativeIosWebView: false,
      hasIosFaceIdBridge: false,
    };
  }

  const win = window as any;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  const hasIosFaceIdBridge = Boolean(
    win.webkit?.messageHandlers?.faceIdSettings &&
    typeof win.webkit.messageHandlers.faceIdSettings.postMessage === 'function' &&
    win.__mcuBiometricAuth?.available !== false
  );

  // iOS WKWebView wrappers require verified webcredentials AASA for WebAuthn;
  // avoid showing a WebAuthn button inside WKWebView unless running in Safari/Android/Desktop.
  const isNativeIosWebView = isIOS && Boolean(win.webkit?.messageHandlers);

  return {
    isIOS,
    isAndroid,
    isNativeIosWebView,
    hasIosFaceIdBridge,
  };
}

async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function callPasskeyApi(body: Record<string, any>, requireAuth = false): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Please sign in again to manage Biometric Sign-In.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch('/api/passkey', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Biometric authentication request failed.');
    if (payload?.code) err.code = payload.code;
    err.status = res.status;
    throw err;
  }
  return payload;
}

export const biometricLockService = {
  eventName: LOCK_EVENT_NAME,

  // ---- Optional Native iOS Xcode Face ID Lock bridge ----
  getNativeIosFaceIdStatus(): NativeIosFaceIdStatus {
    if (typeof window === 'undefined') {
      return {
        available: false,
        enabled: false,
        type: 'faceId',
        label: 'Face ID Lock',
        description: 'Require Face ID when opening the app on this iPhone',
      };
    }

    const win = window as any;
    const ctx = getPlatformContext();
    if (!ctx.hasIosFaceIdBridge) {
      return {
        available: false,
        enabled: false,
        type: 'faceId',
        label: 'Face ID Lock',
        description: 'Require Face ID when opening the app on this iPhone',
      };
    }

    const bio = win.__mcuBiometricAuth;
    const type: 'faceId' | 'touchId' = bio?.type === 'touchId' ? 'touchId' : 'faceId';
    let enabled = false;
    if (typeof bio?.enabled === 'boolean') {
      enabled = bio.enabled;
    } else {
      try {
        enabled = localStorage.getItem(IOS_LOCK_KEY) === 'true';
      } catch (_) {}
    }

    return {
      available: true,
      enabled,
      type,
      label: type === 'touchId' ? 'Touch ID Lock' : 'Face ID Lock',
      description:
        type === 'touchId'
          ? 'Require Touch ID when opening the app on this device'
          : 'Require Face ID when opening the app on this iPhone',
    };
  },

  setNativeIosEnabled(enabled: boolean, type: 'faceId' | 'touchId' = 'faceId'): void {
    if (typeof window === 'undefined') return;
    const win = window as any;
    win.__mcuBiometricAuth = {
      ...(win.__mcuBiometricAuth || {}),
      available: true,
      type,
      enabled,
    };
    try {
      localStorage.setItem(IOS_LOCK_KEY, String(enabled));
    } catch (_) {}
    try {
      win.webkit?.messageHandlers?.faceIdSettings?.postMessage({ enabled });
    } catch (err) {
      console.warn('[Biometric] Could not post faceIdSettings message to iOS:', err);
    }
    try {
      window.dispatchEvent(new CustomEvent(LOCK_EVENT_NAME, { detail: { available: true, enabled, type } }));
    } catch (_) {}
  },

  // ---- Server-Verified Passkey / Biometric Sign-In (Android PWABuilder TWA, Chrome, Safari, Desktop) ----
  async isPasskeySupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const ctx = getPlatformContext();
    if (ctx.isNativeIosWebView) return false;
    if (!window.isSecureContext || typeof window.PublicKeyCredential === 'undefined') return false;

    // Cross-origin iframes cannot invoke WebAuthn
    try {
      if (window.self !== window.top) return false;
    } catch (_) {
      return false;
    }

    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch (_) {
      return false;
    }
  },

  hasLocalPasskeyHint(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(PASSKEY_HINT_KEY) === 'true';
    } catch (_) {
      return false;
    }
  },

  async getPasskeyStatus(): Promise<PasskeyServerStatus> {
    const supported = await this.isPasskeySupported();
    if (!supported) {
      return { supported: false, configured: false, enabled: false, count: 0 };
    }
    try {
      const res = await callPasskeyApi({ action: 'status' }, true);
      const enabled = Boolean(res?.enabled);
      try {
        if (enabled) {
          localStorage.setItem(PASSKEY_HINT_KEY, 'true');
        } else {
          localStorage.removeItem(PASSKEY_HINT_KEY);
        }
      } catch (_) {}
      return {
        supported: true,
        configured: Boolean(res?.configured),
        enabled,
        count: Number(res?.count || 0),
        code: res?.code,
      };
    } catch (err: any) {
      return {
        supported: true,
        configured: err?.code !== 'PASSKEY_NOT_CONFIGURED' && err?.code !== 'PASSKEY_TABLE_MISSING',
        enabled: false,
        count: 0,
        code: err?.code,
      };
    }
  },

  async registerPasskey(): Promise<void> {
    const { options, challengeId } = await callPasskeyApi({ action: 'register-options' }, true);
    const credential = await startRegistration({ optionsJSON: options });
    await callPasskeyApi(
      {
        action: 'register-verify',
        challengeId,
        credential,
        deviceName: getDeviceLabel(),
      },
      true
    );
    try {
      localStorage.setItem(PASSKEY_HINT_KEY, 'true');
    } catch (_) {}
  },

  async removePasskeys(): Promise<void> {
    await callPasskeyApi({ action: 'delete' }, true);
    try {
      localStorage.removeItem(PASSKEY_HINT_KEY);
    } catch (_) {}
  },

  async signInWithPasskey(): Promise<{ user: any; session: any }> {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service is not configured.');
    }

    const { options, challengeId } = await callPasskeyApi({ action: 'auth-options' }, false);
    const credential = await startAuthentication({ optionsJSON: options });
    const verifyRes = await callPasskeyApi(
      {
        action: 'auth-verify',
        challengeId,
        credential,
      },
      false
    );

    const tokenHash = verifyRes?.token_hash;
    if (!tokenHash) {
      throw new Error('Biometric verification succeeded, but no session token was returned.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });

    if (error || !data?.session?.user) {
      throw new Error(error?.message || 'Unable to complete sign-in. Please try again.');
    }

    try {
      localStorage.setItem('keep_me_signed_in', 'true');
      localStorage.setItem(PASSKEY_HINT_KEY, 'true');
    } catch (_) {}

    return { user: data.session.user, session: data.session };
  },
};
