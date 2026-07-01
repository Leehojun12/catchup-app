import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { clearSession, loadSession, saveSession, saveUser } from '../services/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session.token) {
        setAuthToken(session.token);
        setToken(session.token);
        setUser(session.user);
        // Refresh profile in background
        api.getMe()
          .then((res) => {
            setUser(res.user);
            saveUser(res.user);
          })
          .catch(() => {});
      }
      setInitializing(false);
    })();
  }, []);

  const applySession = useCallback(async (nextToken, nextUser) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await saveSession(nextToken, nextUser);
  }, []);

  const signup = useCallback(
    async (payload) => {
      const res = await api.signup(payload);
      await applySession(res.token, res.user);
      return res.user;
    },
    [applySession]
  );

  const loginWithKakao = useCallback(
    async (payload) => {
      const res = await api.kakaoLogin(payload);
      await applySession(res.token, res.user);
      return res.user;
    },
    [applySession]
  );

  const loginWithNaver = useCallback(
    async (payload) => {
      const res = await api.naverLogin(payload);
      await applySession(res.token, res.user);
      return res.user;
    },
    [applySession]
  );

  const updateProfile = useCallback(async (updates) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
    await saveUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await clearSession();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      isAuthenticated: !!token,
      signup,
      loginWithKakao,
      loginWithNaver,
      updateProfile,
      logout,
    }),
    [token, user, initializing, signup, loginWithKakao, loginWithNaver, updateProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
