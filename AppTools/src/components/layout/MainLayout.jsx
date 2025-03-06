// src/components/layout/MainLayout.jsx
import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../contexts/AuthContext';
import { AccessibilityProvider } from '../../contexts/AccessibilityProvider';
import ZoneNavigationHandler from '../accessibility/ZoneNavigationHandler';

const MainLayout = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <AccessibilityProvider>
      <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        {/* Composant pour gérer la navigation entre zones */}
        <ZoneNavigationHandler />

        {/* Lecteur d'écran seulement - instructions d'accessibilité */}
        <div className="sr-only" aria-live="polite">
          Utilisez F6 pour naviguer entre les différentes zones de l'application. Utilisez les
          flèches pour naviguer au sein d'une zone.
        </div>

        {/* Sidebar à gauche */}
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Navbar en haut */}
          <TopNavbar />

          {/* Contenu principal */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-200"
            tabIndex="-1"
            role="main"
          >
            {children}
          </main>
        </div>
      </div>
    </AccessibilityProvider>
  );
};

export default MainLayout;
