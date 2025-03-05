import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar à gauche */}
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Navbar en haut */}
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
