import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import {
  getBiometricPreferenceKey,
  readBiometricPreference,
  removeBiometricPreference,
  saveBiometricPreference,
} from '@/features/biometrics/biometric-preference';
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  type BiometricAttempt,
  type BiometricAvailability,
} from '@/lib/device/biometric-auth';

type BiometricLockContextValue = {
  availability: BiometricAvailability | null;
  isAppActive: boolean;
  isAuthenticating: boolean;
  isEnabled: boolean;
  isLocked: boolean;
  isReady: boolean;
  message: string | null;
  setEnabled: (enabled: boolean) => Promise<BiometricAttempt>;
  unlock: () => Promise<boolean>;
};

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

export function BiometricLockProvider({ children }: { children: React.ReactNode }) {
  const { phase, user } = useAuth();
  const activeUserId = phase === 'needs-onboarding' || phase === 'ready' ? user?.id : undefined;
  const activeStorageKey = activeUserId ? getBiometricPreferenceKey(activeUserId) : null;
  const promptInFlight = useRef(false);
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isReady =
    !activeStorageKey || Platform.OS === 'web' || loadedStorageKey === activeStorageKey;

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      setMessage(null);

      if (!activeUserId || Platform.OS === 'web') {
        const nextAvailability = await getBiometricAvailability();
        if (cancelled) return;

        setAvailability(nextAvailability);
        setIsEnabledState(false);
        setIsLocked(false);
        setLoadedStorageKey(activeStorageKey);
        return;
      }

      const nextAvailability = await getBiometricAvailability();
      let storedEnabled = false;

      try {
        storedEnabled = await readBiometricPreference(activeUserId);
      } catch {
        if (!cancelled) {
          setMessage('We couldn’t load your app lock setting.');
        }
      }

      if (cancelled) return;

      const canLock = nextAvailability.status === 'available';
      setAvailability(nextAvailability);
      setIsEnabledState(storedEnabled && canLock);
      setIsLocked(storedEnabled && canLock);
      setLoadedStorageKey(activeStorageKey);

      if (storedEnabled && !canLock) {
        void removeBiometricPreference(activeUserId).catch(() => {
          // The stale preference can be retried on the next launch.
        });
      }
    }

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, [activeStorageKey, activeUserId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');

      if (nextState !== 'active' && isEnabled) {
        setMessage(null);
        setIsLocked(true);
      }
    });

    return () => subscription.remove();
  }, [isEnabled]);

  const runAuthentication = useCallback(async (): Promise<BiometricAttempt> => {
    if (promptInFlight.current || !isAppActive) {
      return { success: false, cancelled: true, message: null };
    }

    promptInFlight.current = true;
    setIsAuthenticating(true);
    setMessage(null);

    try {
      const result = await authenticateWithBiometrics();

      if (result.success) {
        setIsLocked(false);
        return result;
      }

      setMessage(result.message);
      return result;
    } finally {
      promptInFlight.current = false;
      setIsAuthenticating(false);
    }
  }, [isAppActive]);

  const unlock = useCallback(async () => {
    if (availability?.status !== 'available') return false;
    return (await runAuthentication()).success;
  }, [availability?.status, runAuthentication]);

  const setEnabled = useCallback(
    async (enabled: boolean): Promise<BiometricAttempt> => {
      if (!activeUserId) {
        return {
          success: false,
          cancelled: false,
          message: 'Sign in before turning on app lock.',
        };
      }

      if (!enabled) {
        try {
          await removeBiometricPreference(activeUserId);
          setIsEnabledState(false);
          setIsLocked(false);
          setMessage(null);
          return { success: true };
        } catch {
          const storageMessage = 'We couldn’t save this setting. Please try again.';
          setMessage(storageMessage);
          return { success: false, cancelled: false, message: storageMessage };
        }
      }

      const nextAvailability = await getBiometricAvailability();
      setAvailability(nextAvailability);

      if (nextAvailability.status !== 'available') {
        setMessage(nextAvailability.message);
        return {
          success: false,
          cancelled: false,
          message: nextAvailability.message,
        };
      }

      const result = await runAuthentication();
      if (!result.success) return result;

      try {
        await saveBiometricPreference(activeUserId);
        setIsEnabledState(true);
        setIsLocked(false);
        return { success: true };
      } catch {
        const storageMessage = 'We couldn’t save this setting. Please try again.';
        setMessage(storageMessage);
        return { success: false, cancelled: false, message: storageMessage };
      }
    },
    [activeUserId, runAuthentication],
  );

  const value = useMemo<BiometricLockContextValue>(
    () => ({
      availability,
      isAppActive,
      isAuthenticating,
      isEnabled,
      isLocked,
      isReady,
      message,
      setEnabled,
      unlock,
    }),
    [
      availability,
      isAppActive,
      isAuthenticating,
      isEnabled,
      isLocked,
      isReady,
      message,
      setEnabled,
      unlock,
    ],
  );

  return <BiometricLockContext.Provider value={value}>{children}</BiometricLockContext.Provider>;
}

export function useBiometricLock() {
  const value = useContext(BiometricLockContext);

  if (!value) {
    throw new Error('useBiometricLock must be used inside BiometricLockProvider');
  }

  return value;
}
