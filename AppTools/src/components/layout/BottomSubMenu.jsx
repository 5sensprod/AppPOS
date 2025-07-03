// src/components/layout/BottomSubMenu.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const BottomSubMenu = ({ items, parentItem, onClose, currentPath, parentIndex = 2 }) => {
  // Render sécurisé des icônes
  const renderIcon = (icon, iconProps = {}) => {
    if (!icon) {
      return <Home {...iconProps} />;
    }

    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, iconProps);
    }

    if (typeof icon === 'function') {
      const IconComponent = icon;
      return <IconComponent {...iconProps} />;
    }

    return <Home {...iconProps} />;
  };

  const isActive = (path) =>
    path === currentPath || (path !== '/' && currentPath.startsWith(path + '/'));

  // Position centrée sur le bouton parent
  const leftPosition = `${parentIndex * 20}%`;

  return (
    <div
      className="fixed z-30"
      data-submenu // ✅ AJOUT pour éviter la fermeture au clic
      style={{
        bottom: '70px', // Juste au-dessus de la bottom nav
        left: leftPosition,
        transform: 'translateX(-50%)', // Centrer sur le bouton parent
      }}
    >
      {/* Dropdown vertical compact */}
      <div className="flex flex-col-reverse gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
        {items.map((item, index) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-w-[140px]
                ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-200 shadow-md hover:bg-blue-50 dark:hover:bg-gray-700 hover:shadow-lg'
                }
                backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50
              `}
              style={{
                animationDelay: `${(items.length - index - 1) * 50}ms`, // Animation du bas vers le haut
              }}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icône */}
              {renderIcon(item.icon, {
                className: `w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`,
              })}

              {/* Label */}
              <span className="text-sm font-medium truncate">{item.label}</span>

              {/* Badge optionnel */}
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full min-w-[1rem] text-center">
                  {item.badge}
                </span>
              )}

              {/* Indicateur actif */}
              {active && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Flèche pointant vers le bouton parent */}
      <div className="flex justify-center mt-1">
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95 dark:border-t-gray-800/95"></div>
      </div>
    </div>
  );
};

export default BottomSubMenu;
