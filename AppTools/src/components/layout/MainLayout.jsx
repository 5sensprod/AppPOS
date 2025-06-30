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
      <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
        {instructionsA11y}
        <ZoneNavigationHandler />

        {/* Desktop Layout - Seulement pour les grands écrans */}
        <div className="hidden lg:flex h-full">
          {/* Sidebar Desktop */}
          <Sidebar />

          {/* Contenu principal Desktop */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopNavbar />
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

        {/* Mobile Layout - Pour tablettes et mobiles */}
        <div className="flex flex-col h-full lg:hidden">
          {/* TopNavbar Mobile */}
          <TopNavbar />

          {/* Contenu principal Mobile */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-200"
            tabIndex="-1"
            role="main"
          >
            {children}
          </main>

          {/* Bottom Navigation Mobile */}
          <BottomNavigation />
        </div>

        {/* ✅ TOAST CONTAINER GLOBAL */}
        <ToastContainer />
      </div>
    </AccessibilityProvider>
  );
};

export default React.memo(MainLayout);
