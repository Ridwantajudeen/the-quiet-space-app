import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearCurrentAuthSession,
  saveStoredUser,
  setCurrentAuthSession,
  setSessionExpiredListener,
} from '../services/authSession';

const STORAGE_KEY = 'quiet-space-user';

const UserContext = createContext({
  user: null,
  setUser: () => {},
  isReady: false,
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const nextUser = JSON.parse(raw);
          setUser(nextUser);
          setCurrentAuthSession({
            token: nextUser?.token || null,
            refreshToken: nextUser?.refreshToken || null,
          });
        }
      } catch (_) {
        // ignore storage errors
      } finally {
        setIsReady(true);
      }
    };
    loadUser();
  }, []);

  const persistUser = useCallback(async (nextUser) => {
    try {
      if (!nextUser) {
        clearCurrentAuthSession();
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await saveStoredUser(nextUser);
      }
    } catch (_) {
      // ignore storage errors
    }
  }, []);

  const setUserAndPersist = useCallback((nextUser) => {
    setUser(nextUser);
    persistUser(nextUser);
  }, [persistUser]);

  useEffect(() => {
    const unsubscribe = setSessionExpiredListener(() => {
      setUserAndPersist(null);
    });

    return unsubscribe;
  }, [setUserAndPersist]);

  const value = useMemo(
    () => ({ user, setUser: setUserAndPersist, isReady }),
    [user, isReady, setUserAndPersist]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
