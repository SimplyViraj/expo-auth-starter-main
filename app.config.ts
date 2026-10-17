import type { ConfigContext, ExpoConfig } from 'expo/config';

import appIdentity from './app-identity.json';

type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

function getPluginName(plugin: ExpoPlugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function resolveApiOrigin(value: string | undefined, appEnvironment: string) {
  if (!value) {
    if (appEnvironment === 'production') {
      throw new Error('EXPO_PUBLIC_API_URL is required for production builds');
    }

    return null;
  }

  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('EXPO_PUBLIC_API_URL must use http:// or https://');
  }

  if (appEnvironment !== 'development' && url.protocol !== 'https:') {
    throw new Error('Staging and production API origins must use https://');
  }

  return url.origin;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appleTeamId = process.env.APPLE_TEAM_ID;
  const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  const apiOrigin = resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL, appEnvironment);
  const routerPlugin = [
    'expo-router',
    ...(apiOrigin ? [{ origin: apiOrigin }] : []),
  ] as ExpoPlugin;
  return {
    ...config,
    name: appIdentity.name,
    slug: appIdentity.slug,
    scheme: appIdentity.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: appIdentity.iosBundleIdentifier,
      ...(appleTeamId ? { appleTeamId } : {}),
    },
    android: {
      ...config.android,
      package: appIdentity.androidPackage,
    },
    plugins: [
      routerPlugin,
      ...(config.plugins ?? []).filter((plugin) => getPluginName(plugin) !== 'expo-router'),
    ],
  };
};
