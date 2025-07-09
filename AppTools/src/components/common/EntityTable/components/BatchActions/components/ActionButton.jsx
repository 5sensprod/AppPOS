// components/ActionButton.jsx
import React, { useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useClickOutside } from '../hooks/useClickOutside';
import { useResponsiveDropdown } from '../hooks/useResponsiveDropdown';
import CategorySelector from '../../../../CategorySelector';

const ActionButton = ({ action, cfg, openDropdown, setOpenDropdown, syncStats }) => {
  const isOpen = openDropdown === action;
  const dropdownRef = useRef(null);

  // Hook pour gérer le positionnement responsive avec animations
  const { buttonRef, buttonRect, updateButtonPosition, isVisible, shouldRender } =
    useResponsiveDropdown(isOpen);

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

  // Si un composant personnalisé est défini, l'utiliser
  if (cfg.customComponent) {
    const CustomComponent = cfg.customComponent;
    return (
      <CustomComponent {...cfg.customProps} syncStats={syncStats} className={cfg.buttonClass} />
    );
  }

  // Action simple (bouton standard)
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
              minWidth: `${Math.max(buttonRect.width, 350)}px`,
            }}
          >
            {/* ✅ Condition pour afficher le bon composant selon l'action */}
            {cfg.isHierarchical ? (
              // Pour les catégories hiérarchiques
              <CategorySelector
                mode="single"
                value={''}
                onChange={(val) => {
                  cfg.onSelect(val);
                  toggleOpen();
                }}
                placeholder="Sélectionner une catégorie"
                allowRootSelection={true}
                showSearch={true}
                showCounts={true}
                autoFocusOpen={true}
                variant="portal"
                theme="elegant"
              />
            ) : (
              // Pour les options simples (statut, etc.)
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 max-h-60 overflow-y-auto">
                {cfg.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      cfg.onSelect(option.value);
                      toggleOpen();
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${option.color}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default ActionButton;
