import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Temporary token issued after signup, before biometric verification completes
  const [pendingToken, setPendingToken] = useState(null);

  const loadMe = async () => {
    const token = localStorage.getItem('pb_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('pb_access_token');
      localStorage.removeItem('pb_refresh_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const signup = async (formData) => {
    const { data } = await api.post('/auth/signup', formData);
    setPendingToken(data.pendingToken);
    return data;
  };

  const completeBiometricSignup = async (faceCaptureToken, deviceFingerprint) => {
    const { data } = await api.post(
      '/auth/biometric/register',
      { faceCaptureToken, deviceFingerprint },
      { headers: { Authorization: `Bearer ${pendingToken}` } }
    );
    localStorage.setItem('pb_access_token', data.accessToken);
    localStorage.setItem('pb_refresh_token', data.refreshToken);
    setUser(data.user);
    setPendingToken(null);
    return data;
  };

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    if (data.pendingToken) {
      setPendingToken(data.pendingToken);
      return data; // needs biometric verification
    }
    localStorage.setItem('pb_access_token', data.accessToken);
    localStorage.setItem('pb_refresh_token', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const biometricLogin = async (faceCaptureToken) => {
    const { data } = await api.post('/auth/biometric/login', { faceCaptureToken });
    localStorage.setItem('pb_access_token', data.accessToken);
    localStorage.setItem('pb_refresh_token', data.refreshToken);
    setUser(data.user);
    return data;
  };

  /**
   * Used by OTP login (and any future external-verification flow) to
   * finalize a session once the backend has already issued tokens +
   * the user object. Mirrors exactly what login()/biometricLogin() do,
   * so ProtectedRoute's `user` check passes immediately without a
   * full page reload or extra /auth/me round trip.
   */
  const setSessionFromTokens = (data) => {
    localStorage.setItem('pb_access_token', data.accessToken);
    localStorage.setItem('pb_refresh_token', data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('pb_refresh_token');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    }
    localStorage.removeItem('pb_access_token');
    localStorage.removeItem('pb_refresh_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        pendingToken,
        signup,
        completeBiometricSignup,
        login,
        biometricLogin,
        setSessionFromTokens,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
