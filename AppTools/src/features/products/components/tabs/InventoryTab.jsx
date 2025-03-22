// src/features/products/components/tabs/InventoryTab.jsx
import React from 'react';

const InventoryTab = ({ product }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Gestion des stocks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock actuel</h3>
            <p
              className={`mt-1 font-medium ${
                product.stock <= product.min_stock
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {product.stock !== undefined ? product.stock : '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock minimum</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.min_stock !== undefined ? product.min_stock : 'Non défini'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Gestion de stock
            </h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.manage_stock ? 'Activée' : 'Désactivée'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Catégories et relations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Catégorie principale
            </h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.category_ref ? (
                <>
                  {product.category_ref.name}
                  {product.category_ref.hierarchy && product.category_ref.hierarchy.length > 1 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({product.category_ref.hierarchy.map((cat) => cat.name).join(' > ')})
                    </span>
                  )}
                </>
              ) : (
                '-'
              )}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marque</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.brand_ref?.name || 'Aucune'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fournisseur</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.supplier_ref?.name || 'Aucun'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryTab;
