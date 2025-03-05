// src/components/layout/MainLayout.jsx
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { themeManager } from '../../utils/themeManager';

const MainLayout = ({ children }) => {
  useEffect(() => {
    themeManager.initTheme();
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Votre Sidebar existant */}
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Nouvelle TopNavbar */}
        <TopNavbar />

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
