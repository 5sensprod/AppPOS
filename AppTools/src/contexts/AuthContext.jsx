// src/contexts/AuthContext.jsx - NETTOYÉ SANS WEBSOCKET
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// 🔧 UTILITAIRES DE STOCKAGE
const getStorageType = () => (window.electronAPI ? 'localStorage' : 'sessionStorage');
const getStorage = () => (window.electronAPI ? localStorage : sessionStorage);

const setToken = (token) => {
  const storage = getStorage();
  if (token) {
    storage.setItem('authToken', token);
  } else {
    storage.removeItem('authToken');
  }
};

const getToken = () => getStorage().getItem('authToken');

const clearToken = () => {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = useCallback(() => {
    console.log('🚪 [AUTH] Déconnexion...');

    clearToken();
    apiService.setAuthToken(null);

    if (window.electronAPI?.setAuthToken) {
      window.electronAPI.setAuthToken(null);
    }

    try {
      if (window.wsManager) {
        window.wsManager.disconnect();
      }
      if (window.sessionStore) {
        window.sessionStore.reset();
      }
    } catch (error) {
      console.warn('⚠️ [AUTH] Erreur nettoyage WebSocket:', error);
    }

    setUser(null);
    setError(null);
    console.log('✅ [AUTH] Déconnexion terminée');
  }, []);

  // ✅ VÉRIFICATION SIMPLIFIÉE - Le backend gère tout
  const checkServerAndToken = useCallback(async () => {
    console.log(`🔍 [AUTH] Vérification avec ${getStorageType()}...`);

    try {
      await apiService.init();
      const serverTest = await apiService.testConnection();

      if (!serverTest.success) {
        console.warn('⚠️ [AUTH] Serveur inaccessible');
        clearToken();
        return false;
      }

      const storedToken = getToken();
      if (!storedToken) {
        console.log('ℹ️ [AUTH] Pas de token stocké');
        return false;
      }

      apiService.setAuthToken(storedToken);
      const { data } = await apiService.get('/api/auth/me');

      if (data?.user) {
        console.log('✅ [AUTH] Token valide, session restaurée');

        if (window.electronAPI?.setAuthToken) {
          window.electronAPI.setAuthToken(storedToken);
        }

        setUser(data.user);
        return true;
      } else {
        console.warn('⚠️ [AUTH] Réponse serveur invalide');
        clearToken();
        return false;
      }
    } catch (error) {
      console.error('❌ [AUTH] Erreur vérification:', error);

      // ✅ Le backend renvoie automatiquement 401 si serveur redémarré
      if (error.response?.status === 401) {
        console.log('🔄 [AUTH] Token invalidé par le serveur (redémarrage détecté)');
      }

      clearToken();
      apiService.setAuthToken(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        apiService.setLogoutCallback(logout);
        const isValid = await checkServerAndToken();

        if (!isValid) {
          console.log('ℹ️ [AUTH] Aucune session valide au démarrage');
        }
      } catch (error) {
        console.error("❌ [AUTH] Erreur d'initialisation:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const isElectron = !!window.electronAPI;

    if (isElectron) {
      // 📱 ELECTRON : Conservation token jusqu'à fermeture app
      const handleElectronClosing = () => {
        console.log('🔒 [AUTH] Fermeture Electron - suppression token');
        clearToken();
        if (window.electronAPI?.setAuthToken) {
          window.electronAPI.setAuthToken(null);
        }
      };

      const handleBeforeUnload = () => {
        console.log('🚪 [AUTH] beforeunload Electron');
        clearToken();
        if (window.electronAPI?.setAuthToken) {
          window.electronAPI.setAuthToken(null);
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      if (window.electronAPI?.on) {
        window.electronAPI.on('app-closing', handleElectronClosing);
      }

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (window.electronAPI?.off) {
          window.electronAPI.off('app-closing', handleElectronClosing);
        }
      };
    } else {
      // 🌐 NAVIGATEUR : sessionStorage = auto-nettoyage à fermeture onglet
      console.log('🌐 [AUTH] Mode navigateur - sessionStorage actif');

      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('🔒 [AUTH] Onglet caché');
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [logout, checkServerAndToken]);

  const login = useCallback(
    async (username, password) => {
      setError(null);
      setLoading(true);

      try {
        logout();
        await apiService.init();

        const { data } = await apiService.post('/api/auth/login', { username, password });

        if (data.success) {
          setToken(data.token);
          apiService.setAuthToken(data.token);

          if (window.electronAPI?.setAuthToken) {
            window.electronAPI.setAuthToken(data.token);
          }

          setUser(data.user);
          console.log(`✅ [AUTH] Connexion avec ${getStorageType()}`);
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
    checkServerAndToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
