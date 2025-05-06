// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiService from '../services/api';

// Création du contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => useContext(AuthContext);

// Provider du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction de déconnexion définie avant useEffect
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null);

    // S'assurer que window.electronAPI existe avant de l'utiliser
    if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
      window.electronAPI.setAuthToken(null);
    }

    setUser(null);
    setError(null);
  }, []);

  // Initialisation de l'authentification
  useEffect(() => {
    const initAuth = async () => {
      try {
        await apiService.init();
        const storedToken = localStorage.getItem('authToken');

        if (storedToken) {
          apiService.setAuthToken(storedToken);

          // S'assurer que window.electronAPI existe avant de l'utiliser
          if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
            window.electronAPI.setAuthToken(storedToken);
            console.log('Token envoyé au processus principal');
          } else {
            console.warn("electronAPI.setAuthToken n'est pas disponible");
          }

          const { data } = await apiService.get('/api/auth/me');
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error("Erreur d'initialisation de l'auth:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  // Fonction de connexion
  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      await apiService.init();
      const { data } = await apiService.post('/api/auth/login', { username, password });

      if (data.success) {
        localStorage.setItem('authToken', data.token);
        apiService.setAuthToken(data.token);

        // S'assurer que window.electronAPI existe avant de l'utiliser
        if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
          window.electronAPI.setAuthToken(data.token);
          console.log('Token de connexion envoyé au processus principal');
        } else {
          console.warn("electronAPI.setAuthToken n'est pas disponible lors du login");
        }

        setUser(data.user);
        return true;
      } else {
        setError(data.message || 'Échec de la connexion');
        return false;
      }
    } catch (err) {
      console.error('Erreur de login:', err);
      setError(err.response?.data?.message || 'Erreur de connexion');
      return false;
    }
  }, []);

  // Reste du code inchangé...
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
