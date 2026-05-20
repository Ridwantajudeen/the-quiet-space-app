import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification_prompt_state_v1';

const loadState = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { suppressed: false };
  try {
    const parsed = JSON.parse(raw);
    return {
      suppressed: !!parsed?.suppressed,
    };
  } catch (_) {
    return { suppressed: false };
  }
};

export const shouldSuppressNotificationPrompts = async () => {
  const state = await loadState();
  return !!state.suppressed;
};

export const suppressNotificationPrompts = async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ suppressed: true }));
};

export const clearNotificationPromptSuppression = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
