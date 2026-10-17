import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { appConfig } from '@/constants/app-config';

export type BiometricAvailability =
  | { status: 'available'; label: string }
  | { status: 'unsupported' | 'not-enrolled'; label: 'biometrics'; message: string };

export type BiometricAttempt =
  | { success: true }
  | { success: false; cancelled: boolean; message: string | null };

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') {
    return {
      status: 'unsupported',
      label: 'biometrics',
      message: 'App lock is available in the native iOS and Android apps.',
    };
  }

  try {
    const [hasHardware, isEnrolled, enrolledLevel, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (!hasHardware) {
      return {
        status: 'unsupported',
        label: 'biometrics',
        message: 'This device does not support biometric app locking.',
      };
    }

    if (!isEnrolled || enrolledLevel < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      return {
        status: 'not-enrolled',
        label: 'biometrics',
        message: 'Set up strong face or fingerprint recognition in your device settings first.',
      };
    }

    return { status: 'available', label: getBiometricLabel(types) };
  } catch {
    return {
      status: 'unsupported',
      label: 'biometrics',
      message: 'Biometric app locking is not available right now.',
    };
  }
}

export async function authenticateWithBiometrics(): Promise<BiometricAttempt> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock ${appConfig.name}`,
      promptSubtitle: 'Confirm it’s you to continue',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
      requireConfirmation: true,
    });

    if (result.success) return { success: true };

    const cancelled = ['app_cancel', 'system_cancel', 'user_cancel'].includes(result.error);
    return {
      success: false,
      cancelled,
      message: cancelled ? null : getAuthenticationErrorMessage(result.error),
    };
  } catch {
    return {
      success: false,
      cancelled: false,
      message: 'We couldn’t confirm your identity. Please try again.',
    };
  }
}

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  const supportsFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const supportsFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (Platform.OS === 'ios') {
    if (supportsFace) return 'Face ID';
    if (supportsFingerprint) return 'Touch ID';
  }

  if (supportsFace && supportsFingerprint) return 'device biometrics';
  if (supportsFace) return 'face unlock';
  if (supportsFingerprint) return 'fingerprint';
  return 'biometrics';
}

function getAuthenticationErrorMessage(error: LocalAuthentication.LocalAuthenticationError) {
  switch (error) {
    case 'lockout':
      return 'Biometrics are temporarily locked. Use your device passcode or try again later.';
    case 'not_enrolled':
      return 'Set up face or fingerprint recognition in your device settings first.';
    case 'not_available':
    case 'passcode_not_set':
      return 'Biometric app locking is not available on this device.';
    case 'authentication_failed':
      return 'We couldn’t confirm it was you. Please try again.';
    default:
      return 'We couldn’t unlock the app. Please try again.';
  }
}
