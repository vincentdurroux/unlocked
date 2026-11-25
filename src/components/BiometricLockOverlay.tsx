import React, { useEffect, useRef, useState } from 'react';
import { Lock, Loader2, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { biometricLockService } from '../services/biometricLockService';

interface BiometricLockOverlayProps {
  currentUser: { id: string; email?: string } | null;
  onSignOut: () => Promise<void> | void;
}

// Grace period when returning from background (prevents annoying re-locks during Gmail 2FA, maps, or photo picker)
const BACKGROUND_RELOCK_GRACE_MS = 30_000;

export const BiometricLockOverlay: React.FC<BiometricLockOverlayProps> = ({
  currentUser,
  onSignOut,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const hasAutoPromptedRef = useRef(false);
  const initializedUserIdRef = useRef<string | null>(null);

  const attemptUnlock = async (isAuto = false) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const ok = await biometricLockService.verifyWebAuthnUnlock();
      if (ok) {
        setIsLocked(false);
        hasAutoPromptedRef.current = false;
      } else if (!isAuto) {
        setErrorMsg('Verification was not completed. Please try again.');
      }
    } catch (err: any) {
      const name = String(err?.name || '');
      if (isAuto) {
        // Mobile browsers often require a direct user tap for WebAuthn — fail silently on auto-prompt
        setErrorMsg(null);
      } else if (name === 'NotAllowedError' || name === 'AbortError') {
        setErrorMsg('Verification cancelled. Tap Unlock to try again.');
      } else {
        setErrorMsg('Biometric verification failed. Try again or sign out.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Lock on fresh app open if user has WebAuthn lock enabled and hasn't unlocked yet in this session
  useEffect(() => {
    if (!currentUser?.id) {
      setIsLocked(false);
      initializedUserIdRef.current = null;
      hasAutoPromptedRef.current = false;
      return;
    }

    if (initializedUserIdRef.current === currentUser.id) return;
    initializedUserIdRef.current = currentUser.id;

    if (
      biometricLockService.isWebAuthnEnabledForUser(currentUser.id) &&
      !biometricLockService.hasRecentSessionUnlock()
    ) {
      setIsLocked(true);
      hasAutoPromptedRef.current = false;
    } else {
      setIsLocked(false);
    }
  }, [currentUser?.id]);

  // Re-lock when returning from background after >30s
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === 'visible') {
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (
          hiddenAt &&
          Date.now() - hiddenAt >= BACKGROUND_RELOCK_GRACE_MS &&
          biometricLockService.isWebAuthnEnabledForUser(currentUser.id)
        ) {
          setIsLocked(true);
          hasAutoPromptedRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser?.id]);

  // Try one gentle automatic prompt when overlay appears
  useEffect(() => {
    if (isLocked && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      attemptUnlock(true);
    }
  }, [isLocked]);

  if (!isLocked || !currentUser) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+48px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
      role="dialog"
      aria-modal="true"
      aria-label="App Locked"
    >
      <div className="pt-4">
        <Logo className="h-9" />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shadow-sm">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            MyCityUnlocked is Locked
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Verify with your fingerprint, face, or device PIN to access your account.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs font-medium text-amber-800">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={() => attemptUnlock(false)}
          disabled={isVerifying}
          className="w-full py-4 px-6 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Unlock App</span>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={async () => {
          biometricLockService.disableWebAuthnLock();
          setIsLocked(false);
          await onSignOut();
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer py-2 px-3"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign out instead</span>
      </button>
    </div>
  );
};
