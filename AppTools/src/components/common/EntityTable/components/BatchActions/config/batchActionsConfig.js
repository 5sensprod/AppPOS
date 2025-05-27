// config/batchActionsConfig.js
import {
  Trash2,
  RefreshCw,
  FileText,
  ListFilter,
  Folder,
  FileOutput,
  FileSearch,
  Check,
} from 'lucide-react';

export const STATUS_OPTIONS = [
  {
    value: 'published',
    label: 'Publié',
    color: 'text-gray-900 dark:text-gray-100', // Style neutre sans couleur de fond
  },
  {
    value: 'draft',
    label: 'Brouillon',
    color: 'text-gray-900 dark:text-gray-100', // Style neutre sans couleur de fond
  },
  {
    value: 'archived',
    label: 'Archivé',
    color: 'text-gray-900 dark:text-gray-100', // Style neutre sans couleur de fond
  },
];

export const createActionsConfig = (callbacks, hierarchicalCategories) => ({
  createSheet: {
    available: typeof callbacks.onCreateSheet === 'function',
    icon: FileOutput,
    label: 'Créer fiche',
    buttonClass: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
    onAction: () => callbacks.onCreateSheet(callbacks.selectedItems),
  },
  category: {
    available:
      hierarchicalCategories.length > 0 && typeof callbacks.onBatchCategoryChange === 'function',
    icon: Folder,
    label: 'Catégorie',
    buttonClass: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800',
    isHierarchical: true,
    onSelect: (categoryId, categoryName) => {
      callbacks.onBatchCategoryChange(callbacks.selectedItems, categoryId);
      callbacks.setOpenDropdown(null);
    },
  },
  status: {
    available: typeof callbacks.onBatchStatusChange === 'function',
    icon: ListFilter,
    label: 'Statut',
    buttonClass: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
    options: STATUS_OPTIONS,
    onSelect: (value) => {
      callbacks.onBatchStatusChange(callbacks.selectedItems, value);
      callbacks.setOpenDropdown(null);
    },
  },
  export: {
    available: typeof callbacks.onBatchExport === 'function',
    icon: FileText,
    label: 'Exporter',
    buttonClass: 'bg-green-100 hover:bg-green-200 text-green-800',
    onAction: () => callbacks.onBatchExport(callbacks.selectedItems),
  },
  delete: {
    available: typeof callbacks.onBatchDelete === 'function',
    icon: Trash2,
    label: 'Supprimer',
    buttonClass: 'bg-red-100 hover:bg-red-200 text-red-800',
    onAction: callbacks.onBatchDelete,
  },
  sync: {
    available: typeof callbacks.onBatchSync === 'function',
    icon: RefreshCw,
    label: 'Synchroniser',
    buttonClass: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
    onAction: callbacks.onBatchSync,
  },
});
