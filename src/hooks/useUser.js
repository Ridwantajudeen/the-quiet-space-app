import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          setUser(JSON.parse(raw));
        }
      } catch (_) {
        // ignore storage errors
      } finally {
        setIsReady(true);
      }
    };
    loadUser();
  }, []);

  const persistUser = async (nextUser) => {
    try {
      if (!nextUser) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      }
    } catch (_) {
      // ignore storage errors
    }
  };

  const setUserAndPersist = (nextUser) => {
    setUser(nextUser);
    persistUser(nextUser);
  };

  const value = useMemo(
    () => ({ user, setUser: setUserAndPersist, isReady }),
    [user, isReady]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
