import { appStorage } from '@/lib/storage/app-storage';

export function getBiometricPreferenceKey(userId: string) {
  return `biometric-lock:${userId}`;
}

export function readBiometricPreference(userId: string) {
  return appStorage.get(getBiometricPreferenceKey(userId), false);
}

export function saveBiometricPreference(userId: string) {
  return appStorage.set(getBiometricPreferenceKey(userId), true);
}

export function removeBiometricPreference(userId: string) {
  return appStorage.remove(getBiometricPreferenceKey(userId));
}
