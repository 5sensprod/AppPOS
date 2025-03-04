// src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, logout, isAuthenticated, user, error, loading } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return <div className="mt-4">Chargement...</div>;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-3">Authentification</h2>

      {isAuthenticated ? (
        <div>
          <p className="mb-2">
            Connecté en tant que: <span className="font-medium">{user.username}</span>
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Déconnexion
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="block mb-1">Nom d'utilisateur:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block mb-1">Mot de passe:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          {error && <p className="text-red-600 mb-3">{error}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Connexion
          </button>
        </form>
      )}
    </div>
  );
}

export default Login;
