// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import NetworkAccess from './components/NetworkAccess';
import { initializeServices } from './services/initServices';

// Importation des nouvelles pages de produits
import ProductsPage from './features/products/ProductsPage';
import ProductDetail from './features/products/components/ProductDetail';
import ProductForm from './features/products/components/ProductForm';

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
  const { isAuthenticated } = useAuth();
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Initialiser les services (imageProxyService) au démarrage
  useEffect(() => {
    async function initServices() {
      try {
        if (isAuthenticated) {
          const success = await initializeServices();
          setServicesInitialized(success);
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation des services:", error);
      } finally {
        setInitializing(false);
      }
    }

    if (isAuthenticated) {
      initServices();
    } else {
      setInitializing(false);
    }
  }, [isAuthenticated]);

  // Afficher un loader pendant l'initialisation des services
  if (isAuthenticated && initializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Initialisation des services...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Afficher NetworkAccess uniquement si authentifié */}
      {isAuthenticated && <NetworkAccess />}

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

        {/* Nouvelles routes produits avec notre architecture basée sur les factories */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProductsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProductForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProductDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProductForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Routes pour les autres entités (à convertir ultérieurement) */}
        <Route
          path="/products/categories"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Catégories de produits
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">Gestion des catégories</p>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/suppliers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Fournisseurs
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">Gestion des fournisseurs</p>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/brands"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Marques</h1>
                  <p className="text-gray-600 dark:text-gray-300">Gestion des marques</p>
                </div>
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
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Rapports
                  </h1>
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
    </>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
