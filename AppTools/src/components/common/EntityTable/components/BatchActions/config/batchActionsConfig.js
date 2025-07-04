// config/batchActionsConfig.js
import { Trash2, RefreshCw, FileText, ListFilter, Folder, FileOutput, Package } from 'lucide-react';
import SyncButton from '../components/SyncButton';

export const STATUS_OPTIONS = [
  {
    value: 'published',
    label: 'Publié',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    value: 'draft',
    label: 'Brouillon',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    value: 'archived',
    label: 'Archivé',
    color: 'text-gray-900 dark:text-gray-100',
  },
];

export const STOCK_OPTIONS = [
  {
    value: 'set',
    label: 'Définir le stock',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    value: 'add',
    label: 'Ajouter au stock',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    value: 'subtract',
    label: 'Retirer du stock',
    color: 'text-gray-900 dark:text-gray-100',
  },
  {
    value: 'toggle_manage',
    label: 'Basculer gestion stock',
    color: 'text-gray-900 dark:text-gray-100',
  },
];

export const createActionsConfig = (callbacks, hierarchicalCategories, syncStats) => ({
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
  stock: {
    available: typeof callbacks.onBatchStockChange === 'function',
    icon: Package,
    label: 'Stock',
    buttonClass: 'bg-teal-100 hover:bg-teal-200 text-teal-800',
    // Pas d'options - utilise une modal au lieu d'un dropdown
    onAction: () => callbacks.onBatchStockChange(callbacks.selectedItems, 'modal'),
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
    // Composant personnalisé au lieu d'un bouton standard
    customComponent: SyncButton,
    customProps: {
      syncStats: syncStats,
      isSyncing: syncStats?.isActive || false,
      onClick: callbacks.onBatchSync,
    },
    onAction: callbacks.onBatchSync,
  },
});
