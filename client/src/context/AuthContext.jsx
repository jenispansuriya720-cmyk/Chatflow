import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chatflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('chatflow_token') || null);
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem('chatflow_user');
    const savedToken = localStorage.getItem('chatflow_token');
    return !Boolean(saved && savedToken);
  });

  // Validate token and refresh user profile in background on startup (stale-while-revalidate)
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (isMounted && res.data.success) {
          setUser(res.data.user);
          localStorage.setItem('chatflow_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Auth token validation failed, signing out...');
          logout();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (loginId, password, rememberMe = true) => {
    const res = await api.post('/auth/login', { loginId, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('chatflow_token', newToken);
      localStorage.setItem('chatflow_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    }
    return { success: false, message: res.data.message };
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('chatflow_token', newToken);
      localStorage.setItem('chatflow_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    }
    return { success: false, message: res.data.message };
  };

  const loginWithToken = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('chatflow_token', newToken);
    localStorage.setItem('chatflow_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('chatflow_token');
      localStorage.removeItem('chatflow_user');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('chatflow_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        loginWithToken,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
