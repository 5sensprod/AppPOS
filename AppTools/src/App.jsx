// src/App.jsx - Mise à jour avec les nouvelles routes + SESSION ZUSTAND
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SessionProvider } from './components/SessionSync'; // ✅ NOUVEAU : Provider Zustand
import { initializeServices } from './services/initServices';
import MainLayout from './components/layout/MainLayout';
import NetworkAccess from './components/NetworkAccess';

// Composants
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Login from './components/Login';

// Pages
import ProductsPage from './features/products/ProductsPage';
import ProductDetail from './features/products/components/ProductDetail';
import SuppliersPage from './features/suppliers/SuppliersPage';
import SupplierDetail from './features/suppliers/components/SupplierDetail';
import CategoriesPage from './features/categories/CategoriesPage';
import CategorieDetail from './features/categories/components/CategorieDetail';
import BrandsPage from './features/brands/BrandsPage';
import BrandDetail from './features/brands/components/BrandDetail';
import CashierPage from './features/pos/CashierPage';
import ReportsPage from './pages/ReportsPage';

// Pages de configuration
import SettingsPage from './pages/SettingsPage';
import LCDConfigPage from './pages/LCDConfigPage';
import PrinterConfigPage from './pages/PrinterConfigPage';

// Loader
const Loader = ({ message }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

// Route protégée
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader message="Chargement..." />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Routes dynamiques
const entityRoutes = [
  {
    path: 'products',
    component: ProductsPage,
    details: ProductDetail,
    bidirectional: true,
  },
  {
    path: 'products/categories',
    component: CategoriesPage,
    details: CategorieDetail,
    bidirectional: true,
  },
  {
    path: 'products/suppliers',
    component: SuppliersPage,
    details: SupplierDetail,
    bidirectional: true,
  },
  {
    path: 'products/brands',
    component: BrandsPage,
    details: BrandDetail,
    bidirectional: true,
  },
];

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        await initializeServices();
        console.log('✅ [APP] Services initialisés avec succès');
      } catch (error) {
        console.error("❌ [APP] Erreur lors de l'initialisation des services:", error);
      } finally {
        setInitializing(false);
      }
    })();
  }, [isAuthenticated]);

  if (isAuthenticated && initializing) return <Loader message="Initialisation des services..." />;

  return (
    // ✅ WRAPPER AVEC SESSION ZUSTAND
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ ROUTE CAISSE AVEC SESSION ZUSTAND */}
        <Route
          path="/caisse"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CashierPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rapports"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ReportsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {entityRoutes.map(({ path, component: Component, details: Details, bidirectional }) => (
          <React.Fragment key={path}>
            <Route
              path={`/${path}`}
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Component />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {bidirectional && (
              <>
                <Route
                  path={`/${path}/new`}
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Details />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={`/${path}/:id`}
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Details />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={`/${path}/:id/edit`}
                  element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Details />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
              </>
            )}
          </React.Fragment>
        ))}

        {/* Routes de configuration */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Routes individuelles pour accès direct (optionnel) */}
        <Route
          path="/settings/lcd"
          element={
            <ProtectedRoute>
              <MainLayout>
                <LCDConfigPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/printer"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PrinterConfigPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}

// ✅ DASHBOARD AVEC LOGS POUR DEBUG
const Dashboard = () => {
  useEffect(() => {
    console.log('📊 [DASHBOARD] Rendu du tableau de bord');
  }, []);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Tableau de bord</h1>
      <UpdateChecker />
      <NetworkAccess />
      <div className="mt-6">
        <ApiTest />
      </div>
    </div>
  );
};

// ✅ COMPOSANT PRINCIPAL AVEC SESSION PROVIDER
function App() {
  console.log("🚀 [APP] Démarrage de l'application avec Zustand Session");
  return <AppRoutes />;
}

export default App;
