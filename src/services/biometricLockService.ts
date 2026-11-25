// Local Biometric App Lock Service
// Supports:
// 1. Native iOS Xcode bridge (window.webkit.messageHandlers.faceIdSettings)
// 2. Native Android WebView bridge (window.AndroidBiometric)
// 3. WebAuthn Platform Authenticator (Android PWABuilder TWA / Chrome / mobile PWA)
// Protects access to an existing Supabase session locally without altering Supabase Auth.

export type BiometricLockMode = 'native-ios' | 'native-android' | 'webauthn' | 'none';

export interface BiometricLockStatus {
  mode: BiometricLockMode;
  available: boolean;
  enabled: boolean;
  biometryType: 'faceId' | 'touchId' | 'biometric';
  label: string;
  description: string;
}

const STORAGE_KEYS = {
  iosEnabled: 'mcu_faceid_lock_enabled',
  webAuthnEnabled: 'mcu_webauthn_lock_enabled',
  webAuthnCredId: 'mcu_webauthn_cred_id',
  webAuthnUserId: 'mcu_webauthn_user_id',
  sessionUnlockedAt: 'mcu_biometric_unlocked_at',
};

const LOCK_EVENT_NAME = 'mcu-biometric-auth-changed';

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getPlatformContext() {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isStandalone: false,
      isNativeIosWebView: false,
      hasIosFaceIdBridge: false,
      hasAndroidNativeBridge: false,
    };
  }

  const win = window as any;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(ua);
  const isStandalone =
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  const hasIosFaceIdBridge = Boolean(
    win.webkit?.messageHandlers?.faceIdSettings &&
    typeof win.webkit.messageHandlers.faceIdSettings.postMessage === 'function' &&
    win.__mcuBiometricAuth?.available !== false
  );

  const hasAndroidNativeBridge = Boolean(
    win.AndroidBiometric && typeof win.AndroidBiometric.setEnabled === 'function'
  );

  // An iOS WKWebView wrapper without the native faceIdSettings bridge cannot reliably run WebAuthn
  // unless webcredentials Associated Domains are verified, so avoid exposing a broken WebAuthn toggle there.
  const isNativeIosWebView = isIOS && Boolean(win.webkit?.messageHandlers) && !hasIosFaceIdBridge;

  return {
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    isNativeIosWebView,
    hasIosFaceIdBridge,
    hasAndroidNativeBridge,
  };
}

function notifyChanged(detail?: Partial<{ available: boolean; enabled: boolean; type: string }>) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(LOCK_EVENT_NAME, { detail: detail || {} }));
  } catch (_) {}
}

export const biometricLockService = {
  eventName: LOCK_EVENT_NAME,

  getSyncStatus(currentUserId?: string | null): BiometricLockStatus {
    if (typeof window === 'undefined') {
      return {
        mode: 'none',
        available: false,
        enabled: false,
        biometryType: 'biometric',
        label: 'Biometric Lock',
        description: 'Require fingerprint, face, or device PIN when opening the app',
      };
    }

    const win = window as any;
    const ctx = getPlatformContext();

    // 1. Native iOS Xcode bridge
    if (ctx.hasIosFaceIdBridge) {
      const bio = win.__mcuBiometricAuth;
      const biometryType: 'faceId' | 'touchId' = bio?.type === 'touchId' ? 'touchId' : 'faceId';
      let enabled = false;
      if (typeof bio?.enabled === 'boolean') {
        enabled = bio.enabled;
      } else {
        try {
          enabled = localStorage.getItem(STORAGE_KEYS.iosEnabled) === 'true';
        } catch (_) {}
      }
      return {
        mode: 'native-ios',
        available: true,
        enabled,
        biometryType,
        label: biometryType === 'touchId' ? 'Touch ID Lock' : 'Face ID Lock',
        description:
          biometryType === 'touchId'
            ? 'Require Touch ID when opening the app on this device'
            : 'Require Face ID when opening the app on this iPhone',
      };
    }

    // 2. Native Android WebView bridge
    if (ctx.hasAndroidNativeBridge) {
      let enabled = false;
      try {
        enabled = Boolean(win.AndroidBiometric.isEnabled?.());
      } catch (_) {}
      return {
        mode: 'native-android',
        available: true,
        enabled,
        biometryType: 'biometric',
        label: 'Biometric Lock',
        description: 'Require fingerprint, face unlock, or device PIN when opening the app',
      };
    }

    // 3. WebAuthn sync snapshot (availability confirmed asynchronously via resolveStatus)
    const webAuthnEnabled = this.isWebAuthnEnabledForUser(currentUserId);
    return {
      mode: 'none',
      available: false,
      enabled: webAuthnEnabled,
      biometryType: 'biometric',
      label: 'Biometric Lock',
      description: 'Require fingerprint, face unlock, or device PIN when opening the app',
    };
  },

  async resolveStatus(currentUserId?: string | null): Promise<BiometricLockStatus> {
    const syncStatus = this.getSyncStatus(currentUserId);
    if (syncStatus.mode === 'native-ios' || syncStatus.mode === 'native-android') {
      return syncStatus;
    }

    if (typeof window === 'undefined') return syncStatus;
    const ctx = getPlatformContext();

    // Only offer WebAuthn local lock on mobile/standalone devices (Android PWABuilder TWA, Android Chrome, iOS Safari PWA)
    // and never inside an iOS WKWebView without native bridge.
    if (ctx.isNativeIosWebView || (!ctx.isMobile && !ctx.isStandalone)) {
      return syncStatus;
    }

    if (!window.isSecureContext || typeof window.PublicKeyCredential === 'undefined') {
      return syncStatus;
    }

    // Avoid cross-origin iframe environments where WebAuthn is disallowed by permissions policy
    try {
      if (window.self !== window.top) {
        return syncStatus;
      }
    } catch (_) {
      return syncStatus;
    }

    try {
      const platformAvailable =
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
          ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          : false;

      if (!platformAvailable) {
        return syncStatus;
      }

      const enabled = this.isWebAuthnEnabledForUser(currentUserId);
      return {
        mode: 'webauthn',
        available: true,
        enabled,
        biometryType: 'biometric',
        label: ctx.isAndroid ? 'Biometric Lock' : 'Face ID / Biometric Lock',
        description: ctx.isAndroid
          ? 'Require fingerprint, face unlock, or device PIN when opening the app'
          : 'Require Face ID, Touch ID, or device passcode when opening the app',
      };
    } catch (_) {
      return syncStatus;
    }
  },

  isWebAuthnEnabledForUser(userId?: string | null): boolean {
    if (typeof window === 'undefined' || !userId) return false;
    const ctx = getPlatformContext();
    // Never double-lock if native iOS or native Android bridge is active
    if (ctx.hasIosFaceIdBridge || ctx.hasAndroidNativeBridge || ctx.isNativeIosWebView) {
      return false;
    }
    try {
      const enabled = localStorage.getItem(STORAGE_KEYS.webAuthnEnabled) === 'true';
      const credId = localStorage.getItem(STORAGE_KEYS.webAuthnCredId);
      const savedUserId = localStorage.getItem(STORAGE_KEYS.webAuthnUserId);
      if (!enabled || !credId) return false;
      if (savedUserId && savedUserId !== userId) return false;
      return true;
    } catch (_) {
      return false;
    }
  },

  markUnlockedNow(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_KEYS.sessionUnlockedAt, String(Date.now()));
    } catch (_) {}
  },

  hasRecentSessionUnlock(maxAgeMs = 15 * 60 * 1000): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.sessionUnlockedAt);
      if (!raw) return false;
      const ts = Number(raw);
      return Number.isFinite(ts) && Date.now() - ts < maxAgeMs;
    } catch (_) {
      return false;
    }
  },

  setNativeIosEnabled(enabled: boolean, biometryType: 'faceId' | 'touchId' = 'faceId'): void {
    if (typeof window === 'undefined') return;
    const win = window as any;
    win.__mcuBiometricAuth = {
      ...(win.__mcuBiometricAuth || {}),
      available: true,
      type: biometryType,
      enabled,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.iosEnabled, String(enabled));
    } catch (_) {}
    try {
      win.webkit?.messageHandlers?.faceIdSettings?.postMessage({ enabled });
    } catch (err) {
      console.warn('[Biometric] Could not post faceIdSettings message to iOS:', err);
    }
    notifyChanged({ available: true, enabled, type: biometryType });
  },

  setNativeAndroidEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    const win = window as any;
    try {
      win.AndroidBiometric?.setEnabled?.(enabled);
    } catch (err) {
      console.warn('[Biometric] Could not call AndroidBiometric.setEnabled:', err);
    }
    notifyChanged({ available: true, enabled, type: 'biometric' });
  },

  async enableWebAuthnLock(user: { id: string; email?: string; full_name?: string }): Promise<void> {
    if (typeof window === 'undefined' || !navigator.credentials?.create) {
      throw new Error('Biometric verification is not supported on this device.');
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userIdBytes = new TextEncoder().encode(user.id.slice(0, 64));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'MyCityUnlocked',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: user.email || 'member@mycityunlocked.app',
          displayName: user.full_name || user.email || 'MyCityUnlocked Member',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      throw new Error('Biometric setup was cancelled.');
    }

    const credIdB64 = toBase64Url(credential.rawId);
    try {
      localStorage.setItem(STORAGE_KEYS.webAuthnCredId, credIdB64);
      localStorage.setItem(STORAGE_KEYS.webAuthnUserId, user.id);
      localStorage.setItem(STORAGE_KEYS.webAuthnEnabled, 'true');
    } catch (_) {
      throw new Error('Could not save biometric preference on this device.');
    }

    this.markUnlockedNow();
    notifyChanged({ available: true, enabled: true, type: 'biometric' });
  },

  disableWebAuthnLock(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.webAuthnEnabled);
      localStorage.removeItem(STORAGE_KEYS.webAuthnCredId);
      localStorage.removeItem(STORAGE_KEYS.webAuthnUserId);
      sessionStorage.removeItem(STORAGE_KEYS.sessionUnlockedAt);
    } catch (_) {}
    notifyChanged({ enabled: false, type: 'biometric' });
  },

  async verifyWebAuthnUnlock(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.credentials?.get) {
      return false;
    }

    let credIdB64: string | null = null;
    try {
      credIdB64 = localStorage.getItem(STORAGE_KEYS.webAuthnCredId);
    } catch (_) {}

    if (!credIdB64) {
      return false;
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credIdBytes = fromBase64Url(credIdB64);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: credIdBytes.buffer as ArrayBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (assertion) {
      this.markUnlockedNow();
      return true;
    }
    return false;
  },
};
