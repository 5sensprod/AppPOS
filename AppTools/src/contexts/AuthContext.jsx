// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1️⃣ Déclare logout AVANT le useEffect
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null);
    window.electronAPI.setAuthToken(null);
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await apiService.init();
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          apiService.setAuthToken(storedToken);
          window.electronAPI.setAuthToken(storedToken);
          const { data } = await apiService.get('/api/auth/me');
          setUser(data?.user || null);
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [logout]); // logout est maintenant défini

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      await apiService.init();
      const { data } = await apiService.post('/api/auth/login', { username, password });
      if (data.success) {
        localStorage.setItem('authToken', data.token);
        apiService.setAuthToken(data.token);
        window.electronAPI.setAuthToken(data.token);
        setUser(data.user);
        return true;
      } else {
        setError(data.message || 'Échec de la connexion');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
      return false;
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const { data } = await apiService.post('/api/auth/register', userData);
      return data.success;
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription");
      return false;
    }
  }, []);

  const hasRole = useCallback((role) => user?.role === role, [user]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
