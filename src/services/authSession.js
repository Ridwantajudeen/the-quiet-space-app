import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quiet-space-user';
let currentAuthToken = null;
let currentRefreshToken = null;
let sessionExpiredListener = null;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://the-quiet-space-backend.onrender.com';

export const setCurrentAuthSession = ({ token, refreshToken } = {}) => {
  currentAuthToken = token || null;
  currentRefreshToken = refreshToken || null;
};

export const clearCurrentAuthSession = () => {
  currentAuthToken = null;
  currentRefreshToken = null;
};

export const setSessionExpiredListener = (listener) => {
  sessionExpiredListener = typeof listener === 'function' ? listener : null;
  return () => {
    if (sessionExpiredListener === listener) {
      sessionExpiredListener = null;
    }
  };
};

const notifySessionExpired = () => {
  if (typeof sessionExpiredListener === 'function') {
    sessionExpiredListener();
  }
};

export const getStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
};

export const getStoredAuthToken = async () => {
  if (currentAuthToken) {
    return currentAuthToken;
  }

  const user = await getStoredUser();
  const token = user?.token || null;
  const refreshToken = user?.refreshToken || null;
  currentAuthToken = token;
  currentRefreshToken = refreshToken;
  return token;
};

export const getStoredRefreshToken = async () => {
  if (currentRefreshToken) {
    return currentRefreshToken;
  }

  const user = await getStoredUser();
  const refreshToken = user?.refreshToken || null;
  currentRefreshToken = refreshToken;
  if (!currentAuthToken && user?.token) {
    currentAuthToken = user.token;
  }
  return refreshToken;
};

const setStoredUser = async (nextUser) => {
  if (!nextUser) {
    clearCurrentAuthSession();
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }

  const normalized = {
    ...nextUser,
    token: nextUser.token || null,
    refreshToken: nextUser.refreshToken || null,
  };
  setCurrentAuthSession({
    token: normalized.token,
    refreshToken: normalized.refreshToken,
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const saveStoredUser = setStoredUser;

export const refreshStoredAuthSession = async () => {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    await setStoredUser(null);
    notifySessionExpired();
    throw new Error(data?.error || data?.message || 'Your session expired. Please sign in again.');
  }

  const currentUser = await getStoredUser();
  const nextUser = data?.user
    ? {
        ...currentUser,
        ...data.user,
        token: data.token || null,
        refreshToken: data.refreshToken || refreshToken,
      }
    : currentUser
    ? {
        ...currentUser,
        token: data.token || null,
        refreshToken: data.refreshToken || refreshToken,
      }
    : null;

  if (!nextUser) {
    await setStoredUser(null);
    notifySessionExpired();
    return null;
  }

  return setStoredUser(nextUser);
};

export const authorizedFetch = async (url, options = {}) => {
  const token = await getStoredAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshStoredAuthSession().catch(() => null);
  if (!refreshed?.token) {
    return response;
  }

  const retryHeaders = {
    ...(options.headers || {}),
  };
  if (!retryHeaders.Authorization) {
    retryHeaders.Authorization = `Bearer ${refreshed.token}`;
  }

  return fetch(url, {
    ...options,
    headers: retryHeaders,
  });
};
