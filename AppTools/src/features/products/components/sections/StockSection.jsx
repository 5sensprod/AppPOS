// src/features/products/components/sections/StockSection.jsx
import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import StockField from '../../../../components/common/fields/StockField';

// ===== COMPOSANTS UI =====

const StockValueChip = ({ value, label, type = 'normal' }) => {
  const colorClasses = {
    normal:
      'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
    warning:
      'bg-red-50 text-red-800 border-red-300 border-2 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700',
    success:
      'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700',
  };

  const displayValue = value !== undefined && value !== null ? value : 'Non défini';

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${colorClasses[type]}`}>
      {type === 'warning' && <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />}
      {type === 'success' && <Package className="h-3 w-3 mr-1 text-green-500" />}
      <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">{label}:</span>
      <span className="font-medium">{displayValue}</span>
    </div>
  );
};

const StockWarningChip = ({ currentStock, minStock }) => {
  if (currentStock === undefined || minStock === undefined || currentStock > minStock) {
    return null;
  }

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Stock faible
    </div>
  );
};

const StockSummaryCard = ({ product }) => {
  const stockValue = product.stock || 0;
  const minStockValue = product.min_stock || 0;
  const isLowStock = stockValue <= minStockValue && minStockValue > 0;

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        isLowStock
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
          : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">État du stock</h4>
        <StockWarningChip currentStock={stockValue} minStock={minStockValue} />
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Actuel:</span>
          <span
            className={`ml-2 font-medium ${
              isLowStock ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}
          >
            {stockValue}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Minimum:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
            {minStockValue || 'Non défini'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ===== MODE LECTURE =====

const ReadOnlyView = ({ product }) => {
  const stockValue = product.stock;
  const minStockValue = product.min_stock;
  const isLowStock =
    stockValue !== undefined && minStockValue !== undefined && stockValue <= minStockValue;

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          <span>Gestion des stocks</span>
        </div>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock actuel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <Package className="inline h-4 w-4 mr-1" />
            Stock actuel
          </label>
          {stockValue !== undefined && stockValue !== null ? (
            <StockValueChip
              value={stockValue}
              label="Actuel"
              type={isLowStock ? 'warning' : 'success'}
            />
          ) : (
            <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Stock non défini</span>
            </div>
          )}
        </div>

        {/* Stock minimum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            Stock minimum
          </label>
          {minStockValue !== undefined && minStockValue !== null ? (
            <StockValueChip value={minStockValue} label="Minimum" type="normal" />
          ) : (
            <div className="px-4 py-3 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Seuil non défini</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerte si stock faible */}
      {isLowStock && (
        <div className="mt-4">
          <StockWarningChip currentStock={stockValue} minStock={minStockValue} />
        </div>
      )}
    </div>
  );
};

// ===== MODE ÉDITION =====

const EditableView = ({ product }) => {
  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        <div className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          <span>Gestion des stocks</span>
        </div>
      </h2>

      <div className="space-y-6">
        {/* Champs de saisie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StockField
            name="stock"
            label="Stock actuel"
            placeholder="Nombre de produits en stock"
            editable={true}
            min={0}
            step={1}
          />

          <StockField
            name="min_stock"
            label="Stock minimum"
            placeholder="Seuil d'alerte stock"
            editable={true}
            min={0}
            step={1}
          />
        </div>

        {/* Informations d'aide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            💡 Conseils de gestion des stocks
          </h3>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <p>
              • Le <strong>stock actuel</strong> représente le nombre de produits disponibles
            </p>
            <p>
              • Le <strong>stock minimum</strong> déclenche des alertes quand le stock devient
              faible
            </p>
            <p>• Définissez un stock minimum adapté à votre rythme de vente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== COMPOSANT PRINCIPAL =====

const StockSection = ({ product, editable }) => {
  return editable ? <EditableView product={product} /> : <ReadOnlyView product={product} />;
};

export default StockSection;
