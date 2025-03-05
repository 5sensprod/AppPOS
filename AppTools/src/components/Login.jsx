import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, logout, isAuthenticated, user, error, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return <div className="mt-4 text-gray-800 dark:text-gray-200">Chargement...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Authentification</h2>

        {isAuthenticated ? (
          <div className="text-gray-800 dark:text-white">
            <p className="mb-2">
              Connecté en tant que: <span className="font-medium">{user.username}</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Déconnexion
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Accéder à l'application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block mb-1 text-gray-700 dark:text-gray-300">
                Nom d'utilisateur:
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-gray-700 dark:text-gray-300">Mot de passe:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
                required
              />
            </div>
            {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
