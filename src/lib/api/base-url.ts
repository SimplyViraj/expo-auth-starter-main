import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { getDevelopmentServerBaseUrl, isLoopbackUrl, normalizeApiBaseUrl } from '@/lib/api/api-origin';

export function getApiBaseUrl() {
  if (env.apiBaseUrl) {
    if (__DEV__ && Platform.OS !== 'web' && isLoopbackUrl(env.apiBaseUrl)) {
      return getDevelopmentServerBaseUrl(Constants.expoConfig?.hostUri ?? null, Platform.OS);
    }

    return normalizeApiBaseUrl(env.apiBaseUrl, env.appEnvironment);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return normalizeApiBaseUrl(window.location.origin, env.appEnvironment);
  }

  if (__DEV__) {
    return getDevelopmentServerBaseUrl(Constants.expoConfig?.hostUri ?? null, Platform.OS);
  }

  throw new Error('EXPO_PUBLIC_API_URL is required when the development server origin cannot be resolved');
}
