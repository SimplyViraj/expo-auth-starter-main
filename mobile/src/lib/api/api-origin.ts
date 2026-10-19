export type ApiPlatform = 'android' | 'ios' | 'macos' | 'web' | 'windows';
export type AppEnvironment = 'development' | 'staging' | 'production';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function normalizeApiBaseUrl(value: string, appEnvironment: AppEnvironment) {
  const url = new URL(value);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The API base URL must use http:// or https://');
  }

  if (appEnvironment !== 'development' && url.protocol !== 'https:') {
    throw new Error('Staging and production API requests require an https:// origin');
  }

  return url.origin;
}

export function isLoopbackUrl(value: string) {
  return loopbackHosts.has(new URL(value).hostname);
}

export function getDevelopmentServerBaseUrl(hostUri: string | null, platform: ApiPlatform) {
  if (!hostUri) {
    return platform === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081';
  }

  const host = hostUri.replace(/^[a-z][a-z\d+.-]*:\/\//i, '');
  const url = new URL(`http://${host}`);

  if (platform === 'android' && loopbackHosts.has(url.hostname)) {
    url.hostname = '10.0.2.2';
  }

  return url.origin;
}

// Resolve only the hostname through Metro; a separate backend keeps its own port.
export function resolveDevelopmentApiBaseUrl(configuredUrl: string, hostUri: string | null, platform: ApiPlatform) {
  const url = new URL(configuredUrl);
  if (!isLoopbackUrl(configuredUrl)) return url.origin;
  const reachable = new URL(getDevelopmentServerBaseUrl(hostUri, platform));
  url.hostname = reachable.hostname;
  return url.origin;
}