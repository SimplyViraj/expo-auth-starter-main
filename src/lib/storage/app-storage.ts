import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

export const appStorage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const value = await readValue(key);

    if (!value) return fallback;

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },
  async set<T>(key: string, value: T) {
    await writeValue(key, JSON.stringify(value));
  },
  async remove(key: string) {
    memoryStore.delete(key);

    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },
};

async function readValue(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? memoryStore.get(key);
  }

  return (await AsyncStorage.getItem(key)) ?? memoryStore.get(key);
}

async function writeValue(key: string, value: string) {
  memoryStore.set(key, value);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}
