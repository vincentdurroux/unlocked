import React, { useEffect, useRef } from 'react';
import { oneSignalService } from '../services/oneSignalService';

interface OneSignalVerificationDialogProps {
  userId?: string;
}

/**
 * Push Subscription Verification (Background Observer)
 * 
 * Honors the user's preference to rely exclusively on the generic native system notification prompt,
 * without displaying intrusive custom banners or popups.
 */
export const OneSignalVerificationDialog: React.FC<OneSignalVerificationDialogProps> = ({ userId }) => {
  const observerRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    if (userId) {
      oneSignalService.loginUser(userId).catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    observerRef.current = (id: string) => {
      if (oneSignalService.isRealServerAssignedId(id)) {
        if (userId) {
          oneSignalService.loginUser(userId).catch(() => {});
        }
      }
    };

    const unsubscribe = oneSignalService.addPushSubscriptionObserver((id: string) => {
      if (observerRef.current) {
        observerRef.current(id);
      }
    });

    return () => {
      unsubscribe();
      observerRef.current = null;
    };
  }, [userId]);

  // Return null to keep only the generic native system notification prompt, as requested by the user
  return null;
};
