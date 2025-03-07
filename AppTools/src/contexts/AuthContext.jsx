// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import apiService from '../services/api';

// Créer le contexte
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => useContext(AuthContext);

// Provider du contexte d'authentification
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialisation du contexte d'auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        await apiService.init();

        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          apiService.setAuthToken(storedToken);
          setToken(storedToken);

          try {
            const userData = await fetchCurrentUser();
            setUser(userData);
          } catch (userError) {
            console.log('Session expirée ou invalide, déconnexion...');
            logout(); // Déconnexion propre
          }
        }
      } catch (err) {
        console.error("Erreur d'initialisation:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Récupérer l'utilisateur actuel depuis l'API
  const fetchCurrentUser = async () => {
    try {
      const response = await apiService.get('/api/auth/me');
      return response.data.user;
    } catch (err) {
      console.error("Erreur lors de la récupération de l'utilisateur:", err);
      throw err;
    }
  };

  // Fonction de connexion
  // Dans le login
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);

      // S'assurer que l'API est bien configurée
      await apiService.init();

      const response = await apiService.post('/api/auth/login', { username, password });

      if (response.data.success) {
        const { token, user } = response.data;

        // Stocker le token et l'URL API pour les reconnexions
        localStorage.setItem('authToken', token);
        localStorage.setItem('apiBaseUrl', apiService.getBaseUrl());

        apiService.setAuthToken(token);

        setToken(token);
        setUser(user);
        return true;
      } else {
        setError(response.data.message || 'Échec de la connexion');
        return false;
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la connexion';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiService.post('/api/auth/register', userData);

      if (response.data.success) {
        return true;
      } else {
        setError(response.data.message || "Échec de l'inscription");
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Erreur lors de l'inscription";
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    // Supprimer le token du localStorage
    localStorage.removeItem('authToken');

    // Supprimer le token des en-têtes API
    apiService.setAuthToken(null);

    // Réinitialiser l'état
    setToken(null);
    setUser(null);
    setError(null);
  };

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // Valeur du contexte
  const value = {
    user,
    token,
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
