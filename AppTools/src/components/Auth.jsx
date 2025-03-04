// src/components/Auth.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import apiService from '../services/api';

// Création du contexte d'authentification
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'auth
export const useAuth = () => useContext(AuthContext);

// Composant Provider pour l'authentification
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialiser le service API
        await apiService.init();

        // Récupérer le token stocké
        const token = localStorage.getItem('authToken');

        if (token) {
          // Configurer le header d'auth
          apiService.setAuthToken(token);

          try {
            // Vérifier si le token est valide en récupérant l'utilisateur
            const response = await apiService.get('/api/auth/me');
            setCurrentUser(response.data.user);
          } catch (err) {
            // Token invalide ou expiré
            console.warn('Session invalide:', err);
            localStorage.removeItem('authToken');
            apiService.setAuthToken(null);
          }
        }
      } catch (err) {
        console.error("Erreur d'initialisation auth:", err);
        setError('Impossible de se connecter au serveur');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fonction de connexion
  const login = async (username, password) => {
    setError(null);
    try {
      const response = await apiService.post('/api/auth/login', { username, password });

      // Stockage du token
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);

      // Configurer le header d'auth
      apiService.setAuthToken(token);

      // Mettre à jour l'état
      setCurrentUser(user);
      return true;
    } catch (err) {
      console.error('Erreur de connexion:', err);

      // Gérer différentes erreurs
      if (err.response && err.response.status === 401) {
        setError('Identifiants incorrects');
      } else {
        setError('Erreur de connexion au serveur');
      }
      return false;
    }
  };

  // Fonction d'inscription
  const register = async (username, password, role = 'user') => {
    setError(null);
    try {
      const response = await apiService.post('/api/auth/register', {
        username,
        password,
        role,
      });

      return { success: true, user: response.data.user };
    } catch (err) {
      console.error("Erreur d'inscription:", err);

      // Gérer différentes erreurs
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur lors de l'inscription");
      }

      return { success: false, error: error };
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('authToken');
    apiService.setAuthToken(null);
    setCurrentUser(null);

    // Déclencher un événement de déconnexion pour que d'autres composants puissent réagir
    window.dispatchEvent(new Event('userLogout'));
  };

  // Valeur du contexte
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Composant de formulaire de connexion/inscription
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, error, currentUser, logout, isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        const result = await register(username, password);
        if (result.success) {
          // Basculer vers le formulaire de connexion après inscription réussie
          setIsLogin(true);
          // Réinitialiser le mot de passe mais garder le nom d'utilisateur
          setPassword('');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher le profil utilisateur si connecté
  if (isAuthenticated) {
    return (
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-4">Profil utilisateur</h2>
        <p className="mb-2">
          <span className="font-semibold">Identifiant:</span> {currentUser.username}
        </p>
        <p className="mb-4">
          <span className="font-semibold">Rôle:</span> {currentUser.role}
        </p>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-xl font-semibold mb-4">{isLogin ? 'Connexion' : 'Inscription'}</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Identifiant
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
          {!isLogin && (
            <p className="text-red-500 text-xs italic mt-1">
              Le mot de passe doit contenir au moins 8 caractères
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Traitement...' : isLogin ? 'Se connecter' : "S'inscrire"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Auth;
