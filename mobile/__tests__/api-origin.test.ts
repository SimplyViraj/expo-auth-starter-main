import { describe, expect, it } from 'vitest';

import {
  getDevelopmentServerBaseUrl,
  normalizeApiBaseUrl,
  resolveDevelopmentApiBaseUrl,
} from '@/lib/api/api-origin';

describe('development API origins', () => {
  it('maps Android emulator loopback to the host machine', () => {
    expect(getDevelopmentServerBaseUrl('127.0.0.1:8081', 'android')).toBe('http://10.0.2.2:8081');
  });

  it('keeps the Expo LAN address on native devices', () => {
    expect(getDevelopmentServerBaseUrl('192.168.1.20:8081', 'android')).toBe('http://192.168.1.20:8081');
    expect(getDevelopmentServerBaseUrl('192.168.1.20:8081', 'ios')).toBe('http://192.168.1.20:8081');
  });

  it('uses platform-safe fallbacks when Expo has no host address', () => {
    expect(getDevelopmentServerBaseUrl(null, 'android')).toBe('http://10.0.2.2:8081');
    expect(getDevelopmentServerBaseUrl(null, 'ios')).toBe('http://localhost:8081');
  });
});

describe('deployed API origins', () => {
  it('normalizes paths to an origin', () => {
    expect(normalizeApiBaseUrl('https://api.example.com/path', 'production')).toBe('https://api.example.com');
  });

  it('rejects insecure staging and production origins', () => {
    expect(() => normalizeApiBaseUrl('http://api.example.com', 'staging')).toThrow('require an https:// origin');
    expect(() => normalizeApiBaseUrl('http://api.example.com', 'production')).toThrow('require an https:// origin');
  });
});

describe('separate backend development origin', () => {
  it('uses the phone-reachable hostname while retaining the Nest port', () => {
    expect(resolveDevelopmentApiBaseUrl('http://localhost:3000', '192.168.1.20:8081', 'ios')).toBe('http://192.168.1.20:3000');
  });
  it('maps the Android emulator without switching to the Metro port', () => {
    expect(resolveDevelopmentApiBaseUrl('http://localhost:3000', null, 'android')).toBe('http://10.0.2.2:3000');
  });
  it('preserves an explicitly configured LAN or deployed origin', () => {
    expect(resolveDevelopmentApiBaseUrl('https://api.example.com', '192.168.1.20:8081', 'ios')).toBe('https://api.example.com');
  });
  it('keeps the legacy Expo API port', () => {
    expect(resolveDevelopmentApiBaseUrl('http://localhost:8081', '192.168.1.20:8081', 'ios')).toBe('http://192.168.1.20:8081');
  });
  it('handles IPv6 loopback', () => {
    expect(resolveDevelopmentApiBaseUrl('http://[::1]:3000', '192.168.1.20:8081', 'ios')).toBe('http://192.168.1.20:3000');
  });
});