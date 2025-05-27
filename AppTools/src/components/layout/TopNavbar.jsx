// src/components/layout/TopNavbar.jsx
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { themeManager } from '../../utils/themeManager';
import { Bell, MessageCircle, Sun, Moon, User, LogOut, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  }, [logout, navigate]);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="font-bold text-xl text-gray-800 dark:text-white">AppStock</div>

          {/* Desktop Navigation */}
          <nav id="top-menu" role="menubar" aria-label="Menu supérieur" className="hidden lg:block">
            <div className="flex items-center space-x-4">
              {topMenuItems.map((item) => (
                <TopMenuItem key={item.id} item={item} />
              ))}

              {/* Notifications & Messages */}
              {[
                { id: 'notifications', Icon: Bell, label: 'Notifications' },
                { id: 'messages', Icon: MessageCircle, label: 'Messages' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                  aria-label={label}
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
                <div className="relative flex items-center space-x-2">
                  <div
                    className="flex items-center text-gray-700 dark:text-gray-200 cursor-pointer"
                    aria-label="Profil utilisateur"
                    role="menuitem"
                    data-menu-id="user-profile"
                  >
                    <User className="h-6 w-6" />
                    <span className="ml-2">{user?.username || 'Utilisateur'}</span>
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

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-2 lg:hidden">
            {/* Notifications mobiles (icônes seulement) */}
            <button
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white p-2"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white p-2"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl z-40 lg:hidden transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="Fermer le menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Profil utilisateur */}
                  {isAuthenticated && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <User className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.username || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Connecté</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      className="w-full flex items-center p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      aria-label="Messages"
                    >
                      <MessageCircle className="h-5 w-5 mr-3" />
                      Messages
                    </button>

                    <button
                      onClick={handleToggleTheme}
                      className="w-full flex items-center p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      aria-label="Changer le thème"
                    >
                      <Sun className="h-5 w-5 mr-3 dark:hidden" />
                      <Moon className="h-5 w-5 mr-3 hidden dark:block" />
                      Changer le thème
                    </button>

                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        aria-label="Déconnexion"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Déconnexion
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default React.memo(TopNavbar);
