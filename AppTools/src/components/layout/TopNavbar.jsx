// src/components/layout/TopNavbar.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { themeManager } from '../../utils/themeManager';
import { Bell, MessageCircle, Sun, Moon, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMenu } from '../menu/useMenu';
import TopMenuItem from '../menu/TopMenuItem';
import { useAccessibility } from '../../contexts/AccessibilityProvider';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

const TopNavbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { topMenuItems } = useMenu();
  const { handleActivateMenu, setActiveZone } = useAccessibility();
  const navigate = useNavigate();

  // Configuration de la navigation clavier horizontale
  useKeyboardNavigation({
    direction: 'horizontal',
    onActivate: handleActivateMenu,
    containerId: 'top-menu',
    selector: 'button[role="menuitem"], a[role="menuitem"], [tabindex]:not([tabindex="-1"])',
  });

  // Définir la zone active au focus
  useEffect(() => {
    const topMenu = document.getElementById('top-menu');

    const handleFocus = () => {
      setActiveZone('topnav');
    };

    if (topMenu) {
      topMenu.addEventListener('focusin', handleFocus);
      return () => {
        topMenu.removeEventListener('focusin', handleFocus);
      };
    }
  }, [setActiveZone]);

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
        <nav id="top-menu" role="menubar" aria-label="Menu supérieur">
          <div className="flex items-center space-x-4">
            {/* Menu top items dynamiques */}
            {topMenuItems.map((item) => (
              <TopMenuItem key={item.id} item={item} />
            ))}

            {/* Notifications */}
            <button
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              aria-label="Notifications"
              role="menuitem"
              data-menu-id="notifications"
            >
              <Bell className="h-6 w-6" />
            </button>

            {/* Messages */}
            <button
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              aria-label="Messages"
              role="menuitem"
              data-menu-id="messages"
            >
              <MessageCircle className="h-6 w-6" />
            </button>

            {/* Bouton toggle dark/light */}
            <button
              onClick={handleToggleTheme}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              aria-label="Changer le thème"
              role="menuitem"
              data-menu-id="theme-toggle"
            >
              <Sun className="h-6 w-6 hidden dark:block" />
              <Moon className="h-6 w-6 block dark:hidden" />
            </button>

            {/* Profil utilisateur et déconnexion */}
            {isAuthenticated && (
              <div className="relative flex items-center" role="none">
                <div
                  className="flex items-center text-gray-700 dark:text-gray-200 mr-3"
                  aria-label="Profil utilisateur"
                  role="menuitem"
                  tabIndex={0}
                  data-menu-id="user-profile"
                >
                  <User className="h-6 w-6 md:hidden" />
                  <span className="ml-2 hidden md:block">{user.username || 'Utilisateur'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
                  aria-label="Déconnexion"
                  role="menuitem"
                  data-menu-id="logout"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default TopNavbar;
