// src/components/layout/MainLayout.jsx
import React, { useMemo } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
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
        <ZoneNavigationHandler />
        {instructionsA11y}

        {/* Sidebar */}
        <Sidebar />

        {/* Contenu principal */}
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
    </AccessibilityProvider>
  );
};

export default React.memo(MainLayout);
