// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Login from './components/Login';
import Products from './components/Products';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';

// Route protégée qui vérifie l'authentification
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (!isAuthenticated) {
    // Rediriger vers la page de connexion si non authentifié
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Composant principal qui gère les routes
function AppRoutes() {
  return (
    <Routes>
      {/* Page de connexion - accessible sans authentification */}
      <Route path="/login" element={<Login />} />

      {/* Routes protégées - nécessitent une authentification */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Tableau de bord
                </h1>
                <UpdateChecker />
                <div className="mt-6">
                  <ApiTest />
                </div>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Route produits */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Products />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Routes pour les autres sections */}
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <MainLayout>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Gestion des ventes
                </h1>
                <p className="text-gray-600 dark:text-gray-300">Page en construction</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Rapports</h1>
                <p className="text-gray-600 dark:text-gray-300">Page en construction</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Paramètres
                </h1>
                <p className="text-gray-600 dark:text-gray-300">Page en construction</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirection des routes inconnues vers l'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
