import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './AuthContext';
import api from '../../utils/api';
import urlConfig from '../../utils/urlConfig';

/**
 * Keeps track of the logged-in user.
 * The JWT itself lives in an httpOnly cookie that JavaScript cannot read,
 * so on page load we ask the API "who am I?" (/api/auth/me).
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    api
      .get(urlConfig.ME_URL)
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post(urlConfig.LOGIN_URL, { email, password });
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const signup = useCallback(async (details) => {
    const res = await api.post(urlConfig.SIGNUP_URL, details);
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.get(urlConfig.LOGOUT_URL);
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      isAdmin: user?.role === 'admin',
      canManageProducts: user?.role === 'admin' || user?.role === 'seller',
      login,
      signup,
      logout,
      setAuth: setUser,
    }),
    [user, isAuthLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
