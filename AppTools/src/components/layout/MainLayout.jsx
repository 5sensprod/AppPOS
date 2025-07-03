// src/components/layout/MainLayout.jsx
import React, { useMemo } from 'react';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import TopNavbar from './TopNavbar';
import ToastContainer from '../common/EntityTable/components/BatchActions/components/ToastContainer';
import { AccessibilityProvider } from '../../contexts/AccessibilityProvider';
import ZoneNavigationHandler from '../accessibility/ZoneNavigationHandler';

const MainLayout = ({ children }) => {
  // Instructions d'accessibilité, mémorisées pour éviter les re-renders
  const instructionsA11y = useMemo(
    () => (
      <div className="sr-only" aria-live="polite">
        Utilisez F6 pour naviguer entre les différentes zones de l'application. Utilisez les flèches
        pour naviguer au sein d'une zone.
      </div>
    ),
    []
  );

  return (
    <AccessibilityProvider>
      <div className="flex h-screen bg-white dark:bg-gray-900">
        {instructionsA11y}
        <ZoneNavigationHandler />

        {/* ✅ Sidebar - Masquée sur mobile avec CSS */}
        <Sidebar className="hidden lg:flex" />

        {/* ✅ Contenu principal - S'adapte automatiquement */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* ✅ TopNavbar - Toujours visible */}
          <TopNavbar />

          {/* ✅ Main content - UNE SEULE INSTANCE */}
          <main
            id="main-content"
            className={`
              flex-1 overflow-y-auto p-4 
              bg-gray-50 dark:bg-gray-800 
              transition-colors duration-200
              pb-4
              lg:pb-4
            `}
            tabIndex="-1"
            role="main"
          >
            {children}
          </main>

          {/* ✅ Bottom Navigation - Visible uniquement sur mobile */}
          <BottomNavigation className="lg:hidden" />
        </div>

        {/* ✅ Toast Container Global */}
        <ToastContainer />
      </div>
    </AccessibilityProvider>
  );
};

export default React.memo(MainLayout);
