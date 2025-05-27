// components/ActionButton.jsx - Version avec hook d'animation centralisé
import React, { useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useClickOutside } from '../hooks/useClickOutside';
import { useResponsiveDropdown } from '../hooks/useResponsiveDropdown';
import { useDropdownItemAnimation } from '../hooks/useDropdownItemAnimation';
import { injectDropdownStyles } from '../styles/dropdownStyles';
import HierarchicalCategorySelector from './HierarchicalCategorySelector';

const ActionButton = ({ action, cfg, openDropdown, setOpenDropdown, hierarchicalData }) => {
  const isOpen = openDropdown === action;
  const dropdownRef = useRef(null);

  // Hook pour gérer le positionnement responsive avec animations
  const { buttonRef, buttonRect, updateButtonPosition, isVisible, shouldRender } =
    useResponsiveDropdown(isOpen);

  // Hook pour l'animation des items (seulement pour le dropdown simple)
  const { getItemAnimation } = useDropdownItemAnimation(isVisible, cfg.options?.length || 0);

  // Fonction pour fermer le dropdown
  const closeDropdown = useCallback(() => {
    setOpenDropdown(null);
  }, [setOpenDropdown]);

  // Fonction pour basculer l'état du dropdown
  const toggleOpen = () => {
    if (!isOpen) {
      updateButtonPosition();
    }
    setOpenDropdown(isOpen ? null : action);
  };

  // Utiliser useClickOutside
  useClickOutside(dropdownRef, isOpen, closeDropdown, buttonRef);

  // Injecter les styles d'animation au montage du composant
  useEffect(() => {
    injectDropdownStyles();
  }, []);

  // Action simple (bouton)
  if (!cfg.options && !cfg.isHierarchical) {
    return (
      <button
        onClick={cfg.onAction}
        className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
        aria-label={cfg.label}
      >
        <cfg.icon className="h-4 w-4 mr-1" />
        {cfg.label}
      </button>
    );
  }

  // Action avec dropdown
  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
        aria-label={cfg.label}
      >
        <cfg.icon className="h-4 w-4 mr-1" />
        {cfg.label}
      </button>

      {/* Portal avec animation moderne de fermeture */}
      {shouldRender &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            className={`fixed z-[100000] transition-all duration-200 ease-out origin-top ${
              isVisible
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 -translate-y-1'
            }`}
            style={{
              top: `${buttonRect.bottom + 4}px`,
              left: `${buttonRect.left}px`,
              minWidth: `${Math.max(buttonRect.width, 200)}px`,
            }}
          >
            {cfg.isHierarchical ? (
              <HierarchicalCategorySelector
                hierarchicalData={hierarchicalData}
                onSelect={cfg.onSelect}
                isOpen={isVisible}
                onToggle={toggleOpen}
                placeholder="Sélectionner une catégorie"
              />
            ) : (
              <div className="rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="py-1 max-h-64 overflow-y-auto">
                  {cfg.options.map((opt, index) => {
                    const animation = getItemAnimation(index, {
                      baseClasses: `w-full text-left px-4 py-2 text-sm ${opt.color}`,
                      hoverClasses: 'hover:bg-gray-50 dark:hover:bg-gray-700',
                    });

                    return (
                      <button
                        key={opt.value}
                        onClick={() => cfg.onSelect(opt.value)}
                        className={animation.className}
                        style={animation.style}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default ActionButton;
