import React, { useEffect, useRef, useState } from 'react';
import { oneSignalService } from '../services/oneSignalService';
import { Bell, CheckCircle2 } from 'lucide-react';

interface OneSignalVerificationDialogProps {
  userId?: string;
}

const STORAGE_KEY = 'onesignal_verification_dialog_shown';

/**
 * Push Subscription Verification Dialog (Mandatory OneSignal SDK Verification)
 * 
 * Complies with OneSignal SDK AI Prompt specification:
 * 1. Registers push subscription observer immediately after OneSignal is initialized.
 * 2. Retains the observer for the lifetime of the component in a React useRef (framework-retained state).
 * 3. Treats device as registered only when push subscription ID is a real server-assigned value (non-empty & not starting with 'local-').
 * 4. Evaluates current subscription ID both on change and immediately at observer-registration time.
 * 5. Shows dialog exactly once (guarded with 'shown once' flag).
 * 6. On button tap ("Got it"), requests push permission.
 */
export const OneSignalVerificationDialog: React.FC<OneSignalVerificationDialogProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Retain observer callback in React ref for component lifetime (Requirement 2)
  const observerRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    // Check if dialog was already shown once
    const alreadyShown = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';

    // Retained observer implementation
    observerRef.current = (id: string) => {
      // Requirement 3: Only real server-assigned IDs (not starting with 'local-')
      if (oneSignalService.isRealServerAssignedId(id)) {
        setSubscriptionId(id);
        const hasShown = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
        if (!hasShown) {
          setIsOpen(true);
        }
      }
    };

    // Requirement 1 & 4: Register observer immediately and evaluate current ID
    const unsubscribe = oneSignalService.addPushSubscriptionObserver((id: string) => {
      if (observerRef.current) {
        observerRef.current(id);
      }
    });

    // Also check immediately in case OneSignal was already initialized
    const currentId = typeof window !== 'undefined' ? oneSignalService.getCurrentSubscriptionId() : null;
    if (!alreadyShown && oneSignalService.isRealServerAssignedId(currentId)) {
      setSubscriptionId(currentId);
      setIsOpen(true);
    }

    return () => {
      unsubscribe();
      observerRef.current = null;
    };
  }, []);

  const handleGotIt = async () => {
    // Guard with "shown once" flag
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);

    // Requirement 6: On button tap, request push permission
    try {
      await oneSignalService.subscribe(userId);
    } catch (err) {
      console.warn('[OneSignal Verification] Error requesting push permission:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onesignal-dialog-title"
      aria-describedby="onesignal-dialog-message"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center relative animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25 mb-5">
          <Bell className="w-7 h-7 animate-bounce" />
        </div>

        {/* Title exactly as mandated by OneSignal specification */}
        <h2 
          id="onesignal-dialog-title" 
          className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-3"
        >
          Your OneSignal SDK integration is complete!
        </h2>

        {/* Message exactly as mandated by OneSignal specification */}
        <p 
          id="onesignal-dialog-message" 
          className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6"
        >
          You can now send Push Notifications &amp; In-App Messages through OneSignal. Tap below to enable push notifications.
        </p>

        {subscriptionId && (
          <div className="mb-6 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center justify-center gap-1.5 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Subscription ID: {subscriptionId}</span>
          </div>
        )}

        {/* Single button exactly as mandated: "Got it" */}
        <button
          type="button"
          onClick={handleGotIt}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-base shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-200"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
