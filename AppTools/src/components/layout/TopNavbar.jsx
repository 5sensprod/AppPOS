import React from 'react';
import { themeManager } from '../../utils/themeManager';
import { Bell, MessageCircle, HelpCircle, Sun, Moon, User } from 'lucide-react';

const TopNavbar = () => {
  const handleToggleTheme = () => {
    themeManager.toggleTheme();
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

          {/* Aide */}
          <button className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">
            <HelpCircle className="h-6 w-6" />
          </button>

          {/* Bouton toggle dark/light */}
          <button
            onClick={handleToggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            <Sun className="h-6 w-6 hidden dark:block" />
            <Moon className="h-6 w-6 block dark:hidden" />
          </button>

          {/* Profil utilisateur */}
          <div className="relative">
            <button className="flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">
              <User className="h-6 w-6 md:hidden" />
              <img
                src="https://via.placeholder.com/32"
                alt="User profile"
                className="h-8 w-8 rounded-full hidden md:block"
              />
              <span className="ml-2 hidden md:block">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
