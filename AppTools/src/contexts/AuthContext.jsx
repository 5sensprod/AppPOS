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
        // Initialiser le service API
        await apiService.init();

        // Vérifier si un token existe dans le localStorage
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          // Définir le token dans le service API
          apiService.setAuthToken(storedToken);
          setToken(storedToken);

          // Récupérer les informations de l'utilisateur
          const userData = await fetchCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error("Erreur lors de l'initialisation de l'authentification:", err);
        setError("Échec de l'initialisation de l'authentification");
        // En cas d'erreur, on nettoie les données d'authentification
        logout();
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
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await apiService.post('/api/auth/login', { username, password });

      if (response.data.success) {
        // Stocker le token
        const { token, user } = response.data;
        localStorage.setItem('authToken', token);
        apiService.setAuthToken(token);

        // Mettre à jour l'état
        setToken(token);
        setUser(user);
        return true;
      } else {
        setError(response.data.message || 'Échec de la connexion');
        return false;
      }
    } catch (err) {
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
