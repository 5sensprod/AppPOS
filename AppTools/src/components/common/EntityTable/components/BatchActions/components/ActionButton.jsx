// components/ActionButton.jsx
import React from 'react';
import { useButtonPosition } from '../hooks/useButtonPosition';
import MenuPortal from './MenuPortal';
import HierarchicalCategorySelector from './HierarchicalCategorySelector';

const ActionButton = ({ action, cfg, openDropdown, setOpenDropdown, hierarchicalData }) => {
  const isOpen = openDropdown === action;
  const { buttonRef, buttonRect } = useButtonPosition(isOpen);

  const toggleOpen = () => setOpenDropdown(isOpen ? null : action);

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
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
        aria-label={cfg.label}
      >
        <cfg.icon className="h-4 w-4 mr-1" />
        {cfg.label}
      </button>

      <MenuPortal isOpen={isOpen} buttonRect={buttonRect}>
        <div id={`${action}-dropdown-portal`}>
          {cfg.isHierarchical ? (
            <HierarchicalCategorySelector
              hierarchicalData={hierarchicalData}
              onSelect={cfg.onSelect}
              isOpen={isOpen}
              onToggle={toggleOpen}
              placeholder="Sélectionner une catégorie"
            />
          ) : (
            <div className="rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="py-1 max-h-64 overflow-y-auto">
                {cfg.options.map((opt, index) => (
                  <button
                    key={opt.value}
                    onClick={() => cfg.onSelect(opt.value)}
                    className={`w-full text-left px-4 py-2 text-sm ${opt.color} transition-all hover:bg-gray-50 dark:hover:bg-gray-700`}
                    style={{
                      animationDelay: `${index * 30}ms`,
                      animation: isOpen
                        ? 'dropdownItemIn 200ms forwards'
                        : 'dropdownItemOut 200ms forwards',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </MenuPortal>
    </div>
  );
};

export default ActionButton;
