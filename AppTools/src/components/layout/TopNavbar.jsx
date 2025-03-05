// src/components/layout/TopNavbar.jsx - Intégration avec votre AuthContext
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { themeManager } from '../../utils/themeManager';
import { Bell, MessageCircle, Sun, Moon, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TopNavbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleToggleTheme = () => {
    themeManager.toggleTheme();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo ou titre */}
        <div className="font-bold text-xl text-gray-800 dark:text-white">AppStock</div>

        {/* Navigation et actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
            <Bell className="h-6 w-6" />
          </button>

          {/* Messages */}
          <button className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
            <MessageCircle className="h-6 w-6" />
          </button>

          {/* Bouton toggle dark/light */}
          <button
            onClick={handleToggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            <Sun className="h-6 w-6 hidden dark:block" />
            <Moon className="h-6 w-6 block dark:hidden" />
          </button>

          {/* Profil utilisateur et déconnexion */}
          {isAuthenticated && (
            <div className="relative flex items-center">
              <div className="flex items-center text-gray-700 dark:text-gray-200 mr-3">
                <User className="h-6 w-6 md:hidden" />
                <span className="ml-2 hidden md:block">{user.username || 'Utilisateur'}</span>
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
