// src/components/layout/TopNavbar.jsx
import React, { useCallback } from 'react';
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
  const { handleActivateMenu } = useAccessibility();
  const navigate = useNavigate();

  useKeyboardNavigation({
    direction: 'horizontal',
    onActivate: handleActivateMenu,
    containerId: 'top-menu',
    selector: 'button[role="menuitem"], a[role="menuitem"], [tabindex]:not([tabindex="-1"])',
  });

  const handleToggleTheme = useCallback(() => themeManager.toggleTheme(), []);
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-xl text-gray-800 dark:text-white">AppStock</div>

        {/* Navigation */}
        <nav id="top-menu" role="menubar" aria-label="Menu supérieur">
          <div className="flex items-center space-x-4">
            {topMenuItems.map((item) => (
              <TopMenuItem key={item.id} item={item} />
            ))}

            {/* Notifications & Messages */}
            {[
              { id: 'notifications', Icon: Bell },
              { id: 'messages', Icon: MessageCircle },
            ].map(({ id, Icon }) => (
              <button
                key={id}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                aria-label={id}
                role="menuitem"
                data-menu-id={id}
              >
                <Icon className="h-6 w-6" />
              </button>
            ))}

            {/* Changer le thème */}
            <button
              onClick={handleToggleTheme}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              aria-label="Changer le thème"
              role="menuitem"
              data-menu-id="theme-toggle"
            >
              <Sun className="h-6 w-6 dark:hidden" />
              <Moon className="h-6 w-6 hidden dark:block" />
            </button>

            {/* Profil utilisateur et déconnexion */}
            {isAuthenticated && (
              <div className="relative flex items-center">
                <div
                  className="flex items-center text-gray-700 dark:text-gray-200 cursor-pointer"
                  aria-label="Profil utilisateur"
                  role="menuitem"
                  data-menu-id="user-profile"
                >
                  <User className="h-6 w-6 md:hidden" />
                  <span className="ml-2 hidden md:block">{user?.username || 'Utilisateur'}</span>
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

export default React.memo(TopNavbar);
