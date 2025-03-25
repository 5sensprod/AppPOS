import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import ProductForm from './features/products/components/ProductForm';
import SuppliersPage from './features/suppliers/SuppliersPage';
import SupplierDetail from './features/suppliers/components/SupplierDetail';
import SupplierForm from './features/suppliers/components/SupplierForm';
import CategoriesPage from './features/categories/CategoriesPage';
import CategorieDetail from './features/categories/components/CategorieDetail';
import CategoryForm from './features/categories/components/CategoryForm';
import BrandsPage from './features/brands/BrandsPage';
import BrandDetail from './features/brands/components/BrandDetail';
import BrandForm from './features/brands/components/BrandForm';

// **Loader pour l'initialisation des services**
const Loader = ({ message }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  </div>
);

// **Route protégée qui vérifie l'authentification**
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader message="Chargement..." />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// **Routes dynamiques pour les entités**
const entityRoutes = [
  {
    path: 'products',
    component: ProductsPage,
    details: ProductDetail,
    form: ProductForm,
  },
  {
    path: 'products/categories',
    component: CategoriesPage,
    details: CategorieDetail,
    form: CategoryForm,
  },
  {
    path: 'products/suppliers',
    component: SuppliersPage,
    details: SupplierDetail,
    form: SupplierForm,
  },
  {
    path: 'products/brands',
    component: BrandsPage,
    details: BrandDetail,
    form: BrandForm,
  },
];

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [initializing, setInitializing] = useState(true);

  // Initialisation des services
  useEffect(() => {
    if (!isAuthenticated) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        await initializeServices();
      } catch (error) {
        console.error("Erreur lors de l'initialisation des services:", error);
      } finally {
        setInitializing(false);
      }
    })();
  }, [isAuthenticated]);

  if (isAuthenticated && initializing) return <Loader message="Initialisation des services..." />;

  return (
    <>
      {isAuthenticated}
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

        {entityRoutes.map(({ path, component: Component, details: Details, form: Form }) => (
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
            <Route
              path={`/${path}/new`}
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Form />
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
                    <Form />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </React.Fragment>
        ))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// **Tableau de bord**
const Dashboard = () => (
  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Tableau de bord</h1>
    <UpdateChecker />
    <NetworkAccess />
    <div className="mt-6">
      <ApiTest />
    </div>
  </div>
);

function App() {
  return <AppRoutes />;
}

export default App;
