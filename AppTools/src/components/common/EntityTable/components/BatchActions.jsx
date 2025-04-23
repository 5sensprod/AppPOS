import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  FileText,
  ListFilter,
  Folder,
  FileOutput,
  FileSearch,
} from 'lucide-react';

// Generic dropdown component without clsx
const Dropdown = ({
  buttonLabel,
  buttonIcon: Icon,
  isOpen,
  toggleOpen,
  options,
  onSelect,
  buttonClass,
  menuClass,
}) => (
  <div className="relative">
    <button
      onClick={toggleOpen}
      className={`px-3 py-1 rounded-md flex items-center text-sm ${buttonClass}`}
      aria-label={buttonLabel}
    >
      {Icon && <Icon className="h-4 w-4 mr-1" />}
      {buttonLabel}
    </button>

    {isOpen && (
      <div className={`absolute right-0 z-10 mt-1 ${menuClass}`}>
        <div className="py-1 max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelect(opt.value);
              }}
              className={`w-full text-left px-4 py-2 text-sm ${opt.color}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

export const BatchActions = ({
  selectedItems = [],
  entityName = '',
  entityNamePlural = '',
  batchActions = ['delete', 'sync', 'export', 'status', 'category', 'createSheet'],
  onBatchDelete,
  onBatchSync,
  onBatchExport,
  onBatchStatusChange,
  onBatchCategoryChange,
  onCreateSheet,
  categoryOptions = [],
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  if (!selectedItems.length) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  // Dropdown variants
  const statusOptions = [
    {
      value: 'published',
      label: 'Publié',
      color: 'bg-green-100 text-green-800 hover:bg-green-200',
    },
    { value: 'draft', label: 'Brouillon', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { value: 'archived', label: 'Archivé', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
  ];

  const actionsConfig = {
    createSheet: {
      available: typeof onCreateSheet === 'function',
      icon: FileOutput,
      label: 'Créer fiche',
      buttonClass: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
      onAction: () => onCreateSheet(selectedItems),
    },
    category: {
      available: categoryOptions.length > 0 && typeof onBatchCategoryChange === 'function',
      icon: Folder,
      label: 'Catégorie',
      buttonClass: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800',
      menuClass:
        'w-48 rounded-md bg-white shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      options: categoryOptions,
      onSelect: (value) => {
        onBatchCategoryChange(selectedItems, value);
        setOpenDropdown(null);
      },
    },
    status: {
      available: typeof onBatchStatusChange === 'function',
      icon: ListFilter,
      label: 'Statut',
      buttonClass: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
      menuClass:
        'w-48 rounded-md bg-white shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      options: statusOptions,
      onSelect: (value) => {
        onBatchStatusChange(selectedItems, value);
        setOpenDropdown(null);
      },
    },
    export: {
      available: typeof onBatchExport === 'function',
      icon: FileText,
      label: 'Exporter',
      buttonClass: 'bg-green-100 hover:bg-green-200 text-green-800',
      onAction: () => onBatchExport(selectedItems),
    },
    delete: {
      available: typeof onBatchDelete === 'function',
      icon: Trash2,
      label: 'Supprimer',
      buttonClass: 'bg-red-100 hover:bg-red-200 text-red-800',
      onAction: onBatchDelete,
    },
    sync: {
      available: typeof onBatchSync === 'function',
      icon: RefreshCw,
      label: 'Synchroniser',
      buttonClass: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
      onAction: onBatchSync,
    },
    captureContent: {
      available: typeof onCaptureContent === 'function',
      icon: FileSearch, // Importez cette icône
      label: 'Capture de contenu',
      buttonClass: 'bg-teal-100 hover:bg-teal-200 text-teal-800',
      onAction: () => onCaptureContent(selectedItems),
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
      <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
        <span className="font-semibold">{selectedCount}</span> {itemLabel}
      </div>

      <div className="flex space-x-2">
        {batchActions.map((action) => {
          const cfg = actionsConfig[action];
          if (!cfg || !cfg.available) return null;

          return cfg.options ? (
            <Dropdown
              key={action}
              buttonLabel={cfg.label}
              buttonIcon={cfg.icon}
              isOpen={openDropdown === action}
              toggleOpen={() => setOpenDropdown(openDropdown === action ? null : action)}
              options={cfg.options}
              onSelect={cfg.onSelect}
              buttonClass={cfg.buttonClass}
              menuClass={cfg.menuClass}
            />
          ) : (
            <button
              key={action}
              onClick={cfg.onAction}
              className={`px-3 py-1 rounded-md flex items-center text-sm ${cfg.buttonClass}`}
              aria-label={cfg.label}
            >
              <cfg.icon className="h-4 w-4 mr-1" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BatchActions;
