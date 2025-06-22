// src/contexts/AuthContext.jsx - VERSION SIMPLIFIÉE
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction de déconnexion simplifiée
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null);

    // Nettoyer Electron API si disponible
    if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
      window.electronAPI.setAuthToken(null);
    }

    setUser(null);
    setError(null);

    console.log('✅ [AUTH] Déconnexion terminée');
  }, []);

  // Initialisation simplifiée
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Configurer le callback de déconnexion
        apiService.setLogoutCallback(logout);

        await apiService.init();
        const storedToken = localStorage.getItem('authToken');

        if (storedToken) {
          apiService.setAuthToken(storedToken);

          if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
            window.electronAPI.setAuthToken(storedToken);
          }

          try {
            const { data } = await apiService.get('/api/auth/me');
            setUser(data?.user || null);
            console.log('✅ [AUTH] Session restaurée');
          } catch (error) {
            console.error('❌ [AUTH] Token invalide:', error);
            logout();
          }
        }
      } catch (error) {
        console.error("❌ [AUTH] Erreur d'initialisation:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 🔒 NETTOYAGE DU TOKEN À LA FERMETURE DU PROGRAMME
    const handleBeforeUnload = (event) => {
      console.log('🚪 [AUTH] Fermeture programme - suppression du token');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');

      // Nettoyer Electron si disponible
      if (window.electronAPI?.setAuthToken) {
        window.electronAPI.setAuthToken(null);
      }

      // Pour Electron, pas besoin de preventDefault
      if (!window.electronAPI) {
        // Pour navigateur web classique
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // 🔒 NETTOYAGE À LA PERTE DE FOCUS (optionnel - pour sécurité renforcée)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔒 [AUTH] Application cachée - token conservé');
        // Ne pas supprimer le token ici, juste pour le logging
      }
    };

    // Écouter les événements de fermeture
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logout]);

  // Fonction de connexion simplifiée
  const login = useCallback(
    async (username, password) => {
      setError(null);
      setLoading(true);

      try {
        // Nettoyer d'abord
        logout();

        await apiService.init();
        const { data } = await apiService.post('/api/auth/login', { username, password });

        if (data.success) {
          localStorage.setItem('authToken', data.token);
          apiService.setAuthToken(data.token);

          if (window.electronAPI && typeof window.electronAPI.setAuthToken === 'function') {
            window.electronAPI.setAuthToken(data.token);
          }

          setUser(data.user);
          console.log('✅ [AUTH] Connexion réussie');
          return true;
        } else {
          setError(data.message || 'Échec de la connexion');
          return false;
        }
      } catch (err) {
        console.error('❌ [AUTH] Erreur de login:', err);
        setError(err.response?.data?.message || 'Erreur de connexion');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [logout]
  );

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
